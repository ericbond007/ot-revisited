<script lang="ts">
  // Three Island Crossing — Snake River with three defining islands, shallow
  // wagon picking through channels, current chevrons. Cool tone.
  // Ported verbatim from icons-rivers.jsx (Lmk_ThreeIsland).
  // Path data is committed — don't optimize or redraw.
  import HybridBadge from './_badge.svelte';
  import RiverSurface from './RiverSurface.svelte';
  import ShallowFordWagon from './ShallowFordWagon.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="three_isl" tone="cool">
  {#snippet children()}
    <RiverSurface y={10} h={12} opacity={0.75} />
    <!-- THREE islands — the defining feature -->
    <ellipse cx="6"  cy="14" rx="2.5" ry="1"   fill={LI.earthLight} stroke={LI.ink} stroke-width="0.4" />
    <ellipse cx="6"  cy="13.5" rx="1.6" ry="0.4" fill={LI.sage} opacity="0.7" />
    <ellipse cx="12" cy="17"  rx="3" ry="1.1" fill={LI.earthLight} stroke={LI.ink} stroke-width="0.4" />
    <ellipse cx="12" cy="16.5" rx="2"  ry="0.4" fill={LI.sage} opacity="0.7" />
    <ellipse cx="18" cy="14"  rx="2.5" ry="1"   fill={LI.earthLight} stroke={LI.ink} stroke-width="0.4" />
    <ellipse cx="18" cy="13.5" rx="1.6" ry="0.4" fill={LI.sage} opacity="0.7" />
    <!-- current chevrons in channels -->
    <path d="M 9 19 L 10 19.7 L 9 20.4" stroke={LI.ink} stroke-width="0.35" fill="none" opacity="0.5" />
    <path d="M 15 19 L 16 19.7 L 15 20.4" stroke={LI.ink} stroke-width="0.35" fill="none" opacity="0.5" />
    <!-- tiny shallow wagon picking its way -->
    <ShallowFordWagon x={8.5} y={7.5} />
  {/snippet}
</HybridBadge>
