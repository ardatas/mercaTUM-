# Submission

Recheck the official [track](https://hackathon.tum-blockchain.com/prizes#bsv-association) and [submission instructions](https://hackathon.tum-blockchain.com/prizes#how-to-submit) before submitting on [Devfolio](https://tum.devfolio.co/).

Recorded deadline: **31 October 2026, 15:00 Europe/Berlin**, read from the rendered submission tab during initial setup; revalidate before submission.

- [ ] Q1–Q5 PASS with observed evidence in [verification](verification.md).
- [ ] Public repository with actual run/deploy instructions and stated limits.
- [ ] Deployed HTTPS application with standard-wallet access and persistent state.
- [ ] Demo video <=2.5 minutes showing real agent tool request, human wallet approval, real sats received, Arcade/WhatsOnChain and actual task result.
- [ ] Briefly show code patch artifacts and external-agent MCP entry path.
- [ ] Label the rental/provider listing as simulated; describe the real model API execution honestly.
- [ ] Devfolio description: problem, target buyer, usage, implementation and BSV contribution.
- [ ] Team added, BSV track selected and project submitted before the deadline.

Suggested demonstration: submit a task → agent requests paid execution → approve displayed quote → authorize in BSV Desktop/Browser → show received transaction → inspect actual answer or code diff and receipt. Keep keys, prompts containing secrets and tokens out of the recording.

Repository URL: [ardatas/mercaTUM-](https://github.com/ardatas/mercaTUM-). Live app: PENDING. Video: PENDING. Devfolio project: PENDING. Example transaction: PENDING.

## Prepared description (not submitted)

**mercaTUM — buy a bounded AI task with your wallet.**

A buyer brings a question or a public code repository, reviews a fixed quote, and approves a direct BSV payment to the provider. The app verifies the receipt before a real model can execute the task. Results, code patches and receipts remain in the workspace; an external MCP agent uses the same approval path.

The marketplace listing and capacity values are simulated. The implementation uses an operator-owned model API, not consumer subscription sharing. Buyer keys stay in a standard wallet. A separate Toolbox wallet receives provider revenue, and Arcade verifies network acceptance of the same signed transaction. Human approval remains mandatory for each purchase.

**Current demonstrated state:** local application, real GitHub import, actual generated patch logic, 56 passing offline application tests, and local browser/container verification. Real model execution, public hosting and a real payment demonstration are still pending. Do not remove this qualification until live evidence is captured.

## Planned video outline (150 seconds maximum; not recorded)

- 0–20s: show the buyer workspace and explicitly labelled demo capacity.
- 20–45s: submit a small task; show the real agent purchase request and bounded fixed quote.
- 45–80s: human reviews quote and native wallet; show receipt, network, sats, Arcade observation and WhatsOnChain.
- 80–110s: show actual answer, coordinator continuation and persisted history after reload.
- 110–135s: show public repository at its fixed commit and the resulting real downloadable patch, with checks marked not run.
- 135–150s: show MCP submission returning the same human approval path.

No video, transaction or successful paid model result has been produced yet. Public submission remains unauthorized.
