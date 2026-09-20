# Simplified Practice UI Specification

Task: `design-02` / `simplified-ui-design`  
Owner: `fll_design`  
Status: proposed design; no production implementation in this task  
Audience: FLL participants first; coaches second; expert users and developers on demand

## Purpose

Make the simulator feel like arriving at an FLL practice table: see the current
field and robot, prepare the one thing that is missing, run the program, see what
happened, adjust, and try again. The default experience must not ask a
participant to understand LDraw libraries, physics colliders, port geometry,
calibration files, or package evidence before their first run.

This design keeps those capabilities available in two opt-in workspaces:

-   **Expert Setup** for changing the board, robot, attachments, ports, wheels,
    and other saved practice inputs.
-   **Developer Diagnostics** for evidence, runtime overlays, raw logs, imports,
    and reproducible problem reports.

Practice, Expert Setup, and Developer Diagnostics are presentation modes, not
accounts, permissions, or separate simulations. Changing modes must not change
physics, scoring, or project data.

## Design Principles

1. **Start at the table.** The field view, robot, and primary run controls are
   the visual center. A participant should not begin by decoding a toolbar.
2. **One next step.** Show the first setup action that prevents a run, not every
   possible configuration action at once.
3. **Use prepared defaults.** If a current supported season and prepared setup
   exist, select them without an extra confirmation. Always identify the
   selected season, edition, and revision and let the user change them.
4. **Progressive disclosure, never a dead end.** Technical controls are hidden
   from the default path but have named, visible destinations when they are
   needed.
5. **Results before evidence.** Explain what was observed in plain language;
   raw event data remains available without claiming a contact proves a cause.
6. **A real practice-table control model.** `Run`, `Stop`, and `Reset run` have
   stable locations and direct, physical meanings. Saving is distinct from
   resetting a run.
7. **Season-neutral shell.** Generic labels and flows draw display names,
   mission lists, capability notices, and presets from a versioned season
   package; they do not assume BIOGLOW, an M-number, a field size, or a mission
   count.

## Existing Evidence

The following are current code and verified-flow observations. They are not
claims that this proposed design exists.

