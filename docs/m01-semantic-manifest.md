# M01 semantic manifest

`src/lib/fll/m01-semantic-manifest.ts` is version 1 of the asset-to-observation
binding for M01 Drone Survey. It records the body IDs currently used by the
renderer-free M01 fixture and by the observation adapter without changing either
one. It is an integration seam for a future season package, not a persisted scene
schema and not an official field definition.

## Provenance

The manifest was inspected on September 10, 2026 against these repository inputs:

-   `src/lib/physics/fixtures/drone-scene.json`, scene version 2, supplies the
    serialized robot and M01 segment IDs. The mat body is deliberately absent from
    the JSON because test setup creates `#mat` at runtime.
-   `src/lib/physics/model-sidecars/45832_01.physics.json`, sidecar version 1,
    supplies the current named M01 segments and a synthetic articulated mechanism.
-   `src/lib/fll/drone-survey-observations.ts` supplies the present scoring-observation
    body mapping. Its `missionModel` mapping retains rail and pilot IDs that are not
    serialized in the current renderer-free fixture, so the adapter treats absent
    members as unavailable rather than asserting that the fixture contains them.
-   `src/lib/fll/drone-survey.ts` identifies the selected 2026–27 BIOGLOW Founders
    Edition source set. This manifest does not independently verify an official
    rulebook, setup guide, model instructions, or Challenge Update revision.

## Unresolved inputs

No dimensions, target rotations, overlap margins, or contact thresholds are set
in the manifest. The following remain `unresolved` and must be sourced or
calibrated before a production M01 geometry profile is introduced:

-   mat geometry and its coordinate registration;
-   drone, LiDAR map, scan-marker, and equipment geometry/contact representation;
-   scan-marker tracked-point offset and footprint;
-   survey-area bounds in the mat local frame; and
-   LiDAR-map flipped orientation and rotation tolerance.

The current M01 fixture and sidecar remain regression assets. Their mechanism
labels and synthetic physics values are not evidence of official geometry,
calibration, or scoring tolerances.
