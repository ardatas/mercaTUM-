# Application contracts

Authoritative interfaces. Runtime validation and TypeScript types live in `src/shared/contracts.ts`; persistent records and constraints live in `src/server/tasks/store.ts`. All IDs are opaque strings, timestamps UTC ISO-8601, sats positive safe integers, public keys validated compressed secp256k1 hex, txids 64 hex characters. Unknown fields in commands are rejected. Public responses omit server secrets and opaque model checkpoints.

## Ownership and identity

A durable server-issued session owns tasks, snapshots, quotes, attempts, events and artifacts. Use a Secure, HttpOnly, SameSite cookie for the browser; check Origin/CSRF on mutations. Derive owner ID from authentication, never the request body. A public wallet identity returned by the browser is not by itself proof of login ownership; session authorization and quote-specific remittance binding protect this flow.

MCP tokens are high-entropy, scoped to one owner, stored hashed, revocable, and shown only when explicitly issued to that owner. They do not authorize wallet spending. All read and write paths check ownership; IDs alone confer no access. History persists across refresh/restart within the retained session; cross-device account recovery is outside the initial scope.

## Core records

| Record | Required fields and invariants |
|---|---|
| `ProviderListing` | `id`, display name, `isDemo: true`, capability list, availability label. One configured listing; no arbitrary upstream URL or client-supplied API key. |
| `Task` | `id`, owner, mode (`chat` or `code`), immutable prompt, provider ID, optional snapshot ID and `extensionOfTaskId`, approved context manifest, immutable execution configuration (adapter ID, model ID, configuration/template version and quoted limits), fingerprint, state, timestamps, result/error IDs. Code requires a snapshot; chat does not. An extension references an owned earlier task and has its own payment entitlement. |
| `Quote` | `id`, task ID/fingerprint, provider ID, network, recipient identity key, payer identity key, `pricingMode: 'fixed'`, pricing-policy version, scope summary, intended deliverable, `priceSats`, execution-configuration digest and numeric limits, limit-exhaustion policy, expiry, random 128-bit BRC-29 `derivationPrefix`. All server-owned after creation. |
| `PendingAgentCall` | Task ID, model call ID, validated arguments, private continuation checkpoint, nullable active quote ID, state (`pending` or `resolved`). Save before wallet/quote creation; atomically bind the quote when issued and update on refresh while retaining earlier quote records. |
| `PaymentAttempt` | `id`, owner, quote ID, approval snapshot, idempotency key, state, optional txid/proof digest, timestamps. Approval snapshot includes network, recipient, service price, fee policy and maximum authorized debit. |
| `PaymentReceipt` | `id`, task/quote/attempt IDs, network, recomputed txid, output index, `amountSats`, recipient, verification time, Arcade observation, internalization outcome, explorer URL. Server-only creation. |
| `ExecutionPermit` | Internal reference to task, receipt and its immutable execution configuration/limits. Loaded and validated from the ledger by the executor; never accepted from browser or MCP arguments. |
| `ExecutionAttempt` | Task ID, attempt ID, fenced generation, lease expiry, phase, upstream-request-start marker, optional provider response ID and durable result reference. Persist before external invocation. |
| `ExecutionResult` | Task ID, answer, artifact IDs, completion (`complete` or `partial`), optional limit reason, reported model ID, measured usage/timing when available, check status (`not_run`, `passed`, `failed`). No fabricated metrics or invalid partial patches. |
| `RepositorySnapshot` | Owner, GitHub owner/repository, requested ref, resolved commit SHA, eligible file manifest and hashes, selected paths, context-consent timestamp. |
| `TaskEvent` | `id`, monotonically increasing sequence per task, task ID, timestamp, type and sanitized data. Durable events support reconnection. |

The fingerprint is a server-computed digest of canonical immutable task input: mode, prompt, provider/configured model, repository commit and approved file hashes, execution limits. Keep it private. Execution loads the saved configuration, not current deployment defaults; retain versioned templates needed for recovery. Credential rotation may change secrets, never silently change the quoted model or limits. Input edits create a new task; they do not mutate an already quoted task.

## Fixed-price purchases

