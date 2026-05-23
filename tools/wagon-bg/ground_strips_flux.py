"""FLUX.1-dev ground_strip generator.

A/B test vs. the SDXL versions in static/wagon-bg/ground_strip-{biome}.webp.
Outputs to ground_strip-{biome}--flux.webp so we can compare side by side
in the gallery without overwriting the SDXL files.

FLUX's prompt language is natural English sentences, not SDXL tag soup.
The descriptions here lean hard into the "flat 2D side-scrolling game
tile" framing because FLUX follows literal composition instructions
much more reliably than SDXL — that's why we're trying it for this
layer in particular.

NOTE on aspect ratio + seamless tiling:
  - FLUX recommended resolution is ~1MP area. 2048×512 = 1.0MP, 4:1
    aspect — matches the wide-strip shape we want without going off the
    model's training distribution.
  - flux_client.py doesn't expose ComfyUI's seamless-tile sampler. These
    strips will have a visible seam when tiled. For this POC pass we
    accept that; if the perspective fix works, we'll add seamless gen
    in a follow-up (img2img inpaint at the seam, or extend flux_client
    with a seamless KSampler variant).
"""

from pathlib import Path

from alpha import copy_with_top_fade_to_webp
from flux_client import generate_to, ping

THIS_DIR = Path(__file__).parent
RAW_DIR = THIS_DIR / "raw"
STATIC_DIR = THIS_DIR.parent.parent / "static" / "wagon-bg"

# Wide-thin aspect to maximize horizontal detail (where the wagon scrolls
# through new content) and minimize wasted vertical resolution (since the
# scene only renders the strip at ~90 SVG units tall). 4096×384 = 1.57MP,
# ~10.7:1 aspect, within FLUX-dev FP8's VRAM budget. Display scales 4096
# down to 1280 = 3.2× sharper horizontal than the previous 2048-wide
# source; vertically we still over-resolve (384 src → 90 display) but
# 384 is the smallest dimension FLUX reliably composes well.
WIDTH = 4096
HEIGHT = 384

# Top alpha fade — FLUX paints a pale "sky-like" band above the grass-line
# in the trail tile despite explicit "NO sky" prompting. Rather than fight
# the model, we post-process: zero out the top portion of the source so the
# backdrop painting shows through there.
#
# v1: cut_frac=0.18 → killed sky band but left a strip of "grass" that
#     also read as horizon-like / sky-tan.
# v2 (current): cut_frac=0.30 → kills sky + grass band entirely (grass
#     runs roughly source y=0-120 ≈ 23%; cut at 30% leaves margin and
#     preserves the top rut at source y=199). The trail then plants its
#     dirt-and-ruts surface directly into the backdrop's bottom edge with
#     no green grass band as a transition.
# With cut at 30% the top rut landed right at the alpha-cut edge,
# creating a "barrier line" effect — the rut had no dirt above it to
# read as a recessed feature, so it looked like a horizontal line
# capping the strip. Pulling the cut earlier (0.20 → y=77 in 384-tall
# source) puts ~10 SVG units of bright dirt above the top rut, so the
# rut reads as a rut on a trail surface, not a top edge.
ALPHA_CUT_FRAC = 0.20
# Long 12% fade (46px) for a very gradual transparent → opaque
# transition. The very top of the source (y=0-30, dark FLUX edge) stays
# in the fully-transparent zone so no dark line bleeds into the fade.
ALPHA_FADE_FRAC = 0.12

# FLUX classifier guidance — internal conditioning scale, not CFG. Bumped
# from default 3.5 to 5.5 to make FLUX follow the positive prompt
# description more strictly. Tradeoff: higher values can produce mild
# oversaturation; with our painterly oil-illustration anchor that reads
# fine. Pair with positively-phrased prompts (no "NO X" wording) since
# FLUX has no real negative prompt.
FLUX_GUIDANCE = 3.5

