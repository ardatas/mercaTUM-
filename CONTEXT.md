# Paid AI workspace

Language for the buyer-side chat/code product. Implementation contracts live in docs/contracts.md.

## Language

**Buyer**: The person requesting an AI task and authorizing its payment. Their own agent may submit the task on their behalf.

**User wallet**: The buyer's BSV Desktop or BSV Browser wallet, which controls their funds and approves spending.

**Demo provider**: A labelled, simulated capacity listing backed by the operator's real model API service. It does not represent access to another person's consumer subscription.

**Provider wallet**: The service operator's wallet receiving its own revenue, separate from the buyer's wallet.

**Task**: An immutable request for a chat answer or changes to an imported repository snapshot.

**Coordinator agent**: The AI agent that requests paid execution of a task and resumes after its result arrives.

**Quote**: The provider's time-limited offer to execute one task for a stated number of satoshis.

**Payment attempt**: One authorized attempt to pay a quote, including a transaction that may need reconciliation.

**Payment receipt**: The server's record that a particular transaction output satisfied a quote.

**Paid entitlement**: The right to execute or recover a task already paid for. A retry uses this entitlement rather than charging again.

**Repository snapshot**: The immutable revision and reviewed file set imported for a code task.

**Change set**: Proposed file creations, replacements or deletions relative to that snapshot.

**Artifact**: A task result the buyer can inspect or download, such as an answer, changed file or patch.
