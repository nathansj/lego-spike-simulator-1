# UI Modes 06 QA Review

Task: `ui-modes-06` / `persistent-mode-bar-qa`  
Reviewer: `fll_qa`  
Review state: handoff for lead review; not accepted  
Reviewed: 2026-09-20

## Scope and Evidence Boundary

Reviewed the `persistent-mode-bar-implementation` handoff (working tree, uncommitted)
against the authoritative spec: `docs/design/icon-button-spec.md` Surface 8 (8a–8d,
added by run `ui-modes-06`) and the dated 2026-09-20 amendment in
`docs/design/quiet-practice-layout-spec.md`. Both spec changes are in the same working
tree and were treated as authoritative. The change under review is:

-   `src/components/SpikeSimulatorWindow.svelte` — the simulator top menu bar promoted
    out of the practice-only header into an all-modes bar: mode group
    (`role="group"` / `aria-label="Workspace mode"`) with three iconified mode buttons,
    run/stop moved into the right-hand cluster before `Save project`, dirty status and
    conditional `Close simulator` in the bar, and the `Simulator view` menu reduced to
    camera-only items; `selectWorkspace` removed.
-   `src/components/PracticeReadinessShell.svelte` — text mode buttons, run/stop,
    save/close controls, the `Practice` eyebrow, and the related props/dispatch types
    removed; title, season/mission summary, readiness chips, guidance, and per-mode
    notes retained.

`BlocklyComponent.svelte` and `src/app.css` are untouched by this handoff (verified via
`git status`/`git diff` — only the two spec documents and these two components are
modified), so the narrow `lg:hidden` run strip remains the sanctioned duplicate per 8b.
Owner exceptions A1 (`Program`/`Simulator` tabs), A3 (readiness chips), and A4 (modal
confirmations) were re-checked only where this change touches them: all remain text and
are in unmodified files.

**Browser acceptance is not claimed.** This QA session had no browser tool: no
computer-use/browser tool was available, and the project has no playwright/puppeteer
dependency or cached browser (`package.json`, `node_modules/.bin`, and
`~/Library/Caches/ms-playwright` contain neither; same unavailability as recorded in
`docs/qa/ui-layout-03-review.md` and `docs/qa/ui-icons-05-review.md`). No dev server was
started and no rendered page was observed. All eight Surface 8 acceptance scenarios are
recorded below as unverified.

## Findings

### No spec violations found in source

No defect against Surface 8a–8d was reproduced or identified in the two changed
components:

-   **8a mode bar:** one unconditional `role="group" aria-label="Workspace mode"`
    renders in all three modes with identical DOM order and classes (the markup is
    outside every mode conditional — `SpikeSimulatorWindow.svelte:803-847`); icons are
    the spec glyphs (`HomeOutline`/`AdjustmentsVerticalOutline`/`BugOutline`,
    existence-verified in the installed set); `aria-label` = `title` verbatim;
    `aria-current="page"` only on the active mode button (`undefined` otherwise, which
    Svelte omits); active treatment is the filled/tinted `bg-blue-700 text-white`; a
    vertical divider sits right of the group (`:847`); no responsive class hides or
    collapses the group.
-   **8b run/stop:** the run button is in the right cluster immediately before
    `Save project` (`:865-888`), renders in all modes, and is driven by the unchanged
    `practiceRunLabel` (`:354-358`) / `runOrCorrect` (`:417-425`) state machine —
    icon, `title`, and `aria-label` all bind the same reactive string per the State
    Contract. The pre-change practice run button was removed (moved, not copied).
-   **8c removals:** the two mode-route menu items and their separator are gone; the
    `Simulator view` menu keeps only `Focus robot`/`Default view` (`:910-940`). The
    shell's text mode buttons, save, close, run/stop controls, and `Practice` eyebrow
    are removed; the shell now renders no primary action buttons other than the chips.
    `Close simulator` moved to the bar with the same conditional (`{#if blocklyOpen}`,
    `:942-952`) and `closeWindow` callback. The removed `selectWorkspace` has no
    remaining references, and the parent no longer passes `canClose`/`on:run`/`on:stop`/
    `on:save`/`on:close`/`on:mode`.
