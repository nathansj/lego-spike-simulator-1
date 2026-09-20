# Icon Button Specification

Task: `ui-icons-04` / `icon-button-design`
Owner: `fll_design`
Status: proposed design and implementation handoff; no production source changed

## Purpose and Supersession

The owner asked the team to "iconify all the buttons instead of text with the text shown
as alt text on hover". This request supersedes the text-label-first rule in
`docs/design/quiet-practice-layout-spec.md` (formerly "Use text labels first; an icon may
accompany but never replace the label") and any similar statements in that document, which
are updated by this specification.

Interpretation (proposed, pending lead/owner confirmation of the two exceptions):

-   **In scope:** toolbar and action buttons across the Practice and Expert/Diagnostics
    header surfaces, the Blockly pane controls, the command disclosure, and the narrow run
    strip. Each becomes an icon-only button whose accessible name and hover/`title` text
    equal its current text label verbatim.
-   **Exceptions (documented, not silently dropped):** route/tab controls that carry a
    selected state (`Program`/`Simulator` tabs, `Practice`/`Expert Setup`/`Developer
Diagnostics` routes) and modal confirmation buttons (`Keep working`, `Discard
changes`, `OK`/`CANCEL`/`SAVE`) keep visible text. Icon-only routes and destructive
    confirmations would harm wayfinding and comprehension; owner approval is required to
    extend iconification there.

## Evidence Boundary

All behavior below is **proposed** until `fll_experience` implements it and `fll_qa`
records browser evidence. Accessibility-specific validation (full screen-reader passes)
remains deferred per owner request; **keyboard-visible focus and the accessible-name
contract are required and verified** before acceptance. Current-button inventory was
taken from the working tree on 2026-09-19 (`git status` snapshot with
`SpikeSimulatorWindow.svelte`, `BlocklyComponent.svelte`, `PracticeReadinessShell.svelte`
and the BlocklyComponent-opened dialogs as read).

## Icon Source

`flowbite-svelte-icons@^1.6.2` is already a dependency (package.json) and already used in:

-   `src/components/AudioDialog.svelte:3` — `CirclePlusOutline`, `PlaySolid`, `TrashBinOutline`
-   `src/components/HubWidget.svelte:2` — `AngleLeftOutline`, `AngleRightOutline`
-   `src/components/LoadScene.svelte:13` — `EditOutline`, `TrashBinOutline`

All icons proposed below were verified to exist in
`node_modules/flowbite-svelte-icons/dist/` on 2026-09-19. No new dependency is added.
Import individually: `import { PlayOutline } from 'flowbite-svelte-icons';`
Render size follows the existing AudioDialog pattern (e.g. `size="xs"`/`size="sm"` sized
to the button's previous text line height).

## Button Inventory by Surface

Accessible name equals the current visible text label verbatim, including state text.
Buttons keep their existing element type and callbacks; only the visible label is
replaced by an icon plus `aria-label`/`title`.

### Surface 1 — Practice header (SpikeSimulatorWindow.svelte, `workspaceMode === 'practice'` section, the controls `div` beside the dirty-status span)

| ID    | Current visible text                                                                                                      | Proposed icon                                                                         | Accessible name (`aria-label` and `title`) |
| ----- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------ |
| PRH-1 | `Simulator view ▾`                                                                                                        | `GridOutline` + `ChevronDownOutline` (kept small chevron)                             | `Simulator view`                           |
| PRH-2 | `Save project` (flowbite `Button`, light, xs)                                                                             | `FloppyDiskOutline`                                                                   | `Save project`                             |
| PRH-3 | `Run program` (flowbite `Button`, green, sm)                                                                              | `PlayOutline`                                                                         | `Run program`                              |
| PRH-4 | `Stop run` (same button while running, red)                                                                               | `StopOutline`                                                                         | `Stop run`                                 |
| PRH-5 | Corrective label (same button when not ready): `Choose challenge` / `Open Expert Setup` / `Open program` / `Review setup` | `ToolsOutline` (weak glyph for `Choose challenge`/`Review setup` — confirm with lead) | exactly the rendered corrective string     |

The `Simulator view` menu items (`Focus robot`, `Default view`, `Expert Setup`,
`Developer Diagnostics`) keep visible text: they are `role="menuitem"` entries inside a
menu, not toolbar buttons. The menu trigger's `aria-haspopup="menu"`, `aria-expanded`,
Escape handling, and callbacks are unchanged.

### Surface 2 — Blockly pane header bar (BlocklyComponent.svelte, `z-10 flex shrink-0 …` header div)

| ID    | Current visible text                   | Proposed icon                               | Accessible name                               |
| ----- | -------------------------------------- | ------------------------------------------- | --------------------------------------------- |
| BLH-1 | `Blockly view ▾`                       | `CodeOutline` + `ChevronDownOutline`        | `Blockly view`                                |
| BLH-2 | `Close print` (existing hidden button) | unchanged — never visible; no iconification | `Close print` (unchanged)                     |
| BLH-3 | `Hide simulator` / `Show simulator`    | `EyeSlashOutline` / `EyeOutline`            | `Hide simulator` / `Show simulator` (dynamic) |

The `Blockly view` menu items (`Show commands`, `Open program`, `Import program`,
`Save program`, `Print program`) keep visible text (`role="menuitem"`).

The narrow-pane tab buttons `Program` and `Simulator` (`role="tab"`,
`aria-selected`) **keep visible text** — exception A1. They are location indicators, not
actions; icon-only tabs would remove the only wayfinding text on narrow viewports.

### Surface 3 — Blockly command disclosure (BlocklyComponent.svelte, overlay container above `blocklyDiv`)

| ID    | Current visible text                   | Proposed icon                                                                                   | Accessible name  |
| ----- | -------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------- |
| CMD-1 | `Commands ▸` / `Commands ▾`            | `LayersOutline` + `ChevronRightOutline`/`ChevronDownOutline` (chevron still rotates with state) | `Commands`       |
| CMD-2 | `Close commands` (overlay link-button) | `CloseOutline`                                                                                  | `Close commands` |

CMD-1 keeps its existing `aria-expanded` and `aria-controls`; state is conveyed by
`aria-expanded` and the chevron, not by label change. The hover-preview, pin, Escape, and
focus-return behavior defined in `docs/design/quiet-practice-layout-spec.md` is unchanged.
The category buttons inside the overlay keep their text (they are menu items named by
season-neutral toolbox category names).

### Surface 4 — Narrow run strip (BlocklyComponent.svelte, `lg:hidden` strip under the workspace)

| ID    | Current visible text                                         | Proposed icon                                  | Accessible name                                    |
| ----- | ------------------------------------------------------------ | ---------------------------------------------- | -------------------------------------------------- |
| NRS-1 | `Stop run` / `Run program` / `Fix setup` (flowbite `Button`) | `StopOutline` / `PlayOutline` / `ToolsOutline` | `Stop run` / `Run program` / `Fix setup` (dynamic) |

### Surface 5 — PracticeReadinessShell controls (PracticeReadinessShell.svelte; header visible in expert/diagnostics modes)

| ID    | Current visible text                                                                                                   | Proposed icon                                                    | Accessible name                        |
| ----- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------- |
| PWS-1 | `Save project` (flowbite `Button`)                                                                                     | `FloppyDiskOutline`                                              | `Save project`                         |
| PWS-2 | `Close simulator` (conditional link-button)                                                                            | `CloseOutline`                                                   | `Close simulator`                      |
| PWS-3 | `Run program` (green)                                                                                                  | `PlayOutline`                                                    | `Run program`                          |
| PWS-4 | `Stop run` (red)                                                                                                       | `StopOutline`                                                    | `Stop run`                             |
| PWS-5 | Corrective: `Choose field` / `Choose robot` / `Fix drive setup` / `Open program` / `Choose challenge` / `Review setup` | `ToolsOutline` (weak glyph for some strings — confirm with lead) | exactly the rendered corrective string |

Exceptions in this surface:

-   A2: route buttons `Practice`, `Expert Setup`, `Developer Diagnostics` keep visible
    text and `aria-current`; iconifying them would hide the current location.
-   A3: readiness chip buttons (`Season`, `Field`, `Robot`, `Drive wheels`, `Program`)
    keep visible text plus the `✓`/`○` state glyph. They combine readiness state with
    navigation and already carry detailed `aria-label`s; icon-only chips would conceal
    state from sighted users. (Their existing aria-labels remain; not part of the icon
    swap.)

### Surface 6 — Expert Setup toolbar (SpikeSimulatorWindow.svelte, `workspaceMode === 'expert'` section)

Phase B (lower priority than Practice default surfaces, same contract):

| ID     | Current visible text                                     | Proposed icon                                                                                    | Accessible name         |
| ------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------- |
| EXP-1  | `Save or export setup`                                   | `FloppyDiskOutline`                                                                              | `Save or export setup`  |
| EXP-2  | `Load project or field`                                  | `FolderOpenOutline`                                                                              | `Load project or field` |
| EXP-3  | `Load missing parts`                                     | `DatabaseOutline`                                                                                | `Load missing parts`    |
| EXP-4  | `Choose LDraw folder`                                    | `FolderPlusOutline`                                                                              | `Choose LDraw folder`   |
| EXP-5  | `Load robot`                                             | `UploadOutline`                                                                                  | `Load robot`            |
| EXP-6  | `Reference robot`                                        | ⚠ no strong glyph in set — proposed `LayersOutline`; confirm with lead or keep text             | `Reference robot`       |
| EXP-7  | `Ports`                                                  | ⚠ weak glyph — proposed `PlusOutline`; confirm with lead or keep text                           | `Ports`                 |
| EXP-8  | `Drive wheels`                                           | `CogOutline` (gear ≈ wheel)                                                                      | `Drive wheels`          |
| EXP-9  | `Simulation settings`                                    | `AdjustmentsHorizontalOutline`                                                                   | `Simulation settings`   |
| EXP-10 | `Display options`                                        | `EyeOutline` (keeps its existing flowbite `Tooltip` text "Display-only camera and grid options") | `Display options`       |
| EXP-11 | `Clear calibration` (disabled until a profile is loaded) | `TrashBinOutline` (matches existing usage in `AudioDialog`/`LoadScene`)                          | `Clear calibration`     |

The camera `MenuDropdown` (`name="camera"`) is not iconified in this pass; its dropdown
internals stay untouched.

### Surface 7 — Dialog buttons opened from BlocklyComponent

Exception A4: **modal confirmation and choice buttons keep visible text** (destructive or
finalizing actions inside dialogs must stay explicit):

-   `UnsavedChangesModal.svelte` — `Keep working`, `Discard changes` (text stays;
    `Discard changes` remains the red danger styling).
-   `PrintDialog.svelte` — `Colour`, `Black and White`, `CANCEL`.
-   `VariableDialog.svelte` — `CANCEL`, `OK`.
-   `ProcedureDialog.svelte` — `CANCEL`, `SAVE`, and the add-input buttons.

Gap fix (required, Phase A): `AudioDialog.svelte` icon-only buttons currently have **no
accessible name at all** (`PlaySolid`, `TrashBinOutline`, `CirclePlusOutline` wrapped in
bare `<button>`s). Add `aria-label` and `title` per button: `Play sound`,
`Remove sound`, `Add sound`. This is a bug fix aligned with this spec's non-negotiables,
not a label change.

## State Contract

Applies to every icon-only button above. Never convey state by icon color alone.

-   **Default:** icon in the button's existing Tailwind classes; no tooltip shown.
-   **Hover:** existing hover background (e.g. `hover:bg-slate-50`) plus the native
    `title` tooltip showing the accessible-name text.
-   **Focus-visible:** a visible focus ring consistent with Tailwind
    (`focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:outline-none` or the
    codebase's existing focus pattern). Native `title` also displays on keyboard focus in
    Chromium/Firefox; the aria-label is the reliable name contract regardless.
-   **Disabled:** keep the real `disabled` attribute (flowbite `Button disabled` or native
    `disabled`), add `cursor-not-allowed opacity-50`. The title may still surface on some
    browsers even when disabled; this is acceptable — the button is not focusable and
    carries no promise.
-   **Active/running swap (PRH-3/4/5, NRS-1, PWS-3/4/5):** when run state changes, the
    **icon, visible-meaning text (`title`), and `aria-label` must all update together**
    with the existing color change. Implementation: bind one reactive label string per
    button (e.g. `{#if runSimulation}` branch already computes the text) and set both
    `title` and `aria-label` from that same string, never a stale literal.
-   **Corrective state:** the same button renders `ToolsOutline` with
    `aria-label`/`title` bound to the exact corrective string from `nextActionLabel()`
    (`SpikeSimulatorWindow`) / the shell's variant. The two surfaces' corrective strings
    differ (`Open Expert Setup` vs `Choose field`); each button's name must equal **its
    own** rendered string.
-   **Danger/destructive:** `Stop run` keeps its red color and gains `StopOutline`;
    `Discard changes` remains a text button per exception A4. No destructive icon button
    is introduced in Phase A.

## Tooltip Behavior

-   Use the native `title` attribute, identical to `aria-label`, on every icon-only
    button. No custom JS tooltip machinery is added; the codebase has none for this
    purpose.
-   The existing flowbite `Tooltip triggeredBy="#camera_config_button"` on `Display
options` stays as-is (its text differs from the button label by design and is
    documented in the layout spec).
-   `title` and `aria-label` are authored together so they cannot drift; where the label
    is dynamic, both bind to the same reactive string.

## Non-Negotiables

1.  Every icon-only button has BOTH an `aria-label` equal to the current text label
    **verbatim** (or the current dynamic state string) and visible-on-hover `title` text
    equal to that same string.
2.  Labels and season-neutral wording from `docs/design/quiet-practice-layout-spec.md`
    are preserved verbatim as accessible names; no new copy, no BIOGLOW or season-specific
    labels in generic shell controls.
3.  No behavior change: callbacks, run/save/route semantics, menu structure,
    `aria-haspopup`/`aria-expanded`/`aria-current`/`aria-controls`, keyboard handlers,
    hover-preview timing, and focus return are unchanged.
4.  No layout-structure change: the exact two-pane Practice layout, header row, command
    overlay positioning, and narrow tab switcher stay as specified; icons must not resize
    buttons into new wrap points (verify at the agreed narrow viewport).
5.  State changes never alter icon color or glyph alone — the accessible name updates
    with the state.
6.  Exceptions A1–A4 (tabs, routes, chips, modal confirmations) keep text until the owner
    explicitly approves extending iconification.

## Bounded Implementation Seams for `fll_experience`

| File                                           | Seam location                                                                                                             | Change                                                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `src/components/SpikeSimulatorWindow.svelte`   | Practice header section: the controls `div` containing the `Simulator view` trigger, `Save project`, and the run `Button` | Iconify PRH-1..5; bind `aria-label`/`title` to the existing reactive label strings; add icon imports |
| `src/components/SpikeSimulatorWindow.svelte`   | Expert Setup section buttons (`Prepared setup`, `Robot`, `Mission and advanced` grids, calibration row)                   | Phase B: EXP-1..11 (confirm weak glyphs EXP-6/7 with lead first)                                     |
| `src/components/BlocklyComponent.svelte`       | Blockly pane header bar (Blockly view trigger, Hide/Show simulator)                                                       | Iconify BLH-1, BLH-3                                                                                 |
| `src/components/BlocklyComponent.svelte`       | Command disclosure button and overlay close button                                                                        | Iconify CMD-1, CMD-2; keep `aria-expanded`/`aria-controls` and focus return                          |
| `src/components/BlocklyComponent.svelte`       | Narrow run strip (`lg:hidden` strip)                                                                                      | Iconify NRS-1 with dynamic name binding                                                              |
| `src/components/PracticeReadinessShell.svelte` | Save/Close/Run controls row                                                                                               | Iconify PWS-1..5; routes and chips unchanged                                                         |
| `src/components/AudioDialog.svelte`            | The three bare icon buttons                                                                                               | Add missing `aria-label` + `title` (`Play sound`, `Remove sound`, `Add sound`)                       |

Do **not** change:

-   Blockly toolbox internals (`src/lib/blockly/toolbox.ts`), category names, or the
    command category list content.
-   Season/mission package content, readiness logic
    (`src/lib/fll/practice-run-gate.ts`), dirty-state logic, or any callback semantics.
-   `Menu.svelte`/`MenuDropdown.svelte` internals, `SimulatorSettings`, `LoadScene`,
    `PortConnector`, `WheelConnector` bodies (their buttons are Expert dialog content and
    out of this pass).
-   The two-pane layout structure, split logic, `activePane` tabs' text, or the print
    styles.

## Observable Acceptance Scenarios for `fll_qa`

Recorded in a `docs/qa/` review file with browser/viewport details; full screen-reader
validation is deferred per owner request (keyboard name/focus behavior is required).

1.  **Desktop hover:** At desktop width in Practice, hovering each header icon button
    (Simulator view, Save project, run control, Blockly view, Hide/Show simulator,
    Commands) shows a native tooltip whose text exactly equals the pre-change button
    label; the header does not reflow or change height.
2.  **Keyboard focus:** Tabbing to each icon button shows a visible focus ring, and the
    tooltip/name is available on focus; Enter/Space triggers the same action the text
    button performed (e.g. Save project opens the save dialog).
3.  **Accessible name:** In Chromium DevTools' accessibility tree, each icon button's
    name equals its former text label verbatim (e.g. `Save project`, `Simulator view`,
    `Commands`), and menu triggers retain `aria-haspopup="menu"`/`aria-expanded`.
4.  **Narrow viewport:** At the agreed narrow width/200% zoom, the narrow run strip and
    tab switcher show icon buttons with correct tooltips; `Run program`/`Stop run` remain
    reachable without horizontal page scrolling or clipped controls.
5.  **Run/Stop swap:** With a ready project, the run control reads `Run program` with a
    play glyph; during a run both header and strip show `StopOutline` with
    name/tooltip/aria-label `Stop run` and red styling; after stopping, names revert.
    When setup is incomplete, the name equals the corrective string (e.g. `Open Expert
Setup` on the header, `Fix setup` on the strip).
6.  **Disabled buttons:** With no calibration profile loaded, `Clear calibration` is
    dimmed, not activatable, and its state is exposed via the real `disabled` attribute;
    icon color is not the only signal.
7.  **Dialogs:** In the Sound Library, the play/remove/add icon buttons expose names
    (`Play sound`, `Remove sound`, `Add sound`) via aria-label and tooltip; the Unsaved
    Changes dialog still shows `Keep working` / `Discard changes` as visible text and
    behaves unchanged.
8.  **Regression guard:** The command disclosure hover/click/Escape/focus-return flow,
    season switch confirmation flow, save flow, and Expert/Diagnostics routes work exactly
    as before the icon change; command overlay open/close does not resize panes or disturb
    workspace state.

## Assumptions and Risks

-   Assumption: the owner's "all the buttons" request tolerates the documented exceptions
    A1–A4 (tabs, routes, chips, modal confirmations); the lead confirms before
    implementation.
-   Assumption: native `title` tooltips satisfy the "alt text on hover" request without
    custom tooltip code.
-   Risk: icon-only menu triggers (`Simulator view`, `Blockly view`, `Commands`) reduce
    discoverability for first-time participants; the chevron and hover text mitigate this.
    Needs participant observation, which has not been done — no user research is claimed.
-   Risk: weak glyph mappings (PRH-5 for `Choose challenge`/`Review setup`, EXP-6, EXP-7)
    are placeholder choices from the installed set; the lead/design confirms or those
    buttons keep text.
-   Risk: icon sizing could change header wrap behavior at medium widths; acceptance
    scenario 1 and 4 cover this, but the fix (icon size token) is an implementation
    decision, not specified here.
