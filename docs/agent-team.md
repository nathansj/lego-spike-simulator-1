# BIOGLOW simulator development team

## Working target

A student or coach can load the BIOGLOW field, configure a SPIKE robot and its
attachments, import or create a block program, run missions, inspect sensor and
score explanations, reset, and save/reload the project. A complete release needs
all official missions and applicable match rules, not just visible mission models.

Provisional scope: 2026–27 BIOGLOW Founders Edition Challenge, SPIKE Prime,
Blockly first, local browser execution. The owner has no physical reference robot
to provide; use [the virtual reference](./virtual-reference-robot.md) and proceed
without making hardware availability a prerequisite. First-release priorities and
target browser hardware remain open for discussion with the owner.
Python support, a full CAD editor, and direct robot upload are separate scope
decisions, not assumed deliverables of the first release.

FIRST distinguishes Founders and Future editions. The season materials page lists
the Challenge rulebook and updates, including an update dated September 2, 2026
when checked on September 10. Rules must be verified against the selected edition
and current updates before implementation. [FIRST season materials][season]

## Roster

The primary conversation coordinates the team. These are reusable role definitions,
not seven permanently running processes. Expertise is enforced through bounded
ownership, evidence, tests, and independent review.

| Agent            | Responsibility                                                          | Default ownership                                                                     | First bounded assignment                                                          |
| ---------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `fll_lead`       | Architecture, task sequencing, interfaces, integration                  | Shared contracts, integration wiring, project documentation                           | Turn baseline findings into small tasks; agree simulation/mission interfaces      |
| `fll_rules`      | Official rules, mission state, explainable scoring                      | Proposed `src/lib/fll/`, rule-source records, scoring tests                           | Verify M01 and global match rules; write a sourced scoring specification          |
| `fll_physics`    | Robot motion, contacts, joints, sensors, calibration                    | `src/lib/physics/` except model sidecars; `src/lib/spike/simulation*`                 | Reproduce encoder/sensor issues, then validate M01 mechanics with measured inputs |
| `fll_runtime`    | SPIKE block semantics and project compatibility                         | `src/lib/spike/vm.ts`, `src/lib/blockly/`, `src/lib/scratch/`                         | Add VM conformance regressions for motor duration and program cancellation        |
| `fll_assets`     | LDraw ingestion, field placement, mechanism sidecars, scene persistence | `src/lib/ldraw/`, model sidecars, `scene.ts`, `scene-schema*`, scoped asset additions | Inventory mission models and provenance; fix geometry persistence by stable ID    |
| `fll_experience` | Student/coach workflows, views, diagnostics, accessibility              | `src/components/`, `src/pages/`, `src/app.css`                                        | Define and test load → configure → run → inspect → reset workflow                 |
| `fll_qa`         | Independent review, reproducible scenarios, release evidence            | Assigned test/fixture paths and validation reports                                    | Reproduce baseline defects; propose a full mission acceptance matrix              |

Ownership is a coordination default, not a security boundary. The lead assigns
shared files such as `SpikeSimulator.svelte`, `LoadScene.svelte`, `SaveSimulation.svelte`,
`physics/types.ts`, and package/configuration files to one writer per task.
QA tests next to production code must also have explicit ownership.

## How to use the team

Start a fresh Codex session in this repository after the role files are installed.
Project custom agents are standalone TOML files under `.codex/agents/`; each declares
its name, description, instructions, model, and reasoning effort. Permissions
inherit from the parent. The project configuration sets cost-conscious defaults;
see [the model policy](./agent-model-policy.md) for assignments, task-specific
routing, and escalation. This follows the [official custom-agent documentation][agents].

Start with this prompt:

> Act as fll_lead. Read AGENTS.md, docs/agent-team.md, and the baseline code review.
> Start milestone 0. Use fll_rules to verify the BIOGLOW Founders Challenge source
> set, fll_runtime to reproduce and fix one motor-duration defect, and fll_assets
> to fix duplicate-name scene geometry persistence. Assign disjoint files, add
> focused regressions, and have fll_qa review the integrated result. Report verified
> behavior and outstanding decisions. Do not commit or push.

For a smaller task:

> Use fll_runtime to reproduce the stop-other-stacks behavior, fix it, and add a
> regression with two running stacks. Have fll_qa independently review the patch.

If the session does not expose named custom agents, ask the primary agent to read
the relevant TOML instructions and include them in ordinary subagent assignments.
If no delegation tool is available, use the same roles sequentially. Existing
sessions may not discover newly created role files until restarted.

## Handoff contract

Each task should fit one reviewable patch and include:

```text
Task ID and owner:
User-visible outcome:
Inputs and source versions:
Dependencies / agreed interface:
Allowed write paths:
Acceptance scenarios and tolerances:
Validation commands:
Return: changed files, evidence, assumptions, unresolved risks
```

The lead stays on the critical integration path, delegates independent work, and
collects results before accepting a milestone. Run only the specialists needed;
start with no more than three concurrent workers to keep integration manageable.
Where separate working copies are used, integrate and test the actual combined
patch. A worker's test result does not certify the merged result.

