# Supplied design inputs

Saved verbatim on 31 October 2026. Reference prompts are design source material; app contracts and payment boundaries take precedence over demo data, timers and embedded integration instructions.

| Reference | Use |
|---|---|
| [1](design-prompts/01-reference.txt) | Main dashboard frame and collapsible sidebar, with mercaTUM content |
| [2](design-prompts/02-reference.txt) | Research-style loading activity driven by actual server events |
| [3](design-prompts/03-reference.txt) | Composer expands on first focus and stays expanded; resets only for a new chat |
| [4](design-prompts/04-reference.txt) | Documentation-style repository tree and file viewer |
| [5](design-prompts/05-reference.txt) | Expandable actual tool/activity steps where meaningful |
| [6](design-prompts/06-reference.txt) | Glass capacity dial, read-only and explicitly simulated; five-hour/weekly windows |
| [7](design-prompts/07-reference.txt) | Right-click context menu with equivalent visible menu button |
| [8](design-prompts/08-reference.txt) | Compact shimmer header and expandable vertical progress steps; actual events only, removed when answer text arrives |
| [9](design-prompts/09-reference.txt) | Interactive neutral-dot grid with pointer-driven spectrum connections in empty chat; neutral app surfaces and spectrum capacity arcs |

## Current UI requirements

These requirements supersede older colors, sizing and layout examples in the references. Keep the original prompt files unchanged as provenance.

- Use the existing dark marketplace/chat surfaces, violet accents and supplied mascot. Desktop navigation is fixed; mobile uses a drawer. Offer cards adapt from five columns on wide screens to one on phones.
- Show eight demo offers with simulated token capacity and saved model/effort choices. Benchmark scores are sourced snapshots; retain their source links. Catalog selection does not determine the upstream execution provider.
- Selecting an offer opens chat. Use a question bubble, plain assistant Markdown and a bottom composer aligned with response width. Expansion persists until a new task. Enter sends; Shift+Enter adds a line; IME composition does not send.
- Show progress only from real server events. Hide the progress trace when answer text arrives; approval, failure and uncertain payment use explicit controls. Keep the decorative grid through pending, streaming and completed chat states, with reduced-motion and accessibility support.
- Code mode shows a pinned repository revision, file preview and explicit context consent. Generated changes and checks must reflect actual artifacts and execution status.
- Purchase review retains selected model/effort, expandable quote terms, unchecked consent and an editable total debit cap. The secondary “Runs on” row is intentionally omitted; immutable server execution metadata remains authoritative. Do not imply catalog brands route to different APIs.
- Retain explicit receipt, reconciliation and paid-recovery states from [contracts](contracts.md). An uncertain payment cannot offer an automatic replacement debit.
- History removal requires confirmation and hides only that owner's entry; retain payment records, direct recovery links and active execution.

Capacity fixtures are labelled. Never fabricate balances, model activity, hidden reasoning, payment success or code checks. New questions are independent tasks; previous dialogue is not sent automatically. Preserve keyboard access, visible alternatives to context menus and layouts without horizontal overflow.
