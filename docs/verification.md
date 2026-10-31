# Evidence

## Documentation preparation — 30 October 2026

These are read-only setup/document checks, not an implementation preflight or qualification result.

| Check                      | Observed result                                                                                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Working tree               | `main`, no commits/remotes; project files untracked. Unrelated files retained. No application code created.                                                                         |
| Current runtime            | `node --version`: v22.15.0; `npm --version`: 11.3.0.                                                                                                                                |
| Installed starter packages | `npm ls` confirmed all seven exact BSV sponsor pins. Versions remain authoritative in the pack's AGENTS.md.                                                                         |
| Starter lock SHA-256       | `e4313f79014889f81e84ccaf4e64e4eb3c19fedf7a97f1feec97a7fca1465deb`                                                                                                                  |
| Source preservation        | All 36 developer-pack source files matched the pre-edit SHA-256 snapshot; node_modules/machine files excluded. Root guide also unchanged.                                           |
| Root guide SHA-256         | `03e9f455b27797fc29a3c7cb46457e1695b45e58f633791a78ef742e681b4c4c`                                                                                                                  |
| Wallet installation        | `/Applications/BSV-Desktop.app` exists. No wallet connection, balance inspection, native approval or payment performed.                                                             |
| Prior reference-kit checks | Previous setup recorded passing typecheck and 38 tests. Not rerun during documentation-only edits; implementation must run preflight.                                               |
| Technical source review    | Starter BRC-29 helper, guide §§14/20, installed Arcade API/status mapping; official BSV track/ts-stack and model function-calling/continuation references.                          |
| Documentation audit        | 16 project docs and 65 local Markdown links checked; balanced code fences and no stale undecided scope. Payment, agent and execution-loop reviews completed; corrections rechecked. |

Cleanup replaced stale undecided-product instructions and generic scope notes with the selected brief, contracts and task ledger. Reference code, developer pack and guide were retained. Documentation scope did not include installing application dependencies, building, deploying or sending transactions.

## Pricing documentation update — 31 October 2026

Fixed upfront quotes for bounded execution are now explicit in the brief/contracts, BSV/AI flows, UI inputs, task acceptance criteria and launch prompt. Quotes include scope, intended deliverable, numeric limits and fixed service sats; network fees remain separate. Known limit exhaustion preserves partial progress; extra scope requires a separately approved linked task. Technical recovery retains the original payment.

Checked all 16 project docs and 70 local links, balanced code fences, pricing references and source preservation against the pre-edit file hashes. Only the intended documentation changed; the developer pack, guide and application state are unchanged. No application tests, model requests, wallet actions or payments were run for this documentation update. Q1–Q5 remain PENDING.

## Repository connection — 31 October 2026

Configured `origin` as `https://github.com/ardatas/mercaTUM-.git`. Verified fetch/push URLs with `git remote -v`; read-only `git ls-remote --symref origin HEAD` succeeded. No commits, fetch/merge, or push performed; local content remains uncommitted.

## Publication preparation — 31 October 2026

Reviewed the 58 candidate files for phased commits: original developer pack/configuration, product/payment contracts, then agent workflow/evidence. Sensitive-pattern scanning found no matches; generated dependencies, credentials and wallet state are excluded. All 36 developer-pack files and the root guide match their original hashes. Checked project documentation links and code fences. No application implementation or new runtime qualification is claimed.

## Implementation preflight

31 October 2026: implementation authorized. Clean working tree at `821bcdfba1c4b174dc225297fd30e7e26bec3493`. Node v24.21.0, npm 11.19.0. Existing starter installation: `npm ls --depth=0` matches all seven sponsor pins; `npm run typecheck` passes; `npm test` passes 38/38 tests (4 files). No reinstall was needed and no developer-pack source was edited. Starter lock SHA-256: `e4313f79014889f81e84ccaf4e64e4eb3c19fedf7a97f1feec97a7fca1465deb`.

No project model/BSV/hosting variables were present in the execution environment. No project .env exists. Deployment provider, configured model account, distinct merchant key/storage, chosen network and buyer spending authorization remain to establish. No native spending or live debit authorized or performed. Application implementation may proceed; live purchases remain fail-closed.

Known live prerequisites to establish: public HTTPS wallet transport, native spending/fee-bound behavior, chosen network, funded buyer, distinct persistent provider wallet, model account/ID and persistent hosting. Missing ones become BLOCKED with a concrete next action during implementation; none has been tested here.

## Qualification

Gate definitions/evidence criteria live once in [WORKFLOW.md](../.ai/WORKFLOW.md).

| Gate                    | Status  | Project evidence                                                        |
| ----------------------- | ------- | ----------------------------------------------------------------------- |
| Q1: BSV stack           | PENDING | Pinned reference kit installed; application calls absent                |
| Q2: Standard wallet     | PENDING | Installed app found; deployed project wallet flow absent                |
| Q3: Real transaction    | PENDING | No project transaction or Arcade broadcast                              |
| Q4: Non-custodial funds | PENDING | Architecture specified; source/signing path not implemented or observed |
| Q5: Agent payment       | PENDING | Tool/payment/execution contract specified; project agent absent         |

For each PASS, add source paths, observed result and date. Missing evidence stays PENDING/BLOCKED. Documentation completion does not change these gates.

## Live run evidence template

