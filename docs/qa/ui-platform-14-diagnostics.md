# UI Platform 14 — Diagnostic UX Review

Date: 2026-09-15  
Run: `ui-platform-14`  
Task: `diagnostic-ux-review`  
Role: `fll_design` (lead-owned fallback; no worker delegation transport was available)

## Scope and disposition

This is a source review of the run diagnostics, physics overlays, and developer
settings against the pending diagnostic UX gate. No browser interaction or
physical calibration was performed. The current diagnostics are useful for
confirming that a run is alive and identifying named contact bodies, but they
are not yet a complete expert troubleshooting workflow.

**Disposition: partially accepted.** Existing summaries, newest-first raw
telemetry, filtering, pause, robot camera focus, and collider/joint drawing are
usable foundations. Structured event data, actionable next steps, implicated
body selection, body-level freeze/follow, and a persistent export path were
missing. This review adds only filtered text export; the other gaps remain
explicit follow-up work.

## What is usable now

| Capability                     | Evidence                                                                                                                                                                                                                                             | Assessment                                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Plain-language symptom summary | `RunLogConsole.svelte:41-54` maps snag, stationary-contact, motor-off, missing-simulation, and missing-robot causes to readable text.                                                                                                                | Useful first signal, but observation-only.                                                              |
| Raw run telemetry              | `SpikeSimulator.svelte:315-329` logs every 0.5 seconds with fixed-step count, cause, active motors, wheel commands, robot/model pose, velocity, angular velocity, contacts, contact points/impulses, applied force, sleep state, and collider count. | Strong evidence stream; remains encoded in one long string.                                             |
| Newest-first and filtering     | `RunLogConsole.svelte:23-35,116-169` filters by severity/text and reverses entries for display.                                                                                                                                                      | Usable for finding a named body or cause.                                                               |
| Run-wide pause                 | `SpikeSimulator.svelte:218-231` pauses/resumes the VM and records the transition.                                                                                                                                                                    | Good for inspecting a stopped frame; not a body-level freeze.                                           |
| Robot camera focus             | `SpikeSimulatorWindow.svelte:176-190` and `ScenePreview.svelte:168-183,410-412` provide a robot-focused view and zoom.                                                                                                                               | Useful for the robot only; it does not follow an implicated mission body.                               |
| Collider and joint overlay     | `ScenePreview.svelte:84-128` draws collider primitives and child joint anchors in a high-contrast debug color.                                                                                                                                       | Available, but the current view uses a static `#all` selection and has no legend or per-body selection. |
| Developer settings             | `SimulatorSettings.svelte:108-138` exposes boundary drawing/collisions, physics collider/joint debug, encoder mode, timing, and scaling.                                                                                                             | Discoverable technical controls exist; the settings do not explain restart/reproducibility impact.      |

## Pending diagnostic UX gaps

### Structured symptom/action summaries — partial, still pending

The current summary is derived by regex from free-form messages. It names the
observed contact in common cases and correctly warns that contact does not prove
causation. It does not expose stable fields such as `cause`, `robotBodyId`,
`contactBodyIds`, `relativeSpeed`, `force`, `contactPoints`, or a confidence
level. It also does not provide a specific next action (for example, select the
named body, inspect collider alignment, or verify wheel ports). An expert still
has to open the raw line and interpret the telemetry.

### Body selection and highlighting — missing

The scene preview receives `select="#all"` during a run. The diagnostics text
filter can find a body name, but it cannot select that body in the scene,
highlight its collider, or show the corresponding joint/contact marker. There
is no stable body-selection contract from the run log to `ScenePreview`.

### Freeze/follow — partial

Pause freezes the complete VM/run and robot focus centers the robot view. There
is no freeze-at-last-contact snapshot, single-body freeze, contact-pair follow,
or follow mode that automatically centers the selected mission body. A user can
pause and manually inspect the full scene, but not reproduce the implicated
contact as a focused diagnostic state.

### Export — previously missing, now minimally addressed

The run log had no export action. `RunLogConsole.svelte:62-73` now downloads the
currently filtered, newest-first entries as a plain UTF-8 `.txt` file. The
formatting is isolated in `formatRunLogEntries` in `src/lib/spike/run-log.ts`
and covered by a unit test. This deliberately does not claim to export a
replayable physics snapshot or project state.

## Low-risk change delivered

-   Added an **Export** control beside **Clear** in `RunLogConsole.svelte`.
-   Export respects the active severity/text filters and preserves the visible
    newest-first order.
-   The control is disabled when no filtered entries exist.
-   Added deterministic formatting coverage in `src/lib/spike/run-log.test.ts`.

## Recommended next slice

1. Replace regex-only summaries with a typed diagnostic event derived at the
   point where physics telemetry is sampled; retain the raw message for audit.
2. Add an implicated-body list to the summary. Selecting a body should set the
   existing scene selection and render only that body's collider/joint overlay
   with a textual legend, not rely on color alone.
3. Add `Pause at event` and `Follow selected body` as explicit, run-scoped
   controls. Keep them separate from the reproducible setup/reset state.
4. Extend export to JSON only after the event schema is stable; include scene
   revision, physics settings, body IDs, collider IDs, joint IDs, and the
   selected event so a report can be replayed or compared.

## Validation and limits

Targeted validation for this slice:

```text
npm test -- --run src/lib/spike/run-log.test.ts
npm run check
npm exec -- prettier --check src/components/RunLogConsole.svelte src/lib/spike/run-log.ts src/lib/spike/run-log.test.ts
git diff --check
```

Browser download behavior, keyboard operation of the new button, Firefox and
Chromium rendering, and actual body/contact selection remain unverified in this
review. The export is a diagnostic text artifact only; it does not establish
official scoring, collider calibration, or physical robot accuracy.

## QA recommendation

Keep the current gate open for structured symptom/action summaries, body
selection/highlighting, and freeze/follow. Accept the export sub-item after the
targeted checks pass and a browser smoke test confirms a file download in the
supported browsers.
