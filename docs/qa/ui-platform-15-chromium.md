# UI Platform 15 Chromium evidence

Task: `chromium-evidence`  
Date: 2026-09-16  
Target: local simulator at `http://127.0.0.1:5174` (5173 was unreachable)  
Browser: isolated local Chromium session `fll-chromium-qa` — exact version was not exposed by BrowserAct.

## Evidence boundary

The owner reports that the app works in Firefox. This Chromium retry independently
verified the core project/readiness/run flow. Exact Chromium version, narrow
viewport behavior, keyboard traversal, and download bytes were not captured.

## Previous Chromium connection blocker

The Chromium connection was attempted twice through the available local browser
client. Both attempts failed before page creation with:

```text
Cannot find module '/Users/Sheldon/.codex/plugins/cache/openai-bundled/browser/26.825.51511/scripts/browser-service.mjs'
imported from .../trusted-worker.js
```

The BrowserAct CLI was installed and initialized, allowing this retry to proceed.

## Requested flow matrix

| Flow | Chromium result | Notes |
| --- | --- | --- |
| Load saved `.lsp-project` | Passed | Loaded `/Users/Sheldon/Downloads/project.lsp-project` through Scene editor → Load → Load project. |
| Program readiness and Run buttons | Passed | Project restored with Season, Field, Robot, Drive wheels, and Program all showing `✓`; both Run controls were enabled. |
| Run and stop | Passed | Practice Run changed to `Stop run`/`Stop` and returned to `Run program` after stopping. |
| Reset | Not run | Not exercised in this retry. |
| Responsive layout | Not run | Narrow viewport was not applied. |
| Keyboard basics | Not run | Focus traversal was not exercised. |
| Diagnostics export | Partially checked | Diagnostics panel and Export control were visible; download contents were not verified. |

## Automated evidence

- `npm run check` — passed; `svelte-check found 0 errors and 0 warnings`.
- `npm test -- --run` — passed; 47 files and 210 tests.
- Vitest emitted existing Vite deprecation warnings; no test failures resulted.

## Exact manual Chromium retest

1. Start the app with `npm run dev -- --host 127.0.0.1` and open
   `http://localhost:5173` in Chromium. Record the Chromium version from
   `chrome://version`.
2. Select the BIOGLOW season. Load a complete project or load the field and
   robot separately, configure two motor wheels, and load a Blockly program
   containing at least one executable block.
3. Confirm the Practice badges for Season, Field, Robot, Drive wheels, and
   Program all show ready. Confirm both `Run program` and the toolbar `Run`
   control are enabled.
4. Start the program, confirm the simulator advances, then stop it and use
   `Reset run`. Confirm the robot returns to its saved setup and the controls
   return to the expected idle state.
5. Save a complete project as `project.lsp-project`. Make a visible change,
   load the saved project through `Load project (.lsp-project)`, and confirm the
   scene, robot, wheel configuration, season, and Blockly blocks are restored.
6. Repeat setup at a narrow Chromium viewport, approximately `820x900`, and
   verify the simulator remains reachable, the Practice controls are not below
   an unbounded page region, and important controls remain usable by scrolling.
7. Press `Tab` through the setup and Practice controls. Confirm visible focus,
   sensible order, and activation of the focused readiness/run control with
   `Enter` or `Space`; confirm no keyboard trap.
8. Run or stop a program to populate `Robot run diagnostics`. Use severity/text
   filtering, confirm newest entries remain first, select `Export`, and verify
   the downloaded `robot-run-diagnostics-*.txt` contains the filtered entries.

## Acceptance

- Chromium core project/readiness/run gate: **accepted for this retry**.
- Chromium full browser gate: **partially accepted**; reset, responsive, keyboard,
  and download-content checks remain.
- Firefox: **user-confirmed working**.
- Code and automated validation: **accepted for this report**.

## Next action

Complete the remaining reset, narrow viewport, keyboard, and downloaded-file
checks in Chromium before closing the full browser gate.
