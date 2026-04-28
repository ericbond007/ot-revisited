<script lang="ts">
  // Devil's Gate — two sheer granite cliffs with narrow Sweetwater gap,
  // river flowing through, horizontal striations on both faces. Warm tone.
  // Ported verbatim from icons-arrival.jsx (Lmk_DevilsGate).
  // Path data is committed — don't optimize or redraw.
  import HybridBadge from './_badge.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="devils" tone="warm">
  {#snippet children()}
    <!-- two sheer cliffs with narrow gap between -->
    <path d="M 1 19 L 1 6 L 8 4 L 10.5 6 L 10.5 19 Z"
          fill={LI.earthLight} stroke={LI.ink} stroke-width="0.5" stroke-linejoin="round" />
    <path d="M 13.5 19 L 13.5 6 L 16 4 L 23 6 L 23 19 Z"
          fill={LI.earthLight} stroke={LI.ink} stroke-width="0.5" stroke-linejoin="round" />
    <!-- shadow sides — both faces near the gap go dark -->
    <path d="M 8 4 L 10.5 6 L 10.5 19 L 8 19 Z" fill={LI.ink} opacity="0.3" />
    <path d="M 13.5 6 L 16 4 L 16 19 L 13.5 19 Z" fill={LI.ink} opacity="0.3" />
    <!-- river flowing through the cleft -->
    <rect x="10.5" y="10" width="3" height="9" fill={LI.water} opacity="0.7" />
    <path d="M 10.5 12 Q 12 11.6 13.5 12" stroke={LI.ink} stroke-width="0.3" fill="none" opacity="0.5" />
    <path d="M 10.5 15 Q 12 14.6 13.5 15" stroke={LI.ink} stroke-width="0.3" fill="none" opacity="0.5" />
    <path d="M 10.5 18 Q 12 17.6 13.5 18" stroke={LI.ink} stroke-width="0.3" fill="none" opacity="0.5" />
    <!-- horizontal striations on cliffs -->
    <line x1="2"  y1="10" x2="9.5"  y2="10" stroke={LI.ink} stroke-width="0.2" opacity="0.45" />
    <line x1="14.5" y1="10" x2="22" y2="10" stroke={LI.ink} stroke-width="0.2" opacity="0.45" />
    <line x1="2"  y1="14" x2="9.5"  y2="14" stroke={LI.ink} stroke-width="0.2" opacity="0.4" />
    <line x1="14.5" y1="14" x2="22" y2="14" stroke={LI.ink} stroke-width="0.2" opacity="0.4" />
  {/snippet}
</HybridBadge>
