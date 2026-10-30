# Launch prompt

Copy the following into a new chat opened on this project. Add the user's design prompts under the indicated input; this file itself does not start implementation.

```text
Work in /Users/ardatas/Desktop/TBC Hackathon.

Implement and deploy the buyer-side paid AI workspace defined in this repository. The product decision is made: chat and public-repository code tasks, one labelled demo rental/provider listing, a real server-side model API, a real explicitly approved BSV payment from the buyer's BSV Desktop/Browser wallet to a distinct provider wallet, and MCP access for user agents. Mock only the rental listing and offline test dependencies. No real subscription-sharing or seller backend.

Read AGENTS.md, .ai/STATUS.md, docs/project-brief.md, .ai/WORKFLOW.md, docs/contracts.md and .ai/TASKS.md. Then read docs/architecture.md, docs/bsv-flow.md or docs/ai-flow.md when their modules require it. Follow sponsor pins and tested pack code; preserve the developer pack and unrelated working-tree changes.

Start an execution goal for the complete deployed flow. Run and record preflight before application edits. Execute the dependency-ordered task ledger; use subagents with disjoint owned paths, at most two implementation agents at once. You own shared contracts, package/lockfile, integration and acceptance checks. Review and test each returned slice before marking it done. Continue through the real wallet → receipt → real model slice before polishing optional surfaces.

Use the user's design prompts below and docs/design-inputs.md. Missing visual direction does not block backend/contracts/tests or an early minimal deployed wallet probe. Request the missing design input before final UI polish; do not invent the final product style.

Use configured hosting/credentials if available. Prepare a deployable build before requesting any missing external setup. Keys/secrets belong in secret management, never prompts or the repository. Detect actual provider readiness before charging.

Use fixed upfront quotes for bounded work as defined in docs/contracts.md#fixed-price-purchases. Operator-funded planning checks scope/context before quoting. Display intended deliverable, model, numeric execution limits, exact service sats, fee policy and total debit bound. Actual usage cannot reprice a paid task. At a known limit, stop with valid partial progress; extra scope is a new linked task with its own quote and approval. Technical failure recovery uses the original entitlement and cannot become an extension charge.

The user personally approves each quote and native wallet spending. Before a live transaction establish the network, recipient and maximum authorized debit, then reuse that explicit authorization within its scope. Do not click native spending approval on the user's behalf. Reconcile an ambiguous wallet/broadcast response; never automatically pay again. Keep additional spending allowance in the user wallet; no prepaid platform balance or automatic top-ups.

Complete meaningful checks, deploy with persistent app and provider-wallet storage, and inspect the actual public browser flow. Demonstrate a real model tool request causing the human-approved payment, verified through Arcade, followed by actual chat output, code patch artifacts and resumed agent. Exercise MCP submission through the same services. Record Q1–Q5 evidence, transaction/WhatsOnChain link and truthful remaining limits. Tests or a build alone do not prove deployment or qualification. If an external prerequisite blocks live work, record it and continue independent tasks.

Keep workflow updates short. Finish with the public app URL, exact validation evidence, real transaction link, observed AI result, remaining blockers and delivery instructions. Prepare submission artifacts; do not message others or submit publicly without authorization.

DESIGN INPUTS:
[Paste overall style and component prompts here, or refer to completed slots in docs/design-inputs.md.]
```
