# DESIGN-02 simplified participant-first UI: QA handoff review

Task: `design-02` / `design-qa-handoff`  
Date: 2026-09-16  
Role: `fll_qa` independent design/acceptance review  
Scope: Read-only review of the proposed design, current UI source, readiness
reports, and captured browser evidence. No production source was changed and no
participant or coach research is claimed.

## Inputs reviewed

-   `docs/design/simplified-practice-ui-spec.md`
-   `docs/design/fll-experience-brief.md`
-   `docs/design/practice-flow-implementation-spec.md`
-   `docs/design/season-readiness-ui-spec.md`
-   `docs/qa/ui-platform-09-season-readiness-qa.md`
-   `docs/qa/ui-platform-15-participant.md`
-   `docs/qa/ui-platform-16-chromium.md`
-   `src/components/PracticeReadinessShell.svelte`
-   `src/components/SpikeSimulatorWindow.svelte`
-   `src/components/SeasonSelection.svelte`
-   `src/components/SeasonMissionReadiness.svelte`
-   `src/components/LoadScene.svelte`
-   `src/components/SimulatorSettings.svelte`
-   `src/components/RunLogConsole.svelte`

## Decision

**Conditionally accepted as a design-to-implementation handoff.** The proposed
Practice-first shell is a materially simpler interaction model than the current
screen: it centers the field, selected robot, next required action, and one
Run/Stop/Reset control group. It preserves Expert Setup and Developer
Diagnostics as explicit, named destinations rather than removing their
capability. The proposed season presentation adapter avoids fixed BIOGLOW,
mission-count, and mat-size assumptions.

This is not an acceptance of an implemented UI or an independent-student
release. The current `SpikeSimulatorWindow.svelte` still presents season,
mission readiness, practice readiness, an icon-heavy setup/tools toolbar,
M01-specific calibration, save/project status, and simulator content in the
same default visual hierarchy. The design is therefore a valid target, not a
description of the current application.

## What the design preserves well

| Requirement                 | QA assessment                    | Evidence / condition                                                                                                                                                                                                                 |
| --------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Participant-first first run | Accept design direction          | The proposed default leads with the table, a compact setup summary, and the first missing action; it does not require library, port, collider, or calibration knowledge before a run.                                                |
| Real-practice control model | Accept design direction          | `Run program`, `Stop run`, `Reset run`, and `Restore saved setup` have distinct stated meanings. The spec correctly withholds `Pause` unless fixed-step runtime support exists.                                                      |
| Intelligent defaults        | Conditionally accept             | Default season/package and prepared setup are useful only when the package supplies a verified prepared preset. A default package identity alone must not be presented as a ready field or robot.                                    |
| Progressive disclosure      | Accept design direction          | Expert Setup owns project/field/robot configuration; Developer Diagnostics owns evidence and overlays. Essential capability/fidelity notices remain in Practice.                                                                     |
| Expert/developer capability | Accept with implementation guard | Existing scene import, LDraw, ports/wheels, calibration, settings, overlays, filters, and export remain reachable through named modes. Mode changes must be presentation-only and must not alter run/project state.                  |
| Multi-season adaptability   | Conditionally accept             | The proposed `PracticeSeasonPresentation` and `PracticeSetupReadiness` are package-driven. Implementation must prove a synthetic package with a different mission count and preserve dirty-project behavior during season switching. |
| Evidence honesty            | Accept design direction          | The design separates observed contact from proven causality and separates run readiness from scoring, mechanics, and physical-calibration capability notices.                                                                        |

## Required acceptance criteria before implementation approval

### Practice shell and defaults

1. A prepared supported project opens in Practice and presents exactly one
   primary start action. The legacy toolbar must not expose a competing `Run`
   action in the default participant path.
2. When a prerequisite is missing, the primary action names the first missing
   item (`Choose field`, `Choose robot`, `Fix drive setup`, or `Open program`),
   moves focus to the relevant control/surface, and does not require interpreting
   color alone.
