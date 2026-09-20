# Quiet Practice Two-Pane Layout Specification

Task: `ui-layout-03` / `quiet-two-pane-design`  
Owner: `fll_design`  
Status: proposed design and implementation handoff; no production source changed

Amended 2026-09-20, run `ui-modes-06`: the mode routes (`Practice`, `Expert Setup`,
`Developer Diagnostics`) become persistent iconified controls in the simulator top menu
bar, and the run/stop control moves to that bar in all modes, per an owner decision that
supersedes the menu-based routes below. See `docs/design/icon-button-spec.md` Surface 8.

## Decision

Practice is a quiet, stable work surface with **exactly two primary content panes**:

1. **Blockly** on the left, for creating and revising the program.
2. **Simulator** on the right, for viewing the board, robot, run state, and concise result.

The header is a low-noise toolbar, not a third work panel. The Blockly command/category
surface is a temporary overlay inside the Blockly pane, not a resizable third column.
Practice remains the default. `Expert Setup` and `Developer Diagnostics` are explicit,
on-demand routes; they are presentation modes, not authorization boundaries or different
simulation engines.

## Evidence Boundary

### Verified current behavior

-   `src/components/BlocklyComponent.svelte` already injects a Blockly workspace with the
    repository toolbox and renders a Blockly/simulator split. It has icon-first import,
    merge, save, split-ratio, and simulator controls.
-   `src/components/SpikeSimulatorWindow.svelte` owns the simulator surface, the current
    `practice | expert | diagnostics` mode state, a package-backed selected season/mission,
    project dirty status, and run/start-stop callbacks.
-   `src/components/PracticeReadinessShell.svelte` currently renders a large Practice
    header, workspace links, readiness chips, and a run/stop control above the simulator.
-   Current source and the September UI review show technical controls, including library,
    robot, ports, wheels, scene, settings, camera, and current-season calibration, competing
    with the Practice task. The UI review and `docs/qa/ui-implementation-01-acceptance-audit.md`
    identify narrow layout and lifecycle behavior as not accepted.
-   Chromium browser evidence verified first-missing setup guidance and in-app save status;
    it did **not** verify prepared-run, narrow viewport, Firefox, keyboard-only, or participant
    usability flows. See `docs/qa/design-impl-02-browser.md`.

### Owner feedback interpreted for this assignment

The registered `ui-layout-03` plan requests a quieter Practice mode: header menu options,
Blockly left/simulator right, and an auto-collapsed Blockly command panel that opens on
hover or click. This is direction for the proposed layout, not evidence that participants
prefer it.

### Proposed behavior

All wireframes, controls, state transitions, and acceptance scenarios below are proposed
until `fll_experience` implements them and `fll_qa` records browser evidence. This document
does not change scoring, physics, library availability, or a project schema.

## Participant Task and Layout

The layout supports the repeated participant task: identify the next setup need, add or
adjust blocks, run, see what happened, make one change, reset the run, and save. It keeps
the code and table visible together on desktop so teammates can discuss both without opening
technical setup.

