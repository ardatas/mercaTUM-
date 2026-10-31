# Status

Updated: 31 October 2026. Persistent backend deployed; Vercel account verification pending.

- Repository: ardatas/mercaTUM-, main; frequent commits/pushes authorized.
- User now requests public Vercel deployment and Gemini. API credential is stored only in ignored local configuration and backend Secret Manager; Vercel import form has a sensitive key field pending account verification.
- Public interim preview: https://api.mercatum.35.198.77.207.sslip.io. Canonical origin temporarily points there until the Vercel production alias is verified.
- Prepared Vercel project name: mercatum-ai. Owner must complete the email security-code challenge in the open import tab; no successful Vercel deployment is claimed yet.
- Native Gemini 3.8 Flash adapter integrated, with real tool-call IDs, private continuation signatures and streaming. Real capability probe, chat/code planning and MCP task creation reach AWAITING_APPROVAL.
- Separate operator testnet wallet initialized. Buyer assets remain in the standard wallet. PAYMENTS_ENABLED=false; no real BSV transaction, paid answer or model-generated patch has been observed.
- Public backend uses one e2-small VM, persistent20GB disk, TLS, scoped runtime secrets, IAP SSH, and seven-day daily snapshot policy. Session/CSRF, provider identity and browser/MCP tasks survived an actual container restart. Snapshot restore is untested.
- Checks: typecheck/build and72 application tests pass; sponsor starter typecheck and38 tests pass. Public SSE replay and unauthenticated rejection checked. UI retains chat-only screen, bottom composer and modest persistent expansion.
- Gates: Q1 local application evidence PASS; Q2/Q3/Q5 blocked on standard-wallet flow and human-approved real payment; Q4 live custody evidence pending. Public Vercel browser checks also await account verification.

See [verification](../docs/verification.md), [deployment](../docs/deployment.md) and [tasks](TASKS.md). Developer pack and root guide remain unchanged.
