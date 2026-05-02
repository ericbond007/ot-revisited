"""Wagon-bg single-backdrop prompts.

20 backdrop variants (4 biomes × 5 variants) using horizon-vista phrasing
validated 2026-05-01 — each tile is a complete painted scene at 3072×768
seamless x-axis, parallax-scrolled at runtime by BackdropPainting.svelte.

Plus 4 ground tiles (1 per biome) for the optional `?groundraster=1` toggle;
default ground is the SVG gradient in GroundBand.svelte.

All backdrop tiles use ht_landscape v2_2000 LoRA at 1.0 weight, applied
automatically by generate.py via DEFAULT_LORAS_BY_LAYER. The "ht_landscape"
trigger and "painterly oil painting" tail are baked into each prompt to
match the LoRA's training caption pattern.
"""

from dataclasses import dataclass
from typing import Literal

Layer = Literal["backdrop", "ground"]
Terrain = Literal["prairie", "forest", "desert", "mountains", "river"]

DIMS: dict[Layer, tuple[int, int]] = {
    "backdrop": (3072, 768),
    "ground":   (1024, 512),
}

NEGATIVE_PROMPT = (
    "blurry low quality, photograph, photorealistic, 3D render, CGI, "
    "vector graphics, flat design, anime, manga, deformed, watermark, "
    "text, signature, people, characters, wagon, oxen, ui, hud, "
    "multiple panels, oversaturated, neon, ink lines, sketchy, woodcut, "
    "first-person POV, walking on trail, road going into distance, "
    "low horizon line, sky-dominant composition, sky filling most of frame, "
    "horizon at bottom of frame, "
    "large foreground tree, framing tree, specimen tree, gnarled tree, "
    "oak tree in foreground, maple tree in foreground, close-up tree"
)


@dataclass(frozen=True)
class TilePrompt:
    layer: Layer
    terrain: Terrain
    width: int
    height: int
    seed: int
    content: str
    variant: int = 0

    @property
    def filename(self) -> str:
        if self.variant == 0:
            return f"{self.layer}-{self.terrain}.webp"
        return f"{self.layer}-{self.terrain}-{self.variant}.webp"

    @property
    def full_prompt(self) -> str:
        # Each content prompt is fully self-contained — trigger + scene +
        # tail are baked in. No suffix machinery.
        return self.content


def _t(layer: Layer, terrain: Terrain, seed: int, content: str, variant: int = 0) -> TilePrompt:
    w, h = DIMS[layer]
    return TilePrompt(layer=layer, terrain=terrain, width=w, height=h, seed=seed, content=content, variant=variant)


