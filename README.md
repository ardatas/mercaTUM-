# BSV agentic payments

Buyer-side chat/code app for the BSV Association track of the TUM Blockchain & AI Hackathon, 30–31 October 2026, Munich. An agent requests paid AI execution, the user approves a wallet-to-wallet BSV micropayment, and the app completes the task using a real model API.

**Current state: documentation and the supplied reference kit only.** The application, deployment and project transactions are not built or verified. The provider/subscription listing will be a labelled demo; execution and payments must be real. There is no subscription-sharing backend.

Agents start at [AGENTS.md](AGENTS.md), then follow the [workflow](.ai/WORKFLOW.md) and [task ledger](.ai/TASKS.md). The [execution prompt](.ai/EXECUTION_PROMPT.md) starts implementation in a separate chat when the user requests it.

[Brief](docs/project-brief.md) · [Architecture](docs/architecture.md) · [Contracts](docs/contracts.md) · [Design slots](docs/design-inputs.md) · [Evidence](docs/verification.md) · [.ai navigation](.ai/README.md)

## Run the reference kit

Requires Node >=22 and npm:

```sh
cd BSV-TBC26-Developer-Pack/starter/bsv21-token-kit
npm ci
npm run typecheck
npm test
```

Run `npm run overlay` and `npm run web` in separate terminals from that directory. Open [localhost:5173](http://localhost:5173) with BSV Desktop unlocked. The starter defaults to **mainnet** and wallet actions can spend real satoshis. Wallet installation and funding: [START-HERE.md](BSV-TBC26-Developer-Pack/START-HERE.md).

The [complete guide](BSV_STACK_COMPLETE_GUIDE.md), its Appendix A and the [sponsor instructions with package pins](BSV-TBC26-Developer-Pack/AGENTS.md) are the technical references. The original pack is preserved. Local files were supplied with the workspace; their contents were not compared with the remote Drive pack.

Passing the starter's offline tests does not establish track qualification. The project must supply evidence for all five gates in the workflow.