- Deployment URL / checked application revision:
- Date / wallet name and version / network:
- Task ID / real coordinator tool call ID:
- Quote ID / attempt ID / receipt ID:
- Quoted scope / intended deliverable / numeric limits / pricing-policy version:
- Demo provider identity / distinct buyer identity confirmed:
- Approved service sats / fee policy / maximum total debit:
- Human app approval / observed native authorization:
- Recomputed txid / output index / actual sats received:
- Actual Arcade POST outcome / network status / timestamp:
- WhatsOnChain transaction link:
- Provider internalization / durable paid entitlement:
- Real model ID / actual task result / code artifact if applicable:
- Complete or limit-reached partial outcome / fixed service price unchanged:
- Coordinator resumed with original call ID:
- Reload / worker restart / same-entitlement recovery result:
- MCP create → browser approval → result observation:
- Remaining limits / failures:

Use redacted metadata only. Keep proof bytes, remittance, secrets, tokens, private prompts, repository contents and opaque model checkpoints out of committed evidence.

## Local implementation — 31 October 2026

User authorized implementation, preservation/use of seven design prompts and frequent commits/pushes, then selected **local preview now** and will configure secrets in `.env`. No deployment or live payment was performed.

- `npm run typecheck`: PASS. `npm test`: 56 passing tests across six files. `npm run build`: PASS. Dependencies use exact versions, including `@bsv/sdk` 3.2.1 and `@bsv/wallet-toolbox` 2.14.9.
- Actual Toolbox buyer/provider wallets on offline mock chain: unsigned draft review, bounded fee, wallet change/reference metadata, signed BRC-29 proof, same EF submission through injected Arcade interface, internalization, duplicate claims/proofs, pending observations, corrupt script/amount/txid/prefix, crash and revocation cases. These are offline fixtures, not live Arcade or BSV evidence.
- Ownership/CSRF, secret/checkpoint omission, idempotency conflicts, unique receipts, claims, stale workers, restart recovery, no unpaid execution, fixed model snapshot, partial-limit preservation and no second-charge recovery tested. Shared durable planning quota protects browser and MCP entry.
- Official MCP SDK client used Streamable HTTP to list four tools, submit a task into browser approval, enforce owner isolation and reject revoked tokens. Model/payment dependencies in this test are offline fixtures.
- Real GitHub smoke imported `octocat/Hello-World` at `7fd1a60b01f91b314f59955a4e4d4e80d8edf11d`; a hash-validated README change produced a patch/file artifact in memory. No source repo was modified. Browser import, immutable revision, README preview and explicit context consent were observed.
- Browser at local origin: desktop 1440px preview, composer rows 2 → 4 on focus, remains 4 after blur; new task resets to 2. Right-click file menu works with context mutation disabled after consent. Unconfigured task submission displays the actual provider-unavailable error and does not make a purchase.
- Read-only critical-path review found shared-planning quota bypass and lost partial status on resume failure; both corrected with regression tests. No unpaid-execution, duplicate-debit or cross-owner bypass found in that source review.
- Docker build initially failed because native SQLite needed Python/make/g++; these were added to the build stage and the image then built. No secrets/data enter its allowlisted build context. Runtime smoke and final browser checks recorded below when completed.
- Developer pack and root guide unchanged in Git diff. No project credentials existed at preflight; no keys, proofs or opaque checkpoints are included in committed evidence.

### Current gate assessment

| Gate | Status                            | Observed evidence / missing step                                                                                           |
| ---- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Q1   | PASS (local application evidence) | Actual SDK WalletClient/transaction and Toolbox merchant calls in app, exact lock pins, passing real-wallet offline checks |
| Q2   | BLOCKED                           | No standard-wallet connection/authorization from a deployed HTTPS origin observed                                          |
| Q3   | BLOCKED                           | No real transaction, Arcade POST/network acceptance or WhatsOnChain link                                                   |
| Q4   | PENDING live evidence             | Source and offline test keep buyer signing in wallet; live native custody/approval path unobserved                         |
| Q5   | BLOCKED                           | No configured real model + approved real payment + resumed coordinator demonstration                                       |

Public qualification is **not claimed**. Public hosting deferred by the user; live secrets, model/network/wallet and human spending remain prerequisites.

### Final local runtime/browser checks

- Built `mercatum:local` container successfully. Unprivileged production runtime served `/healthz` 200 and the app 200; `/readyz` correctly remained 503 without model/provider setup. Secure session cookie observed. The same session/CSRF survived an actual container restart with its named `/data` volume. Test-only container and volume removed afterward; no buyer/provider funds involved. An initial host port collision left the unrelated listener untouched; verification used an allocated loopback port.
- Local app at http://localhost:3000 listens on 127.0.0.1. `.env` was created only from the blank example with mode 0600 and verified ignored by Git. No secrets were generated.
- Desktop 1440px and mobile 390px browser layouts inspected. Mobile document width matched its viewport content width (375px after scrollbar), with no horizontal overflow. Drawer opens/closes; closed mobile navigation is hidden from focus/accessibility.
- Added authenticated inline file/patch previews and download controls; actual paid generated artifacts await configured model/payment evidence. Wallet SDK loads on demand. Build warning remains for the roughly 606KB initial JS chunk (about 193KB gzip); not a build failure.
- Source pack/guide parity rechecked against initial revision `821bcdf`; unchanged.

- Final preview console: no warnings/errors captured. Composer preset selection preserves expansion; only New task resets it. Local screenshot artifacts are saved under ignored `artifacts/local-desktop.jpg` and `artifacts/local-mobile.jpg`. No wallet approval, model result or chain transaction is depicted.

Application lock SHA-256 at local delivery: `e86e9f916dfbcef78e0b3474b5ad9229cbf34d69cff48970ac2f4a85267f0d7e`.

