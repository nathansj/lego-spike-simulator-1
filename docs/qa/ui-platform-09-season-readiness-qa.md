# UI Platform 09 Season Readiness QA

## Scope

Independent review of `docs/design/season-readiness-ui-spec.md` and the current
season-readiness implementation. This report does not grant browser,
accessibility, Firefox/Chromium, or participant approval.

## Final re-audit findings

- **Season selection:** `SeasonSelection.svelte` exposes a package registry,
  selected identity, revision, platform, mission count, provenance links, and
  capability summaries. The selection is now unselected by default in
  `SpikeSimulatorWindow.svelte:97-103`, and the Practice Run is disabled until a
  package is selected. The registry currently contains only the BIOGLOW package
  in `season-package.ts:144-150`; dynamic multi-season behavior is therefore not
  demonstrated.
- **Dirty protection:** `SpikeSimulatorWindow.svelte:368-405` routes season
  changes through the dirty store and confirmation modal. Cancel restores the
  previous select value; discard applies the new package and marks the project
  changed. The state and focused dirty-store tests support this contract, but
  keyboard/focus and browser lifecycle behavior remains unverified.
- **Mission corrective actions:** `season-readiness.ts:57-75` supplies a named
  action for unavailable, partial, unverified, located, and not-implemented
  capability states. `SeasonMissionReadiness.svelte:48-69` displays the action
  and avoids claiming official scoring or physical accuracy for incomplete
  evidence.
- **Hard-coded season assumptions:** generic selection components use package
  data, but `SpikeSimulatorWindow.svelte:681` still labels a tool as the
  “BIOGLOW virtual reference robot,” and the app initializes to BIOGLOW by
  default at `SpikeSimulatorWindow.svelte:98-103`. These are acceptable for the
  current delivery target only if the generic app shell does not present them as
  season-neutral behavior.
- **Technical Run bypass:** `SpikeSimulatorWindow.svelte:784-800` still renders
  a toolbar `Run` button that calls `startRobot` directly. Unlike the Practice
  `Run program` control at `PracticeReadinessShell.svelte:49-57`, it is not
  disabled when season, field, robot, wheels, or program readiness is false.
  This allows a technical user to bypass the participant gate. It should be
  explicitly labeled as an Expert/Developer bypass or routed through an
  intentional override with visible state.
- **Hard-coded season assumptions:** the package adapter and mission catalog are
  BIOGLOW-specific by design, but `SpikeSimulatorWindow.svelte:746-755` exposes
  `M01 user-supplied calibration` globally and the current package registry has
  no second season. `season-readiness.ts` itself is package-driven and does not
  contain BIOGLOW names. Multi-season adaptability remains unproven.
- **Capability summary risk:** `SeasonSelection.svelte:20-34` derives one summary
  status from `statuses[0]` when every mission is complete or none are complete;
  mixed states use `partial`. With a future package whose first mission differs
  from the rest while all are non-complete, the displayed label may not describe
  the aggregate. Mission-level readiness remains the authoritative view.

## Validation

- Focused season/archive/persistence suite: 6 files, 19 tests passed.
- `npm run check`: passed with 0 errors and 0 warnings.
- `npm run build`: passed; 998 modules transformed.
- Browser, keyboard/focus, screen-reader, Firefox/Chromium, and participant
  validation: not run; these remain separate release gates.

## Decision

**Conditional code-level acceptance.** The completed handoff is type-check clean,
focused tests pass, season switching is dirty-protected in source, provenance and
capability limits are visible, and mission corrective actions are fail-closed.
Do not grant full release approval until the technical Run bypass is intentionally
classified or gated, browser and accessibility behavior is exercised in Firefox
and Chromium, and participant validation is completed. Physical calibration and
official scoring remain evidence-limited by the package metadata.
