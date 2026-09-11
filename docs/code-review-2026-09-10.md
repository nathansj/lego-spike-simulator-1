# Simulator review: September 10, 2026

Reviewed baseline: `dbd755b` on `codex-commit-current-changes`.
Scope: simulation/physics, VM/Blockly/import-export, scene loading/saving, asset
readiness, and architecture for a complete BIOGLOW simulator. Two independent
specialist agents reviewed physics and programming execution. This is a focused
readiness review, not an exhaustive audit or a physical-fidelity certification.

## Assessment

Keep the existing codebase. It already has a useful Svelte/TypeScript application,
Blockly editing and SPIKE project support, LDraw import/rendering, port/wheel setup,
versioned scenes, a fixed-step Rapier integration, and physics regression fixtures.
The next investment should be trustworthy runtime behavior and one complete
mission before broadening the mission catalog.

There is no dedicated season/match/scoring domain in the reviewed source tree.
Thirteen named mission sidecars exist, but only M01 contains multiple bodies and a
joint; M02–M13 are fixed-body placeholders. No corresponding M14/M15 sidecars or
complete BIOGLOW field preset were found in the checkout. Asset labels do not
establish that the actual mission CAD, official placements, or mechanics are ready.

## Prioritized defects

P1 means incorrect behavior that blocks reliable program or mission practice.
P2 means important correctness work with a narrower trigger. Runtime/physics
reproductions below were reported by the specialist review agents using headless
probes; these probes are not committed regression tests. UI findings are traced
from code and still need browser/integration reproduction.

### P1: degree-based motor commands run 360 times too long

`src/lib/spike/vm.ts:826` uses a degree count with revolution duration without
converting degrees to revolutions. The runtime reviewer observed a 90-degree
command scheduling approximately 53.33 seconds instead of 0.148 seconds at the
default speed. This makes attachment positioning fundamentally incorrect.

Owner: `fll_runtime`. Add a regression comparing equivalent degree/revolution
commands, including signs and completion, then correct the conversion.

### P1: cancelling a stack leaves its timed motor running

`src/lib/spike/vm.ts:2721` stops the thread without finalizing its suspended
generator. Motor shutdown is after the timed wait at `src/lib/spike/vm.ts:666`.
The reviewer cancelled a one-second motor command using stop-other-stacks; the
motor remained on after two seconds while its thread was stopped.

Owner: `fll_runtime`. Test mid-command cancellation, nested commands, stale waits,
and an unrelated stack continuing normally. Define command ownership before
introducing cleanup so one cancelled task cannot stop another task's newer command.

### P1: synchronous repeat bodies monopolize the scheduler

`src/lib/spike/vm.ts:2027` can repeat without yielding when its body is synchronous.
The runtime reviewer observed 100,000 variable increments in one generator advance.
Large repeat counts can block physics, rendering, other stacks, and Stop handling.

Owner: `fll_runtime`. Add bounded fairness/cancellation scenarios for repeats and
procedure nesting; make execution cooperative without relying on wall-clock sleeps.

### P1: gyro-controlled behavior depends on frame batching

`src/lib/spike/simulation.ts:172` batches control/physics steps before scene sync;
hub yaw is updated at `src/lib/spike/simulation.ts:213`. A reviewer gyro-stop probe
ended at approximately −0.955 degrees using four separate advances versus −1.910
degrees using one four-step advance. A fixed physics timestep alone therefore does
not make control feedback independent of rendering cadence.

Owner: `fll_physics`. Update control-visible pose on each fixed step and compare
sensor traces/final transforms for equivalent elapsed time split into different
frame partitions. Confirm the expected read-before/after-step ordering with runtime.

### P1: program round trips discard variable values and list contents

`src/lib/scratch/blockly.ts:159` imports variable declarations without preserving
their values; `src/lib/scratch/blockly.ts:733` exports zeroes and empty lists.
The reviewer observed `distance = 42` becoming `0` and `[10, 20]` becoming `[]`.
`src/components/BlocklyComponent.svelte:292` reaches this exporter from the Save UI.
Saved calibration or route data can be lost without an error.

Owner: `fll_runtime`. Create representative import → export → import fixtures
covering scalar values, lists, names/types, and execution initialization.

### P1: scene geometry is keyed by editable names and can be overwritten

`src/components/SaveSimulation.svelte:48` writes geometry to `bricks-${obj.name}`.
`src/components/LoadScene.svelte:211` permits renaming without uniqueness checks,
and `src/components/LoadScene.svelte:485` looks geometry up by the same name.
Two differently shaped objects with the same display name therefore share one
archive entry; the later write replaces the earlier geometry. This is a code-traced
data-loss path, not yet a browser-reproduced finding.

