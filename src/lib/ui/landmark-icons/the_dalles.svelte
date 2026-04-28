<script lang="ts">
  // The Dalles — end-of-road river port on the Columbia, false-front town
  // row, water band, tiny sail. Gold tone (trail end / major decision).
  // Ported verbatim from icons-trading-posts.jsx (Lmk_TheDalles).
  // Path data is committed — don't optimize or redraw.
  import HybridBadge from './_badge.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="dalles" tone="gold">
  {#snippet children()}
    <!-- Columbia river band -->
    <rect x="1" y="18" width="22" height="5" fill={LI.water} opacity="0.55" />
    <path d="M 1 19 Q 6 18.4 12 19 T 23 19" stroke={LI.ink} stroke-width="0.3" fill="none" opacity="0.5" />
    <!-- row of false-front buildings -->
    <rect x="3"  y="11" width="5" height="7" fill={LI.bone} stroke={LI.ink} stroke-width="0.4" />
    <path d="M 3 11 L 5.5 8.5 L 8 11 Z" fill={LI.brick} stroke={LI.ink} stroke-width="0.4" stroke-linejoin="round" />
    <rect x="9"  y="9.5" width="6" height="8.5" fill={LI.earthLight} stroke={LI.ink} stroke-width="0.4" />
    <rect x="9"  y="9" width="6" height="1" fill={LI.brick} stroke={LI.ink} stroke-width="0.3" />
    <rect x="16" y="11" width="5" height="7" fill={LI.bone} stroke={LI.ink} stroke-width="0.4" />
    <path d="M 16 11 L 18.5 8.5 L 21 11 Z" fill={LI.brick} stroke={LI.ink} stroke-width="0.4" stroke-linejoin="round" />
    <!-- shadows -->
    <rect x="6"  y="11" width="2" height="7" fill={LI.ink} opacity="0.18" />
    <rect x="13" y="9.5" width="2" height="8.5" fill={LI.ink} opacity="0.18" />
    <rect x="19" y="11" width="2" height="7" fill={LI.ink} opacity="0.18" />
    <!-- doors -->
    <rect x="5"  y="14" width="1.4" height="4" fill={LI.ink} opacity="0.85" />
    <rect x="11" y="14" width="2"   height="4" fill={LI.ink} opacity="0.85" />
    <rect x="18" y="14" width="1.4" height="4" fill={LI.ink} opacity="0.85" />
    <!-- tiny sail in the water — port -->
    <path d="M 1.5 17 L 1.5 19 L 3.5 19 Z" fill={LI.white} stroke={LI.ink} stroke-width="0.3" />
  {/snippet}
</HybridBadge>
