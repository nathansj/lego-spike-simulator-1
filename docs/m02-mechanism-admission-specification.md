# M02 mechanism admission specification

**Status:** blocked pending asset and mechanism evidence  
**Mission identifier:** M02  
**Mission name:** Exploding Seeds  
**Scope:** admission requirements for a future M02 model/mechanism implementation;
this document does not authorize a sidecar, fixture, scorer, or physics change.

## Evidence boundary

This specification was prepared from the repository inputs below on September 11, 2026. It is not an official field, model, mechanics, placement, or scoring
definition.

The separate source record in
`src/lib/fll/m02-exploding-seeds-source-record.ts` captures the currently verified
M02 scoring and timing facts. This document intentionally focuses on the evidence
still required to admit simulator mechanics.

-   `src/lib/fll/bioglow-mission-catalog.ts` records M02's mission identity from the
    current scoresheet and supporting regional mission index. It does not establish
    complete rulebook coverage, mechanics, placement, or calibration.
-   `src/lib/physics/model-sidecars/45832_02.physics.json` is a repository sidecar,
    version 1. It is not an official source or a calibrated model.

The source record identifies official M02 model instructions, and the repository
now records a source-backed scoring contract plus a fail-closed observation
boundary. No admitted model asset, field-setup extraction, measurement record, or
calibration trial is present in this checkout. Consequently, no source-backed
simulator geometry or mechanics are currently available.

## Source-backed model facts

| Fact                                                                        | Evidence                                                                       | Status     |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------- |
| Official mission identity and title                                         | FIRST software scoresheet mission entry and supporting regional mission index. | Located    |
| Official model/build composition                                            | Official M02 building instructions, Build Bag 3, pages 1-15.                   | Located    |
| Field placement, orientation, and registration                              | No official M02 field-setup source is recorded.                                | Unverified |
| Moving members, latch, and release behavior                                 | No official mechanics source or measurement record is recorded.                | Unverified |
| Geometry, dimensions, masses, friction, forces, travel, anchors, and limits | No source or measurement record is recorded.                                   | Unverified |
| Reset configuration and repeatability behavior                              | No source or reset trial is recorded.                                          | Unverified |

The ID and name identify the admission target. They do not establish source-backed
model geometry, mechanics, placement, or calibration.

## Repository placeholder metadata

The committed M02 sidecar currently contains the following implementation inputs:

| Sidecar field                        | Committed value                                                            | Interpretation boundary                                                                                        |
| ------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `version`                            | `1`                                                                        | Sidecar schema/version metadata only.                                                                          |
| `model`                              | `45832_02.mpd`                                                             | Candidate filename only; no MPD is committed and mesh identity is unverified.                                  |
| `mission`                            | `Exploding Seeds`                                                          | Label agrees with the catalog identity; it is not evidence of model geometry or mechanics.                     |
| `mechanics`                          | `release`, `dynamic-pieces`, `latch`                                       | Labels only; they do not identify bodies, establish motion, or define behavior.                                |
| `tuningStatus`                       | `baseline-collider; anchors and limits require measured model calibration` | An explicit warning that anchors and limits are not calibrated.                                                |
| `segments`                           | One segment, ID `45832-02-model`                                           | A single model-wide partition, not evidence of a stationary structure, latch, or separately movable pieces.    |
| `body.bodyType`                      | `fixed`                                                                    | Current placeholder behavior. It does not represent confirmed M02 mechanics.                                   |
| `body.autoCollider`                  | `true`                                                                     | Requests generated collision treatment for the one placeholder segment; it is not verified collision geometry. |
| `body.friction` / `body.restitution` | `0.7` / `0`                                                                | Repository tuning values, not sourced or calibrated physical properties.                                       |
| `body.colliders`                     | Empty array                                                                | No explicit collider evidence is represented.                                                                  |
| `joints`                             | Empty array                                                                | No joint, latch, release relation, anchor, axis, limit, or actuation is implemented.                           |

The inventory also records a single dynamic 100 mm box in
`src/lib/physics/fixtures/drone-scene.json`. That object is not an M02 mission
fixture and is not evidence of M02 geometry, mechanics, placement, or reset.

## Required evidence before implementation