3. The compact readiness summary continues to use the existing five gate inputs:
   season, field, robot, drive wheels, and program. Scoring and calibration must
   remain non-blocking capability notices unless a particular run genuinely
   cannot start.
4. A valid prepared default must include package identity, field/preset,
   robot/drive configuration, and mission selection. If any input is absent,
   the UI opens at the first missing setup step rather than claiming a ready
   default.
5. `Run program`, `Stop run`, `Reset run`, and `Restore saved setup` preserve
   the meanings in the design. In particular, Reset never discards program or
   saved setup inputs, and Restore saved setup always confirms the precise
   project data that will be replaced.

### Expert Setup and Developer Diagnostics

1. Practice does not show M01 calibration upload, LDraw-folder selection,
   collider/joint toggles, numeric transforms, gear/port configuration, or raw
   telemetry by default. Every moved control has a named Expert Setup or
   Developer Diagnostics entry and preserves its existing callback/format.
2. Entering, leaving, or changing the active technical workspace does not modify
   physics, scoring, selected season, project dirty state, or an active run.
   Simulation-changing controls state when a reset/restart is required.
3. Developer Diagnostics keeps the current filtered, newest-first raw evidence
   and export path, but Practice presents a concise result first. Contact wording
   remains observational until the structured diagnostics contract is delivered.
4. Any future body focus, contact-pair follow, or inspection snapshot follows
   `docs/qa/ui-platform-16-diagnostics.md`; no inactive diagnostic control may
   imply per-body freeze, replay, or verified collision causality.

### Season and persistence boundaries

1. Generic navigation derives package display name, edition, revision, mission
   labels, and capability status from the selected package. It contains no generic
   `BIOGLOW`, `M01`, filename, fixed field size, or fixed mission count.
2. A synthetic package with a different mission count fits the Practice shell,
   retains the same readiness/routing model, and does not inherit BIOGLOW rules
   or scoring claims.
3. Switching seasons with unsaved work offers Save, Keep working, and explicit
   discard choices. Cancel/Keep working leaves the existing project untouched.
4. Project save/load copy must match the archive schema. Do not claim a setting
   is project-persistent until a round-trip test verifies it; label unsupported
   state as session-only or omit the control.

## Likely usability risks

| Risk                                                | Why it matters                                                                           | Required mitigation                                                                                                                                                     |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default looks more complete than it is              | A selected season can be mistaken for a ready table/robot.                               | Bind "ready" language to all five setup inputs and show the first required action when a preset is partial or unavailable.                                              |
| Technical controls become unreachable               | Moving icon toolbar controls could hide necessary recovery paths for coaches.            | Named Expert Setup groups, searchable/visible group headings, and browser-tested routes for project load, robot import, library repair, ports, wheels, and calibration. |
| Duplicate or bypassed run actions survive migration | Conflicting Run controls undermine the readiness model.                                  | One participant primary action; classify any expert override explicitly and require a deliberate visible override state.                                                |
| Reset/save confusion                                | Students may lose a working setup if run reset and project restore are visually similar. | Separate labels, distinct placement, confirmation for destructive restore only, and exact preserved/replaced-data copy.                                                 |
| Narrow layout hides the control that matters        | Blockly, WebGL, and diagnostics panes already create high overflow risk.                 | One active work area at narrow width, persistent Stop first while running, and no horizontal-only route to Run/Save.                                                    |
| Capability notices create false confidence          | "Verified" package evidence could be read as physical accuracy or official scoring.      | Keep scoring, mechanics, and calibration separate; use explicit evidence-limit language in Practice and details in expandable surfaces.                                 |
| Season switch damages a practice setup              | Package identity can change without an equivalent field/robot/preset.                    | Require explicit portability choices and retain the existing scene/robot/program until the participant chooses a new package preset.                                    |
| Expert shortcuts disrupt a run                      | Settings/modal routing may mutate the simulation mid-run.                                | Disable or queue simulation-changing edits with a Reset-run boundary; allow display-only inspection independently.                                                      |

## Required browser and accessibility validation after each implemented slice

