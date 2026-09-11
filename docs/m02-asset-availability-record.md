# M02 asset availability record

**Status:** evidence-only; no model or mechanics admitted  
**Mission:** M02 Exploding Seeds  
**Record:** `src/lib/fll/m02-asset-availability-record.ts`

## Admissible artifact added

The availability record is the next safe M02 artifact because it inventories what
the official source set and repository actually provide without inferring any
geometry, placement, mechanism, or collision behavior.

-   FIRST's Founders Edition Challenge season-materials index links a 15-page
    English Model 2 building-instruction PDF.
-   The same index links a field setup reference guide, field setup video, and
    robot-game missions video. Their M02-specific placement or behavior content is
    not extracted by this record.
-   The checkout contains `45832_02.physics.json`, but it is an unadmitted
    fixed-body placeholder. `45832_02.mpd` is named by the dependency manifest but
    is not committed as a root model asset.

The canonical Model 2 PDF link recorded by this artifact is
`fll-challenge-bioglow-bi-enus-book-02.pdf`. This is the link exposed by the
season-materials index; it is intentionally not treated as an importable mesh.

## Why a semantic manifest is not next

A semantic manifest would have to assign stable identities to the stalk and the
three scored seeds. That requires an admitted asset partition and registered
placement. Neither is available, so assigning IDs now would be invented simulator
structure rather than evidence.

## Required follow-up

Create the `m02-model-asset-intake` package declared in the availability record:
source/terms, immutable version identity, format and coordinate conventions,
reproducible import result, and field-registration evidence. Review that package
before creating a semantic manifest. Treat release mechanism, contact tolerance,
and calibration as separate evidence gates.
