# Evidence

## Documentation preparation — 30 October 2026

These are read-only setup/document checks, not an implementation preflight or qualification result.

| Check | Observed result |
|---|---|
| Working tree | `main`, no commits/remotes; project files untracked. Unrelated files retained. No application code created. |
| Current runtime | `node --version`: v22.15.0; `npm --version`: 11.3.0. |
| Installed starter packages | `npm ls` confirmed all seven exact BSV sponsor pins. Versions remain authoritative in the pack's AGENTS.md. |
| Starter lock SHA-256 | `e4313f79014889f81e84ccaf4e64e4eb3c19fedf7a97f1feec97a7fca1465deb` |
| Source preservation | All 36 developer-pack source files matched the pre-edit SHA-256 snapshot; node_modules/machine files excluded. Root guide also unchanged. |
| Root guide SHA-256 | `03e9f455b27797fc29a3c7cb46457e1695b45e58f633791a78ef742e681b4c4c` |
| Wallet installation | `/Applications/BSV-Desktop.app` exists. No wallet connection, balance inspection, native approval or payment performed. |
| Prior reference-kit checks | Previous setup recorded passing typecheck and 38 tests. Not rerun during documentation-only edits; implementation must run preflight. |
| Technical source review | Starter BRC-29 helper, guide §§14/20, installed Arcade API/status mapping; official BSV track/ts-stack and model function-calling/continuation references. |
| Documentation audit | 16 project docs and 65 local Markdown links checked; balanced code fences and no stale undecided scope. Payment, agent and execution-loop reviews completed; corrections rechecked. |

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

| Gate | Status | Project evidence |
|---|---|---|
| Q1: BSV stack | PENDING | Pinned reference kit installed; application calls absent |
| Q2: Standard wallet | PENDING | Installed app found; deployed project wallet flow absent |
| Q3: Real transaction | PENDING | No project transaction or Arcade broadcast |
| Q4: Non-custodial funds | PENDING | Architecture specified; source/signing path not implemented or observed |
| Q5: Agent payment | PENDING | Tool/payment/execution contract specified; project agent absent |

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

| Gate | Status | Observed evidence / missing step |
|---|---|---|
| Q1 | PASS (local application evidence) | Actual SDK WalletClient/transaction and Toolbox merchant calls in app, exact lock pins, passing real-wallet offline checks |
| Q2 | BLOCKED | No standard-wallet connection/authorization from a deployed HTTPS origin observed |
| Q3 | BLOCKED | No real transaction, Arcade POST/network acceptance or WhatsOnChain link |
| Q4 | PENDING live evidence | Source and offline test keep buyer signing in wallet; live native custody/approval path unobserved |
| Q5 | BLOCKED | No configured real model + approved real payment + resumed coordinator demonstration |

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
