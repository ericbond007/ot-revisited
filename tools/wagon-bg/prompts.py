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
    "first-person POV, walking on trail, road going into distance, "
    "low horizon line, sky-dominant composition, sky filling most of frame, "
    "horizon at bottom of frame, "
    "large foreground tree, framing tree, specimen tree, gnarled tree, "
    "oak tree in foreground, maple tree in foreground, close-up tree"
)

# Two layer types now:
# - backdrop: the cohesive painted scene (sky → distant hills → mid → foreground edge),
#             one painting per biome, parallax-scrolled at runtime. SDXL-native ratio.
# - ground:   the trail / play-area band the wagon walks on. Generated at near-square
#             SDXL ratio; GroundBand.svelte slices the bottom-foreground portion at
#             display time so we never see a vanishing point.
DIMS = {
    # Backdrop generated SEAMLESS (x-axis circular padding) at 3072×768.
    # With seamless tiling the seam is invisible regardless of width, so
    # going wider is purely about content variety per cycle. 3072 gives
    # us 50% more world-content per painting than 2048 without exceeding
    # 8 GB VRAM on the 3070 Laptop.
    "backdrop": (3072, 768),
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
    variant: int = 0

    @property
    def filename(self) -> str:
        # variant 0 keeps the original unsuffixed name so existing files
        # stay valid; variants 1+ get a `-N` suffix.
        if self.variant == 0:
            return f"{self.layer}-{self.terrain}.webp"
        return f"{self.layer}-{self.terrain}-{self.variant}.webp"

    @property
    def full_prompt(self) -> str:
        return f"{self.content}, {STYLE_SUFFIX}"


def _t(layer: Layer, terrain: Terrain, seed: int, content: str, variant: int = 0) -> TilePrompt:
    w, h = DIMS[layer]
    return TilePrompt(layer=layer, terrain=terrain, width=w, height=h, seed=seed, content=content, variant=variant)


PROMPTS: list[TilePrompt] = [
    # BACKDROP — one cinematic painting per biome. Sky → distant hills → mid trees
    # → foreground edge, all in one cohesive scene. Side-on observer at 6ft height.
    # No 'river' backdrop — river only appears at landmark crossings, never as
    # open-trail terrain. BackdropPainting falls back to prairie there.
    _t("backdrop", "prairie",   100001, "wide cinematic side-view painting of a 1840s American prairie scene at midday, horizon line at center of frame, narrow band of soft blue sky with small painterly cumulus clouds above, vast lush midsummer prairie grass and wildflowers filling the lower half of the frame, scattered cottonwood trees on the distant horizon, painterly cartoon adventure game backdrop"),
    _t("backdrop", "forest",    100304, "wide cinematic side-view painting of a 1840s Pacific Northwest mountain valley vista at midday, viewed from a distant high open hilltop, clear soft blue sky filling the upper third of the frame, distant cool blue forested hillside covered in tiny evergreens in pale atmospheric haze sitting against the sky on the far horizon, layered rolling forested ridges receding into haze in the middle distance, a small winding stream and scattered grey boulders far below in the valley, vast empty open meadow grass and wildflowers in the foreground, painterly cartoon adventure game backdrop, panoramic far view"),
    _t("backdrop", "desert",    100003, "wide cinematic side-view painting of a 1840s American Southwest high-desert scene at midday, warm pale sky, distant red rock mesas and buttes in dusty haze, mid-distance sagebrush and rocky outcrops, sandy ground with scattered desert plants in the foreground, painterly cartoon adventure game backdrop, dry no water"),
    _t("backdrop", "mountains", 100004, "wide cinematic side-view painting of a 1840s Rocky Mountains scene at midday, blue mountain sky, distant snow-capped peaks in atmospheric blue haze, mid-distance pine-covered foothills with exposed grey rock, alpine grass and boulders in the foreground, painterly cartoon adventure game backdrop"),

    # BACKDROP variants 1-4 per biome — same architecture, different scene.
    # Prairie alts: stream, stormy sky, golden-hour, morning mist.
    _t("backdrop", "prairie",   110021, "wide cinematic side-view painting of a 1840s American prairie in late afternoon, clear cool blue sky filling the upper half of the frame, distant cool blue mountain ridges in pale atmospheric haze sitting clearly against the sky, sharply defined horizon line where the blue distant mountains meet the sky, dense middle-distance with many small scattered cottonwood trees and prairie bushes at varying depths, low sagebrush dotting the warm golden middle ground, vast warm golden grass and wildflowers in the foreground, painterly cartoon adventure game backdrop", variant=1),
    _t("backdrop", "prairie",   110012, "wide cinematic side-view painting of a 1840s American prairie with a meandering shallow stream cutting across the middle distance, soft midday sky with cumulus, low willows clustered in the middle distance along the stream, no foreground trees, distant rolling hills behind, prairie grass and wildflowers in the foreground, painterly cartoon adventure game backdrop", variant=2),
    _t("backdrop", "prairie",   110013, "wide cinematic side-view painting of a 1840s American prairie with a dramatic stormy sky on the horizon, dark towering thunderhead clouds, slanted rain in the distance, prairie grass bending in wind, painterly cartoon adventure game backdrop", variant=3),
    _t("backdrop", "prairie",   110015, "wide cinematic side-view painting of a 1840s American prairie at dawn, soft pink-blue dawn sky, low morning mist over distant rolling green hills, distant cottonwood trees on the far horizon, prairie grass and wildflowers, painterly cartoon adventure game backdrop", variant=4),

    # Forest alts: brook in clearing, fog dawn, after rain mossy, autumn deciduous.
    _t("backdrop", "forest",    120321, "wide cinematic side-view painting of a 1840s Pacific Northwest mountain valley vista at midday, viewed from a distant high open hilltop, clear soft blue sky filling the upper third of the frame, a small clear brook winding far below through the valley floor, distant cool blue forested hillside covered in tiny evergreens in pale atmospheric haze on the far horizon, scattered miniature evergreens dotting the middle-distance valley floor, vast empty meadow grass and wildflowers in the foreground, painterly cartoon adventure game backdrop, panoramic far view", variant=1),
    _t("backdrop", "forest",    120332, "wide cinematic side-view painting of a 1840s Pacific Northwest mountain valley vista at dawn, viewed from a very high mountain ridge looking down into a vast misty valley, soft pale pink and grey sky filling the upper third of the frame, distant misty forested peaks emerging above the fog on the far horizon, layered foggy forested ridges receding into deep haze in the middle distance, vast sea of low morning fog blanketing the valley far below with scattered evergreen tops poking through the mist, foreground of bare grey rock ledge with low moss and small scattered stones, painterly cartoon adventure game backdrop, panoramic far view", variant=2),
    _t("backdrop", "forest",    120333, "wide cinematic side-view painting of a 1840s Pacific Northwest mountain valley vista after rain, viewed from a high mountain summit overlook far above the clouds, dramatic clearing sky with breaking clouds and patches of blue filling the upper third of the frame, distant forested hillsides with crisp evergreen tree silhouettes standing against the breaking sky on the far horizon, layered rain-darkened forested ridges with visible tree texture receding for miles into deep haze in the middle distance, vast unbroken evergreen forest canopy stretching across the valley floor far below, foreground of bare wet grey rock summit ledge with scattered small stones, painterly cartoon adventure game backdrop, panoramic far view", variant=3),
    _t("backdrop", "forest",    120331, "wide cinematic side-view painting of a 1840s deep autumn forest valley vista, viewed from a bare rocky outcrop high above the valley, soft pale autumn sky filling the upper third of the frame, distant hillside completely covered in tiny red orange and gold autumn trees in pale atmospheric haze on the far horizon, layered autumn-colored forested ridges densely packed with crisp tree silhouettes receding into haze in the middle distance, vast unbroken dense red and gold autumn forest canopy filling the valley far below, foreground of bare grey rock ledge with scattered fallen colorful leaves and small autumn ferns at the edges, painterly cartoon adventure game backdrop, panoramic far view", variant=4),

    # Desert alts: canyon, sunset, plateau-with-distant-mountains, dry wash.
    _t("backdrop", "desert",    130031, "wide cinematic side-view painting of a 1840s Southwest desert canyon, towering red sandstone walls receding into haze, mid-distance scrub brush and yucca, sandy floor in the foreground, painterly cartoon adventure game backdrop, dry no water", variant=1),
    _t("backdrop", "desert",    130032, "wide cinematic side-view painting of a 1840s Southwest high-desert at sunset, warm orange and pink sky, distant red mesas in cooling shadow, mid-distance sagebrush silhouettes, painterly cartoon adventure game backdrop, dry no water", variant=2),
    _t("backdrop", "desert",    130033, "wide cinematic side-view painting of a 1840s high-desert plateau with distant snow-tipped mountains visible on the far horizon through dusty haze, mid-distance scrub brush and rocky outcrops, painterly cartoon adventure game backdrop, dry no water", variant=3),
    _t("backdrop", "desert",    130034, "wide cinematic side-view painting of a 1840s Southwest desert with a dry rocky wash arroyo cutting across the foreground, scattered yucca and prickly pear, distant flat-topped buttes, painterly cartoon adventure game backdrop, dry no water", variant=4),

    # Mountains alts: alpine meadow, narrow pass, golden hour peaks, low clouds.
    _t("backdrop", "mountains", 140041, "wide cinematic side-view painting of a 1840s Rocky Mountains alpine meadow, scattered pines, single distant snow-capped peak rising above mid-distance pine-covered ridges, foreground meadow with low alpine flowers, painterly cartoon adventure game backdrop", variant=1),
    _t("backdrop", "mountains", 140042, "wide cinematic side-view painting of a 1840s Rocky Mountains narrow pass between high rocky walls, distant peak visible at the end of the pass, mid-distance scattered conifers along the pass walls, painterly cartoon adventure game backdrop", variant=2),
    _t("backdrop", "mountains", 140043, "wide cinematic side-view painting of a 1840s Rocky Mountains at golden hour, warm light on snow-capped peaks, dramatic long shadows, mid-distance pine slopes in cooler tones, painterly cartoon adventure game backdrop", variant=3),
    _t("backdrop", "mountains", 140044, "wide cinematic side-view painting of a 1840s Rocky Mountains with low clouds wrapping around the peaks, mystical atmosphere, distant peaks emerging from cloud, mid-distance pine forest, painterly cartoon adventure game backdrop", variant=4),

    # GROUND — kept for now but we're not iterating; current `?groundraster=1`
    # toggle stays so we can revisit later if SVG ground proves insufficient.
    _t("ground", "prairie",   400001, "overhead view of a dirt road through prairie grass, two parallel tire tracks cut into the dirt road, grass and wildflowers grow on both sides of the road, looking straight down, no sky, no horizon, no panorama, no landscape, ground only"),
    _t("ground", "forest",    400002, "overhead view of a dirt path through a forest, two parallel tire tracks in packed earth, ferns and fallen leaves on both sides, looking straight down, no sky, no horizon, no panorama, ground only"),
    _t("ground", "desert",    400003, "overhead view of a dry dirt path across desert ground, two parallel tire tracks in dust, sagebrush and pebbles on both sides, looking straight down, no sky, no horizon, no panorama, no water, ground only"),
    _t("ground", "mountains", 400004, "overhead view of a rocky dirt path across mountain ground, two parallel tire tracks in packed earth, gravel and stones on both sides, looking straight down, no sky, no horizon, no panorama, no snow, ground only"),
]


if __name__ == "__main__":
    # Smoke check: 24 entries (5 backdrops × 4 biomes + 4 ground), unique
    # filenames and seeds. River is skipped (landmark-only).
    assert len(PROMPTS) == 24, f"expected 24 prompts, got {len(PROMPTS)}"
    assert len({p.filename for p in PROMPTS}) == 24, "duplicate filenames"
    assert len({p.seed for p in PROMPTS}) == 24, "duplicate seeds"
    for p in PROMPTS:
        print(f"{p.filename:32s} seed={p.seed} {p.width}x{p.height}")
    print(f"OK: {len(PROMPTS)} tiles, no duplicates")
