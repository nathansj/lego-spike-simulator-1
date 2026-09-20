# Practice flow implementation specification

Task: `ui-implementation-01` / `practice-design`  
Owner: `fll_design`  
Status: ready for `fll_experience` implementation review  
Audience: FLL participants first, coaches second, expert users and developers through opt-in workspaces

This is the first bounded UI slice. It defines the participant journey from
selecting a field through saving a result. It does not implement a season
package loader, scoring rules, a new physics contract, or a replacement for the
existing scene editor. Those capabilities are surfaced through clear states and
entry points until their owners deliver them.

## Outcome

A participant can open a prepared BIOGLOW project, understand what is ready,
run a Blockly program, read a plain-language result, reset the run, and save the
project without opening Expert Setup or Developer Diagnostics. A participant can
also choose a mission when the selected season exposes missions. A missing or
unsupported capability remains visible and explains the next action.

The Practice shell must be season-neutral. Use the selected package's display
name, edition, revision, field, and mission labels. Do not put `BIOGLOW`, `15
missions`, `M01`, or a filename into generic navigation or state labels.

## Journey and state

Use one visible step strip or compact checklist with these steps:

`Field & mission` → `Robot` → `Program` → `Ready` → `Run` → `Result` → `Save`

The active step is the first step that needs participant action. Completed steps
show a check and remain selectable. A step with an error shows a warning icon,
text, and a direct action. The strip is useful at desktop width and becomes a
selectable vertical list or tab row at narrow widths.

### Field & mission

Default label: `Choose a field and mission`.

Ready copy: `Field loaded` and `Mission selected: {mission name}`.

Empty copy: `Choose a field to start practicing.`

Actions:

- `Choose field` opens the supported field/preset chooser.
- `Choose mission` lists only missions supplied by the selected season package.
- `Use prepared setup` loads the current prepared field and robot configuration.

If a package is unavailable, show `This field package is unavailable` with
`Check package setup` in Expert Setup. If a mission has visual assets but no
mechanics or scoring implementation, show `Practice model available` and
`Scoring unavailable` as separate statuses. Never show an invented score.

### Robot

Default label: `Choose a robot`.

Ready copy: `Robot ready` and `Drive wheels connected`.

Empty copy: `Choose a robot or load the prepared robot.`

The participant-facing chooser offers prepared robot presets first. Keep custom
robot import under `Expert Setup`. A robot setup error uses the format:
`Drive setup needs attention: connect left and right drive wheels.` The action is
`Fix drive setup`, which opens the guided expert setup at the relevant control.

Do not expose signed gear ratios, LDraw library paths, collider controls, or
port wiring in the default chooser. A prepared robot may still display a small
`2 motors · 2 drive wheels` summary.

### Program

Default label: `Create or open a program`.

Ready copy: `Program ready`.

Empty copy: `Add blocks to make the robot move.`

Actions: `Open program`, `New program`, and `Save program`. Keep Blockly as the
primary programming surface. If the program is empty, the Run action remains
visible but disabled with an explanation: `Add a program before running.`

### Ready

The readiness card is the gate before starting a run. It contains five rows:

| Check | Ready state | Actionable failure |
| --- | --- | --- |
| Field | `Field loaded` | `Choose a field` |
| Mission | `Mission selected` | `Choose a mission` |
| Robot | `Robot ready` | `Choose a robot` |
| Drive | `Drive wheels connected` | `Fix drive setup` |
| Program | `Program ready` | `Open program` |

Scoring and fidelity are capability notices below the gate, not substitutes for
the setup checks:

- `Scoring verified for this mission`.
- `Scoring is unavailable; the run can still be observed`.
- `Mechanics are approximate; review the mission evidence`.
- `Physical calibration is not verified`.

The primary action is `Run program` when all required checks pass. If a required
check fails, the primary action is `Fix setup`; it focuses the first failed row.
The card must not block a run solely because scoring or physical calibration is
unavailable.

### Run

While running, replace the primary action with `Pause` and provide an always
visible `Stop` action. Show `Running · {elapsed time}` and a compact selected
mission label. Use a live region for state transitions only, not every physics
telemetry event.

The run controls have explicit meanings:

