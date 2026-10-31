#!/usr/bin/env bash
# Run as root on the dedicated Compute Engine instance. No credentials as args.
set -euo pipefail
umask 077
image=${1:?Usage: deploy-backend.sh IMAGE_REFERENCE}
case "$image" in
  europe-west3-docker.pkg.dev/gen-lang-client-0426046080/mercatum/*) ;;
  *) echo 'Image must come from the mercaTUM Artifact Registry repository.' >&2; exit 1 ;;
esac
runtime=/opt/mercatum
install -d -m 0700 "$runtime"
auth_dir=$(mktemp -d /run/mercatum-auth.XXXXXX)
trap 'rm -rf "$auth_dir"' EXIT
python3 - "$auth_dir" "$runtime/runtime.env.next" <<'PY'
import base64, json, os, subprocess, sys, urllib.request
metadata = urllib.request.Request(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    headers={'Metadata-Flavor': 'Google'})
with urllib.request.urlopen(metadata, timeout=10) as response:
    token = json.load(response)['access_token']
request = urllib.request.Request(
    'https://secretmanager.googleapis.com/v1/projects/gen-lang-client-0426046080/secrets/mercatum-runtime-env/versions/latest:access',
    headers={'Authorization': 'Bearer ' + token})
with urllib.request.urlopen(request, timeout=15) as response:
    payload = base64.b64decode(json.load(response)['payload']['data'], validate=True)
if not payload.strip():
    raise RuntimeError('Runtime configuration secret is empty')
with open(sys.argv[2], 'wb') as output:
    output.write(payload)
os.chmod(sys.argv[2], 0o600)
subprocess.run(['docker', '--config', sys.argv[1], 'login',
    '-u', 'oauth2accesstoken', '--password-stdin', 'https://europe-west3-docker.pkg.dev'],
    input=token.encode(), check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
PY
docker --config "$auth_dir" pull "$image"
install -d -m 0700 -o 1000 -g 1000 /srv/mercatum/data
mv "$runtime/runtime.env.next" "$runtime/runtime.env"
if docker container inspect mercatum-app >/dev/null 2>&1; then
  docker stop --time 40 mercatum-app >/dev/null
  docker rm mercatum-app >/dev/null
fi
docker run -d --name mercatum-app --restart unless-stopped \
  --env-file "$runtime/runtime.env" \
  --env HOST=0.0.0.0 --env PORT=3000 --env DATA_DIR=/data \
  --publish 127.0.0.1:3000:3000 \
  --volume /srv/mercatum/data:/data \
  --cap-drop ALL --security-opt no-new-privileges \
  --memory 1400m --pids-limit 128 \
  --log-opt max-size=10m --log-opt max-file=3 \
  "$image" >/dev/null
for attempt in $(seq 1 30); do
  if curl --fail --silent http://127.0.0.1:3000/healthz >/dev/null; then
    echo 'Backend health check passed.'
    exit 0
  fi
  sleep 2
done
echo 'Backend did not pass its health check; inspect the container before retrying.' >&2
exit 1
