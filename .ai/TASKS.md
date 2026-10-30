# Implementation task ledger

These are scoped assignments for the future implementation loop, not completed work. Follow [workflow](WORKFLOW.md); record observed results in [verification](../docs/verification.md). The coordinator updates this ledger, owns shared contracts/package files and accepts integrated work.

| ID | Assignment | Dependencies | Status | Owner / evidence |
|---|---|---|---|---|
| T0 | Preflight, shared schemas, app skeleton and durable storage | Implementation request | TODO | Unassigned |
| T1 | Buyer wallet and approval adapter | T0 schemas | TODO | Unassigned |
| T2 | Provider wallet, quote, verification and Arcade ledger | T0 schemas/storage | TODO | Unassigned |
| T3 | Real coordinator/tool loop and paid chat executor | T0; integrate T2 receipt | TODO | Unassigned |
| T4 | Repository import, context and actual patch artifacts | T0; integrate T3 executor | TODO | Unassigned |
| T5 | Buyer UI from design slots | T0; integrate T1–T4; design input | TODO | Unassigned |
| T6 | Remote MCP adapter | T0; integrate T2/T3 services | TODO | Unassigned |
| T7 | Deployment and live-origin wallet integration | T0 early probe; final T1–T6 | TODO | Unassigned |
| T8 | Integration, live demo and gate evidence | T1–T7 | TODO | Unassigned |

Allowed status: TODO, RUNNING, REVIEW, DONE, BLOCKED. A blocked task records the exact prerequisite and next action. Independent tasks continue. Mark DONE only after the coordinator inspects the diff and verifies acceptance evidence.

## Dispatch rules

Use at most two implementation subagents concurrently; keep file ownership disjoint. Each receives its task below plus the current contracts and relevant source sections. Requests to edit shared schemas/dependencies return to the coordinator; do not race edits to package.json, lockfile, migrations or central routes. Agents may propose a contract correction; coordinator records it before affected work continues.

Every handoff returns changed paths, behavior implemented, commands/results, unresolved limits and integration instructions. Integrate and verify each slice before expanding scope. A final read-only reviewer may check payment/agent causality and authorization, but cannot substitute for observed live evidence.

## T0 — Coordinator: foundation

**Own:** root app configuration, package/lockfile, `src/shared/`, `src/server/tasks/` central services, server bootstrap/routes, DB migrations and integration documentation.

- Execute preflight; compare installed BSV pins and check source pack integrity. Keep the reference starter untouched.
- Create the single Node/React TypeScript app described in architecture.md. Use only needed BSV packages at exact sponsor versions; install and lock other dependencies deliberately.
- Translate contracts.md into runtime schemas/types and public DTOs, including fixed-price scope/limits, owned extension links and SCOPE_REJECTED/LIMIT_REACHED states. Establish strict input validation, owner-scoped sessions, Origin/CSRF checks, error envelope, rate limits and redacted logging.
- Create durable task/quote/attempt/receipt/pending-call/event/artifact records, unique outpoint/task constraints, idempotency records and transactional fenced execution claims and upstream-start markers. Serialize payment acceptance and job execution.
- Define proposed local scripts for typecheck, meaningful tests, production build and start; verify them after implementation. Do not document nonexistent commands as working.

**Accept:** migrations survive restart; another owner cannot read/mutate a task; concurrent claims and duplicate idempotency keys behave correctly; mismatched bodies conflict; server secret fields are absent from public DTOs. Hand off stable interfaces before parallel module work.

## T1 — Buyer wallet

**Own:** `src/client/wallet/` and focused wallet adapter tests. UI integration uses T5's components.

**Read:** bsv-flow.md; sponsor AGENTS; guide §§4–9; starter `client/payments.ts`, payment tests; installed SDK wallet declarations.

- Use WalletClient auto connection and native wallet methods. Detect wallet absence/lock, network mismatch and buyer/provider identity equality before debit.
- Adapt the tested BRC-29 helper for the server's quoted prefix and a fresh suffix, explicit output identification and a short non-sensitive attempt label. Preserve complete AtomicBEEF.
- Implement explicit quote approval, one-time wallet invocation, proof persistence/upload and reconciliation after reload/timeout. A duplicate server response cannot invoke createAction twice.
- Establish the selected wallet's actual spending/fee permission behavior and enforce the human's authorized debit bound. Do not assume a native prompt occurs under remembered grants.
- Coordinate a minimal deployed HTTPS wallet probe with T7 before final UI work. Live human authorization remains manual.

