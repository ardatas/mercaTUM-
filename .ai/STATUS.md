# Current status

Updated 31 October 2026 from repository evidence. This summary does not constitute a new live check.

## Delivered

- [Public app](https://mercatum-ai.vercel.app): Vercel frontend with API/SSE/MCP proxying to a persistent Node backend. Infrastructure and rollout references are in [deployment](../docs/deployment.md).
- Real Gemini `gemini-3.8-flash` capability probe and chat/code planning reach `AWAITING_APPROVAL`. Catalog offers, sellers and capacity are fixtures; the selected brand does not change the upstream API.
- Public repository import, reviewed context, MCP entry, SSE replay, session/task persistence across restart and owner-scoped history removal have recorded checks.
- BSV Desktop mainnet connection observed from deployed Safari and Chrome. Buyer/provider identities are distinct. Quoting is enabled; native spending and paid execution remain unverified.
- Dark marketplace/chat UI, model/effort selection, quote review and mobile navigation are deployed. Latest recorded app baseline: 174 tests plus typecheck/build; sponsor starter: 38 tests plus typecheck. These are earlier results, not checks rerun for this summary.

## Remaining qualification

[Evidence](../docs/verification.md#current-qualification) is authoritative for gate status. Q1 has local application evidence; Q2 has a live connection but needs the authorized flow. Q3, Q4 live signing and Q5 remain incomplete. No real transaction, Arcade acceptance, receipt-backed answer or model-generated patch is recorded.

1. Reconcile any saved attempt before preparing another purchase.
2. Complete one human-approved chat payment, verifying unsigned fee/change bounds before native signing; capture Arcade acceptance, provider receipt, actual answer and coordinator resume.
3. Demonstrate paid code artifacts, MCP result retrieval and paid recovery/reload. Complete the [submission checklist](../docs/submission.md).

The recorded mainnet validation allowance is **5,000 sats total including all fees**, not per task. The prepared chat used a 100-sat service price and 500-sat debit cap; its quote may have expired. The UI's 5,000-sat default cap is neither a fee estimate nor spending consent. Each purchase still requires exact quote and native wallet approval.

Next work: [task ledger](TASKS.md). Historical observations, revisions and screenshots: [verification](../docs/verification.md). Preserve the developer pack and root guide.
