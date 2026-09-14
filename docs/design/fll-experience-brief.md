# FLL participant experience and expert tools

Status: design requirements and initial assignment, September 13, 2026. This brief
guides future UI work; it does not describe a completed redesign or verified
research with FLL participants. BIOGLOW remains the initial delivery target.

## Audience and outcome

Primary users are FLL participants learning and iterating on robot programs,
including first-time users and returning teammates. Coaches support setup and
interpretation. Expert users and developers need precise tools for setup,
calibration, and fault diagnosis. Avoid assuming every participant knows CAD,
solver settings, or file formats. Use encouraging, age-appropriate language
without making the interface childish; explain unfamiliar terms in context.

The core journey is: choose a season and edition, prepare the board and robot,
choose missions, create or import a program, run, understand the result, adjust,
reset, and save. Keep the board and program central, with obvious Run and Stop
controls and a concise explanation of what happened. Pause must freeze simulation
time if offered; Reset Run and Restore Setup must explain what each restores.

## Findings from the current implementation

The existing experience agent covers Svelte implementation and accessibility but
has no separate design counterpart. The recent troubleshooting flow also exposes
several concrete design problems to address:

-   `SpikeSimulator.svelte` forces collider display during runs and combines every
    body's telemetry into long messages. Practice needs readable summaries and an
    optional inspection path; developers still need the full evidence.
-   `SimulatorSettings.svelte` mixes timing, boundary display, collision behavior,
    physics overlays, and encoder behavior in one dialog. A setting's effect on the
    simulation should be distinguishable from a display preference.
-   `RunLogConsole.svelte` presents newest entries first but has no body/severity
    filtering or export. Repeated messages can obscure the onset of a problem.
-   Mission-specific feedback is embedded in the simulator component. Generic
    navigation needs a season/package contract before additional seasons are wired in.

These are code observations, not conclusions from a browser usability study.
The first design assignment should inspect the running UI and update this list.

## Workspaces and settings

Use progressive disclosure with an obvious route between workspaces. These are
presentation modes, not accounts, permission levels, or separate physics engines.

| Workspace             | Primary tasks                                                                                                       | Defaults and safeguards                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Practice              | Choose season/missions, configure a robot from presets, program, run, inspect results, retry, save                  | Default view; essential readiness errors and fidelity labels remain visible; overlays and raw logs start off                                          |
| Expert Setup          | Configure board, launch zones, robot ports/wheels/attachments, models and mission scenarios                         | Explicit opt-in; labeled units, validated edits, restore defaults, and clear unsaved state                                                            |
| Developer Diagnostics | Inspect runtime/physics/render state, contact evidence, asset resolution and imports; capture reproducible failures | Explicit opt-in; inspect first, edit deliberately; bounded logs and controlled overlays; simulation changes require a documented reset/restart policy |

Specify every setting's scope (display/session, project, or season package), default,
valid values/units, save behavior, reset behavior, and whether it can change during
a run. Display preferences must not change physics or scores. Simulation-changing
edits should be applied at a defined setup boundary, preserving the previous run's
inputs. Clearly label custom practice configurations and rule overrides.

| Area     | Expert setup                                                                     | Developer inspection                                                                                     |
| -------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| App      | Libraries, import readiness, display preferences, supported browser/offline path | App/package versions, loading and runtime errors, render cadence versus fixed-step time                  |
| Board    | Mat dimensions, orientation, placement, boundaries, home/launch zones            | Local/world axes and units, active boundary bodies, mismatch between saved and runtime state             |
| Robot    | Ports, wheel pairing, gearing, attachment configuration, starting pose           | Signed commands, encoder mode, forces, velocities, wheel transforms, collider alignment                  |
| Models   | Group selection, pose, fixed/movable state, collider/joint setup                 | Runtime shapes, contact points/normals, constraints, missing parts, render/physics coordinate comparison |
| Missions | Selected scenario, initial state, edition and rule revision                      | Condition-level score evidence, observation timing, unsupported mechanics, provenance/calibration status |

Provide safe numeric entry and keyboard alternatives to dragging. Keep expert
configuration usable without requiring developers to edit JSON manually.

## Explain a blocked run

