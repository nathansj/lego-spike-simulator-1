# FLL audience fit: UI review

Prepared September 14, 2026. Status: team-reviewed source-based assessment; browser
and participant validation pending. This report records the current UI and proposed
improvements, not a claim that the design brief has been implemented.

## Assessment

The simulator has useful foundations for coached practice and technical development,
but the current interface requires too much setup knowledge for independent use
by a first-time FLL participant. This is an assessment from code and workflow
inspection, not an observed usability-study result.

The most valuable next change is a guided Practice workspace with visible readiness
and clear run/results actions, supported by opt-in Expert Setup and Developer
Diagnostics. Season-specific content should come from a package contract before
the app advertises support for additional seasons.

## Review provenance

-   `fll_design` conditionally approved the proposed direction for implementation
    planning, while withholding release approval for independent student use.
-   The received `fll_experience` review traced setup, programming, execution,
    diagnostics, and persistence, and identified implementation and state-contract
    gaps. Runtime agent: `01a09d42-1a36-76a2-a160-f67f9383cf6b`.
-   `fll_qa` independently audited the acceptance scenarios and blocked full team
    approval because the required Practice flow, season package, diagnostics,
    persistence, and browser/accessibility evidence are not complete.
-   The lead rechecked the current toolbar, run console, settings, mission readiness,
    save controls, layout, and canvas evidence while preparing this report.
-   The consolidated team decision is **not approved for release**. The design
    direction is conditionally approved for implementation planning; the current
    application is not fully approved until the blocking work and validation below
    are complete.
-   No browser walkthrough, screen-reader check, classroom-device performance test,
    or participant/coach usability session was performed for this assessment.

## What already helps

-   Blockly programming and the visual field support a useful program/run/observe
    practice cycle. The simulator toolbar exposes robot, scene, run, stop, and save
    actions, and includes a named reference-robot action.
-   Port and wheel configuration, scene editing, and library loading provide the
    building blocks for expert setup and custom robot experiments.
-   Mission readiness distinguishes implementation evidence from physical
    calibration. Preserve that honesty when simplifying the presentation.
-   Run logs are newest-first with timestamps and severity labels. Collider/joint
    overlays provide diagnostic evidence that was previously difficult to see.

Evidence: [simulator toolbar](../../src/components/SpikeSimulatorWindow.svelte),
[mission readiness](../../src/components/BioglowMissionReadiness.svelte), and
[run console](../../src/components/RunLogConsole.svelte).

## Audience fit

| Audience               | Current fit, inferred from source               | Main obstacle                                                             |
| ---------------------- | ----------------------------------------------- | ------------------------------------------------------------------------- |
| First-time participant | Needs substantial guidance                      | Setup and technical controls compete with the practice task               |
| Returning participant  | Useful with a prepared scene/robot              | Readiness, reset, results, and saving lack one coherent journey           |
| Coach                  | Useful setup foundations                        | Difficult to prepare and explain a reproducible student workspace         |
| Expert user/developer  | Broad controls, incomplete diagnosis flow       | Raw telemetry does not directly select and explain the implicated objects |
| Team changing seasons  | Design intent exists; workflow not demonstrated | BIOGLOW/M01 presentation is directly wired into the simulator             |

## Findings and priorities

### P1: Make the first practice run understandable

The toolbar mixes robot loading, ports, wheel connections, scene setup, LDraw
libraries, camera, settings, M01 calibration, and run controls. Many actions are
icons explained by tooltips. A beginner must infer the setup order and vocabulary.
The main toolbar also includes an M01 calibration file picker.

Provide a short sequence: choose field/mission, choose robot, program, run, inspect,
retry. Add a readiness card for field, robot, drive configuration, program, and
scoring capability, with links to corrective actions. Keep running without verified
scoring distinguishable from an invalid drive setup. Use visible action labels.
Move calibration editing into Expert Setup while keeping its capability notice
visible in the selected mission's Practice panel.

Evidence: `SpikeSimulatorWindow.svelte`, toolbar and `startRobot`;
`WheelConnector.svelte`, wheel/motor and gear-ratio configuration.

### P1: Separate practice controls from technical settings

The settings modal combines program-step delay, startup delay, time scaling,
boundary scale, collision display, collider/joint display, and physical encoders.
During runs, `SpikeSimulator.svelte` passes `showPhysicsDebug={true}`, overriding
the normal off state in `ScenePreview.svelte`.

Introduce Practice, Expert Setup, and Developer Diagnostics as presentation modes.
Keep essential errors and fidelity notices visible in all modes. Describe each
setting's units, effect, persistence, defaults, and whether changing it requires
restart. Make optional technical overlays controllable rather than always visible
in Practice. Do not alter solver behavior merely by changing presentation modes.