### Chat-only UI revision — 31 October 2026

- Removed the workspace hero, suggestions, capacity/explainer aside and footer. Capacity remains in its own tab; setup blockers remain visible there. Simplified navigation and page copy, with near-black primary text and darker secondary text. Payment approval details unchanged.
- `npm run typecheck` and `npm run build`: PASS. Existing large-chunk build warning remains. Browser inspected at 1440×1000 and 390×844: main contains only the chat controls, mobile document/scroll width both 390px, textarea computed color rgb(17,17,17). Composer stays at four rows after blur and resets to two on New task. Capacity navigation works; no browser warning/error logs observed. Screenshots updated in ignored artifacts directory.

### Bottom composer refinement — 31 October 2026

- Typecheck and build PASS. Desktop browser measured 720×107px initially and 780×147px after focus, retaining a 24px bottom gap. Blur preserves expansion; New task restores 720×107px. Replaced intrinsic row-count jump with a 360ms eased height/width transition without overshoot.
- Mobile 390×844 measured 362×146px expanded, 16px bottom spacing and no horizontal overflow. Screenshots updated. Existing reduced-motion override remains in effect.

### Vercel / Gemini deployment preflight — 31 October 2026

User now authorizes public Vercel deployment and Gemini with the supplied server key. Baseline revision 9273702: Node 24.21.0 / npm 11.19.0; app typecheck and all 56 tests pass; sponsor starter typecheck and all 38 tests pass. Installed app pins SDK 3.2.1 / Toolbox 2.14.9. Gemini models.list succeeded with the provided credential; gemini-3.8-flash supports generateContent. Actual tool/stream capability checks still pending. Existing Vercel CLI login expired; browser authorization requested. Dedicated mercaTUM Google Cloud project has billing enabled; persistent backend provisioning is in progress because Vercel function filesystems cannot hold the payment ledger. No BSV payment authorized or performed.

Gemini live capability evidence: gemini-3.8-flash returned an actual capability_probe function call with an original provider call ID; continuation returned successfully (both HTTP200, STOP). Real chat scope assessment and request_paid_execution also succeeded with matching task/provider/answer arguments; reported planning usage624 input/78 output tokens. No paid executor call or receipt was fabricated. Initial MINIMAL thinking setting was rejected; changed to supported LOW and reran successfully.

### Public backend and Vercel delivery evidence — 31 October 2026

- Backend deployed at https://api.mercatum.35.198.77.207.sslip.io with a valid public TLS certificate. Image digest `sha256:1031d23426cc1dfac74cb31f6423c06ad59caa238cfb7115b04428962626789f`, source app revision `b043845`; Vercel/operations configuration added in `640770f`. Container runs unprivileged on a dedicated e2-small VM,20GB persistent disk; runtime secrets are fetched from scoped Secret Manager. The new merchant key controls only provider revenue, never buyer funds.
- Public `/healthz`200; `/readyz`503 with model=true,wallet=true,paymentsEnabled=false. The sole readiness blocker is native-wallet validation before enabling payments.
- Real public API chat task `2bccb65d-def2-44d8-9f44-a235a33ce806` and official MCP client task `ddcb000f-7135-409d-9b96-55e5b01abc6e` reached AWAITING_APPROVAL. Four MCP tools listed successfully. After an actual container restart, the same cookie/CSRF, provider identity, both tasks and MCP token survived. No new session cookie issued; no receipt or paid result existed. Verification MCP token revoked afterward.
- Public GitHub import pinned octocat/Hello-World at `7fd1a60b01f91b314f59955a4e4d4e80d8edf11d`; explicit README context selected. Code task `7318987d-54da-4f5c-b9b2-35db1dd07cda` reached real Gemini AWAITING_APPROVAL. No paid patch generated.
- Public SSE returned three persisted task events; unauthenticated task read returned401. Built client assets scanned against configured keys/secrets: zero matches.
- Browser at the public backend origin displayed gemini-3.8-flash, accepted a chat prompt, showed real planning and then agent-requested-payment/awaiting-approval events for task `68eb572e-dfe1-4be7-8edc-b9dfffcf29c3`.
- Vercel GitHub import is configured for project mercatum-ai, Vite frontend build and external API/MCP rewrites. Sensitive Gemini key was entered into the import form. Creating the deployment triggered Vercel email reauthentication; the user must enter the one-time code in the open tab. Project/env persistence, production alias and Vercel delivery are NOT claimed until verification completes. The canonical application URL temporarily uses the deployed backend for a working HTTPS preview.
- Daily disk snapshot policy mercatum-daily is attached,03:00UTC window,7-day retention. Snapshot restore is untested. VM/disk/IP/registry/secret usage are billable resources in the dedicated mercaTUM project.
- Application typecheck/build and72 tests pass; sponsor starter typecheck and38 tests pass. Q1 remains local PASS. Q2–Q5 remain incomplete without native-wallet, actual Arcade transaction and receipt-backed paid model output; real planning alone does not establish Q5.

### Verified Vercel production delivery — 31 October 2026

