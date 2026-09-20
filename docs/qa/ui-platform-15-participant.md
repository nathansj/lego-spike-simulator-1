# UI Platform 15 participant-accessibility review

Review task: `participant-accessibility`  
Role: `fll_experience`  
Date: 2026-09-16  
Scope: `PracticeReadinessShell` after the reactive program-readiness fix.

## Evidence boundary

The registered task had no worker checkpoint available, so the lead completed
this bounded review and records that limitation here. This is a code-and-test
review. The owner reports that the flow works in Firefox; Chromium has not been
independently exercised in this pass, and no FLL participant or coach study was
run.

## Review findings

| Area | Status | Evidence and limits |
| --- | --- | --- |
| Keyboard operation | Implemented; browser unverified | Readiness controls are native `button` elements with `type="button"` and existing click dispatches in `src/components/PracticeReadinessShell.svelte:79-133`. Native buttons remain keyboard focusable without adding custom key handlers. |
| Screen-reader status | Improved; browser unverified | Each status control exposes a text label and setup action through `aria-label`. The first incomplete item is now marked `aria-current="step"` at `src/components/PracticeReadinessShell.svelte:85-130`, and the guidance uses `role="status"` at `:137`. |
| Actionable setup guidance | Improved; browser unverified | `nextSetupItem` identifies the first missing prerequisite at `src/components/PracticeReadinessShell.svelte:32-38`. The visible guidance directs participants to the highlighted status button at `:138-139`; the button opens the corresponding setup surface through the existing parent dispatch handlers. |
| Run gate | Preserved; automated evidence | `ready` still comes from `isPracticeRunReady` at `src/components/PracticeReadinessShell.svelte:31`; the Run button remains disabled until all five setup checks are ready. |

## Acceptance result

- **Code-level participant acceptance:** accepted for this small scoped change.
- **Firefox:** owner-confirmed, but not independently reproduced in this task.
- **Chromium:** not accepted; live browser evidence is still required.
- **User-study acceptance:** not accepted; no participant or coach observation is available.

## Remaining limits

1. Retest the prepared-project flow in Chromium at the supported desktop and a
   narrow viewport. Tab through the readiness controls, load and clear a
   program, and verify that the highlighted step and Run button update.
2. Repeat the same flow with a screen reader or accessibility tree inspection;
   confirm `aria-current="step"`, the status announcement, and the disabled Run
   explanation are understandable.
3. Have a participant or coach complete setup and save/reload without developer
   instructions. Record observed friction separately from code assumptions.

## Validation evidence

Commands run from the repository root:

- `npm test -- --run src/lib/fll/practice-run-gate.test.ts` — 1 file and 7 tests passed.
- `npm run check` — 0 errors and 0 warnings.
- `npm exec -- prettier --check src/components/PracticeReadinessShell.svelte` — passed.
- `git diff --check` — passed.

