# UI Platform 08: Season Readiness QA

## Baseline audit

Date: 2026-09-15. Scope: source and focused automated validation only. No
production code was changed by QA.

| Area | Baseline finding | Decision |
| --- | --- | --- |
| Season package | `src/lib/fll/season-package.ts` provides a versioned package, identity, provenance, field/match data, and per-mission capability status. | Accept contract for review; UI integration not demonstrated. |
| Practice identity | `src/components/PracticeReadinessShell.svelte:10` defaults `seasonLabel` to `BIOGLOW · Founders Edition`; `SpikeSimulatorWindow.svelte:565` does not pass the active package label. | Block dynamic-season acceptance. |
| Mission readiness | `src/components/BioglowMissionReadiness.svelte:3-9` imports BIOGLOW catalog data directly; its heading and M02 inspection are fixed to BIOGLOW. | Block multi-season acceptance. |
| Corrective actions | Readiness shows status/details and setup buttons exist in the Practice shell, but mission capability failures do not expose a package-driven corrective action or mission selection. | Block participant readiness acceptance. |
| Restore identity | `SpikeSimulatorWindow.svelte:488-499` recognizes only `BIOGLOW_FOUNDERS_SEASON_PACKAGE`; unavailable seasons are cleared rather than selected from a registry. `project-contract.ts:69-74` declares `seasonRestore: false`. | Block season restore acceptance. |
| Provenance | Package-level sources exist, but the visible readiness component renders catalog source details rather than the active package provenance and does not expose package revision/platform dynamically. | Partial only. |
| Save/dirty wiring | Save receives `activeSeasonPackage`; dirty revisions include `activeSeasonPackage?.id`, and load/save transitions are covered by focused tests. | Accept existing code-level scope; season switching remains unverified. |

## Focused validation

`npm test -- --run src/lib/fll/season-package.test.ts src/lib/spike/project-contract.test.ts src/lib/spike/project-dirty-state.test.ts src/lib/spike/project-archive.test.ts src/lib/spike/project-restore.test.ts`

Result: 5 files passed, 17 tests passed. Vite emitted existing configuration and
dependency deprecation warnings; no test failure occurred.

## Required re-audit gates

After the season-readiness implementation handoff, QA must verify a non-BIOGLOW
package through the UI, package revision/provenance display, unavailable and
partial mission states, actionable remediation, project save/load identity, and
dirty-state confirmation on season changes. Browser keyboard/focus behavior,
Firefox/Chromium behavior, and participant usability remain separate evidence
gates and are not established by this source audit.

Decision: **not approved at baseline; awaiting implementation handoff**.
