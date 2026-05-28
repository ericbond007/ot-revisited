<script lang="ts">
  // Near parallax layer — foreground tufts, rocks, and biome accents
  // the wagon walks past. Scrolls at 0.85x of the scene scrollX,
  // tile width 200; three tile copies for seamless scrolling.
  // In raster mode, BackdropPainting replaces this layer entirely.
  import type { Terrain } from '$lib/game/types';

  interface Props {
    terrain: Terrain;
    scrollX: number;
    groundY: number;
  }

  let { terrain, scrollX, groundY }: Props = $props();

  const TILE_W = 200;
  const SCROLL_FACTOR = 0.85;
  const x = $derived(-((scrollX * SCROLL_FACTOR) % TILE_W));
  const offsets = [0, TILE_W, TILE_W * 2];

  const prairieGrassXs = [10, 35, 70, 110, 140, 175];
  const forestStumpXs = [20, 80, 140];
</script>

<g>
  {#each offsets as offset (offset)}
    {@const tx = x + offset}
    <g transform="translate({tx} {groundY})">
        {#if terrain === 'prairie'}
          <g stroke="#4a3818" stroke-width="0.5" fill="none" stroke-linecap="round">
            {#each prairieGrassXs as px (px)}
              <path d={`M ${px} 4 q 1 -3 2 0 m -1 0 q -1 -3 0 -5 m 0 0 q 1 -2 2 -1`} />
            {/each}
          </g>
        {:else if terrain === 'mountains'}
          <g fill="#5a4a3a" stroke="#1a0e08" stroke-width="0.5">
            <ellipse cx="30" cy="3" rx="8" ry="2" />
            <ellipse cx="100" cy="2" rx="5" ry="1.4" />
            <ellipse cx="160" cy="3" rx="7" ry="1.8" />
          </g>
        {:else if terrain === 'forest'}
          <g>
            {#each forestStumpXs as px (px)}
              <g transform="translate({px} 0)">
                <ellipse cx="0" cy="2" rx="4" ry="1" fill="#3a2818" />
                <path d="M -2 2 l 1 -3 m 2 3 l 0 -3 m 1 3 l 1 -2"
                      stroke="#5a4828" stroke-width="0.5" />
              </g>
            {/each}
          </g>
        {:else if terrain === 'desert'}
          <g>
            <ellipse cx="40" cy="3" rx="3" ry="1" fill="#8a5828" />
            <ellipse cx="120" cy="3" rx="5" ry="1.2" fill="#a86838" />
            <!-- small skull -->
            <g transform="translate(150 1)">
              <ellipse cx="0" cy="0" rx="2" ry="1.2" fill="#e8d8b8" stroke="#3a1a08" stroke-width="0.3" />
              <circle cx="-0.6" cy="0" r="0.3" fill="#3a1a08" />
              <circle cx="0.6" cy="0" r="0.3" fill="#3a1a08" />
            </g>
          </g>
        {:else if terrain === 'river'}
          <g>
            <path d="M 0 0 Q 50 -2 100 0 Q 150 2 200 0 L 200 8 L 0 8 Z"
                  fill="#4a8bc9" opacity="0.6" />
            <path d="M 0 0 Q 50 -2 100 0 Q 150 2 200 0"
                  stroke="#7aa8d4" stroke-width="0.5" fill="none" />
          </g>
        {/if}
      </g>
  {/each}
</g>
