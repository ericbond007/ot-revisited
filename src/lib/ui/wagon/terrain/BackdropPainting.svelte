<script lang="ts">
  // Single coherent painting per biome — sky → distant hills → mid trees →
  // foreground edge in one painted scene. Generated at SDXL-friendly
  // 1344×768. The painting is centered vertically in the visible
  // (horizonY..groundY) band so its middle horizontal band — typically
  // containing the horizon line — sits in the strip viewport. Sky above
  // is clipped (handled by SkyGradient + SkyAccent + CloudLayer), and
  // anything below is clipped (covered by GroundBand).
  //
  // Replaces the FarLayer + MidLayer + NearLayer trio in raster mode:
  // one cohesive painting reads as a unified scene, where four separate
  // alpha-masked tiles always fought for visual coherence.
  import type { Terrain } from '$lib/game/types';

  interface Props {
    terrain: Terrain;
    /** Scene-level horizontal scroll position. */
    scrollX: number;
    /** Scene constant: top of visible viewport. */
    horizonY: number;
    /** Scene constant: bottom of mid band (top of GroundBand). */
    groundY: number;
  }

  let { terrain, scrollX, horizonY, groundY }: Props = $props();

  // Native dimensions match DIMS["backdrop"] in tools/wagon-bg/prompts.py.
  const PAINT_W = 2048;
  const PAINT_H = 768;

  // 0.3× — slow background-distance scroll. Combined with the 2048-wide
  // painting and a 1280-wide scene, the second copy doesn't enter the
  // viewport for ~40 seconds of continuous travel; in actual gameplay
  // (1.5-second pulses, ~90 px scrolled per pulse) the wrap is effectively
  // never seen.
  const SCROLL_FACTOR = 0.3;

  const x = $derived(-((scrollX * SCROLL_FACTOR) % PAINT_W));
  const offsets = [0, PAINT_W];

  // 'river' terrain only appears at landmark crossings, never on the
  // open trail. Fall back to prairie there since the player approached
  // from a prairie / forest / etc leg.
  const backdropTerrain = $derived(terrain === 'river' ? 'prairie' : terrain);

  // Vertical center of the visible (horizon..ground) band.
  const middleY = $derived((horizonY + groundY) / 2);
  // Position the painting so its middle row lands on middleY — the
  // visible viewport then sees the painting's middle horizontal band.
  const paintTop = $derived(middleY - PAINT_H / 2);
</script>

<g>
  {#each offsets as offset (offset)}
    {@const tx = x + offset}
    <image
      href="/wagon-bg/backdrop-{backdropTerrain}.webp"
      x={tx}
      y={paintTop}
      width={PAINT_W}
      height={PAINT_H}
      preserveAspectRatio="none"
    />
  {/each}
</g>