| Existing evidence                                                                                                                                                                                                        | Design implication                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SpikeSimulatorWindow.svelte` defaults to the current season package, tracks dirty project state, restores projects, and gates runs on season, field, robot, drive wheels, and Blockly program blocks.                   | Retain the existing readiness inputs and default season behavior, but present them as a short guided sequence rather than a broad setup page.                |
| `PracticeReadinessShell.svelte` supplies labeled readiness buttons, an actionable first incomplete item, and a primary `Run program` / `Stop run` control.                                                               | Reuse its readiness contract, but reduce duplicate controls and make the first failed step the main action.                                                  |
| `LoadScene.svelte` loads a combined `.lsp-project`, legacy scene archives, mats, objects, libraries, and provides keyboard movement in the scene editor.                                                                 | Treat project restore as the participant-first load path; keep file types, mat dimensions, object physics, and global keyboard movement inside Expert Setup. |
| `RunLogConsole.svelte` offers newest-first diagnostics, severity/text filters, a plain-language observation/next action, raw evidence, clear, and export.                                                                | Keep a concise Practice result and a deliberate `Open diagnostics` route; do not make a first-time participant read raw telemetry.                           |
| Chromium flow evidence recorded in `docs/qa/ui-platform-15-chromium.md` and `docs/qa/ui-platform-16-chromium.md` covers project restore, readiness, start/stop, reset, and export triggering. Firefox is user-confirmed. | Preserve those flows and repeat browser testing after each implementation slice.                                                                             |
| `docs/design/ui-audience-review-2026-09-14.md` identifies toolbar overload, technical settings mixed with practice, raw diagnostic density, and unclear save/reset semantics.                                            | The simplification prioritizes hierarchy and routing over a wholesale rewrite of simulator internals.                                                        |

## Unverified Assumptions and Limits

These are design hypotheses, not participant research findings or promises of
physical fidelity.

-   A prepared current-season field and reference robot are available often enough
    to be useful as a default. If not, the empty-state path must be equally clear.
-   Participants will benefit from a single selected mission during practice; the
    package may still contain any number of missions.
-   A familiar top-level `Run` / `Stop` / `Reset run` group will be easier to learn
    than the current icon-heavy toolbar. This requires participant/coach testing.
-   Existing browser evidence does not establish narrow-screen, keyboard-only,
    screen-reader, or classroom-device success.
-   Existing capability and calibration labels do not prove official scoring,
    functioning mechanics, or real-world accuracy.
-   A future structured diagnostic event contract is needed for exact object focus,
    contact-pair following, and snapshots. This document does not invent that API.

## Proposed Information Architecture

### Global shell

Use a compact app bar in every mode:

```text
[Season: {package display name} ▾]  [Practice] [Expert Setup] [Developer Diagnostics]
{project save state}                                               [Save project ▾]
```

Annotations:

-   The season label includes edition and package revision in its accessible name,
    for example: `BIOGLOW Founders Edition Challenge 2026–27, revision 2026.09`.
-   `Practice` is selected by default. The two technical links are ordinary buttons
    or tabs, never hidden icon-only controls.
-   The save-state control is visible in every mode: `Saved`, `Unsaved changes`,
    `Saving…`, or `Save unavailable` with a reason. It does not imply a simulation
    state.
-   The season selector is the only generic navigation that changes season. It must
    offer a current/default package first, followed by supported packages supplied
    by the app.

### Practice home

The desktop layout uses three stable regions: a compact run strip, the practice
table, and a contextual coach panel. Blockly remains available as an adjacent
work area, not a prerequisite to understanding the table.

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ Season: {current package} ▾    Practice   Expert Setup   Developer Diagnostics   Saved   │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ {Mission name} ▾   {setup summary}                              [Save project]          │
│                                                                                          │
│  1 Field ✓  ──  2 Robot ✓  ──  3 Program ○  ──  4 Ready                               │
│  Next: Add blocks to make the robot move.                           [Open program]       │
├───────────────────────────────────────────────┬──────────────────────────────────────────┤
│ PRACTICE TABLE                                │ WHAT TO DO NEXT                          │
│                                               │                                          │
│  [field / mission canvas]                     │ Program needs a starting block.          │
│                                               │ [Open program]                           │
│  Robot: {preset name}                         │                                          │
│  Launch: {launch-zone label}                  │ Mission: {mission display name}          │
│  View: [Top] [Follow robot]                   │ Scoring: {available / unavailable}       │
│                                               │ Mechanics: {capability notice}           │
│                                               │                                          │
│  [Run program] [Reset run]                    │ Learn more about this mission ▸          │
├───────────────────────────────────────────────┴──────────────────────────────────────────┤
│ PROGRAM                                                                                   │
│ [Blockly work area; collapse/show with “Open program” and “Hide program”]                │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

Annotations:

-   The step row is a compact status summary, not five equally prominent setup
    buttons. Selecting a failed step opens its focused corrective surface.
-   `Run program` is the single primary run control. The secondary toolbar must not
    duplicate it. When ready, it is enabled; otherwise it becomes `Fix setup` and
    identifies the first missing step.
-   `Reset run` is always visible but disabled before a run state exists, with
    explanatory text. It does not replace unsaved setup or program data.
-   The table canvas remains visible during setup, running, and results. The coach
    panel changes content by state; it is not a raw log.
-   `View` contains participant-safe display choices only. Collider, joint, and
    contact overlays belong in Developer Diagnostics.

### Narrow-screen practice home

At narrow widths or 200% zoom, show one work area at a time. Do not create a
horizontally scrolling page or rely on drag-to-resize panes.

```text
┌──────────────────────────────────────┐
│ Practice                    [Saved]  │
│ {current season} ▾                   │
│ {mission name} ▾                     │
├──────────────────────────────────────┤
│ Field ✓  Robot ✓  Program ○          │
│ Add blocks to make the robot move.   │
│ [Open program]                       │
├──────────────────────────────────────┤
│ [Table] [Program] [Next step]        │
├──────────────────────────────────────┤
│                                      │
│       Active panel content            │
│                                      │
├──────────────────────────────────────┤
│ [Run program / Fix setup] [Reset]    │
│ [Save]                   [More ▾]    │
└──────────────────────────────────────┘
```

Annotations:

-   `Table`, `Program`, and `Next step` are native buttons/tabs with selected text,
    not a canvas gesture. They keep the same state while switching panels.
-   Persistent bottom controls place `Stop run` first and use a high-contrast
    destructive/urgent treatment while a run is active.
-   `More` contains camera display choices and the two technical mode links. It
    cannot hide `Run`, `Stop`, `Reset run`, or `Save project`.
-   The active panel has a heading, allowing screen-reader and keyboard users to
    know which work area is open.

## Guided Practice States and Transitions

The participant flow is driven by state, not an assumed sequence of file dialogs.
The first unmet prerequisite is the active step. A capability notice can inform a
participant without blocking a non-scored observation run.

```text
Open project/app
     │
     ├─ prepared package/setup available ───────────────► Ready or first missing step
     │
     └─ no prepared setup ─► Choose season ─► Choose field ─► Choose robot ─► Program
                                                                         │
                                              ┌──────────────────────────┘
                                              ▼
                                          Ready to run
                                              │
                     Run program ────────────▼──────────── Stop / program finish
                                       Running                     │
                                          │                         ▼
                                 Pause / Resume               Result summary
                                          │                         │
                                          └── Stop ─────────► Reset run / Run again / Save
