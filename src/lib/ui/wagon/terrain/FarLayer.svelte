<script lang="ts">
  // Far parallax layer — distant horizon silhouettes per biome.
  // Scrolls at 0.15x of the scene scrollX, tile width 600. Drawn at
  // horizonY in the parent's coordinate system; each terrain renders
  // a different silhouette shape (jagged peaks for mountains, conifer
  // ridge for forest, mesas for desert, etc.).
  import type { Terrain } from '$lib/game/types';

  interface Props {
    terrain: Terrain;
    /** Scene-level horizontal scroll position (any units). */
    scrollX: number;
    horizonY: number;
  }

  let { terrain, scrollX, horizonY }: Props = $props();

  const TILE_W = 600;
  const SCROLL_FACTOR = 0.15;
  const x = $derived(-((scrollX * SCROLL_FACTOR) % TILE_W));

  // Tile offsets — two copies per draw cycle for seamless scroll.
  const offsets = [0, TILE_W];

  // Forest needs 60 conifer triangles per tile; precompute the indices
  // so the markup stays readable.
  const forestTriIndices = Array.from({ length: 60 }, (_, i) => i);
</script>

<g>
  {#each offsets as offset (offset)}
    {@const tx = x + offset}
    {#if terrain === 'mountains'}
      <g transform="translate({tx} {horizonY})">
        <path d="M 0 0 L 60 -34 L 100 -10 L 140 -42 L 200 -8 L 260 -28 L 320 -4 L 380 -36 L 460 -10 L 540 -32 L 600 0 Z"
              fill="#5a6a7a" stroke="#2a3a4a" stroke-width="0.8" />
        <!-- snowcaps -->
        <path d="M 130 -38 L 140 -42 L 150 -38 Z M 370 -32 L 380 -36 L 390 -32 Z M 530 -28 L 540 -32 L 550 -28 Z"
              fill="#e8e8f0" />
      </g>
    {:else if terrain === 'forest'}
      <g transform="translate({tx} {horizonY})">
        <path d="M 0 0 L 0 -12 L 600 -12 L 600 0 Z" fill="#2a3a28" />
        {#each forestTriIndices as i (i)}
          <path d={`M ${i * 10} -12 l 4 -8 l 4 8 Z`} fill="#1a2a18" />
        {/each}
      </g>
    {:else if terrain === 'desert'}
      <g transform="translate({tx} {horizonY})">
        <path d="M 0 0 L 0 -8 L 80 -8 L 80 -22 L 160 -22 L 160 -10 L 240 -10 L 240 -28 L 340 -28 L 340 -14 L 420 -14 L 420 -20 L 520 -20 L 520 -6 L 600 -6 L 600 0 Z"
              fill="#9a5838" stroke="#5a2818" stroke-width="0.7" />
      </g>
    {:else if terrain === 'river'}
      <g transform="translate({tx} {horizonY})">
        <path d="M 0 0 L 0 -10 Q 100 -16 200 -10 Q 300 -6 400 -12 Q 500 -16 600 -8 L 600 0 Z"
              fill="#6a8aa8" stroke="#3a5a78" stroke-width="0.6" opacity="0.85" />
      </g>
    {:else}
      <!-- prairie: gentle low hills -->
      <g transform="translate({tx} {horizonY})">
        <path d="M 0 0 Q 80 -6 160 -3 Q 240 -8 320 -2 Q 400 -7 480 -3 Q 560 -6 600 -1 L 600 0 Z"
              fill="#8a9a6a" stroke="#5a6a3a" stroke-width="0.5" opacity="0.8" />
      </g>
    {/if}
  {/each}
</g>