Run in current Firefox and Chromium with the actual browser/version, URL, viewport,
fixture name, and screenshots or durable evidence recorded. Automated unit,
type, and build results do not replace these checks.

1. **Prepared first run:** Load a known-good `.lsp-project`; verify selected
   season/edition/revision, mission, field, robot, drive wheels, program, one
   enabled primary Run action, Start, Stop, Reset run, result summary, and Save
   project.
2. **First missing step:** Test no season, missing field, missing robot,
   disconnected drive wheels, and empty/cleared Blockly program. Each state must
   name the correct next action, send focus there, disable or replace Run safely,
   and recover after correction.
3. **Progressive disclosure:** Confirm Practice lacks technical controls; verify
   Expert Setup reaches project/scene/robot/library/port/wheel/calibration
   workflows and Developer Diagnostics reaches filters, raw evidence, overlays,
   and export. Return to Practice without changing simulation state.
4. **Run-state safety:** During and after a run, verify Stop is continuously
   reachable, Reset and Restore have distinct effects, settings that require a
   reset state that fact, and a diagnostics result does not claim an observed
   contact caused the stop.
5. **Season/persistence:** Use a synthetic different-count package and test
   season switch with dirty work: Save, Keep working/cancel, and Discard each
   retain or replace only the documented data. Save/load restores the supported
   project state and visibly reports missing/incompatible package data.
6. **Responsive:** At `820×900`, 200% zoom, and a common classroom-laptop width,
   verify bounded scrolling and reachability of Practice status, table, program,
   next action, Stop, Reset, Save, and technical mode links without horizontal
   page dependence.
7. **Keyboard and assistive UI:** Use `Tab`, `Shift+Tab`, `Enter`, `Space`, and
   `Escape` only. Verify visible focus, task-order focus, modal focus return,
   no focus trap, labelled controls, non-color status, and the nearby text
   alternative for table/mission/robot/run state.
8. **Diagnostics export:** Produce filtered evidence, export it, and inspect the
   downloaded UTF-8 file for the same filtered, newest-first entries and project/
   season/version context promised by the final UI.

## Required participant and coach validation

These are future study protocols, not results from this review. Recruit and
document the participant experience separately from implementation testing.

1. A first-time participant, using a prepared project, independently identifies
   the next setup task, opens/edits the Blockly program, runs it, explains the
   result in their own words, resets, and saves without opening Developer
   Diagnostics. Record completion, confusion points, assistance, and time; do
   not interpret a single session as generalizable research.
2. A returning participant starts with an empty program and a disconnected
   drive configuration, then recovers both using the guided path. Record whether
   "Fix drive setup" and "Open program" match their understanding.
3. A coach prepares a project, changes a field/robot setting through Expert
   Setup, verifies what saves, reloads the project, and returns a student to
   Practice. Record whether save/reset/restore meanings remain distinct.
4. An expert/developer traces a stalled run from Practice result to diagnostics,
   identifies the selected evidence/body, and exports a report without treating
   contact evidence as a verified cause.
5. Repeat the participant and coach journeys on a narrow classroom device and
   with keyboard-only navigation where feasible. Report observed accessibility
   barriers without extrapolating beyond the tested setup.

## Handoff and unresolved gates

-   `fll_experience` may begin Slice 1 from
    `docs/design/simplified-practice-ui-spec.md` once the lead assigns a single
    writer for `SpikeSimulatorWindow.svelte` and shared presentation components.
-   `fll_runtime` and `fll_physics` must agree lifecycle and structured diagnostic
    event boundaries before Slices 3–4.
-   `fll_qa` must repeat the browser matrix and record participant/coach evidence
    after implementation. The earlier Firefox confirmation and Chromium
    project/readiness/start/stop/reset evidence do not validate this redesigned UI.
-   Physical calibration and official scoring remain separate evidence gates.

## Validation performed

-   Read-only source/document review of the inputs listed above.
-   `npm exec -- prettier --check docs/qa/design-02-review.md`
-   `git diff --check`

No production behavior, browser flow, accessibility-tree result, or user-study
outcome is claimed by this design QA report.