Evidence: [settings](../../src/components/SimulatorSettings.svelte),
[simulator](../../src/components/SpikeSimulator.svelte), and
[scene preview](../../src/components/ScenePreview.svelte).

### P1: Turn diagnostic evidence into an understandable result

The run console is a fixed-width panel with small monospace text. It scrolls to
the top after updates and offers Clear, but no filter, reading pause, export,
or direct object-inspection action. Long telemetry messages obscure the useful
event and automatic scrolling can interrupt reading.

Practice needs a short symptom summary and next action. For example: “The robot
is stationary while its drive motors are commanded on; contact is reported with
Fixed scenery.” Avoid claiming contact alone proves the cause. Provide details
that select the implicated bodies, show matching runtime colliders/contact points,
and preserve the first relevant event. Add filters, freeze/follow, and reproducible
export in Developer Diagnostics. Use structured events rather than parsing prose.

Evidence: [run console](../../src/components/RunLogConsole.svelte).

### P1: Make state and saving explicit

Program export and robot/scene export are separate operations. The received review
also identifies a need to clarify run restart/disposal behavior for participants.
Define Stop, Pause, Reset Run, and Restore Setup separately; show what each action
preserves. A project-level save/dirty contract should include program, scene,
configuration, and selected season/version. Preserve existing import/export formats
while introducing the combined workflow.

Evidence: [program export](../../src/components/BlocklyComponent.svelte),
[simulation export](../../src/components/SaveSimulation.svelte), and
`SpikeSimulator.svelte`'s `startOrPauseSimulation`.

### P1: Verify keyboard access and classroom layouts

The code/simulator workspace uses a horizontal flex layout; scene editing contains
fixed-width control groups, and the preview canvas has no fallback description.
The experience reviewer also flagged global editor keyboard movement and hub
mouse-down controls for browser verification. The main toolbar wraps, so source
inspection alone does not establish exactly where narrow layouts fail.

Test keyboard-only setup/run/stop/reset/save, modal focus and return, text inputs
while an object is selected, and a narrow laptop viewport with browser zoom.
Provide a textual board/mission-state alternative and a responsive workspace
switcher where simultaneous panels become impractical. Review live-region output
so frequent raw telemetry does not overwhelm assistive technology.

Evidence: `BlocklyComponent.svelte`, `LoadScene.svelte`, `ScenePreview.svelte`,
and `RunLogConsole.svelte`. These are risks to verify, not measured failure rates.

### P2: Make seasonal adaptability explicit

The UI directly exposes BIOGLOW's 15-mission readiness table and M01-specific
calibration/scoring. These are useful current-season features, but do not establish
a reusable season-selection workflow.

Define a versioned season package with edition/revision, field assets/dimensions,
mission list, setup presets, rule sources, and capability/calibration status. Show
the selected package clearly. Handle missing packages, incompatible projects,
and switching with unsaved changes. Validate the shell using BIOGLOW and a clearly
labeled synthetic season with a different field size and mission count.

Evidence: `BioglowMissionReadiness.svelte`, `SpikeSimulatorWindow.svelte`, and
[design brief](./fll-experience-brief.md). No second official season is claimed.

## Recommended next delivery

1. `fll_design`: specify one beginner practice flow, readiness states, labels, and
   the boundary between Practice and technical setup; produce annotated wireframes.
2. Lead with assets/rules/runtime/physics as needed: agree readiness, project-save,
   season-capability, and diagnostic-event contracts for that bounded flow.
3. `fll_experience`: implement the Practice entry and readiness panel, retaining
   existing expert tools behind clear navigation.
4. `fll_qa`: independently exercise the acceptance scenarios below; designer
   checks the implementation against the agreed interaction specification.

The team must repeat QA and design sign-off after each bounded implementation
slice. Full approval requires all release blockers to be closed and browser/
accessibility evidence attached; automated tests alone are insufficient.

## Acceptance scenarios still to validate

-   A new participant opens a prepared project, understands readiness, runs a
    program, inspects a result, resets, and saves without entering diagnostics.
-   Missing robot parts or disconnected drive wheels produce named corrective
    actions; unavailable scoring is clearly distinguished from failed simulation.
-   An expert selects a reported contact body and compares visible geometry with
    its runtime collider while retaining the relevant log event.
-   A coach saves and reloads the same program, robot setup, scene, and season;
    changing season cannot silently discard edits or substitute mission rules.
-   Keyboard-only use, focused text input, readable status, browser zoom, and narrow
    layouts work in Firefox and Chromium on agreed classroom devices.

These scenarios are proposed release evidence, not passing tests. Participant
usability and physical fidelity remain separate validation activities.
