# Task ledger

Use [workflow](WORKFLOW.md) before application changes. Status reflects acceptance evidence, not code presence. Detailed invariants live in [contracts](../docs/contracts.md) and the module flows; observed checks live in [verification](../docs/verification.md).

| ID | Scope / paths | Dependencies | Status | Evidence / remaining acceptance |
|---|---|---|---|---|
| T0 | Shared schemas, persistence, routes and configuration | Preflight | DONE | Ownership, idempotency, claims and restart checks recorded. |
| T1 | Buyer adapter: `src/client/wallet/` | T0 | BLOCKED | Offline checks and public wallet connection recorded. Human-approved live draft/signing flow remains. |
| T2 | Quote, verification, Arcade and provider wallet: `src/server/payments/` | T0 | BLOCKED | Provider wallet and offline verification implemented. Real transaction, Arcade status and internalization remain. |
| T3 | Coordinator, paid executor and continuation: `src/server/ai/` | T0, T2 receipt | BLOCKED | Real Gemini planning observed. Paid execution/resume needs an approved real receipt. |
| T4 | Public snapshots and artifacts: `src/server/repos/` | T0, T3 | REVIEW | Live import/context and offline patch validation observed. Model-generated paid patch remains. |
| T5 | Marketplace/chat/code/approval UI: `src/client/` | T0–T4 | REVIEW | Deployed UI and responsive checks recorded. Live paid result and recovery states remain. |
| T6 | MCP: `src/server/mcp/` | T0, T2, T3 | REVIEW | Public authenticated submission reaches approval. Receipt-backed result retrieval remains. |
| T7 | Deployment and durable recovery | T0–T6 | REVIEW | Frontend/backend and unpaid restart persistence observed. Paid recovery and snapshot restore remain untested. |
| T8 | End-to-end qualification and submission material | T1–T7 | BLOCKED | Complete Q1–Q5 and project acceptance; record tx/answer/patch/MCP evidence. |

## Next acceptance sequence

1. T1/T2: inspect unresolved attempts; obtain human approval of the current exact quote. Verify network, distinct recipient, fee/change bounds and native signing. Reconcile the same transaction through Arcade and provider internalization.
2. T3/T5: tie the saved model call to that receipt, real answer and resumed coordinator. Check result persistence and same-entitlement recovery without another debit.
3. T4/T6/T7: demonstrate paid code artifacts and MCP result retrieval; verify durable paid state. Label generated-code checks `not_run` unless actually executed.
4. T8: update gate evidence and prepare the [submission](../docs/submission.md). Keep external submission separate from preparation.

For each slice, inspect the diff, run relevant checks and record observed results. Test refusal, wrong amount/network/recipient, replay, scope/limit handling and uncertain outcomes offline; use live payments only within the user's approved scope.

## Ownership

The coordinator owns shared schemas, package/lockfile, migrations, central routes and integration. If delegating implementation, use at most two subagents with disjoint paths; each receives contracts, acceptance criteria and source references. Shared contract changes return to the coordinator before dependent work continues.

Handoffs include changed paths, behavior, checks/results and unresolved limits. Status values: TODO, RUNNING, REVIEW, DONE, BLOCKED. Mark DONE only after the acceptance evidence is reviewed. A blocked task names its missing prerequisite; independent work can continue.