Lead with a short event such as: "The robot is trying to move, but has stopped near
Fixed scenery." Include simulation time and a link to select/focus the implicated
objects. Expand into signed motor commands, actual movement, and contact evidence.
Distinguish motors off, program waiting/completed, startup failure, and suspected
obstruction. A detected contact pair alone does not prove a blocking collision;
do not label a guessed diagnosis as a verified cause.

Specify selectable runtime collider outlines, contact markers, visible legends,
and a way to compare collision geometry with rendered parts. Use shape, text, or
patterns alongside color. Overlays must share the physics coordinate frame and
remain legible in Firefox without depending on wide WebGL lines. Turning an
overlay off must leave collision behavior unchanged.

Raw logs should support newest-first ordering, body/severity filters, freezing the
view while reading, clear, and export with project/season/version context. Retain
the first obstruction event and state transitions without flooding Practice with
per-body telemetry. Explain capture limits and keep diagnostic export a deliberate
local action. Visibility of a stop/disposal message must not suggest startup failed.

## Design for multiple seasons

The shell owns project actions, programming, run controls, accessibility, and
inspection. A versioned season package provides season ID/name, edition, revision,
field dimensions/assets, setup presets and zones, mission IDs/names/instructions,
rule sources, and mechanics/scoring/calibration capabilities. This is a contract
to agree with lead/assets/rules; do not assume a loader already implements it.

Show the selected season/edition and rule revision. Navigation, mission lists, and
instructions must not assume 15 missions, M01 naming, a fixed mat size, or BIOGLOW
filenames. Distinguish visual assets available, mechanics implemented, scoring
verified, and physical calibration status. Unsupported missions must never silently
receive another season's rules or display a placeholder score as official.

Design season switching with unsaved changes: keep working, save first, or
explicitly discard changes before switching. Saved projects pin the package and
version; mismatched or unavailable packages need an explanation and recovery path.
Preserve the original project during migration. Define which robot/program inputs
are portable and validate references before reusing them. Validate the design with
BIOGLOW and a clearly labeled synthetic season of a different size and mission
count, without claiming support for another official season.

## Accessibility and validation

Specify readable type, clear focus order, keyboard operation, labeled controls,
non-color status cues, reduced motion behavior, and layouts for a classroom laptop
and narrow viewport. Keep Stop accessible and dialogs escapable. Provide a text
alternative for meaningful board/mission state; a canvas alone is insufficient.
Use Firefox and Chromium for flow verification. Device/performance budgets and
participant research remain to be measured; record hypotheses and actual evidence
separately. Use existing Svelte/Blockly patterns and styling where practical.

Acceptance scenarios for design and later implementation:

1. A new participant loads a supported preset, runs a program, reads a result,
   resets and saves without opening Developer Diagnostics.
2. An expert repairs missing libraries or a port/board setup error and can identify
   what changes will be saved, reverted, or applied after restarting a run.
3. A developer follows a stalled-run summary to the exact selected bodies and
   compares their runtime colliders to the meshes, then exports a useful report.
4. Returning to Practice hides optional technical overlays while keeping critical
   failures visible, with no change to simulation or scoring.
5. Switching to the synthetic season replaces content and capabilities without
   changing the core workflow; canceling the switch preserves unsaved work.
6. Opening an older or incompatible project preserves its source and explains
   version requirements; unsupported scoring is visibly unavailable.
7. Keyboard and narrow-screen users can complete the same main workflow, including
   object selection, settings, error recovery, Stop, and save.

## First bounded assignment: DESIGN-01

Owner: `fll_design`. Write scope: `docs/design/` and separately assigned prototype
paths. Inspect production code read-only. Produce an audit tied to visible tasks,
annotated wireframes for the three workspaces, navigation/state and microcopy
specifications, and a settings scope/persistence matrix. Include loading, missing
assets, run failure, stalled motion, unsaved changes, and season-switch states.
Provide a small set of visual tokens and reusable component behaviors that fit the
existing stack. Mark all unimplemented capabilities in prototypes.

Handoff: give `fll_experience` small implementation slices with allowed files,
required state contracts, and browser acceptance steps. Have physics/runtime review
the snag evidence contract, assets/rules review season/setup semantics, and QA
review reproducibility, accessibility, and browser scenarios. Record implemented,
proposed, and unverified items separately; do not claim to have run user studies.
