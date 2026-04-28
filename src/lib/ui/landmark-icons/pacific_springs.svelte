<script lang="ts">
  // Pacific Springs — first west-flowing water after South Pass, clear pool
  // with arrow pointing west, compass rose above. Warm tone.
  // Ported verbatim from icons-arrival.jsx (Lmk_PacificSprings).
  // Path data is committed — don't optimize or redraw.
  import HybridBadge from './_badge.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="pacific" tone="warm">
  {#snippet children()}
    <!-- sage prairie ground -->
    <rect x="1" y="15" width="22" height="4" fill={LI.sage} opacity="0.4" />
    <!-- small mound + spring pool -->
    <ellipse cx="12" cy="17" rx="9" ry="2.5" fill={LI.earthLight} stroke={LI.ink} stroke-width="0.4" />
    <path d="M 12 17 Q 20 16 21 17.5" fill="none" stroke={LI.ink} stroke-width="0.3" opacity="0.4" />
    <!-- clear pool -->
    <ellipse cx="12" cy="16" rx="3" ry="1.1" fill={LI.water} stroke={LI.ink} stroke-width="0.4" />
    <!-- arrow showing water flowing WEST (right side of pool) -->
    <path d="M 15 16 L 19 16" stroke={LI.ink} stroke-width="0.5" fill="none" />
    <path d="M 18 15.3 L 19 16 L 18 16.7" stroke={LI.ink} stroke-width="0.5" fill="none" />
    <!-- compass-rose hint above -->
    <g transform="translate(12 8)" stroke={LI.ink} fill="none" stroke-width="0.4">
      <circle r="2.5" fill={LI.parchment} stroke={LI.ink} stroke-width="0.4" />
      <line x1="0" y1="-2.5" x2="0" y2="2.5" />
      <line x1="-2.5" y1="0" x2="2.5" y2="0" />
      <text x="2.6" y="0.5" font-size="2" font-family="Georgia, serif" fill={LI.ink} stroke="none">W</text>
    </g>
  {/snippet}
</HybridBadge>
