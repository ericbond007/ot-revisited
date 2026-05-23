"""Regenerate wagon texture tiles with FLUX.1-dev (FP8) instead of SDXL.

A/B vs. wagon_textures.py — same texture content, FLUX backend.
Outputs land at static/wagon-bg/wagon-tex-flux/ so we can compare side
by side with the SDXL versions in static/wagon-bg/wagon-tex/.

FLUX's prompt language is more natural than SDXL's tag-style. The
prompts here are rewritten as descriptive sentences rather than
comma-separated tag lists.
"""

from pathlib import Path

from flux_client import generate_to, ping

OUT_DIR = Path(__file__).parent.parent.parent / "static" / "wagon-bg" / "wagon-tex-flux"

# 1024×1024 — FLUX-recommended. Quality > size for tiles since they
# get downsampled into SVG <pattern> fills anyway.
WIDTH = 1024
HEIGHT = 1024

TEXTURES = [
    (
        "canvas-weave",
        510002,
        "Painterly oil painting macro detail of woven cotton duck cloth, "
        "individual horizontal and vertical fiber threads clearly visible "
        "in a tight basket-weave pattern, off-white tan-cream color with "
        "subtle stained mottling. The texture is fabric, not paper — "
        "thread tooth and weave structure dominate the surface. Slight "
        "warm gray brown stains in places. Soft matte cotton, no gloss, "
        "no shine. Surface texture only — no scene, no people, no view.",
    ),
    (
        "weathered-wood",
        520002,
        "Painterly oil painting close-up of a dry weathered hardwood "
        "plank, dusty matte surface with no shine or gloss, warm brown "
        "grain with darker knots and lighter streaks, gray sun-silvering "
        "from years of weather, vertical wood grain direction. Dry, "
        "splintered, faded farm wood. Surface texture only. Brush stroke "
        "detail. American 19th-century landscape art style.",
    ),
    (
        "blue-paint",
        530001,
        "Painterly oil painting close-up of a Colonial Blue painted "
        "vertical wood plank fully covered in dark navy blue paint, the "
        "paint surface mostly intact with only tiny chips and edge "
        "flakes revealing hints of brown wood at the knots and edges. "
        "Soft satin-matte blue dominant covering 90 percent of the "
        "surface, with faint wood grain showing through as subtle "
        "texture beneath the paint. Period 1840s emigrant wagon. "
        "Vertical plank structure visible. Brush stroke detail. No "
        "gloss, no shine.",
    ),
    (
        "rust-iron",
        540001,
        "Painterly oil painting close-up of a rusted steel sheet, flat "
        "continuous solid metal surface, dark gunmetal gray base "
        "completely covered with patches of orange and brown rust "
        "corrosion, weathered iron with rough oxidation. Surface texture "
        "only — no holes, no gaps, no grate, no bars, no leather. "
        "Period 1840s wrought iron weathering. Brush stroke detail.",
    ),
    (
        "leather-harness",
        550001,
        "Painterly oil painting close-up of a weathered brown leather "
        "harness strap, dark tobacco brown with slight cracking, oiled "
        "but worn, with traces of stitching and a brass buckle highlight. "
        "Period 1840s emigrant wagon harness. Brush stroke detail.",
    ),
]


def main() -> None:
    import sys
    if not ping():
        raise SystemExit("ComfyUI not reachable at http://127.0.0.1:8188")
    filter_names = set(sys.argv[1:])
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    selection = [t for t in TEXTURES if not filter_names or t[0] in filter_names]
    print(f"FLUX-generating {len(selection)} wagon texture tile(s)\n")
    for i, (name, seed, prompt) in enumerate(selection, 1):
        out = OUT_DIR / f"{name}.png"
        print(f"[{i}/{len(selection)}] {out.name}  ({WIDTH}x{HEIGHT}, seed={seed})", flush=True)
        generate_to(out, prompt, WIDTH, HEIGHT, seed)
        print(f"   -> {out.relative_to(Path(__file__).parent.parent.parent)}\n")
    print("done.")


if __name__ == "__main__":
    main()
