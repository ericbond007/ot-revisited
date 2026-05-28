<script lang="ts">
  // Single coherent painting per biome — sky → distant hills → mid trees →
  // foreground edge in one painted scene. Generated seamless x-axis at
  // 3072×768 (DIMS["backdrop"] in tools/wagon-bg/prompts.py). The painting
  // is centered vertically in the visible (horizonY..groundY) band so its
  // middle horizontal band — typically containing the horizon line — sits
  // in the strip viewport. Sky above is clipped (handled by SkyGradient
  // + SkyAccent + CloudLayer), and anything below is clipped (covered
  // by GroundBand).
  //
  // Replaces the FarLayer + MidLayer + NearLayer trio in raster mode:
  // one cohesive painting reads as a unified scene, where four separate
  // alpha-masked tiles always fought for visual coherence.
  import type { Terrain, Weather } from '$lib/game/types';

  interface Props {
    terrain: Terrain;
    /** Scene-level horizontal scroll position. */
    scrollX: number;
    /** Scene constant: top of visible viewport. */
    horizonY: number;
    /** Scene constant: bottom of mid band (top of GroundBand). */
    groundY: number;
    /** Explicit variant index 0..N-1. When set, wins over weather-driven
     *  selection — used by the dev viewer's variant dropdown. */
    variant?: number;
    /** Current game weather. When set, picks a weather-appropriate
     *  variant from the per-terrain pool (e.g. overcast → fog/cloud
     *  variant, rain → after-rain variant). Falls through to random
     *  when no mapping fits (clear, heat, frost, snow). */
    weather?: Weather;
  }

  let { terrain, scrollX, horizonY, groundY, variant, weather }: Props = $props();

  // 5 painted variants per biome (0..4). Variant 0 keeps the original
  // unsuffixed filename (`backdrop-prairie.webp`); variants 1-4 use a
  // numeric suffix (`backdrop-prairie-1.webp` etc.).
  const N_VARIANTS = 5;

  // Weather → variant mapping. Only weather states with fitting art get
  // a forced variant; everything else falls through to the random pool.
  // Phase 2 storm-mood LoRA retrain will populate the gaps for storms
  // and snow specifically (current LoRA's storm priors are sky-dominant).
  const WEATHER_VARIANT_MAP: Partial<Record<Terrain, Partial<Record<Weather, number>>>> = {
    prairie: {
      // overcast / fog / rain / storm → p2 (overcast w/ horizon rain band)
      overcast: 2, fog: 2, rain: 2, storm: 2,
    },
    forest: {
      overcast: 2, fog: 2,           // p2 morning fog
      rain: 3, storm: 3,             // p3 after rain
    },
    mountains: {
      overcast: 3, fog: 3, rain: 3, storm: 3,  // p3 low clouds
    },
    // desert has no weather-fitting variants — falls through to random.
  };

  // Stable per-mount random pick when no explicit variant is passed —
  // re-evaluated only when the component remounts (e.g., dev Restart).
  const fallbackVariant = Math.floor(Math.random() * N_VARIANTS);

  // Resolution order: explicit `variant` prop > weather-driven > random.
  const v = $derived.by(() => {
    if (variant !== undefined) return variant;
    if (weather) {
      const mapped = WEATHER_VARIANT_MAP[terrain]?.[weather];
      if (mapped !== undefined) return mapped;
    }
    return fallbackVariant;
  });

  // SVG render dimensions for the painting. Source webp is 3072×768
  // native (4:1, see DIMS["backdrop"] in tools/wagon-bg/prompts.py).
  // We render at 1600×400 in SVG coords — uniform 0.52x scale that
  // preserves the 4:1 aspect with no distortion AND fits exactly into
  // the hero viewBox's 400-unit height, so the whole painting is
  // visible top-to-bottom. Width 1600 > viewBox width 1280 leaves
  // 320 SVG-units of horizontal extent for parallax scroll before
  // the seamless tile wrap kicks in.
  const PAINT_W = 1600;
  const PAINT_H = 400;

  // 0.3× — slow background-distance scroll. Combined with the 3072-wide
  // painting and a 1280-wide scene, the second copy doesn't enter the
  // viewport for ~60 seconds of continuous travel; in actual gameplay
  // (1.5-second pulses, ~90 px scrolled per pulse) the wrap is effectively
  // never seen.
  const SCROLL_FACTOR = 0.3;

  const x = $derived(-((scrollX * SCROLL_FACTOR) % PAINT_W));
  // Three tile copies at offsets [-PAINT_W, 0, PAINT_W] so coverage is
  // continuous regardless of where `x` sits in its [0, PAINT_W) cycle.
  // Two tiles ([0, PAINT_W]) leave a gap of size `x` on the left of the
  // viewport once the first tile slides right of x=0 — the SVG sky shows
  // through that gap until the next wrap.
  const offsets = [-PAINT_W, 0, PAINT_W];

  // 'river' terrain only appears at landmark crossings, never on the
  // open trail. Fall back to prairie there since the player approached
  // from a prairie / forest / etc leg.
  const backdropTerrain = $derived(terrain === 'river' ? 'prairie' : terrain);

  // Variant 0 = unsuffixed filename; variants 1-4 = `-N` suffix.
  const url = $derived(
    v === 0
      ? `/wagon-bg/backdrop-${backdropTerrain}.webp`
      : `/wagon-bg/backdrop-${backdropTerrain}-${v}.webp`
  );

  // With the painting now sized exactly to the hero viewBox height
  // (400 SVG-units), there's no spare vertical room — painting fills
  // viewport top-to-bottom. paintTop pins to the viewBox top constant
  // (y=200, see WagonScene viewBox="0 200 1280 400"). The previous
  // BACKDROP_HORIZONS auto-align is no longer needed in this mode but
  // the table is kept in source for the eventual 4-layer rebuild
  // (#156/#157/#159) where the far layer might overflow vertically.
  const VIEWBOX_TOP_Y = 200;
  const paintTop = VIEWBOX_TOP_Y;
</script>

<g>
  {#each offsets as offset (offset)}
    {@const tx = x + offset}
    <image
      href={url}
      x={tx}
      y={paintTop}
      width={PAINT_W}
      height={PAINT_H}
      preserveAspectRatio="none"
    />
  {/each}
</g>
