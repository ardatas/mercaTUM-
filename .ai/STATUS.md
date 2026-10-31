# Status

Updated: 31 October 2026. Implementation delivered for local preview; live setup remains pending.

- Repository: [ardatas/mercaTUM-](https://github.com/ardatas/mercaTUM-), branch `main`. User authorized frequent commits/pushes.
- Current user direction: local preview now; the user will configure server secrets in ignored `.env`. No public deployment or live BSV spending performed.
- Implemented: Node/React app, durable SQLite task/payment ledger, standard-wallet adapter, provider Toolbox/Arcade adapter, real Responses adapter, public-repository snapshot/patch flow, authenticated MCP, and UI adapted from all seven saved references.
- Local model credentials, selected model ID and provider wallet are absent. Paid flow fails closed. Simulated capacity is explicitly labelled; no fake model output or paid receipt exists.
- Verification: application typecheck/build and 56 tests pass; real GitHub import/context consent inspected in browser. Docker image built after adding SQLite native build dependencies. Final browser/container refinements are in progress.
- Qualification: Q1 stack evidence observed locally; Q2–Q5 need live setup and human wallet evidence. See [verification](../docs/verification.md).
- Next live prerequisites: model key/model ID, separate provider key, chosen network, funded buyer, tested native draft/fee-bound behavior and per-purchase human approval. Hosting is deferred by the user.

Use [TASKS.md](TASKS.md) as the ledger. Original developer pack and guide remain unchanged.
