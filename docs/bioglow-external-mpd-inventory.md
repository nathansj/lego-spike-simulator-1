# BIOGLOW external MPD inventory

The local external directory contains thirteen Studio-exported LDraw MPDs:
`45832_01.mpd` through `45832_13.mpd`. Their captured paths, byte sizes, and
SHA-256 identities are recorded in
`src/lib/fll/bioglow-external-mpd-inventory.ts`.

They are not copied into this repository. The MPD headers declare that their
geometry came from publicly shared Komurobo BIOGLOW Studio models and cite an
official LEGO Education building-instruction cross-check. This is third-party
local provenance, not proof of official geometry or permission to redistribute.

## Safe current use

The existing import flow accepts an MPD selected through **Load Scene > Load
object file**. The bundled `static/ldraw` dependency manifest covers the
M01--M13 root filenames, and the importer can discover the corresponding
bundled physics sidecar by filename.

This supports manual visual-asset intake for local practice. It does not admit
field registration, semantic segmentation, collider accuracy, mechanics,
scoring observations, calibration, or redistribution. In particular, the
M02--M13 sidecars remain fixed-body placeholders; importing their MPDs does not
make their mission mechanisms simulated.

## Before bundling or mechanics work

Verify the source's usable terms, retain an immutable permitted source or
approved checkout copy, compare it with official model/setup resources, then
record coordinate registration and a reviewed asset partition. Treat each
mission's colliders, joints, and scoring observations as separate evidence and
calibration gates.
