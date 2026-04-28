<script lang="ts">
  // Robidoux Post — mountain man log cabin with peaked roof, chimney smoke,
  // and a hanging pelt outside. Fur-trade post in the Scott's Bluff area.
  // Ported verbatim from icons-trading-posts.jsx (Lmk_Robidoux).
  // Path data is committed — don't optimize or redraw.
  import HybridBadge from './_badge.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="robidoux" tone="warm">
  {#snippet children()}
    <rect x="1" y="18" width="22" height="5" fill={LI.earthLight} opacity="0.55" />
    <!-- lone log cabin -->
    <rect x="7" y="13" width="9" height="6" fill={LI.earth} stroke={LI.ink} stroke-width="0.4" />
    <rect x="11.5" y="13" width="4.5" height="6" fill={LI.ink} opacity="0.2" />
    <!-- horizontal log lines -->
    <line x1="7" y1="14.5" x2="16" y2="14.5" stroke={LI.ink} stroke-width="0.25" opacity="0.55" />
    <line x1="7" y1="16"   x2="16" y2="16"   stroke={LI.ink} stroke-width="0.25" opacity="0.55" />
    <line x1="7" y1="17.5" x2="16" y2="17.5" stroke={LI.ink} stroke-width="0.25" opacity="0.55" />
    <!-- peaked plank roof -->
    <path d="M 6.5 13 L 11.5 9.5 L 16.5 13 Z" fill={LI.earth} stroke={LI.ink} stroke-width="0.4" stroke-linejoin="round" />
    <path d="M 11.5 9.5 L 16.5 13 L 11.5 13 Z" fill={LI.ink} opacity="0.2" />
    <!-- chimney smoke -->
    <rect x="13.5" y="10.5" width="1.2" height="2" fill={LI.brickDark} stroke={LI.ink} stroke-width="0.2" />
    <path d="M 14 9.5 Q 14.6 8.2 14 7" stroke={LI.ink} stroke-width="0.4" fill="none" opacity="0.55" />
    <!-- hanging pelt -->
    <rect x="17" y="12" width="3" height="4" fill={LI.bone} stroke={LI.ink} stroke-width="0.3" />
    <line x1="17" y1="12" x2="20" y2="12" stroke={LI.ink} stroke-width="0.3" />
  {/snippet}
</HybridBadge>