- Vercel project mercatum-ai, team ardas-projects-cc4a1f2c: deployment `F8qvQo6gFyqBJRutbCyzCX73sc8L` is Ready/Production at commit `2f4dc11`, built in 25 seconds. The GitHub integration completed deployment despite the earlier manual-import challenge. Public alias https://mercatum-ai.vercel.app returns 200. Vercel settings show GEMINI_API_KEY as a Secret environment variable; its value was not revealed.
- Runtime secret version 3 sets PUBLIC_APP_URL to that alias. Redeployed the existing immutable backend image digest recorded above; health check passed. Payments remain disabled. Through Vercel, /healthz returns 200 and /readyz reports model=true,wallet=true,paymentsEnabled=false.
- Actual Vercel browser task `dd169715-61e4-42c2-bd83-8d5bf02e0a23` reached AWAITING_APPROVAL after a real Gemini request_paid_execution call. Reload preserves the task and events. No browser warnings/errors captured. Mobile viewport/document widths both 390px; screenshot artifacts retained locally.
- Official MCP client through Vercel listed four tools and read an existing owned task with the correct Vercel approval URL. Temporary token revoked. Existing session/task survived the origin switch/redeploy. SSE proxy returned 200 text/event-stream and persisted events. Entry JS/CSS assets returned 200; checked configured secret values had zero matches.
- WalletClient connection from the production alias returned no wallet available over any communication substrate. BSV Desktop is installed/running according to app inventory, but macOS is locked and cannot be automatically unlocked. Human asked to unlock and open BSV Desktop. No quote or native spending approval was performed. Q2/Q3/Q5 remain BLOCKED and Q4 awaits live custody evidence.

- Follow-up: BSV Desktop 3.3.1 listens on loopback ports 3321 and 2121. Read-only WalletClient calls from Node (with the application originator) return authenticated=true, wallet-brc100-1.0.0 and mainnet. This proves local API availability, not browser-origin integration. Desktop UI confirmed Mainnet. The app remains testnet; user asked to select the demo network before configuration changes or spending. In-app browser retry still failed; Chrome navigation could not complete because macOS locked again.
- The documentation push `cc0797e` also deployed successfully: production deployment `XWhEPaob4q4D6TC4v3Us4BVLw7Gz` observed Ready. No further account verification was needed for GitHub deployments.

### Testnet selection

- User selected a funded testnet wallet for the demo. Production authenticated /api/wallet-config returns 200 with network=testnet. Read-only local WalletClient.getNetwork still reports mainnet.
- BSV Desktop exposes its network button and Settings in accessibility, but interaction did not change its UI; a coordinate attempt reported no available window. Raising/refetching the window did not resolve this. User asked to select Testnet and the funded wallet manually. No payment request or native spending approval issued.

### Buyer testnet confirmed

- After the user switched networks, local SDK getNetwork/isAuthenticated returned testnet/true. BSV Desktop 3.3.1 displayed Testnet and 0 satoshis. The network mismatch is resolved; the wallet is not yet funded.
- Chrome automation returned no available window; clicking Get paid in BSV Desktop did not navigate. Deployed-browser wallet connection remains unverified. No createAction/signAction or purchase approval was attempted.
- The BSV Association faucet at https://bsvfaucet.com is reachable and advertises free testnet coins with email/wallet sign-in and a testnet receiving address. Sign-in page inspected; no account login, address submission or funding request performed.

### Mainnet selected and live Safari wallet connected — 31 October 2026

- User explicitly superseded testnet with mainnet and permitted real satoshis. Exact purchase and native wallet approval remain human actions under AGENTS.md and the execution workflow.
- Before switching, the persistent ledger had zero quote/attempt records and zero receipts. Runtime secret versions 4 then 5 changed APP_NETWORK=mainnet and enabled quoting after actual browser connection. Existing immutable backend image redeployed successfully; application storage and testnet provider database preserved, separate provider-mainnet.sqlite initialized. Public /readyz returns ready=true,model=true,wallet=true,paymentsEnabled=true,blockers=[].
- Live Safari at https://mercatum-ai.vercel.app displays Wallet connected, mainnet, buyer identity prefix 02a65cf1. BSV Desktop 3.3.1 displayed a funded mainnet balance. Provider identity is 023551896f880cedb3f5a41dc02c52f22354b573fe65df475a7ad7101715b1ae01, distinct from the buyer. The in-app browser transport failure does not occur in Safari.
- Task 396514dd-1807-49b3-bc7b-760ebdf5eb28 reached real Gemini 3.8 Flash request_paid_execution at 08:27:07 Europe/Berlin. Its quote was prepared at 08:27:20, expiring 08:37:20: 100 service sats on mainnet, proposed maximum total debit 150 sats. Scope is a concise two-sentence binary-search explanation. Limits: 4,096 output tokens/call, 4 paid calls including recovery, 10,240 aggregate output tokens, 180 seconds/attempt, 1 recovery attempt, 48,000 context bytes.
- Quote checkbox remains unchecked; approval button disabled. No createAction/signAction, payment attempt, receipt or paid result observed. Screenshot retained in ignored artifacts/mainnet-quote.jpg. Live unsigned-draft metadata, fee enforcement, human native approval, Arcade submission and receipt-backed continuation are still unverified.
- Current gates: Q1 local PASS; Q2 connection observed but authorized flow pending; Q3/Q5 BLOCKED on exact purchase/native approval; Q4 live custody/signing evidence PENDING. No qualification claim. Runtime-only configuration and documentation changed; prior 72 application tests, typecheck/build and 38 sponsor tests are recorded above and were not rerun for this configuration-only step.

### Local typography preflight — 31 October 2026

- User requested larger, bolder interface text. Starting revision `542ffee`; working tree clean. Node 24.21.0 / npm 11.19.0. Application typecheck and 72 tests PASS; sponsor starter typecheck and 38 tests PASS. `npm ls --depth=0` matches all seven sponsor pins; app SDK 3.2.1 / Toolbox 2.14.9. Existing dependencies retained.
- Scope is local CSS readability. Local health passes; model and provider-wallet readiness are false, payments disabled. No wallet/payment action needed for this change. Public qualification gates unchanged.

