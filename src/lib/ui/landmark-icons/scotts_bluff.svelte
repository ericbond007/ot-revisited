<script lang="ts">
  // Scotts Bluff — 800ft sandstone bluff with Mitchell Pass notch through it,
  // horizontal striations, trail through the pass. Warm tone.
  // Ported verbatim from icons-arrival.jsx (Lmk_ScottsBluff).
  // Path data is committed — don't optimize or redraw.
  import HybridBadge from './_badge.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="scotts" tone="warm">
  {#snippet children()}
    <rect x="1" y="18" width="22" height="5" fill={LI.parchment} opacity="0.85" />
    <!-- massive bluff with notch (Mitchell Pass) -->
    <path d="M 1 16 L 3 11 L 6 8 L 9 9 L 10 13 L 14 13 L 15 9 L 18 8 L 21 11 L 23 16 L 23 19 L 1 19 Z"
          fill={LI.earthLight} stroke={LI.ink} stroke-width="0.5" stroke-linejoin="round" />
    <!-- shadow on east side of pass -->
    <path d="M 14 13 L 15 9 L 18 8 L 21 11 L 23 16 L 23 19 L 14 19 Z" fill={LI.ink} opacity="0.2" />
    <!-- trail through the pass -->
    <path d="M 11 19 Q 12 15 13 19" fill={LI.parchment} stroke={LI.ink} stroke-width="0.3" opacity="0.7" />
    <!-- horizontal sandstone striations -->
    <line x1="3" y1="14" x2="9.5" y2="14" stroke={LI.ink} stroke-width="0.2" opacity="0.45" />
    <line x1="14.5" y1="14" x2="21" y2="14" stroke={LI.ink} stroke-width="0.2" opacity="0.45" />
    <line x1="3.5" y1="16" x2="10" y2="16" stroke={LI.ink} stroke-width="0.2" opacity="0.4" />
    <line x1="14" y1="16" x2="20.5" y2="16" stroke={LI.ink} stroke-width="0.2" opacity="0.4" />
  {/snippet}
</HybridBadge>
