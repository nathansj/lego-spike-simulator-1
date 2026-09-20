# UI Toolbar 09 QA Review

Task: `ui-toolbar-09` / `toolbar-expert-qa`
Reviewer: `fll_lead` (lead-implemented and lead-verified; no subagent claims)
Review state: handoff for lead acceptance; browser evidence not obtained
Reviewed: 2026-09-20

## Scope and Evidence Boundary

Owner request: remove the Practice and Expert Setup mode buttons, lift every Expert Setup
action into the always-visible top toolbar, and make the user calibration a toolbar button
that opens the file selector. Single-file change to `src/components/SpikeSimulatorWindow.svelte`.

Browser rendering is **not verified**: no browser tooling available (precedent:
`docs/qa/ui-layout-03-review.md`). All findings are source-level.

## Source Findings

| Review area                   | Source result  | Evidence                                                                                                                                                                                                                                                                                                                                                                   | Browser status                       |
| ----------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Mode buttons removed          | Pass           | Mode group replaced by a single Developer Diagnostics toggle (`aria-pressed`, SpikeSimulatorWindow.svelte:810-821); `workspaceMode` type narrowed to `'practice' \| 'diagnostics'`; zero `expert` references remain in the file.                                                                                                                                           | Unverified.                          |
| Toolbar groups always visible | Pass           | Prepared setup (Load project or field, Load missing parts w/ `libraryClass` bounce, Choose LDraw folder), Robot (Load robot w/ `robotButtonColour`, Reference robot, Ports, Drive wheels), Mission and advanced (Simulation settings, Display options + `MenuDropdown` + Tooltip, Load calibration, Clear calibration) rendered unconditionally in the top bar (:846-956). | Unverified.                          |
| Expert section deleted        | Pass           | The `{#if workspaceMode === 'expert'}` section (header, three groups, M01 strip) removed; the duplicate "Save or export setup" button it contained is redundant with the top-bar Save project (same `saveRobotOrScene`).                                                                                                                                                   | —                                    |
| User calibration              | Pass           | Hidden file input `#m01-calibration-profile` (same id, `class="hidden"`, same accept/aria-describedby/change handler) plus a Load calibration button calling `openCalibrationSelector()` (programmatic `.click()`); Clear calibration keeps its `disabled` binding.                                                                                                        | Unverified.                          |
| Calibration status visibility | Changed, noted | The status strip now renders only when a profile is loaded or an error exists; the perpetual "M01 scoring is disabled until a profile is loaded" line no longer occupies the layout. Fidelity-limit visibility at scoring time is owned by the run/score surfaces (unchanged); flagged for owner awareness.                                                                | Unverified.                          |
| Helper side effects           | Pass           | `askForRobot`, `askForLibrary`, `connectPorts`, `connectWheels`, `loadScene`, `openPracticeField` no longer set `workspaceMode`; corrective labels "Open Expert Setup" changed to "Fix setup" (nextActionLabel).                                                                                                                                                           | Unverified.                          |
| Project strip condition       | Pass           | Restore/unsaved-changes strip now shows only in Diagnostics mode (`workspaceMode === 'diagnostics'`), matching the previous intent of non-practice modes.                                                                                                                                                                                                                  | Unverified.                          |
| State preservation            | Pass           | Mode is presentation-only; dialogs (`sceneOpen`, `wheelsOpen`, `connectorOpen`, `settingsOpen`) are mode-independent binds on `SpikeSimulator`; no `{#key}` changes.                                                                                                                                                                                                       | Unverified (live run across toggle). |

## Validation

-   `npm run check` — 0 errors, 0 warnings.
-   `npm exec -- prettier --check src/components/SpikeSimulatorWindow.svelte` — pass.
-   `git diff --check` — clean.
-   `npm test` — 47 files, 210/210 passed.

## Unverified Browser Cases

-   Toolbar wraps acceptably at desktop and narrow widths with 15+ controls; groups stay
    visually separated.
-   Diagnostics toggle round-trip preserves a live run, score, and project state.
-   Hidden file input opens the OS file selector from the Load calibration button.
-   Display options dropdown + tooltip still anchor correctly from the toolbar.
-   Corrective "Fix setup" run button opens the expected dialog for Field/Robot/Drive wheels.

## Handoff

Lead accepts under the standing owner browser-caveat policy. The highest-value manual
check is the narrow-width toolbar wrap, since the bar now carries every setup action.