- Implemented readable type sizes throughout: previous 10–12px labels now 14–16px; composer 18px/600; navigation 16px/600; body defaults to medium weight and headings use stronger weights. Sidebar text contrast increased. Sidebar/composer spacing and capacity dials accommodate larger text.
- Production build PASS (existing >500KB bundle warning retained), `git diff --check` PASS. Local browser reload confirms computed fonts; workspace at 764px and 390px has no horizontal overflow. At 320px, capacity dials and labels fit after a responsive sizing correction. No browser warnings/errors observed. Final screenshot: ignored `artifacts/typography-local.png`. Local assets rebuilt and served at localhost:3000; no public deployment performed for this typography change.

### Conversational UI preflight — 31 October 2026

- User supplied reference 8 (preserved verbatim) and requested a message/answer chat with temporary thinking steps. Prior uncommitted typography changes preserved. Runtime/pins and sponsor preflight from the same implementation session remain valid (dependencies unchanged); current app baseline typecheck and 72 tests PASS. Local model/wallet readiness blockers unchanged.
- Inspected an actual signed-out ChatGPT exchange using a harmless binary-search prompt: right-aligned user bubble, plain assistant answer, bottom composer. Implementation will use real public task events, with no timed fictional activity or hidden reasoning.

- Implemented user message bubble, plain assistant Markdown and persistent sticky composer. New messages are still independent quoted tasks; no implicit prior-chat context or payment authorization. Enter sends, Shift+Enter inserts a newline, IME composition is guarded, keyboard submission respects repository consent. Copy/details and verified receipt remain accessible.
- Reference 8 adapted in `thinking.tsx`: 13px/500 header, 12.5px/500 rows, system sans, expandable line trace, shimmer and reduced-motion CSS. Only allowlisted event labels render; event payloads and unknown events are omitted. Trace disappears on the first streamed answer or result, and is absent during approval/failure/unknown/completed states. Streaming is scoped to the latest execution.started event, preventing previous-attempt output from appearing during retry.
- Typecheck and 85 tests PASS, including 13 new progress/privacy/retry checks. Production build PASS. Browser used the isolated `test/fixtures/chat-preview.html` harness on port 5174, which replaces transport only inside this test entry and is not included in production. Observed expand/collapse, planning/running/streaming/completed, approval/failure, composer persistence, Shift+Enter newline and Enter submission. Mobile widths 390 and 320 had no horizontal overflow; computed header/row sizes 13/12.5px and chat answer 15px, mobile textarea 16px. No browser warnings/errors in the fixture. Screenshots `artifacts/chat-thinking-offline.png` and `artifacts/chat-answer-offline.png` are explicitly labelled offline fixtures, not real paid execution evidence.
- No BSV code, server behavior, credentials, sponsor pack or qualification gates changed. Public deployment and real locally paid model results remain unverified for this revision.

### Interactive grid / neutral spectrum theme preflight — 31 October 2026

- User supplied reference 9; saved verbatim. Prior uncommitted UI work preserved. Same-session Node 24.21.0/npm 11.19.0, sponsor pins/typecheck/38 tests and current app typecheck/85 tests/build remain valid; no dependency or backend changes planned. Local model/wallet readiness remains blocked.
- Source defines charcoal neutral dots, transparent background and cursor-position HSL accents rather than a fixed background palette. Adaptation uses neutral charcoal/white/gray surfaces and spectrum accents in an empty-chat grid that is removed once a request is present.

- Implemented `interactive-grid.tsx` in the existing UI component directory. It renders only in empty chat, above the composer. Pointer coordinates determine hue correctly; event-based coalesced drawing replaces the reference's accumulating animation loops. Container ResizeObserver, capped DPR scaling, cleanup and reduced-motion/coarse-pointer guards implemented. Palette removes blue-gray casts across navigation, forms, cards, chat, code previews and dialogs; capacity arcs use spectrum gradients.
- Typecheck and production build PASS. Browser at localhost:3000: grid visible, two pointer positions visibly changed magenta/green connections; Code mode removed the canvas; capacity view displayed spectrum arcs. At 390px, canvas and document width both 390px, no horizontal overflow; canvas is aria-hidden. No browser warnings/errors observed. Screenshot: ignored `artifacts/grid-theme-local.png`. Reduced-motion/coarse-pointer guards inspected in source, not verified with OS preference changes.
- Local frontend assets rebuilt. No dependency, server, payment, credential or sponsor-pack changes. Live qualification remains unchanged.

## 31 October 2026 — fee-cap recovery preflight

- Revision `9f421788bffcae277be749f0df581ff2be1f0507`, clean working tree before this fix. Node v24.21.0; npm 11.19.0. App lock SHA-256 `e86e9f916dfbcef78e0b3474b5ad9229cbf34d69cff48970ac2f4a85267f0d7e`.
- App `npm ls --depth=0`, `npm run typecheck`, `npm test`: PASS, 85 tests. Sponsor starter installed pins match AGENTS; typecheck and 38 tests PASS. No dependency or developer-pack edits.
- Observed Safari task `51f93096-ab0b-4252-b555-2cff0749b2f8` on the public HTTPS origin, buyer wallet connected mainnet. UI remains in payment reconciliation following the reported unsigned fee rejection. Exact historical fee/abort outcome pending wallet inspection; no new payment authorized or initiated.
- T1/T2 recovery fix owned by coordinator. Preserve real spending approval and all unresolved signed attempts; Q3/Q5 remain PENDING.

