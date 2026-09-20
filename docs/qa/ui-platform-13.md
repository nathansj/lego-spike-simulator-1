# UI Platform 13 — Program Readiness QA

## Scope

QA review of the reported state where Blockly blocks are visible, but the
Practice `Program` indicator remains incomplete and both run controls stay
disabled. This review is source-based; no browser interaction was performed.

## Finding

**Blocking: program readiness is not reactive to Blockly edits.**

- `src/components/SpikeSimulatorWindow.svelte:288-297` computes
  `programReady` by calling `workspace.getTopBlocks(false).length` inside a
  Svelte reactive statement.
- `src/components/SpikeSimulatorWindow.svelte:671-680` repeats the same direct
  workspace read when passing `programReady` to the Practice shell.
- Blockly creates and mutates one `WorkspaceSvg` object in
  `src/components/BlocklyComponent.svelte:104-136`. Adding, deleting, or
  loading blocks changes that object internally; it does not replace the
  `workspace` reference.
- The existing Blockly change listener at
  `src/components/BlocklyComponent.svelte:129-136` marks project state dirty,
  but it does not publish a program-readiness value to
  `SpikeSimulatorWindow.svelte`.

Therefore Svelte can evaluate `workspace === undefined` initially and retain
`programReady: false`. Visible blocks do not invalidate that reactive
statement because `workspace` has not changed. The shared gate then correctly
returns false, so the `Program` pill and both `Run program` buttons remain
disabled. This is a state-observation defect, not a failure of the boolean gate
itself.

## Other gate conditions

The current readiness architecture also requires all five conditions in
`src/lib/fll/practice-run-gate.ts`:

1. Season package selected.
2. At least one field/scene object loaded.
3. Robot model loaded.
4. At least two configured motor wheels.
5. A Blockly workspace containing at least one top-level block.

The screenshot shows the first four conditions green. The fifth condition is
the reported failure. The default BIOGLOW season initialization is not the
remaining blocker in this report.

## Current validation

Executed:

```text
npm test -- --run src/lib/fll/practice-run-gate.test.ts
```

Result: 1 file passed, 7 tests passed. These tests verify the gate's truth
table and alternate start-path guard; they do **not** test Blockly event
reactivity or browser rendering.

## Required implementation retest

After the implementation agent lands a fix, run:

```text
npm run check
npm test -- --run
npm run build
npm exec -- prettier --check src/components/BlocklyComponent.svelte src/components/SpikeSimulatorWindow.svelte src/components/PracticeReadinessShell.svelte src/lib/fll/practice-run-gate.ts src/lib/fll/practice-run-gate.test.ts
git diff --check
```

Expected automated behavior:

- A workspace with zero top-level blocks reports `programReady: false`.
- Adding a top-level block through Blockly changes it to `true` without
  replacing the workspace object.
- Clearing the workspace changes it back to `false`.
- Loading a saved project with blocks changes it to `true`.
- The Practice `Program` pill and both run buttons reflect those transitions.
- The run handler remains blocked if any of the other four conditions is false.

## Browser acceptance matrix

Use the dev server and test at least Chromium and Firefox if available:

```text
npm run dev
```

1. Open the app with the default season.
2. Load a scene, robot, and two motor wheels.
3. Confirm Season, Field, Robot, and Drive wheels are green.
4. With an empty workspace, confirm `Program` is amber and both run controls
   are disabled.
5. Add the visible `when program starts` block or load a project containing it.
6. Confirm `Program` immediately becomes green and both run controls become
   enabled without refreshing or changing season/field/robot settings.
7. Clear all blocks and confirm the indicator and controls revert immediately.
8. Load a saved project containing blocks and confirm readiness becomes green.
9. Start a run and confirm the controls switch to `Stop run`.
10. Resize to a narrow viewport and confirm the Practice panel, readiness pills,
    and run control remain reachable.

## Blockers and risks

- **Current blocker:** the source has no workspace-to-readiness notification;
  the screenshot behavior is expected from the current architecture.
- Browser behavior, keyboard accessibility, and Firefox compatibility remain
  unverified in this QA pass.
- Existing Vite/Vitest deprecation warnings are non-blocking for this finding;
  they should not be confused with the readiness defect.

## QA disposition

Not accepted until a source change makes readiness update from Blockly changes
and the browser acceptance matrix passes. The pure readiness gate itself is
accepted by its existing unit tests.