1. Operator-funded planning checks the selected context and requested work before offering a payable quote. Start with one configured bounded budget class priced by `TASK_PRICE_SATS`; reject or ask the user to narrow work that does not fit. An estimate is advisory; only the server's fixed quote authorizes a purchase.
2. Before approval, show scope, intended deliverable, fixed service sats, model, numeric execution limits, expiry and what happens at a limit. Limits cover input/context, generated tokens including reasoning where applicable, model/tool calls, runtime and bounded recovery. Set real numeric limits before enabling purchase. A quote buys the stated bounded execution; arbitrary task completion is not guaranteed.
3. The provider absorbs underlying API cost variation within the purchased scope, including defined technical recovery. Actual usage never changes `priceSats` after approval: this is a fixed service fee, not a usage bill reconciled later. Network fees are separate and must fit the buyer's authorized total debit; freeze any currency conversion into sats when quoting. Any additional spending allowance remains in the buyer wallet; there are no prepaid platform credits or refundable unused token balances.
4. On known budget exhaustion, stop and expose `LIMIT_REACHED` with valid partial progress, consumed limits and remaining work. Partial results never become `SUCCEEDED` or an invented valid patch. An uncertain in-flight request remains `EXECUTION_UNKNOWN` and follows reconciliation instead.
5. Extra scope is a new immutable task with `extensionOfTaskId`, buyer-reviewed context and its own agent call, quote, derivation prefix, payment approval and receipt. The original task/receipt remain unchanged. Never auto-extend, reuse an old receipt for new work, or raise limits under an old permit. This preserves one purchase per task.
6. Technical failure, invalid model output without recorded budget exhaustion, or an ambiguous payment is recovery, not a reason to sell an extension. Reuse the original entitlement within its recovery policy; if recovery cannot finish, show paid failure/manual recovery without another debit. Automatic refunds are not implemented. Metered billing, automatic top-ups and milestone scheduling are outside this flow.

## Task state

```text
CREATED -> PLANNING -> AWAITING_APPROVAL -> PAYMENT_PENDING
        -> READY -> RUNNING -> SUCCEEDED
```

`READY` requires a verified, internalized receipt and a saved pending model call. `RUNNING` requires an atomic worker claim. The coordinator resumes with its original call ID after the paid result is stored; only then is the task `SUCCEEDED`.

| Branch | Required behavior |
|---|---|
| Approval refused | Task remains unpaid/cancelled; no wallet action or paid execution. |
| Scope outside the offered budget | `SCOPE_REJECTED` before payment; explain the limit and request a narrower new task. No payable quote or debit. |
| Quote expires before attempt | Refresh quote for the same immutable task and pending call; require approval of the new quote. |
| Wallet rejects before signing | Attempt `REJECTED`; allow a separately approved retry only after proving no transaction was created. |
| Wallet/broadcast outcome uncertain | Attempt/task `PAYMENT_UNKNOWN`; reconcile wallet and chain. No replacement payment button that silently creates another debit. |
| Proven invalid remittance | Reject it and leave task unpaid; do not treat client status as evidence. If a real debit may exist, retain reconciliation data. |
| Paid execution fails | `FAILED_PAID`, retain receipt/entitlement; bounded recovery can reuse it. Show paid status and failure separately. |
| Known execution limit reached | `LIMIT_REACHED`; save valid partial results and resolve the original call with that outcome where continuation budget permits. It is not success. Offer extra scope only as a separately approved linked task. |
| Upstream request outcome uncertain | `EXECUTION_UNKNOWN`; reconcile a saved provider response reference if supported, otherwise require an explicit same-entitlement retry. Never claim globally exactly-once model execution. |
| Cancel before wallet call | `CANCELLED`; no payment. Cancellation after possible broadcast triggers reconciliation, not an assumed refund. |

Confirmed unsigned cancellation is reported through the owner/CSRF-protected `POST /api/payments/:id/unsigned-abort` endpoint with `{ quoteId, reference, aborted: true, code, feeSats? }`. This is a browser report of the standard wallet outcome, not independently verified chain evidence and never authority to execute. The client requires a pre-sign local record and a successful abort, or a matching failed wallet-history record with no signed txid. The server refuses release once proof, broadcast, internalization or receipt evidence exists. It retains the rejected attempt, clears the active attempt/quote, and returns the task to AWAITING_APPROVAL. Every retry needs a fresh quote and explicit approval. Records that reached `sign_requested` cannot use this recovery.

