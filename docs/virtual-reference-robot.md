# Virtual reference robot

## Decision

On September 10, 2026, the owner confirmed that no reliable physical reference
robot is available. Development will use an explicitly synthetic reference,
`virtual-base-v1`, derived from the existing drive tests. No purchase, physical
build, or user-supplied measurement is required to implement the simulator.

This document specifies the starting baseline for implementation; it does not add
a selectable robot preset to the application. The reference is a repeatable test
vehicle, not a claim that a particular LEGO build has these physical properties.

## Baseline

The matching-forward-command scenario in `src/lib/physics/drive.test.ts` already
uses the following configuration. Keep these values versioned when extracting a
shared fixture or creating the first selectable preset.

| Property               | Starting value                  | Evidence/status                                                  |
| ---------------------- | ------------------------------- | ---------------------------------------------------------------- |
| Drivetrain             | Two independently driven wheels | Existing synthetic test                                          |
| Motor ports            | A left, B right                 | Existing synthetic test                                          |
| Wheel diameter         | 56 mm                           | Existing test uses 28 mm radius                                  |
| Wheel-center spacing   | 120 mm                          | Existing test uses x = −60 and +60 mm                            |
| Wheel travel direction | Local +z for both wheels        | Existing synthetic test; verify imported mounting separately     |
| Gearing                | 1:1, positive for both wheels   | Existing synthetic test                                          |
| Chassis collider       | x/y/z = 140/65/170 mm           | Explicit box in the test, not measured CAD                       |
| Robot mass             | 1 kg                            | Synthetic test assumption                                        |
| Rotations              | Yaw enabled; pitch/roll locked  | Existing simplified drive test                                   |
| Linear/angular damping | 0.1 / 0.2                       | Test tuning values, not measured materials                       |
| Physics step           | 1/120 second                    | Existing regression loop                                         |
| Encoders               | Command mode initially          | Existing controller default; physical mode has a reviewed defect |

Use the existing drive controller defaults initially, recording their values in
reproduction metadata. `src/lib/physics/drive.ts` includes force limits, gains, and
steering assistance; these are algorithm parameters, not verified motor ratings.
Likewise, friction and sensor noise must be labeled assumptions until sourced.

The repository's `robot.mpd` is explicitly a generated placeholder driving base.
It is useful for inspecting the import path but is not a measured physical
reference. Do not assume its visual geometry matches the test collider or wheel
mounting. A selectable preset must align visible geometry, collision shape, ports,
wheel transforms, and saved configuration before it is called ready.

Start with chassis contact for simple pushing scenarios. Reserve C/D for future
actuators and E/F for color/distance sensors as a design convention, not as already
implemented attachments. Choose geometry, mounting, and additional sensors from
each mission's verified interaction requirements. Keep ports configurable.

## Verification without hardware

1. **Kinematics:** test distance and turning against ideal differential-drive
   equations. With radius r and axle spacing b, wheel travel is r × angle in
   radians, straight travel is (left + right)/2, and heading change has magnitude
   |right − left|/b. Verify the yaw sign against the repository's coordinate
   conventions. One wheel revolution at r = 28 mm corresponds to 56π mm of ideal
   rolling travel. This is an analytic oracle, not guaranteed loaded chassis travel.
2. **Execution:** test equivalent degree/revolution commands, concurrent programs,
   cancellation, and sensor feedback using bounded simulated time. Fix the
   baseline review defects before treating runtime outputs as trustworthy.
3. **Physics:** check finite states, contact response, allowed joint motion,
   limits, obstruction, release semantics, and stable rest. Compare equivalent
   elapsed time split into different rendering intervals.
4. **Repeatability:** reset and rerun identical programs/configurations; compare
   traces with explicit numerical tolerances. Restore mid-run snapshots and
   compare subsequent behavior, including non-Rapier state.
5. **Sensitivity:** vary mass, friction, wheel geometry, actuator strength, and
   starting pose around documented assumptions. For example, 0.75×/1×/1.25×
   mass is an engineering stress sweep, not a measured uncertainty distribution.
   Report which assumptions change mission outcomes; do not turn sweep results
   into unsupported real-world success probabilities.
6. **Missions:** verify geometry, placement, intended mechanisms, and scoring
   against official setup/build/rule sources. Test successful and failed states,
   threshold cases, timing, and reset independently of visual appearance.

Sources should be verified when each capability is implemented. Prefer official
LEGO/FIRST documents for geometry, behavior, and rules. Use public measurements
only when the build, method, conditions, and units are identifiable. Mark each
parameter as documented, derived, assumed, or measured; record source/version and
which measurements, if any, apply to this particular configuration.

## Team assignments and acceptance

-   `fll_lead`: adopt this decision, track fidelity status, and sequence baseline
    fixes before mission expansion. Do not repeatedly request a physical robot.
-   `fll_physics`: extract a reusable baseline from the existing tests, fix feedback
    timing, and add analytic/repeatability/sensitivity checks as relevant.
-   `fll_runtime`: validate command semantics and cancellation independently of
    physical calibration, beginning with the reviewed motor-duration defect.
-   `fll_assets`: create an aligned visible preset and preserve all configuration
    through save/load; verify mission placements against official sources.
-   `fll_rules`: implement source-backed scoring independent of uncertain dynamics.
-   `fll_experience`: expose configurable geometry/ports and distinguish assumed
    physical behavior from verified rule and program behavior.
-   `fll_qa`: independently assess numerical, rule, browser, and physical evidence.

A simulation release can pass numerical, rule, and workflow acceptance with
physical calibration explicitly unverified. Do not describe it as a calibrated
digital twin or promise that the same program will succeed on a real table.
Later measurements should refine versioned profiles without changing rule logic.
