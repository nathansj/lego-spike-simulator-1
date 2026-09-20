# UI Lifecycle 02 Acceptance Audit

Date: 2026-09-15  
Run: `ui-lifecycle-02`  
Task: `lifecycle-qa`  
Role: `fll_qa`

## Decision

**Not accepted for full team approval.** The current Practice slice provides
participant-facing Run and Stop controls and a readiness display, but the
lifecycle contract is not implemented. The audit remains source-based because
the lifecycle implementation and runtime review have not published checkpoints.

## Scope and evidence

- `src/components/PracticeReadinessShell.svelte`: exposes readiness chips and
  Run/Stop; it has no Pause, Resume, Reset run, Restore setup, result, or save
  actions.
- `src/components/SpikeSimulatorWindow.svelte:221`: `startRobot` resets code,
  generates code, and sets `runSimulation`; `stopRobot` only clears that flag.
- `src/components/SpikeSimulator.svelte:637`: the reactive runtime starts or
  disposes the simulation from one boolean; no pause or reset lifecycle API is
  exposed to the Practice shell.
- `src/components/SpikeSimulatorWindow.svelte:340`: field readiness is based on
  `sceneStore.objects.length > 0`, and program readiness is based on a nonempty
  Blockly workspace. These checks do not establish a valid field, configured
  robot, or runnable program.
- `src/components/RunLogConsole.svelte:20`: diagnostics remain a raw newest-first
  stream with Clear only; no participant-facing result state is available.
- `src/components/SaveSimulation.svelte:40`: robot and scene exports remain
  separate, with no complete project dirty-state contract.

## Acceptance matrix

| Area | Result | Finding |
|---|---|---|
| Result states | Fail | No completed, stopped, waiting, motors-off, obstruction, or startup-failure result card is exposed after a run. |
| Pause and resume | Fail | No Pause, Paused, Resume, or preserved simulation-state behavior exists. |
| Stop semantics | Partial | Stop is visibly labeled and clears `runSimulation`, but the current scene/result preservation behavior is not represented in Practice state. |
| Reset run | Fail | No explicit Reset run action or repeatable reset contract exists; starting a run implicitly resets runtime state. |
| Restore setup | Fail | No Restore setup action or saved-setup snapshot is exposed. |
| Readiness gate | Partial | Run is disabled for four displayed booleans, but mission is absent and the checks are too weak to prove readiness. |
| Repeated runs | Fail | No explicit Run again/reset path or testable repeat-run lifecycle is exposed. |
| Cancellation/startup failure | Partial | Generation checks dispose stale simulations and initialization errors are logged, but the user receives no lifecycle result or cancellation state. |
| Accessibility | Partial | Native buttons and labels provide a useful base; focus movement, live lifecycle announcements, modal behavior, and keyboard-only repeated runs remain unverified. |
| Regression risk | Pass for baseline | `npm run check` and the full Vitest suite pass; no lifecycle-specific tests exist. |

## Blockers before acceptance

1. Add an explicit lifecycle state model covering idle, starting, running,
   paused, stopped, completed, failed, and resetting. Wire Pause/Resume, Stop,
   Reset run, and Restore setup to distinct behavior and labels.
2. Add a participant-facing result card driven by structured runtime outcomes.
   Preserve uncertainty wording for contacts and obstruction evidence, and keep
   raw telemetry behind Developer Diagnostics.
3. Strengthen readiness checks for field, mission, resolved/configured robot,
   drive wheels, and runnable program. Focus the first failed check and keep
   scoring/calibration limitations visible without using them as accidental
   run blockers.
4. Define repeat-run and cancellation behavior. Verify that Pause preserves
   state, Stop preserves the inspection scene, Reset returns the robot to the
   saved launch state, and stale asynchronous startup cannot replace a newer
   run.
5. Add saved-setup/project dirty state before exposing Restore setup or implying
   that the existing separate robot/scene exports are a complete project save.
6. Add lifecycle tests for all transitions, repeated runs, startup cancellation,
   reset repeatability, result announcements, and readiness gate interaction.

## Validation

- `npm run check`: passed; 0 errors and 0 warnings.
- `npm test -- --run`: passed; 40 test files and 179 tests.
- No lifecycle-specific automated tests were present.
- Browser walkthrough, keyboard-only audit, screen-reader audit, Firefox and
  Chromium checks, responsive checks, and participant/coach sessions were not
  run. These remain required for full team approval.

## Risks and limits

This is an independent source-based QA audit of the current working tree. It
does not establish physical robot fidelity, official scoring fidelity, or
participant usability. The implementation and runtime task checkpoints are
missing from `ui-lifecycle-02`, so their activity and remaining work are
unknown; this audit should be rerun after those handoffs are published.
