# UI Icons 05 QA Review

Task: `ui-icons-05` / `phase-b-qa`  
Reviewer: `fll_qa`  
Review state: handoff for lead review; not accepted  
Reviewed: 2026-09-20

## Scope and Evidence Boundary

Reviewed the `phase-b-implementation` handoff (working tree, uncommitted) against the
finalized Phase B / Expert Setup table (EXP-1..11) and the five Phase B acceptance
scenarios in `docs/design/icon-button-spec.md` (Surface 6, finalized by
`ui-icons-05` / `phase-b-design`, which is also present as an uncommitted working-tree
change and was treated as the authoritative spec). The change under review is
`src/components/SpikeSimulatorWindow.svelte` (~+84/−18): the 11 Expert Setup controls
converted to icon-first buttons. Owner exceptions A1–A4 from the accepted Phase A
baseline (`docs/qa/ui-icons-04-review.md`) still apply and were re-checked only where
this surface touches them.

**Browser acceptance is not claimed.** This QA session had no browser tool: no
computer-use/browser tool was available, and the project has no playwright/puppeteer
dependency or cached browser (`node_modules/.bin` and `~/Library/Caches/ms-playwright`
contain neither; same unavailability as recorded in `docs/qa/ui-layout-03-review.md`).
No dev server was started and no rendered page was observed. All five Phase B
acceptance scenarios are recorded below as unverified.

## Findings

### No spec violations found in source

No defect against `docs/design/icon-button-spec.md` (Surface 6, EXP-1..11) was
reproduced or identified in the changed file. All 11 Expert Setup buttons have
`aria-label` + `title` equal to the prior visible text verbatim, the icons match the
finalized spec table exactly, every icon is `aria-hidden="true"`, no handler logic
changed, and the documented non-iconified controls in the section are untouched.

### UI-ICONS-05-N1 (note, not a defect) — EXP-11 dim styling is provided by the library, not the patch

-   **Severity:** info
-   **Location:** `src/components/SpikeSimulatorWindow.svelte:1148-1157`;
    `node_modules/flowbite-svelte/dist/buttons/Button.svelte:101`
-   **Reproduction:** Inspect the `Clear calibration` button markup and the flowbite
    `Button` class composition.
-   **Expected:** Spec EXP-11 state note and the State Contract require the real
    `disabled` attribute plus dimming (`cursor-not-allowed opacity-50`).
-   **Actual:** The patch keeps `disabled={m01ObservationGeometry === undefined}` and
    adds no manual dim class. The flowbite `Button` component itself appends
    `disabled && "cursor-not-allowed opacity-50"` to the composed class, so the dim
    styling is present at render time without a source-level class in this file.
-   **Impact:** None; the State Contract is met through the existing library behavior,
    identical to how pre-change disabled flowbite buttons rendered. The rendered dim
    appearance remains browser-unverified (Phase B scenario 5).

### UI-ICONS-05-N2 (note, not a defect) — EXP focus ring is the flowbite pattern, not the `.icon-btn` utility

-   **Severity:** info
-   **Location:** `src/components/SpikeSimulatorWindow.svelte:991-1157` (all EXP
    buttons); `src/app.css:5-9` (unchanged `.icon-btn`)
-   **Reproduction:** Tab through the Expert Setup toolbar and inspect focus styling.
-   **Expected:** State Contract requires a visible focus ring "consistent with
    Tailwind … or the codebase's existing focus pattern".
-   **Actual:** EXP buttons do not use the Phase A `.icon-btn` utility; they rely on
    flowbite `Button`'s built-in `focus-within:ring-4` + `focus-within:ring-gray-200`
    (non-group composition in `Button.svelte:77-79, 47`). This is the same focus
    pattern these buttons had before the change (pre-existing, unchanged), and the spec
    explicitly allows the codebase's existing focus pattern. Note the ring is
    `focus-within` (not `focus-visible`-only) and gray-200 on a white button is
    low-contrast — pre-existing library behavior, out of scope for this pass.
-   **Impact:** None for this handoff; Phase B scenario 2's visual focus-ring
    visibility remains browser-unverified.

## Source Findings

