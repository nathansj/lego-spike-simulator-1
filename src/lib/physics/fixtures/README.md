`drone-scene.json` is a renderer-free regression fixture derived from the reported
`scene(13).spk` and `robot(2).mpd`. It contains the original saved scene definition,
plus bounding boxes compiled from each embedded model and the robot's wheel
radius, gearing, position, and direction. No meshes or mat image are needed.

The red base uses the explicit `planarPush` motion mode in the bundled sidecar and
scene metadata so it stays locked until a horizontal push releases it.

The bounds use `WebGLCompiler.compileModel` with `rescale: false` and recentering
unless `preserveOrigin` is set. Wheel transforms follow `loadWheelTransforms` in
`SpikeSimulator.svelte`; VM startup subsequently aligns the wheel directions.

`drone-regression.test.ts` runs the commands extracted from `project(5).llsp3`:
movement pair AB, speed 50%, forward 65 cm, steering -31 for 10 rotations, stop.
It also checks gravity, horizontal pushes, external contacts, and snapshot reset.
The original saved hinge definitions are retained so loading exercises migration.
