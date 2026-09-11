# M01 Drone Survey rule provenance

## Verified source set

This record was verified on September 10, 2026 for the **2026-27 BIOGLOW
Founders Edition Challenge**. FIRST's [BIOGLOW season materials page][season]
identifies the Founders Edition Challenge and links the rulebook, scoresheets,
and Challenge Updates below.

| Authority                            | Stable URL                 | Pinned state                                                                                                                                                                                                                     | M01 use                                                                                      |
| ------------------------------------ | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| FIRST Robot Game Rulebook            | [PDF][rulebook]            | M01 is on page 9. The document displays no rulebook revision or update date. Its embedded PDF metadata has a modification date of April 29, 2026 (`+07:00`), which is production metadata rather than a published rule revision. | Primary M01 mission source; the card has the no-equipment-constraint symbol.                 |
| FIRST Challenge Updates              | [PDF][updates]             | Update 01, updated September 2, 2026. The document says FIRST-issued updates supersede other sources.                                                                                                                            | Update 01 replaces Mission 04 Lucky Leaves constraint language only; it does not revise M01. |
| FIRST Robot Game Software Scoresheet | [PDF][software-scoresheet] | No displayed revision or update date.                                                                                                                                                                                            | Independently lists the M01 observables and the general no-equipment-constraint wording.     |

The dated Challenge Update is the current authoritative update examined. Because
it does not alter M01, the rulebook's page-9 M01 card remains the applicable M01
source. The lack of a displayed rulebook revision/date is intentionally recorded;
the embedded PDF timestamp is not treated as a rules revision.

## Source-backed M01 contract

The M01 card awards 20 points when the drone is no longer touching the mat. It
adds 10 points when the LiDAR map is completely flipped over and the scan marker
is at least partly in the survey area. The card displays the no-equipment-
constraint symbol. Rulebook page 8 defines that symbol: a mission model cannot
earn points if it is touching equipment at the end of the match; the condition
applies only to that mission.

`src/lib/fll/drone-survey.ts` represents these source-backed Boolean conditions:

-   `droneNoLongerTouchingMat` gates the 20-point condition.
-   `lidarMapCompletelyFlipped` and `scanMarkerAtLeastPartlyInSurveyArea`, together
    with the base condition, gate the 10-point bonus.
-   `missionModelTouchingEquipmentAtEnd` disqualifies the whole M01 score under the
    displayed no-equipment constraint.

## Unresolved provenance and simulator limits

-   The M01 card does not publish numeric field geometry, a LiDAR flipped-orientation
    tolerance, a scan-marker footprint, or survey-area coordinates. These remain
    unresolved in `src/lib/fll/m01-semantic-manifest.ts`; no value in the fixture or
    observation test is an official value.
-   The no-equipment rule expressly uses the end of the match. The individual M01
    card does not state a separate sampling time for its other conditions. The current
    match controller supplies one final simulator observation when its caller invokes
    `finish()`; that lifecycle is a simulator contract, not a verified official match
    timing implementation.
-   The current source set does not establish which exact physical parts belong to
    the M01 mission model for collision/contact evaluation. The semantic manifest's
    `missionModel` body IDs are a repository integration mapping, not official model
    geometry evidence.
-   No M01-specific Challenge Update beyond Update 01 was available from the
    official season-materials page when checked. Recheck the page before changing
    scoring behavior or declaring a release current.

[season]: https://www.firstinspires.org/resources/library/fll/season-materials
[rulebook]: https://firstinspires.blob.core.windows.net/fll/challenge/2026-27/fll-challenge-bioglow-rgr.pdf
[updates]: https://firstinspires.blob.core.windows.net/fll/challenge/2026-27/fll-challenge-bioglow-updates.pdf
[software-scoresheet]: https://firstinspires.blob.core.windows.net/fll/challenge/2026-27/fll-challenge-bioglow-software-scoresheet.pdf
