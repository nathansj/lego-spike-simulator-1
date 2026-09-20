# UI M01 Section Removal 13 QA Review

Task: `ui-m01-removal-13` / `m01-removal-qa`
Reviewer: `fll_lead` (lead-implemented and lead-verified; no subagent claims)
Review state: handoff for lead acceptance; browser evidence not obtained
Reviewed: 2026-09-20

## Scope and Evidence Boundary

Owner request (screenshots): remove the M01 block from the simulator view — the
"M01 elapsed simulation time" line, the "Finish M01 practice match" button, and the
"M01 Drone Survey" score-feedback card. Changes in `SpikeSimulator.svelte` and
`SpikeSimulatorWindow.svelte`. Browser rendering is **not verified** (no browser tooling;
precedent: `docs/qa/ui-layout-03-review.md`).

## Source Findings

| Review area            | Source result | Evidence                                                                                                                                                                                                                                                                                                         | Browser status    |
| ---------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Section removed        | Pass          | The `{#if runSimulation}` M01 block (elapsed text, match-expired warning, Finish button, `DroneSurveyScoreFeedback`) is deleted from SpikeSimulator; the sensor-view block that followed is untouched.                                                                                                           | Unverified.       |
| Dead code removed      | Pass          | `droneSurveyScore`, `droneSurveyMatchState`, their assignments, the `DroneSurveyScoreFeedback` and `DroneSurveyScore`/`DroneSurveyObservationGeometryProfile` imports, and the now-unused `m01ObservationProfile` prop (plus its pass-through in the window) are removed. eslint on both touched files is clean. | —                 |
| Engine unchanged       | Pass          | The M01 match controller, `droneSurveyMatchExpired` auto-finish path, and `finishDroneSurveyMatch` (now discarding the score return) still run; `droneSurveyElapsedSeconds` still feeds the run-result card. Scoring is therefore computed but no longer displayed anywhere.                                     | Unverified (run). |
| Pre-existing lint debt | Fixed         | Running eslint on the touched window file surfaced dead code from earlier removals — `selectedMissionId` (reader removed with SeasonMissionReadiness) and `openBlockly` (reader removed with PracticeReadinessShell) — now removed.                                                                              | —                 |
| Toolbar calibration    | Pass          | The toolbar "Load calibration" (hidden M01 profile input) and "Clear calibration" controls are unchanged, so a user can still supply/clear the profile that gates scoring.                                                                                                                                       | Unverified.       |

## Validation

-   `npm run check` — 0 errors, 0 warnings.
-   `npm exec -- eslint` on both touched files — clean.
-   `npm exec -- prettier --check` — pass. `git diff --check` — clean. `npm test` — 210/210.

## Unverified Browser Cases

-   Simulator pane renders without the M01 block during a run; sensor views and 3D view
    unaffected.
-   No M01 score feedback is visible anywhere now (owner-intended); confirm this matches
    intent versus wanting it re-homed (e.g., into the Diagnostics section).

## Handoff

Lead accepts under the standing owner browser-caveat policy. `DroneSurveyScoreFeedback.svelte`
is now unused and left in place (not deleted) in case the feedback is re-homed.
