"""Generate painterly wagon REFERENCE images for vtracer → SVG conversion.

These are NOT production game assets — they're high-quality painted references
that get traced to vector SVG, then hand-restructured into the wagon body
component (per docs/historical-pass/10-wagon-format-decision.md, phase A).

Three references, one per wagon model: light / prairie_schooner / heavy.
Each in "Stop 0 / fresh" condition — clean, intact canvas, no patches.
Wear states (Stop 1-4) come later via SVG overlays, not separate paintings.

Outputs land at tools/wagon-bg/wagon-refs/<model>.png.

LoRA: ht_landscape v2_2000 at 0.4 weight — gentle nudge toward the painted-
backdrop aesthetic without forcing the LoRA's strong horizon-vista priors.
If the wagon comes out as a landscape painting WITH a wagon, drop weight to
0 and try again.
"""

from pathlib import Path

from comfy_client import generate_to

OUT_DIR = Path(__file__).parent / "wagon-refs"
LORA = ("ht_landscape_v2_2000.safetensors", 0.7)

NEGATIVE = (
    "oxen, mules, horses, cattle, livestock, people, characters, driver, "
    "rider, walking figure, "
    "background scenery, sky, ground, dirt road, grass, prairie, hills, "
    "mountains, trees, rocks, "
    "buildings, barn, house, fence, stone wall, brick wall, cobblestone, "
    "multiple wagons, two wagons, wagon train, road, path, parked wagons, "
    "modern wagon, motorized, motor vehicle, automobile, car, truck, "
    "missing canvas, exposed bows without canvas, naked frame, "
    "anime, manga, photograph, photorealistic, 3D render, CGI, "
    "low quality, blurry, deformed, watermark, text, signature, ui, hud, "
    "cropped, partial wagon, cut off"
)

# All three views: side profile, full subject including the canvas bonnet,
# isolated against a plain neutral backdrop, painterly oil-painting style.
COMMON_FRAMING = (
    "complete wagon visible in full from the wood tongue at the front to "
    "the rear axle, including the entire canvas bonnet stretched over its "
    "hickory bows clearly visible at the top of the frame, side profile view, "
    "the wagon centered in a wide frame with empty cream-colored neutral "
    "background, museum reference plate illustration, painterly oil painting "
    "in the style of period American landscape art, brush-stroke detail, "
    "historical accuracy 1840s"
)

WAGONS = [
    (
        "light",
        310003,
        "small western emigrant farm wagon, four wood-spoked iron-tired wheels "
        "with the front pair noticeably smaller than the rear pair, straight "
        "square wood bed about 8 feet long with flat plank sides and chipped "
        "corner detail, single-hooped canvas bonnet stretched over four "
        "hickory bows, clean off-white double-thickness canvas drawn tight "
        "with drawstrings at both front and rear, wood tongue extending "
        "forward to a doubletree with two small singletrees, iron-banded "
        "jockey toolbox at the front of the bed below the seat, single small "
        "water keg strapped to the side, small tar bucket dangling on a hook "
        "from the rear axle, pristine fresh-from-the-outfitter appearance, "
        + COMMON_FRAMING,
    ),
    (
        "prairie_schooner",
        320003,
        "classic emigrant prairie schooner covered wagon, four wood-spoked "
        "iron-tired wheels with the front pair smaller than the rear, "
        "straight square wood bed about 10 feet long with flat plank sides, "
        "iron banding around the bed corners, canvas bonnet over six hickory "
        "bows curving up and over the bed, clean off-white double-thickness "
        "canvas with drawstring closures at front and rear, the canvas "
        "extending slightly past the bed at both ends (cantilevered for shade "
        "and rain shed), Colonial Blue paint visible on the wood side panels "
        "with hand-forged iron banding, wood tongue extending forward to an "
        "iron-banded doubletree with paired singletrees, iron-banded jockey "
        "toolbox at the front of the bed, water keg strapped to the side, "
        "tar bucket hanging on a chain from the rear axle, pristine fresh-"
        "from-Independence appearance, "
        + COMMON_FRAMING,
    ),
    (
        "heavy",
        330002,
        "single large heavy emigrant covered wagon (Conestoga style), one "
        "wagon only, four large wood-spoked iron-tired wheels with smaller "
        "front pair and tall rear pair, the wood bed curves up at the front "
        "and rear ends like a boat hull, the canvas bonnet follows the same "
        "upturned curve creating a sailing-ship silhouette, off-white double-"
        "thickness canvas drawn tight at both ends with rope drawstrings, "
        "iron banding wraps the curved bed, hand-forged ironwork on the "
        "corners, wood tongue extending forward to an iron-banded doubletree, "
        "jockey toolbox at the front of the bed, water keg strapped to the "
        "side, tar bucket dangling from the rear axle, pristine freshly-"
        "outfitted appearance, "
        + COMMON_FRAMING,
    ),
]

# 1216×832 (3:2-ish) — SDXL bucket aspect that gives the wagon room for
# its full silhouette including the canvas bonnet without cropping the top.
# Square 1024×1024 cropped the bonnet on the first pass.
WIDTH = 1216
HEIGHT = 832


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Generating {len(WAGONS)} wagon reference image(s)\n")
    for i, (model, seed, prompt) in enumerate(WAGONS, 1):
        out = OUT_DIR / f"wagon-{model}.png"
        print(f"[{i}/{len(WAGONS)}] {out.name}  ({WIDTH}x{HEIGHT}, seed={seed})", flush=True)
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
        print(f"   -> {out.relative_to(Path(__file__).parent)}\n")
    print("done.")


if __name__ == "__main__":
    main()
