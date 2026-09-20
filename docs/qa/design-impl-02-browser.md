# Design Implementation 02 — Browser QA Gate

**Task:** `design-impl-02 / qa-browser-gate`  
**Scope:** Slice 1 non-accessibility browser validation only. No production source
was modified.  
**Run:** 2026-09-17, local Vite server at `http://127.0.0.1:5173/`.

## Environment and Evidence Boundary

- **Chrome/Chromium:** rendered evidence was collected in the available managed
  Chrome session. The automation surface did not expose an exact browser version.
- **Firefox:** no Firefox browser/session was available through Computer Use.
- The requested `browser-act` CLI was not installed and `uv` was absent, so no
  additional engine was installed for this QA task.
- The local dev server initially failed inside the sandbox with
  `listen EPERM` on `127.0.0.1:5173`; the approved outside-sandbox Vite process
  started successfully and served the Chrome run.

## Chrome Results

| Scenario | Result | Actual rendered evidence |
| --- | --- | --- |
| Empty program / initial gating | **Partially passed** | On opening the simulator, Blockly displayed its toolbox with no workspace blocks. Practice showed `Season` ready and `Field`, `Robot`, `Drive wheels`, and `Program` as needing setup. The primary control was `Choose field`, not `Run program`. |
| First-missing guidance | **Passed** | The visible status said `Next setup: Field. Use Choose field to continue`; selecting `Choose field` opened the `Expert Setup: table and launch` corrective dialog and displayed its field controls (`Mat Size`, `Load`, `Camera`, `Select`, `Remove`, `Rename`). |
| Save | **Passed for in-app state; artifact unverified** | `Save project` opened `Save project or export setup` with `Save project (.lsp-project)`. Selecting it changed the rendered status from `Unsaved changes` to `Project state saved.` The managed browser did not expose the downloaded file, so archive bytes and reload are unverified. |
| Prepared `.lsp-project` restore | **Unverified** | A known fixture exists at `/Users/Sheldon/Downloads/project.lsp-project` from earlier QA evidence, but this browser interface did not provide a file-upload operation. No project was loaded in this run. |
| Program-only first missing guidance | **Unverified** | The live state was missing field before program, so `Field` correctly remained the first required action. A prepared field/robot/wheel configuration with an empty Blockly workspace could not be created or restored in this session. |
| Start / stop / reset | **Unverified** | Without a loaded field, robot, two configured drive wheels, and program, the run gate correctly did not offer a start action. No run, stop, or reset state was reached. |
| Responsive basics | **Unverified** | The managed Chrome surface did not provide viewport resizing. No narrow-width or zoom run was performed. |

## Firefox Results

All requested Firefox scenarios are **unverified**: Firefox was not available in
the automation inventory, and no browser was installed or launched as part of
this read-only QA assignment.

## Findings for the Lead

No concrete regression was demonstrated by the executed Chrome scenarios.

The browser release gate remains **not accepted** because the central prepared
project flow has no fresh evidence in this run. Consequently, the empty-program
transition after a complete setup, `Run` → `Stop run` → `Reset run`, saved-project
round trip, narrow viewport, and all Firefox flows are also not accepted.

The executed gating behavior is consistent with the Slice 1 requirement that the
first incomplete prerequisite is the only primary correction: `Field` preceded
`Program`, and its guidance opened the associated setup surface.

## Practical Retry Matrix

Run this in both Chromium and Firefox with a file-capable browser automation
session:

1. Load `/Users/Sheldon/Downloads/project.lsp-project`; confirm all five
   readiness items and an enabled `Run program` control.
2. Clear Blockly blocks; confirm `Program` is the sole missing item and
   `Open program` is the primary guidance. Restore one start block and confirm
   readiness updates without reload.
3. Start, stop, and reset the prepared run. Confirm visible controls and restored
   idle setup after reset.
4. Save the prepared project, make a visible change, reload the saved archive,
   and verify scene, robot, wheels, season, and blocks round-trip.
5. Repeat the essential flow at a narrow viewport (about `820x900`) and record
   whether primary controls remain reachable through normal scrolling.

## Commands and Results

```text
npm run dev -- --host 127.0.0.1 --port 5173
```

Passed after the approved outside-sandbox launch; Vite reported
`http://127.0.0.1:5173/`.

No automated test, type-check, or build command was rerun in this browser-only
assignment. Existing repository changes were left untouched.