**Accept:** offline adapter checks cover refusal, network mismatch, missing proof, same-attempt retry and unknown outcome without recharging. Observe actual standard-wallet connection from the public origin. Before a live payment, demonstrate the native approval/budget behavior; missing support is a recorded blocker, not a bypass.

## T2 — BSV server payment

**Own:** `src/server/payments/`, merchant wallet adapter and focused payment tests. Coordinate migrations/interfaces through T0.

**Read:** bsv-flow.md; guide §§7–9, 14.1/14.2 and 20; starter payment/mockchain tests; installed Arcade source/declarations.

- Initialize operator wallet with private root secret and durable wallet-toolbox SQLite data. Configure correct network, Arcade-first services, chaintracker and running monitor.
- Issue immutable fixed-price quotes with scope, intended deliverable, numeric limits, pricing-policy version and random unique prefixes; follow contracts.md's fixed-price policy. Reserve approval terms, retain late valid proofs for reserved attempts and lock one unresolved attempt per task. Actual usage cannot reprice a paid quote.
- Verify bounded AtomicBEEF, recomputed txid, quoted prefix, expected identities, output script/value and trusted network services. Enforce replay/outpoint/task uniqueness atomically.
- Submit the SAME transaction to Arcade in EF; resolve validated ancestry if required. Store redacted POST/status evidence and distinguish submitted, network-known and mined.
- Internalize protocol `wallet payment`, persist receipt/entitlement and recover crashes between wallet state and app DB. Expose reconciliation without a second buyer debit.

**Accept:** a real offline mock-chain transfer between distinct wallets, forged amount/script/prefix/txid rejection, wrong-task replay, concurrent duplicate proof handling and crash recovery. Verify immutable service price despite usage/config changes; an extension requires its own approval/receipt and cannot reuse the parent receipt. Live integration records provider internalization plus actual Arcade POST/network status; tests alone leave Q3 pending.

## T3 — Real agent and chat

**Own:** `src/server/ai/`, including `src/server/ai/worker.ts` behind T0's task interfaces; focused agent tests. T0 retains `src/server/tasks/` services and migrations.

**Read:** ai-flow.md, contracts.md, current official model function-calling/continuation docs.

- Implement one real configured Responses API adapter with strict `request_paid_execution`. Validate actual model call arguments and persist original call ID/private continuation before approval.
- Bound operator-paid planning; assess context/task fit before offering a quote and reject oversized scope without payment. Reject malformed/parallel purchase calls. Keep price/recipient/limits outside model authority. Execute the immutable saved model/configuration snapshot under its quote; deployment defaults cannot change a paid task.
- Pause the call for user approval. Executor accepts only a server-loaded permit from T2's receipt; production has no bypass/mock-paid route.
- Make actual paid inference, stream sanitized events, store results, feed the original call's output back and resume the coordinator. Use the API key only server-side.
- Enforce the quoted request and aggregate execution/recovery limits, reserving coordinator continuation budget. Known exhaustion becomes LIMIT_REACHED with valid partial progress; never silently increase limits, create another payment or mark partial work complete. User-requested extra scope is a separately quoted linked task. Technical failure recovery retains its original entitlement; reuse saved executor results on coordinator-resume retries.

**Accept:** tests prove executor is never called before a verified receipt, forged permits/tool args fail, duplicate workers do not rerun a claimed job, restart restores pending call, configuration changes cannot alter a quoted task, a started upstream request with an expired lease becomes EXECUTION_UNKNOWN, stale workers cannot publish, and paid failure does not charge. Test pre-payment scope rejection and known-limit partial results without success/recharge; retry cannot bypass exhausted scope. A real API smoke test verifies configured model capability. Live Q5 evidence ties actual tool call to receipt/txid and completed answer.

## T4 — Repository task

**Own:** `src/server/repos/`, artifact generation and focused repository/change-set tests. AI adapter remains T3-owned.