-   **8d invariant:** no `{#key}` depends on `workspaceMode` (the only key block is
    `{#key \`${blocklyOpen}-${robotModelGeneration}\`}`, `:1230`); `workspaceMode`
    remains plain presentation-only component state, so the mode-switch state
    preservation invariant is structurally intact in source.
-   **Dead code:** the shell's removed `runLabel` reactive, `openNextSetupItem`, and
    unused icon/`Button` imports are gone; the retained `ready`, `nextSetupItem`,
    `nextActionLabel`, and `workspaceMode` props are all still used (guidance text
    `:137-146`, per-mode notes `:148-162`, chip `aria-current`). svelte-check reports
    0 errors/0 warnings, confirming no dead bindings.

### UI-MODES-06-N1 (note, not a defect) — `simulatorMenuOpen` persists across mode switches

-   **Severity:** info
-   **Location:** `src/components/SpikeSimulatorWindow.svelte:896-941`
    (`simulatorMenuOpen` menu), `:816/:828/:842` (mode button handlers)
-   **Reproduction:** Open the `Simulator view` menu, then click a mode button in the
    new bar.
-   **Expected:** Unspecified by the spec; previously the practice-only header (and its
    menu) unmounted on a mode switch, so the menu always closed.
-   **Actual:** The bar is no longer keyed to the mode, so an open menu stays open
    across the mode change (`simulatorMenuOpen` is mode-independent state; nothing
    clears it in the mode click handlers).
-   **Impact:** Minor UX edge newly enabled by the all-modes promotion. Escape
    (`closeSimulatorMenu`, `:427-432`) and re-clicking the trigger still close it.
    Recommend the lead decide whether mode switches should close the menu; not a spec
    violation.

### Verdicts on the two implementation-flagged items

-   **(a) Tab order run/stop → save vs the wireframe's listed visual order —
    acceptable, not a defect.** Surface 8 acceptance scenario 8 is the normative
    constraint: "Tab order in the bar is mode group → run/stop → save → remaining
    controls." DOM order delivers exactly that (group `:803-847`, run `:865-879`, save
    `:880-888`, then Simulator view `:896-941` and Close `:942-952`). 8b's normative
    position ("immediately BEFORE `Save project`", `:865-888`) is also satisfied. The
    only conflict is the ASCII wireframe in `quiet-practice-layout-spec.md`, which
    lists `[Simulator view ▾] [▶ Run] [Save]`; that diagram is illustrative — it also
    omits the dirty status and Close controls and shows a `[Reset run]` header control
    that is not part of the Surface 8 bar. Cosmetic spec-text inconsistency only;
    recommend `fll_design` align the wireframe in a later pass.
-   **(b) Expert mode's two camera menus — spec-consistent redundancy; design
    follow-up, not a defect of this handoff.** The top-bar camera-only
    `Simulator view` menu now renders in Expert mode (`SpikeSimulatorWindow.svelte:896-941`
    sits outside the mode conditionals), and Surface 6 explicitly requires the Expert
    section's camera `MenuDropdown name="camera"` to stay untouched (`:1154-1159`).
    Both behaviors are mandated by the authoritative spec, so the implementation is
    conformant. However, Expert mode now offers two camera controls whose scopes
    overlap (Focus robot/Default view vs the expert camera menu). Recommend the lead
    log a `fll_design` follow-up (consolidate or differentiate); resolving it would
    require a new owner decision, out of scope for `ui-modes-06`.

## Source Findings

