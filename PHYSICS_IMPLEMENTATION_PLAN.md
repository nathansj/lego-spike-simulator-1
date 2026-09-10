# Physics Implementation Notes

The physics pass is complete.

What changed:

- Bodies can now declare explicit motion modes in their own physics definitions.
- The physics world honors planar-push bodies without any mission-name heuristics.
- Steering assistance is load-aware when pushing articulated bodies.
- Scene parsing preserves the new motion metadata.
- The drone scene fixture now encodes its own physics and joint behavior directly.

Validation:

- `npm test -- --run src/lib/spike/scene-schema.test.ts src/lib/physics/world.test.ts src/lib/physics/drive.test.ts src/lib/physics/articulation-presets.test.ts src/lib/physics/drone-regression.test.ts`
- `npm run check`

There are no remaining planned implementation steps in this pass.