# Common composition language injected into every biome prompt. FLUX
# obeys explicit composition instructions when they're at the front of
# the prompt; the biome-specific details follow.
#
# Composition history:
#   v1: said "two parallel wagon-wheel ruts running horizontally" — FLUX
#       read that as first-person-walking POV, with ruts receding into
#       the distance. Dave's correction: "we see it as if we are walking
#       on it, but we need to see it as if we are off the trail, looking
#       at the side view of the trail."
#   v2: dropped ruts entirely; explicit "camera off to the side of the
#       trail looking sideways across it" + 2D platformer reference.
#       Perspective landed correctly. Issues: subsoil cross-section
#       below the trail (Dave: "remove the subsoil"); framing grass /
#       objects at the left and right edges (Dave: "remove the left and
#       right side objects/grass"); no visible ruts on the trail.
#   v3: drop subsoil band; trail fills lower portion; edge-to-edge,
#       no framing; ruts re-added. Perspective fixed but only ONE rut
#       rendered (Dave: "we need two tracks. right now, it just renders
#       one"). Also Dave preferred desert's cleanness ("all we want to
#       render is the actual trail") — other biomes were too busy.
#   v4: explicit two-ruts language + simplified biomes. Worked! Dave
#       picked desert v4 as the canonical for all biomes. But noted the
#       top of the tile reads as "sky" — FLUX painted the grass band
#       with pale atmospheric tan tones that look like a horizon, even
#       though we said "NO sky." Top-of-frame "horizon" is a strong
#       FLUX prior the negative didn't override.
#   v5: dense green grass top band, opaque, anti-sky negatives. Worked
#       but grass was too prominent/distracting, and FLUX was painting
#       grass tufts INTO the trail surface as well (Dave: "the grass is
#       too distracting").
#   v6: NO grass anywhere. Pure dirt with scattered rocks/pebbles/twigs.
#       Result: still painted bushes despite "NO bushes" wording.
#   v7: added "NO BUSHES, NO shrubs, NO foliage, NO sagebrush" to the
#       negative wording. Result: STILL painted bushes. Diagnosis:
#       FLUX has no real negative prompt — flux_client.py wires the
#       same conditioning to both positive and negative ksampler slots
#       with cfg=1, so "NO X" language is silently ignored. The model
#       reads it positively and may paint X anyway.
#   v8: positively-phrased, guidance 5.5. Bushes finally gone. Tile
#       reads as a single flat dirt patch with two clean ruts.
#   v9: heavily-traveled, wider source (4096×384). Two ruts good, but
#       the top and bottom edges of the frame came out dark/burnt
#       (FLUX added vignette-like edge shading) and the central band
#       between the two ruts was too narrow / too clean.
#   v10: rut spacing pushed apart + wide central churned band + anti-
#       vignette wording. Composition right but came out TOO DARK /
#       BURNT (Dave). Causes: guidance 5.5 over-saturated; "beaten-down,
#       heavily worn, deep gouge marks" language all steered toward
#       darker shading.
#   v11: bright/warm palette but ruts compromise — FLUX painted only
#       ONE rut at y=124 despite the "TWO ruts" instructions; rest of
#       image was uniform bright dirt. Diagnosis: FLUX repeatedly
#       chooses to draw just one rut.
#   v12: dropped ruts entirely from FLUX, added SVG-overlay ruts. Dave:
#       "go back, what you had before was way better." Diagnosis: v11's
#       painterly dirt + baked-in (single) rut composed better than
#       v12's plain dirt + drawn-on lines, even though v11 only had
#       one rut. The SVG strokes read as painted-on, not natural.
#   v13: light warm color, two-ruts attempt, but FLUX painted the WHOLE
#       central band as a sunken/depressed trail zone with ruts inside
#       it. Dave: "it shouldn't be indented. the middle should be even
#       with the rest of the ground, just the two ruts are indented."
#       Also: the indented zone is too tall vertically.
#   v14: FLAT ground everywhere. The dirt surface is uniform
#       in elevation from corner to corner — NO sunken trail zone, NO
#       wide depressed central band. The only depressions in the dirt
#       are TWO narrow horizontal rut grooves (one upper, one lower),
#       positioned CLOSE together near the vertical middle of the
#       frame. Everything else — dirt above the top rut, dirt between
#       the ruts, dirt below the bottom rut — sits at the same flat
#       ground level. Left in a CONTRADICTORY half-edited state: the
#       preamble asserted both "FOUR grooves" AND "TWO ruts" AND "all
#       four ruts" simultaneously (an abandoned mid-edit experiment to
#       over-ask for 4 hoping FLUX would yield 2). Regen 2026-05-15
#       against this contradiction still under-delivered.
#   v15 (current): contradiction removed — exactly TWO ruts, but the
#       two are DIFFERENTIATED instead of described as identical
#       parallel lines. Root diagnosis of the persistent one-rut bug
#       (v11–v14): FLUX collapses two near-identical thin parallel
#       horizontals into a single averaged stroke. Fix: make them
#       distinct objects — an UPPER rut (deeper, more worn, slightly
#       darker) and a LOWER rut (shallower, fainter) at two clearly
#       different heights, explicitly "two SEPARATE grooves, never
#       merging." Wide 50%/85% spacing + flat-ground language kept
#       from v14. Seed held at 715015 to isolate the prompt as the
#       single changed variable; seed-search is the next lever only
#       if differentiation alone still yields one rut.
COMPOSITION_PREAMBLE = (
    "A 2D side-scrolling video game ground tile sprite, painted in a "
    "Hudson-River-School painterly oil illustration style. Orthographic "
    "side elevation view, looking straight sideways across a wagon "
    "trail. The trail runs perfectly horizontally, left to right across "
    "the entire frame. The whole image is brightly and evenly lit with "
    "flat, uniform daylight — no vignette, no edge darkening, no shadows "
    "along the top or bottom edges, no burnt corners. "
    "The image is a single continuous patch of flat dry trail dirt "
    "filling the ENTIRE frame from edge to edge and top to bottom — "
    "bright sandy tan and light ochre dust, sun-bleached and dry, "
    "uniform in color and elevation from corner to corner. The "
    "ground level is FLAT everywhere. There is NO sunken trail, NO "
    "depressed central zone, NO recessed trail bed — the dirt sits at "
    "one uniform ground level across the whole frame. "
    "The ONLY indented features in the dirt are exactly TWO long "
    "horizontal wagon-wheel ruts — a distinct UPPER rut and a distinct "
    "LOWER rut — running parallel from the left edge of the frame all "
    "the way to the right edge. These are TWO SEPARATE grooves at two "
    "different heights that never merge into one. The two ruts are "
    "deliberately DIFFERENT from each other so they read as two: the "
    "UPPER rut sits about 50 percent down from the top of the frame "
    "and is the deeper, more heavily worn one — a clearly visible "
    "recessed groove, slightly darker; the LOWER rut sits about 85 "
    "percent down from the top and is shallower and fainter — a "
    "softer, lighter scuffed groove. Between the two ruts is a LARGE "
    "band, roughly 35 percent of the frame height, of plain flat "
    "undisturbed dirt sitting at the SAME level as the rest of the "
    "ground. Above the upper rut is more plain dirt; below the lower "
    "rut is a small strip of plain dirt to the bottom edge. Both ruts "
    "are flat-bottomed surface grooves cut into otherwise level "
    "ground — the ground does NOT dip or sink between them. "
    "The dirt is otherwise plain — no scattered objects or debris in "
    "the painting itself. The two ruts and the flat dirt are the only "
    "features. Trail debris (pebbles, sticks, etc.) will be composited "
    "as a separate sprite layer in post-processing. "
    "Both ruts are subtle surface indentations — slightly darker than "
    "the surrounding dirt because they are recessed shadows, but still "
    "warm tan in tone. "
    "Sprinkled sparsely across the flat dirt are small inert objects: "
    "loose pebbles, small smooth stones, broken short twigs, and "
    "weathered wood chips in muted earth tones (gray, brown, tan), "
    "with a few oval ox hoofprints pressed flat into the dirt. The "
    "objects are tiny — none larger than a thumb-sized rock. "
    "The entire visible surface is brightly-lit, flat, bright sandy "
    "tan trail dirt with TWO distinct parallel ruts — a deeper upper "
    "rut about halfway down and a separate fainter lower rut near the "
    "bottom, with a wide band of plain dirt between them — and small "
    "debris scattered around. Nothing grows from the ground. "
)