```

### State table

| State                     | Primary surface               | Primary action                                                       | Secondary action                                | Important rule                                                                      |
| ------------------------- | ----------------------------- | -------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| Prepared/default          | Table and selected mission    | `Run program` if ready                                               | `Change setup`                                  | Do not show setup mechanics unless requested.                                       |
| First missing setup item  | Table plus one next-step card | `Choose field`, `Choose robot`, `Fix drive setup`, or `Open program` | `Show all setup`                                | Focus corrective control; keep all status items discoverable.                       |
| Ready                     | Table and compact checklist   | `Run program`                                                        | `Review setup`                                  | Unverified scoring/calibration is a notice, not a run blocker.                      |
| Running                   | Table and run strip           | `Stop run`                                                           | `Pause` if implemented                          | Keep elapsed simulation time and selected mission visible.                          |
| Paused                    | Frozen table and run strip    | `Resume`                                                             | `Stop run`, `Reset run`                         | Pause freezes simulation time; no setting edit silently resumes it.                 |
| Completed/stopped         | Result card on table          | `Run again`                                                          | `Reset run`, `Save project`, `Open diagnostics` | Distinguish completion, a participant stop, waiting, motors off, and start failure. |
| Setup changed after a run | Table and save state          | `Apply changes and reset run`                                        | `Keep inspecting`                               | Simulation-changing setup changes apply at a stated reset boundary.                 |

### Run control meanings

| Control               | Meaning                                                                                    | Copy after activation                                          |
| --------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| `Run program`         | Starts a new simulated run from the current prepared setup.                                | `Running {mission display name}.`                              |
| `Pause`               | Holds the simulation at its current time, if supported by the runtime.                     | `Paused at {simulation time}.`                                 |
| `Resume`              | Continues the paused run.                                                                  | `Running.`                                                     |
| `Stop run`            | Ends this run and leaves its table state available for inspection.                         | `Run stopped at {simulation time}.`                            |
| `Reset run`           | Recreates the simulation from the current configured setup, program, and selected mission. | `Run reset. Your setup and program are unchanged.`             |
| `Restore saved setup` | Reverts editable project inputs to the last saved project version.                         | Requires an explicit confirmation; never conflates with reset. |

`Pause` is proposed unless the runtime exposes a true fixed-step pause. Until
then, omit it rather than offer a misleading control.

## Microcopy

Use short, direct language. “You” is appropriate; jargon is explained only when
the user chooses the technical surface.

### Default and readiness copy

| Situation               | Participant-facing copy                                               | Action                    |
| ----------------------- | --------------------------------------------------------------------- | ------------------------- |
| Default season selected | `{season display name} is ready for practice.`                        | `Change season`           |
| No season package       | `Choose a challenge to start a new practice setup.`                   | `Choose challenge`        |
| Field missing           | `Choose a field before placing your robot.`                           | `Choose field`            |
| Robot missing           | `Choose a robot to place on the table.`                               | `Choose robot`            |
| Drive incomplete        | `Connect two drive wheels before running.`                            | `Fix drive setup`         |
| Empty program           | `Add blocks to make the robot move.`                                  | `Open program`            |
| Ready                   | `Your table, robot, and program are ready.`                           | `Run program`             |
| Scoring unavailable     | `You can watch this run, but this mission cannot be scored here yet.` | `Why?`                    |
| Approximate mechanics   | `This mission uses an approximate simulation model.`                  | `View mission details`    |
| Calibration unavailable | `Motion is a simulation estimate, not a measured field result.`       | `Learn about calibration` |

### Result copy

| Observed state             | Summary                                                                     | Next action           |
| -------------------------- | --------------------------------------------------------------------------- | --------------------- |
| Normal end                 | `Run finished at {time}.`                                                   | `Run again`           |
| Participant stop           | `Run stopped at {time}.`                                                    | `Reset run`           |
| Program waiting            | `The program is waiting for its next step.`                                 | `Open program`        |
| Motors off                 | `The drive motors are off.`                                                 | `Open program`        |
| Contact and stopped motion | `The robot stopped near {object display name} at {time}.`                   | `Inspect run details` |
| Startup issue              | `The simulation could not start.` followed by a specific recoverable reason | `Fix setup`           |

For a contact, use `The simulation observed contact with {object}. This may not
be the reason the robot stopped.` Do not use “snag,” “blocked by,” or “collision
caused” until an evidence-backed diagnostic contract supports that conclusion.

### Technical mode entry copy

-   `Expert Setup — change the field, robot, wheels, attachments, and saved setup.`
-   `Developer Diagnostics — inspect run evidence, overlays, missing parts, and exports.`
-   Return action: `Back to Practice`. If a technical edit requires a reset, append:
    `Changes will apply after Reset run.`

## Progressive Disclosure

### Practice

Show by default:

-   Selected season, edition/revision in a compact summary, mission selector, and
    mission capability notice.
-   Field/table, robot placement, safe camera choices, program access, single run
    control group, result card, and project save state.
-   Short errors that name the next action.

Keep hidden until requested:

-   LDraw folder and missing-part import workflows.
-   Port assignment, wheel geometry/gearing, numeric launch pose, mat dimensions,
    object transforms, joints, colliders, timing multipliers, camera grid scales,
    and M01-specific calibration file controls.
-   Raw logs, performance data, coordinate frames, physics overlays, and model
    provenance detail.

### Expert Setup

The workspace is a guided configuration form, not an undifferentiated toolbar.
It has these groups in order:

1. **Prepared setup** — load a saved project; select a field or supported preset.
2. **Robot** — choose prepared robot; import custom robot; inspect ports and
   drive-wheel configuration.
3. **Table and launch** — board/map, launch zone, robot placement, attachments.
4. **Mission setup** — select scenario, package facts, calibration and custom
   practice configuration.
5. **Advanced** — object selection, transforms, movable/fixed state, model
   grouping, and imports.

Each group offers `Restore defaults` scoped to that group. It says what it
changes before applying it. Numeric entry displays units and validation adjacent
to the control; no participant must drag an object to set a position.

### Developer Diagnostics

Keep diagnostics inspect-first:

1. **Run summary** — selected run, first warning/error, simulation time, and
   plain-language observation.
2. **Inspect objects** — selected robot/model body, mesh/collider overlay,
   contact markers, and legend.
3. **Evidence** — newest-first structured events, filters, freeze reading view,
   export, project/season/version context.
4. **Environment** — missing parts, package errors, coordinate/unit status,
   runtime/render timing information.

The proposed body selection, contact-pair follow, and snapshot controls require
the structured diagnostics contract in `docs/qa/ui-platform-16-diagnostics.md`.
They must not appear as functional controls before that contract is implemented.

## Settings Scope and Persistence

The UI must label every setting by scope and when it takes effect. Display choices
never change physics or scoring.

| Setting group                 | Examples                                                                 | Scope                                            | Default                                                            | Persists in project      | Changes during a run       | Reset behavior                                                    |
| ----------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------ | ------------------------ | -------------------------- | ----------------------------------------------------------------- |
| Display                       | Camera angle, follow robot, grid, panel sizes, reduced-motion preference | Local/session preference unless explicitly saved | Adaptive/top participant-safe view; overlays off                   | No by default            | Yes; display only          | Keep on Reset run                                                 |
| Practice selection            | Season package reference, selected mission, prepared preset              | Project                                          | Current supported package and package-defined first mission/preset | Yes, pin ID and revision | No                         | Keep on Reset run                                                 |
| Expert table setup            | Map, field objects, launch zone, robot pose, ports, wheels, attachments  | Project                                          | Package/preset defaults                                            | Yes                      | No; queue as pending setup | Apply at Reset run or new run                                     |
| Custom practice configuration | Calibration profile, rule overrides, custom model mechanics              | Project, clearly marked nonstandard              | Off/unset                                                          | Yes with provenance      | No                         | Apply at Reset run; retain prior run inputs in result metadata    |
| Developer inspection          | Filters, selected body, raw evidence expansion, overlay visibility       | Local/session                                    | No selection; overlays off                                         | No                       | Yes; inspection only       | Keep filters, clear run-specific selected body if unavailable     |
| Developer simulation controls | Timing/step delay, encoder behavior, collision settings when exposed     | Project only if intentionally supported          | Existing safe defaults                                             | Explicitly labeled       | No                         | Apply after Reset run; record configuration in diagnostics export |

The existing application should not be represented as persisting every item in
this table until the project schema confirms it. Controls without an implemented
scope must be labeled `Session only` or omitted.

## Error and Recovery States

### Missing asset or library

Practice does not show an archive/path chooser first. It says:

```text
Some model parts are unavailable, so this setup cannot be shown completely.
[Open Expert Setup] [Use a prepared setup]
```

Expert Setup names the missing asset/model and offers `Choose LDraw folder` or
`Load missing parts`, preserving the current scene. If the selected season
package itself is missing, offer `Choose another challenge` and `Keep project
unchanged`; do not silently substitute a package.

### Project load failure

```text
This project could not be opened. Your current table has not changed.
{specific file/version reason when known}
[Choose another project] [Open Expert Setup]
```

When an older/incompatible project is supported, preserve its source file, name
the package/version mismatch, and offer a copy/migration path only after the
migration contract exists.

### Unsaved changes

Show persistent but calm status: `Unsaved changes` with `Save project`.

Before loading another project, changing season, or restoring saved setup, show a
dialog whose heading names the action:

```text
Switch challenge?
Your current table, robot setup, and program have unsaved changes.
[Save project] [Keep working] [Discard changes and switch]
```

`Keep working` closes the dialog and changes nothing. `Discard` names the exact
data that will be replaced. Do not offer a generic “OK.”

### Season switch

Switching seasons updates package-supplied identity, missions, capabilities, and
presets. It must not silently overwrite a field, robot, or program.

After a confirmed switch, evaluate portability explicitly:

| Input             | Behavior                                                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| Program           | Keep unless it uses a missing extension; identify unsupported blocks before a run.                                    |
| Robot             | Keep as a custom robot; re-check ports, wheels, and compatible presets.                                               |
| Field and models  | Keep only by explicit participant choice; a package preset is loaded only through `Use this season’s prepared table`. |
| Mission selection | Replace with the package-defined initial mission; announce the change.                                                |
| Scoring/evidence  | Replace with the new package capability status; never carry scores/rules across seasons.                              |

### Run failure and stopped motion

Practice shows the result card, then provides `Open diagnostics`. It must retain
the distinction among program state, observed contact, and inferred cause. In
Developer Diagnostics, users can inspect evidence and export it without changing
the run by default.

## Accessibility, Keyboard, and Non-Drag Behavior

1. Use semantic buttons, labels, headings, and native select/input controls.
   Icon-only controls require an accessible name and are not used for primary
   Practice actions.
2. The focus order follows the visual task: app/mode controls, mission, next
   setup action, active table/program panel, run controls, save, then optional
   details. `Stop run` is reachable without tabbing through the canvas or logs.
3. Status has text plus an icon/symbol/pattern. Green/amber/red never carry the
   only meaning. Announce only setup/run/result transitions in polite live
   regions; do not stream raw telemetry to assistive technology.
4. Dialogs focus their heading or first action, close with Escape, trap focus
   while open, and return focus to their trigger. A blocked destructive action
   must expose `Keep working` as a real button.
5. The table has a text alternative: selected field/mission, robot preset,
   launch zone, view, run state, and result summary. Canvas interaction is an
   enhancement, not the only source of state.
6. Expert object placement has a selected-object list, numeric X/Z position in
   millimeters, rotation in degrees, arrow-key step buttons, and accessible
   `Move {object} north 10 millimeters` controls. Scope keyboard shortcuts to the
   scene editor; never move objects while a text input, select, or Blockly editor
   owns focus.
7. Support reduced motion: no essential information depends on camera movement,
   bounce animation, or live-follow. Preserve contrast and visible focus at 200%
   zoom. Narrow layouts stack/switch panes instead of overflowing them.

## Season-Neutral Contracts

The generic UI needs a display-level contract; this is a proposed adapter over
the existing `SeasonPackage`, not a request to replace the current schema.

```ts
type PracticeSeasonPresentation = {
    seasonId: string;
    displayName: string;
    editionLabel: string;
    revisionLabel: string;
    defaultMissionId?: string;
    defaultPresetId?: string;
    missions: readonly {
        id: string;
        displayName: string;
        practiceSummary?: string;
        capabilities: {
            visualAssets: 'available' | 'unavailable';
            mechanics: 'implemented' | 'partial' | 'unavailable';
            scoring: 'verified' | 'practice-only' | 'unavailable';
            physicalCalibration: 'calibrated' | 'unverified' | 'unavailable';
        };
    }[];
};

