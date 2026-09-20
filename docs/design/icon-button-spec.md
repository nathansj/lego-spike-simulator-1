# Icon Button Specification

Task: `ui-icons-04` / `icon-button-design`; Phase B finalized by `ui-icons-05` / `phase-b-design`
Owner: `fll_design`
Status: proposed design and implementation handoff; no production source changed
Changelog: 2026-09-20 (run `ui-modes-06`) — added Surface 8, the persistent iconified mode bar
and the unified simulator top-bar run/stop control, per a new owner decision that supersedes
exception A2 for the three mode controls (Practice, Expert Setup, Developer Diagnostics).
Changelog: 2026-09-19 (run `ui-icons-05`) — Phase B / Expert Setup (EXP-1..11) inventory re-verified
against the committed source, weak glyphs EXP-6/EXP-7 resolved to verified icons, and the Phase B
section upgraded from deferred to an implementation-ready handoff. Phase A content below is unchanged.

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
    **Update 2026-09-20 (`ui-modes-06`):** the owner has iconified the three mode route
    controls in the simulator top bar (Surface 8 below), superseding exception A2 for
    exactly those three controls. Exception A2 still applies to any _other_ mode-route
    control; the `Program`/`Simulator` tabs remain exception A1 and modal confirmations
    remain exception A4.

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
menu, not toolbar buttons. **Amended 2026-09-20 (Surface 8c):** the `Expert Setup` and
`Developer Diagnostics` items are removed from this menu (replaced by the mode bar); only
the camera items remain. The menu trigger's `aria-haspopup="menu"`, `aria-expanded`,
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

**Update 2026-09-20 (`ui-modes-06`):** PWS-1 (save), PWS-2 (close), and PWS-3/4/5
(run/stop/corrective) move to the simulator top menu bar and are removed from this
surface; the TEXT mode buttons are removed entirely (replaced by Surface 8 MBR-1..3).
The readiness chips (A3) stay here unchanged. Surface 8c is the authority on what remains.

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

**Status: finalized 2026-09-19 for run `ui-icons-05`** — re-verified against the committed
source (commit `bdf2363`), section spans lines 955–1109. Labels below are the exact current
visible text, verbatim. Phase B is implementation-ready; `fll_experience` should not need
further design input.

| ID     | Accessible name / `title` (verbatim) | Final icon                     | Handler / location (current source)                            | State notes                                                                                                                                                    |
| ------ | ------------------------------------ | ------------------------------ | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EXP-1  | `Save or export setup`               | `FloppyDiskOutline`            | `saveRobotOrScene`, header row, line 981                       | flowbite `Button` light xs                                                                                                                                     |
| EXP-2  | `Load project or field`              | `FolderOpenOutline`            | `loadScene`, Prepared setup grid, line 999                     | light xs                                                                                                                                                       |
| EXP-3  | `Load missing parts`                 | `DatabaseOutline`              | `askForLibrary`, line 1002                                     | keeps `class={libraryClass}` (`!p-2`, or `!p-2 animate-bounce` when the library is missing — keep the bounce; it is attention, not a color-only state channel) |
| EXP-4  | `Choose LDraw folder`                | `FolderPlusOutline`            | proxies hidden `#select_library_folder` input click, line 1008 | light xs                                                                                                                                                       |
| EXP-5  | `Load robot`                         | `UploadOutline`                | `askForRobot`, line 1026                                       | keeps dynamic `color={robotButtonColour}` (`light`/`red`/`green`); the accessible name stays `Load robot` in all three states, matching today's constant text  |
| EXP-6  | `Reference robot`                    | `MapPinAltOutline`             | sets `loadVirtualReferenceRobot = true`, line 1031             | light xs                                                                                                                                                       |
| EXP-7  | `Ports`                              | `ShareNodesOutline`            | `connectPorts`, line 1037                                      | light xs                                                                                                                                                       |
| EXP-8  | `Drive wheels`                       | `CogOutline`                   | `connectWheels`, line 1040                                     | light xs                                                                                                                                                       |
| EXP-9  | `Simulation settings`                | `AdjustmentsHorizontalOutline` | `openSettings`, line 1053                                      | light xs                                                                                                                                                       |
| EXP-10 | `Display options`                    | `EyeOutline`                   | no `on:click`; `id="camera_config_button"`, line 1056          | existing flowbite `Tooltip` "Display-only camera and grid options" stays as-is                                                                                 |
| EXP-11 | `Clear calibration`                  | `TrashBinOutline`              | `clearM01ObservationProfile`, line 1084                        | `disabled={m01ObservationGeometry === undefined}`; keep real `disabled` + dimming per State Contract                                                           |

