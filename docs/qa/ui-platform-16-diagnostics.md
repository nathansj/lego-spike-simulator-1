# UI Platform 16 — Diagnostics Next Slice

Date: 2026-09-16  
Run: `ui-platform-16`  
Task: `diagnostics-next-slice`  
Role: `fll_design` (lead-owned sequential fallback)  
Disposition: proposed implementation slice; no production source changed.

## Scope

Define the smallest credible implementation that lets an expert inspect an
observed robot-contact event without turning the diagnostics console into a
physics-causality detector or claiming a replayable physics state.

The slice covers all three pending diagnostic capabilities:

1. stable body selection and collider highlighting;
2. following the currently selected robot/contact pair; and
3. an event snapshot plus whole-run pause for inspection.

It deliberately does **not** implement per-body freezing, physics rewind, or
mission/scoring conclusions.

## Reviewed evidence

| Existing capability                                                                                  | Evidence                                                                                                  | Consequence for this slice                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Latest warning/error guidance and raw diagnostic text                                                | `src/components/RunLogConsole.svelte`, `src/lib/spike/run-log.ts`                                         | Keep raw text as the audit trail; do not parse it again in the UI to create identities.                                                                           |
| Robot telemetry samples every 0.5 simulation seconds                                                 | `recordCompletedFixedSteps` in `src/components/SpikeSimulator.svelte`                                     | Create typed events at this sampling boundary, alongside the existing log entry.                                                                                  |
| Physics exposes body transforms, a body contact-ID list, and contact points/impulses                 | `PhysicsWorld.getTransform`, `contactBodyIdsForBody`, and `contactsForBody` in `src/lib/physics/world.ts` | Contact body IDs and contact points must remain separate fields because the current API does not identify which other body owns each individual point.            |
| Scene preview only accepts a string selection and renders all runtime objects with collider overlays | `src/components/ScenePreview.svelte` and `select="#all"` in `src/components/SpikeSimulator.svelte`        | Extend selection by stable body ID and add an explicit selected-collider treatment; do not infer selection from display names.                                    |
| Robot view can follow only `scene.robot`                                                             | `robotFocus` in `ScenePreview.svelte` and `SpikeSimulatorWindow.svelte`                                   | Add a bounded pair-focus mode centered on selected bodies' current scene transforms.                                                                              |
| Physics snapshots contain Rapier bytes and the accumulator only                                      | `src/lib/physics/snapshot.ts`; `PhysicsWorld.takeSnapshot`                                                | They cannot safely restore an active run by themselves because VM, hub, drive controller, match clock, diagnostics, and scene/UI state are not captured together. |
| Run pause pauses the VM and preserves the active scene for visual inspection                         | `togglePause` in `src/components/SpikeSimulator.svelte`                                                   | Reuse this whole-run pause for the first slice; do not claim a selected body is frozen independently.                                                             |

The earlier diagnostic reviews are consistent with this boundary:
`docs/qa/ui-platform-14-diagnostics.md` found no structured event or body
selection contract, while `docs/qa/ui-platform-15-diagnostics.md` added only
observation-based guidance. Chromium now verifies the core project/run flow but
not the diagnostic interactions (`docs/qa/ui-platform-15-chromium.md`).

## Proposed product behavior

When a sampled diagnostic contains observed contact IDs for the robot, the
console shows an **Inspect pair** action. It identifies the robot and up to one
selected observed contact body by their stable runtime IDs and friendly labels.
Selecting it:

1. records the selected event as an immutable inspection card;
2. pauses the complete run if it is still running;
3. highlights the robot and selected body/colliders, with a non-colour text
   legend; and
4. follows the midpoint of those bodies' **current paused transforms**.

If an event has multiple observed contact IDs, the user chooses one body from a
short list before invoking **Inspect pair**. The initial selection must not
silently choose a body by array position. If the referenced body is unavailable,
the control stays available as evidence but announces that visual following is
unavailable; it must not substitute another body.

The snapshot is an immutable record of the event fields and the two body
transforms read at selection time. It is an inspection aid only. It does not
restore, replay, mutate, or prove the state of the physics world.

## Interfaces