| Review area                        | Source result                  | Evidence                                                                                                                                                      | Browser status                                    |
| ---------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Mode bar present in all modes (8a) | Source-supported, not accepted | Bar markup is unconditional; mode group at `SpikeSimulatorWindow.svelte:803-847` with no responsive hiding classes.                                           | Unverified (bar identity screenshot, scenario 1). |
| Mode group semantics (8a)          | Source-supported, not accepted | `role="group"` + `aria-label="Workspace mode"` verbatim (`:803-806`); vertical divider right of the group (`:847`).                                           | Unverified (a11y tree).                           |
| MBR-1 Practice                     | Source-supported, not accepted | `HomeOutline`, `aria-label`/`title` `Practice`, `aria-current="page"` only when active, `on:click` sets `workspaceMode` (`:808-819`).                         | Unverified (tooltip/focus/name).                  |
| MBR-2 Expert Setup                 | Source-supported, not accepted | `AdjustmentsVerticalOutline`, verbatim names, same wiring (`:820-831`).                                                                                       | Unverified.                                       |
| MBR-3 Developer Diagnostics        | Source-supported, not accepted | `BugOutline`, verbatim names, same wiring (`:832-845`).                                                                                                       | Unverified.                                       |
| Active treatment                   | Source-supported, not accepted | Filled `bg-blue-700 text-white` vs `text-slate-700 hover:bg-slate-100` (`:810-812, 822-824, 834-836`).                                                        | Unverified (visual).                              |
| Icon existence / distinctness      | Verified (installed set)       | `HomeOutline.svelte`, `AdjustmentsVerticalOutline.svelte`, `BugOutline.svelte`, `CloseOutline.svelte` present in `node_modules/flowbite-svelte-icons/dist/`.  | Visual confusability (vs EXP-9) unverified.       |
| Focus ring                         | Source-supported, not accepted | Mode buttons use `.icon-btn` (`src/app.css:6-8`, unchanged): `focus-visible:ring-2 focus-visible:ring-blue-700`.                                              | Unverified (visible ring on keyboard focus).      |
| RUN-1 run/stop position (8b)       | Source-supported, not accepted | Right cluster: run button immediately before `Save project` (`:865-888`); same slot in all modes.                                                             | Unverified (all three modes).                     |
| RUN-1 state machine unchanged      | Source-supported, not accepted | `practiceRunLabel` (`:354-358`), `nextActionLabel`/`openNextSetupItem`, `runOrCorrect` (`:417-425`), `startRobot`/`stopRobot` are outside the diff hunks.     | Unverified (live run/stop/corrective).            |
| RUN-1 label binding                | Source-supported, not accepted | `aria-label={practiceRunLabel} title={practiceRunLabel}` from one reactive string (`:868-869`); colors unchanged (`red`/`green`/`light`).                     | Unverified (run swap).                            |
| Route menu items removed (8c)      | Source-supported, not accepted | `Simulator view` menu contains only `Focus robot`/`Default view`; separator and route items gone (`:910-940`).                                                | Unverified (menu contents).                       |
| Menu trigger behavior preserved    | Source-supported, not accepted | `aria-haspopup="menu"`, `aria-expanded`, Escape handler unchanged (`:897-906`, `:427-432`).                                                                   | Unverified (Escape/focus).                        |
| Shell controls removed (8c)        | Source-supported, not accepted | Text mode buttons, save, close, run/stop, and `Practice` eyebrow removed from `PracticeReadinessShell.svelte`; diff-verified.                                 | Unverified (non-practice header).                 |
| `Close simulator` relocation       | Source-supported, not accepted | `{#if blocklyOpen}` + `closeWindow` in the bar (`:942-952`); parent `canClose` prop removed.                                                                  | Unverified.                                       |
| Dead code / unused imports         | Clean                          | `selectWorkspace` unreferenced; shell `Button`/icon imports, `runLabel`, `openNextSetupItem`, `canClose`, and dispatch types `run/stop/save/close/mode` gone. | Not applicable.                                   |
| Shell retention (8c/8d)            | Source-supported, not accepted | h1 (`:64-66`), mission/season summary (`:69-76`), chips (`:78-135`), guidance (`:137-146`), per-mode notes (`:148-162`) intact.                               | Unverified.                                       |
| Eyebrow removed (8d)               | Source-supported, not accepted | The `Practice` uppercase eyebrow is gone; the h1 `Build, run, and improve your robot` stays.                                                                  | Unverified.                                       |
| `{#key}` invariant (8d)            | Source-supported, not accepted | Only key block is `{#key \`${blocklyOpen}-${robotModelGeneration}\`}` (`:1230`); no key depends on `workspaceMode`.                                           | Live run state preservation unverified (sc. 6).   |
| Practice title/summary in bar (8d) | Source-supported, not accepted | Practice-only block inside the bar (`:848-862`).                                                                                                              | Unverified.                                       |
| Narrow run strip (NRS-1) untouched | Verified                       | `BlocklyComponent.svelte` and `src/app.css` unmodified (`git status`); the strip remains the only sanctioned duplicate.                                       | Unverified (narrow reachability, sc. 7).          |
| Exceptions A1/A3/A4                | Text retained                  | Tabs/chips/modal confirmations live in unmodified files (`BlocklyComponent.svelte`, dialogs) and the shell chips (`:78-135`).                                 | Not applicable (text by design).                  |
| Dirty status in bar (8c)           | Source-supported, not accepted | `Unsaved changes`/`Saved` span in the right cluster, all modes (`:889-895`).                                                                                  | Unverified.                                       |

