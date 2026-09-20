# UI Collision View 08 QA Review

Task: `ui-collision-view-08` / `collision-view-qa`
Reviewer: `fll_lead` (lead-implemented and lead-verified; no subagent claims)
Review state: handoff for lead acceptance; browser evidence not obtained
Reviewed: 2026-09-20

## Scope and Evidence Boundary

Added a `Collision view` camera mode to the existing view set, per owner request: a
robot-anchored camera riding in front of the robot looking back at its front face, so
participants can watch the robot meet mission models during a run. Camera-only change;
no rendering pipeline, physics, scoring, or timing behavior was modified.

Browser rendering is **not verified**: no browser tooling was available in this session
(precedent: `docs/qa/ui-layout-03-review.md`). All claims below are source-level.

## Source Findings

| Review area          | Source result          | Evidence                                                                                                                                                                                                                                                                                  | Browser status                    |
| -------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| New camera direction | Pass                   | `ScenePreview.svelte:13` type union extended with `'robot-front'`; render branch rotates 0° like `front` (ScenePreview.svelte:199-201), composing with the existing `robotFocus` inverse-pose transforms (ScenePreview.svelte:168-199, 259-269) so the camera rides at the robot's front. | Not rendered/verified in browser. |
| View set exposure    | Pass                   | `Collision view` radio item added to `buildCameraMenu()` (SpikeSimulatorWindow.svelte:216-225), which feeds the Expert display-options `MenuDropdown`; quick menu item added to the Practice top-bar `Simulator view` menu after `Focus robot`.                                           | Menu behavior unverified.         |
| Follow/zoom behavior | Pass (by construction) | Selecting the view sets `robotFocus = true`, `tilt = true`, `camera = 'robot-front'`; the existing robot-follow translate and wheel zoom (`robotFocusDistance`, clamp 0.6–20) then apply unchanged.                                                                                       | Unverified visually.              |
| Escape hatches       | Pass                   | `Default view` and `View top` still clear `robotFocus`, exiting the follow cam; other direction views keep following exactly as before this change.                                                                                                                                       | Unverified.                       |
| No unrelated changes | Pass                   | `git diff` touches only the camera type unions and the two menu definitions in the three registered files; `LoadScene.svelte`'s separate camera prop is untouched.                                                                                                                        | —                                 |

## Validation

-   `npm run check` — 0 errors, 0 warnings.
-   `npm exec -- prettier --check` on the three changed files — pass (after one `--write`).
-   `git diff --check` — clean.
-   `npm test` — 47 files, 210/210 passed.

## Unverified Browser Cases

-   The view renders with the camera at the robot's front, following the robot, with
    mission models visible at the contact face during a run.
-   Menu radio state, top-bar quick item, and `title`/focus behavior in both menus.
-   Wheel-zoom framing at close distances in the new view.

## Handoff

Lead accepts under the standing owner browser-caveat policy; visual confirmation via
`npm run dev` remains open, in particular whether the default follow distance frames
the robot's front face well (a one-line `robotFocusDistance` default change is the
likely correction if not).