Payment attempt states: `APPROVED`, `WALLET_REQUESTED`, `PROOF_RECEIVED`, `VERIFYING`, `VERIFIED`, `REJECTED`, `PAYMENT_UNKNOWN`. Persist `WALLET_REQUESTED` before invoking `createAction` and save returned proof before continuing the UI flow.

## Durable invariants

- Unique quote derivation prefix; unique accepted outpoint `(network, txid, outputIndex)`; at most one accepted receipt/entitlement per task. A transaction ID alone is not an output identity.
- At most one unresolved wallet attempt per task. Same idempotency key and same command return the existing record; reused key with different input returns a conflict.
- Proof replay to the same attempt returns its current status; replay to a different task fails. Each proof must match the stored quote prefix, recipient, payer identity and exact price.
- Reserve quote terms atomically when approval starts, before opening the wallet. Expiry blocks new attempts; a late proof for an already reserved attempt is reconciled under those saved terms. Do not discard a valid payment just because the wallet dialog took time.
- Record proof and verification progress before external calls. Internalization and SQLite cannot share one transaction: use a durable intermediate record and reconcile the exact outpoint after a crash. Never recover by charging again.
- Claim execution with compare-and-set/transaction, one live lease and fenced generation per task. Reconnects, duplicate requests and page refreshes cannot mint another permit. A stale worker cannot publish output or resume the coordinator after replacement.
- Persist an upstream-request-start marker before invoking the provider. After an expired lease: a durable result permits resume-only recovery; a started request without a result becomes `EXECUTION_UNKNOWN`. Only a provably unstarted request may return automatically to READY. Explicit same-entitlement retry creates a new fenced attempt; it never charges again.
- Application DB and wallet DB both persist. Failed model execution changes task state, not payment history.

## Browser API

Same-origin JSON commands require authentication and schema validation. Mutating creation/payment endpoints accept an `Idempotency-Key`. No endpoint accepts `paid`, an arbitrary recipient, or an arbitrary model URL as an instruction.

| Route | Input → output |
|---|---|
| `GET /api/providers` | → labelled demo provider/configured capabilities |
| `GET /api/wallet-config` | → trusted network, provider identity, connection guidance; no secrets |
| `POST /api/repositories/import` | `{ owner, repository, ref }` → bounded snapshot manifest at a resolved commit |
| `POST /api/repositories/:id/context` | `{ selectedPaths, consent: true }` → approved manifest and hashes |
| `POST /api/tasks` | `{ mode, prompt, providerId, snapshotId?, extensionOfTaskId? }` → created task; validate any parent belongs to the owner; start real coordinator planning |
| `GET /api/tasks` | → paginated owned task summaries |
| `GET /api/tasks/:id` | → task state, current quote/attempt/receipt and result metadata |
| `POST /api/tasks/:id/quote` | `{ payerIdentityKey }` → quote for its saved pending agent call; requires provider readiness |
| `POST /api/quotes/:id/approve` | `{ approved: true, feePolicy, maxAuthorizedDebitSats }` → reserved attempt; human action in UI |
| `POST /api/payments/:attemptId/wallet-requested` | `{}` → persisted permission to start that one wallet call; duplicates must not start a second call |
| `POST /api/payments/:attemptId/proof` | BRC-29 remittance below → receipt or reconciliation status |
| `POST /api/payments/:attemptId/reconcile` | `{}` → same attempt status; no debit |
| `POST /api/tasks/:id/retry` | `{}` → bounded technical recovery using existing receipt; never a payment call or a way to extend exhausted scope |
| `GET /api/tasks/:id/events` | SSE with `Last-Event-ID` → owned sanitized event replay/live events |
| `GET /api/tasks/:id/artifacts/:artifactId` | → authenticated answer, patch or changed file download |
| `POST /api/mcp-tokens` / `DELETE /api/mcp-tokens/:id` | → issue/revoke owner-scoped external-agent token |