## Demonstrated Source Details

-   `src/components/SpikeSimulatorWindow.svelte:800-954` — the entire top bar renders
    once, outside every mode conditional, so the mode group's DOM, classes, and order
    are identical in practice, expert, and diagnostics by construction; only the
    practice title block (`:848-862`) and the practice status paragraph
    (`:955-971`) are mode-gated, and neither contains mode controls.
-   `src/components/SpikeSimulatorWindow.svelte:813, 825, 837-839` —
    `aria-current={workspaceMode === '…' ? 'page' : undefined}`; Svelte omits the
    attribute when the value is `undefined`, so exactly one mode button carries
    `aria-current="page"` at any time.
-   `src/components/SpikeSimulatorWindow.svelte:865-888` — the run button binds
    `aria-label` and `title` to the same `practiceRunLabel` reactive string and keeps
    the pre-change `color={runSimulation ? 'red' : practiceReady ? 'green' : 'light'}`
    and icon branches (`StopOutline`/`PlayOutline`/`ToolsOutline`), matching the 8b
    "bind one reactive label string" requirement verbatim.
-   `git diff src/components/SpikeSimulatorWindow.svelte` — script-block hunks are
    limited to the icon import block, the `selectWorkspace` deletion, and the bar
    restructuring; `practiceRunLabel` (`:354`), `openNextSetupItem`, and `runOrCorrect`
    (`:417`) are byte-identical to the committed baseline, so run/corrective semantics
    are unchanged.
-   `src/components/PracticeReadinessShell.svelte:16-22, 62-76, 78-162` — the dispatch
    type is now exactly `robot/drive/field/program/season` (matching the parent's
    remaining listeners); the header keeps only the h1; chips, guidance, and per-mode
    notes are unchanged from the baseline.
-   `node_modules/flowbite-svelte-icons/dist/` — `HomeOutline.svelte`,
    `AdjustmentsVerticalOutline.svelte`, `BugOutline.svelte`, and `CloseOutline.svelte`
    all exist in the installed set; the three mode glyphs match spec 8a and are unused
    elsewhere in `src/` (adjusted-sliders pair MBR-2 vs EXP-9 never share a bar).