| Review area                                                  | Source result                  | Evidence                                                                                                                                                                | Browser status                                        |
| ------------------------------------------------------------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| EXP-1 `Save or export setup`                                 | Source-supported, not accepted | `FloppyDiskOutline`, `aria-label`/`title` verbatim, `on:click={saveRobotOrScene}` kept (`SpikeSimulatorWindow.svelte:991-999`).                                         | Unverified (tooltip, a11y tree, focus).               |
| EXP-2 `Load project or field`                                | Source-supported, not accepted | `FolderOpenOutline`, verbatim name, `on:click={loadScene}` kept (`:1015-1023`).                                                                                         | Unverified.                                           |
| EXP-3 `Load missing parts`                                   | Source-supported, not accepted | `DatabaseOutline`, verbatim name, `class={libraryClass}` retained (`!p-2` / `!p-2 animate-bounce`), `on:click={askForLibrary}` kept (`:1024-1033`).                     | Unverified (bounce visibility).                       |
| EXP-4 `Choose LDraw folder`                                  | Source-supported, not accepted | `FolderPlusOutline`, verbatim name, `#select_library_folder` click proxy handler unchanged (`:1034-1045`).                                                              | Unverified.                                           |
| EXP-5 `Load robot`                                           | Source-supported, not accepted | `UploadOutline`, constant name `Load robot`, `color={robotButtonColour}` binding retained (`light`/`red`/`green` set at `:282-287`), `askForRobot` kept (`:1056-1064`). | Unverified (three color states).                      |
| EXP-6 `Reference robot`                                      | Source-supported, not accepted | `MapPinAltOutline` (finalized spec glyph), verbatim name, `loadVirtualReferenceRobot = true` kept (`:1065-1073`).                                                       | Unverified (distinctness screenshot, scenario 1).     |
| EXP-7 `Ports`                                                | Source-supported, not accepted | `ShareNodesOutline` (finalized spec glyph), verbatim name, `connectPorts` kept (`:1074-1082`).                                                                          | Unverified (distinctness screenshot, scenario 1).     |
| EXP-8 `Drive wheels`                                         | Source-supported, not accepted | `CogOutline`, verbatim name, `connectWheels` kept (`:1083-1091`).                                                                                                       | Unverified.                                           |
| EXP-9 `Simulation settings`                                  | Source-supported, not accepted | `AdjustmentsHorizontalOutline`, verbatim name, `openSettings` kept (`:1102-1113`).                                                                                      | Unverified.                                           |
| EXP-10 `Display options`                                     | Source-supported, not accepted | `EyeOutline`, verbatim name, no `on:click`, `id="camera_config_button"` preserved; `Tooltip triggeredBy="#camera_config_button"` unchanged (`:1114-1122, 1130-1132`).   | Unverified (flowbite tooltip still fires).            |
| EXP-11 `Clear calibration`                                   | Source-supported, not accepted | `TrashBinOutline`, verbatim name, real `disabled` binding kept; dimming via library (see UI-ICONS-05-N1) (`:1148-1157`).                                                | Unverified (dimmed/inert, enable after profile load). |
| Icon attributes                                              | Source-supported, not accepted | All 11 icons carry `aria-hidden="true"`, `size="sm"` (matches the Phase A `xs`-button pattern, e.g. practice save at `:896`).                                           | Unverified (visual size/wrap).                        |
| Attribute pass-through                                       | Source-supported, not accepted | flowbite `Button` spreads `$$restProps` and `title` onto the native `<button>` (`Button.svelte:115`), so `aria-label`/`title` reach the DOM.                            | A11y-tree names unverified.                           |
| Camera `MenuDropdown name="camera"`                          | Unchanged per spec             | Still text-driven, untouched in the diff (`:1123-1128`).                                                                                                                | Unverified dropdown behavior.                         |
| Menu-item exception (`Expert Setup`/`Developer Diagnostics`) | Text retained                  | Simulator-view menu items untouched by this diff (lines 865/874 area unchanged).                                                                                        | Not applicable (text by design).                      |
| No handler/logic change                                      | Clean                          | Diff hunks touch only the import block and the Expert Setup section markup; no script-block logic, season content, or layout structure changed.                         | Behavior regression (scenario 4) unverified.          |
| Imports/dead code                                            | Clean                          | All 11 newly imported icons exist in installed `flowbite-svelte-icons` (dist listing checked) and each is used in markup; no unused import introduced.                  | Not applicable.                                       |

## Demonstrated Source Details

-   `src/components/SpikeSimulatorWindow.svelte:991-1157` — every EXP button pairs one
    static `aria-label` and `title` set to the identical string, matching the spec's
    verbatim-name rule for these static-label controls; EXP-1..11 names equal the
    committed pre-change text labels exactly (diff-verified: `Save or export setup`,
    `Load project or field`, `Load missing parts`, `Choose LDraw folder`, `Load robot`,
    `Reference robot`, `Ports`, `Drive wheels`, `Simulation settings`, `Display
options`, `Clear calibration`).
-   `src/components/SpikeSimulatorWindow.svelte:101-102, 282-293` — `robotButtonColour`
    (`light`/`red`/`green`) and `libraryClass` (`!p-2` / `!p-2 animate-bounce`) are
    unchanged from the committed baseline and still bound at `:1057` and `:1027`,
    preserving EXP-5 color states and the EXP-3 bounce.
