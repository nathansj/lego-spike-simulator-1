# Practical model routing

Checked September 10, 2026 against official OpenAI documentation, the installed
Codex CLI 0.153.4 model catalog, and the models advertised by this session's
subagent tool. The owner explicitly requested cost-efficient model selection
before starting application implementation.

## Findings

The original seven agent files had no model or effort settings. They therefore
inherited the parent, potentially running routine work on GPT-6 Astra at high
reasoning effort. The local user configuration currently selects that combination.

The local catalog and subagent tool advertise GPT-5.6 Sol, Terra, Luna, and GPT-6
Astra with the medium/high efforts used here. Catalog presence is not a guarantee
of available credits, account entitlement, or a successful inference request.
No paid model benchmark was run for this configuration change.

Official guidance describes Sol as suitable for demanding multi-step work, Terra
as a less expensive option for focused supporting work, and Luna for narrow,
repeatable tasks. These assignments are engineering choices based on those
capabilities and this repository's defects, not measured proof of optimal cost.
[OpenAI subagent guidance](https://learn.chatgpt.com/docs/agent-configuration/subagents)

## Configured defaults

| Agent            | Model           | Effort | Reason                                                   |
| ---------------- | --------------- | ------ | -------------------------------------------------------- |
| `fll_lead`       | `gpt-5.6-sol`   | medium | Cross-module planning, contracts, and integration        |
| `fll_physics`    | `gpt-5.6-sol`   | high   | Coupled mechanics, feedback timing, units, and replay    |
| `fll_runtime`    | `gpt-5.6-sol`   | high   | Scheduler/cancellation semantics and concurrent commands |
| `fll_rules`      | `gpt-5.6-terra` | high   | Bounded source-backed scoring with edge-case review      |
| `fll_assets`     | `gpt-5.6-terra` | medium | Scoped model/persistence changes with explicit checks    |
| `fll_experience` | `gpt-5.6-terra` | medium | Focused Svelte workflows with browser verification       |
| `fll_qa`         | `gpt-5.6-terra` | high   | Independent bounded review and regression reproduction   |

`.codex/config.toml` selects Sol/medium for new primary sessions and Terra/medium
for unspecified subagents, with at most three concurrent spawned threads. Custom
agent files set both model and effort to avoid inheriting an expensive effort.
Global settings and permissions are unchanged; no Fast mode is enabled here.

Project configuration must be loaded by the client; explicit launch/model choices
can override project defaults. Existing conversations keep their active model.
Starting a CLI session with `codex -m gpt-5.6-sol -c 'model_reasoning_effort="medium"'`
selects the intended lead model explicitly. Read AGENTS.md when starting work.

## Route by task, not just title

-   Use `gpt-5.6-luna` at low or medium effort for tightly specified inventories,
    extracting fields from supplied source text, checking manifests, or drafting
    mechanical documentation updates. A responsible specialist verifies the result.
-   Use Terra/medium for ordinary scoped implementation, including a simple
    motor-unit conversion fix even though the runtime role defaults to Sol/high.
-   Use Sol/high when work needs coupled reasoning: cancellation ownership across
    threads, timestep/feedback bugs, joint-load semantics, or complex integration.
-   Escalate a Terra review to Sol when a critical state invariant remains unresolved
    or the patch spans runtime, physics, and scoring. Do not approve uncertain code
    merely because the cheaper model found no defect.
-   Reserve Astra for a bounded problem still unresolved after a focused Sol attempt
    or requiring substantially deeper reasoning. Record the reason before spawning;
    do not make Astra or max/ultra effort a routine fallback.

A named custom agent's configured model/effort takes precedence over spawn
overrides. For a one-off cheaper or stronger assignment, use a general worker with
the same role instructions and explicit `model`/`reasoning_effort`; do not assume
overrides change a pinned named agent. If that mechanism is unavailable, update
the relevant project role deliberately before spawning and report the change.
[Custom-agent precedence](https://learn.chatgpt.com/docs/agent-configuration/subagents)

Prefer one worker plus focused review over seven agents on every task. Keep
handoffs concise and include only the context needed. A failed check should lead
to a specific diagnosis; after two unsuccessful repair attempts on the same
failure, narrow or escalate the task instead of spending on blind retries.
Unavailable cheaper models must not silently fall back to Astra: use the next
suitable available tier, record why, and preserve the same acceptance criteria.

For initial tasks, record model/effort, validation outcome, number of rework cycles,
elapsed time, and token/credit usage when the tools expose it. Compare cost per
accepted task, including review and retries, before adjusting these defaults.

## Cost reference

Published standard API text rates per million tokens, checked September 10, 2026:

| Model         | Uncached input | Output |
| ------------- | -------------- | ------ |
| GPT-5.6 Luna  | $0.20          | $1.20  |
| GPT-5.6 Terra | $2.00          | $12.00 |
| GPT-5.6 Sol   | $4.00          | $20.00 |
| GPT-6 Astra   | $10.00         | $50.00 |

Sources: [Luna pricing](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
and [OpenAI model comparison](https://developers.openai.com/api/docs/models/compare).
These are reference rates, not a quote for this Codex account. Context length,
cached input, reasoning/output volume, tools, service tier, and retry count affect
actual cost. ChatGPT subscription/credit usage differs from standard API billing.
Fast mode increases usage; the project does not opt into it.
[Codex speed and billing](https://learn.chatgpt.com/docs/agent-configuration/speed)

At equal standard API token volumes, Terra and Sol have lower rates than Astra;
that does not establish a percentage saving for a completed engineering task.
Measure actual accepted-task costs as implementation proceeds.
