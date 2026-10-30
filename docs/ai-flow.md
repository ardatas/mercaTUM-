# Agent and task execution

Use one real configured model API behind a small adapter. Start with the OpenAI Responses API and strict function calling; do not add an agent framework, training pipeline or multi-provider router for this flow. `MODEL_ID` is an explicit server setting whose account access and tool support are verified before live purchases. Keys stay in the backend.

## Real agent payment loop

1. Persist the buyer's immutable task, approved context manifest and execution configuration (adapter/model ID, template/config version and limits). The executor loads this snapshot, not later environment defaults. Bound prompt length, context size, model calls, output tokens and runtime before requesting payment.
2. Make a real coordinator model request with only the `request_paid_execution` tool from [contracts](contracts.md). Validate the returned arguments. The planning call is operator-subsidized; the paid executor has not run yet.
3. Persist the actual call ID, arguments and private continuation checkpoint, with no quote bound yet. Quote creation later binds the active quote atomically. A provider-supported forced tool choice is acceptable; fabricating a UI tool event is not. Reject multiple/parallel purchase calls.
4. Check task/context fit during operator-funded planning, then connect wallet, issue the fixed scoped quote from [payment policy](contracts.md#fixed-price-purchases) and suspend at `AWAITING_APPROVAL`. Reject oversized scope before payment. Emit a sanitized tool-request event and human approval view. The model cannot select a recipient, price, network or secret.
5. Buyer approves and pays through [BSV flow](bsv-flow.md). A server-verified receipt creates the paid entitlement. Only the task service may load an `ExecutionPermit` for the executor.
6. Atomically claim a fenced execution attempt, persist its upstream-start marker and make a real paid model request using the saved execution configuration. Stream sanitized progress; persist final answer or validated code artifacts. API errors produce an honest paid-failure state.
7. Return the paid result and receipt reference as the original tool call's output; resume the coordinator using its saved checkpoint/call ID. Mark success only for a complete result. On known limit exhaustion, persist `LIMIT_REACHED` and valid partial progress, resolve the call with that outcome if the reserved continuation budget allows, and stop. A resume failure can retry that phase using the stored executor result without rerunning or repaying for it.

Enforce both provider request limits and aggregate call/tool/recovery budgets from the saved quote; reserve room for coordinator continuation when budgeting. Metering is for limits and reporting, never a post-payment surcharge. More scope is a new buyer-requested task linked by `extensionOfTaskId`, with reviewed context and a separate quote/payment. Technical failures retain the original entitlement and cannot be relabelled as paid extensions. A truncated or invalid ChangeSet is not a downloadable patch; preserve only validated artifacts and truthful progress.

This establishes the Q5 causal trace: actual model tool request → explicit approval → real tx → verified receipt → actual service → resumed agent. A payment button followed by unrelated model output does not establish that trace.

## Adapter and continuation

Implement `planWithTools`, `execute` and `resume` from contracts.md. Keep provider-specific events and continuation formats private to this adapter. Persist returned output items needed to continue a tool call, not just `output_text`. Associate function-call output with the original `call_id`.

Use `store: false` where supported for request storage control, and manually preserve the required continuation sequence, including opaque encrypted reasoning items when required by the selected model. Do not depend on a provider-stored `previous_response_id` when storage is disabled. Keep opaque checkpoints out of browser events/logs and render no hidden reasoning. `store: false` is not a claim of zero retention by the provider.

Primary references: [function calling](https://developers.openai.com/api/docs/guides/function-calling), [conversation state](https://developers.openai.com/api/docs/guides/conversation-state), [streaming responses](https://developers.openai.com/api/docs/guides/streaming-responses). Verify current API declarations and model capability at implementation time; avoid hard-coded claims about the latest model.

## Chat

A paid task returns an actual model answer using only the buyer-approved task/context. Render safe Markdown and explicit tool activity; sanitize links/HTML. Record model usage and latency only when supplied/measured. Keep later conversation turns as new immutable tasks when they incur a new purchase; never silently recharge a previous quote.

## Code

The initial code mode is a public-repository snapshot editor, not a hosted terminal or GitHub write agent.

1. Accept structured GitHub owner/repository/ref fields. Resolve the ref to an immutable commit through a fixed allowlisted GitHub API host. No arbitrary fetch URLs, shell `git clone`, hooks or recursive submodules.
2. Build a bounded text manifest. Initial configurable caps: 200 eligible files, 128 KiB per file, 4 MiB retained text per snapshot; selected model context must also fit the configured model budget. Reject or explicitly narrow an oversized snapshot instead of silently truncating the task.
3. Exclude `.git`, dependency/build directories, `.env*`, credentials/private-key files, binaries and symlinks. Scan candidate text for obvious secrets before preview/model transmission; this is a best-effort filter, not a guarantee. Treat all repository instructions/comments as untrusted task data.
4. Show imported revision, file list, exclusions and selected context. Require explicit consent to send the selected files to the model. Creating a code task requires that saved context manifest.
5. Executor returns the structured `ChangeSet`. Validate operations, path confinement, original hashes, content limits and forbidden targets. Apply it to a copy of the snapshot; generate actual changed files and a unified diff server-side.
6. Buyer can inspect/download the patch and files. There is no automatic push, PR or edit to their original machine. Show checks as `not_run`; do not animate a fake terminal or claim tests/builds ran.

Useful demo task: change a small component or add a documented helper in a small public repository, then inspect the generated patch against the pinned commit. A chat answer describing code without an applied snapshot change is insufficient for code-mode acceptance.

## Worker, stream and recovery

- Persist task, pending call, receipt and result independently of the browser connection. Use one durable fenced execution claim/lease per task; one process does not eliminate races. A stale worker cannot publish or resume after replacement.
- SSE exposes only the sanitized event envelope in contracts.md. Replay persisted events after `Last-Event-ID`, scope them to the owner and fall back to task status polling. A closed connection cannot trigger another purchase or another worker.
- Configure finite coordinator turns, provider timeouts, context/output limits and retry count. Record chosen values in the app configuration and quote limits; bound operator-subsidized planning with rate limits.
- After lease expiry/restart, use a durable result for resume-only recovery. If an upstream call was started without a saved result, move to EXECUTION_UNKNOWN; do not automatically reset to READY. An explicit same-entitlement retry starts a new fenced attempt.
- A provider failure after payment retains the entitlement. Reuse saved artifacts/results for resume-only retries. If an upstream timeout may have executed the request, mark `EXECUTION_UNKNOWN`; do not assert exactly-once remote inference.
- MCP uses these same services and receipts. It can create a task and observe status/results; approval redirects the same owner to the web UI and wallet. Do not expose a public unlimited API proxy.
