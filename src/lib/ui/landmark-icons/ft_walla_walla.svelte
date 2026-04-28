<script lang="ts">
  // Fort Walla Walla — HBC river post, squat adobe with parapet crenellations,
  // Columbia River band below, Union Jack on tall pole. Cool tone.
  // Ported verbatim from icons-trading-posts.jsx (Lmk_FortWallaWalla).
  // Path data is committed — don't optimize or redraw.
  import HybridBadge from './_badge.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="walla" tone="cool">
  {#snippet children()}
    <!-- river band along bottom -->
    <rect x="1" y="18" width="22" height="5" fill={LI.water} opacity="0.55" />
    <path d="M 1 19 Q 6 18.4 12 19 T 23 19" stroke={LI.ink} stroke-width="0.3" fill="none" opacity="0.5" />
    <!-- squat adobe block -->
    <rect x="6" y="12" width="12" height="6" fill={LI.bone} stroke={LI.ink} stroke-width="0.5" />
    <rect x="13" y="12" width="5" height="6" fill={LI.ink} opacity="0.22" />
    <!-- parapet crenellations -->
    <rect x="6"  y="11" width="1.5" height="1" fill={LI.bone} stroke={LI.ink} stroke-width="0.3" />
    <rect x="9"  y="11" width="1.5" height="1" fill={LI.bone} stroke={LI.ink} stroke-width="0.3" />
    <rect x="12" y="11" width="1.5" height="1" fill={LI.bone} stroke={LI.ink} stroke-width="0.3" />
    <rect x="15" y="11" width="1.5" height="1" fill={LI.bone} stroke={LI.ink} stroke-width="0.3" />
    <rect x="11" y="14" width="2" height="4" fill={LI.ink} opacity="0.85" />
    <!-- Union Jack on tall pole -->
    <line x1="20" y1="5" x2="20" y2="18" stroke={LI.ink} stroke-width="0.5" />
    <rect x="20" y="5" width="2.4" height="1.6" fill={LI.navyFlag} stroke={LI.ink} stroke-width="0.3" />
    <line x1="20" y1="5" x2="22.4" y2="6.6" stroke={LI.white} stroke-width="0.3" />
    <line x1="22.4" y1="5" x2="20" y2="6.6" stroke={LI.white} stroke-width="0.3" />
  {/snippet}
</HybridBadge>