- Import public GitHub owner/repository/ref through fixed-host API access; pin to commit SHA before retrieving bounded text. Enforce ai-flow.md file/byte/context limits.
- Exclude secrets/binaries/symlinks/protected paths, show a manifest and save explicit context selection/consent. Repository instructions stay data.
- Validate model ChangeSet against pinned file hashes and path boundaries. Apply changes to a copied snapshot, generate unified diff and downloadable changed files with owner authorization.
- Mark all checks `not_run` unless actually executed. Avoid arbitrary commands, private OAuth, Git pushes and fake terminal output.

**Accept:** small public repo yields actual changed files and a patch matching the fixed base; stale hashes, traversal, protected files, oversized imports/outputs and unauthorized downloads fail. Nothing in the original repository or user's machine is modified.

## T5 — Buyer UI

**Own:** `src/client/` excluding `wallet/`; coordinate shared DTO changes through T0. Read design-inputs.md and use the user's supplied prompts.

- Build the specified shell, chat/code modes, demo-provider card, repository context/review, task activity, results, history and MCP connection surface.
- Implement all D0–D7 states, particularly distinct payment pending/unknown/verified, paid execution failure and same-entitlement recovery.
- Wire actual APIs/SSE/wallet adapter; never infer success from a timer, display invented balances/metrics or expose secrets/checkpoints.
- Quote approval must show scope, intended deliverable, model, numeric limits, exact fixed service sats, network, recipient, fee policy and total debit bound. Distinguish limit-reached partial results, separately approved extensions and technical retries under the original entitlement. Unknown payment reconciles instead of offering another debit.

**Accept:** live browser tests show chat and repository result, wallet handoff, receipt link, history/reload, event reconnect and usable desktop/mobile layouts. If design is missing, build technical adapters and the minimal wallet probe; request the missing visual input before claiming final polish.

## T6 — MCP

**Own:** `src/server/mcp/` and protocol tests. Read contracts.md and current official MCP SDK transport/auth guidance.

- Expose only list_providers/create_task/get_task/get_result through the shared service layer with owner-scoped bearer tokens.
- Return a trusted browser approval URL for pending tasks; preserve token owner/session ownership. Implement issue/revoke UX through T5/T0.
- Use the deployed public origin, finite request limits and standard protocol transport. Do not forward arbitrary model URLs or wallet commands.

**Accept:** a real MCP client lists/calls tools, creates an owned task, polls planning status until it receives the approval URL, and retrieves the result after browser payment. Revoked/other-owner tokens fail; MCP cannot bypass approval or mint a receipt/permit.

## T7 — Deployment

**Own:** container/deployment configuration and runbook changes; coordinate root scripts with T0.

- Prepare the one-process production build and private persistent volume early. Deploy a minimal wallet-origin probe as soon as T1 is ready; avoid discovering wallet transport failures after UI completion.
- Configure TLS, server secrets and model/merchant/network settings through hosting secret management, not chat/Git. Establish actual model account access before enabling purchase.
- Run migrations, wallet monitor, worker and restart reconciliation. Verify both app and wallet DBs persist across redeploy; configure backups and private artifact storage.
- Complete final deployment after module integration, then inspect public readiness, browser delivery, wallet connection, MCP and SSE reconnect.

**Accept:** live HTTPS URL, successful readiness and browser evidence, correct asset delivery, durable paid-task recovery after restart and no secrets in bundles/logs. Hosting or credential gaps remain explicit BLOCKED items while independent work continues.

## T8 — Integration and qualification

**Own:** final integration fixes, verification.md, README usage/limitations and submission.md. Use a read-only reviewer for the critical payment/agent path after core tests pass.

- Exercise real model tool request, human-approved real BSV payment and completed chat task on the deployed site. Then demonstrate an actual code patch and MCP entry path.
- Capture Q1–Q5 evidence, redacted Arcade submission/status and explorer link; keep wallet prompts under human control. No extra real payments solely to repeat already passing evidence.
- Verify refusal/mismatch/replay/unknown cases, scope rejection, hard limits and separate extension approval offline; verify reload/restart recovery on the app and honest not_run labels for code checks. Ensure no post-payment surcharge or technical-retry charge.
- Update task ledger and qualification results from observations. Prepare the public repo/video/Devfolio material; do not send messages or submit externally without authorization.

**Accept:** core application checks pass, deployed user flows work and all Q1–Q5 PASS with observed evidence. If an external blocker prevents this, T8 remains BLOCKED/incomplete; do not mark it DONE. Final report distinguishes code/tests, deployment, chain payment and actual AI execution.
