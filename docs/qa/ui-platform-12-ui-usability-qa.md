# UI Platform 12 — Usability QA Baseline

## Scope

Source audit of the simulator layout hierarchy and practice readiness
initialization before the `ui-usability-fix` implementation handoff. This is not
browser evidence.

## Findings

### Viewport and scroll access — blocking

- `src/App.svelte:22` and `src/components/BlocklyComponent.svelte:442` correctly
  establish a viewport-sized, overflow-hidden application shell.
- `src/components/BlocklyComponent.svelte:444` places the code panel and simulator
  in a row, but its flex child has no `min-h-0`.
- `src/components/SpikeSimulatorWindow.svelte:648-650` nests another full-height
  flex column without `min-h-0`.
- The simulator pane at `src/components/SpikeSimulatorWindow.svelte:864-865`
  is a flex child with `flex-1` and `overflow-hidden`, but no `min-h-0`.
- Season selection, mission readiness, participant readiness, the setup toolbar,
  two status panels, and the simulator are stacked in that column. Under normal
  flex minimum-size behavior, the upper content can force the simulator below
  the viewport while the ancestor hides overflow. This matches the reported
  off-screen window and makes the simulator inaccessible rather than merely
  requiring scroll.

### Run readiness — blocking

- `src/components/SpikeSimulatorWindow.svelte:95-96` initializes
  `activeSeasonPackage` and `selectedSeasonId` as empty/undefined.
- `src/components/SpikeSimulatorWindow.svelte:284` and `:660` require an active
  season package in the shared readiness predicate.
- `applySeasonSelection` is only reached from the season selector or archive
  restoration (`src/components/SpikeSimulatorWindow.svelte:382-395` and `:571`);
  there is no initial selection in `onMount` (`:620-628`).
- Therefore loading a scene, robot, and Blockly program cannot enable Run until
  the user separately selects a season. If this is intentional, the UI must make
  the missing season state prominent and keep the season control reachable. If
  BIOGLOW is the current default delivery target, the app should initialize the
  registered BIOGLOW package while preserving explicit season switching.

## Retest plan after handoff

1. Run `npm run check` and targeted readiness/layout tests, then `npm test -- --run`,
   `npm run build`, Prettier check, and `git diff --check`.
2. Confirm the simulator stays within the viewport at desktop and narrow widths;
   confirm the code and simulator panes remain reachable without clipped controls.
3. Load scene, robot, and program; verify the readiness indicators and both Run
   buttons reflect the actual state and explain any remaining requirement.
4. If browser tools are available, test Chromium and Firefox, keyboard focus, and
   responsive resizing. Otherwise report those gates as unverified.

## Current decision

Not accepted pending implementation handoff and integrated validation. Browser,
accessibility, Firefox/Chromium, and participant evidence remain separate gates.