-   `src/components/SpikeSimulatorWindow.svelte:1039-1042` — the `Choose LDraw folder`
    handler is byte-identical to the committed version
    (`document.getElementById('select_library_folder')?.click()`); only the label
    became `FolderPlusOutline`.
-   `src/components/SpikeSimulatorWindow.svelte:1114-1122, 1130-1132` —
    `id="camera_config_button"` has no added `on:click`, and the existing flowbite
    `Tooltip triggeredBy="#camera_config_button"` is untouched, so the
    "Display-only camera and grid options" tooltip wiring is structurally intact.
-   `git diff src/components/SpikeSimulatorWindow.svelte` — hunks are limited to the
    icon import block (11 additions, alphabetical) and the `workspaceMode === 'expert'`
    section; the Practice header, Blockly pane, app.css, and all other files from the
    Phase A baseline are untouched by this handoff.
-   `node_modules/flowbite-svelte-icons/dist/` — `MapPinAltOutline.svelte` and
    `ShareNodesOutline.svelte` exist in the installed set, matching the finalized
    EXP-6/EXP-7 glyph resolution; the other nine EXP icons verified the same way.

## Unverified Browser Cases

No browser session was available; none of the five Phase B acceptance scenarios
(`icon-button-spec.md`, "Phase B acceptance scenarios") was demonstrated:

1.  **Reference robot vs Ports distinctness:** `MapPinAltOutline` vs
    `ShareNodesOutline` visually distinguishable from each other and every other icon
    in the section at `size="xs"`, with side-by-side screenshot. Requires a rendered
    Expert Setup toolbar at desktop width.
2.  **Hover/aria names:** Native `title` tooltip and accessibility-tree name equal to
    the verbatim label for each EXP-1..11 button on hover and keyboard focus. Requires
    a11y-tree inspection (Chromium DevTools) and hover/keyboard passes.
3.  **Layout unchanged:** Three-column `lg:grid-cols-3` grid, section height, and wrap
    behavior at desktop and the agreed narrow viewport; no new wrap points or clipped
    controls from iconification. Requires rendered viewport checks.
4.  **Behavior regression:** Each button triggers its original action (`Ports` opens
    the port connector, `Reference robot` opens the virtual reference robot dialog,
    `Simulation settings` opens settings, `Choose LDraw folder` opens the folder
    picker, `Display options` shows the `#camera_config_button` tooltip, camera
    `MenuDropdown` works). Requires interactive browser exercise.
5.  **State preservation:** `Clear calibration` dimmed/inert with a real `disabled`
    attribute and activatable after loading a profile; `Load robot` light/red/green
    states with the constant name `Load robot`; `Load missing parts` `animate-bounce`
    when the library is missing. Requires rendered state manipulation.

## Coverage Gaps and Handoff to Lead

-   All five Phase B acceptance scenarios remain unverified; per the Phase A precedent,
    the lead should require a browser pass (desktop hover/focus/a11y-tree, narrow
    viewport, distinctness screenshot, dialog/state flows) before accepting, or assign
    it to a session with browser tooling. Source-level conformance is complete on my
    inspection.
-   The working tree carries the `phase-b-design` spec update and this implementation
    together (two modified files); I treated the updated spec as authoritative. The
    `git diff` cleanly isolates the implementation hunks to
    `SpikeSimulatorWindow.svelte`, so diff-based handler claims were possible this time
    (unlike the Phase A cumulative-tree situation).
-   UI-ICONS-05-N1/N2 are informational only; no correction requested.
-   Owner exceptions A1–A4 remain intact; no exception surface was modified by this
    handoff.
-   This review does not assess scoring, physics, assets, season content, or physical
    calibration.

## Validation Commands (run by QA)

-   `npm run check` — svelte-check found 0 errors and 0 warnings.
-   `npm exec -- prettier --check src/components/SpikeSimulatorWindow.svelte
src/app.css` — all files pass.
-   `git diff --check` — clean (exit 0).
-   `npm test` — 47 test files, 210 tests, all passed.
-   `npm exec -- prettier --check docs/qa/ui-icons-05-review.md` — pass (recorded after
    writing this report).
-   `git diff --check -- docs/qa/ui-icons-05-review.md` — clean (recorded after writing
    this report).