All names below are proposed TypeScript contracts, not implemented APIs.

### Typed event at the sampling boundary

Create a new pure module such as `src/lib/spike/diagnostic-events.ts`. The
runtime supplies facts; the formatter may still generate the existing raw log
line from the same facts.

```ts
export type DiagnosticEventKind =
    | 'telemetry'
    | 'stationary-contact'
    | 'snag-contact'
    | 'motors-off'
    | 'runtime-unavailable';

export interface DiagnosticContactSample {
    pointMm: { x: number; y: number; z: number };
    impulseNewtonSeconds: number;
}

export interface DiagnosticEventV1 {
    schemaVersion: 1;
    id: string;
    fixedTimeSeconds: number;
    kind: DiagnosticEventKind;
    primaryBodyId: '#robot';
    observedContactBodyIds: readonly string[];
    primaryBodyContacts: readonly DiagnosticContactSample[];
    rawMessage: string;
}
```

Rules:

-   `id` is unique and monotonic for one run, for example `run-3:event-14`; it is
    not a persisted project or official mission identifier.
-   `observedContactBodyIds` is a sorted, deduplicated list returned from the
    physics contact query at the sampling instant. It may include `#mat` or a
    boundary ID; these remain named runtime facts.
-   `primaryBodyContacts` contains only robot contact points/impulses. It does
    **not** map points to individual `observedContactBodyIds` until physics
    exposes that association directly.
-   `kind` describes the diagnostic rule that emitted the event. It must never
    say that a contact _caused_ a snag or a program stop.
-   Empty/missing body IDs and absent contact samples are valid. The console must
    retain and export `rawMessage` for those events.

`RunLogEntry` may carry an optional `event?: DiagnosticEventV1` after this
module exists. Existing free-form entries must continue to render and export
without a typed event.

### Selection and scene-preview contract

Keep inspection state local to the active simulator run; it must not alter a
saved scene or project archive.

```ts
export interface DiagnosticSelection {
    eventId: string;
    bodyIds: readonly [string, string] | readonly [string];
    mode: 'inspect-pair';
}

export interface ScenePreviewDiagnosticFocus {
    selectedBodyIds: readonly string[];
    followBodyIds: readonly string[];
    labelsByBodyId: Readonly<Record<string, string>>;
}
```

`ScenePreview` resolves `#robot` to `scene.robot` and all other IDs through
`scene.objects[].id`. It must match IDs before display names/editor groups.
Selected bodies remain fully bright; non-selected bodies may be dimmed. The
selected collider outlines and joint anchors use a visually distinct treatment,
but the UI also provides text such as `Selected: Robot (#robot) and 45832_01
fixed scenery (45832-01-fixed-scenery)`. The scene preview exposes no click-to-
select requirement in this slice.

### Contact-pair follow

`followBodyIds` has one or two IDs. Each render reads the corresponding current
`scene` object positions and centers the existing camera transform on their
midpoint. It follows bodies while the run is live and holds that last midpoint
after the inspection action pauses the run. It does not change simulation
coordinates, body velocity, motor commands, or camera/scene persistence.

If neither selected ID resolves to a scene object, disable visual follow and
retain the evidence card. If exactly one resolves, center that one body. The
mat and boundary IDs are not focus targets in this slice because they have no
`SceneObject`; their IDs can still be selected and shown in the legend.

### Event snapshot and pause

```ts
export interface DiagnosticInspectionSnapshotV1 {
    schemaVersion: 1;
    event: DiagnosticEventV1;
    capturedAtFixedTimeSeconds: number;
    transformsByBodyId: Readonly<
        Record<
            string,
            {
                positionMm: { x: number; y: number; z: number };
                rotation: { x: number; y: number; z: number; w: number };
            }
        >
    >;
}
```

`Inspect pair` creates this plain-data snapshot first, then invokes the existing
whole-run pause. The UI labels it **Event snapshot — inspection only** and
offers **Resume run**, not **Replay snapshot** or **Freeze body**. Clearing the
run log must not destroy the currently selected snapshot until the run resets,
stops, or the user dismisses it.

