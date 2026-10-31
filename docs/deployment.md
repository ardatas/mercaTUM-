# Local operation and deployment handoff

Current choice: **local preview now**, per user on 31 October 2026. Public hosting and real payment demonstration are deferred until external prerequisites are configured.

## Local

Use `npm run build && npm start`; open http://localhost:3000. `npm start` loads ignored `.env` if present. Persistent state lives in ignored `data/` with owner-only permissions. Keep this directory private; it contains session/task data, selected repository context, results and private model continuation. The preview works with no secrets and reports unavailable paid service accurately.

`.env.example` lists the server settings. Configure secrets directly in `.env` and restart; they are not accepted from chat, client forms or model prompts. API capability probing is real and consumes a small operator-funded request budget once per process start. No BSV payment occurs during startup or model probing.

## Before enabling real purchases

- Configure an accessible Responses model and run its startup strict-tool/continuation probe. The configured account/model has not been tested in this delivery.
- Initialize a distinct operator provider wallet with durable SQLite storage; confirm the selected network and buyer funding with the human. No buyer key may be copied to the server.
- Test standard-wallet connectivity from the final origin. Inspect grants and native spending behavior. Validate that `signAndProcess:false` returns a draft and `listActions` exposes its BRC-153 reference and default-basket change metadata. Unsupported wallets remain blocked.
- Human reviews the exact quote, provider recipient, network, fixed sats and maximum debit, then personally approves native spending. Neither default price nor deployment authorization authorizes a transaction.
- Keep `PAYMENTS_ENABLED=false` until the foregoing checks are complete. The transaction script/value and actual fee bound are checked again on the server; any ambiguous result reconciles its original attempt.

## Container

`docker build -t mercatum:local .` builds a multi-stage image. Native SQLite compilation uses Python/make/g++ only in the build stage. The runtime is unprivileged and mounts `/data`. The build context allowlist excludes `.env`, private data, Git and the reference pack.

For hosting, provide one Node instance with a private persistent volume and public TLS reverse proxy. Set `PUBLIC_APP_URL` to the canonical origin and keep secrets in the hosting secret manager. Do not place SQLite on an ephemeral function filesystem, or mount it simultaneously in multiple replicas. Default Node request IP interpretation does not trust arbitrary forwarded headers; configure a trusted edge deliberately before changing it.

Restart/redeploy requires both application and provider wallet databases to survive. Back up both and the provider secret through private storage. Stop the process before file-copy backups, or use a consistent SQLite backup procedure. Restoring only the provider key does not restore task receipts or merchant wallet history.

## Recovery

Payment proofs are stored in the server ledger before verification and locally before upload. Reload reconciliation never requests another debit. If the wallet returned no proof, recover its labelled transaction manually; no automatic replacement payment exists. If no transaction was created, an operator must establish that before a fresh purchase is offered.

Workers reserve paid request budgets before sending upstream. Expired or interrupted started calls become `EXECUTION_UNKNOWN`; completed executor output permits continuation-only recovery. Explicit retry is limited to one recovery attempt, retains its receipt and cannot bypass consumed budget. Known partial output stays `LIMIT_REACHED`, including after continuation failure/restart. A revoked/invalidated payment cannot be retried into execution.

## Live evidence still required

The live browser must show standard-wallet connection/approval, an actual transaction to the separate provider, Arcade POST plus acceptable status, real model tool call → receipt → execution → resumed coordinator, code artifacts and MCP entry. Record IDs and public explorer links in verification.md without copying proofs, secrets, private prompts or opaque checkpoints. A container build or mock-chain test is not qualification.
