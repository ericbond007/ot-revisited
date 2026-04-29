<script lang="ts">
  // Solid foreground earth band. SVG mode renders a two-stop linear
  // gradient with a horizon-shadow fade. Raster mode (?raster=1)
  // replaces the gradient with a single per-terrain ground texture.
  import { page } from '$app/state';
  import type { Terrain } from '$lib/game/types';
  import { GROUND_FILL } from './terrain-tokens';

  interface Props {
    terrain: Terrain;
    groundY: number;
    h: number;
    w: number;
    /** Used as the unique id prefix for the inline gradient defs. */
    idPrefix?: string;
  }

  let { terrain, groundY, h, w, idPrefix = 'gb' }: Props = $props();

  const useRaster = $derived(page.url.searchParams.get('raster') === '1');

  const gradId = $derived(`${idPrefix}-${terrain}`);
  const fadeId = $derived(`${idPrefix}-${terrain}-fade`);
  const fills = $derived(GROUND_FILL[terrain] ?? GROUND_FILL.prairie);
</script>

<g>
  {#if useRaster}
    <!-- Ground tile is generated at near-square SDXL ratios (1024×512)
         where the model paints a perspective shot of a wagon trail.
         `xMidYMax slice` crops to the BOTTOM of the image so we see
         only the foreground portion — no vanishing point, just the
         wheel-rut detail at the player's feet. -->
    <image
      href="/wagon-bg/ground-{terrain}.webp"
      x="0"
      y={groundY}
      width={w}
      height={h}
      preserveAspectRatio="xMidYMax slice"
    />
  {:else}
    <defs>
      <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color={fills[0]} />
        <stop offset="100%" stop-color={fills[1]} />
      </linearGradient>
      <linearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#000" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#000" stop-opacity="0" />
      </linearGradient>
    </defs>
    <rect x="0" y={groundY} width={w} height={h} fill={`url(#${gradId})`} />
    <!-- horizon shadow band -->
    <rect x="0" y={groundY} width={w} height="8" fill={`url(#${fadeId})`} opacity="0.4" />
  {/if}
</g>
