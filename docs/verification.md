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

PENDING: run [.ai/WORKFLOW.md](../.ai/WORKFLOW.md) after implementation is requested. Record checked revision/app lock hash, runtime, commands/results, wallet/network/funds, provider readiness and hosting prerequisites. Do not reuse reference-kit evidence as application evidence.

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
