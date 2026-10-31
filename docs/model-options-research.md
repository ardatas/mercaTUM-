# Model options for the marketplace

Verified against official documentation on 31 October 2026. This is a catalog reference for the marketplace and composer. It does not establish account access, provider quota, or live execution through those providers.

## Model catalog

| Brand | Display name | API model ID | Supported effort choices |
|---|---|---|---|
| OpenAI / ChatGPT | GPT-6.1 Sol | `gpt-6.1-sol` | Low, Medium, High, Extra high, Max |
| OpenAI / ChatGPT | GPT-6 Astra | `gpt-6-astra` | Low, Medium, High, Extra high, Max |
| OpenAI / ChatGPT | GPT-6 Luna | `gpt-6-luna` | None, Low, Medium, High, Extra high, Max |
| Anthropic / Claude | Claude Opus 5.5 | `claude-opus-5-5` | Low, Medium, High, Extra high, Max |
| Anthropic / Claude | Claude Sonnet 5.5 | `claude-sonnet-5-5` | Low, Medium, High, Extra high, Max |
| Anthropic / Claude | Claude Haiku 5.5 | `claude-haiku-5-5` | Low, Medium, High, Extra high, Max |
| Google / Gemini | Gemini 3.8 Flash | `gemini-3.8-flash` | Low, Medium, High |
| Google / Gemini | Gemini 4 Argon | `gemini-4-argon` | Low, Medium, High |
| Google / Gemini | Gemini 3.5 Flash-Lite | `gemini-3.5-flash-lite` | Minimal, Low, Medium, High |
| Mistral | Mistral Large 4 | `mistral-large-4-0` | Low, Medium, High |
| Mistral | Mistral Medium 3.5 | `mistral-medium-3-5` | None, High |
| Mistral | Mistral Small 4 | `mistral-small-2603` | None, High |
| Moonshot / Kimi | Kimi K3.1 Pro | `kimi-k3.1-pro` | Low, High, Max |
| Moonshot / Kimi | Kimi K3 | `kimi-k3` | Low, High, Max |
| DeepSeek | DeepSeek V4.1 Flash | `deepseek-flash` | Off, Low, High, Max |
| DeepSeek | DeepSeek V4 Pro | `deepseek-v4-pro` | Off, Low, High, Max |

The names above are model labels. Consumer subscription tiers are separate product names; the marketplace's provider capacity and tiers are fixture data.

## Provider-specific controls and sources

- OpenAI uses `reasoning.effort`; Extra high serializes as `xhigh`. GPT-6.1 Sol defaults to Medium. Sol and Astra do not expose `none`; Luna does. Tool calling for GPT-6.1 Sol requires Responses. Sources: [GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol), [GPT-6 Astra](https://developers.openai.com/api/docs/models/gpt-6-astra), [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna).
- Claude uses `output_config.effort`. Opus 5.5 and Haiku 5.5 default to Medium; Sonnet 5.5 defaults to High. Thinking is a separate control with model restrictions, so effort must not imply an Off toggle. Sources: [model IDs](https://platform.claude.com/docs/en/models/overview), [effort options](https://platform.claude.com/docs/en/build-with-claude/effort).
- Gemini's current Interactions documentation names `thinking_level`; the existing GenerateContent adapter uses `generationConfig.thinkingConfig.thinkingLevel`. Flash 3.8 and Argon default to Medium and support Low/Medium/High. Flash-Lite 3.5 also supports Minimal and defaults to it. Do not send Minimal to Flash 3.8: the repository already records a real rejection of that setting. Source: [Gemini thinking model table](https://ai.google.dev/gemini-api/docs/thinking#controlling_thinking).
- Mistral uses `reasoning_effort`. Large 4 has a three-level scale. Small 4 and Medium 3.5 have `none` and `high`; do not add Medium because an SDK enum contains it. Earlier Magistral models are deprecated. Source: [Mistral reasoning](https://docs.mistral.ai/studio/conversations/reasoning).
- Kimi K3.1 Pro and K3 always reason; `reasoning_effort` accepts Low/High/Max, with Max as default. K2.6 has a thinking toggle, but K2 series access closes to new accounts on 31 October 2026; prefer K3 names for new cards. Sources: [model list](https://platform.kimi.ai/docs/models), [K3.1 reasoning effort](https://platform.kimi.ai/docs/guide/use-reasoning-effort), [K3 options](https://www.kimi.ai/help/kimi-api/api-model-selection).
- DeepSeek Flash resolves to V4.1 Flash 1017; Pro resolves to V4 Pro 0813. Both support thinking on/off, with `reasoning_effort` Low/High/Max while enabled. Responses uses `reasoning.effort: 'none'` for Off. The compatibility mappings Medium→High and Extra high→High do not provide extra distinct effort levels. Sources: [models](https://api-docs.deepseek.com/quick_start/pricing/), [thinking controls](https://api-docs.deepseek.com/guides/thinking_mode/).

## Implementation decisions

Keep catalog selection separate from the immutable execution model. A marketplace card chooses a listing and a catalog model; the server chooses the configured adapter and records its actual model ID in the task, quote and result. Preserve existing paid execution and receipt checks. Never relabel a Gemini execution result as an OpenAI, Claude, Kimi, Mistral or DeepSeek API result.

Use model-specific effort arrays for the composer. Changing models must reset an unsupported effort to the selected model's default. Keep the selected model and effort with the task's presentation metadata, so opening history does not adopt the current composer's selection.

If effort controls the real Gemini call, resolve it through an explicit server-side mapping and save that result in the task configuration before planning or quoting. A workable application policy is None/Off/Minimal/Low → Gemini Low; Medium → Medium; High/Extra high/Max → High. This mapping is an application policy, not a claim that the providers' reasoning scales are equivalent. Enforce the existing token, call and runtime limits regardless of the chosen level. An already quoted task cannot change effort in place.

For the reference design, make each card's remaining capacity a ring or segmented bar with a numeric fraction. Treat quota, activity sparklines and scores as seeded listing data. A score out of 100 is a marketplace fixture score unless backed by a named benchmark, exact model revision, metric, configuration and primary source. Do not attach invented numbers to SWE-bench, GPQA or another published benchmark. A tooltip or metric legend can explain the score without adding clutter to each card.

Account access and real calls to providers other than the configured Gemini backend were not tested. This research makes no benchmark comparison and records no payment or wallet action.