The implementation must not call `PhysicsWorld.restoreSnapshot` from this UI
control. A future replay feature needs a versioned, atomic snapshot of Rapier,
VM, Hub, drive state, sensor state, match controller/clock, scene transforms,
and diagnostics state, with deterministic restore tests.

## Smallest delivery plan

1. Add the pure diagnostic event types/builders and unit tests. Populate an
   optional typed event at the existing 0.5-second telemetry boundary without
   changing the current raw log format.
2. Add an `Inspect pair` affordance to the diagnostics console only when a
   typed event reports observed contact IDs. Add explicit body choice for
   multi-contact events.
3. Wire a run-local `DiagnosticSelection` and inspection snapshot through
   `SpikeSimulator.svelte` to `ScenePreview`.
4. Extend `ScenePreview` to resolve body IDs, highlight selected colliders and
   anchors, and center on one/two resolved scene bodies.
5. Browser-test the flow against a constructed contact event and a no-longer-
   resolvable body. Keep per-body freeze, restored snapshots, event-history
   persistence, and JSON export outside this slice.

The proposed writers should be `fll_runtime` for diagnostic event collection,
`fll_experience` for the console/preview interaction, and `fll_qa` for
independent browser and contract review. `fll_physics` reviews only the mapping
between the proposed event fields and the actual Rapier APIs; it does not
validate physical collider fidelity.

## Acceptance tests

### Automated

1. A contact event created from `#robot` and unordered duplicate IDs returns a
   stable, sorted, deduplicated contact-ID list and preserves raw text.
2. An event with no contact IDs has no `Inspect pair` affordance.
3. A multi-contact event requires an explicit body choice; no default first
   body is selected.
4. Existing raw-only `RunLogEntry` values remain visible, filterable, and
   exportable.
5. Selecting a pair captures plain event data and transforms by exact body ID;
   mutating later scene data does not mutate the stored inspection snapshot.
6. ID resolution prefers `SceneObject.id` over equal display name/editor group
   values. `#robot` resolves only to the robot.
7. A missing selected body leaves the evidence card intact and returns an
   explicit unavailable visual-follow state.
8. No test calls `PhysicsWorld.restoreSnapshot` through the inspection action.

Suggested commands after implementation:

```text
npm test -- --run src/lib/spike/diagnostic-events.test.ts src/lib/spike/run-log.test.ts
npm run check
npm test -- --run
npm run build
npm exec -- prettier --check <assigned-files>
git diff --check
```

### Browser acceptance

In both supported browsers, run a scene that produces a robot contact event:

1. Confirm the event names observed body IDs and retains its raw evidence.
2. Choose one contact body, use **Inspect pair**, and confirm the run pauses.
3. Confirm an accessible text legend identifies selected bodies, the pair is
   visibly highlighted, and unrelated bodies are distinguishable without
   relying only on colour.
4. Confirm pair follow centers on the robot/contact pair and stops moving when
   paused; `Resume run` resumes the complete simulation rather than an
   individual body.
5. Confirm selecting a deleted/unavailable body shows a clear unavailable state
   without selecting a different model.
6. Reset/stop the run and confirm selection/snapshot state is cleared; save and
   reload a project and confirm no diagnostic selection or snapshot is persisted.

## Evidence limits and non-goals

-   A Rapier contact observation is evidence of queried collider contact at the
    sampled simulation state. It is not evidence that the contact caused a
    stall, that visual meshes intersect, or that real LEGO parts touched.
-   The current telemetry cadence can miss shorter-lived contacts. The event
    represents only the sampling instant unless a future fixed-step event stream
    is explicitly designed and performance-tested.
-   Contact IDs, points, and impulses are simulation data. They do not calibrate
    masses, friction, geometry, sensor readings, mechanism behavior, or official
    FLL scoring.
-   The inspection snapshot is not a Rapier/VM replay snapshot and must not be
    presented as a reproducible run restore.
-   No conclusion about mission completion, legality, penalties, or physical
    robot behavior may be drawn from this diagnostic UI.

## Recommendation

Accept this as the next bounded implementation contract. It closes the
expert-inspection gap with explicit identifiers and inspection state while
preserving the current evidence boundary. Keep the diagnostics release gate
open until the automated and browser acceptance checks above pass independently.
