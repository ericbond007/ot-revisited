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
    # FAR — distant horizon, atmospheric. Filling the entire frame edge to edge.
    _t("far", "prairie",   100001, "distant rolling green prairie hills filling the entire horizon edge to edge, continuous unbroken silhouette across the whole frame, soft atmospheric blue haze, side-on horizontal panoramic band, no empty space"),
    _t("far", "forest",    100002, "distant tree-covered green hills filling the entire horizon edge to edge, continuous receding tree-line silhouettes across the whole frame, atmospheric haze, side-on horizontal panoramic band, no empty space"),
    _t("far", "desert",    100003, "distant red mesas and buttes filling the entire horizon edge to edge, continuous unbroken silhouette across the whole frame, dry dusty haze, side-on horizontal panoramic band, no empty space, no water"),
    _t("far", "mountains", 100004, "distant snow-capped rocky mountain ranges filling the entire horizon edge to edge, continuous mountain ridgeline across the whole frame, atmospheric blue haze, layered peaks, side-on horizontal panoramic band, no empty space"),
    _t("far", "river",     100005, "distant rolling river-valley hills filling the entire horizon edge to edge with cottonwood silhouettes, continuous skyline across the whole frame, soft haze, side-on horizontal panoramic band, no empty space"),

    # MID — middle-distance content, full frame coverage.
    _t("mid", "prairie",   200001, "continuous middle-distance rolling grass hills filling the entire frame edge to edge, scattered trees and low brush spread across the whole strip, side-on horizontal panoramic band, no path, no empty space"),
    _t("mid", "forest",    200002, "continuous row of mixed trees filling the entire frame edge to edge, dense forest-edge band across the whole strip, side-on horizontal panoramic band, no empty space"),
    _t("mid", "desert",    200003, "continuous middle-distance rocky desert outcrops with sagebrush filling the entire frame edge to edge, side-on horizontal panoramic band, no empty space, no water"),
    _t("mid", "mountains", 200004, "continuous middle-distance pine-covered foothills with exposed rock filling the entire frame edge to edge, side-on horizontal panoramic band, no empty space"),
    _t("mid", "river",     200005, "continuous middle-distance riverbank willows and grass hummocks filling the entire frame edge to edge, side-on horizontal panoramic band, no empty space"),

    # NEAR — foreground vegetation strip, full frame coverage.
    _t("near", "prairie",   300001, "continuous foreground prairie grass clumps and wildflowers filling the entire frame edge to edge, side-on horizontal band, no path, no empty space"),
    _t("near", "forest",    300002, "continuous foreground forest underbrush, ferns, fallen logs filling the entire frame edge to edge, side-on horizontal band, no path, no empty space"),
    _t("near", "desert",    300003, "continuous foreground sagebrush and prickly pear cacti filling the entire frame edge to edge, side-on horizontal band, no path, no empty space, no water"),
    _t("near", "mountains", 300004, "continuous foreground rocky terrain with boulders and alpine grass filling the entire frame edge to edge, side-on horizontal band, no path, no empty space"),
    _t("near", "river",     300005, "continuous foreground riverbank reeds, rushes, smooth wet stones filling the entire frame edge to edge, side-on horizontal band, no empty space"),

    # GROUND — packed wagon trail as a horizontal strip. Side-on, no perspective.
    _t("ground", "prairie",   400001, "horizontal strip of packed dirt wagon trail running side-to-side across the entire frame, prairie grass on both sides of the trail, side-on flat view, no perspective, no vanishing point, no road going into distance"),
    _t("ground", "forest",    400002, "horizontal strip of packed dirt wagon trail running side-to-side across the entire frame, forest floor leaf litter on both sides, side-on flat view, no perspective, no vanishing point, no road going into distance"),
    _t("ground", "desert",    400003, "horizontal strip of packed dry dirt wagon trail running side-to-side across the entire frame, sandy desert ground with scattered pebbles on both sides, dry, no water, no puddles, no blue, side-on flat view, no perspective, no vanishing point, no road going into distance"),
    _t("ground", "mountains", 400004, "horizontal strip of packed dirt wagon trail running side-to-side across the entire frame, rocky mountain ground with gravel and stones on both sides, side-on flat view, no perspective, no vanishing point, no road going into distance, no snow"),
    _t("ground", "river",     400005, "horizontal strip of packed muddy wagon trail running side-to-side across the entire frame, riverbank with smooth wet stones on both sides, side-on flat view, no perspective, no vanishing point, no road going into distance"),
]


if __name__ == "__main__":
    # Smoke check: 20 entries, unique filenames, unique seeds.
    assert len(PROMPTS) == 20, f"expected 20 prompts, got {len(PROMPTS)}"
    assert len({p.filename for p in PROMPTS}) == 20, "duplicate filenames"
    assert len({p.seed for p in PROMPTS}) == 20, "duplicate seeds"
    for p in PROMPTS:
        print(f"{p.filename:32s} seed={p.seed} {p.width}x{p.height}")
    print("OK: 20 tiles, no duplicates")
