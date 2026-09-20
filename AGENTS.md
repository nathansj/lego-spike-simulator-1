# LEGO SPIKE / BIOGLOW development team

## Purpose

Build a browser-based LEGO FLL BIOGLOW mission practice simulator on the existing
Svelte, TypeScript, Blockly, LDraw/WebGL, and Rapier implementation. The working
target is 2026–27 Founders Edition Challenge with SPIKE Prime; confirm any change
of edition before implementing season rules. See `docs/agent-team.md` for roles,
task handoffs, and the roadmap, and `docs/code-review-2026-09-10.md` for the baseline.

BIOGLOW is the current delivery target within an app intended for multiple FLL
seasons. Keep generic navigation and workflows independent of season assets,
mission counts, edition rules, and scoring. Read `docs/design/fll-experience-brief.md`
for participant workflows, expert setup, and developer diagnostics requirements.

The owner has no physical reference robot to provide. Use the virtual reference
defined in `docs/virtual-reference-robot.md` and proceed autonomously. Missing
hardware does not block implementation, numerical verification, or a clearly
labeled simulation release. Physical calibration remains a separate evidence gate
for claims of real-world accuracy; do not claim or fabricate measurements.

## Working as a team

-   Every agent, including the lead and read-only reviewers, follows
    `docs/agent-work/README.md`. Register every task before delegation, keep an
    evidence-backed work log, and publish checkpoints while working. The lead
    reads the logs before reporting progress and investigates overdue updates.
-   The primary agent acts as `fll_lead`. For substantial implementation work, use
    the relevant specialist subagents when available. Keep simple tasks local.
-   Delegate bounded tasks with explicit file ownership and observable acceptance
    criteria. Prefer at most three concurrent workers. Do not have agents edit the
    same file concurrently; the lead owns shared integration files unless assigned.
-   Read the matching `.codex/agents/fll-*.toml` role instructions. If custom-agent
    selection is unavailable, pass those instructions and the task to an available
    subagent, or perform the role sequentially. Never claim agents ran when they did not.
-   Follow `docs/agent-model-policy.md` for the owner's cost-conscious model
    routing. Project defaults use Sol for coordination and Terra for ordinary
    workers; named roles have explicit model/effort settings. Preserve permission
    settings. Do not change global Codex settings, add paid services, or commit/push
    changes without authorization.
-   Every handoff includes changed paths, behavior, validation results, assumptions,
    and remaining risks. The lead reviews the combined result; QA independently
    verifies important physics, runtime, scoring, and persistence changes.
-   For substantial UI changes, involve `fll_design` for interaction specifications
    and acceptance scenarios, then `fll_experience` for production implementation.
    Practice is the default experience; expert setup and developer diagnostics
    are discoverable opt-ins. Essential errors and fidelity limits remain visible.

## Architecture and correctness

-   Preserve the existing stack and file formats; evolve interfaces incrementally.
-   Scene coordinates use millimeters; Rapier uses meters. Respect existing LDraw
    axis/sign conventions and conversion helpers in `src/lib/physics/units.ts`.
-   Drive simulation from fixed steps. Keep rendering and wall-clock timing out of
    physics and scoring decisions. Test reset and repeatability when state changes.
-   Keep season rules outside the generic physics engine. Prefer explicit bodies,
    colliders, joints, and semantic identifiers over mission-name heuristics.
-   An imported mesh, a sidecar's `mechanics` label, and a passing synthetic test
    do not establish a calibrated mechanism or correct official scoring.
-   For every scoring condition, record the official source/version, observable
    state, evaluation timing, boundary behavior, and tests. Treat missing evidence
    as unverified; never invent scores, geometry, tolerances, or sensor accuracy.
-   Validate scene/project imports and preserve stable IDs, geometry, ports,
    transforms, and physics metadata through round trips and schema migrations.
-   Keep changes focused. Avoid repository-wide formatting and generated output.
    Do not modify the vendored LDraw library unless the task requires it.

## Validation

-   `npm test` runs the current Vitest suite.
-   `npm run check` checks TypeScript and Svelte.
-   `npm run build` builds the browser application.
-   Run targeted tests while developing, then appropriate integration checks.
    Use `npm exec -- prettier --check <changed-files>` for supported file types.
-   Browser changes require exercising the affected user flow when browser tools
    are available; otherwise report the unverified flow explicitly.
-   Physical fidelity requires measured robot/model trials with declared tolerances.
    Distinguish numerical regression tests from real-world calibration.