PROMPTS: list[TilePrompt] = [
    # ============================================================
    # BACKDROP — 20 variants. Horizon-vista phrasing pattern:
    #   "ht_landscape, [horizon-arranged scene + concrete fg/mid content], painterly oil painting"
    # ht_landscape_v2_2000 LoRA auto-loaded at 1.0 weight by generate.py.
    # ============================================================

    # ---------- PRAIRIE ----------
    # 0: midday treeless ocean of grass — validated 2026-05-01
    _t("backdrop", "prairie", 510001,
       "ht_landscape, vast treeless prairie meeting the horizon, low rolling grass-covered hills "
       "in the far distance, dry tall prairie grass dominating the foreground with wildflowers, "
       "bunch grass, varied terrain with patches of taller and shorter grass, occasional small bush, "
       "a single thin willow line marking a creek bend visible only on one side of the middle "
       "distance, soft overcast sky with scattered clouds, late summer afternoon light, ocean of "
       "grass, painterly oil painting"),
    # 1: warm afternoon backlight — pivoted 2026-05-02 from "dawn" mood.
    # The LoRA's dawn priors are baked-in sky-dominant from Hudson River
    # training data; "low camera" framing fought it but collapsed the
    # composition into close-foreground + far-horizon with no mid. Backlight
    # mood is ground-emphasized in the training set so the comp behaves.
    _t("backdrop", "prairie", 510104,
       "ht_landscape, vast treeless prairie under warm afternoon backlight, long raking shadows "
       "stretching across the rolling grass-covered hills in the mid-distance, dry tall prairie "
       "grass glowing in the foreground with scattered wildflowers and bunch grass, mid-distance "
       "prairie continuing to a distant horizon of low rolling hills, soft warm afternoon sky "
       "with a few stretched clouds, ocean of grass, painterly oil painting", variant=1),
    # 2: overcast midday with distant rain — pivoted 2026-05-02 from "storm"
    # mood. Storm-mood priors in v2_2000 collapse to ~95% sky regardless
    # of framing language. Treating storms as Phase 2 LoRA retrain target;
    # for now p2 is overcast with rain shown only as a horizon detail.
    _t("backdrop", "prairie", 510105,
       "ht_landscape, vast treeless prairie under overcast midday sky with flat soft diffuse "
       "light, dry tall prairie grass dominating the foreground with bunch grass and wildflowers, "
       "mid-distance rolling grass-covered hills extending to the horizon, distant rain showers "
       "and dark gray rain clouds along the far horizon line, mostly even gray cloud cover, "
       "ocean of grass, painterly oil painting", variant=2),
    # 3: golden hour
    _t("backdrop", "prairie", 510004,
       "ht_landscape, vast treeless prairie at late afternoon golden hour, warm golden light "
       "raking across the rolling grass-covered hills in the far distance, dry tall prairie grass "
       "glowing amber in the foreground, scattered wildflowers, soft golden sky with a few "
       "stretched clouds, ocean of grass, painterly oil painting", variant=3),
    # 4: with creek line in middle distance, on one side only (no through-water band)
    _t("backdrop", "prairie", 510005,
       "ht_landscape, vast prairie with a single thin willow line marking a creek bend in the "
       "middle distance to the right side, dry tall prairie grass dominating the foreground, "
       "low rolling grass hills behind, soft midday sky with scattered cumulus clouds, "
       "painterly oil painting", variant=4),

    # ---------- FOREST ----------
    # 0: dense forest silhouette horizon — validated 2026-05-01
    _t("backdrop", "forest", 520001,
       "ht_landscape, varied dark forest silhouette along a meadow horizon, mix of tall and short "
       "trees along the tree line, scattered small trees and shrubs across the mid-distance "
       "meadow, detailed foreground meadow with wildflowers ferns and tall grass, soft afternoon "
       "light, painterly oil painting"),
    # 1: autumn
    _t("backdrop", "forest", 520002,
       "ht_landscape, distant autumn forest silhouette along a meadow horizon, mix of red orange "
       "and gold autumn trees along the tree line, scattered small autumn trees and shrubs in the "
       "mid-distance meadow, detailed foreground meadow with fallen leaves wildflowers and ferns, "
       "soft autumn afternoon light, painterly oil painting", variant=1),
    # 2: morning fog
    _t("backdrop", "forest", 520003,
       "ht_landscape, distant forest silhouette emerging from low morning fog along a meadow "
       "horizon, layered foggy tree-lines receding into the haze, mid-distance meadow with "
       "scattered shrubs partially obscured by mist, detailed foreground meadow with dewy ferns "
       "wildflowers and grass, soft pale dawn light, painterly oil painting", variant=2),
    # 3: after rain
    _t("backdrop", "forest", 520004,
       "ht_landscape, dark forest silhouette along a meadow horizon after rain, varied tree "
       "heights along the tree line, dramatic clearing sky with breaking clouds and patches of "
       "blue, mid-distance meadow with scattered shrubs glistening with rain, detailed foreground "
       "wet meadow with ferns wildflowers and tall grass, soft post-storm light, painterly oil "
       "painting", variant=3),
    # 4: warm afternoon backlight — pivoted 2026-05-02 from "dawn" mood.
    # Same lesson as prairie p1: this LoRA's dawn priors collapse to
    # sky-dominant compositions; backlight mood is ground-emphasized.
    _t("backdrop", "forest", 520105,
       "ht_landscape, distant forest silhouette along a meadow horizon under warm late afternoon "
       "backlight, long raking shadows stretching across the mid-distance meadow, mix of trees on "
       "the tree line glowing with rim light, mid-distance meadow with scattered shrubs catching "
       "warm light, dense detailed foreground meadow with tall grass wildflowers ferns and "
       "scattered low brush, soft warm late afternoon sky with a few stretched clouds, "
       "painterly oil painting", variant=4),

    # ---------- DESERT ----------
    # 0: scattered mesas + sage/ocotillo/yucca foreground — validated 2026-05-01
    _t("backdrop", "desert", 530001,
       "ht_landscape, distant red rock buttes and mesa cliffs receding to horizon, scattered sage "
       "brush and rocks across the mid-distance plain, dense detailed foreground sandy ground with "
       "rocks, tumbleweed clusters, dry brush, ocotillo, scattered yucca and prickly pear, warm "
       "late afternoon desert light, painterly oil painting"),
    # 1: red rock canyon — revised 2026-05-02 with denser foreground (mirrors
    # d0's "dense detailed foreground … ocotillo, prickly pear, tumbleweed
    # clusters" pattern that worked) and new seed.
    _t("backdrop", "desert", 530102,
       "ht_landscape, towering red sandstone canyon walls receding into atmospheric haze on the "
       "far horizon, mid-distance scattered juniper trees and rocky outcrops along the canyon "
       "floor, dense detailed foreground sandy canyon floor with scattered red rocks, sage brush, "
       "ocotillo, yucca, prickly pear, dry brush, and tumbleweed clusters, warm afternoon desert "
       "light, painterly oil painting", variant=1),
    # 2: sunset
    _t("backdrop", "desert", 530003,
       "ht_landscape, distant red rock buttes and mesas silhouetted against a warm orange and pink "
       "sunset sky on the horizon, mid-distance sage brush and rocks in cooling shadow, detailed "
       "foreground sandy ground with rocks, ocotillo, yucca, and prickly pear catching last warm "
       "light, painterly oil painting", variant=2),
    # 3: distant snow-tipped mountains visible
    _t("backdrop", "desert", 530004,
       "ht_landscape, distant snow-tipped mountains visible on the far horizon through dusty "
       "desert haze, mid-distance scattered red rock outcrops and sage brush across the high "
       "plateau, detailed foreground rocky desert ground with sage, yucca, and prickly pear, "
       "soft cool afternoon light, painterly oil painting", variant=3),
    # 4: dry wash
    _t("backdrop", "desert", 530005,
       "ht_landscape, distant flat-topped red rock buttes along a hazy horizon, mid-distance "
       "scattered juniper and sage across a wide rocky plain, detailed foreground dry rocky wash "
       "with scattered stones, tumbleweed, and yucca, warm afternoon desert light, painterly oil "
       "painting", variant=4),

    # ---------- MOUNTAINS ----------
    # 0: snow-capped jagged peaks — validated 2026-05-01
    _t("backdrop", "mountains", 540001,
       "ht_landscape, distant snow-capped jagged blue mountain peaks receding in atmospheric "
       "perspective, dramatic alpine relief with snow on highest summits, varied pine and fir "
       "forest along the foothills, mid-distance meadow with scattered boulders and conifers, "
       "detailed foreground rocky meadow with grass and wildflowers, soft hazy morning light, "
       "painterly oil painting"),
    # 1: alpine meadow
    _t("backdrop", "mountains", 540002,
       "ht_landscape, distant single snow-capped peak rising above mid-distance pine-covered "
       "ridges, layered foothills receding in atmospheric haze, mid-distance scattered conifers "
       "along the slopes, detailed foreground alpine meadow with low grass, wildflowers, and "
       "scattered boulders, soft afternoon mountain light, painterly oil painting", variant=1),
    # 2: golden hour peaks
    _t("backdrop", "mountains", 540003,
       "ht_landscape, distant snow-capped peaks catching warm golden hour light, dramatic long "
       "shadows on the mid-distance pine-covered foothills, layered ridges receding into cool "
       "blue haze, detailed foreground rocky meadow with grass, wildflowers, and scattered "
       "boulders, painterly oil painting", variant=2),
    # 3: low clouds
    _t("backdrop", "mountains", 540004,
       "ht_landscape, distant snow-capped peaks emerging from low clouds wrapping the high "
       "summits, mystical mountain atmosphere, mid-distance pine forest along the foothills "
       "partially obscured by mist, detailed foreground rocky meadow with grass, wildflowers, "
       "and scattered boulders, soft cool morning light, painterly oil painting", variant=3),
    # 4: narrow pass
    _t("backdrop", "mountains", 540005,
       "ht_landscape, dramatic mountain pass between high rocky walls receding to a distant "
       "snow-capped peak visible at the far end, mid-distance scattered conifers along the pass "
       "walls, detailed foreground rocky meadow floor with grass, wildflowers, and scattered "
       "boulders, warm afternoon light, painterly oil painting", variant=4),

    # ============================================================
    # GROUND — overhead trail-strip art for ?groundraster=1.
    # Default ground is the SVG gradient in GroundBand.svelte. No LoRA —
    # these are stylized cartoon overhead views, not horizon vistas.
    # ============================================================
    _t("ground", "prairie",   610001,
       "overhead view of a dirt road through prairie grass, two parallel tire tracks cut into the "
       "dirt road, grass and wildflowers grow on both sides of the road, looking straight down, "
       "no sky, no horizon, no panorama, no landscape, ground only, painterly cartoon adventure "
       "game art"),
    _t("ground", "forest",    610002,
       "overhead view of a dirt path through a forest, two parallel tire tracks in packed earth, "
       "ferns and fallen leaves on both sides, looking straight down, no sky, no horizon, no "
       "panorama, ground only, painterly cartoon adventure game art"),
    _t("ground", "desert",    610003,
       "overhead view of a dry dirt path across desert ground, two parallel tire tracks in dust, "
       "sagebrush and pebbles on both sides, looking straight down, no sky, no horizon, no "
       "panorama, no water, ground only, painterly cartoon adventure game art"),
    _t("ground", "mountains", 610004,
       "overhead view of a rocky dirt path across mountain ground, two parallel tire tracks in "
       "packed earth, gravel and stones on both sides, looking straight down, no sky, no horizon, "
       "no panorama, no snow, ground only, painterly cartoon adventure game art"),
]


if __name__ == "__main__":
    # Smoke check: 24 entries — 20 backdrop + 4 ground. Unique filenames + seeds.
    assert len(PROMPTS) == 24, f"expected 24 prompts, got {len(PROMPTS)}"
    assert len({p.filename for p in PROMPTS}) == 24, "duplicate filenames"
    assert len({p.seed for p in PROMPTS}) == 24, "duplicate seeds"
    for p in PROMPTS:
        print(f"{p.filename:32s} seed={p.seed} {p.width}x{p.height}")
    print(f"OK: {len(PROMPTS)} tiles, no duplicates")
