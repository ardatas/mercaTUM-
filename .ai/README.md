# Navigation

Start: [AGENTS.md](../AGENTS.md) → [status](STATUS.md) → [brief](../docs/project-brief.md) → [workflow](WORKFLOW.md).

| When | Read |
|---|---|
| Starting the implementation loop | [Launch prompt](EXECUTION_PROMPT.md), [task ledger](TASKS.md) |
| Choosing module boundaries or deployment | [Architecture](../docs/architecture.md) |
| Implementing or reviewing interfaces, state and errors | [Contracts](../docs/contracts.md) |
| Wallet, payment, Arcade or reconciliation work | [BSV flow](../docs/bsv-flow.md) |
| Agent, streaming, repository or model work | [AI flow](../docs/ai-flow.md) |
| Building the UI | [Design prompts and component states](../docs/design-inputs.md) |
| Checking vocabulary | [Context](../CONTEXT.md) |
| Recording checks or qualification | [Evidence](../docs/verification.md) |
| Preparing delivery | [Submission](../docs/submission.md) |

## BSV reference map

Use [sponsor pins](../BSV-TBC26-Developer-Pack/AGENTS.md) first. Sections below refer to the [complete guide](../BSV_STACK_COMPLETE_GUIDE.md); paths refer to the [starter](../BSV-TBC26-Developer-Pack/starter/bsv21-token-kit/).

| Task | Guide | Source / test |
|---|---|---|
| Wallet connection and derived keys | §§4–6 | `web/src/main.ts`, `core/addresses.ts`, `client/signer.ts` |
| Peer payment and receipt | §§7–9, Appendix A | `client/payments.ts`, `test/payments-nft.e2e.test.ts` |
| Server wallet and Arcade | §§14, 20 | §14.2; installed `Arcade.d.ts` and `Arcade.js`; `client/arcadeChainTracker.ts` handles headers only |
| Offline wallet tests and single SDK build | §2, Appendix A | `test/helpers/mockchain.ts`, `vitest.config.ts` |
| HTTP 402, only if scope later needs it | §10 | `examples/payPerRequest.ts`, `test/pay-per-request.e2e.test.ts` |

Tokens, NFTs and overlays are reference material, outside the selected flow. The starter contains no project coordinator agent.
