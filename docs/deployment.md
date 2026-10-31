# Deployment and operations

Recorded deployment: 31 October 2026. Public origin: `https://mercatum-ai.vercel.app`. Vercel serves the frontend; the persistent backend handles API/SSE/MCP. Mainnet quoting is enabled, and Safari/Chrome wallet connections are recorded. Native signing, a real transaction and paid execution remain unverified. See [current evidence](verification.md#current-qualification); recheck live state before a rollout.

## Infrastructure

| Resource | Configuration |
|---|---|
| Vercel project | `mercatum-ai`, team `ardas-projects-cc4a1f2c`; GitHub main deployments |
| Google Cloud project | `gen-lang-client-0426046080` |
| Backend VM | `mercatum-api`, `europe-west3-a`, Debian 12, `e2-small` |
| Persistent disk | `mercatum-api`, 20 GB `pd-balanced`; automatic deletion disabled |
| Backend HTTPS | `https://api.mercatum.35.198.77.207.sslip.io` |
| Reserved external IP | `35.198.77.207` |
| Image repository | `europe-west3-docker.pkg.dev/gen-lang-client-0426046080/mercatum` |
| Runtime identity | `mercatum-runtime@gen-lang-client-0426046080.iam.gserviceaccount.com` |
| Configuration secret | Secret Manager `mercatum-runtime-env` |
| Data | `/srv/mercatum/data` mounted at `/data`; owner UID 1000, mode 0700 |
| Proxy | Caddy container `mercatum-proxy`; configuration `/opt/mercatum/Caddyfile` |
| Application | Docker container `mercatum-app`; loopback port 3000 |
| Backups | `mercatum-daily` snapshot schedule, daily at 03:00 UTC, seven-day retention |

Only TCP 80/443 are publicly allowed. SSH uses IAP from `35.235.240.0/20`; a targeted deny rule overrides permissive default network rules. The runtime service account has repository-scoped image read permission and access to its configuration secret. Secret values do not belong in startup metadata, Git, client bundles or logs. Docker logs are capped at three 10 MB files per container.

Vercel serves the frontend and reverse-proxies application API, streaming and MCP routes to the persistent backend. Keep browser requests on the Vercel origin. `PUBLIC_APP_URL` is the canonical public frontend origin used for approval links and origin checks. It is set to `https://mercatum-ai.vercel.app` in runtime secret version 5 (origin unchanged since version 3). Browser mutations and MCP approval links through that alias are verified. Never run SQLite or the provider wallet on ephemeral Vercel function storage, or start a second active backend against the same wallet/ledger.

## Recorded rollout references

Latest recorded frontend code: `7728a3b`, Vercel `XQ8Uv92cPxR9gSCifqHepehvDxPX`; live purchase review verified. Earlier UI revisions remain in [verification](verification.md).

Backend: `europe-west3-docker.pkg.dev/gen-lang-client-0426046080/mercatum/app@sha256:dc1e55404bea93e2e710ed2e1b13881bc3ccf623f6437f74a9f14b9cb31a62a7`, built from `fee3286`; health/readiness recorded PASS. Previous rollback digest: `7de492e5a07967d35ef06db34490b49f348af73dc613d33e3cc6736e9b496584`. Inspect the running image before using either reference.

## Deploy, restart and roll back

Build and push an `linux/amd64` image to the repository above. Use an immutable image digest for deployment and record the previous digest before replacing it. The helper [deploy-backend.sh](../scripts/deploy-backend.sh) is installed at `/opt/mercatum/deploy.sh` on the VM. It obtains the latest configuration through the VM identity, stores a root-only environment file, pulls the image before stopping the old application, preserves data and checks liveness.

```sh
# Read the current image reference without exposing container environment.
gcloud compute ssh mercatum-api --project=gen-lang-client-0426046080 \
  --zone=europe-west3-a --tunnel-through-iap \
  --command='sudo docker inspect --format "{{.Config.Image}}" mercatum-app'

# Replace IMAGE_DIGEST with the complete registry path ending @sha256:...
gcloud compute ssh mercatum-api --project=gen-lang-client-0426046080 \
  --zone=europe-west3-a --tunnel-through-iap \
  --command='sudo /opt/mercatum/deploy.sh IMAGE_DIGEST'

# Restart the existing container without changing its configuration.
gcloud compute ssh mercatum-api --project=gen-lang-client-0426046080 \
  --zone=europe-west3-a --tunnel-through-iap \
  --command='sudo docker restart --time 40 mercatum-app'

# Start a deliberately stopped container.
gcloud compute ssh mercatum-api --project=gen-lang-client-0426046080 \
  --zone=europe-west3-a --tunnel-through-iap \
  --command='sudo docker start mercatum-app'

curl --fail https://api.mercatum.35.198.77.207.sslip.io/healthz
curl https://api.mercatum.35.198.77.207.sslip.io/readyz
```

For rollback, call the same deployment helper with the previously recorded image digest. It fetches the latest secret version; image rollback does not roll back configuration or database migrations. Check migration compatibility first. If configuration must also be reverted, publish a reviewed prior configuration as a new Secret Manager version without printing it, then redeploy. Do not reset the ledger or retry an ambiguous payment to make a deployment appear healthy.

`/healthz` proves process liveness only. `/readyz` can correctly report unavailable purchases while payments are disabled. Model capability probing makes a small real operator-funded request at process startup. No BSV spend occurs during startup. Both containers restart automatically after a VM reboot. An application-container restart has preserved the same secure session, CSRF state, provider identity and browser/MCP tasks awaiting approval; no paid result or receipt existed in that check.

## Backup and restore

The `mercatum-daily` resource policy in `europe-west3` is attached to the persistent disk. It schedules a daily snapshot in the 03:00–07:00 UTC window and retains snapshots for seven days while the source disk exists. If the source disk is deleted, automatic snapshots are retained until explicitly removed. Snapshot storage is in the EU. This covers application data, provider wallet data and machine configuration, including the private runtime environment file; restrict snapshot access accordingly.

The schedule is configured, but no scheduled snapshot or restore is claimed as tested. Running-disk snapshots are crash-consistent; they do not replace an application-level recovery test. For a deliberate recovery checkpoint, stop the application first or use a validated SQLite backup procedure covering both databases and their associated data. Example manual checkpoint:

```sh
gcloud compute ssh mercatum-api --project=gen-lang-client-0426046080 \
  --zone=europe-west3-a --tunnel-through-iap \
  --command='sudo docker stop --time 40 mercatum-app'

# Use a unique name. Restart the app even if this command fails.
gcloud compute snapshots create mercatum-manual-YYYYMMDD-HHMM \
  --project=gen-lang-client-0426046080 --source-disk=mercatum-api \
  --source-disk-zone=europe-west3-a --storage-location=eu

gcloud compute ssh mercatum-api --project=gen-lang-client-0426046080 \
  --zone=europe-west3-a --tunnel-through-iap \
  --command='sudo docker start mercatum-app'

# Inventory only; no secret payloads.
gcloud compute snapshots list --project=gen-lang-client-0426046080 \
  --filter='sourceDisk:mercatum-api' \
  --format='table(name,status,creationTimestamp,diskSizeGb)'

# Create a separate recovery disk; do not overwrite the current disk.
gcloud compute disks create mercatum-recovery-YYYYMMDD \
  --project=gen-lang-client-0426046080 --zone=europe-west3-a \
  --type=pd-balanced --source-snapshot=SNAPSHOT_NAME

# RECOVERY_VM must be a separate diagnostic VM in the same zone.
gcloud compute instances attach-disk RECOVERY_VM \
  --project=gen-lang-client-0426046080 --zone=europe-west3-a \
  --disk=mercatum-recovery-YYYYMMDD --mode=ro
```

Attach the restored disk read-only to a separate recovery VM for inspection. Verify ledger integrity, wallet state, artifact availability and secret recovery before a controlled cutover. Stop the original application before starting any restored copy with the same provider identity. Reconcile on-chain transactions created after the snapshot before allowing spending or execution; restoring old state must not create a second debit. Never assume that restoring only the provider root key restores payment history or task receipts.

## Payment recovery and qualification

For a new environment, start with `PAYMENTS_ENABLED=false`. Establish the funded buyer wallet, distinct provider, matching network and standard-wallet connection from the final HTTPS origin. Enabling quoting is an explicit configuration step, not spending authorization. The recorded mainnet deployment has quoting enabled; unsigned fee/change checks and native signing remain mandatory on every approved purchase.

The human reviews each quote and its maximum debit and authorizes native spending. Inspect remembered wallet grants so approval is observable. Missing draft/reference/change metadata must block signing. Follow [BSV flow](bsv-flow.md) for exact verification and recovery rules.

Persist proof before upload/verification and reconcile the original attempt after interruption. Recover the same signed transaction from wallet history where possible; never replace an uncertain debit. A model timeout becomes `EXECUTION_UNKNOWN`; technical recovery retains its receipt and remaining limits.

Capture the real transaction, Arcade acceptance, provider internalization, paid result and original coordinator continuation in [verification](verification.md). Also verify code artifacts, MCP results and paid state across restart. A healthy deployment alone does not satisfy these checks.

## Local development

Follow [README setup](../README.md#run-locally). `npm start` loads ignored `.env`; `DATA_DIR` holds private application and wallet state. Keep both out of Git and browser assets. For server changes use `npm run dev`; for the offline UI fixture use `npm run dev:client` as documented in README.
