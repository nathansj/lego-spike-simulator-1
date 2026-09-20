# UI Icons 04 QA Review

Task: `ui-icons-04` / `icon-button-qa`  
Reviewer: `fll_qa`  
Review state: handoff for lead review; not accepted  
Reviewed: 2026-09-19

## Scope and Evidence Boundary

Reviewed the completed `icon-button-implementation` handoff against
`docs/design/icon-button-spec.md` and the amended icon-first rule with owner-confirmed
exceptions A1–A4 in `docs/design/quiet-practice-layout-spec.md`. Covered surfaces:
Practice header (PRH-1..5), Blockly pane header (BLH-1, BLH-3), command disclosure
(CMD-1, CMD-2), narrow run strip (NRS-1), PracticeReadinessShell controls (PWS-1..5),
and the AudioDialog accessible-name gap fix.

Scope limitation: the working tree carries multiple uncommitted tasks together
(`git status` shows changes to 25 tracked files plus untracked components), so the
git diff cannot attribute individual hunks to this task alone. This review verifies
the **current combined state** of the five in-scope files
(`SpikeSimulatorWindow.svelte`, `BlocklyComponent.svelte`,
`PracticeReadinessShell.svelte`, `AudioDialog.svelte`, `src/app.css`) against the
specification, not an isolated patch.

**Browser acceptance is not claimed.** This QA session had no browser tool: no
computer-use/browser tool was available, and the project has no playwright/puppeteer
dependency or cached browser (`node_modules/.bin` and `~/Library/Caches/ms-playwright`
contain neither). No dev server was started and no rendered page was observed. Every
browser scenario from the spec's acceptance list is recorded below as unverified.

## Findings

### No spec violations found in source

No defect against `docs/design/icon-button-spec.md` was reproduced or identified in
the five changed files. Every icon-only button in scope has both `aria-label` and
`title`; state swaps bind both to one reactive string together with the icon;
exceptions A1–A4 keep visible text; the AudioDialog gap fix is present.

### UI-ICONS-04-F1 (follow-up, not a defect) — Phase B (EXP-1..11) intentionally not implemented

-   **Severity:** info (follow-up)
-   **Location:** `src/components/SpikeSimulatorWindow.svelte:967-1092` (Expert Setup section)
-   **Reproduction:** Open Expert Setup and inspect the toolbar buttons.
-   **Expected:** The spec marks Expert Setup as "Phase B (lower priority than Practice
    default surfaces, same contract)" with weak-glyph choices EXP-6/7 that require lead
    confirmation before iconification (`icon-button-spec.md:127-143, 229, 293-295`).
-   **Actual:** EXP buttons (`Save or export setup`, `Load robot`, `Simulation settings`,
    `Display options`, `Clear calibration`, etc.) still show visible text; no partial or
    inconsistent iconification was introduced.
-   **Impact:** None for Phase A acceptance. Deferring Phase B is consistent with the
    spec's priority ordering and its requirement to confirm EXP-6/7 glyphs with the lead
    first.
-   **Practical correction:** Lead confirms EXP-6/7 glyph choices (or text retention),
    then schedules a Phase B implementation task with the same state contract and the
    same browser evidence requirements.

## Source Findings

