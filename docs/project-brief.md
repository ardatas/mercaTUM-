# Project scope

mercaTUM is a buyer-side AI workspace with BSV payments for bounded chat and public-repository code tasks. A real coordinator agent requests a purchase; human approval and a verified receipt release paid model execution. External agents use the same services through MCP.

## Track requirements

Target: BSV Association's **DeFi Rails for Agentic Payments**. The [official track](https://hackathon.tum-blockchain.com/prizes#bsv-association), checked 31 October 2026, requires:

1. BSV SDK and Wallet Toolbox where wallet functionality is needed, from the Association's TypeScript stack.
2. User-facing connection to a standard wallet such as BSV Desktop or BSV Browser.
3. A real BSV transaction on testnet or mainnet.
4. Non-custodial user funds.
5. At least one AI agent making a payment through the project.

Our flow is a direct micropayment for an AI service. Demonstrate why buyers and agents would use it and how it brings activity to BSV. The project does not implement lending, swaps or escrow; meeting technical gates alone does not establish prize suitability. [Workflow](../.ai/WORKFLOW.md#qualification-gates) maps these requirements to observed evidence.

## Product requirements

| Area | Required behavior |
|---|---|
| Marketplace | Eight labelled demo offers across six brands, with model/effort choices and simulated capacity. One configured execution provider serves the tasks. Catalog selection is not multi-provider routing. |
| Chat | Submit a bounded question, approve payment, stream real progress and receive an actual answer. Each new question is an independent task. |
| Code | Import a public GitHub repository at an immutable commit; approve selected context; validate and apply generated changes to a copied snapshot; download changed files and a real diff. |
| Payments | Buyer pays a distinct operator-owned provider wallet from BSV Desktop/Browser. Show scope, limits, service sats, fee policy and maximum debit before approval. Verify and broadcast the same transaction through Arcade. |
| Agent | Persist the real purchase tool call, pause for approval, execute only after receipt verification and resume the original call. |
| Recovery | Preserve tasks, receipts and results across reload/restart. Reconcile ambiguous payments without another debit; recover paid failures under the original entitlement. |
| MCP | Authenticated submission, status and results over the same task services. Human approval stays in browser/wallet. |
| Hosting | Public HTTPS frontend, server-only credentials and persistent application/provider-wallet storage. |

## Purchase policy

Use a fixed upfront quote for bounded work. Operator-funded planning checks scope before charging. The provider absorbs API cost variation within the quote. Execution stops at its limits and preserves valid partial results; additional scope requires a new linked task and explicit approval. Technical recovery cannot become an extension charge. [Contracts](contracts.md#fixed-price-purchases) define the policy and state transitions.

Buyer funds stay in the buyer wallet until payment; received revenue belongs to the provider. There are no deposited user balances or platform-controlled buyer keys.

Mock only marketplace listings/capacity and offline test dependencies. The deployed demo must use real model calls and real sats. Do not collect consumer subscription credentials or advertise catalog selections as actual upstream execution.

Excluded: seller onboarding, subscription resale, bidding, additional model adapters/routing, training, tokens, escrow, yield, AMMs, arbitrary shell execution, private-repository OAuth, automatic Git writes and automatic refunds. The existing OpenAI adapter remains for configured/saved tasks; deployment uses Gemini.

## Acceptance

Demonstrate a real paid chat answer, a real paid code patch and MCP submission through the same human approval path. Record the model call, quote, approved debit, transaction, Arcade acceptance, provider receipt and resumed agent. Verify reload/recovery and Q1–Q5 in [evidence](verification.md). Code/MCP and recovery checks are project requirements in addition to the sponsor's five gates.

Current delivery and blockers: [status](../.ai/STATUS.md). UI requirements: [design inputs](design-inputs.md). Technical boundaries: [architecture](architecture.md), [contracts](contracts.md), [BSV flow](bsv-flow.md), [AI flow](ai-flow.md).
