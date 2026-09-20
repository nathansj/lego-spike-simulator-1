# UI Platform 14 — Browser and Accessibility QA

## Scope

This is a read-only QA pass for the pending Chromium/Firefox, responsive,
keyboard, modal-focus, and loaded-program acceptance matrix. No source files
were modified by this task.

## Verified repository results

The following commands were run from the repository root:

```text
npm run check
```

Passed: `svelte-check` reported 0 errors and 0 warnings.

```text
npm test -- --run src/lib/fll/practice-run-gate.test.ts
```

Passed: 1 file, 7 tests.

```text
npm test -- --run
```

Passed: 47 files, 206 tests.

```text
npm run build
```

Passed: Vite production build; 999 modules transformed.

```text
npm exec -- prettier --check src/components/BlocklyComponent.svelte \
  src/components/SpikeSimulatorWindow.svelte \
  src/components/PracticeReadinessShell.svelte \
  src/lib/fll/practice-run-gate.ts \
  src/lib/fll/practice-run-gate.test.ts
git diff --check
```

Passed: all listed files use Prettier formatting and `git diff --check` is
clean.

These are repository-level results only; they do not prove browser behavior.

## Browser automation availability

- The repository has no Playwright, Puppeteer, or `@playwright/test` dependency.
- The host Playwright runtime was available through the Codex runtime, but its
  managed Chromium and Firefox executables were absent from the Playwright
  cache. Playwright therefore reported that the browsers needed to be
  installed.
- System applications exist at `/Applications/Google Chrome.app` and
  `/Applications/Firefox.app`. Launching them through the available Playwright
  runtime in headless mode failed for both engines: the browser process aborted
  before a page could be created (`Target page, context or browser has been
  closed`; both processes exited with `SIGABRT`).
- Starting Vite in the default sandbox failed with `listen EPERM` on
  `127.0.0.1:5173`. An escalated start reported a Vite server on port 5174,
  but the normal sandbox could not connect to that process. The follow-up
  escalated curl check was interrupted before producing HTTP evidence.

No browser page, screenshot, DOM snapshot, keyboard trace, or console capture
was obtained. Browser claims below are therefore **unverified**, not passed.

## Acceptance matrix

| Area | Result | Evidence / blocker |
| --- | --- | --- |
| Chromium: load scene, robot, wheels, and program | **Unverified** | Chromium headless launch aborted before page creation. |
| Chromium: `Program` becomes ready after loaded blocks | **Unverified in browser** | Source has workspace change handling in `src/components/SpikeSimulatorWindow.svelte:291-309`; gate tests pass, but no browser interaction occurred. |
| Chromium: Run buttons enable and start a run | **Unverified** | No browser page was created. |
| Chromium: clear blocks returns the gate to blocked | **Unverified** | No browser page was created. |
| Firefox: loaded-program readiness and Run controls | **Unverified** | Firefox headless launch aborted before page creation. |
| Responsive narrow viewport | **Unverified** | No viewport could be exercised. |
| Keyboard-only setup, run, stop, save, and load | **Unverified** | No keyboard event sequence could be executed. |
| Modal focus behavior | **Partially source-reviewed; browser unverified** | `src/components/UnsavedChangesModal.svelte` declares `role="dialog"`, `aria-modal="true"`, labelled/described references, and focuses the cancel button on open. Focus trapping, focus return, Escape behavior, and keyboard activation were not exercised. |
| Screen-reader/live status behavior | **Unverified** | `aria-live` and labels are present in the Practice shell, but no assistive-technology or accessibility-tree run was available. |

## Blockers

1. A runnable browser automation target is required for the acceptance matrix:
   install compatible Playwright browser binaries or provide a working
   Chromium/Firefox automation session.
2. The local Vite server must be reachable from that browser session. The
   current managed sandbox prevented reliable cross-process localhost access.
3. A real browser run is still required before accepting the loaded-program
   fix. Passing `practice-run-gate` tests and `svelte-check` does not demonstrate
   that the visible `Program` pill and Run buttons update in the UI.

## Exact next steps

1. In an environment with browser binaries, start `npm run dev` and open the
   reported local URL in Chromium and Firefox.
2. Repeat the matrix from `docs/qa/ui-platform-13.md`: empty program, add or
   load blocks, clear blocks, load a saved project, start/stop a run, and
   resize to a narrow viewport.
3. Use keyboard-only navigation to open setup controls and the unsaved-changes
   modal; record focus entry, focus return, Escape, and activation behavior.
4. Capture browser console errors and screenshots for both engines, then update
   this report with concrete pass/fail evidence.

## QA disposition

**Not accepted for browser/accessibility release gates.** Repository validation
passes, and the source-level readiness and accessibility hooks are present, but
the requested Chromium/Firefox and interaction evidence could not be collected
in this environment.