| Control | Meaning and participant copy |
| --- | --- |
| `Pause` | Temporarily holds the run. Copy: `Paused`; action becomes `Resume`. |
| `Stop` | Ends the run and keeps the current scene for inspection. |
| `Reset run` | Recreates the run from the saved setup and clears runtime motion. |
| `Restore setup` | Reverts unsaved scene/robot edits to the last saved setup. |

`Reset run` must confirm only when the participant has meaningful unsaved
changes or when the current run cannot be reset without losing state. The dialog
states exactly what is preserved: `Your program and setup will stay saved. The
robot will return to its launch position.`

### Result

After stop, completion, or failure, show a result card before raw logs:

- Completed: `Run finished`.
- Stopped: `Run stopped at {time}.`.
- Waiting: `The program is waiting.`.
- Motors off: `The drive motors are off.`.
- Suspected obstruction: `The robot stopped near {object name} at {time}.`.
- Startup failure: `The simulation could not start: {plain-language reason}.`.

Use `Observed contact with {object}` or `Possible obstruction near {object}`
when evidence does not prove causation. Do not say `blocked by` from a contact
pair alone. Include `Show details` and, where supported, `Inspect objects`.

The result actions are `Run again`, `Reset run`, `Save project`, and
`Show diagnostics`. `Show diagnostics` opens Developer Diagnostics deliberately;
it is never the only way to understand a failed run.

### Save

Default action: `Save project`.

The saved project includes the selected season package/version, field and mission
selection, scene, robot setup, Blockly program, and participant-visible settings.
Until the combined project contract exists, show the existing separate exports
under `Expert Setup` and label them `Save program` and `Save scene`; do not imply
that either is a complete project save.

Dirty state copy: `Unsaved changes` with `Save project` and `Discard changes`.
When switching season/package with dirty state, offer `Save first`, `Keep
working`, and `Discard changes`. The original project remains available if a
package is missing or incompatible.

## Progressive disclosure boundary

Practice is the default presentation mode. It owns the participant journey,
readiness, run controls, result summary, mission capability notices, and project
save status.

Expert Setup is an explicit navigation destination named `Expert Setup`. It owns:

- LDraw library loading and import readiness.
- Board dimensions, orientation, zones, and boundaries.
- Robot ports, wheel pairing, gearing, attachments, and launch pose.
- Scene object selection, transforms, fixed/movable state, and model grouping.
- Calibration file selection and custom practice configuration.
- Display preferences that are safe to change without changing physics.

Developer Diagnostics is an explicit destination named `Developer Diagnostics`.
It owns:

- Structured run events, severity/body filters, freeze/follow, clear, and export.
- Runtime commands, velocities, encoders, contacts, joints, and fixed-step data.
- Runtime collider outlines, contact markers, rendered-mesh comparison, and
  object focus.
- Asset resolution, missing parts, coordinate/units checks, and package errors.

Practice always keeps essential errors, selected season/edition/revision,
scoring availability, mechanics/fidelity status, and `Stop` visible. The modes
change presentation only; entering or leaving a mode must not modify physics,
scoring, or saved state. Technical changes that affect simulation are labeled
`Applies after Reset run` or `Applies after restart` and preserve reproducible
inputs.

## Existing components and exact implementation slices

`fll_experience` owns production changes. The lead must assign shared files one
writer at a time before implementation.

| Component | Bounded change |
| --- | --- |
| `src/components/SpikeSimulatorWindow.svelte` | Add the Practice step strip/readiness entry, labeled primary actions, mode navigation, selected field/mission summary, and unsaved state placement. Wire existing callbacks; keep technical toolbar actions behind Expert Setup. |
| `src/components/SpikeSimulator.svelte` | Expose run lifecycle state to the result card; distinguish pause/stop/reset presentation; provide a concise result event while retaining raw telemetry for diagnostics. |
| `src/components/BioglowMissionReadiness.svelte` | Generalize the visible title and mission source to selected package data. Present capability notices as separate statuses. Preserve evidence wording and avoid hardcoded generic navigation. |
| `src/components/RunLogConsole.svelte` | Keep newest-first log behavior, but add a compact Practice result slot or callback boundary and an explicit `Show diagnostics` entry point. Full filtering/export may be the next diagnostics slice. |
| `src/components/SaveSimulation.svelte` | Surface save scope and dirty-state messaging. Keep separate exports clearly named until the project save contract is available. |
| `src/components/SimulatorSettings.svelte` | Group settings into `Practice display`, `Expert simulation`, and `Developer diagnostics`; add units, scope, reset/restart text, and accessible labels. |
| `src/components/LoadScene.svelte` | Add the `Expert Setup` entry label and return path; preserve the existing scene editor behavior. Do not redesign its physics controls in this slice. |
| `src/components/ScenePreview.svelte` | Add a text summary/accessible description of selected board, mission, robot, and overlay status. Keep visual collider changes in Developer Diagnostics. |
| `src/components/BlocklyComponent.svelte` | Expose program readiness and unsaved program state to the Practice shell; preserve Blockly editing. |
| `src/app.css` | Add only shared responsive/focus tokens needed by the step strip, cards, visible focus, and narrow workspace behavior. |