### Desktop and wide classroom laptop

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ [⌂][⚙][✳] Practice · {season name, edition, revision}   [Simulator view ▾] [▶ Run] [Save]│
│ {Saved | Unsaved changes | Saving… | Save unavailable}                    [Reset run]    │
├────────────────────────────────────────────┬─────────────────────────────────────────────┤
│ BLOCKLY                                    │ SIMULATOR                                   │
│ [Commands ▸]  {program name / readiness}   │ {mission name} · {setup/result summary}     │
│ ┌────────────────────────────────────────┐ │ ┌─────────────────────────────────────────┐ │
│ │ category/command overlay, when open    │ │ │ field, robot, and participant-safe view │ │
│ │ [Motion] [Events] [Sound] …            │ │ │                                         │ │
│ └────────────────────────────────────────┘ │ └─────────────────────────────────────────┘ │
│                                              │ [Reset run]                                │
│ Blockly workspace                            │ {short state / next action}                │
└────────────────────────────────────────────┴─────────────────────────────────────────────┘
```

Annotations:

-   `[⌂][⚙][✳]` are the persistent iconified mode controls — `Practice`, `Expert Setup`,
    `Developer Diagnostics`, in that order, identical in every mode (`HomeOutline`,
    `AdjustmentsVerticalOutline`, `BugOutline`; see `icon-button-spec.md` Surface 8a).
    They are icon-only per the 2026-09-20 owner decision; active mode gets a filled
    treatment plus `aria-current="page"`.
-   `[▶ Run]` is the single run/stop control in the simulator top menu bar in ALL modes
    (Surface 8b); the simulator pane's inner run strip below is no longer a second primary
    control.
-   Toolbar controls in these wireframes render as icon-only buttons whose accessible name
    and hover/`title` text equal the label shown; see `docs/design/icon-button-spec.md`.
    The `Program`/`Simulator` tabs keep visible text by exception.
-   The header is one compact row that may wrap only its metadata/status on medium widths;
    it must not push a third persistent panel above either work pane.
-   On desktop, Blockly starts at 50% of usable width and the simulator receives the other
    50%. A divider may offer fixed `Code wider` and `Simulator wider` choices, but drag is
    optional. Choices must preserve both panes at a usable minimum width and must call the
    existing Blockly resize path after the transition.
-   `Commands` is a compact, labelled disclosure at the left edge of the Blockly pane. Its
    open surface overlays the Blockly canvas inside that pane. Opening it must not alter the
    simulator width, move blocks, or change the workspace scroll/zoom state.
-   The simulator pane owns the visible run lifecycle control and a one- or two-line summary.
    It is not a general logs pane. Raw logs and physics overlays remain in Developer
    Diagnostics.
-   A readiness problem appears as concise text near the relevant action, for example
    `Drive wheels need setup. Fix setup in Expert Setup.` It does not create a persistent
    coach/sidebar pane.

### Header toolbar

Toolbar buttons are icon-first: the visible text label is replaced by an icon, and the
current text label is exposed verbatim as both `aria-label` and hover/`title` text. The
`Program`/`Simulator` tabs, readiness chips, and modal confirmation buttons keep visible
text. (Amended 2026-09-20: the three mode routes are iconified in the top bar by owner
decision — see the Mode bar row below; their in-content mode notes keep text.)
Menu buttons use `aria-haspopup="menu"`, expose expanded state, support Escape, and return
focus to their trigger after dismissal. The complete icon inventory, state contract, and
non-negotiables are defined in `docs/design/icon-button-spec.md`; this document's
wireframe labels now name those accessible names rather than required visible text.

| Control            | Proposed contents and behavior                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mode bar           | Amended 2026-09-20 (`ui-modes-06`): `Practice`, `Expert Setup`, `Developer Diagnostics` are ALWAYS visible as iconified controls at the leading edge of the simulator top menu bar, in every mode and at every width, with verbatim `aria-label`/`title`, filled active treatment, and `aria-current="page"`. This replaces the earlier menu-based routes and the shell's text mode buttons; see `icon-button-spec.md` Surface 8.     |
| Season summary     | `{season display name} · {edition} · rev {revision}`. It opens season selection only when that contract is available. It never displays a fixed mission count, BIOGLOW name, filename, or score in generic shell text.                                                                                                                                                                                                                |
| `Blockly view ▾`   | `Show commands`, `Hide commands` when pinned open, `Open program`, `Import program`, `Save program`, and `Print program` only where existing functionality supports them. These are program actions, not simulator actions.                                                                                                                                                                                                           |
| `Simulator view ▾` | Participant-safe camera choices and `Focus robot` where implemented. Amended 2026-09-20: the `Expert Setup` and `Developer Diagnostics` menu items are REMOVED (the mode bar replaces them); the menu keeps camera-only items. Collider/contact overlays, timing, and raw telemetry do not appear here.                                                                                                                               |
| Run control        | `Run program` when ready; the first corrective action when not ready; `Stop run` while running; `Resume` while truly paused. Amended 2026-09-20: it lives in the simulator top menu bar in ALL modes, right of the mode group, before `Save project`; it is visually persistent and never hidden in an overflow menu. The only sanctioned duplicate is the narrow run strip when the simulator pane is hidden behind the Program tab. |
| Reset and save     | `Reset run` is visible when an existing run can be reset; `Save project` shows its current save status. `Restore saved setup` belongs in an explicit confirmation path, not this compact toolbar.                                                                                                                                                                                                                                     |

The header exposes no technical setup toolbar. `Load missing parts`, port and wheel editing,
field/model transforms, attachment mechanics, calibration profiles, and simulation settings
remain reachable from Expert Setup with their scope and reset requirement stated there.

## Blockly Command/Category Disclosure

### Default and open states

| State                         | Proposed behavior                                                                                                                                                                                                                               | Concise copy                 |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Collapsed, default            | Show the `Commands` button/rail label. Blockly canvas uses the full left-pane workspace area.                                                                                                                                                   | `Commands`                   |
| Hover preview, mouse/trackpad | Pointer entering the rail opens the category surface after a short intentional delay (about 150–250 ms). Pointer leaving both rail and overlay closes it after a short delay unless it is pinned or has focus.                                  | `Choose a block category`    |
| Click or keyboard open        | Click, Enter, or Space opens and pins the surface until the participant chooses `Close commands`, presses Escape, clicks the labelled close control, or moves focus elsewhere after no menu item is active.                                     | `Commands open`              |
| Category selected             | Selecting a category replaces the category list with its command list inside the same overlay. Selecting a command inserts/starts Blockly’s normal placement flow; it must not unexpectedly close a keyboard user’s required placement control. | `{category}: choose a block` |
| Workspace focus               | A click in the workspace, Escape from a non-editing command list, or the close button returns the overlay to collapsed state and returns focus predictably.                                                                                     | `Commands closed`            |

Hover is an optional convenience only. Keyboard, touch, switch, and reduced-motion users
must use the same labelled click/tap control. Do not depend on hover to expose commands.
Use a visible focus treatment and an accessible expanded/collapsed announcement; color alone
cannot indicate selected category or readiness.

### Stability constraints

-   The disclosure is positioned within the Blockly pane and layered over, rather than beside,
    the workspace. It must not resize either primary pane or trigger simulator remounting.
-   Preserve Blockly workspace serialization, selected block, scroll position, and zoom while
    the disclosure opens/closes. Do not reload the workspace to change command visibility.
-   Pointer movement from rail to overlay must not cause flicker; the interactive hit area is
    continuous. On touch, opening is only explicit tap/click.
-   Provide an explicit `Hide commands` option for a participant who wants a completely clear
    code surface. Persisting this display preference is optional; if persisted, label it
    `This browser` and never include it in program/scoring inputs.
-   This is a presentation change only. Selecting a category or showing commands cannot change
    simulation state, run evidence, score, or saved project data.

## Responsive Behavior

### Desktop: at least 1024 CSS px of app width

Render both primary panes side by side. The left/right order is fixed: Blockly left,
simulator right. Keep at least one accessible-named (icon-first) run control and save
status visible in the header or simulator-pane run strip. Do not introduce horizontal
page scrolling.

### Narrow width, small laptop, or 200% zoom

The content still has exactly two primary panes, but only one is active at a time to preserve
usable Blockly and board areas. Show a compact two-tab switcher immediately below the header:

```text
┌──────────────────────────────────────────────┐
│ [⌂][⚙][✳] Practice · {season summary} [Unsaved]│
│ [Blockly view ▾] [Simulator view ▾] [Save]    │
│ [Program] [Simulator]                         │
├──────────────────────────────────────────────┤
│ PROGRAM (active)                              │
│ [Commands ▸]                                  │
│ Blockly workspace                              │
├──────────────────────────────────────────────┤
│ [Run program / Fix setup] [Reset run]         │
└──────────────────────────────────────────────┘
```

-   `Program` and `Simulator` are native tabs or labelled buttons with selected state; they
    replace the active work area without reinitializing Blockly or the simulator.
-   Amended 2026-09-20: the run control's primary home is the simulator top menu bar, which
    stays visible in every mode and tab. The narrow run strip below the Program pane is
    KEPT as the sanctioned duplicate because the simulator pane itself is hidden while the
    Program tab is active; it mirrors the bar control's label/icon/state exactly. During a
    run, `Stop run` replaces it and remains reachable without opening an overflow menu.
-   The command overlay becomes a full-width sheet _inside the active Program pane_ on narrow
    screens. It does not cover the entire app or hide the header, Stop, save status, or close
    control.
-   Amended 2026-09-20: `Expert Setup` and `Developer Diagnostics` live in the persistent
    iconified mode group in the top bar at every width — never in a per-mode menu
    arrangement and never as a third tab; they are not required for a normal program
    edit/run/retry.
-   At no width may the page rely on drag resizing, clipped horizontal controls, or an
    unlabeled canvas gesture. Browser zoom is treated as a narrow layout trigger.

## Practice States and Microcopy

The following transitions describe the intended presentation. Existing lifecycle behavior
does not yet establish all of them; notably, do not expose `Pause` until runtime confirms a
real fixed-step freeze.

| State / trigger                      | Header and pane behavior                                                                                              | Microcopy and next action                                                                                                        |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Loading project or season package    | Keep both pane headings; show a non-blocking progress status. Disable only actions requiring unavailable data.        | `Loading your practice setup…`                                                                                                   |
| No season / missing package          | Simulator pane names the missing package; Blockly remains inspectable.                                                | `Choose a supported challenge to set up this practice.` → `Choose challenge`                                                     |
| Incompatible project package         | Preserve the original project and show its requested package/version.                                                 | `This project needs {package} rev {revision}, which is not available here.` → `Keep original project` / `Choose another package` |
| Unsaved changes then season switch   | Open an explicit decision dialog before changing package.                                                             | `You have unsaved changes. Save, keep practicing, or discard changes before switching.`                                          |
| Missing library or field/robot setup | Keep simulator visible and name the missing thing. Route intentionally to Expert Setup.                               | `Robot parts are missing. Load missing parts in Expert Setup.` → `Open Expert Setup`                                             |
| Empty or non-runnable program        | Program pane is active on deliberate `Open program`; simulator remains available by tab/desktop pane.                 | `Add a starting block before running.` → `Show commands`                                                                         |
| Unsupported mission/scoring          | Permit observation practice only when the simulator can run safely; do not invent a score.                            | `You can watch this run, but scoring is unavailable for this mission.` → `Why?`                                                  |
| Ready                                | Header and simulator show the same semantic primary action, not two competing actions.                                | `Your table, robot, and program are ready.` → `Run program`                                                                      |
| Running                              | Freeze setup-changing entries or make them explicitly route after stopping. Keep display-only view choices available. | `Running {mission name}.` → `Stop run`                                                                                           |
| Paused, only if runtime supports it  | Display frozen simulation time; no settings change silently resumes.                                                  | `Paused at {simulation time}.` → `Resume` / `Stop run` / `Reset run`                                                             |
| Completed                            | Keep table and Blockly input visible; show a short result, not raw telemetry.                                         | `Run finished at {simulation time}.` → `Run again` / `Reset run`                                                                 |
| Participant stopped                  | Preserve current scene for inspection until reset.                                                                    | `Run stopped at {simulation time}. Your setup and program are unchanged.` → `Reset run`                                          |
| Failed to start                      | Name the verified failed prerequisite or runtime error; do not guess a physics cause.                                 | `The simulation could not start: {verified reason}.` → `{specific repair action}`                                                |
| Observed contact/stalled motion      | Practice names evidence and offers diagnostics without asserting obstruction.                                         | `The simulation observed contact with {object}. This may not be why movement stopped.` → `Inspect in Developer Diagnostics`      |
| Reset Run                            | Recreate run state from current prepared inputs. It never restores saved data.                                        | `Run reset. Your setup and program are unchanged.`                                                                               |
| Restore saved setup                  | Require confirmation; revert editable inputs to last saved project. It is distinct from Reset Run.                    | `Restore the last saved setup? Unsaved setup and program changes will be replaced.`                                              |

`Stop run` ends the active run and retains its inspectable state. `Pause` freezes an active
run only if the runtime guarantees fixed-step time stops. `Reset run` recreates a run from
the current configured setup and program. `Restore saved setup` replaces editable project
inputs with the saved version after confirmation. These controls must never share a label or
silently perform one another’s action.

## Season-Neutral and Data Constraints

-   Generic navigation uses package-provided season display name, edition, revision, field
    assets/dimensions, launch zones, mission names, capabilities, and rule/source status. It
    must not hardcode BIOGLOW, a mission count, mission ID, filename, calibration control, or
    scoring copy.
-   Package switching checks unsaved state and incompatibility before modifying active content.
    Saved projects stay pinned to their original season/package version; migration or reuse
    preserves the original file and explains which references cannot be resolved.
-   The layout can state `scoring unavailable`, `mechanics approximate`, and `calibration not
measured` from package capabilities. It must not convert a visual asset or observed contact
    into official scoring, a verified mechanism, or a real-world accuracy claim.
-   Expert Setup owns board dimensions and units, launch zones, robot ports/wheels/attachments,
    model transforms/colliders/joints, and nonstandard practice settings. Each changing control
    states scope, units, validation, persistence, and whether it applies after `Reset run` or
    restart. Practice may summarize these inputs but does not expose their editing controls.
-   Developer Diagnostics owns read-only evidence inspection by default, runtime collider and
    contact overlays, raw logs, filters, and export. Overlay geometry uses the physics
    coordinate frame and accessible text/shape legends. Any simulation-changing diagnostic
    control is deliberate, labelled, reproducible, and applies at a stated reset boundary.

## Implementation Handoff

This is a bounded proposal for `fll_experience`; it does not authorize an application-wide
rewrite. `fll_lead` must confirm state contracts and one writer for shared components before
implementation.

| Owner                         | Allowed path / responsibility                | Bounded handoff                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `fll_experience`              | `src/components/BlocklyComponent.svelte`     | Make the existing split stable and default to two simultaneous desktop panes. Replace icon-first top controls with the proposed low-noise header integration boundary; implement a keyboard-operable command disclosure without re-injecting Blockly or losing workspace state.                                                                                                                  |
| `fll_experience`              | `src/components/SpikeSimulatorWindow.svelte` | Implement the persistent mode bar (Surface 8a), the all-modes top-bar run/stop control (Surface 8b), the narrow pane switcher, and the participant run strip; remove the `Simulator view` mode-route items and the shell's duplicate mode/save/run controls (Surface 8c). Preserve current season, dirty, readiness, and run callbacks; do not relocate technical functionality without a route. |
| `fll_lead`                    | shared state contracts                       | Confirm the available run lifecycle and whether pause/reset/save/package state can support the proposed labels. No UI may claim a state contract the runtime does not provide.                                                                                                                                                                                                                   |
| `fll_rules` / `fll_assets`    | wording and package/setup review             | Verify capability/rule wording and package, project-version, field, robot, and launch-zone terms before they become participant copy.                                                                                                                                                                                                                                                            |
| `fll_physics` / `fll_runtime` | diagnostic and lifecycle review              | Verify that `Pause`, reset boundaries, contact wording, runtime collider overlays, and fixed-step timestamps are semantically true.                                                                                                                                                                                                                                                              |
| `fll_qa`                      | `docs/qa/ui-layout-03-review.md`             | Independently verify the acceptance scenarios below in Chromium and Firefox on agreed classroom devices; record unavailable measurements separately.                                                                                                                                                                                                                                             |

No new CSS token or package/API change is specified here. Reuse the existing Svelte,
TypeScript, Blockly, Flowbite, and Tailwind patterns where they can meet these constraints.

## Observable Acceptance Scenarios

1. **Quiet desktop start:** Open Practice at desktop width. Exactly two primary content panes
   are visible, Blockly is left, simulator is right, and neither a readiness/coach panel nor
   a command category column creates a third primary pane.
2. **Stable commands:** With blocks in the workspace and a selected simulator view, hover or
   click `Commands`. The command surface opens inside Blockly, does not change simulator
   width, Blockly scroll/zoom, selected block, or run state, and can be closed predictably.
3. **Keyboard alternative:** Tab to `Commands`, use Enter/Space to open, move through the
   category/command surface, Escape to close, and verify focus returns to the trigger. The
   same task works without hover or drag.
4. **Run visibility:** With a prepared runnable project, `Run program` is reachable from
   desktop and narrow Program views. During a run, `Stop run` is visible and reachable; it
   is never only in a menu. Verify semantics against runtime before accepting Pause/Reset.
5. **Narrow/zoom:** At an agreed narrow viewport and 200% browser zoom, Program and Simulator
   switch without reinitializing either surface, primary action/save status remain reachable,
   and there is no horizontal page scrolling or drag-only control.
6. **Corrective setup:** With missing robot parts, wheel setup, field, or a usable program,
   Practice names the first known need and opens the relevant Expert Setup route. It does not
   expose raw library paths, physics settings, or technical calibration in the quiet header.
7. **Technical routes:** Open Expert Setup and Developer Diagnostics from the persistent
   iconified mode bar (amended 2026-09-20; previously a header menu), verify the active
   control follows the mode, return to Practice, and verify no mode switch alters the
   current run, score, project inputs, or displayed capability state.
8. **Season/project safety:** Attempt to switch packages with unsaved work and open a project
   requiring a missing package. The original project remains preserved, decision copy is
   explicit, and generic UI displays package data rather than a fixed season/missions label.
9. **Accessible diagnostics boundary:** From an observed-contact result, Practice states only
   the contact evidence and opens Developer Diagnostics deliberately. QA verifies the
   diagnostic selection, marker, collider overlay, legend, and raw log behavior against
   physics/runtime contracts; contact alone is never accepted as proof of obstruction.
10. **Browser evidence:** Record the actual Chromium and Firefox versions/devices, viewport
    or zoom setup, keyboard results, and any unavailable screen-reader/classroom usability
    measurement. Passing source review or automated checks alone does not accept these flows.

## Assumptions and Risks

-   Assumption: the existing Blockly instance can expose or receive a non-destructive command
    disclosure without requiring a custom workspace reinitialization. This needs implementation
    proof.
-   Assumption: the current split layout can become stable desktop left/right panes while still
    supporting a narrow active-pane switch. Browser behavior remains unverified.
-   Risk: current readiness checks and lifecycle callbacks are incomplete for participant-safe
    labels. Until lead/runtime review, use `needs setup`, `unavailable`, or a specific verified
    reason rather than asserting ready, paused, reset, or scored behavior.
-   Risk: auto-open hover can be distracting. The short delay, overlay containment, keyboard
    pinning, and no-layout-shift criteria are design hypotheses that need participant/coach
    observation; no user research is claimed.
