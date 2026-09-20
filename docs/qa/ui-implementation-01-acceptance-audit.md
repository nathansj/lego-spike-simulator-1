# UI Implementation 01 Acceptance Audit

Date: 2026-09-15  
Run: `ui-implementation-01`  
Task: `acceptance-audit`  
Role: `fll_qa`

## Decision

**Not accepted yet.** The current slice adds a useful participant-facing Practice header and readiness checklist, and the project baseline remains healthy. The checklist is not yet a reliable readiness gate because field readiness is hard-coded true, program readiness means only that a Blockly workspace exists, and robot/drive checks do not verify the complete setup required by the simulator. The design and implementation tasks are still in progress, so this is a checkpoint audit rather than a final release approval.

## Evidence reviewed

- `src/components/PracticeReadinessShell.svelte`: adds Practice language, season label, four readiness buttons, a disabled Run button, and a visible Stop run action.
- `src/components/SpikeSimulatorWindow.svelte:336`: mounts the shell and derives robot readiness from a loaded model, drive readiness from two motor-connected wheels, and program readiness from `workspace !== undefined`.
- `src/components/SpikeSimulatorWindow.svelte:255`: the Field action opens scene setup, but the parent does not pass a field readiness value, so the shell default remains `true`.
- `src/components/SpikeSimulatorWindow.svelte:220`: the existing Run handler still resets and starts the VM directly; there is no Reset Run or Restore Setup action in this slice.
- `src/components/RunLogConsole.svelte:20`: diagnostics remain a narrow raw text stream with Clear only.
- `src/components/SimulatorSettings.svelte:80`: participant timing controls and physics/debug controls remain in one settings surface.
- `src/components/BioglowMissionReadiness.svelte:56`: the mission readiness panel remains BIOGLOW-specific and does not provide a season package or season-switch contract.

## Acceptance matrix

| Area | Result | Finding |
|---|---|---|
| Beginner readiness | Partial | Clear labels and disabled Run state exist, but field and program checks are not trustworthy enough to guide a first run. |
| Run/stop/reset | Fail | Run and Stop are exposed; Pause, Reset Run, and Restore Setup remain absent or implicit. |
| Technical discoverability | Partial | “Setup & tools” is labelled, but all technical controls remain in the primary toolbar and calibration remains prominent. |
| Accessibility labels/focus | Partial | Native buttons, labels, `aria-live`, and descriptive labels are present; modal focus, keyboard scene editing, canvas alternatives, and focus restoration are unverified or missing. |
| Narrow layout | Risk | The new shell wraps controls, but the simulator and Blockly surfaces still use fixed horizontal flex layouts and overflow clipping. No narrow viewport check was run. |
| Regression risk | Pass for baseline | `npm run check` and the full Vitest suite pass. Browser behavior and the actual run workflow remain unverified. |

## Required changes before acceptance

1. Define and wire a real readiness contract for field, robot, drive, and program. It must distinguish an open scene from a valid field, a workspace from a runnable program, and a model from a resolved/configured robot.
2. Add explicit lifecycle behavior for Stop, Pause, Reset Run, and Restore Setup, with visible state and repeatable reset behavior.
3. Complete the design handoff and implement the disclosure boundary so Practice is the default and scene editing, libraries, ports, wheels, calibration, physics, and raw diagnostics are discoverable through Expert Setup or Developer Diagnostics.
4. Add a structured plain-language run result and retain raw telemetry behind details. Diagnostics need implicated object IDs, collider focus/highlighting, filtering, freeze/follow, and export before expert troubleshooting is complete.
5. Add season package state and protect unsaved project state when changing season or field.
6. Verify keyboard navigation and focus management in the shell and modals, provide a textual board/collider state, and test narrow layouts in Firefox and Chromium.

## Validation

- `npm run check`: passed with 0 errors and 0 warnings.
- `npm test -- --run`: passed; 40 test files and 179 tests passed.
- Browser walkthrough, keyboard-only audit, screen-reader audit, Firefox/Chromium viewport checks, and participant/coach sessions were not run. These remain required for full release approval.

## Risks and limits

This audit is source-based and covers the current working tree while `practice-design` and `practice-ui` continue. It does not establish physical robot fidelity, official mission scoring fidelity, or usability with actual FLL participants.

## Re-review — 2026-09-15

### Decision

**Not accepted for full team approval.** The Practice shell is implemented and the
baseline checks remain healthy. The slice closes the participant-facing entry point,
explicit readiness presentation, and visible Run/Stop actions. It does not yet close
the readiness contract, lifecycle controls, progressive disclosure, structured
diagnostics, project persistence, season support, or browser/accessibility acceptance.

### What this slice closes

- `PracticeReadinessShell.svelte` gives the simulator a participant-facing title,
  season label, readiness indicators, and named Run/Stop actions.
- `SpikeSimulatorWindow.svelte` derives field readiness from `sceneStore.objects`,
  robot readiness from a loaded model, drive readiness from two motor-connected
  wheels, and program readiness from nonempty Blockly top-level blocks.
- The technical toolbar is labeled `Setup & tools`, which improves orientation while
  preserving access to existing setup controls.
- Run is disabled when any of the four displayed checks is false.

### Remaining findings

1. **Readiness is still incomplete.** A nonempty scene is not proof of a valid FLL
   field, a loaded model is not proof of resolved/configured robot geometry, and two
   motor ports are not proof of valid wheel placement or gearing. The program check
   only verifies top-level blocks and does not establish runnable or supported code.
2. **Run lifecycle is incomplete.** The shell provides Run and Stop, but there are no
   explicit Pause, Reset Run, or Restore Setup actions. `startRobot` still resets and
   starts implicitly, and Stop only changes the UI flag.
3. **Progressive disclosure is incomplete.** Library loading, scene editing, ports,
   wheels, camera, calibration, settings, and raw run controls remain in the primary
   toolbar beside Practice.
4. **Diagnostics remain unsuitable for expert troubleshooting.**
   `RunLogConsole.svelte` is still a narrow raw newest-first stream with Clear only;
   it has no structured event model, object focus/highlighting, filters, freeze/follow,
   or export.
5. **Persistence remains split.** Robot/scene export and Blockly program saving are
   separate; there is no project dirty state covering program, scene, robot setup,
   selected season, and mission.
6. **Season support remains hard-coded.** `BioglowMissionReadiness.svelte` still
   presents BIOGLOW-specific mission readiness, with no versioned season package or
   protected season/field switching.
7. **Accessibility and responsive acceptance remain open.** Native controls and
   labels are present, but keyboard scene editing, modal focus, canvas text state,
   narrow layouts, Firefox, Chromium, and screen-reader behavior were not verified.

### Validation

- `npm run check`: passed; 0 errors and 0 warnings.
- `npm test -- --run`: passed; 40 test files and 179 tests.
- Browser walkthrough and participant/coach sessions were unavailable, so release
  acceptance for interaction, responsive layout, and accessibility remains unknown.

### Full-release blockers

Implement and independently validate the real readiness contract; Pause/Stop/Reset
Run/Restore Setup lifecycle; Practice versus Expert Setup versus Developer Diagnostics
boundaries; structured diagnostics and plain-language run results; project-level save
and dirty state; versioned season packages; and keyboard, responsive, Firefox,
Chromium, screen-reader, and participant/coach acceptance scenarios.