EXP-6/EXP-7 glyph resolution (supersedes the `ui-icons-04` placeholders):

-   **EXP-6 `Reference robot` → `MapPinAltOutline`.** flowbite-svelte-icons@^1.6.2 has no
    robot, android, or figure-model glyph (verified by listing
    `node_modules/flowbite-svelte-icons/dist/` on 2026-09-19). A map pin reads as
    "reference point/landmark", which matches the semantic (loading the built-in
    reference model); it is visually distinct from `UploadOutline` beside it and from
    every other icon in this spec.
-   **EXP-7 `Ports` → `ShareNodesOutline`.** There is no plug/socket/connector glyph in
    the set. A hub with connected nodes matches what the Ports dialog does (connect robot
    ports to hub ports) and is clearly distinct from `CogOutline` (Drive wheels) and the
    `PlusOutline` placeholder it replaces. Both chosen components exist as
    `MapPinAltOutline.svelte` and `ShareNodesOutline.svelte` in the dist folder; all nine
    other EXP icons were re-verified the same way (`FloppyDiskOutline`, `FolderOpenOutline`,
    `DatabaseOutline`, `FolderPlusOutline`, `UploadOutline`, `CogOutline`,
    `AdjustmentsHorizontalOutline`, `EyeOutline`, `TrashBinOutline`).

In this section, and still NOT iconified:

-   The `MenuDropdown name="camera"` (line 1059) stays untouched.
-   The `Expert Setup` / `Developer Diagnostics` entries at lines 865/874 are
    `role="menuitem"` buttons inside the Simulator view menu; they keep visible text
    (menu-item exception, same as A1/A2).
-   Section headings (`Prepared setup`, `Robot`, `Mission and advanced`) are `h3`s, not
    buttons; the M01 calibration row keeps its native file input. No tabs, chips, or
    modal confirmations live inside this section; exceptions A1–A4 are unaffected.

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

## Surface 8 — Persistent mode bar and unified run control (run `ui-modes-06`, 2026-09-20)

**Status: proposed.** Owner decision from hands-on use: switching between Expert and
Practice views must not change the mode-selection UI itself. All three modes are therefore
ALWAYS visible as iconified controls in the simulator's top menu bar, in every mode, at
desktop and narrow widths. This supersedes exception A2 for exactly these three controls
and the ui-modes-06 placement supersedes the practice-header-only arrangement.

### Verified current behavior (2026-09-20, read-only)

-   `SpikeSimulatorWindow.svelte`: `workspaceMode` state (:100); Practice-only compact header
    (~:796–936) whose icon `Simulator view` menu contains TEXT items `Expert Setup` (~:873)
    and `Developer Diagnostics` (~:882); practice run button (~:905) driven by the reactive
    `practiceRunLabel` (:350–354) and `runOrCorrect` (:413). Non-practice modes render
    `PracticeReadinessShell` instead (:938–959).
