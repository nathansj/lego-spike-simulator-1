# UI Layout 03 QA Review

Task: `ui-layout-03` / `quiet-two-pane-qa`  
Reviewer: `fll_qa`  
Review state: handoff for lead review; not accepted  
Reviewed: 2026-09-17

## Scope and Evidence Boundary

Reviewed the completed `quiet-two-pane-implementation` handoff against
`docs/design/quiet-practice-layout-spec.md`. This pass covers desktop two-pane
hierarchy, compact view controls, the Blockly command disclosure, persistent-pane
count, and Expert Setup/Developer Diagnostics routes. Accessibility is explicitly
out of scope.

The implementation handoff reports `npm run check`, Prettier, and `git diff --check`
passing. QA did not rerun those commands. Browser acceptance is **not claimed**:
the inherited Chrome tab rendered an older single-Blockly state; a fresh CUA tab
received `ERR_CONNECTION_REFUSED`; the subsequent BrowserAct command-disclosure
interaction stalled and was interrupted. No completed Chromium, Firefox, viewport,
zoom, hover, keyboard, route, or lifecycle flow is accepted from those sessions.

## Finding

### UI-LAYOUT-03-01 — Narrow command surface is not the required full-width sheet

-   **Severity:** medium
-   **Location:** `src/components/BlocklyComponent.svelte:627`
-   **Reproduction:** Use a viewport below the `lg` breakpoint, select `Program`, and
    open `Commands`.
-   **Expected:** The command surface is a full-width sheet inside the active Program
    pane, while retaining the header, save status, Stop/run control, and close control.
-   **Actual (source inspection):** The same overlay is always constrained to `w-56`;
    there is no narrow breakpoint class or full-width sheet variant.
-   **Impact:** The narrow/200%-zoom acceptance scenario cannot meet the specified
    command-surface hierarchy. The fixed-width overlay can leave the Blockly canvas
    exposed beside it rather than providing the required narrow Program-pane sheet.
-   **Practical correction:** Add a narrow-only full-width overlay/sheet layout inside
    the Program pane, preserving the existing desktop `w-56` overlay behavior, then
    verify at the agreed narrow viewport and 200% zoom.

## Source Findings

| Review area                  | Source result                               | Evidence                                                                                                                                                                                   | Browser status                                                                                                   |
| ---------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Desktop two-pane hierarchy   | Source-supported, not accepted              | The default keeps `blocklyOpen` and `simulatorOpen` true; the parent switches to `lg:flex-row`, with Blockly first and `SpikeSimulatorWindow` second.                                      | Unverified at >=1024 CSS px.                                                                                     |
| Compact view controls        | Source-supported, not accepted              | Labelled `Blockly view` and `Simulator view` menus exist, with save/run status in the compact Practice surface.                                                                            | Unverified visually and functionally.                                                                            |
| Collapsed/open command panel | Source-supported in structure, not accepted | `commandsOpen` starts false; the labelled control overlays the Blockly canvas, retains the injected workspace, and the original toolbox is hidden. Hover/click/close handlers are present. | Unverified for open/close, hover delay, no flicker, scroll/zoom/selection preservation, and simulator stability. |
| No third persistent pane     | Source-supported, not accepted              | The desktop layout contains two sibling work surfaces; the narrow Program/Simulator switcher is hidden at `lg` and Expert/Diagnostics content is conditional within the simulator surface. | Unverified rendered hierarchy and horizontal-scroll behavior.                                                    |
| Expert/Diagnostics routes    | Source-supported, not accepted              | `Simulator view` exposes labelled Expert Setup and Developer Diagnostics actions that set `workspaceMode`, rather than adding a third tab.                                                 | Unverified route navigation, return to Practice, and preservation of run/project/score state.                    |
| Narrow layout                | **Fails source review**                     | Native Program/Simulator tabs and a narrow run strip are present, but the command overlay remains fixed at `w-56`; see UI-LAYOUT-03-01.                                                    | Unverified at narrow width and 200% zoom.                                                                        |

## Demonstrated Source Details

-   `src/components/BlocklyComponent.svelte:57` defaults the simulator and Blockly panes
    open; `src/components/BlocklyComponent.svelte:533` changes the paired work surface
    to a desktop row.
-   `src/components/BlocklyComponent.svelte:505` adds narrow Program/Simulator tabs;
    `src/components/BlocklyComponent.svelte:666` keeps the narrow run/fix/stop strip
    in the Program pane.
-   `src/components/BlocklyComponent.svelte:614` provides the collapsed `Commands`
    control and `src/components/BlocklyComponent.svelte:627` positions its category
    menu inside the Blockly canvas.
-   `src/components/SpikeSimulatorWindow.svelte:777` scopes the compact Practice
    toolbar to Practice mode; its labelled `Simulator view` menu contains the
    Expert Setup and Developer Diagnostics routes.

## Unverified Browser Cases

-   Desktop width: simultaneous Blockly-left/simulator-right panes, usable widths,
    no third persistent panel, no horizontal scroll, and visible save/run control.
-   Command disclosure: click, hover preview, predictable close, category selection,
    and no mutation of Blockly scroll/zoom/selection, simulator width, or run state.
-   Narrow width and 200% zoom: tab switching without remounting either surface,
    full-width command sheet, reachable run/Stop/save controls, and no clipped controls.
-   Expert Setup and Developer Diagnostics: menu navigation, return to Practice, and
    preservation of active run, score, project inputs, and capability state.
-   Prepared-run and running states: `Run program` and `Stop run` visibility and
    reachability. Runtime semantics were not evaluated in this UI pass.
-   Firefox/browser-version/device evidence and classroom usability measurement.

## Coverage Gaps and Handoff

This review does not assess accessibility, scoring, physics, assets, mechanics, or
physical calibration. The lead should keep UI-LAYOUT-03-01 open, require targeted
narrow/zoom browser evidence after correction, and accept only after the requested
desktop and route flows are reproduced in a reachable browser session.