type PracticeSetupReadiness = {
    season: 'ready' | 'missing' | 'unsupported';
    field: 'ready' | 'missing' | 'incomplete';
    robot: 'ready' | 'missing' | 'incomplete';
    drive: 'ready' | 'missing' | 'invalid';
    program: 'ready' | 'empty' | 'unsupported';
};
```

The shell maps these statuses to labels/actions; it must not look up a BIOGLOW
filename, hardcode `M01`, or derive a fixed number of missions. Rules and
mechanics owners remain responsible for what capability values mean.

## Phased Implementation Handoff

Each slice is intentionally small, has one production owner, and should be
reviewed by design and QA before the next slice begins. No production files are
changed by this design task.

### Slice 1 — Practice shell and action hierarchy

**Owner:** `fll_experience`  
**Allowed paths:**

-   `src/components/SpikeSimulatorWindow.svelte`
-   `src/components/PracticeReadinessShell.svelte`
-   `src/components/SeasonSelection.svelte`
-   `src/components/SeasonMissionReadiness.svelte`
-   `src/app.css` only if shared layout/focus tokens are necessary

**Deliverable:** A Practice-first header, compact mission/season summary, single
run-control group, first-missing-step action, and named Expert/Developer routes.
Move existing technical controls out of the default visual hierarchy without
removing their callbacks.

**Required contracts:** Reuse `PracticeRunReadiness`, `practiceReady`, selected
season package, selected mission, project dirty state, and existing run state.
Do not change physics, package semantics, or persistence schema.

**Acceptance scenarios:**

-   A prepared project opens to Practice with all five readiness inputs visible in
    a compact form and exactly one primary run action.
-   An empty Blockly workspace names Program as the next step and `Open program`
    focuses/opens it.
-   A missing robot or drive setup routes to the relevant existing setup surface.
-   BIOGLOW labels come from package display fields; a synthetic package of a
    different mission count still fits the shell.

### Slice 2 — Expert Setup routing and saved-setup language

**Owner:** `fll_experience`  
**Allowed paths:**

-   `src/components/SpikeSimulatorWindow.svelte`
-   `src/components/LoadScene.svelte`
-   `src/components/PortConnector.svelte`
-   `src/components/WheelConnector.svelte`
-   `src/components/SimulatorSettings.svelte`
-   `src/components/SaveSimulation.svelte`
-   `src/components/UnsavedChangesModal.svelte`

**Deliverable:** A named Expert Setup workspace that groups the existing
scene/robot/library/calibration controls and makes project load/save scope clear.
Define display-only versus reset-required controls in visible copy.

**Acceptance scenarios:**

-   Practice has no M01-specific calibration file picker or LDraw-folder control.
-   Expert Setup can still load a project, legacy scene, mat, robot, and missing
    parts using existing formats.
-   A dirty season switch, project load, and Restore saved setup use specific
    Save/Keep working/Discard language and preserve current state on cancel.
-   Numeric scene placement remains usable without dragging, and typing in an
    input does not move the selected object.

### Slice 3 — Practice results and diagnostic boundary

**Owner:** `fll_experience`, after `fll_runtime` agrees lifecycle events  
**Allowed paths:**

-   `src/components/SpikeSimulator.svelte`
-   `src/components/SpikeSimulatorWindow.svelte`
-   `src/components/RunLogConsole.svelte`
-   a new narrowly scoped presentation helper under `src/lib/spike/` if needed

**Deliverable:** Result card states for stopped, finished, waiting, motors off,
startup failure, and observed contact; a deliberate Developer Diagnostics entry.
Maintain raw log/export behavior.

**Acceptance scenarios:**

-   Start, stop, and reset retain their defined meanings and controls stay visible
    on desktop and narrow layouts.
-   A contact message does not claim causality.
-   A result can be understood without expanding raw evidence.
-   Existing log filtering/export remains available in Developer Diagnostics.

### Slice 4 — Diagnostics inspection contract and UI

**Owners:** `fll_runtime` and `fll_physics` for the event data; `fll_experience`
for UI; `fll_qa` independently verifies evidence wording.  
**Allowed paths:** to be assigned by the lead after the contract review in
`docs/qa/ui-platform-16-diagnostics.md`.

**Deliverable:** Exact-ID body selection/highlight, contact-pair follow, and an
inspection-only snapshot that pauses the whole run. Do not implement per-body
freezing, replay, or physics-causality claims without a separate approved
contract.

### Slice 5 — Evidence and usability acceptance

**Owner:** `fll_qa`, with `fll_design` review  
**Write paths:** `docs/qa/` and approved test paths only.

**Required evidence:** Chromium and Firefox walkthroughs for prepared project,
empty program, missing robot/drive, start/stop/reset/save, season-switch cancel,
narrow viewport, keyboard-only navigation, focus return, diagnostics export, and
text alternative. Conduct participant/coach sessions separately and label their
findings as observed research.

## Risks and Open Decisions

-   The current application may not expose a true pause lifecycle. Do not ship a
    fake Pause control.
-   A reliable prepared setup must be identified per package; otherwise an
    “intelligent default” can create misleading confidence.
-   The exact project persistence scope must be verified against the archive schema
    before UI copy claims that a setting saves.
-   Technical modes need a shared route/state boundary so returning to Practice
    does not accidentally change an active run.
-   Participant-first simplification must not hide fidelity limits, missing assets,
    package mismatch, or run-blocking errors.

## Validation for This Design Task

-   Read-only review of the requested current components and prior UI review.
-   No production source changed.
-   This document should be checked with Prettier and `git diff --check`.
-   Browser and participant validation are intentionally not claimed by this design
    specification; they are required after implementation.
