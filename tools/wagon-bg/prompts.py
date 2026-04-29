"""Wagon-view raster tile prompts.

20 entries: 4 layers × 5 terrains. Each tile has a fixed seed for
reproducibility. Edit a `content_prompt` here and rerun `generate.py`
to regenerate just that tile.
"""

from dataclasses import dataclass
from typing import Literal

Layer = Literal["far", "mid", "near", "ground"]
Terrain = Literal["prairie", "forest", "desert", "mountains", "river"]

STYLE_SUFFIX = (
    "cinematic side-scrolling 2D game background, orthographic side view, "
    "flat horizontal panorama band, no vanishing point, no perspective, "
    "stylized cartoon adventure game art, soft painterly lighting, "
    "atmospheric haze on distant elements, "
    "isolated on flat sky-blue background, no people no animals no wagon"
)

NEGATIVE_PROMPT = (
    "blurry low quality, photograph, photorealistic, 3D render, CGI, "
    "vector graphics, flat design, anime, manga, deformed, watermark, "
    "text, signature, people, characters, wagon, oxen, ui, hud, "
    "multiple panels, oversaturated, neon, "
    "perspective, vanishing point, road going into distance, "
    "trail going into distance, ink lines, sketchy, woodcut"
)

# Tile band heights — the raster occupies its band only; the rest of
# the SVG composition (sky gradient above, ground below) shows around it.
DIMS = {
    "far":    (2048, 512),
    "mid":    (2048, 384),
    "near":   (2048, 256),
    "ground": (2048, 160),
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
    # FAR — distant horizon, blurred and atmospheric. Side-on band.
    _t("far", "prairie",   100001, "distant rolling green prairie hills along the horizon, soft atmospheric blue haze, blurred by distance, side-on horizontal band"),
    _t("far", "forest",    100002, "distant tree-covered green hills along the horizon, layered receding silhouettes, atmospheric haze, side-on horizontal band"),
    _t("far", "desert",    100003, "distant red mesas and buttes along the horizon, dry dusty haze, side-on horizontal band"),
    _t("far", "mountains", 100004, "distant snow-capped rocky mountain ranges along the horizon, atmospheric blue haze, layered peaks, side-on horizontal band"),
    _t("far", "river",     100005, "distant rolling river-valley hills with cottonwood silhouettes, soft haze, side-on horizontal band"),

    # MID — middle-distance content, defined but not detailed. Side-on band.
    _t("mid", "prairie",   200001, "middle-distance rolling grass hills, scattered trees and low brush, side-on horizontal band, no path"),
    _t("mid", "forest",    200002, "middle-distance row of mixed trees, forest edge, side-on horizontal band"),
    _t("mid", "desert",    200003, "middle-distance rocky desert outcrops with sagebrush, side-on horizontal band"),
    _t("mid", "mountains", 200004, "middle-distance pine-covered foothills with exposed rock, side-on horizontal band"),
    _t("mid", "river",     200005, "middle-distance riverbank willows and grass hummocks, side-on horizontal band"),

    # NEAR — foreground vegetation strip. No path, no perspective.
    _t("near", "prairie",   300001, "foreground prairie grass clumps and wildflowers, side-on horizontal band, no path"),
    _t("near", "forest",    300002, "foreground forest underbrush, ferns, fallen logs, side-on horizontal band, no path"),
    _t("near", "desert",    300003, "foreground sagebrush and prickly pear cacti, side-on horizontal band, no path"),
    _t("near", "mountains", 300004, "foreground rocky terrain with boulders and alpine grass, side-on horizontal band, no path"),
    _t("near", "river",     300005, "foreground riverbank reeds, rushes, smooth wet stones, side-on horizontal band"),

    # GROUND — flat side-on ground surface texture. No path, no perspective lines.
    _t("ground", "prairie",   400001, "side-on view of prairie grass and dirt ground texture, horizontal strip, no path, no perspective lines"),
    _t("ground", "forest",    400002, "side-on view of forest floor with leaf litter and soil, horizontal strip, no path"),
    _t("ground", "desert",    400003, "side-on view of sandy desert ground with scattered pebbles, horizontal strip, no path"),
    _t("ground", "mountains", 400004, "side-on view of rocky mountain ground with gravel and stone, horizontal strip, no path"),
    _t("ground", "river",     400005, "side-on view of muddy riverbank ground with smooth wet stones, horizontal strip"),
]


if __name__ == "__main__":
    # Smoke check: 20 entries, unique filenames, unique seeds.
    assert len(PROMPTS) == 20, f"expected 20 prompts, got {len(PROMPTS)}"
    assert len({p.filename for p in PROMPTS}) == 20, "duplicate filenames"
    assert len({p.seed for p in PROMPTS}) == 20, "duplicate seeds"
    for p in PROMPTS:
        print(f"{p.filename:32s} seed={p.seed} {p.width}x{p.height}")
    print("OK: 20 tiles, no duplicates")
