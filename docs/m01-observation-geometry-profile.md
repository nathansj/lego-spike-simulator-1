# M01 observation geometry profile

This document specifies the versioned JSON file accepted by the M01 Drone Survey
calibration-profile picker. It is the contract implemented by
`src/lib/fll/drone-survey-observation-geometry-profile.ts`.

The file supplies simulation inputs for the M01 observation adapter. It does not
define official field geometry, official scoring tolerances, or physical
calibration evidence. A profile whose `calibration.status` is `"calibrated"` is
only a declaration in the file; it is not evidence by itself.

## Version 1 schema

The top-level JSON value and every nested value listed below must be an object.
Each object must contain **exactly** its listed properties: all properties are
required, and additional properties are rejected. Property order is irrelevant.

| JSON path                                       | Required value | Validation                                                                                                                                                                    |
| ----------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profileVersion`                                | JSON number    | Must equal `1`. Other versions are rejected.                                                                                                                                  |
| `missionId`                                     | JSON string    | Must equal `"M01"`.                                                                                                                                                           |
| `provenance`                                    | object         | Must contain exactly `source`, `sourceVersion`, and `recordedOn`.                                                                                                             |
| `provenance.source`                             | string         | Non-empty after trimming. Describe the measurement source or authored asset.                                                                                                  |
| `provenance.sourceVersion`                      | string         | Non-empty after trimming. Use an immutable revision or identifier for `source`.                                                                                               |
| `provenance.recordedOn`                         | string         | A real ISO calendar date in `YYYY-MM-DD` form, including valid leap dates.                                                                                                    |
| `calibration`                                   | object         | Must contain exactly `status` and `evidence`.                                                                                                                                 |
| `calibration.status`                            | string         | Either `"unverified"` or `"calibrated"`.                                                                                                                                      |
| `calibration.evidence`                          | string         | Non-empty after trimming. State the measurement evidence, or why it remains unverified.                                                                                       |
| `geometry`                                      | object         | Must contain exactly the five properties below.                                                                                                                               |
| `geometry.lidarMapFlippedRotationRelativeToMat` | object         | Quaternion with exactly finite numeric `x`, `y`, `z`, and `w`; its magnitude must not be zero. The adapter normalizes it before comparison.                                   |
| `geometry.maximumLidarMapRotationErrorRadians`  | JSON number    | Finite and in the inclusive range `0` through `pi` radians.                                                                                                                   |
| `geometry.surveyAreaMm`                         | object         | Must contain exactly finite numeric `minX`, `maxX`, `minZ`, and `maxZ`; `minX <= maxX` and `minZ <= maxZ`. Coordinates are millimeters in the mat body's local `x`/`z` frame. |
| `geometry.scanMarkerPointOffsetMm`              | object         | Vector with exactly finite numeric `x`, `y`, and `z`, in millimeters. This is required in a persisted profile, even when all values are zero.                                 |
| `geometry.scanMarkerOverlapMarginMm`            | JSON number    | Finite, nonnegative millimeters.                                                                                                                                              |

JSON itself cannot represent `NaN`, `Infinity`, or `-Infinity`; those values are
also rejected if a caller invokes the decoded-value validator directly. The
profile parser rejects malformed JSON before schema validation.

All distances stay in millimeters and the rotation error stays in radians. The
loader does not convert units, infer omitted values, normalize stored
quaternions, or use metadata to alter the geometry.

## Synthetic pipeline example — unverified

The following file is intentionally synthetic. It is useful for checking file
selection, successful parsing, enabled M01 controls, and score-feedback display.
It is **not** official geometry, an official tolerance, or a physical
calibration, and its results must not be reported as official M01 scores.

Save it as, for example, `m01-synthetic-unverified.json` before choosing it in
the browser:

```json
{
    "profileVersion": 1,
    "missionId": "M01",
    "provenance": {
        "source": "Synthetic browser-pipeline exercise values",
        "sourceVersion": "example-2026-09-10",
        "recordedOn": "2026-09-10"
    },
    "calibration": {
        "status": "unverified",
        "evidence": "Synthetic values for browser workflow testing only; no physical calibration has been performed."
    },
    "geometry": {
        "lidarMapFlippedRotationRelativeToMat": {
            "x": 0,
            "y": 1,
            "z": 0,
            "w": 0
        },
        "maximumLidarMapRotationErrorRadians": 0.125,
        "surveyAreaMm": {
            "minX": -125.5,
            "maxX": 330.25,
            "minZ": 12.75,
            "maxZ": 900
        },
        "scanMarkerPointOffsetMm": {
            "x": 4.5,
            "y": -2.25,
            "z": 8.75
        },
        "scanMarkerOverlapMarginMm": 6.5
    }
}
```

## Safe manual browser workflow

Use this workflow to test the import and observation pipeline, not to validate
M01 field fidelity or publish a score.

1. Start the local application with `npm run dev`, open the local URL printed by
   Vite, and load a robot and scene that can run the simulator. Do not use the
   synthetic example to make a calibration claim.
2. In the simulator toolbar, locate **M01 user-supplied calibration** and select
   the synthetic file above. Confirm the status announces that the named
   user-supplied profile loaded and also states that the calibration is not an
   official field profile.
3. Start the simulation. In the M01 panel, confirm that **Finish M01 match** is
   enabled and score feedback says it is unavailable until the match is finished.
   This confirms that geometry reached the match controller; it does not confirm
   that the mission model or geometry is accurate.
4. Optionally interact with the M01 model, then select **Finish M01 match**. Check
   that the panel displays condition-by-condition feedback and a score sourced
   from the M01 rulebook link. Record the result only as a synthetic simulator
   observation with the exact profile filename and version.
5. Select **Clear calibration**. Confirm that the status returns to “scoring is
   disabled,” the M01 match is reset, and starting another run leaves **Finish
   M01 match** disabled. This guards against accidentally carrying a prior file
   into a later check.
6. Negative-test the rejection path with a copy that adds an extra top-level key
   or removes `geometry.scanMarkerPointOffsetMm`. Confirm an alert names the
   profile validation error, scoring stays disabled, and no earlier profile
   remains active. Restore the valid synthetic file only when continuing the
   pipeline exercise.

The M01 score is evaluated only when **Finish M01 match** is selected, from the
current deterministic physics state after fixed simulation steps. Changing or
clearing a profile while an M01 match is active resets that match. The observation
calculation uses only `geometry`, while the loaded profile's provenance and
calibration status remain available in the simulator feedback for traceability.

For a production profile, retain the source material, immutable source version,
measurement method, coordinate registration, and repeatable calibration trials
outside this file as evidence. The current M01 semantic bindings and fixture are
explicitly unverified integration assets; see `docs/m01-semantic-manifest.md`.