- Reproduced with `npx vitest run test/payments.test.ts -t 'never signs a real draft'`: FAIL (saved phase `draft`, expected `unsigned_aborted`). Expanded through real offline Toolbox abort/history and server recovery; PASS after fix. Normal listActions omits failed actions; pinned `specOpFailedActions` plus attempt/reference identifies the old failed unsigned record.
- `npm run typecheck`, `npm test` (87 tests), `npm run build`: PASS. Checks cover confirmed abort, legacy record recovery, abort refusal/timeout, sign-requested exclusion, fresh quote, ownership, idempotency, one wallet invocation and rejection once proof exists. No live wallet spend.
- Previous backend digest for rollback: `europe-west3-docker.pkg.dev/gen-lang-client-0426046080/mercatum/app@sha256:1031d23426cc1dfac74cb31f6423c06ad59caa238cfb7115b04428962626789f`. Current UI revision 9f42178 has a successful Vercel GitHub status; Safari displays that conversational UI.

- Live Safari after initial deployment exposed an SDK boundary mismatch: `Invalid listActions result actions[0].txid: expected 32 hexadecimal bytes` for the already-aborted record. Direct Toolbox tests missed WalletClient validation. Replaced history recovery with the validated `WalletClient` path: retry the exact draft abort; on an abort error require every original draft input to be available/spendable with matching amount in the original buyer wallet. Explicit refusal stays blocked. Expanded regression through `new WalletClient(buyer)`; no SDK validation or dependency pins bypassed. Legacy live retry pending.
- Backend digest `96ad474ed43c21ef74d68dec9a57d608793fdefb1b65ec7df92c38c061aeb25b` healthy. Initial frontend commit `98ce94d`, Vercel deployment `6n5ShE5DDdgr1k4LL5uSDPB3UN43`, live bundle `/assets/index-BCj4QGZC.js` contains recovery code; Safari renders the new controls.

- Live Desktop also rejects application access to the default basket (`listOutputs` HTTP 400; basket is admin-reserved). Removed that fallback instead of bypassing wallet permissions. Legacy recovery now requires the original saved `draft` phase, unsigned input scripts, original wallet identity/network and a recomputed payment/fee exceeding the immutable server approval. That exact application branch cannot reach `signAction`; a positive abort refusal still blocks recovery. The server records whether a fresh abort acknowledgement exists and requires the same over-limit arithmetic when absent. Full SDK regression, in-cap/uncertain safeguards, typecheck, 87 tests and build PASS.

- Extended the complete offline payment integration to `new WalletClient(buyer)`; it reproduced the same empty-txid validation failure in unsigned change-history review, which would block the next purchase. Replaced history review with standard `noSend: true` / `noSendChange` output metadata, bound to the exact unsigned txid and every non-payment output. Native signing returns the same reviewed transaction without broadcasting; existing server verification/Arcade submission handles that same transaction. Full WalletClient offline payment → verified receipt/internalization now passes. No native approval or live transaction executed.

### Final observed result

- Frontend `0bb29ea`: Vercel GitHub status SUCCESS, deployment `2fWf879N49vtaQEXyZYEXsCy8Vhr`; canonical live entry `/assets/index-BMNDPhle.js`, wallet chunk `/assets/payment-b2vfZv0j.js`. Confirmed final noSendChange code and absence of the abandoned failed-history selector.
- Backend image `aa6647acc707a887d47b589bd6e3108c5f05d2b00b5040fc446db500fdc36ca3` deployed by digest; public health and ready endpoints pass with existing durable data.
- Safari: Reconcile payment recovered the original task `51f93096-ab0b-4252-b555-2cff0749b2f8` to AWAITING_APPROVAL. Observed message: 100 service sats + 94 draft fee sats = 194 total, above original approved 110 sats; saved unsigned draft never reached signing. Fresh abort acknowledgement unavailable and not claimed.
- Connect & review quote produced a fresh 100-sat mainnet quote to the distinct provider, expiring 11:28:26 Europe/Berlin. Consent remains unchecked and approve button disabled. A page reload retained the recovered state and quote. No new payment attempt or native spending was initiated.
- Final typecheck, 87 tests and production build PASS, including full SDK WalletClient offline payment path. Developer pack/pins untouched. Real native signing, Arcade POST and paid model result remain PENDING until a human approves a purchase; this recovery is not Q3/Q5 qualification.

## Marketplace implementation preflight — 31 October 2026

- Starting revision `22fbd64`; clean working tree. Node 24.21.0 / npm 11.19.0; lock SHA-256 `e86e9f916dfbcef78e0b3474b5ad9229cbf34d69cff48970ac2f4a85267f0d7e`. App typecheck, 87 tests and build PASS. Sponsor installed packages match all seven pins; typecheck and 38 tests PASS. Developer pack remains unchanged.
- Public readiness observed: model, provider wallet and payments enabled, ready=true. Existing separate mainnet provider/buyer evidence remains as recorded above; no new connection/spending authorization is inferred. Local readiness did not return success. No live payment is needed for this UI change; Q3/Q5 remain pending human approval.
- Coordinator owns catalog/contracts, selector integration and checks; delegated marketplace owns isolated UI/assets, research owns model references. New scope: marketplace-first with collapsible navigation, colorful offers, capacity/score visuals, selected-offer chat and model/effort choices.

