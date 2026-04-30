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
  import type { Terrain } from '$lib/game/types';
  import { BACKDROP_HORIZONS } from './backdrop-horizons';

  interface Props {
    terrain: Terrain;
    /** Scene-level horizontal scroll position. */
    scrollX: number;
    /** Scene constant: top of visible viewport. */
    horizonY: number;
    /** Scene constant: bottom of mid band (top of GroundBand). */
    groundY: number;
    /** Variant index 0..N-1. Defaults to a stable random pick at mount. */
    variant?: number;
  }

  let { terrain, scrollX, horizonY, groundY, variant }: Props = $props();

  // 5 painted variants per biome (0..4). Variant 0 keeps the original
  // unsuffixed filename (`backdrop-prairie.webp`); variants 1-4 use a
  // numeric suffix (`backdrop-prairie-1.webp` etc.).
  const N_VARIANTS = 5;
  // Stable per-mount random pick when no explicit variant is passed —
  // re-evaluated only when the component remounts (e.g., dev Restart).
  const fallbackVariant = Math.floor(Math.random() * N_VARIANTS);
  const v = $derived(variant ?? fallbackVariant);

  // Native dimensions match DIMS["backdrop"] in tools/wagon-bg/prompts.py.
  // Must match exactly: with preserveAspectRatio="none", a mismatch makes
  // the browser decode the full source then squish it into the viewport
  // rect (visible distortion + wasted decode work), and the seamless
  // x-axis wrap-meeting falls inside the painting instead of at its edge.
  const PAINT_W = 3072;
  const PAINT_H = 768;

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

  // Auto-align: each painting's actual horizon line (detected at build
  // time, looked up in BACKDROP_HORIZONS) is placed at the *middle* of
  // the visible band — sky takes the upper half, foreground takes the
  // lower half. Paintings without a detected horizon (overcast / rainy /
  // autumn compositions where sky→ground discrimination fails) fall back
  // to painting-center alignment.
  //
  // Hero viewport (#212): the visible band is now 400 SVG-units tall
  // (y=200..600). With the painting at native 768 tall, ~52% of each
  // painting is visible; bumping painted height to 960 (planned under
  // #156/#157/#159) brings that to ~42% but with the full content
  // sized for the hero band.
  const filename = $derived(url.split('/').pop() ?? '');
  const paintingHorizonY = $derived(BACKDROP_HORIZONS[filename] ?? PAINT_H / 2);
  const middleY = $derived((horizonY + groundY) / 2);
  const paintTop = $derived(middleY - paintingHorizonY);
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
