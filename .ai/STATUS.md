# Status

Updated: 31 October 2026. Vercel frontend and persistent backend deployed; native-wallet validation pending.

- Fee-cap recovery fix in progress: confirmed unsigned aborts return to fresh quote review; legacy draft recovery and signed/uncertain safeguards pass 87 app tests, typecheck and build. Live deployment/recovery pending.
- Local conversational UI updated: question bubble, plain assistant response, bottom composer and reference 8 thinking trace that disappears on answer output. Compact system typography matches the supplied component; prior sidebar readability retained. Typecheck/build and 85 tests pass; offline browser lifecycle checks cover desktop/mobile. Local model/wallet remain unavailable; no live paid answer claimed. This UI revision is not publicly deployed.
- Reference 9 grid/theme implemented locally: neutral charcoal/white/gray surfaces, pointer-driven spectrum dots in empty chat, and spectrum capacity arcs. Desktop pointer changes, navigation teardown and 390px layout verified. No public deployment.
- Repository: ardatas/mercaTUM-, main; frequent commits/pushes authorized.
- User now requests public Vercel deployment and Gemini. API credential is stored in ignored local configuration, backend Secret Manager and the Vercel project as a secret environment variable.
- Public app and canonical origin: https://mercatum-ai.vercel.app. Vercel proxies API/SSE/MCP to the persistent HTTPS backend.
- Vercel project mercatum-ai: production deployment F8qvQo6gFyqBJRutbCyzCX73sc8L is Ready at revision 2f4dc11. GitHub integration deployed successfully; the earlier manual-import email challenge is no longer a deployment blocker.
- Native Gemini 3.8 Flash adapter integrated, with real tool-call IDs, private continuation signatures and streaming. Real capability probe, chat/code planning and MCP task creation reach AWAITING_APPROVAL.
- User selected mainnet. Separate operator mainnet wallet initialized, preserving testnet storage. Buyer assets remain in BSV Desktop. PAYMENTS_ENABLED=true; public readiness passes; no real BSV transaction, paid answer or model-generated patch has been observed.
- Public backend uses one e2-small VM, persistent20GB disk, TLS, scoped runtime secrets, IAP SSH, and seven-day daily snapshot policy. Session/CSRF, provider identity and browser/MCP tasks survived an actual container restart. Snapshot restore is untested.
- Checks: typecheck/build and72 application tests pass; sponsor starter typecheck and38 tests pass. Public SSE replay and unauthenticated rejection checked. UI retains chat-only screen, bottom composer and modest persistent expansion.
- Gates: Q1 local application evidence PASS. Safari on the deployed Vercel origin now shows WalletClient connected to BSV Desktop on mainnet, with a buyer identity distinct from the provider. Q2 still needs the authorized payment flow; Q3/Q5 remain blocked on exact quote and human native spending approval, and Q4 live signing evidence is pending. The first real Gemini chat purchase is prepared at 100 service sats with a proposed 150-sat total debit cap. No payment has been sent. In-app browser transport remains unavailable; use Safari.

See [verification](../docs/verification.md), [deployment](../docs/deployment.md) and [tasks](TASKS.md). Developer pack and root guide remain unchanged.