-   `PracticeReadinessShell.svelte`: header (:97–157) with TEXT mode buttons `Practice` /
    `Expert Setup` / `Developer Diagnostics` (:106–135, `aria-current` at :111/:121/:131),
    its own save button (:136–144), and its own icon run/stop control (:166–200, `runLabel`
    :46). It renders only when `workspaceMode !== 'practice'` — so today the mode switcher
    changes shape depending on the mode (the owner's complaint).
-   `BlocklyComponent.svelte`: narrow `lg:hidden` run strip (:702–724, `stripRunLabel` :496)
    inside the Program pane.
-   Mode switches do not reinitialize run/score/project state: `workspaceMode` is plain
    component state and the `{#key}` block keys only on `blocklyOpen-robotModelGeneration`.

### 8a. Mode bar inventory

The three controls are one `role="group"` labelled `Workspace mode` (or an equivalent
labelled container), placed at the leading edge of the simulator top menu bar in ALL modes.

| ID    | Mode                  | Verified icon (`flowbite-svelte-icons`) | `aria-label` = `title` (verbatim) | Active state (visual + ARIA)                                           |
| ----- | --------------------- | --------------------------------------- | --------------------------------- | ---------------------------------------------------------------------- |
| MBR-1 | Practice              | `HomeOutline` (`HomeOutline.svelte`)    | `Practice`                        | filled/tinted button background plus `aria-current="page"` when active |
| MBR-2 | Expert Setup          | `AdjustmentsVerticalOutline`            | `Expert Setup`                    | same treatment plus `aria-current="page"`                              |
| MBR-3 | Developer Diagnostics | `BugOutline` (`BugOutline.svelte`)      | `Developer Diagnostics`           | same treatment plus `aria-current="page"`                              |

-   **Existence-verified 2026-09-20** in `node_modules/flowbite-svelte-icons/dist/`
    (`HomeOutline.svelte`, `AdjustmentsVerticalOutline.svelte`, `BugOutline.svelte`).
    All three are unused by Surfaces 1–7 and mutually distinct (house / vertical sliders /
    bug silhouettes). MBR-2 is a sibling of EXP-9's `AdjustmentsHorizontalOutline`; they
    never appear adjacent (different bars) and the directions differ, but QA checks the
    pair for confusability.
-   **Order is fixed:** Practice, Expert Setup, Developer Diagnostics (ascending opt-in
    depth, matching the brief's workspace table).
-   **Grouping:** the mode group sits left of a vertical divider in the top bar; all other
    top-bar controls (run/stop, save, dirty status, view menus, close) sit right of it.
    The group is identical pixel-for-pixel and DOM-order-for-DOM-order in all three modes —
    that identity is the point of this change.
-   **Beginner-recognition mitigation (documented, owner decision followed):** icon-only
    mode routes reduce first-time wayfinding compared with today's text buttons. Mitigations:
    native `title`/`aria-label` with the verbatim mode name, the filled active treatment,
    and the retained in-content mode note (8d) naming the current mode in words. If QA or
    observation shows participants cannot find the modes, the fallback is text beside
    icons — NOT a per-mode re-arrangement.
-   **Narrow width:** the mode group stays in the top bar at the agreed narrow viewport and
    200% zoom; it never collapses into a menu or overflow. Icon size may shrink one step
    (`size="xs"`) but the three controls and their tooltips remain.

### 8b. Run/Stop in the simulator top bar (all modes)

| ID    | Control  | Icon (existing, verified)                      | `aria-label` = `title` (dynamic)                                | Behavior callback                                    |
| ----- | -------- | ---------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------- |
| RUN-1 | Run/Stop | `PlayOutline` / `StopOutline` / `ToolsOutline` | `Run program` / `Stop run` / the first corrective action string | `runOrCorrect` (stop → start → open next setup item) |

-   **Position:** the top bar's right-hand action cluster, immediately BEFORE `Save project`
    and after the mode group's divider. Same slot in Practice, Expert Setup, and Developer
    Diagnostics; it is never hidden in an overflow menu.
-   **State machine unchanged:** bind one reactive label string per mode host
    (`practiceRunLabel` in `SpikeSimulatorWindow.svelte` :350–354; the shell's `runLabel`
    equivalent) to icon, `title`, and `aria-label` together, per the existing State
    Contract "Active/running swap". `Stop run` keeps red, `Run program` green,
    corrective `light` with `ToolsOutline`, exactly as today.
-   **Duplicates resolved:**
    -   Practice-header run button (SpikeSimulatorWindow ~:905): removed — it IS the new
        bar control (moved, not copied).
    -   PracticeReadinessShell run control (:166–200, PWS-3/4/5): removed. The shell no
        longer renders any run/stop button.
    -   BlocklyComponent narrow strip (:702–724, NRS-1): **KEPT.** Rationale: at narrow
        width with the Program tab active, the simulator pane (which owns the top bar) is
        `hidden`, so a bar-only run control would be unreachable — violating the brief's
        "Stop must stay accessible" and layout-spec run-visibility scenario. The strip is
        `lg:hidden` and only renders when the simulator pane is not the visible surface,
        so on desktop Practice there is exactly ONE visible run control. This is the only
        sanctioned run-control duplicate; it binds the same reactive label and callback
        (`simulatorWindow.runOrCorrect()`).

### 8c. Removals and non-duplication contract

-   `Simulator view` menu items `Expert Setup` (~:873) and `Developer Diagnostics` (~:882)
    are **removed** — the mode bar replaces them. The menu KEEPS `Focus robot` and
    `Default view` (camera-only, route-neutral), so the menu itself stays and loses its
    pre-route separator.
-   PracticeReadinessShell TEXT mode buttons (:106–135), their `aria-current` wiring, the
    shell save button (:136–144, PWS-1), and the shell run control (PWS-3/4/5) are
    **removed** — all three functions live in the top bar now. `Close simulator` (PWS-2)
    also moves to the top bar's right cluster (same conditional `canClose` behavior), so
    the shell renders no primary action buttons other than readiness chips.
-   **Top bar owns (all modes):** mode group (MBR-1..3), run/stop (RUN-1), `Save project`
    (PWS-1 styling), unsaved-changes status text, `Simulator view` menu (Practice camera
    items only), `Close simulator` (conditional).
-   **Shell header retains (non-practice modes):** the mission/season summary line, the
    readiness chips (A3, unchanged), the setup-guidance text, and the per-mode informational
    note. It loses the eyebrow label, the h1 row's navigation cluster, save, close, and run.

### 8d. Mode name in content (informational, not a switcher)

The bar now marks location, so per-pane mode-name labels are de-duplicated: the shell's
hardcoded `Practice` eyebrow (PracticeReadinessShell.svelte :100 — today shown even in
expert/diagnostics modes, which is wrong) is removed; the h1 `Build, run, and improve your
robot` may stay as a page title. The shell's per-mode informational notes (:273–287) STAY —
they explain what the current mode is for, which text the icon-only bar can no longer carry.
The Practice pane's own title/season summary row stays in the top bar region.

**Preserved invariant:** switching modes must not lose run, score, program, season, mission,
dirty-state, or project state. This is already true (`workspaceMode` is presentation-only
component state; no `{#key}` depends on it); the invariant is restated here so
implementation and QA protect it. `fll_qa` must verify it with a live run in progress.

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
-   **Active/running swap (RUN-1 incl. the narrow strip NRS-1):** when run state changes, the
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
    hover-preview timing, and focus return are unchanged. (Surface 8 is the documented
    exception: it removes the two mode-route menu items and relocates run/save/close per
    the owner decision.)
4.  No layout-structure change: the exact two-pane Practice layout, header row, command
    overlay positioning, and narrow tab switcher stay as specified; icons must not resize
    buttons into new wrap points (verify at the agreed narrow viewport).
5.  State changes never alter icon color or glyph alone — the accessible name updates
    with the state.
6.  Exceptions A1, A3, A4 (tabs, chips, modal confirmations) keep text. Exception A2 is
    superseded for the three Surface 8 mode controls (iconified per owner decision,
    2026-09-20); A2 otherwise still applies to any other route control.

## Bounded Implementation Seams for `fll_experience`

| File                                           | Seam location                                                                                                                                                                                    | Change                                                                                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/SpikeSimulatorWindow.svelte`   | Practice header section: the controls `div` containing the `Simulator view` trigger, `Save project`, and the run `Button`                                                                        | Iconify PRH-1..5; bind `aria-label`/`title` to the existing reactive label strings; add icon imports                                      |
| `src/components/SpikeSimulatorWindow.svelte`   | Expert Setup section, `workspaceMode === 'expert'` block (lines ~955–1109 at commit `bdf2363`): header row button, Prepared setup / Robot / Mission and advanced grids, M01 calibration row      | Phase B EXP-1..11, finalized — icons verified, no open design questions                                                                   |
| `src/components/BlocklyComponent.svelte`       | Blockly pane header bar (Blockly view trigger, Hide/Show simulator)                                                                                                                              | Iconify BLH-1, BLH-3                                                                                                                      |
| `src/components/BlocklyComponent.svelte`       | Command disclosure button and overlay close button                                                                                                                                               | Iconify CMD-1, CMD-2; keep `aria-expanded`/`aria-controls` and focus return                                                               |
| `src/components/BlocklyComponent.svelte`       | Narrow run strip (`lg:hidden` strip)                                                                                                                                                             | Iconify NRS-1 with dynamic name binding                                                                                                   |
| `src/components/PracticeReadinessShell.svelte` | Save/Close/Run controls row                                                                                                                                                                      | Iconify PWS-1..5; routes and chips unchanged                                                                                              |
| `src/components/AudioDialog.svelte`            | The three bare icon buttons                                                                                                                                                                      | Add missing `aria-label` + `title` (`Play sound`, `Remove sound`, `Add sound`)                                                            |
| `src/components/SpikeSimulatorWindow.svelte`   | Simulator top menu bar: mode group, run/stop, save, dirty status, `Simulator view` menu (routes removed), `Close simulator`; promote out of the practice-only section so it renders in ALL modes | Surface 8: MBR-1..3 + RUN-1; remove the two route menu items; bind labels per State Contract                                              |
| `src/components/PracticeReadinessShell.svelte` | Header navigation cluster, save button, run-control row, eyebrow label                                                                                                                           | Remove mode text buttons (replaced by MBR-1..3), PWS-1/2 (moved to top bar), PWS-3/4/5 (moved); keep chips, summary, guidance, mode notes |

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

### Phase B acceptance scenarios (Expert Setup, for `fll_qa`)

Recorded in the same `docs/qa/` review file, with browser/viewport details:

1.  **Reference robot vs Ports distinctness:** In the Expert Setup toolbar at desktop
    width, `Reference robot` (`MapPinAltOutline`) and `Ports` (`ShareNodesOutline`) are
    visually distinguishable from each other and from every other icon in the section
    (no two adjacent buttons share a similar silhouette at `size="xs"`); capture a
    side-by-side screenshot.
2.  **Hover/aria names:** Hovering and keyboard-focusing each EXP-1..11 button shows a
    native `title` tooltip and an accessibility-tree name equal to the verbatim label
    (e.g. `Save or export setup`, `Load missing parts`, `Ports`, `Clear calibration`);
    no abbreviated or renamed strings.
3.  **Layout unchanged:** The Expert Setup section keeps its three-column
    (`lg:grid-cols-3`) grid, section height, and wrap behavior at desktop and the agreed
    narrow viewport; iconification introduces no new wrap points or clipped controls
    (header row, grid rows, and calibration row).
4.  **Behavior regression:** Each button triggers its original action unchanged —
    `Ports` opens the port connector, `Reference robot` opens the virtual reference
    robot dialog, `Simulation settings` opens settings, `Choose LDraw folder` opens the
    folder picker, `Display options` still shows its existing "Display-only camera and
    grid options" tooltip via `#camera_config_button`, and the camera `MenuDropdown`
    works untouched.
5.  **State preservation:** With no calibration profile loaded, `Clear calibration` is
    dimmed with a real `disabled` attribute and becomes activatable after loading a
    profile; `Load robot` keeps its existing light/red/green color states with the
    constant name `Load robot`; `Load missing parts` keeps its `animate-bounce`
    attention class when the library is missing.

### Surface 8 acceptance scenarios (mode bar + run placement, for `fll_qa`)

All proposed until recorded with browser evidence in `docs/qa/ui-modes-06-review.md`.

1.  **Mode bar identical everywhere:** In Practice, Expert Setup, and Developer
    Diagnostics — at desktop AND the agreed narrow width — the simulator top menu bar
    shows the same three iconified mode controls (`HomeOutline`/`AdjustmentsVerticalOutline`/
    `BugOutline`) in the same order (Practice, Expert Setup, Developer Diagnostics) in the
    same group position. No mode changes the bar's structure or membership.
2.  **Tooltips and names:** Hovering and keyboard-focusing each mode control shows a native
    tooltip equal to the verbatim mode name (`Practice`, `Expert Setup`,
    `Developer Diagnostics`); the accessibility-tree name matches; Enter/Space switches
    modes exactly as the old text buttons did.
3.  **Active mode marked:** In each mode, exactly one mode control carries the filled/tinted
    active treatment and `aria-current="page"` — the mode you are in — and no other control
    in the bar does.
4.  **Run/Stop in the top bar everywhere:** With a prepared project, `Run program`
    (play glyph) is present in the simulator top bar in ALL three modes; during a run it
    becomes `Stop run` (red `StopOutline`) with name/tooltip/aria-label updated together;
    with incomplete setup its name equals the first corrective action string and clicking
    it opens that setup target (same `runOrCorrect` behavior as today).
5.  **No desktop duplicates in Practice:** At desktop width in Practice, exactly one
    visible run/stop control exists (the top bar). The narrow strip and the shell run
    button are gone, and the `Simulator view` menu contains only camera items
    (`Focus robot`, `Default view`) with no mode routes.
6.  **State preserved on switch:** Start a run (or make unsaved edits) in Practice, switch
    to Expert Setup and to Developer Diagnostics via the bar, and switch back: the run/
    score/program/season/dirty state is unchanged, no pane reinitializes, and the run
    (if any) is still controllable from the top bar.
7.  **Narrow width:** At the agreed narrow viewport/200% zoom, the mode group stays in the
    top bar with working tooltips; with the Program tab active and the simulator pane
    hidden, the narrow strip run control is the reachable Run/Stop and mirrors the bar
    control's state; `Stop run` remains reachable without opening any menu.
8.  **Keyboard order/focus:** Tab order in the bar is mode group → run/stop → save →
    remaining controls; each icon-only control shows a visible focus ring and the old
    buttons' keyboard behavior (menu triggers keep `aria-haspopup`/`aria-expanded`;
    Escape/focus-return unchanged).

## Assumptions and Risks

-   Assumption: the owner's "all the buttons" request tolerates the documented exceptions
    A1, A3, A4 (tabs, chips, modal confirmations); the lead confirms before
    implementation. A2 was superseded on 2026-09-20 for the three top-bar mode controls
    only (Surface 8); extending iconification beyond those still needs owner approval.
-   Assumption: native `title` tooltips satisfy the "alt text on hover" request without
    custom tooltip code.
-   Risk: icon-only mode routes (Surface 8) reduce mode discoverability for first-time
    participants more than icon-only actions do — losing the only in-bar text for
    wayfinding was exactly why A2 existed. Mitigations: verbatim tooltips/names, filled
    active state, retained in-content mode notes, and the text-beside-icons fallback.
    Needs participant observation; none has been done — no user research is claimed.
-   Risk: MBR-2 `AdjustmentsVerticalOutline` resembles EXP-9 `AdjustmentsHorizontalOutline`
    (Simulation settings). They never share a bar; QA scenario 8/Surface 8 scenario 1
    should still capture them side by side.
-   Risk: the narrow strip keeps a second run control (8b) by design; if the simulator pane
    ever becomes always-visible at narrow width, the strip duplicate must be removed to
    restore the single-control contract.
-   Risk: icon-only menu triggers (`Simulator view`, `Blockly view`, `Commands`) reduce
    discoverability for first-time participants; the chevron and hover text mitigate this.
    Needs participant observation, which has not been done — no user research is claimed.
-   Risk: weak glyph mappings (PRH-5 for `Choose challenge`/`Review setup`, PWS-5 for some
    corrective strings) remain placeholder choices from the installed set; the lead/design
    confirms or those buttons keep text. The Phase B weak glyphs (EXP-6, EXP-7) were
    resolved on 2026-09-19 (run `ui-icons-05`) — see Surface 6.
-   Risk (Phase B, EXP-5): `Load robot` keeps its existing light/red/green `robotButtonColour`
    state channel with a constant accessible name; this preserves current behavior but means
    robot-present state is still color-only for non-sighted users — a pre-existing gap, not
    introduced by iconification, out of scope for this pass.
-   Risk: icon sizing could change header wrap behavior at medium widths; acceptance
    scenario 1 and 4 cover this, but the fix (icon size token) is an implementation
    decision, not specified here.