Owner: `fll_assets`, with shared UI files assigned by the lead. Key archived
geometry by stable identity, retain a migration path for old archives, and test
duplicate display names through an actual archive round trip.

### P2: loading another robot retains the previous collision shape

`src/components/SpikeSimulator.svelte:198` preserves `old.robot.physics` whenever
present, including physics generated for the previous imported robot. Loading a
second differently sized model updates its mesh but can keep the first model's
colliders. Rendering and contact behavior then disagree. This is a code-traced
finding requiring a two-model integration reproduction.

Owner: `fll_experience` with `fll_assets`/`fll_physics`. Define how generated versus
user-authored physics are associated with model identity; test loading two models
and preserving intentional saved overrides for the correct model.

### P2: snapshots omit application-level physics state

`src/lib/physics/world.ts:453` saves Rapier state and an accumulator, while restore
at `src/lib/physics/world.ts:465` clears broken-joint flags and planar-release timers.
The physics reviewer found a broken joint reporting intact after restoring its
post-break snapshot, and different sled motion after restoring during release.

Owner: `fll_physics`. Capture all behavioral state required by the supported
snapshot contract; compare state and subsequent trajectories after mid-run restore.
The existing initial-reset tests do not prove checkpoint replay works.

### P2: physical encoder readings depend on wheel count

`src/lib/physics/drive.ts:275` updates a motor encoder inside the per-wheel routine.
The reviewer observed one-step encoder travel doubling from about 17.052 degrees
to 34.105 degrees when adding an identical wheel on the same motor port at the
same chassis velocity. This affects the opt-in physical encoder mode.

Owner: `fll_physics`. Aggregate observations per motor and compare equivalent
two-wheel/four-wheel configurations, gearing, and signs.

## Explicit implementation gaps

| Gap                                                      | Evidence                                                                                                         | Required next evidence                                                                     |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| M02–M13 mechanics are placeholders                       | Sidecars contain one fixed segment and no joints; e.g. `src/lib/physics/model-sidecars/45832_03.physics.json:14` | Per-mechanism actuation, limits, release, and reset tests plus measured calibration        |
| Latch threshold is contact-based, not general joint load | `src/lib/physics/world.ts:357`; review probe's 1 N latch remained attached under sustained 100 N applied force   | Agreed release-load semantics; sustained pull and transmitted/distributed load tests       |
| IMU capabilities are incomplete                          | Exposed blocks in `src/lib/blockly/toolbox.ts:315`; pitch/roll zeroes in `src/lib/spike/vm.ts:1756`              | Capability matrix, supported sensor tests, and explicit diagnostics for unsupported blocks |
| Full match/scoring layer is absent                       | `src/lib/spike/scene.ts:23` describes physical objects; no dedicated scoring/match module found                  | Versioned official rules, condition-level score tests, match lifecycle, reset              |
| Readiness documentation overstates scope                 | `PHYSICS_IMPLEMENTATION_PLAN.md:3` calls its physics pass complete                                               | Distinguish that completed pass from complete BIOGLOW physics and mission coverage         |

The official regional resource index lists 15 missions, including M14 Seeds of
Renewal and M15 Biocentric Architecture. Mission count and labels should be checked
against the selected FIRST rulebook before creating the season package.
[BIOGLOW mission resources](https://education.theiet.org/first-lego-league-programmes/challenge/about-first-lego-league-challenge/host-resources)

## Validation baseline

-   `npm test`: 7 files / 42 tests passed.
-   `npm run check`: 0 errors / 0 warnings from Svelte diagnostics.
-   `npm run build`: passed; production HTML approximately 4.81 MB (1.58 MB gzip).
-   Existing tooling emitted Vite configuration/deprecation and stale Browserslist
    notices. These were not changed as part of this review.
-   No browser walkthrough or physical-robot calibration was performed.
-   Whole-repository lint was not run; this work adds documentation and agent roles.

All seven agent files parse as TOML; required fields, unique names, roster, local
links, and Markdown formatting pass validation. Named-agent discovery has not
been smoke-tested in a fresh session. The installed CLI does not support
`--strict-config` with `features list`, so that command provided no validation.

The follow-up implementation has fixed the degree-duration defect, frame-batching
gyro feedback, scene archive identity collision, and VM cancellation cleanup. The
new cancellation test verifies that a timed motor stops immediately and cannot
resume after VM cancellation. Remaining review findings are tracked by the team
roadmap; the agent roster and milestone acceptance criteria are in [the team
guide](./agent-team.md).
