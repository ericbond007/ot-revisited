"""Sanity test: can v2_2000 directly produce 3072x768 horizon-vista mid-layer
content via prompting alone? If yes, no layer-LoRA training needed; we just
prompt v2 differently for the mid tile.

Uses ht_landscape v2_2000 LoRA at 1.0, seamless x-axis (since these would
parallax-tile), with horizon-arranged composition prompts.
"""

from pathlib import Path

from comfy_client import generate_to
from prompts import NEGATIVE_PROMPT

OUT_DIR = Path(__file__).parent / "raw" / "horizon_vista_test"
LORA = ("ht_landscape_v2_2000.safetensors", 1.0)

# Composition prompts force horizon-band layout:
#   - "distant ... along a horizon line"
#   - "no foreground specimens"
#   - "wide sky overhead"
TRIGGER = "ht_landscape, "
TAIL = ", painterly oil painting"

TESTS = [
    # Historical-accuracy revision: Oregon Trail-era prairies were largely
    # treeless, with cottonwoods/willows confined to creek bottoms. The
    # earlier prompt pulled cottonwoods to the horizon (Hudson River creek-
    # scene trope), which reads wrong for an open-trail crossing. Whittredge
    # "A Breezy Day" (prairie_02) and Kensett's overcast plains (prairie_05)
    # are the reference: grass to the horizon, low rolling hills, big sky.
    (
        "prairie",
        "vast treeless prairie meeting the horizon, low rolling grass-covered hills "
        "in the far distance, dry tall prairie grass dominating the foreground with "
        "wildflowers, bunch grass, varied terrain with patches of taller and shorter "
        "grass, occasional small bush, a single thin willow line marking a creek "
        "bend visible only on one side of the middle distance, soft overcast sky "
        "with scattered clouds, late summer afternoon light, ocean of grass",
        220031,
    ),
    # Forest was approved on v2 prompts; keep seed + prompt unchanged.
    (
        "forest",
        "varied dark forest silhouette along a meadow horizon, mix of tall and short "
        "trees along the tree line, scattered small trees and shrubs across the "
        "mid-distance meadow, detailed foreground meadow with wildflowers ferns and "
        "tall grass, soft afternoon light",
        220012,
    ),
    # Desert: denser mid + foreground objects.
    (
        "desert",
        "distant red rock buttes and mesa cliffs receding to horizon, scattered sage "
        "brush and rocks across the mid-distance plain, dense detailed foreground "
        "sandy ground with rocks, tumbleweed clusters, dry brush, ocotillo, scattered "
        "yucca and prickly pear, warm late afternoon desert light",
        220023,
    ),
    # Mountains: snow caps, jaggier peaks, taller relief.
    (
        "mountains",
        "distant snow-capped jagged blue mountain peaks receding in atmospheric "
        "perspective, dramatic alpine relief with snow on highest summits, varied "
        "pine and fir forest along the foothills, mid-distance meadow with scattered "
        "boulders and conifers, detailed foreground rocky meadow with grass and "
        "wildflowers, soft hazy morning light",
        220024,
    ),
]


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, content, seed in TESTS:
        out = OUT_DIR / f"{name}_horizon.png"
        prompt = f"{TRIGGER}{content}{TAIL}"
        print(f"\n[{name}] seed={seed}\n  {prompt[:120]}...")
        generate_to(
            out, prompt, NEGATIVE_PROMPT,
            width=3072, height=768, seed=seed,
            seamless=True, loras=[LORA],
        )
        print(f"  -> {out.relative_to(Path(__file__).parent)}")
    print("\ndone.")


if __name__ == "__main__":
    main()