All entries in this section are admission evidence, not values to infer. Each
record must identify the source/version or measurement method, date, reviewer,
and any remaining uncertainty. Keep source-backed values distinct from simulator
assumptions and label every assumption as such.

### Asset and placement evidence

-   A versioned official-source record that identifies the selected Founders Edition
    rulebook and applicable Challenge Updates, M02's official identity, model/build
    instructions, field-setup instructions, and permitted asset terms.
-   A permitted M02 model asset or a documented absence of one, with filename,
    source identifier, file hash or equivalent version identity, units, coordinate
    convention, root origin, scale, and rotation convention.
-   A reproducible import record that proves the admitted asset resolves its
    dependencies and preserves stable model/segment identifiers.
-   Source-backed placement evidence defining the field reference, translation,
    rotation, and any registration relationship needed to place the model. Do not
    substitute a visual alignment for a recorded reference.
-   A reviewed partition of the admitted geometry into stationary structure and
    every independently moving member. Each partition needs a stable ID, its source
    basis, and an initial pose/state.

### Joint, latch, and release evidence

-   For each actual constrained relation, an evidence record naming its two bodies
    (or body and world), relation type, physical anchor locations, axis or axes,
    permitted travel, stops, initial state, and source/measurement basis.
-   For any latch, an evidence record defining the retained bodies, latched state,
    release trigger, release transition, whether re-latching is possible, and the
    observable state that proves the transition. No label may stand in for these
    facts.
-   For each released or loose member, an evidence record defining its initial
    support/constraint state, all contacts that govern its departure, and the
    intended post-release degrees of freedom.
-   A separately labeled physics-parameter record for any mass, center of mass,
    friction, restitution, damping, spring, motor, impulse, or force required by the
    selected representation. Every value must be source-backed, measured, or clearly
    declared as an uncalibrated simulator assumption; no value is admitted yet.

### Collider evidence

-   A collider plan for every stationary and moving partition, with a stable
    collider ID, owning body, primitive or compound shape, local pose, material
    parameters, collision filtering, and source/measurement basis.
-   Evidence that distinguishes visual mesh geometry from collision geometry and
    explains every intentional simplification, gap, overlap, or exclusion.
-   Reproducible checks of initial non-penetration and intended contact behavior at
    the sourced initial pose. Where collision behavior is relevant to release or
    travel, include the corresponding supported boundary/obstruction cases.

### Reset and repeatability evidence

-   A source-backed or measured reset procedure that identifies every body pose,
    joint/latch state, retained/released member state, and field placement required
    at the start of a run.
-   A reset acceptance scenario that exercises the intended transition, resets the
    scene, and verifies restoration of every admitted body, collider, joint, latch,
    and mechanism-observation state.
-   A fixed-step repeatability scenario with identical initial conditions and inputs
    that demonstrates the same admitted observable outcome across repeated runs.
-   If any behavior depends on an uncalibrated parameter, a sensitivity record that
    identifies it as a simulation limit rather than physical-fidelity evidence.

## Admission decision and implementation gate

M02 is **not admitted** for mechanism implementation. The current sidecar may
remain a fixed-body placeholder, but it must not be described as articulated,
released, latched, dynamic-piece, calibrated, or source-backed behavior.

Implementation may begin only after the asset/placement, partition, relation,
collider, and reset evidence above has been reviewed together. The implementation
change must then replace the placeholder with explicitly identified bodies and
colliders, add only evidence-supported joints or release behavior, and include
initial-state, transition, obstruction/boundary (where sourced), reset, and
repeatability validation. Scoring observations remain out of scope until a
separate source-backed M02 observation contract is accepted.

## Open record

| Required record                          | Current state                                                                                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Official source/version register         | Missing                                                                                                                                      |
| Permitted M02 model asset and provenance | Missing                                                                                                                                      |
| Asset import and field placement record  | Missing                                                                                                                                      |
| Geometry partition and stable IDs        | Missing                                                                                                                                      |
| Joint/latch/release definition           | Missing                                                                                                                                      |
| Collider plan and contact verification   | Missing                                                                                                                                      |
| Reset/repeatability evidence             | Missing                                                                                                                                      |
| M02 scoring observation contract         | Present in `src/lib/fll/m02-exploding-seeds-observation-contract.ts`; executable scorer and fail-closed input boundary are separate modules. | Accepted, geometry unverified |
