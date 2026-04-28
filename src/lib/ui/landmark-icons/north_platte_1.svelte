<script lang="ts">
  // North Platte East — wide shallow braided ford with sandbars visible,
  // shallow-ford wagon picking its way across. Cool tone (depth 2.5, current 2).
  // Ported verbatim from icons-rivers.jsx (Lmk_NorthPlatteEast).
  // Path data is committed — don't optimize or redraw.
  import HybridBadge from './_badge.svelte';
  import RiverSurface from './RiverSurface.svelte';
  import ShallowFordWagon from './ShallowFordWagon.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="np_e" tone="cool">
  {#snippet children()}
    <RiverSurface y={11} h={11} />
    <!-- sandbar mid-stream -->
    <ellipse cx="14" cy="17" rx="5" ry="0.8" fill={LI.earthLight} stroke={LI.ink} stroke-width="0.3" />
    <ellipse cx="6"  cy="14" rx="3" ry="0.6" fill={LI.earthLight} stroke={LI.ink} stroke-width="0.3" />
    <!-- shallow-ford wagon -->
    <ShallowFordWagon x={8} y={9.5} />
  {/snippet}
</HybridBadge>
