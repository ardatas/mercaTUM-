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

## Adaptation

D0/D7 use reference 1, D1 uses 3, D2 uses 4 and 7, D3 uses 6, D5 uses 2 and 5. D4 approval and D6 receipts inherit the shell styling while preserving every contract field. No fabricated hidden reasoning, research sources, tool calls, payment successes, balances or tests. Model activity reflects actual requests/events. Capacity alone is simulated and labelled.

Visual plan: quiet graphite sidebar, off-white workspace, charcoal text, silver borders and restrained blue activity accents. Compact navigation; generous central composer; a glass dial is the distinctive capacity indicator. Accessible keyboard focus, reduced motion and mobile drawers. The app is named mercaTUM from the configured repository.

Verbatim references retain their original example copy and imports for provenance. Integrated components live under src/client/components/ui with the @ alias rooted at src/client; demo placeholders are replaced by owned task data.

Latest user direction: near-black text, concise functional labels, and a chat-only main workspace. Remove the welcome hero, suggestion cards, explanatory sidebar panel and marketing footer. Keep capacity in its own navigation view and preserve transaction approval details.

Composer refinement: anchor to the bottom with 24px desktop / 16px minimum mobile spacing. Start compact, then ease upward and slightly wider on first focus (720×107px → 780×147px desktop); keep the expanded state until New task. Respect reduced motion.

Conversational refinement (reference 8): right-aligned question bubble, unframed assistant Markdown, bottom composer retained during execution and after an answer. Progress uses 13px/500 headers and 12.5px/500 steps; chat text uses a matching system sans at 15px, with a 16px mobile textarea to avoid input zoom. This supersedes the earlier 18px bold composer. Enter sends; Shift+Enter adds a line; IME composition does not send. Payment approval and same-entitlement recovery remain explicit. Each next question is a new independent task; prior dialogue is not automatically sent as model context.

The thinking trace is shown only during active task states and disappears on the first streamed text or stored result. Approval, failure and ambiguous outcomes show their own controls instead. Timed demo stages, sample searches/reasoning, fake durations and fabricated code actions from reference 8 are not integrated. Existing React/TypeScript/Tailwind setup and src/client/components/ui alias are retained; no shadcn migration or dependency installation is needed.

Reference 9 theme: canvas #fafafa, surface #ffffff, inset #eeeeee, sidebar/text #222222, muted text #626262 and border #e2e2e2. These neutral background choices interpret the supplied transparent canvas; its cursor-based HSL spectrum is preserved in the interactive connections and echoed by capacity arcs. Existing semantic success/warning/error colors remain distinct. The grid is decorative, pointer-transparent and hidden from assistive technology. It is absent for active tasks and code mode, uses container sizing/HiDPI rendering, coalesces drawing with requestAnimationFrame, cleans up observers/listeners on unmount, and remains static for coarse pointers or reduced motion. No new dependencies or stock images.
