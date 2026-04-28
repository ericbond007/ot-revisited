<script lang="ts">
  // Fort Laramie — worked-port template for "fort with badge + flagpole
  // accent." Whitewashed Old Bedlam silhouette, US flag right-edge.
  // Ported verbatim from icons-trading-posts.jsx (Lmk_FortLaramie).
  import HybridBadge from './_badge.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="laramie" tone="warm">
  {#snippet children()}
    <path d="M 5 12 L 12 8 L 19 12 L 19 19 L 5 19 Z"
          fill={LI.white} stroke={LI.ink} stroke-width="0.5" stroke-linejoin="round" />
    <path d="M 12 8 L 19 12 L 12 12 Z" fill={LI.ink} opacity="0.2" />
    <rect x="14" y="12" width="5" height="7" fill={LI.ink} opacity="0.18" />
    <rect x="11" y="15" width="2" height="4" fill={LI.ink} opacity="0.85" />
    <rect x="6.8" y="13" width="1.3" height="1.3" fill={LI.ink} opacity="0.7" />
    <rect x="10"  y="13" width="1.3" height="1.3" fill={LI.ink} opacity="0.7" />
    <rect x="12.7" y="13" width="1.3" height="1.3" fill={LI.ink} opacity="0.7" />
    <rect x="15.7" y="13" width="1.3" height="1.3" fill={LI.ink} opacity="0.7" />
    <line x1="20.5" y1="5" x2="20.5" y2="19" stroke={LI.ink} stroke-width="0.5" stroke-linecap="round" />
    <path d="M 20.5 5 L 22.7 6 L 20.5 7 Z" fill={LI.redFlag} stroke={LI.ink} stroke-width="0.3" />
  {/snippet}
</HybridBadge>
