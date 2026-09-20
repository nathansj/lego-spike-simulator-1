# UI Run Result Move 11 QA Review

Task: `ui-run-result-11` / `run-result-move-qa`
Reviewer: `fll_lead` (lead-implemented and lead-verified; no subagent claims)
Review state: handoff for lead acceptance; browser evidence not obtained
Reviewed: 2026-09-20

## Scope and Evidence Boundary

Owner request (clarified): move the "Run result" card (Run stopped at X s, Pause/Resume,
Stop, Reset run, Run again, Open diagnostics) from the simulator pane into the left
Diagnostics section, above the run-log console. The three program-pane sections were
already vertically stacked and collapsible (prior run `ui-program-sections-10`); this run
adds no new layout mechanism. The M01 elapsed/match controls and sensor views stay in the
simulator pane.

Browser rendering is **not verified** (no browser tooling; precedent:
`docs/qa/ui-layout-03-review.md`). All findings are source-level.

## Source Findings

| Review area          | Source result     | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                      | Browser status         |
| -------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Card moved           | Pass              | Card markup deleted from SpikeSimulator (was :940-1019) and re-rendered inside the Diagnostics section body above `RunLogConsole` (BlocklyComponent.svelte), same condition `runSimulation \|\| practiceResult`, same texts/roles (`aria-labelledby="practice-run-status"`, `role="status"`/`aria-live`).                                                                                                                     | Unverified.            |
| State plumbing       | Pass              | `practiceResult`, `simulationPaused`, `programExecutionIdle`, `droneSurveyElapsedSeconds`, and new `runPauseDisabled` are `export let` in SpikeSimulator, bound through the window to BlocklyComponent. Assignments inside SpikeSimulator (stop/reset/idle/frame updates) propagate up through the bind chain.                                                                                                                | Unverified (live run). |
| Pause disabled state | Pass (equivalent) | New reactive `runPauseDisabled = !vm \|\| vm.state === 'stopped'` (SpikeSimulator) replaces the inline template check — same staleness characteristics as before, now exported.                                                                                                                                                                                                                                               | Unverified.            |
| Actions              | Pass              | `togglePause`/`stopRun`/`resetRun` are now `export function`s on SpikeSimulator, invoked via `bind:this={simulatorComponent}` in the window through wrappers `pauseOrResumeRun`/`stopCurrentRun`/`resetCurrentRun` (same instance-call pattern as the existing `runOrCorrect`). "Open diagnostics" calls the new `openDiagnosticsMode` (sets `workspaceMode='diagnostics'`) replacing the removed `openDiagnostics` dispatch. | Unverified.            |
| Type moved           | Pass              | `PracticeResult` interface extracted to `src/lib/spike/practice-result.ts`; SpikeSimulator/window/BlocklyComponent share the single definition; the now-unused `createEventDispatcher` import and `openDiagnostics` dispatch removed from SpikeSimulator.                                                                                                                                                                     | —                      |
| No other changes     | Pass              | M01 elapsed/match/finish controls and sensor views untouched in the simulator pane; simulation loop/scoring/log recording untouched; `git diff --stat` reviewed.                                                                                                                                                                                                                                                              | —                      |

## Validation

-   `npm run check` — 0 errors, 0 warnings.
-   `npm exec -- prettier --check` on the four changed/added files — pass.
-   `git diff --check` — clean.
-   `npm test` — 47 files, 210/210 passed.

## Unverified Browser Cases

-   Card renders/updates in the Diagnostics section during a live run (Running · t s ticking
    through the bind chain; Pause/Resume/Stop/Reset work from the new location).
-   Card visibility when the Diagnostics section is collapsed (it stays hidden until the
    section is expanded — collapse hides run status; noted as accepted owner trade-off).
-   Simulator pane layout with the card gone (M01 block and sensor views remain).

## Handoff

Lead accepts under the standing owner browser-caveat policy. One owner-visible trade-off
to confirm: with the Diagnostics section collapsed, run status/result is not visible
during a run; expand the section to see it (the top-bar run control still works either way).
