# Status

Updated: 31 October 2026. Vercel frontend and persistent backend deployed; native-wallet validation pending.

- Repository: ardatas/mercaTUM-, main; frequent commits/pushes authorized.
- User now requests public Vercel deployment and Gemini. API credential is stored in ignored local configuration, backend Secret Manager and the Vercel project as a secret environment variable.
- Public app and canonical origin: https://mercatum-ai.vercel.app. Vercel proxies API/SSE/MCP to the persistent HTTPS backend.
- Vercel project mercatum-ai: production deployment F8qvQo6gFyqBJRutbCyzCX73sc8L is Ready at revision 2f4dc11. GitHub integration deployed successfully; the earlier manual-import email challenge is no longer a deployment blocker.
- Native Gemini 3.8 Flash adapter integrated, with real tool-call IDs, private continuation signatures and streaming. Real capability probe, chat/code planning and MCP task creation reach AWAITING_APPROVAL.
- Separate operator testnet wallet initialized. Buyer assets remain in the standard wallet. PAYMENTS_ENABLED=false; no real BSV transaction, paid answer or model-generated patch has been observed.
- Public backend uses one e2-small VM, persistent20GB disk, TLS, scoped runtime secrets, IAP SSH, and seven-day daily snapshot policy. Session/CSRF, provider identity and browser/MCP tasks survived an actual container restart. Snapshot restore is untested.
- Checks: typecheck/build and72 application tests pass; sponsor starter typecheck and38 tests pass. Public SSE replay and unauthenticated rejection checked. UI retains chat-only screen, bottom composer and modest persistent expansion.
- Gates: Q1 local application evidence PASS; Q2/Q3/Q5 blocked on standard-wallet flow and human-approved real payment; Q4 live custody evidence pending. Vercel browser planning/reload, mobile layout, SSE and MCP checks pass. WalletClient in the in-app browser reports no available transport. Local SDK read-only calls reach authenticated BSV Desktop 3.3.1, which reports mainnet; the server is testnet. Desktop inspection briefly worked, then the Mac locked before the Chrome retry. User selected testnet. Authenticated production wallet-config confirms testnet; buyer wallet still reports mainnet. Native network/settings controls did not respond to automation, so the user was asked to switch BSV Desktop to a funded testnet wallet. No quote/spend approval has been given.

See [verification](../docs/verification.md), [deployment](../docs/deployment.md) and [tasks](TASKS.md). Developer pack and root guide remain unchanged.
