"""Generate small seamless texture tiles for wagon SVG <pattern> fills.

These textures are the painterly-aesthetic source for the option-4 render
strategy (per docs/historical-pass/10-wagon-format-decision.md): hand-
authored SVG paths fill themselves with these raster textures, giving
a painterly look on top of vector control.

Generated at 512×512 (SDXL-friendly bucket, small enough to render fast,
big enough to read at the wagon's actual on-screen size).

Outputs land at static/wagon-bg/wagon-tex/<name>.webp — kept separate
from the backdrop tiles so they're easy to reference.

LoRA: ht_landscape v2_2000 at 0.5 weight — light style nudge to match
the painted-backdrop aesthetic without forcing landscape composition
onto pure texture content.
"""

from pathlib import Path

from comfy_client import generate_to

OUT_DIR = Path(__file__).parent.parent.parent / "static" / "wagon-bg" / "wagon-tex"
LORA = ("ht_landscape_v2_2000.safetensors", 0.5)

NEGATIVE = (
    "scene, view, landscape, sky, horizon, perspective, distance, "
    "people, characters, animals, wagon, building, vehicle, "
    "logo, watermark, text, signature, ui, hud, "
    "anime, cartoon outlines, vector illustration, flat design, "
    "photograph, photorealistic, 3D render, CGI, "
    "low quality, blurry, deformed, "
    "multiple objects, composition"
)

COMMON = (
    "seamless tileable surface texture, painterly oil painting style "
    "matching American 19th-century landscape art, brush-stroke detail, "
    "no scene, no view, surface only"
)

TEXTURES = [
    (
        "canvas-weave",
        410001,
        "close-up texture of off-white cotton duck canvas, weathered, "
        "subtle horizontal weave pattern, slight tan and gray staining, "
        "warm cream tone with faint brown mottling, " + COMMON,
    ),
    (
        "weathered-wood",
        420001,
        "close-up texture of weathered hardwood plank, warm brown grain "
        "with darker knots and lighter streaks, slight gray sun-silvering, "
        "vertical wood grain direction, " + COMMON,
    ),
    (
        "blue-paint",
        430002,
        "close-up texture of Colonial Blue painted wood plank fully covered "
        "in dark navy-blue paint, the paint surface mostly intact with only "
        "tiny chips and edge-flakes revealing hints of brown wood at the "
        "knots and edges, soft satin-matte blue dominant covering 90 percent "
        "of the surface, faint wood-grain showing through as subtle texture "
        "beneath the paint, dusty old paint with character, " + COMMON,
    ),
    (
        "rust-iron",
        440003,
        "close-up texture of a rusted steel sheet, flat continuous solid "
        "metal surface, dark gunmetal gray base completely covered with "
        "patches of orange and brown rust corrosion, weathered iron, "
        "rough oxidation, painterly oil painting, "
        "no holes, no gaps, no grate, no bars, no fence, no buckle, "
        "no leather, just a solid weathered metal background, " + COMMON,
    ),
    (
        "leather-harness",
        450001,
        "close-up texture of weathered brown leather harness strap, dark "
        "tobacco-brown with slight cracking, oiled but worn, traces of "
        "stitching and a brass buckle highlight, " + COMMON,
    ),
]

WIDTH = 512
HEIGHT = 512


def main() -> None:
    import sys
    filter_names = set(sys.argv[1:])  # CLI args = subset of texture names to regen
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    selection = [t for t in TEXTURES if not filter_names or t[0] in filter_names]
    print(f"Generating {len(selection)} wagon texture tile(s)\n")
    for i, (name, seed, prompt) in enumerate(selection, 1):
        out = OUT_DIR / f"{name}.png"
        print(f"[{i}/{len(selection)}] {out.name}  ({WIDTH}x{HEIGHT}, seed={seed})", flush=True)
        # PNG is fine for SVG <pattern> hrefs; texture tiles are small
        # so the webp size win isn't meaningful. Skip conversion.
        # seamless=False — SeamlessTile's model-copy node OOMs on tight VRAM.
        # The wagon's pattern fills only repeat a few times each (e.g. canvas
        # weave 3-4 reps across the bonnet), so a soft seam at tile edges
        # reads as natural texture variation more than visible repetition.
        # Edge-blend post-process is available if needed via ImageMagick.
        generate_to(
            out,
            prompt,
            NEGATIVE,
            WIDTH,
            HEIGHT,
            seed,
            seamless=False,
            loras=[LORA],
        )
        print(f"   -> {out.relative_to(Path(__file__).parent.parent.parent)}\n")
    print("done.")


if __name__ == "__main__":
    main()
