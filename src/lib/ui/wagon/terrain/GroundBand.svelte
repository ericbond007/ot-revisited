<script lang="ts">
  // Solid foreground earth band. Two-stop linearGradient runs
  // top→bottom from `groundY` for a height of `h`. A subtle
  // dark-fade at the top of the band sells the horizon-shadow
  // transition.
  //
  // The gradient ID is derived from the caller-supplied `idPrefix`
  // so multiple GroundBands can coexist on the same page (showcase
  // grids, debug panels) without colliding.
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

  const gradId = $derived(`${idPrefix}-${terrain}`);
  const fadeId = $derived(`${idPrefix}-${terrain}-fade`);
  const fills = $derived(GROUND_FILL[terrain] ?? GROUND_FILL.prairie);
</script>

<g>
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
</g>
