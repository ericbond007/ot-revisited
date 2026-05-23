"""Split the single-rut FLUX trail raw into TWO composable assets.

FLUX reliably paints ONE good painterly rut but refuses two (v11–v15
history — prompt engineering hit its ceiling). Strategy C (Dave's call):
keep the one *painted* rut, composite it twice in the SVG.

This produces, from `raw/ground_strip-trail--flux.png`:

  static/wagon-bg/ground_strip-trail.webp  — DIRT BASE: the native rut
      (and the FLUX top/bottom edge artifacts) healed out → uniform
      painterly dirt, with the same top alpha-fade as the old pipeline.

  static/wagon-bg/ground_strip-rut.webp    — RUT SPRITE: a horizontal
      band cropped around the painted groove, with top+bottom alpha
      feather so it composites onto the dirt as a recessed groove with
      no rectangle seam. Same source pixels as the base ⇒ tone matches
      exactly. GroundPainting.svelte overlays this at TWO y positions.

Re-runnable on the locked raw — no FLUX re-run needed. Band geometry
below is derived from the v15 raw luminance row-profile (rut core
y=167–189, faint tail to ~207; edge artifacts 0–25 and 358–383).
"""

from pathlib import Path

from PIL import Image

from alpha import copy_with_top_fade_to_webp

THIS_DIR = Path(__file__).parent
RAW = THIS_DIR / "raw" / "ground_strip-trail--flux.png"
STATIC = THIS_DIR.parent.parent / "static" / "wagon-bg"
TMP = THIS_DIR / "raw" / "_dirt-healed.png"

# Same top-fade as the prior pipeline (alpha.py defaults used by
# ground_strips_flux.py) so the dirt base drops into the backdrop the
# same way it did before.
ALPHA_CUT_FRAC = 0.20
ALPHA_FADE_FRAC = 0.12

# --- rut geometry in the 384-tall raw (from luminance analysis) ---
RUT_CORE = (162, 212)          # heal this band out of the dirt base
RUT_SPRITE_BAND = (148, 226)   # crop a bit wider for feather headroom
SPRITE_FEATHER = 20            # px of top & bottom alpha ramp on sprite
BOTTOM_EDGE = (356, 384)       # FLUX dark bottom-edge artifact → heal too

# Clean dirt donor band (between top artifact end ~25 and rut start
# ~162): used to paint over the rut + bottom-edge regions.
DONOR = (84, 150)


def _heal(img: Image.Image, y0: int, y1: int) -> None:
    """Overwrite rows [y0,y1) with a vertically-tiled copy of the clean
    DONOR dirt band (dirt is noise-like; a tiled copy reads seamless at
    the heavy display downscale)."""
    W = img.size[0]
    donor = img.crop((0, DONOR[0], W, DONOR[1]))
    dh = donor.size[1]
    y = y0
    while y < y1:
        h = min(dh, y1 - y)
        img.paste(donor.crop((0, 0, W, h)), (0, y))
        y += h


def main() -> None:
    if not RAW.exists():
        raise SystemExit(f"raw not found: {RAW}")
    src = Image.open(RAW).convert("RGB")
    W, H = src.size
    print(f"source raw {W}x{H}")

    # 1. DIRT BASE — heal native rut + bottom edge, then top alpha-fade.
    dirt = src.copy()
    _heal(dirt, *RUT_CORE)
    _heal(dirt, *BOTTOM_EDGE)
    dirt.save(TMP)
    out_dirt = STATIC / "ground_strip-trail.webp"
    copy_with_top_fade_to_webp(
        TMP, out_dirt, cut_frac=ALPHA_CUT_FRAC, fade_frac=ALPHA_FADE_FRAC
    )
    TMP.unlink(missing_ok=True)
    print(f"  dirt base  -> {out_dirt.relative_to(STATIC.parent.parent)} "
          f"(healed rut {RUT_CORE}, bottom {BOTTOM_EDGE})")

    # 2. RUT SPRITE — crop band, feather top+bottom alpha to transparent.
    y0, y1 = RUT_SPRITE_BAND
    band = src.crop((0, y0, W, y1)).convert("RGBA")
    bw, bh = band.size
    alpha = band.getchannel("A").load()
    px = band.load()
    for yy in range(bh):
        if yy < SPRITE_FEATHER:
            a = int(255 * yy / SPRITE_FEATHER)
        elif yy >= bh - SPRITE_FEATHER:
            a = int(255 * (bh - 1 - yy) / SPRITE_FEATHER)
        else:
            a = 255
        for xx in range(bw):
            r, g, b, _ = px[xx, yy]
            px[xx, yy] = (r, g, b, a)
    out_rut = STATIC / "ground_strip-rut.webp"
    band.save(out_rut, "WEBP", quality=88, method=6)
    print(f"  rut sprite -> {out_rut.relative_to(STATIC.parent.parent)} "
          f"({bw}x{bh}, feather {SPRITE_FEATHER}px)")


if __name__ == "__main__":
    main()
