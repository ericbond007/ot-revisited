<script lang="ts">
  // Bear River — moderate ford (3ft, 2mph) with willows on both banks,
  // floating wagon. Winding river with cottonwood/willow character.
  // Ported verbatim from icons-rivers.jsx (Lmk_BearRiver).
  // Path data is committed — don't optimize or redraw.
  import HybridBadge from './_badge.svelte';
  import RiverSurface from './RiverSurface.svelte';
  import FloatingWagon from './FloatingWagon.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="bear" tone="cool">
  {#snippet children()}
    <RiverSurface y={12} h={10} />
    <!-- willows on banks -->
    <ellipse cx="2.5" cy="10" rx="2" ry="3" fill={LI.sage} opacity="0.6" />
    <ellipse cx="21"  cy="10" rx="2" ry="3" fill={LI.sage} opacity="0.6" />
    <!-- hint of trunks -->
    <line x1="2.5" y1="9" x2="2.5" y2="13" stroke={LI.ink} stroke-width="0.3" opacity="0.6" />
    <line x1="21"  y1="9" x2="21"  y2="13" stroke={LI.ink} stroke-width="0.3" opacity="0.6" />
    <FloatingWagon x={8} y={9.5} />
  {/snippet}
</HybridBadge>
