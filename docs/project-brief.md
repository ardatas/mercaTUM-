# Project brief

Build a deployed buyer-side AI workspace. A user asks a question or imports a repository for a code task, selects a demo AI capacity listing, approves a small BSV payment, and receives an actual answer or downloadable code changes.

The coordinator agent requests paid execution through a tool call. Payment approval suspends the run; a verified payment resumes it. External agents can submit the same tasks through MCP and send the human to the browser for approval.

## Scope

| Part | Required behavior |
|---|---|
| Buyer experience | Chat and code modes, task history, payment approval, streamed activity, results and receipts. Exact UI supplied separately. |
| Capacity listing | Eight colorful subscription offers across six model brands, with seller, tier, model choices, remaining capacity and capability visuals. Listings are fixtures backed by the configured execution provider. |
| Code task | Import a public GitHub repository at a resolved commit; review selected context; produce and apply validated changes to the snapshot; download a real diff. |
| Payment | Real sats from the buyer's standard wallet to a separate operator-owned provider wallet, with explicit approval. |
| Agent | Real model-generated purchase request, durable pause/resume and actual paid model execution. |
| MCP | Authenticated task submission/status/result tools over the same business services as the browser. Human approval stays in the browser/wallet. |
| Deployment | Public HTTPS app, server-only secrets, persistent job and provider-wallet storage, observable live execution. |

## Boundaries

Mock the rental marketplace, not the paid task or on-chain payment. Offline tests may use a mock chain and model fixtures; the deployed demonstration must use real services. Do not collect another person's subscription credentials, session cookies or consumer account access.

Buyer assets remain in their wallet until they approve a direct payment. The provider then owns its received revenue. There are no deposited buyer balances or platform-controlled user wallets.

Use a **fixed upfront quote for bounded work**, as defined in [payment policy](contracts.md#fixed-price-purchases). Operator-funded planning checks the selected context and task against the offered budget before payment. The quote states the intended deliverable, execution limits and exact service price in sats; network fees and the maximum total debit are shown separately. The provider absorbs its underlying cost variation within that scope.

If the budget is exhausted, preserve valid progress and stop. More work is a new linked task with a new quote and explicit payment approval. Technical failure recovery uses the original paid entitlement; it cannot silently become an extension charge. Automatic refunds are outside scope and must not be advertised.

Excluded: seller onboarding, real subscription resale, bidding, multiple model adapters, Jev routing, custom training, tokens, escrow, yield, AMMs, arbitrary shell execution, private-repository OAuth and automatic Git pushes. These do not help the smallest deployed flow qualify. The product is payment infrastructure for AI services; it need not claim a lending or exchange protocol.

## Done

From the deployed site, a buyer submits a chat task and a public-repository code task, approves real BSV spending, gets actual model results and can inspect payment receipts/WhatsOnChain. Reloading or reconnecting preserves progress. Demonstrate MCP submission reaching the same approval flow. Record Q1–Q5 evidence under [workflow](../.ai/WORKFLOW.md).

Technical choices: [architecture](architecture.md), [contracts](contracts.md), [BSV flow](bsv-flow.md), [AI flow](ai-flow.md). Visual input: [design slots](design-inputs.md).

## Current delivery phase — 31 October 2026

The user now authorizes Vercel deployment and Gemini with the supplied server credential. The persistent HTTPS backend is deployed in the dedicated mercaTUM Google Cloud project, with Gemini 3.8 Flash and a separate provider mainnet wallet (the user superseded the earlier testnet selection). Vercel serves the verified public frontend at https://mercatum-ai.vercel.app, with API/SSE/MCP proxying to the persistent backend. Live model planning, public MCP entry, SSE replay, restart persistence and Safari WalletClient connection on mainnet are observed; real buyer approval, payment, paid answer/code artifacts and full Q1–Q5 qualification remain incomplete. See verification.md.

Local UI refinement: a message-bubble/chat-answer layout, persistent bottom composer and temporary real-event thinking trace are implemented at localhost:3000. Reference 8 supplies compact progress typography and matching chat text, superseding the earlier bold 18px composer. These UI refinements are deployed and observed in Safari.

Local visual theme now follows reference 9: neutral charcoal/white/gray surfaces with spectrum accents, and a decorative interactive grid in empty chat only. The visual theme is deployed.

Payment recovery refinement: a confirmed unsigned fee rejection must return to fresh quote review with the observed fee and prior limit. Signing/broadcast uncertainty continues to block replacement payments. Deployed and verified in Safari: the original fee-rejected task returned to fresh quote review and survives reload. The original 194-sat draft exceeded its 110-sat cap. No new spending approved or initiated.

Marketplace-first revision: fixed desktop navigation links marketplace and chat; mobile navigation uses a drawer. Both views share the dark palette. Compact cards show five columns on wide screens and adapt down to one on phones. Selecting a subscription opens chat; model-specific effort choices are saved with the task and cannot alter an existing quote. Actual execution configuration and payment metadata remain authoritative.
