# LDraw library inventory

The supplied archives contain a very large number of LDraw files, so the
exhaustive list is generated on demand instead of being copied into the app.
Run this command from the repository root:

```sh
node scripts/inventory-ldraw-libraries.mjs > /tmp/ldraw-library-inventory.md
```

The generator lists every non-metadata `.dat` file under `parts/` and `p/`,
including the archive or archives containing each file. It accepts alternate
archive paths as positional arguments.

## Archive contents

| Archive        | `parts/` and `p/` `.dat` files | Role                            |
| -------------- | -----------------------------: | ------------------------------- |
| `ldraw.zip`    |                         36,604 | Official parts and primitives   |
| `ldrawunf.zip` |                          9,047 | Unofficial parts and primitives |
| `complete.zip` |                         36,603 | Official complete library       |

`ldrawunf.zip` uses root-level `parts/` and `p/` directories; the generator
normalizes that layout together with the `ldraw/` prefix used by the other
archives.

## Reference robot allowlist

The virtual reference robot uses only these direct part IDs, all present in
both `ldraw.zip` and `complete.zip`:

-   `32555.dat` — Technic 5 x 5 corner brick with holes
-   `3895.dat` — Technic 1 x 12 brick with holes
-   `54696.dat` — SPIKE Prime medium angular motor
-   `39367p01.dat` — SPIKE Prime 56 mm wheel with medium azure tyre

`ldrawunf.zip` is a primitive/unofficial supplement and does not provide the
four direct robot part IDs. Their nested dependencies are resolved from the
loaded library archives as usual.
