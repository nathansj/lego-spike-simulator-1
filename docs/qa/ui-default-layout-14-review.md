# UI Default Layout 14 QA Review

Task: `ui-default-layout-14` / `default-layout-qa`
Reviewer: `fll_lead` (lead-implemented and lead-verified; no subagent claims)
Review state: handoff for lead acceptance; browser evidence not obtained
Reviewed: 2026-09-20

## Scope and Evidence Boundary

Owner request (screenshot): the default UI should show the Blockly code workspace with the
Hub runtime and Diagnostics sections collapsed. Change in `BlocklyComponent.svelte` only.
Browser rendering is **not verified** (no browser tooling; precedent:
`docs/qa/ui-layout-03-review.md`).

## Source Findings

| Review area     | Source result | Evidence                                                                                                                                                                                                        | Browser status |
| --------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Default states  | Pass          | `blocklyCodeOpen = true`, `hubSectionOpen = false`, `diagnosticsSectionOpen = false` (BlocklyComponent.svelte:74-76) — matches the requested default: workspace open, both lower sections collapsed to headers. | Unverified.    |
| Expand/collapse | Pass          | Toggles unchanged from `ui-program-sections-10` (fixes `47b9115`, `954cd40`); clicking a collapsed header expands its section and the flex sizing from `0e016fb` still applies.                                 | Unverified.    |
| Lint cleanup    | Fixed         | eslint on the touched file surfaced dead helpers from earlier changes (`toggleSize` from the removed split control, `closeWindow`); both removed. eslint and svelte-check now clean.                            | —              |

## Validation

-   `npm run check` — 0 errors, 0 warnings.
-   `npm exec -- eslint src/components/BlocklyComponent.svelte` — clean.
-   `npm exec -- prettier --check` — pass. `git diff --check` — clean. `npm test` — 210/210.

## Unverified Browser Cases

-   Initial render matches the screenshot (workspace full height, two collapsed headers at
    the pane bottom); expanding either section restores the fill-height behavior.

## Handoff

Lead accepts under the standing owner browser-caveat policy. Commits: `f5cc8ef`
(defaults), `2801116` (dead-code cleanup).