| Review area                                    | Source result                  | Evidence                                                                                                                                                                                                       | Browser status                                         |
| ---------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| PRH-1 `Simulator view` trigger                 | Source-supported, not accepted | `aria-label="Simulator view"`, `title="Simulator view"`, `GridOutline` + small `ChevronDownOutline`, `aria-haspopup="menu"`, `aria-expanded`, Escape handler retained (`SpikeSimulatorWindow.svelte:815-827`). | Unverified (tooltip, a11y tree, focus ring).           |
| PRH-2 `Save project`                           | Source-supported, not accepted | flowbite `Button`, `FloppyDiskOutline`, static `aria-label`/`title` = `Save project` (`SpikeSimulatorWindow.svelte:879-887`).                                                                                  | Unverified.                                            |
| PRH-3/4/5 run/stop/corrective swap             | Source-supported, not accepted | One reactive `practiceRunLabel` drives icon branch, `aria-label`, and `title` together (`SpikeSimulatorWindow.svelte:340-344, 888-906`); corrective strings match spec list exactly (`:365-380`).              | Unverified for running, corrective, and revert states. |
| BLH-1 `Blockly view` trigger                   | Source-supported, not accepted | `aria-label`/`title` = `Blockly view`, `CodeOutline` + `ChevronDownOutline`, `aria-haspopup`/`aria-expanded`/Escape kept; menu items keep text (`BlocklyComponent.svelte:562-611`).                            | Unverified.                                            |
| BLH-2 `Close print`                            | Unchanged per spec             | Still a hidden text `Button` (`BlocklyComponent.svelte:613-615`).                                                                                                                                              | Not applicable (never visible).                        |
| BLH-3 `Hide/Show simulator` swap               | Source-supported, not accepted | `simulatorToggleLabel` reactive string binds icon, `aria-label`, and `title` together (`BlocklyComponent.svelte:495, 617-629`).                                                                                | Unverified both directions.                            |
| CMD-1 `Commands` disclosure                    | Source-supported, not accepted | Static name `Commands` with `aria-expanded`/`aria-controls`; chevron rotates with state; hover-preview, pin, Escape, focus-return handlers intact (`BlocklyComponent.svelte:637-656, 404-449`).                | Unverified (hover preview, Escape, focus return).      |
| CMD-2 `Close commands`                         | Source-supported, not accepted | `CloseOutline` with static `aria-label`/`title` = `Close commands`; `closeCommands()` returns focus to the trigger (`BlocklyComponent.svelte:673-681, 430-436`).                                               | Unverified.                                            |
| NRS-1 narrow run strip                         | Source-supported, not accepted | `stripRunLabel` = `Stop run`/`Run program`/`Fix setup` binds icon + `aria-label` + `title` (`BlocklyComponent.svelte:496, 707-721`).                                                                           | Unverified at narrow width/200% zoom.                  |
| Exception A1 narrow `Program`/`Simulator` tabs | Text retained                  | Text tabs with `role="tab"`/`aria-selected` unchanged (`BlocklyComponent.svelte:524-545`).                                                                                                                     | Not applicable (text by design).                       |
| PWS-1..5 shell controls                        | Source-supported, not accepted | `FloppyDiskOutline` save, `CloseOutline` close, one `runLabel` reactive string drives run/stop/corrective icon + `aria-label` + `title` (`PracticeReadinessShell.svelte:136-199, 46, 79-94`).                  | Unverified in expert/diagnostics modes.                |
| Exceptions A2 routes, A3 chips                 | Text retained                  | `Practice`/`Expert Setup`/`Developer Diagnostics` keep text + `aria-current` (`PracticeReadinessShell.svelte:106-135`); chips keep text, state glyph, detailed `aria-label` (`:203-260`).                      | Not applicable (text by design).                       |
| Exception A4 modal confirmations               | Text retained                  | `Keep working` / `Discard changes` remain text buttons (`UnsavedChangesModal.svelte:38, 45`).                                                                                                                  | Not applicable (text by design).                       |
| AudioDialog gap fix                            | Source-supported, not accepted | `Play sound` / `Remove sound` / `Add sound` `aria-label` + `title` added; icons marked `aria-hidden="true"`; handlers unchanged (git diff of `src/components/AudioDialog.svelte`).                             | Unverified in the Sound Library.                       |
| Focus-visible styling                          | Source-supported, not accepted | `.icon-btn` utility adds `focus-visible:ring-2 focus-visible:ring-blue-700` (`src/app.css:5-9`); AudioDialog buttons carry the same pattern inline.                                                            | Unverified keyboard focus visibility.                  |
| Icon imports/dead code                         | Clean                          | All 12 referenced icons exist in installed `flowbite-svelte-icons`; all imports are used in markup; no unused import found in the five files (`Tooltip` still used at `SpikeSimulatorWindow.svelte:1066`).     | Not applicable.                                        |

## Demonstrated Source Details

-   `src/components/SpikeSimulatorWindow.svelte:340-344` — `practiceRunLabel` is a single
    reactive string (`Stop run` / `Run program` / `nextActionLabel()`), consumed by both
    `aria-label` and `title` at `:895-896`, so the three can never drift.
