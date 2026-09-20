# UI Platform 04 Acceptance Audit

Date: 2026-09-15  
Role: `fll_qa`  
Task: `platform-qa`  
Decision: **Not accepted**

The new season and project contracts are present and their focused tests pass. The platform task remains **not accepted** because project archives can be saved but cannot be loaded/restored, dirty tracking is only a pure helper with no UI integration, and the save window does not receive the selected season. Browser, accessibility, and participant evidence are also still absent.

## Validation

- `npm run check`: passed, 0 errors and 0 warnings.
- `npm test -- --run`: passed, 40 files and 179 tests.
- `npm run build`: passed, Vite production build completed.
- Browser, keyboard-only, screen-reader, narrow-layout, Firefox, Chromium, and participant checks were not run in this read-only QA task.

## Acceptance findings

### Serialization round trips

**Partial, with the new envelope covered at the contract level.** `src/lib/spike/scene-schema.ts` serializes scene version 2, physics definitions, collider data, joints, stable IDs, and editor metadata. `src/lib/spike/scene-schema.test.ts` verifies physics and joint round trips. `src/lib/spike/project-contract.ts` serializes a version 1 envelope containing scene, robot setup, Blockly state when supplied, participant settings, asset manifest, and capability flags. `src/lib/spike/project-contract.test.ts` verifies envelope JSON round trip, stable revisions, and malformed/unsupported top-level input.

`SaveSimulation.svelte:89` now writes `project.json`, `scene.json`, the mat, the robot MPD, model MPDs, and the optional M01 profile. This is a meaningful save implementation. Complete round-trip acceptance is still blocked because no corresponding project loader restores those entries into the workspace, scene store, hub, settings, and season selection.

### Backward compatibility

**Partial.** Version 1 scene input is accepted and migrated to explicit physics colliders. Unsupported scene versions are rejected, and malformed scene object values receive conservative defaults. `parseProjectEnvelope` rejects malformed JSON, unsupported format, unsupported version, and missing top-level sections. It does not deeply validate nested scene, robot, settings, assets, capability, or Blockly fields and has no migration path for older project versions. There is no project loader test proving compatibility with an actual saved archive.

The migration behavior also deserves follow-up review: a legacy anchored object is intentionally converted through the legacy path, so QA should verify that old saved scenes preserve the expected body type and motion after a load/reset cycle, rather than relying only on parsed field values.

### Dirty and save semantics

**Partial at the contract level; not implemented in the application lifecycle.** `projectRevision`, `createProjectDirtyState`, `markProjectChanged`, and `markProjectSaved` provide deterministic revision and boundary helpers. `SaveSimulation.svelte:89` adds a combined project export while retaining the legacy robot and scene exports. There is no reactive dirty state spanning code, scene, robot connections, season selection, or settings; no unsaved-change prompt; no project-open action; and no tested save, reload, edit, save, reload sequence.

`src/components/SpikeSimulator.svelte:119` copies the scene into runtime state and `src/components/SpikeSimulator.svelte:803` refreshes that copy when creating a run. This is useful for simulation reset, but it is not a durable project snapshot and does not establish Restore Setup behavior. The project capability contract explicitly sets `seasonRestore: false`, and the program restore flag is true only when a workspace was supplied to the save action.

### Season identity and provenance

**Accepted as a domain contract; not accepted as application integration.** `src/lib/fll/season-package.ts:50` defines a versioned `SeasonPackage` with edition, revision, SPIKE Prime platform, field/table dimensions, match duration, 15 missions, per-mission capability status, and source provenance. `season-package.test.ts` verifies the BIOGLOW Founders adapter, mission capability preservation, provenance, and fail-closed lookups.

The UI still defaults to a hard-coded BIOGLOW label at `PracticeReadinessShell.svelte:10`. `SpikeSimulatorWindow.svelte:327` does not pass a `seasonReference` to `SaveSimulation`, so the new project archive records the explicit unselected season even when the UI is operating in BIOGLOW mode. There is no season picker, season switch protection, or project restore of season identity. A second synthetic season cannot be selected through the application.

This leaves a material risk of presenting BIOGLOW assumptions as generic simulator behavior. A second synthetic season with a different mission count and board dimensions cannot currently be loaded and verified through the UI.

### Readiness labels

**Not accepted.** The Practice shell displays Field, Robot, Drive wheels, and Program states. However, field readiness is based on `objects.length > 0`, robot readiness only checks for a loaded model, drive readiness checks for two wheels and motor ports, and program readiness checks for nonempty Blockly top-level blocks. These checks do not prove a complete field, valid robot physics, compatible wheel geometry, or a runnable program.

Mission readiness and scoring capability are absent from the checklist. The Run action therefore has a participant-facing gate, but the gate is not yet a reliable admission test for a valid practice run.

### Regression risk

**Medium to high for pending integration.** Contract tests are green, but no tests cover loading the generated ZIP, restoring project entries, season switching, reactive dirty state, readiness failure cases, or repeated save/reload/reset behavior. The UI implementation remains unverified in an actual browser. Changes to shared `SpikeSimulatorWindow.svelte`, `SpikeSimulator.svelte`, and save/load paths could affect physics initialization, workspace state, and runtime reset ordering even while the current suite remains green.

## Required acceptance evidence

Before approval, the implementation owners must publish checkpoints and provide tests demonstrating:

1. A versioned project archive round trip preserving Blockly state, scene geometry and IDs, robot MPD, ports, wheels, gearing, season identity, and relevant settings. The loader must consume `project.json` and referenced binary entries.
2. Loading a supported legacy archive and rejecting or clearly reporting unsupported versions and malformed nested entries.
3. Dirty state changes for each editable project domain, clean state after save, and unsaved-change protection when loading or switching season.
4. Season identity and provenance rendered from the selected package, with capability and unavailable-scoring states visible to participants, and the selected reference passed into project saves.
5. Readiness labels that fail for missing field, robot, drive, program, and mission capability, with corrective actions and no false green state.
6. Repeatable save, reload, run, reset, and restore tests with no leaked runtime or stale workspace state.
7. Independent QA re-audit after the implementation checkpoints arrive, followed by Firefox, Chromium, keyboard, responsive, and screen-reader evidence for the affected flows.

## Handoff

Changed production paths: none. Owned artifact: this audit only. The current QA checkpoint is recorded in `docs/agent-work/logs/ui-platform-04/platform-qa.jsonl`.

Assumption: the new files and integration shown in the shared tree are the complete handoff. The focused tests establish contract behavior only; they do not establish browser behavior or an end-to-end archive restore. No approval is inferred from the green baseline.

Remaining estimate: unknown until both implementation handoffs publish and the dependent re-audit can run.
