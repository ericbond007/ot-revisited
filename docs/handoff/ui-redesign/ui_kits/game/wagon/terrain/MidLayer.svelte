<script lang="ts">
  // Mid parallax layer — rolling hills, mid-distance trees, and biome
  // accents. Scrolls at 0.4x; tile width 400. In raster mode the
  // BackdropPainting replaces this entirely; this component stays SVG-only.
  import type { Terrain } from '$lib/game/types';

  interface Props {
    terrain: Terrain;
    scrollX: number;
    horizonY: number;
    groundY: number;
  }

  let { terrain, scrollX, horizonY, groundY }: Props = $props();

  const TILE_W = 400;
  const SCROLL_FACTOR = 0.4;
  const x = $derived(-((scrollX * SCROLL_FACTOR) % TILE_W));
  const offsets = [0, TILE_W];
  const midY = $derived(horizonY + (groundY - horizonY) * 0.45);

  const mountainPineXs = [40, 100, 180, 260, 340];
  const forestTreeXs = [20, 60, 100, 140, 180, 220, 260, 300, 340, 380];
  const desertCactiXs = [60, 180, 280];
  const riverReedXs = [40, 90, 140, 200, 260, 320, 360];
  const prairieTuftXs = [40, 110, 180, 260, 330];
</script>

<g>
  {#each offsets as offset (offset)}
    {@const tx = x + offset}
    {#if terrain === 'mountains'}
      <g transform="translate({tx} {midY})">
        <path d="M 0 0 Q 80 -20 160 -8 Q 240 -24 320 -10 Q 400 -22 400 0 L 0 0 Z"
              fill="#6e5a45" stroke="#3a2818" stroke-width="0.7" />
        {#each mountainPineXs as px (px)}
          <g transform="translate({px} -2)">
            <path d="M 0 0 l -3 -7 l 3 -2 l -2 -5 l 2 -2 l 2 2 l -2 5 l 3 2 l -3 7 Z"
                  fill="#2a3a28" stroke="#1a2a18" stroke-width="0.4" />
          </g>
        {/each}
      </g>
    {:else if terrain === 'forest'}
      <g transform="translate({tx} {midY})">
        {#each forestTreeXs as px (px)}
          <g transform="translate({px} 0)">
            <rect x="-1" y="-2" width="2" height="4" fill="#3a2418" />
            <ellipse cx="0" cy="-7" rx="6" ry="9" fill="#3a5a3a" stroke="#1a2a1a" stroke-width="0.4" />
            <path d="M -4 -10 q 4 -2 8 0" stroke="#1a2a1a" stroke-width="0.3" fill="none" />
          </g>
        {/each}
      </g>
    {:else if terrain === 'desert'}
      <g transform="translate({tx} {midY})">
        <path d="M 0 0 Q 80 -12 160 -2 Q 240 -14 320 -4 Q 400 -10 400 0 L 0 0 Z"
              fill="#c8884a" stroke="#7a4818" stroke-width="0.5" />
        {#each desertCactiXs as px (px)}
          <g transform="translate({px} -1)">
            <path d="M 0 0 L 0 -10 M -2 -7 L -2 -10 M 2 -8 L 2 -11"
                  stroke="#3a5a28" stroke-width="1.2" fill="none" stroke-linecap="round" />
          </g>
        {/each}
      </g>
    {:else if terrain === 'river'}
      <g transform="translate({tx} {midY})">
        <path d="M 0 0 Q 100 -4 200 0 Q 300 -3 400 0 L 400 8 L 0 8 Z"
              fill="#6a7a4a" stroke="#3a4a2a" stroke-width="0.5" />
        {#each riverReedXs as px (px)}
          <line x1={px} y1="0" x2={px + 1} y2="-5" stroke="#3a4a2a" stroke-width="0.5" />
        {/each}
      </g>
    {:else}
      <!-- prairie: low rolling tufts -->
      <g transform="translate({tx} {midY})">
        <path d="M 0 0 Q 60 -4 120 0 Q 180 -3 240 0 Q 300 -4 360 0 Q 400 -2 400 0 L 0 0 Z"
              fill="#9a8a4a" stroke="#5a4818" stroke-width="0.4" />
        {#each prairieTuftXs as px (px)}
          <g transform="translate({px} 0)">
            <ellipse cx="0" cy="-1" rx="6" ry="1.2" fill="#7a6a3a" opacity="0.7" />
            <path d="M -3 -1 q 1 -2 2 -1 m 1 0 q 1 -2 2 -1"
                  stroke="#5a4818" stroke-width="0.4" fill="none" opacity="0.6" />
          </g>
        {/each}
      </g>
    {/if}
  {/each}
</g>