-   `src/components/SpikeSimulatorWindow.svelte:365-380` — corrective strings
    (`Choose challenge`, `Open Expert Setup`, `Open program`, `Review setup`) equal the
    spec's PRH-5 list verbatim; this surface's strings differ from the shell's
    (`Choose field`, `Choose robot`, `Fix drive setup`) as the spec requires.
-   `src/components/BlocklyComponent.svelte:495-496` — `simulatorToggleLabel` and
    `stripRunLabel` reactive strings are each bound to both attributes of their button
    (`:620-621`, `:710-711`) alongside the conditional icon at `:624-628` and `:714-720`.
-   `src/components/BlocklyComponent.svelte:444-449, 430-436` — Escape closes the command
    overlay and `closeCommands()` restores focus to the disclosure trigger; hover-preview
    timers, pinning, and toolbox selection clearing are untouched by the icon swap.
-   `src/components/PracticeReadinessShell.svelte:46, 167-199` — run/stop/corrective
    branches render `StopOutline`/`PlayOutline`/`ToolsOutline` with `aria-label={runLabel}`
    and `title={runLabel}` in every branch, satisfying the spec's "update together" rule.
-   `src/app.css:5-9` — the single added `.icon-btn` utility; no other CSS changed.

## Unverified Browser Cases

No browser session was available; none of the spec's acceptance scenarios
(`icon-button-spec.md:248-277`) was demonstrated:

1.  Desktop hover tooltips exactly matching former labels, and no header reflow/height
    change, for every icon-only button.
2.  Keyboard focus: visible focus ring on each icon button; name available on focus;
    Enter/Space performing the previous text-button action (e.g. Save project opens the
    save dialog).
3.  Accessible names in the Chromium accessibility tree equal to former labels verbatim;
    menu triggers retaining `aria-haspopup="menu"`/`aria-expanded`.
4.  Narrow viewport/200% zoom: strip and tab switcher correct, `Run program`/`Stop run`
    reachable without horizontal scrolling or clipped controls, and no new wrap points
    introduced by icon sizing (spec non-negotiable 4).
5.  Run/Stop/corrective swaps in both header and strip, including revert after stop and
    corrective names (`Open Expert Setup` header, `Fix setup` strip) when setup is
    incomplete.
6.  Disabled state: `Clear calibration` dimmed and inert with a real `disabled`
    attribute (text retained in Phase B, so partially moot until Phase B).
7.  Dialogs: Sound Library play/remove/add names via aria-label and tooltip; Unsaved
    Changes dialog text buttons and behavior unchanged.
8.  Regression guard: command hover/click/Escape/focus-return flow, season switch
    confirmation, save flow, Expert/Diagnostics routes, and no pane resize from overlay
    open/close.

## Coverage Gaps and Handoff

-   The five files carry cumulative changes from earlier uncommitted tasks; this review
    could not diff-isolate this task's hunks and instead verified the current state of
    every in-scope button against the contract. Handler-level "unchanged" claims are
    therefore state-based (handlers exist and match the spec), not diff-based.
-   No browser evidence exists for any acceptance scenario; the lead should require a
    browser pass (desktop hover/focus/a11y-tree, narrow viewport, run/stop swap, dialogs)
    before accepting, or assign it to a session with browser tooling.
-   Phase B (EXP-1..11) remains a planned follow-up with EXP-6/7 glyph decisions open
    (UI-ICONS-04-F1).
-   This review does not assess scoring, physics, assets, season content, or physical
    calibration.

## Validation Commands (run by QA)

-   `npm run check` — svelte-check found 0 errors and 0 warnings.
-   `npm exec -- prettier --check` on the five changed files — all files pass.
-   `git diff --check` — clean (exit 0).
-   `npm test` — 47 test files, 210 tests, all passed.
-   `npm exec -- prettier --check docs/qa/ui-icons-04-review.md` — pass (recorded after
    writing this report).
-   `git diff --check -- docs/qa/ui-icons-04-review.md` — clean (recorded after writing
    this report).
