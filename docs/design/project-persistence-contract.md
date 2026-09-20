# Project persistence contract

The project save action writes `project.json` inside a ZIP archive alongside
the existing `scene.json`, `robot.mpd`, model MPDs, map, and optional
calibration profile. The envelope is versioned as `lego-spike-project` version
1 and records:

-   the selected `SeasonPackage` identity: schema version, ID, name, edition,
    revision, and platform;
-   the serialized scene and robot port/wheel setup;
-   Blockly workspace state when the save component receives a workspace;
-   participant simulation and display settings;
-   archive entries and explicit capability flags.

`SaveSimulation` now receives the selected BIOGLOW Founders `SeasonPackage` from
`SpikeSimulatorWindow`, so a saved project is pinned to
`bioglow-founders-2026-27` and its current package revision. A future season
selector can pass another package through the same prop without changing the
envelope format.

The current component architecture has no project-open callback, workspace
load API, or reactive project-level dirty store. Therefore this slice does not
claim automatic project restore, unsaved-change prompts, or season switching.
The envelope's `seasonRestore` capability remains `false`; legacy robot and
scene exports remain available and unchanged. A follow-up loader must validate
the pinned package before applying scene, robot, Blockly, or participant
settings and preserve the source archive when migration is unavailable.
