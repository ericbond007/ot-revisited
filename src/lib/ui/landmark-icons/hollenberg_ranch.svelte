<script lang="ts">
  // Hollenberg Ranch — low sod-roofed German road ranch, wider than tall,
  // lantern post out front. First station in Kansas on the trail.
  // Ported verbatim from icons-trading-posts.jsx (Lmk_Hollenberg).
  // Path data is committed — don't optimize or redraw.
  import HybridBadge from './_badge.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="hollen" tone="warm">
  {#snippet children()}
    <rect x="1" y="18" width="22" height="5" fill={LI.sage} opacity="0.45" />
    <!-- low single sod-roofed building, wider than tall -->
    <rect x="5" y="13" width="14" height="6" fill={LI.earthLight} stroke={LI.ink} stroke-width="0.4" />
    <rect x="5" y="12.5" width="14" height="0.8" fill={LI.sage} stroke={LI.ink} stroke-width="0.2" />
    <rect x="13" y="13" width="6" height="6" fill={LI.ink} opacity="0.18" />
    <!-- door + 2 windows -->
    <rect x="11" y="15.5" width="2" height="3.5" fill={LI.ink} opacity="0.85" />
    <rect x="7"  y="14.5" width="1.4" height="1.4" fill={LI.ink} opacity="0.65" />
    <rect x="15.6" y="14.5" width="1.4" height="1.4" fill={LI.ink} opacity="0.65" />
    <!-- lantern post — road-ranch flavor -->
    <line x1="3" y1="13" x2="3" y2="19" stroke={LI.ink} stroke-width="0.5" />
    <rect x="2.3" y="11" width="1.4" height="1.8" fill={LI.goldFlag} stroke={LI.ink} stroke-width="0.3" />
  {/snippet}
</HybridBadge>
