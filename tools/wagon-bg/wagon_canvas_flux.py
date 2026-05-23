"""Generate a painterly side-view CANVAS BONNET + BOWS raster via FLUX.

Composited as an <image> overlay over the wagon SVG body at the bonnet
anchor coords (xL..xR horizontally, topY..bedY vertically). The canvas
bonnet is the visual centerpiece of a covered wagon — hand-authoring it
in SVG never landed (Dave: "lol no, we need a better image gen"), so
we paint it as raster and overlay it over the still-SVG wagon body.

FLUX max wide aspect is 1536×640 (2.4:1). Our bonnet's natural aspect
is ~4.5:1 (34 SVG units wide × 7-8 tall). The 2.4:1 raster will be
horizontally stretched slightly when composited via
`preserveAspectRatio="none"`. Acceptable trade-off for the painterly
quality FLUX delivers vs hand-authored SVG.

Outputs at static/wagon-bg/wagon-canvas/canvas-fresh.png to start;
later: damaged variants for wear states.
"""

from pathlib import Path

from flux_client import generate_to, ping

OUT_DIR = Path(__file__).parent.parent.parent / "static" / "wagon-bg" / "wagon-canvas"

WIDTH = 1536
HEIGHT = 640

# Single fresh-state canvas to start. Add wear states (dusty, patched,
# ragged, shredded) once the fresh look is locked.
VARIANTS = [
    (
        "canvas-fresh",
        610001,
        "Painterly oil painting in the style of Albert Bierstadt and "
        "Hudson River School: a SIDE VIEW of an 1840s emigrant prairie "
        "schooner CANVAS BONNET ONLY, no wagon body or wheels visible. "
        "The off-white cotton duck canvas is stretched TIGHT over six "
        "hickory wood bow ribs that span from one side to the other, "
        "with the foremost and rearmost bow ribs visible at the front "
        "and rear edges framing the openings. The canvas is gathered "
        "into a CINCHED CIRCULAR DRAWSTRING OPENING at the front (left "
        "side of the frame), with the dark interior of the wagon "
        "visible through the opening and the cord radiating around the "
        "puckered rim. Same construction at the rear (right side). "
        "Grommet rope ties along the bottom edges. Period 1840s "
        "prairie schooner construction (per Hansen Wheel & Wagon Shop "
        "and Scotts Bluff replicas). Clean fresh-out-of-Independence "
        "appearance, brush stroke detail, painterly oil painting on a "
        "plain cream-white background, isolated bonnet floating in the "
        "frame, no wagon body, no wheels, no oxen, no people, no "
        "landscape, no scene.",
    ),
]


def main() -> None:
    import sys
    if not ping():
        raise SystemExit("ComfyUI not reachable at http://127.0.0.1:8188")
    filter_names = set(sys.argv[1:])
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    selection = [v for v in VARIANTS if not filter_names or v[0] in filter_names]
    print(f"FLUX-generating {len(selection)} canvas variant(s)\n")
    for i, (name, seed, prompt) in enumerate(selection, 1):
        out = OUT_DIR / f"{name}.png"
        print(f"[{i}/{len(selection)}] {out.name}  ({WIDTH}x{HEIGHT}, seed={seed})", flush=True)
        generate_to(out, prompt, WIDTH, HEIGHT, seed)
        print(f"   -> {out.relative_to(Path(__file__).parent.parent.parent)}\n")
    print("done.")


if __name__ == "__main__":
    main()
