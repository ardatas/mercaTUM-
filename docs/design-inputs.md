# Design prompt slots

The user will supply visual direction next. These slots are inputs, not implementation authorization. Supply references/screenshots or a prompt for each component; one annotated screen may cover several slots. Technical payment/task contracts still apply.

## D0 — Brand and app shell

**Prompt: PENDING**

Provide product name/logo direction, color/type references, spacing/density, desktop layout, mobile behavior, navigation and chat/code switching. State what should feel distinctive. No final visual style has been selected.

## D1 — Chat workspace

**Prompt: PENDING**

Composer, conversation layout, provider selector, attachment/context indicator, empty state and new task. Include the point where a task becomes a purchase and later messages create new paid tasks.

## D2 — Code workspace

**Prompt: PENDING**

Public GitHub repository/ref picker, resolved revision, file tree, context selection/consent, read-only source preview, changed-file view and diff. Include import limits/errors and patch download. No terminal execution is promised.

## D3 — Demo capacity listing

**Prompt: PENDING**

Provider card/detail, capabilities, price in sats and availability labels. Keep “Demo provider” visible. Actual execution uses the operator's configured API; there is no seller dashboard or consumer-account login.

## D4 — Wallet and approval

**Prompt: PENDING**

Connect/disconnected/locked/wrong-network states, quoted scope/intended deliverable, model, numeric limits, exact fixed service sats, provider recipient, fee policy/maximum debit, explicit approve/cancel, native-wallet handoff and pending verification. Show quote expiry and limit-exhaustion terms; distinguish rejected, unknown and verified payment. Approval cannot be hidden in “Run”.

## D5 — Run activity and recovery

**Prompt: PENDING**

Planning/scope check, tool request, awaiting approval, payment pending, real execution, streamed output, limit-reached partial progress, paid failure and retry. Show “Request extension” as a separate newly quoted task; technical recovery uses the existing payment. Provide a compact progress/activity treatment; never display hidden reasoning or fake tests. Unknown payment offers reconciliation rather than another charge.

## D6 — Result and receipt

**Prompt: PENDING**

Answer/artifact presentation, copy/download, actual changed-file diff, measured usage if available, fixed payment amount/network/txid/WhatsOnChain link. Distinguish “payment verified”, “task completed”, “limit reached: partial result” and “checks not run”. Usage metrics never imply an additional charge or refund of unused token allowance.

## D7 — History and agent access

**Prompt: PENDING**

Task history/resume, session/wallet indicator, MCP connection instructions and owner token issue/revoke UI. Include token secrecy and the browser approval link external agents receive. No secrets appear in screenshots or example configuration.

## Minimum useful next input

An overall desktop reference plus D1, D2 and D4 is enough to start visual implementation. State mobile expectations and provide the name if decided. Implementation can prepare contracts, backend, wallet probe and tests while missing visual slots remain pending; final UI polish waits for the user's direction.
