# BIOGLOW asset and mechanics coverage inventory

**Inventory date:** September 11, 2026
**Scope:** committed repository inputs only; this is not a season-package, field,
or scoring certification.

## Reading this inventory

- **Sidecar** records whether a committed file in
  `src/lib/physics/model-sidecars/` names the candidate model.
- **Fixture** records committed scene-fixture coverage, not a complete field
  placement. `drone-scene.json` is a renderer-free regression fixture derived
  from reported saved inputs; it has no meshes or mat image.
- **Behavior** describes what the current serialized physics can do. A
  `mechanics` label is metadata only and never establishes articulated behavior.
- **Provenance** identifies the repository evidence used here, rather than
  asserting an official model or field source.

The mission-number-to-filename and mission-name mapping below comes from the
sidecars for M01--M13. It still needs comparison with the selected Founders
Edition FIRST rulebook, current updates, official setup instructions, and model
instructions. The M14/M15 names come only from the regional-resource reference
recorded in `docs/code-review-2026-09-10.md`; they are likewise unverified here.

| Mission | Candidate asset / sidecar status | Fixture status | Current behavior | Provenance and next evidence needed |
| --- | --- | --- | --- | --- |
| M01 Drone Survey | `45832_01.physics.json` exists (v1); it declares six segments and one slider joint. | Present in `drone-scene.json`; serialized as individually named regression bodies and four legacy/synthetic joints. | **Synthetic articulated regression behavior**, not calibrated mechanism behavior. The fixture and sidecar do not represent the same articulation shape (fixture retains hinge/ball joints; sidecar declares a rail slider). | Repository M01 semantic manifest and fixture README identify the inputs as synthetic/renderer-free. Obtain official model/build and field-setup sources; verify mesh identity, coordinate registration, placement, origins, all segment boundaries, joint anchors/limits, collision shapes, masses/friction, and reset. Calibrate the M01 observation geometry before treating its scorer as field evidence. |
| M02 Exploding Seeds | `45832_02.physics.json` exists (v1), one fixed auto-collider segment, no joints. | Present only as one dynamic 100 mm box object in `drone-scene.json`; it is not sidecar articulation or a mission fixture. | **Placeholder:** fixed-body sidecar. `release`, `dynamic-pieces`, and `latch` are labels, not implemented motion. | Sidecar labels and dependency manifest filename only. Obtain official model/build/setup material; separate movable pieces and latch, define release state/force semantics, colliders, placement, and reset tests. |
| M03 Flip the Rock | `45832_03.physics.json` exists (v1), one fixed auto-collider segment, no joints. | Present only as one dynamic 100 mm box object in `drone-scene.json`; not a mission fixture. | **Placeholder:** fixed-body sidecar. `hinge`, `returnable`, and `trigger` are labels only. | Sidecar labels and dependency manifest filename only. Obtain official model/build/setup material; verify pivot/return mechanism, limits, trigger state, colliders, placement, and repeat/reset evidence. |
| M04 Lucky Leaves | `45832_04.physics.json` exists (v1), one fixed auto-collider segment, no joints. | Present only as one dynamic 100 mm box object in `drone-scene.json`; not a mission fixture. | **Placeholder:** fixed-body sidecar. `removable-pieces` and `preserve-position` are labels only. | Sidecar labels and dependency manifest filename only. Obtain official model/build/setup material; model independent removable pieces, their starting/valid states, collision geometry, placement, and reset evidence. |
| M05 Reaching Roots | `45832_05.physics.json` exists (v1), one fixed auto-collider segment, no joints. | No committed mission fixture. | **Placeholder:** fixed-body sidecar. `slider`, `travel-limit`, and `trigger` are labels only. | Sidecar labels and dependency manifest filename only. Obtain official model/build/setup material; verify slider bodies, axis, anchors, limits, trigger condition, colliders, placement, and reset evidence. |
| M06 Leafcutter Frenzy | `45832_06.physics.json` exists (v1), one fixed auto-collider segment, no joints. | No committed mission fixture. | **Placeholder:** fixed-body sidecar. `dynamic-pieces`, `containment`, and `trigger` are labels only. | Sidecar labels and dependency manifest filename only. Obtain official model/build/setup material; identify loose/contained bodies and valid containment state, then verify colliders, placement, release/reset, and tests. |
| M07 Humongous Fungus | `45832_07.physics.json` exists (v1), one fixed auto-collider segment, no joints. | No committed mission fixture. | **Placeholder:** fixed-body sidecar. `slider`, `connection-trigger`, and `travel-limit` are labels only. | Sidecar labels and dependency manifest filename only. Obtain official model/build/setup material; verify moving bodies, connection observation, axis/limits, colliders, placement, and reset evidence. |
| M08 Tangled | `45832_08.physics.json` exists (v1), one fixed auto-collider segment, no joints. | No committed mission fixture. | **Placeholder:** fixed-body sidecar. `hinge`, `flexible-link`, and `trigger` are labels only. | Sidecar labels and dependency manifest filename only. Obtain official model/build/setup material; establish whether/how flexible links are represented, hinge anchors/limits, trigger state, collision policy, placement, and reset tests. |
| M09 Research Platform | `45832_09.physics.json` exists (v1), one fixed auto-collider segment, no joints. | No committed mission fixture. | **Placeholder:** fixed-body sidecar. `slider`, `latch`, `release`, and `trigger` are labels only. | Sidecar labels and dependency manifest filename only. Obtain official model/build/setup material; verify platform/payload partitions, slider limits, latch/release semantics, colliders, placement, and repeated-run reset evidence. |
| M10 Fragile Microhabitats | `45832_10.physics.json` exists (v1), one fixed auto-collider segment, no joints. | No committed mission fixture. | **Placeholder:** fixed-body sidecar. `fixed`, `preserve-position`, and `no-contact` do not create enforcement or observation behavior. | Sidecar labels and dependency manifest filename only. Obtain official model/build/setup material; define observed contact/position state, collision representation, placement, reset, and rule-source boundary tests. |
| M11 Window to the Past | `45832_11.physics.json` exists (v1), one fixed auto-collider segment, no joints. | No committed mission fixture. | **Placeholder:** fixed-body sidecar. `hinge`, `latch`, and `trigger` are labels only. | Sidecar labels and dependency manifest filename only. Obtain official model/build/setup material; verify moving partition, hinge/latch anchors and limits, release state, colliders, placement, and reset tests. |
| M12 Forest Elder | `45832_12.physics.json` exists (v1), one fixed auto-collider segment, no joints. | No committed mission fixture. | **Placeholder:** fixed-body sidecar. `hinge`, `support-trigger`, and `returnable` are labels only. | Sidecar labels and dependency manifest filename only. Obtain official model/build/setup material; verify supports, pivot/return parameters, trigger observation, colliders, placement, and reset evidence. |
| M13 Keystone Species | `45832_13.physics.json` exists (v1), one fixed auto-collider segment, no joints. | No committed mission fixture. | **Placeholder:** fixed-body sidecar. `dynamic-piece`, `containment`, and `trigger` are labels only. | Sidecar labels and dependency manifest filename only. Obtain official model/build/setup material; identify dynamic piece(s), containment/trigger state, colliders, placement, release/reset, and tests. |
| M14 Seeds of Renewal | **Gap:** no `45832_14` sidecar, candidate model filename, or committed mesh. | **Gap:** no committed mission fixture. | **No represented behavior.** | The name is recorded by the baseline review's regional-resource reference only. First verify the official mission identity and source revision; then acquire approved/usable model and setup assets, record their provenance/terms, and create separately reviewed geometry, placement, mechanics, scoring observations, and reset tests. |
| M15 Biocentric Architecture | **Gap:** no `45832_15` sidecar, candidate model filename, or committed mesh. | **Gap:** no committed mission fixture. | **No represented behavior.** | The name is recorded by the baseline review's regional-resource reference only. First verify the official mission identity and source revision; then acquire approved/usable model and setup assets, record their provenance/terms, and create separately reviewed geometry, placement, mechanics, scoring observations, and reset tests. |

## Catalog and mesh evidence

No new catalog was present in the checkout at inventory time. There are no
committed `45832_01.mpd` through `45832_15.mpd` files. The committed
`static/ldraw/DEPENDENCY_MANIFEST.json` lists only M01--M13 filenames and records
859 bundled dependency files with no unresolved dependencies. It attributes those
dependency paths to a local Studio LDraw installation, including official,
unofficial, relative, and primitive sources. This supports dependency closure for
the listed names; it does **not** supply the MPDs, prove mesh identity, establish
usable terms for a mission asset, or verify official geometry.

The M01 articulation test has an optional local-file test path outside this
checkout. Its absence here means it is not portable committed mesh evidence.

## Coverage conclusion

M01 is the sole mission with an articulated regression representation, and it
remains synthetic and uncalibrated. M02--M13 have named sidecars but only
fixed-body placeholders. M14 and M15 have neither sidecars nor fixtures. No
mission label, sidecar, dependency entry, or rendered mesh should be described as
complete until the corresponding official source, geometry, placement, mechanics,
observable state, calibration assumptions, and reset evidence have been recorded
and verified.
