# UI Platform 15 — Diagnostic Actions

Date: 2026-09-15  
Run: `ui-platform-15`  
Task: `diagnostic-actions`  
Role: `fll_runtime` (lead execution)

## Scope and disposition

**Accepted for this slice.** The run diagnostics now provide a small,
observation-based next action for the existing snag-related log causes. Raw
telemetry remains the source of evidence and the existing filtered text export
is unchanged. This is not a physics-causality detector and does not establish
collider calibration or official scoring.

## What changed

- Added typed `RunLogGuidance` output and pure `getRunLogGuidance` mapping in
  `src/lib/spike/run-log.ts`.
- Added guidance for logged physics contact, stationary contact, driven motors
  off, unavailable simulation, unavailable robot body, and unknown messages.
- Updated `src/components/RunLogConsole.svelte` to show **What was observed**
  and **Next action** while retaining the raw evidence disclosure and export.
- Contact guidance names only bodies present in the log and recommends pausing,
  inspecting collider overlays, and verifying transforms before changing code.
- Added focused coverage in `src/lib/spike/run-log.test.ts` for contact,
  stationary-contact, and setup-cause guidance.

## Validation

```text
npm test -- --run src/lib/spike/run-log.test.ts    7 passed
npm test -- --run                                47 files, 210 tests passed
npm run check                                    0 errors, 0 warnings
npm run build                                    passed
npm exec -- prettier --check <assigned files>    passed
git diff --check                                 passed
```

Browser interaction and Chromium retesting were not performed in this task.

## Remaining diagnostic work

- Body selection/highlighting is still pending: guidance does not select a
  named body or isolate its collider in the scene preview.
- Body-level follow is still pending: the app can focus the robot, but does not
  follow the implicated mission body or contact pair.
- Body-level freeze is still pending: pause remains run-wide and there is no
  single-body freeze or reproducible contact snapshot.
- A future structured physics event schema can expose stable body/collider IDs
  once those fields are produced at telemetry sampling time; this slice keeps
  free-form raw messages for auditability instead of inferring them.
