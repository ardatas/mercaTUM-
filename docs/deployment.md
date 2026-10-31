# Deployment and operations

Updated 31 October 2026. The Vercel frontend and persistent backend are deployed. The verified public origin is `https://mercatum-ai.vercel.app`. See [verification](verification.md) for observed results. Mainnet quoting is enabled following the user’s network selection and live Safari wallet connection. Exact quote/native approval and live draft/signing validation remain pending; no transaction has been sent.

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

Keep `PAYMENTS_ENABLED=false` until the human confirms the network, funded buyer wallet and distinct provider recipient, and standard-wallet draft/fee-bound behavior is observed from the final origin. Every purchase requires its own quote, maximum debit and native wallet approval. Deployment authorization does not authorize a transaction.

Payment proofs are stored before verification and locally before upload. Reconciliation must reuse the original attempt. If the wallet returns no proof, recover its labelled transaction; do not automatically replace the payment. Interrupted upstream calls become `EXECUTION_UNKNOWN`; recovery retains the original receipt and consumed budget. A paid-task retry cannot create an extension charge.

Safari standard-wallet connection is observed. Qualification still needs the authorized wallet flow, a human-approved real transaction, Arcade broadcast/status, model purchase request through paid execution and coordinator resume, code artifacts and MCP entry. Record evidence without raw proofs, prompts, checkpoints or secrets. A healthy deployment is not Q1–Q5 completion.

## Local development

Latest recovery backend rollout (31 October2026): `europe-west3-docker.pkg.dev/gen-lang-client-0426046080/mercatum/app@sha256:dc1e55404bea93e2e710ed2e1b13881bc3ccf623f6437f74a9f14b9cb31a62a7`, built from`fee3286`; health/readiness PASS including model/wallet/payments readiness. Previous rollback digest:`7de492e5a07967d35ef06db34490b49f348af73dc613d33e3cc6736e9b496584`. Persistent storage preserved; no destructive migration.

Run `npm run build && npm start`, then open `http://localhost:3000`. The command loads ignored `.env`; ignored `data/` holds private persistent state. `.env.example` lists server configuration. Keep local keys and task data out of Git and browser assets.

### Current mainnet validation state

Runtime secret version 4 switched APP_NETWORK to mainnet with payments disabled. Version 5 enabled quoting after Safari connected to the funded BSV Desktop mainnet wallet. The existing immutable backend image was redeployed, retaining application storage and separate provider-mainnet/provider-testnet SQLite files. Public readiness returns ready=true,model=true,wallet=true,paymentsEnabled=true. This flag permits quote preparation; it is not purchase authorization or evidence of live draft/signing support. The unsigned-draft and fee/change checks remain mandatory before native signing. No application code changed during the network switch.

### Unsigned fee recovery deployment — 31 October 2026

Frontend code revision `0bb29ea`, Vercel deployment `2fWf879N49vtaQEXyZYEXsCy8Vhr`, observed live assets `/assets/index-BMNDPhle.js` and `/assets/payment-b2vfZv0j.js`. Backend image `europe-west3-docker.pkg.dev/gen-lang-client-0426046080/mercatum/app@sha256:aa6647acc707a887d47b589bd6e3108c5f05d2b00b5040fc446db500fdc36ca3` is healthy; persistent storage retained. Frontend uses standard noSendChange metadata to verify every non-payment output before native signing, with server Arcade broadcast of the same signed transaction.

Safari recovery of task `51f93096-ab0b-4252-b555-2cff0749b2f8` is observed and survives reload. The saved unsigned draft totals 194 sats (100 service + 94 fee), over its original 110-sat approval; the original pre-sign code path proves signing was not requested. A fresh abort acknowledgement was unavailable and is not claimed. Fresh quote review is ready with consent unchecked; paid execution and Q3/Q5 remain pending human approval.

### Marketplace delivery — 31 October 2026

Frontend `568e858`, Vercel `C8QDFcpwpDVZCBfEAFGvzNzR9vUt`; canonical assets `index-DfeBWeNQ.js` / `index-Cabso7Mv.css`. Backend image `europe-west3-docker.pkg.dev/gen-lang-client-0426046080/mercatum/app@sha256:c0bda0cd69f953eb4b187151819acad0edf00582864ed3d3f7cbc1c5e33fb96d`; health/readiness pass. Previous rollback digest: `aa6647acc707a887d47b589bd6e3108c5f05d2b00b5040fc446db500fdc36ca3`. Shared task selection is additive; older tasks preserve prior behavior. Actual live selection/reload and planning-to-approval observed; no spending performed.