-   `src/app.css:6-8` — `.icon-btn` (used by all three mode buttons and the
    Close/`Simulator view` triggers) supplies `focus-visible:ring-2
focus-visible:ring-blue-700`, satisfying the State Contract's focus requirement by
    the codebase's existing pattern.

## Unverified Browser Cases

No browser session was available; none of the eight Surface 8 acceptance scenarios
(`icon-button-spec.md`, "Surface 8 acceptance scenarios") was demonstrated:

1.  **Mode bar identical everywhere:** the same three mode controls, same order
    (Practice, Expert Setup, Developer Diagnostics), same group position in all three
    modes at desktop AND the agreed narrow width. Requires rendered per-mode/per-width
    screenshots.
2.  **Tooltips and names:** native `title` tooltip equal to the verbatim mode name on
    hover and keyboard focus; accessibility-tree names match; Enter/Space switches
    modes as the old text buttons did.
3.  **Active mode marked:** exactly one control with the filled treatment and
    `aria-current="page"` per mode, and it is the current mode.
4.  **Run/Stop in the top bar everywhere:** `Run program` present in all three modes;
    live swap to red `StopOutline` `Stop run` with name/tooltip/aria-label updated
    together; corrective naming and `runOrCorrect` routing to the setup target.
5.  **No desktop duplicates in Practice:** exactly one visible run/stop control at
    desktop Practice; `Simulator view` contains only camera items. (Source-verified as
    the only duplicate being the untouched narrow strip; rendered single-control claim
    unverified.)
6.  **State preserved on switch:** a live run and/or unsaved edits surviving
    Practice → Expert Setup → Developer Diagnostics → Practice with no pane
    reinitializing (8d invariant with a live run).
7.  **Narrow width:** the mode group stays in the bar with working tooltips at the
    agreed narrow viewport/200% zoom; with the Program tab active, the narrow strip is
    the reachable Run/Stop and mirrors the bar control's state; `Stop run` reachable
    without a menu; no clipped controls or horizontal scroll.
8.  **Keyboard order/focus:** tab order mode group → run/stop → save → remaining
    controls; visible focus rings; menu triggers keep `aria-haspopup`/`aria-expanded`
    and Escape/focus-return behavior.

## Coverage Gaps and Handoff to Lead

-   All eight Surface 8 acceptance scenarios remain unverified; per the Phase A/B
    precedent, the lead should require a browser pass (desktop hover/focus/a11y-tree in
    all three modes, live run across a mode switch, narrow viewport/200% zoom) before
    accepting, or assign it to a session with browser tooling. Source-level
    conformance is complete on my inspection.
-   UI-MODES-06-N1 (menu-open persistence across mode switches) needs a lead decision:
    accept as-is or require mode switches to close the menu.
-   Flagged item (b) (dual camera menus in Expert mode) is spec-consistent; recommend
    logging a `fll_design` follow-up for consolidation or differentiation. Flagged
    item (a) is acceptable per scenario 8; recommend `fll_design` sync the layout-spec
    wireframe ordering in a future pass.
-   MBR-2 vs EXP-9 icon confusability (`AdjustmentsVerticalOutline` vs
    `AdjustmentsHorizontalOutline`) requires the side-by-side visual check from spec
    scenario 1/8; not assessable without rendering.
-   This review does not assess scoring, physics, assets, season content, or physical
    calibration.

## Validation Commands (run by QA)

-   `npm run check` — svelte-check found 0 errors and 0 warnings.
-   `npm exec -- prettier --check src/components/SpikeSimulatorWindow.svelte
src/components/PracticeReadinessShell.svelte src/app.css` — all files pass.
-   `git diff --check` — clean (exit 0).
-   `npm test` — 47 test files, 210 tests, all passed.
-   `npm exec -- prettier --check docs/qa/ui-modes-06-review.md` — pass (recorded after
    writing this report).
-   `git diff --check -- docs/qa/ui-modes-06-review.md` — clean (recorded after writing
    this report).
