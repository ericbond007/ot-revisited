"""Generate WHEEL sprites — front + rear sizes, painterly oil painting.

Hybrid+ pipeline: each wheel rendered separately, composited via SVG
<image> overlays, rotated via SVG transform for the spinning animation.
The wagon-body raster is generated WITHOUT wheels; wheels overlay
on top at the correct anchor positions.

Output: static/wagon-bg/wagon-wheels/<role>--<wagon-model>.png

Front + rear sizes per wagon type. Square aspect (1024×1024) since a
wheel is round.
"""

from pathlib import Path

from flux_client import generate_to, ping

OUT_DIR = Path(__file__).parent.parent.parent / "static" / "wagon-bg" / "wagon-wheels"

WIDTH = 1024
HEIGHT = 1024


COMMON = (
    "Painterly oil painting in the style of Hudson River School. The "
    "wheel floats alone in the center of a plain cream-white background, "
    "with NO wagon, NO body, NO oxen, NO ground, NO landscape. The "
    "wheel is shown FROM THE SIDE so it appears as a perfect circle, "
    "with all spokes radiating from the central hub equally visible "
    "around the rim. Brush stroke detail period 1840s, isolated subject."
)


VARIANTS = [
    (
        "front--prairie-schooner",
        910001,
        "Side view of a 1840s emigrant wagon FRONT WHEEL: medium-size "
        "wood-spoked iron-tired wagon wheel, hardwood (oak or maple) "
        "with about 10 spokes radiating from a dark iron-banded hub "
        "out to the iron tire band wrapping the wood rim. Weathered "
        "brown wood with grain visible, dark iron tire and iron hub. "
        "Lynch pin visible at the hub center. " + COMMON,
    ),
    (
        "rear--prairie-schooner",
        920001,
        "Side view of a 1840s emigrant wagon REAR WHEEL: large size "
        "wood-spoked iron-tired wagon wheel, taller than the front "
        "wheel, hardwood (oak or maple) with about 12 spokes radiating "
        "from a dark iron-banded hub out to the iron tire band "
        "wrapping the wood rim. Weathered brown wood with grain "
        "visible, dark iron tire and iron hub. Lynch pin visible at "
        "the hub center. " + COMMON,
    ),
    (
        "front--light",
        930001,
        "Side view of a 1840s small farm wagon FRONT WHEEL: small "
        "wood-spoked iron-tired wagon wheel, weathered hardwood with "
        "about 8 spokes from a dark iron hub out to the iron tire "
        "band. " + COMMON,
    ),
    (
        "rear--light",
        940001,
        "Side view of a 1840s small farm wagon REAR WHEEL: medium "
        "wood-spoked iron-tired wagon wheel, weathered hardwood with "
        "about 10 spokes from a dark iron hub out to the iron tire "
        "band. " + COMMON,
    ),
    (
        "front--heavy",
        950001,
        "Side view of a 1840s heavy Conestoga FRONT WHEEL: large "
        "wood-spoked iron-tired wagon wheel with thick wood spokes, "
        "hardwood with about 10 spokes from a dark iron-banded hub. "
        + COMMON,
    ),
    (
        "rear--heavy",
        960001,
        "Side view of a 1840s heavy Conestoga REAR WHEEL: very tall "
        "wood-spoked iron-tired wagon wheel (largest of any wagon "
        "type, up to 5 feet tall), thick wood with about 14 spokes "
        "from a heavy iron-banded hub out to a wide iron tire band. "
        + COMMON,
    ),
]


def main() -> None:
    import sys
    if not ping():
        raise SystemExit("ComfyUI not reachable at http://127.0.0.1:8188")
    filter_names = set(sys.argv[1:])
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    selection = [v for v in VARIANTS if not filter_names or v[0] in filter_names]
    print(f"FLUX-generating {len(selection)} wheel sprite(s)\n")
    for i, (name, seed, prompt) in enumerate(selection, 1):
        out = OUT_DIR / f"{name}.png"
        print(f"[{i}/{len(selection)}] {out.name}  ({WIDTH}x{HEIGHT}, seed={seed})", flush=True)
        generate_to(out, prompt, WIDTH, HEIGHT, seed)
        print(f"   -> {out.relative_to(Path(__file__).parent.parent.parent)}\n")
    print("done.")


if __name__ == "__main__":
    main()
