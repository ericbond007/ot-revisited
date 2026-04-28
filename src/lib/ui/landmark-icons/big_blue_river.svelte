<script lang="ts">
  // Big Blue River — caulked-and-float ford, floating wagon on water surface.
  // Moderate crossing early on the trail (depth 2.5, current 1). Cool tone.
  // Ported verbatim from icons-rivers.jsx (Lmk_BigBlueRiver).
  // Path data is committed — don't optimize or redraw.
  import HybridBadge from './_badge.svelte';
  import RiverSurface from './RiverSurface.svelte';
  import FloatingWagon from './FloatingWagon.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="bigblue" tone="cool">
  {#snippet children()}
    <RiverSurface y={13} h={9} />
    <FloatingWagon x={8} y={9} />
  {/snippet}
</HybridBadge>
