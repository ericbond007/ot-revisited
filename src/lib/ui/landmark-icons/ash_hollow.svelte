<script lang="ts">
  // Ash Hollow — Windlass Hill descent (300ft drop) with twin rut lines,
  // shade trees in hollow at bottom right. Warm tone.
  // Ported verbatim from icons-arrival.jsx (Lmk_AshHollow).
  // Path data is committed — don't optimize or redraw.
  import HybridBadge from './_badge.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="ashhollow" tone="warm">
  {#snippet children()}
    <!-- tall hill at left — Windlass Hill, the 300ft drop -->
    <path d="M 0 6 L 6 7 L 11 19 L 0 19 Z"
          fill={LI.earthLight} stroke={LI.ink} stroke-width="0.5" stroke-linejoin="round" />
    <!-- shadow on east face of hill -->
    <path d="M 6 7 L 11 19 L 8 19 L 5 10 Z" fill={LI.ink} opacity="0.25" />
    <!-- trail rut down the hill -->
    <path d="M 4 7.5 Q 6 12 10 19" stroke={LI.ink} stroke-width="0.5" fill="none" opacity="0.55" />
    <path d="M 5 8 Q 7 12 11 19" stroke={LI.ink} stroke-width="0.4" fill="none" opacity="0.4" />
    <!-- hollow / shade trees at the bottom right -->
    <ellipse cx="16" cy="13" rx="2.5" ry="3.5" fill={LI.sageDark} opacity="0.7" />
    <ellipse cx="20" cy="14" rx="2.2" ry="3" fill={LI.sageDark} opacity="0.65" />
    <line x1="16" y1="13" x2="16" y2="19" stroke={LI.ink} stroke-width="0.4" opacity="0.7" />
    <line x1="20" y1="14" x2="20" y2="19" stroke={LI.ink} stroke-width="0.4" opacity="0.7" />
  {/snippet}
</HybridBadge>
