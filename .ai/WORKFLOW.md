# Execution workflow

For documentation-only work, check scope, source consistency, local links and the diff. For application changes, complete preflight and the implementation loop below. Neither workflow authorizes wallet spending.

## Preflight

1. Read root AGENTS.md, STATUS.md, the brief, contracts and sponsor AGENTS.md. Inspect `git status --short`; preserve unrelated changes and the developer pack.
2. Check Node >=22 and npm. In the starter, use `npm ci` for a fresh install or changed lockfile; compare `npm ls --depth=0` against sponsor pins, then run `npm run typecheck` and `npm test`. For an existing app, run its baseline checks too.
3. Record runtime, revision or lockfile hash, commands and results in [verification](../docs/verification.md). Resolve local setup errors before feature work.
4. Establish the configured model, server secrets, network, distinct provider wallet, buyer wallet and persistent hosting. Test standard-wallet connection from the deployed HTTPS origin early. Live blockers may coexist with independent offline work.
5. Establish the live payment's recipient, network and maximum authorized debit. The human approves each purchase and native wallet spending. Check wallet permissions/fee behavior; never infer consent from a remembered grant.

Run preflight once per implementation session; repeat affected checks when code, runtime or dependencies change. There is no automatic startup hook: the agent must execute and record these steps.

## Implementation loop

1. Select the next dependency-ready acceptance step in [TASKS.md](TASKS.md); record its owner and status.
2. If delegating, give each subagent disjoint paths, contracts, acceptance criteria and source references. The coordinator owns shared schema, package/lockfile and integration changes.
3. Implement one reviewable slice. Before accepting it, inspect the diff, run the task's meaningful checks and record evidence. Enforce the [fixed-price purchase policy](../docs/contracts.md#fixed-price-purchases): scope before payment, firm quote, hard limits, explicit extensions and no technical-retry charge. A subagent's completion claim is insufficient.
4. Resolve contract changes centrally before dependent agents continue. Integrate the real wallet → verified payment → real agent execution slice before UI polish or optional features.
5. Continue until application checks, deployment, browser use and all gates below have observed evidence. Record an external blocker and continue independent work; do not invent a PASS.

## Qualification gates

The [track rules](https://hackathon.tum-blockchain.com/prizes#bsv-association), checked 31 October 2026, supply the five requirements below. The evidence column is our acceptance standard. Arcade broadcast also follows the sponsor instructions. Code artifacts, MCP and restart/recovery are additional project requirements. Current results belong in [verification](../docs/verification.md#current-qualification).

| ID | Required behavior | Evidence for PASS |
|---|---|---|
| Q1 | Use the Association's TypeScript SDK and Wallet Toolbox where wallet functionality is needed. | Actual application calls, exact sponsor versions in the app lockfile, passing relevant checks. Installed but unused dependencies are insufficient. |
| Q2 | Connect user flows to a standard BSV wallet. | Observed WalletClient connection and authorized flow in BSV Desktop or BSV Browser from the deployed site. |
| Q3 | Make a real BSV testnet or mainnet transaction. | Network, sats, distinct recipient, txid and working WhatsOnChain link. Include actual Arcade POST/status evidence. |
| Q4 | Keep user funds non-custodial. | Source and observed signing/custody path showing wallet-held buyer keys, buyer approval and server control limited to its own revenue. |
| Q5 | An AI agent uses the project to make a payment. | Actual model tool request → saved pending call → human-approved real payment → verified receipt → paid execution and resumed agent, tied to one run/txid. |

Q3 and Q5 may share a transaction. HTTP acceptance, SPV headers, test mocks and screenshots of simulated balances do not establish all gates.

## Completion

Exercise refusal, wrong amount/network/recipient, replay, reload and ambiguous broadcast. Verify paid recovery without a second charge. Run the app's checks, deploy with durable storage, inspect the live browser flow and record gaps. Update STATUS.md, README and [submission](../docs/submission.md); claim qualification only when Q1–Q5 all PASS.
