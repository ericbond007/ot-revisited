<script lang="ts">
  // Fort Hall — HBC adobe quadrangle with corner blockhouses and Union Jack
  // flag. British Hudson's Bay Company post on the Snake River, cool tone.
  // Ported verbatim from icons-trading-posts.jsx (Lmk_FortHall).
  // Path data is committed — don't optimize or redraw.
  import HybridBadge from './_badge.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="hall" tone="cool">
  {#snippet children()}
    <!-- taller adobe quadrangle -->
    <rect x="5" y="11" width="14" height="8" fill={LI.bone} stroke={LI.ink} stroke-width="0.5" />
    <rect x="14" y="11" width="5" height="8" fill={LI.ink} opacity="0.2" />
    <!-- corner blockhouses -->
    <rect x="4" y="10" width="3" height="3" fill={LI.bone} stroke={LI.ink} stroke-width="0.4" />
    <rect x="17" y="10" width="3" height="3" fill={LI.bone} stroke={LI.ink} stroke-width="0.4" />
    <rect x="17" y="10" width="3" height="3" fill={LI.ink} opacity="0.2" />
    <!-- gate -->
    <rect x="11" y="15" width="2" height="4" fill={LI.ink} opacity="0.85" />
    <!-- small windows -->
    <rect x="7"  y="13" width="1.2" height="1.2" fill={LI.ink} opacity="0.65" />
    <rect x="10" y="13" width="1.2" height="1.2" fill={LI.ink} opacity="0.65" />
    <rect x="13" y="13" width="1.2" height="1.2" fill={LI.ink} opacity="0.65" />
    <rect x="15.7" y="13" width="1.2" height="1.2" fill={LI.ink} opacity="0.65" />
    <!-- Union Jack — HBC -->
    <line x1="12" y1="11" x2="12" y2="3" stroke={LI.ink} stroke-width="0.5" stroke-linecap="round" />
    <rect x="12" y="3" width="4" height="2.6" fill={LI.navyFlag} stroke={LI.ink} stroke-width="0.3" />
    <line x1="12" y1="3" x2="16" y2="5.6" stroke={LI.white} stroke-width="0.5" />
    <line x1="16" y1="3" x2="12" y2="5.6" stroke={LI.white} stroke-width="0.5" />
    <line x1="14" y1="3" x2="14" y2="5.6" stroke={LI.redFlag} stroke-width="0.4" />
    <line x1="12" y1="4.3" x2="16" y2="4.3" stroke={LI.redFlag} stroke-width="0.4" />
  {/snippet}
</HybridBadge>