# Single biome-neutral trail tile. Decision history: we initially
# generated 4 biome variants (prairie/forest/desert/mountains) but the
# trail surface itself reads the same across them once the "just the
# trail, no scenery" composition is locked in. The visual biome
# differentiation lives in the BackdropPainting layer (where it
# belongs); the ground strip is the consistent dirt-and-ruts surface
# that the wagon walks on, terrain-agnostic. Dropped per-biome
# generation 2026-05-13 after consolidating on the desert v4 design.
GROUND_STRIPS: list[tuple[str, str, int, str]] = [
    (
        "trail",
        "ground_strip-trail.webp",
        715015,  # held constant across v15 to isolate the prompt change
                 # (under the v14 contradictory prompt this seed gave ONE
                 # rut; seed-search is the next lever if v15 still does)
        COMPOSITION_PREAMBLE
        + "American 1840s Oregon-Trail era. Exactly two wagon-wheel "
        "ruts: a deeper, more worn UPPER rut at 50 percent down and a "
        "separate, fainter LOWER rut at 85 percent down, with a big "
        "band of plain flat dirt between them. Two distinct ruts, not "
        "one.",
    ),
]


def main() -> None:
    import sys
    if not ping():
        raise SystemExit("ComfyUI not reachable at http://127.0.0.1:8188")
    filter_names = set(sys.argv[1:])
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    STATIC_DIR.mkdir(parents=True, exist_ok=True)

    selection = [t for t in GROUND_STRIPS
                 if not filter_names or t[0] in filter_names]
    print(f"FLUX-generating {len(selection)} ground_strip tile(s) "
          f"({WIDTH}x{HEIGHT})\n")

    for i, (biome, out_filename, seed, prompt) in enumerate(selection, 1):
        raw_path = RAW_DIR / f"ground_strip-{biome}--flux.png"
        out_path = STATIC_DIR / out_filename
        print(f"[{i}/{len(selection)}] {out_filename}  "
              f"({WIDTH}x{HEIGHT}, seed={seed})", flush=True)
        generate_to(raw_path, prompt, WIDTH, HEIGHT, seed, guidance=FLUX_GUIDANCE)
        copy_with_top_fade_to_webp(
            raw_path,
            out_path,
            cut_frac=ALPHA_CUT_FRAC,
            fade_frac=ALPHA_FADE_FRAC,
        )
        print(f"   -> {out_path.relative_to(THIS_DIR.parent.parent)}\n")

    print("done.")


if __name__ == "__main__":
    main()
