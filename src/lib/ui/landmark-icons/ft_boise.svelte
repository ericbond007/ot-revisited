<script lang="ts">
  // Fort Boise — small HBC cottonwood-shaded station, peaked roof cabin
  // with a compact Union Jack flag. Cool tone (British post).
  // Ported verbatim from icons-trading-posts.jsx (Lmk_FortBoise).
  // Path data is committed — don't optimize or redraw.
  import HybridBadge from './_badge.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="boise" tone="cool">
  {#snippet children()}
    <!-- cottonwood backdrop -->
    <ellipse cx="4" cy="12" rx="3" ry="5" fill={LI.sageDark} opacity="0.55" />
    <ellipse cx="20" cy="12" rx="3" ry="5" fill={LI.sageDark} opacity="0.55" />
    <!-- small HBC cabin -->
    <rect x="8" y="13" width="8" height="6" fill={LI.bone} stroke={LI.ink} stroke-width="0.5" />
    <rect x="12" y="13" width="4" height="6" fill={LI.ink} opacity="0.22" />
    <!-- peaked roof -->
    <path d="M 7.5 13 L 12 10 L 16.5 13 Z" fill={LI.earth} stroke={LI.ink} stroke-width="0.4" stroke-linejoin="round" />
    <path d="M 12 10 L 16.5 13 L 12 13 Z" fill={LI.ink} opacity="0.2" />
    <rect x="11" y="15" width="2" height="4" fill={LI.ink} opacity="0.85" />
    <!-- HBC flagpole — small -->
    <line x1="7.5" y1="13" x2="7.5" y2="6" stroke={LI.ink} stroke-width="0.4" />
    <rect x="7.5" y="6" width="2.4" height="1.6" fill={LI.navyFlag} stroke={LI.ink} stroke-width="0.3" />
    <line x1="7.5" y1="6" x2="9.9" y2="7.6" stroke={LI.white} stroke-width="0.3" />
    <line x1="9.9" y1="6" x2="7.5" y2="7.6" stroke={LI.white} stroke-width="0.3" />
  {/snippet}
</HybridBadge>
