<script lang="ts">
  // Fort Kearny — US Army quartermaster cluster, three sod-roof buildings,
  // US flag on tall central pole. First Army post on the Platte Road.
  // Ported verbatim from icons-trading-posts.jsx (Lmk_FortKearny).
  // Path data is committed — don't optimize or redraw.
  import HybridBadge from './_badge.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="kearny" tone="warm">
  {#snippet children()}
    <rect x="1" y="18" width="22" height="5" fill={LI.sage} opacity="0.5" />
    <rect x="9" y="13" width="6" height="6" fill={LI.earthLight} stroke={LI.ink} stroke-width="0.4" />
    <rect x="9" y="12.5" width="6" height="0.7" fill={LI.sage} stroke={LI.ink} stroke-width="0.2" />
    <rect x="12" y="13" width="3" height="6" fill={LI.ink} opacity="0.2" />
    <rect x="3" y="14" width="5" height="5" fill={LI.earthLight} stroke={LI.ink} stroke-width="0.4" />
    <rect x="3" y="13.6" width="5" height="0.6" fill={LI.sage} stroke={LI.ink} stroke-width="0.2" />
    <rect x="6" y="14" width="2" height="5" fill={LI.ink} opacity="0.18" />
    <rect x="16" y="14" width="5" height="5" fill={LI.earthLight} stroke={LI.ink} stroke-width="0.4" />
    <rect x="16" y="13.6" width="5" height="0.6" fill={LI.sage} stroke={LI.ink} stroke-width="0.2" />
    <rect x="19" y="14" width="2" height="5" fill={LI.ink} opacity="0.18" />
    <!-- US flag -->
    <line x1="12" y1="13" x2="12" y2="4" stroke={LI.ink} stroke-width="0.5" stroke-linecap="round" />
    <path d="M 12 4 L 16 5 L 12 6 Z" fill={LI.redFlag} stroke={LI.ink} stroke-width="0.3" />
  {/snippet}
</HybridBadge>