Required state contracts for implementation are small and can be local to the
window at first:

```ts
type PracticeStep = 'field' | 'robot' | 'program' | 'ready' | 'run' | 'result' | 'save';
type WorkspaceMode = 'practice' | 'expert-setup' | 'developer-diagnostics';
type PracticeResultKind = 'completed' | 'stopped' | 'waiting' | 'motors-off' | 'suspected-obstruction' | 'startup-failure';
```

The lead should later replace local season assumptions with the agreed
`SeasonPackage` and structured diagnostics contracts. This design does not
authorize inventing those APIs.

## Accessibility and responsive acceptance

1. With keyboard only, a participant can tab through `Choose field`,
   `Choose mission`, `Choose robot`, `Open program`, `Run program`, `Pause`,
   `Stop`, `Reset run`, `Save project`, and the mode links in a logical order.
2. The readiness card exposes status with text and an icon or pattern; color is
   supplemental. The first failed check receives focus after `Fix setup`.
3. Every dialog can be opened, escaped, and closed with the keyboard; focus
   returns to the triggering control. Typing in a setting does not move a
   selected scene object.
4. A 200% browser zoom view and a narrow classroom laptop viewport keep the
   primary action, `Stop`, readiness summary, and save status reachable without
   horizontal page scrolling. The code/simulator panes may switch to one active
   workspace at narrow widths.
5. The canvas has a nearby text summary such as `Field loaded. Mission:
   {name}. Robot at launch zone. Physics overlays off.` It updates on meaningful
   state changes and does not stream per-frame telemetry to assistive technology.
6. Reduced motion does not remove state changes or make the run controls
   unavailable.
7. Repeat the flow in Firefox and Chromium. Record actual browser evidence
   separately from this source-based design proposal.

## Handoff to `fll_experience`

Implement the smallest slice in this order:

1. Add the Practice step strip, readiness card, and labeled actions in
   `SpikeSimulatorWindow.svelte` using existing stores/callbacks.
2. Add run/result/reset presentation in `SpikeSimulator.svelte` and connect the
   concise result boundary to `RunLogConsole.svelte`.
3. Move or relabel technical controls behind Expert Setup and group settings by
   audience.
4. Add accessible text state and responsive/focus behavior.
5. Preserve existing imports/exports and clearly mark the combined project save
   as pending until its contract and round-trip tests exist.

Implementation acceptance is the seven accessibility scenarios above plus the
seven audience scenarios in `docs/design/fll-experience-brief.md`. QA must
exercise a prepared project, an empty program, disconnected wheels, a stopped
run, an unavailable scoring capability, an unsaved change, and a narrow browser
layout. `fll_design` reviews the resulting screens; `fll_qa` records browser and
keyboard evidence. No physical calibration or official scoring approval follows
from passing this UI slice.

## Evidence, assumptions, and risks

Evidence for this specification is the source review in
`docs/design/ui-audience-review-2026-09-14.md`, the existing component paths
listed above, and the requirements in `docs/design/fll-experience-brief.md`.

Assumptions: existing stores can expose enough readiness and run state for a
presentation slice; a prepared project is the first participant entry point;
BIOGLOW remains the selected delivery target while labels are package-driven.

Risks: a complete project save, versioned season package, and structured
diagnostic event model may require lead-owned interfaces before all labels can
be wired. Missing state must remain visibly `unknown` or `unavailable`; the UI
must not infer official scoring, obstruction causes, or physical accuracy.
