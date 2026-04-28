<script lang="ts">
  // South Pass — broad gentle saddle (Continental Divide), Wind River peaks
  // in background, dashed trail across, tiny wagon on the saddle. Warm tone.
  // Ported verbatim from icons-arrival.jsx (Lmk_SouthPass).
  // Path data is committed — don't optimize or redraw.
  import HybridBadge from './_badge.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="southpass" tone="warm">
  {#snippet children()}
    <!-- sage flat -->
    <rect x="1" y="14" width="22" height="5" fill={LI.sage} opacity="0.4" />
    <!-- very gentle saddle — two low rolling shoulders -->
    <path d="M 1 19 Q 6 14 12 13.5 Q 18 14 23 19 Z"
          fill={LI.earthLight} stroke={LI.ink} stroke-width="0.5" stroke-linejoin="round" />
    <!-- shadow on east shoulder -->
    <path d="M 12 13.5 Q 18 14 23 19 L 12 19 Z" fill={LI.ink} opacity="0.18" />
    <!-- distant Wind River peaks behind, far smaller — faint blue -->
    <path d="M 3 11 L 6 7 L 8 9 L 10 6 L 12 8 L 14 6 L 16 9 L 18 7 L 21 11 L 21 13 L 3 13 Z"
          fill={LI.water} opacity="0.45" stroke={LI.ink} stroke-width="0.3" stroke-linejoin="round" />
    <!-- trail across the saddle -->
    <path d="M 1 19 Q 12 17 23 19" stroke={LI.ink} stroke-width="0.4" fill="none" opacity="0.6" stroke-dasharray="0.8 0.6" />
    <!-- small wagon dot on the saddle -->
    <g transform="translate(10.5 16)">
      <path d="M 0 1 Q 1.5 -0.5 3 1 Z" fill={LI.white} stroke={LI.ink} stroke-width="0.3" />
      <rect x="0" y="1" width="3" height="0.7" fill={LI.ink} opacity="0.6" />
    </g>
  {/snippet}
</HybridBadge>
