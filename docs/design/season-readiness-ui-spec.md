# Season and mission readiness UI

## Participant flow

Practice starts with a season selector. A selected package shows its name, edition,
platform, revision, verification date, and source links. Changing the season is a
project edit; when unsaved work exists, the participant must explicitly continue
without saving or cancel the change. Selection changes package identity only and do
not silently replace the current scene.

The selected package's first mission is the initial mission view. Mission readiness
is evidence-based and does not imply official scoring or physical calibration. Each
capability exposes a plain-language status and the next corrective action. A mission
may be used for visual practice while scoring, mechanics, or calibration remain
unverified; the UI must not call that mission ready for official scoring.

## Progressive disclosure

Practice shows the season identity, selected mission, readiness headline, and the
next action. Provenance and capability details are expandable. Expert setup and
developer diagnostics remain in the existing tools area and are not required to
understand the participant readiness state.

## Acceptance scenarios

- A package registry with no selected package shows “Choose a season” and disables
  Run program until a package is selected.
- Selecting a package shows its identity and provenance without any BIOGLOW-specific
  wording in the generic component.
- An unavailable asset, unverified mechanic, unimplemented scorer, or uncalibrated
  mission displays a named corrective action and never claims official readiness.
- Selecting another package with unsaved work opens the existing confirmation flow;
  Cancel restores the prior selection and Continue without saving applies the new
  package while keeping the change visible as unsaved.
- Saving a project receives the selected package identity through `seasonPackage`;
  loading restores a package through its registry ID or visibly reports it as
  unavailable.

## Evidence limits

Package provenance records source metadata, not physical calibration. Browser,
accessibility, and participant acceptance remain separate evidence gates.
