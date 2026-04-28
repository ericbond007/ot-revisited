<script lang="ts">
  // North Platte West — deeper faster crossing (4ft, 3mph), floating wagon
  // with current chevrons and a lead ox swimming alongside. Cool tone.
  // Ported verbatim from icons-rivers.jsx (Lmk_NorthPlatteWest).
  // Path data is committed — don't optimize or redraw.
  import HybridBadge from './_badge.svelte';
  import RiverSurface from './RiverSurface.svelte';
  import FloatingWagon from './FloatingWagon.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="np_w" tone="cool">
  {#snippet children()}
    <RiverSurface y={11} h={11} />
    <!-- current chevrons — faster water -->
    <path d="M 4 16 L 6 17 L 4 18" stroke={LI.ink} stroke-width="0.4" fill="none" opacity="0.55" />
    <path d="M 17 19 L 19 20 L 17 21" stroke={LI.ink} stroke-width="0.4" fill="none" opacity="0.5" />
    <path d="M 10 20 L 12 21 L 10 22" stroke={LI.ink} stroke-width="0.4" fill="none" opacity="0.5" />
    <FloatingWagon x={8} y={9} />
    <!-- lead ox swimming alongside -->
    <ellipse cx="5" cy="13" rx="1.6" ry="0.7" fill={LI.brick} stroke={LI.ink} stroke-width="0.3" />
    <circle cx="3.6" cy="12.7" r="0.6" fill={LI.brick} stroke={LI.ink} stroke-width="0.3" />
  {/snippet}
</HybridBadge>
