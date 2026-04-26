<script lang="ts">
  // Distant landmark band — a slow-scrolling layer of biome-keyed
  // silhouettes that sits between the FarLayer and the MidLayer.
  // Scrolls at 0.25× and tiles at 1200 px so two distinct landmarks
  // appear per cycle, well-spaced.
  //
  // Phase 4 wires this generically by terrain: each biome maps to a
  // small ordered list of landmark components and we render two per
  // tile. A future refinement (Phase 6+) can pick specific landmarks
  // based on state.location.previousLandmarkId / nextLandmarkId.
  import type { Terrain } from '$lib/game/types';
  import type { Component } from 'svelte';
  import ChimneyRock from './ChimneyRock.svelte';
  import CourthouseRock from './CourthouseRock.svelte';
  import ScottsBluff from './ScottsBluff.svelte';
  import IndependenceRock from './IndependenceRock.svelte';
  import Fort from './Fort.svelte';
  import MountainPass from './MountainPass.svelte';
  import FerryPost from './FerryPost.svelte';
  import TreeClump from './TreeClump.svelte';
  import ValleyArch from './ValleyArch.svelte';

  type LandmarkProps = { x: number; baseY: number; scale?: number };
  type LandmarkComp = Component<LandmarkProps>;

  // Biome → ordered list of silhouettes. The first is the "primary"
  // (rendered larger, leftmost in the tile); the second is the
  // "secondary" (smaller, offset right).
  const CATALOG: Record<Terrain, LandmarkComp[]> = {
    prairie:   [ChimneyRock, CourthouseRock, Fort],
    mountains: [MountainPass, ScottsBluff, IndependenceRock],
    forest:    [TreeClump, Fort, ValleyArch],
    desert:    [IndependenceRock, FerryPost, ScottsBluff],
    river:     [FerryPost, Fort, TreeClump]
  };

  interface Props {
    terrain: Terrain;
    /** Scene-level horizontal scroll position. */
    scrollX: number;
    /** Y of the horizon line — landmarks plant their bases just below
     *  this so they read as distant. */
    horizonY: number;
  }

  let { terrain, scrollX, horizonY }: Props = $props();

  const TILE_W = 1200;
  const SCROLL_FACTOR = 0.25;
  const x = $derived(-((scrollX * SCROLL_FACTOR) % TILE_W));

  const list = $derived(CATALOG[terrain] ?? CATALOG.prairie);
  const Primary = $derived<LandmarkComp>(list[0]);
  const Secondary = $derived<LandmarkComp>(list[1] ?? list[0]);

  const baseY = $derived(horizonY + 8);
  const offsets = [0, TILE_W, TILE_W * 2];
</script>

<g opacity="0.55">
  {#each offsets as offset (offset)}
    {@const tx = x + offset}
    <g transform="translate({tx + 280} 0)">
      <Primary x={0} {baseY} scale={0.55} />
    </g>
    <g transform="translate({tx + 820} 0)">
      <Secondary x={0} baseY={baseY + 2} scale={0.45} />
    </g>
  {/each}
</g>
