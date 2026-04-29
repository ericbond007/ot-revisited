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
    "isolated on flat sky-blue background, no people no animals no wagon, "
    "period 1840s pioneer aesthetic, muted earth-tone palette"
)

NEGATIVE_PROMPT = (
    "blurry, low quality, photograph, photorealistic, 3D render, CGI, "
    "vector graphics, flat design, anime, manga, deformed, watermark, "
    "text, signature, people, characters, wagon, oxen, ui, hud, "
    "multiple panels, oversaturated, neon"
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
    # FAR — distant horizon silhouettes, atmospheric haze
    _t("far", "prairie",   100001, "distant rolling green prairie hills on the horizon, soft atmospheric haze, suggested low cloud shadows, slim painterly silhouette band"),
    _t("far", "forest",    100002, "distant dark green forest line on the horizon, layered receding tree silhouettes, atmospheric blue-grey haze, painterly silhouette band"),
    _t("far", "desert",    100003, "distant red-rock mesas and buttes on the horizon, dry warm haze, ochre and rust palette, painterly silhouette band"),
    _t("far", "mountains", 100004, "distant snow-capped rocky mountain ridges, layered peaks receding into atmospheric haze, blue-grey palette, painterly silhouette band"),
    _t("far", "river",     100005, "distant rolling river-valley hills on the horizon with cottonwood silhouettes, low atmospheric haze, painterly silhouette band"),

    # MID — middle-distance hills + biome accents
    _t("mid", "prairie",   200001, "middle-distance rolling grass hills with low brush and scattered wildflowers, painterly hand-drawn"),
    _t("mid", "forest",    200002, "middle-distance rolling forested hills, mixed deciduous and evergreen, painterly hand-drawn"),
    _t("mid", "desert",    200003, "middle-distance rocky desert outcrops with sagebrush and dry grass, ochre tones, painterly"),
    _t("mid", "mountains", 200004, "middle-distance rocky foothills with pine-covered slopes and exposed grey rock, painterly"),
    _t("mid", "river",     200005, "middle-distance riverbank willows and grass hummocks beside calm water, painterly"),

    # NEAR — foreground roadside vegetation
    _t("near", "prairie",   300001, "foreground prairie grass clumps and wildflowers along a wagon trail, painterly hand-drawn"),
    _t("near", "forest",    300002, "foreground forest underbrush, ferns, fallen logs and low shrubs along a trail, painterly"),
    _t("near", "desert",    300003, "foreground sagebrush, prickly pear cacti, and dry rocks along a wagon trail, painterly"),
    _t("near", "mountains", 300004, "foreground rocky mountain trail with boulders, alpine grass and low shrubs, painterly"),
    _t("near", "river",     300005, "foreground riverbank reeds, rushes and smooth wet river stones, painterly"),

    # GROUND — terrain surface texture below the trail
    _t("ground", "prairie",   400001, "trodden dirt wagon trail running through prairie grass, top-down ground texture, painterly hand-drawn"),
    _t("ground", "forest",    400002, "bare earth dirt path through forest, leaf litter and pine needles on soil, mossy ground, fallen leaves, pebbles, no wood planks no fence no structure no building, close-up ground level view, painterly hand-drawn cartoon"),
    _t("ground", "desert",    400003, "sandy desert wagon trail with scattered pebbles, top-down ground texture, painterly"),
    _t("ground", "mountains", 400004, "rocky mountain wagon trail with gravel and stone, top-down ground texture, painterly"),
    _t("ground", "river",     400005, "muddy riverbank wagon trail with smooth wet stones, top-down ground texture, painterly"),
]


if __name__ == "__main__":
    # Smoke check: 20 entries, unique filenames, unique seeds.
    assert len(PROMPTS) == 20, f"expected 20 prompts, got {len(PROMPTS)}"
    assert len({p.filename for p in PROMPTS}) == 20, "duplicate filenames"
    assert len({p.seed for p in PROMPTS}) == 20, "duplicate seeds"
    for p in PROMPTS:
        print(f"{p.filename:32s} seed={p.seed} {p.width}x{p.height}")
    print("OK: 20 tiles, no duplicates")