- Implementation checks: typecheck, 92 tests and production build PASS; independent read-only review found no actionable contract/payment regressions. Added cases reject unsupported/cross-offer models, preserve saved actual model/native effort and idempotency, and enforce unchanged generation caps.
- Browser observed in offline harness: marketplace initially full width with navigation absent; Claude filter yields two offers; selecting Max opens chat; switching to Sonnet and Maximum persists through submission; controls lock during planning; approval remains wallet/quote gated. 320px chat effort popover and 390px marketplace visually fit. No live paid execution claimed.
- Previous backend digest for rollback: `aa6647acc707a887d47b589bd6e3108c5f05d2b00b5040fc446db500fdc36ca3`. Built linux/amd64 image `c0bda0cd69f953eb4b187151819acad0edf00582864ed3d3f7cbc1c5e33fb96d`, deployment verification pending.

### Marketplace deployed evidence

- Code revision `568e858` pushed to main. Vercel status SUCCESS, deployment `C8QDFcpwpDVZCBfEAFGvzNzR9vUt`; canonical delivered assets `/assets/index-DfeBWeNQ.js` and `/assets/index-Cabso7Mv.css`. Backend deployed by digest `c0bda0cd69f953eb4b187151819acad0edf00582864ed3d3f7cbc1c5e33fb96d`, preserving the existing persistent volume; public health/readiness PASS.
- Live browser at https://mercatum-ai.vercel.app: marketplace first, navigation hidden, all six local logos loaded. Document client/scroll width both 1265px. Search for Kimi returns one offer; capacity sort places Gemini then DeepSeek first. Clicking Kimi opens its branded chat, with K3.1 Pro and Low/High/Maximum options.
- Live task `acd9d458-60fd-4e11-ad92-1281968032a0`, selected Kimi K3.1 Pro/High, reached AWAITING_APPROVAL through real model planning. Reload preserved offer, model and High effort; settings remain locked. No quote approval, native wallet action, payment or paid execution initiated. Q3/Q5 still pending human approval; a real paid call with the new effort setting is not claimed.
- Preview saved to ignored `artifacts/marketplace-live.png`. Offline mobile inspection covered 390px marketplace and 320px chat/model-effort popover. No runtime dependency or sponsor-pack changes.

## Dark workspace and compact marketplace revision — 31 October 2026

- Clean starting revision fbf8d9a. Same implementation session: Node 24.21.0/npm 11.19.0, unchanged lock/pins, app typecheck/92 tests/build and sponsor typecheck/38 tests passed above. Scope is presentation/navigation only; no payment or AI adapter edits. Existing mainnet approval boundaries and live qualification gaps remain unchanged.
- Coordinator owns shared dark theme, fixed desktop navigation, compact readable marketplace cards and responsive verification. User supersedes the previous collapsed-desktop-sidebar preference.

- Browser: completed-answer and approval offline fixtures show dark surfaces and readable controls; desktop sidebar remains visible. Responsive harness at 1440px (1425px content viewport with scrollbar) reports five columns and equal client/scroll widths. 320px chat reports equal client/scroll widths; menu opens and Marketplace returns to catalog with drawer closed. Cards use 22px titles, 28px metrics, 12px minimum labels (13px on mobile), approximately 244px height on wide desktop.

- Final revision checks: typecheck, 92 tests, production build and diff whitespace check PASS. Presentation/navigation only; backend, secrets, BSV and model configuration unchanged.

- Deployed frontend code `98c1bee`, Vercel `EVJa5hZaP77LJmwNWKQi1Ht2mWCp` SUCCESS. Canonical live assets `index-BJC_CEDf.js` / `index-wPF5RNl8.css`. Browser confirms fixed visible desktop sidebar, dark Claude chat/composer/effort menu, and direct sidebar return to Marketplace. At 1265px, document client and scroll widths both1265, card height243px, metric labels12px and titles22px. Screenshot: ignored `artifacts/dark-chat-live.png`. No backend rollout or payment action needed for this presentation-only revision.

## Remove Capability profile — 31 October 2026

- Clean starting revision 321c003. Same-session preflight remains valid: unchanged runtime/lock/sponsor dependencies, prior92 tests/typecheck/build PASS. Narrow UI removal only: delete the profile panel and its hover state; retain offer scores and remaining-capacity summary. No payment/backend change.

- Removed profile component, selector, radar SVG, hover state and obsolete CSS. Remaining capacity summary spans the row. Typecheck/build and diff check PASS.

- Deployed code `39e2925`; Vercel `2J5tH3ygUdpYMUkNfMret4tFZc1m` SUCCESS. Canonical assets `index-BcuGlXsy.js` / `index-DxuUY84D.css`. Live browser confirms no Capability profile text or panel, capacity summary retained, and equal document client/scroll widths of1265px. Screenshot: ignored `artifacts/marketplace-no-profile-live.png`.

## Supplied brand logo — 31 October 2026

- Clean starting revision `373647e`; same implementation-session preflight remains valid. Node24.21.0/npm11.19.0 confirmed; dependencies and lockfiles unchanged. Prior application92/sponsor38 tests pass. Coordinator owns this narrow UI asset replacement; payment gates remain pending.

- Original user PNG copied unchanged to `public/brands/mercatum.png`. Sidebar40px/header28px images load with correct dimensions in the local browser. Browser/touch icon links added; obsolete generated mark styles removed. Typecheck/build/diff check PASS.

- Deployed `d460d7d`, Vercel `D8DzSyXLREoRYPYpHhX2G77UbWcW` SUCCESS. Live assets `index-B8XnFQ-a.js` / `index-SnwU1Ea0.css`; browser confirms both logo images loaded at40px/28px and favicon references the supplied PNG. Screenshot: ignored `artifacts/mascot-logo-live.png`.

