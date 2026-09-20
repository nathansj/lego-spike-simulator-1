# UI Program Sections 10 QA Review

Task: `ui-program-sections-10` / `program-sections-qa`
Reviewer: `fll_lead` (lead-implemented and lead-verified; no subagent claims)
Review state: handoff for lead acceptance; browser evidence not obtained
Reviewed: 2026-09-20

## Scope and Evidence Boundary

Owner request: restructure the program (Blockly) pane into three collapsible sections —
Blockly code (top), Hub runtime, Diagnostics — moving the Hub widget and the run-diagnostics
console out of the simulator pane. Changes span `BlocklyComponent.svelte` (sections),
`SpikeSimulatorWindow.svelte` (state pass-through), `SpikeSimulator.svelte` (removals +
exported display state), `RunLogConsole.svelte` (optional prop default).

Browser rendering is **not verified** (no browser tooling; precedent:
`docs/qa/ui-layout-03-review.md`). All findings are source-level.

## Source Findings

| Review area                 | Source result          | Evidence                                                                                                                                                                                                                                                                                                                                                                         | Browser status                      |
| --------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Three collapsible sections  | Pass                   | Program pane now holds the Blockly-code section (existing header row retitled, chevron toggle `aria-expanded`/`aria-controls="blockly-code-section"`), a Hub runtime section, and a Diagnostics section; each collapses via `aria-expanded` headers (BlocklyComponent.svelte:573-586, 705-749).                                                                                  | Unverified.                         |
| Workspace survives collapse | Pass (by construction) | Collapse uses `class:hidden` on the wrapper — `#blocklyDiv` stays in the DOM (no `{#if}`), matching the existing tab-switch pattern; re-expansion triggers `Blockly.svgResize` via the same 50 ms path used by `resizeWorkspace` (BlocklyComponent.svelte:501-509).                                                                                                              | Unverified (resize on re-expand).   |
| Hub moved                   | Pass                   | HubWidget removed from SpikeSimulator (was :966-976) along with its four press/release handlers; it now renders in the Hub runtime section fed by `hubImage`/`hubCentreButtonColour` bound up-chain (BlocklyComponent → window → SpikeSimulator, all `export let` + `bind:`).                                                                                                    | Unverified.                         |
| Hub button presses          | Pass (by construction) | `vm = new VM(id, hub, ...)` (SpikeSimulator.svelte:805) makes `vm.hub` the same instance BlocklyComponent now writes (`hub.leftPressed/rightPressed`), so presses reach the VM without new plumbing. Reset paths in SpikeSimulator still clear the screen/colour state.                                                                                                          | Unverified (live press during run). |
| Diagnostics moved           | Pass                   | RunLogConsole removed from SpikeSimulator (:1131) and rendered in the Diagnostics section, height-capped (`max-h-72`, scroll). It is store-driven (`runLogStore`), so no data plumbing; `onOpenDiagnostics` now defaults to `undefined`, which hides the redundant in-console "Open diagnostics" button there (the run-result card's button still dispatches `openDiagnostics`). | Unverified.                         |
| Ownership/lifecycle         | Pass                   | `hub` ownership moved to BlocklyComponent (`new Hub()`) and bound down through the window to SpikeSimulator and the port/wheel connectors — single instance preserved; window's reads (`hub.wheels`, readiness) unchanged.                                                                                                                                                       | —                                   |
| No behavior changes         | Pass                   | Simulation loop, scoring, run log recording untouched; diff confined to the four files' UI/state wiring. `git diff --stat` reviewed.                                                                                                                                                                                                                                             | —                                   |

## Validation

-   `npm run check` — 0 errors, 0 warnings (one initial TS error fixed by defaulting the
    now-optional `onOpenDiagnostics` prop).
-   `npm exec -- prettier --check` on the four changed files — pass.
-   `git diff --check` — clean.
-   `npm test` — 47 files, 210/210 passed.

## Unverified Browser Cases

-   Visual stacking and heights: workspace keeps usable height with both lower sections
    open; Diagnostics cap scrolls.
-   Collapse/expand round-trip on the Blockly-code section: workspace renders and resizes
    correctly after re-expand; Commands overlay stays contained.
-   Hub presses (left/right) during a run reach the program; hub screen/button colour
    updates appear in the new location while the simulator pane is visible.
-   Narrow Program tab: sections + run strip coexist without clipping.

## Handoff

Lead accepts under the standing owner browser-caveat policy. Highest-value manual checks:
workspace re-expand resize, and hub live updates while a run is active.