The `wallet-requested` command is a one-time claim. If its result is lost, reconcile first; a repeated claim response cannot tell the browser to invoke the wallet again. An expired worker/HTTP timeout is not proof no payment occurred.

BRC-29 proof shape follows the starter: `{ tx: number[], txid, outputIndex, satoshis, derivationPrefix, derivationSuffix, senderIdentityKey }`. `tx` is complete AtomicBEEF, bytes 0–255. Validate size/structure before parsing, then independently compute and check all payment facts. The client-supplied `satoshis` and `txid` are claims, not authority. A configured body-size cap must admit real wallet proofs; check that during live preflight before enabling payments.

Quote retrieval may wait for wallet connection after planning; the stored model tool call survives that wait. Quote creation and approval cannot trigger paid execution. If a proof is valid but external reconciliation is pending, return `202` with the durable attempt state rather than a fake receipt.

## Agent adapter

```text
planWithTools(task, toolSchema) -> validated tool call + private checkpoint
execute(ExecutionPermit, authorizedTask) -> streamed output + ExecutionResult
resume(checkpoint, originalCallId, toolResult) -> final coordinator output
```

Coordinator tool `request_paid_execution` accepts only `{ taskId, providerId, outputKind: 'answer' | 'changes' }`. IDs must match the current owned task; output kind must match task mode. The server owns amount, network, recipient, execution limits and API credentials. Reject additional fields. One paid tool call per task; bound coordinator turns and disable parallel purchase calls.

The tool is suspended until a receipt exists. The tool result contains receipt reference and paid result/artifact IDs. The resumed model receives the result using the original tool call ID. Preserve the provider's required continuation items privately; see ai-flow.md.

## Repository output

`ChangeSet = { summary, changes: [{ path, operation: 'create' | 'replace' | 'delete', expectedBaseHash?, newContent? }] }`.

`replace/delete` require an existing file and matching hash; `create` requires a new path. Create/replace require content; delete forbids it. Reject absolute paths, traversal, symlinks, duplicate paths, control characters, protected files and over-limit output. Apply validated changes to a copy of the imported snapshot and generate the unified diff server-side. The model's prose is not a verified patch. Tests are `not_run` unless an actual execution environment ran them.

## Events and errors

Event types: `task.created`, `agent.tool_requested`, `quote.created`, `payment.approval_required`, `payment.submitted`, `payment.rejected`, `payment.verified`, `execution.started`, `execution.text_delta`, `artifact.created`, `task.completed`, `task.limit_reached`, `task.failed`. A limit event includes the exhausted bound and valid result/artifact references; it never requests another payment automatically. SSE includes durable event ID/sequence; heartbeat messages do not mutate task state. GET task status is the fallback. Streaming token deltas may be batched; a completed result is persisted independently.

Error envelope: `{ error: { code, message, retryable, taskId?, attemptId? } }`. Use stable codes including `UNAUTHORIZED`, `FORBIDDEN`, `INVALID_INPUT`, `PROVIDER_UNAVAILABLE`, `QUOTE_EXPIRED`, `WALLET_UNAVAILABLE`, `WALLET_NETWORK_MISMATCH`, `APPROVAL_REQUIRED`, `PAYMENT_MISMATCH`, `PAYMENT_REPLAY`, `PAYMENT_UNKNOWN`, `EXECUTION_FAILED`, `EXECUTION_UNKNOWN`, `REPO_LIMIT_EXCEEDED`, `INVALID_CHANGESET`. Never put credentials, provider raw responses or wallet secrets in an error. A retryable payment status authorizes reconciliation only.

## MCP surface

Use the official MCP TypeScript SDK and its current Streamable HTTP/auth guidance, verified at implementation time. `/mcp` exposes `list_providers`, `create_task`, `get_task`, `get_result`. Reuse the browser service schemas and owner checks. Asynchronous creation may initially return CREATED/PLANNING. `get_task` supplies the approval URL when available. A task awaiting payment returns `{ status: 'pending_user_approval', approvalUrl, taskId }`; build the URL from trusted `PUBLIC_APP_URL`. Browser session ownership must match the token owner. MCP cannot approve quotes, call the buyer wallet or submit an execution permit. Quote/payment details remain inspectable through owned task status.
