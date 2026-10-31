# Submission

Deadline confirmed in the rendered [submission instructions](https://hackathon.tum-blockchain.com/prizes#how-to-submit): **31 October 2026, 15:00 Europe/Berlin**. One Devfolio submission per team, up to three partner tracks; TUM Blockchain Track judging is automatic. Add every teammate and submit before the deadline. Edits are allowed until it closes.

Final readiness check: app checks and public health pass; the repo is public. Real payment/paid execution and the video/transaction links remain unverified. The current Chrome Devfolio session is signed out, so project fields, team membership and submitted status could not be inspected. The README includes setup/run instructions and a Mermaid architecture diagram. Separate vector exports are optional local assets.

Track-fit concern: the expanded BSV brief expects a DeFi product as the core, with an agent using it to pay. Current implementation provides direct AI-service micropayments and no swap, liquidity or other DeFi mechanism. Do not claim one; technical payment qualification and product fit are separate assessments.

## Devfolio upload checklist

Checked against the supplied Judging Briefing, pages 4–6. These statuses describe prepared material, not verified completion of the Devfolio form.

| Field / item | Prepared material / action |
|---|---|
| Project name and tagline | mercaTUM — Human-approved BSV micropayments for AI tasks. |
| Project media (required) | Upload an actual application cover image or screenshot. Local live screenshots exist under ignored `artifacts/`; upload is unverified. Do not use an offline fixture as proof of live paid execution. |
| The problem it solves (required) | Use the description below: bounded AI tasks, direct wallet payments, no platform deposit, reviewed code context and MCP access. |
| Challenges we ran into (required) | An unsigned draft totalled 194 sats (100 service + 94 fee), exceeding its 110-sat cap. Recovery returns proven unsigned failures to quote review; signed or uncertain attempts reconcile the same transaction before another debit. |
| Technologies used (required) | TypeScript, React, Tailwind CSS, Vite, Node.js, Express, SQLite, Knex, Zod, BSV SDK, Wallet Toolbox, BRC-29, Arcade, Gemini API, MCP, Docker, Caddy, Vercel, Google Cloud, Vitest and GitHub. |
| Tracks | Select BSV Association / DeFi Rails for Agentic Payments if entering it; at most three partner tracks. TUM Blockchain Track judging is automatic. |
| Builders | Add every teammate; membership unverified. |
| Repository / live app | Public repository and live app links are below; README includes setup and run instructions. |
| Video / BSV proof | Add the accessible video URL (at most 2.5 minutes) and actual WhatsOnChain transaction link; neither is recorded yet. |
| Publication | Click **Publish project** before 15:00 and verify the published project URL. **Save as draft is not a submission.** |

## Required material

- Public repository with setup/run instructions: [ardatas/mercaTUM-](https://github.com/ardatas/mercaTUM-).
- Demo video, at most 2.5 minutes, showing the project end to end and a real agent payment: PENDING.
- WhatsOnChain links to example transactions: PENDING.
- Devfolio description covering the problem, target users, usage, implementation and contribution to BSV: draft below; submission PENDING.

Live app: [mercatum-ai.vercel.app](https://mercatum-ai.vercel.app). Current qualification: [evidence](verification.md#current-qualification). A deployed app and offline tests do not establish a completed paid demo.

## Description draft

mercaTUM lets a buyer or their MCP agent purchase a bounded AI task with BSV. A coordinator requests paid execution; the buyer reviews a fixed quote and approves a direct payment from a standard wallet to the provider. Server verification, Arcade acceptance and provider receipt gate model execution. The intended result is a chat answer or a downloadable patch against a reviewed public-repository snapshot.

The project uses the BSV SDK, Wallet Toolbox, BRC-29 payments and Arcade. Buyer keys stay in BSV Desktop/Browser; the server wallet holds only provider revenue. Per-task micropayments let buyers pay without depositing a platform balance and give agents a human-approved route to paid services.

Marketplace sellers and capacity are simulated. Actual work uses the configured server-side Gemini API. Real planning, wallet connection, repository import and MCP submission have recorded evidence. Real payment, receipt-backed execution and a model-generated patch remain pending; update these claims only after the corresponding live run.

## Demo sequence

1. 0–20s: explain the buyer task and label demo capacity.
2. 20–45s: show the real coordinator purchase call and fixed quote.
3. 45–80s: human approves in app/wallet; show receipt, sats, network, Arcade status and WhatsOnChain.
4. 80–110s: show actual answer, coordinator continuation and reload persistence.
5. 110–135s: show the code task's pinned revision and real patch; keep checks labelled `not_run`.
6. 135–150s: show MCP submission and result through the same approval path.

Before submission, complete Q1–Q5 and project acceptance, check all public links, add the team and select the BSV track. Keep secrets and private prompts out of the recording. This document prepares the submission; no video, external submission or successful payment is recorded yet.

## Live judging

The supplied briefing sets booth queues to open at 15:10 and finish around 17:20. For BSV, queue there first with the demo open, wallet connected and transaction explorer ready. Each slot is 2:30 pitch/demo, 2:00 questions and 0:30 changeover. TUM Blockchain Track has no booth or live demo; judges review the published submission.

Pitch: 0:00–0:20 problem and user; 0:20–1:50 working flow; 1:50–2:20 BSV integration and transaction proof; 2:20–2:30 next steps. Keep the video as backup. Winners/closing: 17:30.