## Architecture direction

Retain the existing implementation and introduce testable boundaries:

1. A versioned season package identifies field dimensions, placements, asset IDs,
   body/joint IDs, mission definitions, and rule-source revisions.
2. The Blockly/VM layer produces motor commands and consumes sensor readings.
3. The simulation layer advances a fixed number of physics steps and exposes
   body poses, joint state, contacts, sensors, and simulation time.
4. A match controller owns start, interruption, relaunch, finish, and reset state.
5. Pure scoring functions consume explicit world/match observations and produce
   condition-level explanations. They must not infer completion from appearance.
6. Svelte presents the state and dispatches actions. Rendering frequency must not
   alter mission outcomes. Saving a project preserves reproducible inputs.

These are proposed contracts, not existing APIs. Agree their minimum shape before
parallel implementation. Add a schema version only where persistence changes need
one, and supply migration/round-trip tests for supported older files.

## Delivery roadmap

### Milestone 0: trustworthy baseline

-   Reproduce and prioritize the concrete defects in the code review.
-   Stabilize motor commands, stop/reset behavior, and scene persistence.
-   Inventory actual assets separately from mission labels and placeholder physics.
-   Record the selected official rulebook/update versions and reference robot.

Exit: focused regressions pass, existing tests/check/build pass, and a saved
baseline scene reloads with the same geometry, transforms, IDs, and settings.

### Milestone 1: one complete mission

Use M01 Drone Survey as the first candidate because an articulated sidecar and a
physics fixture already exist. Verify its geometry and intended motion against
official model instructions; the fixture alone is not a complete official mission
implementation. Record any unsourced dynamics as assumptions.

-   Assemble a verified field placement and a configurable reference robot.
-   Execute a block program that physically interacts with the mechanism.
-   Wire the source-backed M01 scorer to mechanism observations and an explanation
    panel; its pure rule contract is already in `src/lib/fll/drone-survey.ts`.
-   Test success, failure, boundary conditions, repeated runs, and reset.
-   Verify kinematic expectations, repeatability, and parameter sensitivity with
    the virtual reference. Add measured trials when available; do not require
    the owner to supply a robot before completing this implementation milestone.

Exit: a browser demonstration and an automated program → physics → score scenario
agree; reset restores all bodies, joints, motor/VM state, and mission state.

### Milestone 2: reusable mechanisms and robot attachments

Build joint/actuation capabilities as missions need them: hinges, sliders, latches,
springs, movable pieces, and motor-connected attachments. Verify attachment
transforms and sensor poses. Group missions by verified mechanism complexity after
the rules/asset inventory; do not equate `mechanics` labels with working behavior.

Exit: every reused mechanism has observable acceptance scenarios and documented
parameter sources or assumptions, with no hidden mission-specific forces in the
generic engine. Physical calibration is tracked separately and remains unverified
until supported by measurements.

### Milestone 3: full BIOGLOW match

Cover all 15 missions listed by the [regional program partner][missions], including
M14/M15, which have no corresponding sidecars in the current checkout. Verify each
mapping against FIRST materials rather than deriving mission IDs from filenames.

Add the complete mat/placements, sourced match timing, home/launch behavior,
interruptions, applicable penalties/bonuses/shared conditions, and final scoring.
Where an external team's action matters, define explicit scenario inputs.

Exit: each rule has a positive, negative, boundary, and timing/reset scenario where
applicable. One full match can be started, completed, explained, saved, and replayed
or reproduced from recorded inputs.

### Milestone 4: usable practice release

Provide presets, reliable robot/attachment configuration, project save/load,
sensor overlays, run comparison, useful error messages, and keyboard access.
Verify classroom hardware/browser targets and the advertised offline workflow.
Choose performance budgets using measurements on the agreed target device.

Exit: a coach can independently complete the full workflow; no selected mission
is silently simulated with placeholder mechanics or unverified scoring. Publish
known fidelity limits and calibration evidence alongside the release.

## Decisions to make together

-   Confirm Founders Edition Challenge and the preferred initial focus: mission
    practice, detailed robot/attachment physics, or guided learning.
-   The initial robot is the documented virtual reference; select configurable
    attachments as mission requirements establish a need.
-   Locate official mission CAD/mat/setup sources independently. Physical models
    or third-party measurement evidence can improve later calibration.
-   Choose supported browsers/devices and whether offline use must work from a
    direct file, a local server, or an installed web app.
-   Establish numerical acceptance criteria now. Establish physical-fidelity
    tolerances only when repeatable measurement evidence becomes available.

Continue independent baseline work while these decisions are open. Do not invent
measurements or official rule interpretations to bypass a missing input.

[agents]: https://learn.chatgpt.com/docs/agent-configuration/subagents
[season]: https://www.firstinspires.org/resources/library/fll/season-materials
[missions]: https://education.theiet.org/first-lego-league-programmes/challenge/about-first-lego-league-challenge/host-resources
