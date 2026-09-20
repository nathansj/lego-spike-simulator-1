# UI Platform 14 participant-flow review

Review task: `participant-flow-review`  
Role: `fll_experience`  
Date: 2026-09-15  
Scope: prepared project load, readiness, run, inspect, reset, save/reload, and missing setup guidance.

## Evidence boundary

This is a code-and-test review. No Chromium or Firefox session was available to
verify the full interaction flow, and no FLL participant or coach study was run.
The statuses below therefore distinguish implementation evidence from browser or
audience validation. A passing automated check does not prove that the layout is
usable at a particular viewport or that a saved archive works in a live browser.

## Scenario review

| Scenario | Status | Evidence and limits |
| --- | --- | --- |
| Prepared project load | Implemented; browser unverified | `LoadScene.svelte:655` loads `.lsp-project` archives, restores the scene and robot, and calls the project-restore callback. `SpikeSimulatorWindow.svelte:538` restores ports and wheels, `:556` restores Blockly state, `:578` restores settings, and `:599` restores the season reference. Archive and restore unit tests are included in the repository. |
| Readiness | Implemented; browser unverified | `SpikeSimulatorWindow.svelte:318` derives Season, Field, Robot, Drive wheels, and Program readiness. `:291` observes non-UI Blockly changes, so loaded/added/cleared blocks update the Program state. `PracticeReadinessShell.svelte:57` disables Run until all five checks pass. |
| Run | Implemented; browser unverified | `SpikeSimulatorWindow.svelte:275` rechecks the gate before starting, and `:844` applies the same gate to the toolbar Run control. `practice-run-gate.test.ts` covers each missing prerequisite and the all-ready case. |
| Inspect | Partial; browser unverified | `SpikeSimulator.svelte:233` exposes Reset run and the run panel explains Pause, Stop, and Reset. `:1048` provides a result/status message and directs users to the run log and physics view when inspection is available. The review did not verify that a participant can find or interpret those panels in a live browser. |
| Reset | Partial | `SpikeSimulator.svelte:233` resets the physics simulation, VM timer, match state, diagnostics, result, and schedules the next frame. The same file still renders a disabled `Restore setup (pending)` control at `:1038`; the saved-project contract does not yet provide a run-time restore action. Do not present that control as available participant functionality. |
| Save/reload | Implemented; browser unverified | `SaveSimulation.svelte:92` writes scene, robot, wheel/port setup, program state, season reference, settings, and model assets to `project.lsp-project`. `LoadScene.svelte:655` validates and restores the archive. The flow still needs live confirmation with a prepared archive and a fresh page state. |
| Missing setup guidance | Partial; browser unverified | `PracticeReadinessShell.svelte:70` provides individually labeled status controls and `:124` explains that setup items block Run. Each status control dispatches to the relevant setup surface (`SpikeSimulatorWindow.svelte:690` onward). Guidance remains generic (“Finish the setup items above”) and does not identify the first missing item or explain how to repair missing LDraw assets. |

## Acceptance result

- **Code-level acceptance:** the prepared-project, readiness, run, and save/reload
  paths have explicit implementation evidence and automated coverage.
- **Participant-flow acceptance:** not approved. The full flow is not browser
  verified, and a disabled `Restore setup (pending)` control remains visible.
- **Coach-flow acceptance:** not approved. Save/reload is implemented, but the
  archive round trip has not been exercised through the visible browser UI.
- **Audience evidence:** unknown. No participant or coach observation was run.

## Prioritized follow-up

1. **P0 — Browser flow retest.** In Chromium and Firefox, load a prepared
   `.lsp-project`, confirm all five indicators turn ready, run, stop, inspect,
   reset, save, reload in a fresh page, and repeat with an intentionally missing
   prerequisite. Record viewport, browser version, and exact observed labels.
2. **P1 — Resolve Restore setup semantics.** Either implement a clearly defined
   run-time restore-to-pre-run-snapshot action, or remove/replace the disabled
   `Restore setup (pending)` control. The current UI exposes an unfinished action
   and its tooltip references a contract that now exists, which is misleading.
3. **P1 — Make setup guidance actionable.** Identify the first failing readiness
   item in text, add repair guidance for missing libraries and invalid wheel/port
   setup, and keep the status-pill shortcuts. Validate keyboard focus and narrow
   viewport behavior while doing so.
4. **P2 — Coach acceptance.** Have a coach or equivalent reviewer complete the
   prepared-project save/reload scenario without developer instructions. Record
   observed friction separately from implementation assumptions.

## Validation evidence

Commands run from the repository root:

- `npm test -- --run` — 47 files and 206 tests passed.
- `npm run check` — 0 errors and 0 warnings.
- `npm run build` — production build passed.
- `npm exec -- prettier --check ...` — changed review paths passed.
- `git diff --check` — passed.

No source changes were made by this review. The remaining implementation work
requires a product decision about Restore setup semantics rather than a safe,
isolated participant-flow patch.
