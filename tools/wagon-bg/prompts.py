"""Wagon-view raster tile prompts.

20 entries: 4 layers × 5 terrains. Each tile has a fixed seed for
reproducibility. Edit a `content_prompt` here and rerun `generate.py`
to regenerate just that tile.
"""

from dataclasses import dataclass
from typing import Literal

Layer = Literal["backdrop", "ground"]
Terrain = Literal["prairie", "forest", "desert", "mountains", "river"]

STYLE_SUFFIX = (
    "cinematic 2D side-scrolling adventure game backdrop, "
    "stylized cartoon adventure game art, soft painterly lighting, "
    "viewer is a 6-foot-tall person standing 15 feet from the trail at ground level, "
    "side-on observer view, atmospheric haze on distant elements, "
    "no people no animals no wagon"
)

NEGATIVE_PROMPT = (
    "blurry low quality, photograph, photorealistic, 3D render, CGI, "
    "vector graphics, flat design, anime, manga, deformed, watermark, "
    "text, signature, people, characters, wagon, oxen, ui, hud, "
    "multiple panels, oversaturated, neon, ink lines, sketchy, woodcut, "
    "first-person POV, walking on trail, road going into distance"
)

# Two layer types now:
# - backdrop: the cohesive painted scene (sky → distant hills → mid → foreground edge),
#             one painting per biome, parallax-scrolled at runtime. SDXL-native ratio.
# - ground:   the trail / play-area band the wagon walks on. Generated at near-square
#             SDXL ratio; GroundBand.svelte slices the bottom-foreground portion at
#             display time so we never see a vanishing point.
DIMS = {
    # Backdrop is generated wide so the second tile copy doesn't enter
    # the visible 1280-px viewport for tens of seconds at 0.3× parallax
    # scroll. 2048×768 is the safe ceiling on 8 GB VRAM; pushing further
    # OOMs on the 3070 Laptop.
    "backdrop": (2048, 768),
    "ground":   (1024, 512),
}


@dataclass(frozen=True)
class TilePrompt:
    layer: Layer
    terrain: Terrain
    width: int
    height: int
    seed: int
    content: str

    @property
    def filename(self) -> str:
        return f"{self.layer}-{self.terrain}.webp"

    @property
    def full_prompt(self) -> str:
        return f"{self.content}, {STYLE_SUFFIX}"


def _t(layer: Layer, terrain: Terrain, seed: int, content: str) -> TilePrompt:
    w, h = DIMS[layer]
    return TilePrompt(layer=layer, terrain=terrain, width=w, height=h, seed=seed, content=content)


PROMPTS: list[TilePrompt] = [
    # BACKDROP — one cinematic painting per biome. Sky → distant hills → mid trees
    # → foreground edge, all in one cohesive scene. Side-on observer at 6ft height.
    # No 'river' backdrop — river only appears at landmark crossings, never as
    # open-trail terrain. BackdropPainting falls back to prairie there.
    _t("backdrop", "prairie",   100001, "wide cinematic side-view painting of a 1840s American prairie scene at midday, soft blue sky with painterly cumulus clouds high above, rolling green hills receding into atmospheric blue haze on the horizon, mid-distance scattered cottonwood trees, lush prairie grass and wildflowers in the foreground, painterly cartoon adventure game backdrop"),
    _t("backdrop", "forest",    100002, "wide cinematic side-view painting of a 1840s Pacific Northwest forest CLEARING at midday seen from the trail, soft sky visible above an open clearing, distant evergreen trees on the horizon line, mid-distance scattered evergreens with spaces between them, foreground grass meadow and ferns, painterly cartoon adventure game backdrop, wide-angle distant view, NOT a close-up of trees"),
    _t("backdrop", "desert",    100003, "wide cinematic side-view painting of a 1840s American Southwest high-desert scene at midday, warm pale sky, distant red rock mesas and buttes in dusty haze, mid-distance sagebrush and rocky outcrops, sandy ground with scattered desert plants in the foreground, painterly cartoon adventure game backdrop, dry no water"),
    _t("backdrop", "mountains", 100004, "wide cinematic side-view painting of a 1840s Rocky Mountains scene at midday, blue mountain sky, distant snow-capped peaks in atmospheric blue haze, mid-distance pine-covered foothills with exposed grey rock, alpine grass and boulders in the foreground, painterly cartoon adventure game backdrop"),

    # GROUND — kept for now but we're not iterating; current `?groundraster=1`
    # toggle stays so we can revisit later if SVG ground proves insufficient.
    _t("ground", "prairie",   400001, "overhead view of a dirt road through prairie grass, two parallel tire tracks cut into the dirt road, grass and wildflowers grow on both sides of the road, looking straight down, no sky, no horizon, no panorama, no landscape, ground only"),
    _t("ground", "forest",    400002, "overhead view of a dirt path through a forest, two parallel tire tracks in packed earth, ferns and fallen leaves on both sides, looking straight down, no sky, no horizon, no panorama, ground only"),
    _t("ground", "desert",    400003, "overhead view of a dry dirt path across desert ground, two parallel tire tracks in dust, sagebrush and pebbles on both sides, looking straight down, no sky, no horizon, no panorama, no water, ground only"),
    _t("ground", "mountains", 400004, "overhead view of a rocky dirt path across mountain ground, two parallel tire tracks in packed earth, gravel and stones on both sides, looking straight down, no sky, no horizon, no panorama, no snow, ground only"),
]


if __name__ == "__main__":
    # Smoke check: 8 entries (4 backdrops + 4 ground), unique filenames + seeds.
    # Skipping river — only appears at landmark crossings, never as open-trail.
    assert len(PROMPTS) == 8, f"expected 8 prompts, got {len(PROMPTS)}"
    assert len({p.filename for p in PROMPTS}) == 8, "duplicate filenames"
    assert len({p.seed for p in PROMPTS}) == 8, "duplicate seeds"
    for p in PROMPTS:
        print(f"{p.filename:32s} seed={p.seed} {p.width}x{p.height}")
    print(f"OK: {len(PROMPTS)} tiles, no duplicates")
