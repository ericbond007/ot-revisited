<script lang="ts">
  // Register Cliff — tall sandstone face covered in emigrant names (carved
  // marks), horizontal striations, small scale tree at base. Warm tone.
  // Ported verbatim from icons-arrival.jsx (Lmk_RegisterCliff).
  // Path data is committed — don't optimize or redraw.
  import HybridBadge from './_badge.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="register" tone="warm">
  {#snippet children()}
    <rect x="1" y="18" width="22" height="5" fill={LI.parchment} opacity="0.85" />
    <!-- tall cliff face — taller than wide, dominates -->
    <path d="M 4 5 L 20 5 L 20 19 L 4 19 Z"
          fill={LI.earthLight} stroke={LI.ink} stroke-width="0.5" stroke-linejoin="round" />
    <!-- horizontal striations -->
    <line x1="4" y1="8"  x2="20" y2="8"  stroke={LI.ink} stroke-width="0.25" opacity="0.4" />
    <line x1="4" y1="11" x2="20" y2="11" stroke={LI.ink} stroke-width="0.25" opacity="0.35" />
    <line x1="4" y1="15" x2="20" y2="15" stroke={LI.ink} stroke-width="0.25" opacity="0.3" />
    <!-- names — dense scratchy marks -->
    <g stroke={LI.ink} stroke-width="0.35" opacity="0.7">
      <line x1="6"  y1="7"  x2="9"  y2="7" />
      <line x1="10" y1="7"  x2="13" y2="7" />
      <line x1="14" y1="7"  x2="17" y2="7" />
      <line x1="6"  y1="9.5" x2="8"  y2="9.5" />
      <line x1="9"  y1="9.5" x2="13" y2="9.5" />
      <line x1="14" y1="9.5" x2="18" y2="9.5" />
      <line x1="5.5" y1="12.5" x2="9" y2="12.5" />
      <line x1="10" y1="12.5" x2="14" y2="12.5" />
      <line x1="15" y1="12.5" x2="18.5" y2="12.5" />
      <line x1="6"  y1="14" x2="10" y2="14" />
      <line x1="11" y1="14" x2="14" y2="14" />
      <line x1="15" y1="14" x2="18" y2="14" />
      <line x1="5.5" y1="16.5" x2="8.5" y2="16.5" />
      <line x1="9.5" y1="16.5" x2="13" y2="16.5" />
      <line x1="14" y1="16.5" x2="17" y2="16.5" />
    </g>
    <!-- a small tree at the base for scale -->
    <ellipse cx="2.5" cy="17" rx="1.3" ry="2" fill={LI.sageDark} opacity="0.6" />
  {/snippet}
</HybridBadge>
