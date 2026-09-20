# UI Splitter 12 QA Review

Task: `ui-splitter-12` / `splitter-qa`
Reviewer: `fll_lead` (lead-implemented and lead-verified; no subagent claims)
Review state: handoff for lead acceptance; browser evidence not obtained
Reviewed: 2026-09-20

## Scope and Evidence Boundary

Owner request: make the vertical splitter between the left pane and the simulator pane
draggable. Single-file change to `src/components/BlocklyComponent.svelte`. Browser drag
behavior is **not verified** (no browser tooling; precedent: `docs/qa/ui-layout-03-review.md`).

## Source Findings

| Review area         | Source result | Evidence                                                                                                                                                                                                                                                                                                                                                          | Browser status                 |
| ------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Splitter element    | Pass          | Rendered between the program pane and `SpikeSimulatorWindow` only when both panes are open; lg-only display via scoped media query (8px, `col-resize`, hover/focus-visible highlight).                                                                                                                                                                            | Unverified.                    |
| Drag                | Pass          | Pointer capture on the splitter; move computes ratio from container rect, clamped 15-85%; rAF-throttled `Blockly.svgResize` during drag; final resize on release; `touch-action: none` for touch dragging. rAF handle cancelled in `onDestroy`.                                                                                                                   | Unverified.                    |
| Sizing model        | Pass          | `--split-ratio` CSS var on the pane container; program pane gets `program-split-active` (only when both open) with `flex: 0 0 calc((100% - 8px) * var(--split-ratio))` at lg — scoped selector specificity (0,2,0) overrides the `lg:flex-1` utility (0,1,0); simulator pane keeps `flex-1` and fills the remainder. Narrow/tab layouts unaffected (media-gated). | Unverified (wrap at extremes). |
| Keyboard            | Pass          | `role="separator"`, `tabindex="0"`, `aria-valuemin/max/now`, ArrowLeft/ArrowRight adjust 5% with `preventDefault`; svelte a11y warnings addressed via `svelte-ignore` (hyphenated codes) after underscore codes proved ineffective in this Svelte version.                                                                                                        | Unverified.                    |
| No behavior changes | Pass          | Diff confined to the registered file; dead `toggleSize`/`split` wiring untouched; simulation/scoring untouched.                                                                                                                                                                                                                                                   | —                              |

## Validation

-   `npm run check` — 0 errors, 0 warnings.
-   `npm exec -- prettier --check` — pass. `git diff --check` — clean. `npm test` — 210/210.

## Unverified Browser Cases

-   Drag feel and live Blockly re-layout during drag; snap-back at 15%/85% clamps.
-   Keyboard focus order/visibility on the splitter; ARIA value updates announced.
-   Narrow viewport: splitter absent, tabs behave as before.

## Handoff

Lead accepts under the standing owner browser-caveat policy. Highest-value manual check:
drag at desktop width with a run active (workspace re-layout without remount).