## Persistent chat background — 31 October 2026

- Clean starting revision `83ac897`; same-session preflight valid with unchanged dependencies/runtime. Coordinator owns a presentation-only change: retain InteractiveGrid for every chat state. Existing payment qualification blockers unchanged.

- Removed task/pending guards from chat InteractiveGrid. Local offline harness confirms canvas during planning and streaming and alongside a completed answer (421px canvas height). Screenshot: ignored `artifacts/chat-background-completed.png`. Typecheck/build/diff check PASS.

- Deployed `7af0b12`; Vercel `59G8Z8AcLnyVNMVT2FpeNVuuiWa2` SUCCESS. Existing live task `acd9d458-60fd-4e11-ad92-1281968032a0` displays the421px background canvas alongside its saved prompt and approval view. Screenshot: ignored `artifacts/chat-background-live.png`. Completed-answer behavior verified with offline harness only; no payment or paid execution initiated.

## Single task history deletion — 31 October 2026

- Preflight: clean starting revision `1016c8d`; Node24.21.0/npm11.19.0; lock SHA-256 `e86e9f916dfbcef78e0b3474b5ad9229cbf34d69cff48970ac2f4a85267f0d7e`. App typecheck,92 tests/build PASS. Sponsor packages match all seven pins; typecheck/38 tests PASS. No dependency changes or fresh install needed; developer pack unchanged.
- Public readiness observed ready/model/wallet/paymentsEnabled=true. Existing mainnet provider and buyer connection evidence is documented above; no new wallet connection or spending approval inferred. Q3/Q5 remain pending.
- Coordinator owns T0/T5 slice: owner-scoped persistent removal of one task from history, per-item controls and confirmation, preserving payment/execution records and direct recovery links. Local and public verification recorded below.

- Implementation:94 tests, typecheck and build PASS. API regression covers unauthenticated/foreign-owner/CSRF/Origin rejection, strict body validation, duplicate delete and preserving the other entry. Disk restart and completed worker update preserve history removal and the original receipt/result.
- Chrome offline fixture: Cancel retains both chats; deleting the selected chat clears its URL/composer and leaves the other chat; reload retains removal. History menu failure leaves the item and shows an actionable error. In-app browser native-confirm testing stalled; replaced native confirm with an accessible in-app dialog and completed checks in Chrome.
- Backend rollback digest: `c0bda0cd69f953eb4b187151819acad0edf00582864ed3d3f7cbc1c5e33fb96d`. New linux/amd64 image digest: `7de492e5a07967d35ef06db34490b49f348af73dc613d33e3cc6736e9b496584`.


- Public deployment: code `32be4d2`, Vercel `5SKPs7jj5Z2KFwcoTP3pJtaubkeb` SUCCESS; served assets `index-C8ec5LY7.js` / `index-zRawHj6O.css` both200. Backend deployed by digest above; public readiness healthy. Developer pack unchanged.
- Live API disposable task `11cf0040-5080-4d36-88d6-8927ffc54c1f`: invalid CSRF403, repeated authorized removal200, missing from history, direct recovery200, no attempt/receipt.
- Chrome live UI disposable task `f6b49f91-f5f0-4a42-ac09-c428c207e919`: history-row menu opens confirmation; deleting the selected task removes sidebar/history entry and task URL; reload still shows empty history. Screenshot: ignored `artifacts/history-delete-live.png`. No pre-existing user history removed, wallet action or payment initiated. Q3/Q5 remain pending.

## New task opens marketplace — 31 October 2026

- Same-session preflight remains valid. Existing concurrent task-history edits preserved. Coordinator owns only the New task navigation handler: sidebar button, recent-tasks plus and empty-history Create a task open Marketplace; choosing an offer and Request more work retain their chat behavior.

- Typecheck/build PASS. Local browser confirms both sidebar New task controls open Marketplace and choosing Claude opens a fresh chat.

- Deployed `a2bf44e`; Vercel `CuPqX4Nm5ygiEudb4o86i4Wb4rL4` SUCCESS. Served bundle `index-CekV2wdR.js` contains the marketplace handler. Local interaction checks passed. Live UI interaction verification remains PENDING: browser clicks produced no transition and Safari reported the Mac is locked. Concurrent history changes remain unstaged and excluded from this deployment.

## Taller branded wallet button — 31 October 2026

- Clean starting revision `a7e5248`. Same implementation-session preflight remains valid: unchanged lock/dependencies, Node24.21.0/npm11.19.0; app94 tests/typecheck/build and sponsor38 tests/typecheck PASS above. Presentation-only T5 change owned by coordinator; wallet/payment behavior unchanged.
- Source: official BSV website wordmark, https://bsvblockchain.org/wp-content/uploads/2025/10/logo-bsvb.svg (retrieved31 October2026). Store the unmodified logo locally, with a white CSS treatment for contrast on the dark button; increase sidebar button minimum height to72px.

- Typecheck/build/diff check PASS. Browser observed72px button height at desktop (191px button width) and mobile drawer (236px width); BSV SVG loaded in both. No wallet operation triggered. Frontend-only change; backend rollout unnecessary.

- Deployed `d2d6570`; Vercel `ADhFifSsuveF4uh2SSssAEiHBWEV` SUCCESS. Public assets `index-CtznOT1R.js` / `index-CvpVGaz_.css` contain the logo reference and72px button rule; `/brands/bsv.svg` returns200 and exactly matches the source file. Local desktop/mobile visual checks passed. Public visual recheck remains PENDING because Chrome control timed out; two viewport-reset attempts also timed out. No wallet action performed.
