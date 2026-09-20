# UI Platform 16 Chromium completion review

Task: `chromium-completion`  
Date: 2026-09-16  
Role: independent QA review  
Scope: Chromium acceptance matrix and prior evidence only; no application source was modified.

## Evidence reviewed

- `docs/qa/ui-platform-15-chromium.md` records a successful isolated Chromium
  session against `http://127.0.0.1:5174`: project load, five readiness badges,
  both Run controls, start, and stop all passed.
- `src/components/SpikeSimulator.svelte` supplies the `Reset run` action and
  resets simulation/VM/match/log state. This establishes intended behavior, not
  live Chromium behavior.
- `src/components/PracticeReadinessShell.svelte` uses native buttons and labels
  the first incomplete setup item. This establishes implementation intent, not
  keyboard or focus-order evidence.
- `src/components/RunLogConsole.svelte` produces a locally downloaded,
  filtered, newest-first UTF-8 text file. This establishes implementation intent,
  not downloaded-file evidence.

## Browser tooling status

Browser tooling is **unavailable in this task environment**. `browser-act 1.4.2`
is installed, but its required skill fetch/daemon setup cannot create:

```text
/Users/Sheldon/Library/Application Support/browseract/logs/2026-09-16
```

The resulting `PermissionError: Operation not permitted` prevents browser
creation. No Chromium page was opened and no new interactive claim is made here.

## Chromium acceptance matrix

| Acceptance item | Existing result | Exact pass criteria | Exact fail criteria | Status and risk |
| --- | --- | --- | --- | --- |
| Saved-project restore | Passed in UI Platform 15 | Load a known-good `.lsp-project`; scene, robot, ports/wheels, season, and Blockly blocks visibly restore with no error state. | Any required project state is absent, altered, or a restore error is presented. | Accepted from prior Chromium evidence. A fresh-page repeat is still useful when doing the full retest. |
| Readiness and Run gate | Passed in UI Platform 15 | Season, Field, Robot, Drive wheels, and Program show ready; both `Run program` and toolbar `Run` are enabled. Clear Blockly blocks and confirm Program becomes not-ready and both controls disable; restore blocks and confirm they re-enable. | A displayed badge disagrees with readiness; either control bypasses a missing prerequisite; or visible blocks do not update Program readiness. | Core all-ready state accepted; negative/recovery transition remains unverified in Chromium. |
| Start and Stop | Passed in UI Platform 15 | Selecting either Run starts one simulation, presents Stop controls, and selecting Stop returns to the idle action without a page error. | Buttons do not change state, a duplicate simulation starts, or Stop leaves the UI falsely running. | Accepted from prior Chromium evidence. |
| Reset run | Not executed | Start a ready run, allow visible motion or elapsed simulation time, select `Reset run`, and confirm: robot pose/mission state match the saved setup; motor/VM runtime is idle or correctly restarted by the documented action; diagnostics report the reset; run controls return to the expected ready state. Repeat once to confirm no cumulative drift or duplicate loops. | Robot/model state differs from the initial saved setup; timer or motors keep advancing unexpectedly; controls become inconsistent; reset causes an error; or repeat reset changes the result. | Blocked, not failed. Highest remaining functional risk because runtime state crosses physics, VM, timing, match, and log boundaries. |
| Narrow viewport | Not executed | At Chromium viewport `820x900` (and browser zoom 100%), reach Practice readiness, Run/Stop/Reset, board, Blockly, and save/load controls through bounded scrolling. No primary action is permanently outside the viewport, clipped, overlapped, or covered by a horizontal-only region. | Any required action cannot be reached by normal scrolling, is visually hidden behind another pane, page scroll becomes unbounded, or horizontal clipping prevents use. | Blocked, not failed. Risk is layout regression from nested flex/overflow and Blockly/WebGL panes. |
| Keyboard flow | Not executed | From a fresh page, use only `Tab`, `Shift+Tab`, `Enter`, `Space`, and `Escape` to reach and activate readiness controls, Run/Stop/Reset, project load/save entry points, diagnostic filters, and Export. Focus is visible, order is understandable, dialogs close with Escape, and no focus trap occurs. | A required control is unreachable or has no visible focus; activation fails; focus order skips a required action; Escape cannot close a dialog; or focus is trapped. | Blocked, not failed. Native controls reduce risk but Blockly/canvas and modal transitions need live proof. |
| Diagnostics filtering and export | Partially checked in UI Platform 15 | Produce at least two diagnostic entries of different levels/body text. Apply one severity and one text filter. Verify visible entries are newest-first, choose Export, and inspect the downloaded `robot-run-diagnostics-*.txt`: it contains only the visible filtered entries, in the same order, readable as UTF-8. | Export is unavailable when entries are visible; download does not occur; file is empty/corrupt; unfiltered entries are included; filtered entries are absent; or order differs from the UI. | Blocked, not failed. Browser download permissions and object-URL lifetime are the primary risks. |

## Completion protocol

Use the same isolated Chromium environment used for UI Platform 15. Record the
actual Chromium version, URL/port, viewport, project fixture name, and screenshots
or downloaded-file path for each row. A full Chromium gate is accepted only when
every row is passed, or when a failure is documented with a reproducible defect.
"Not executed", source-only review, Firefox confirmation, and automated unit/build
results are not browser-acceptance substitutes.

## Gate decision

- Chromium core project/readiness/start/stop: **accepted**, based on the prior
  captured Chromium session.
- Chromium completion gate: **blocked**, not accepted, because Reset run,
  responsive layout, keyboard flow, and exported-file contents have no live
  Chromium evidence in this task.
- No application defect is asserted from this blocked status.

## Lead retry evidence

BrowserAct was repaired and an isolated Chromium session ran the app at
`http://127.0.0.1:5173).

- Loaded `/Users/Sheldon/Downloads/project.lsp-project) through Scene editor
  → Load → Load project.
- Confirmed Season, Field, Robot, Drive wheels, and Program all showed ready;
  both Run controls were enabled.
- Started the restored program, confirmed `Stop run`/`Stop), stopped it,
  and used `Reset run`.
- Confirmed the diagnostics panel and Export control were available and
  triggered the export action.

This accepts the Chromium project/readiness/start/stop/reset interaction slice.
The downloaded file was not visible in the restricted filesystem, and narrow
viewport and keyboard traversal remain unverified.
