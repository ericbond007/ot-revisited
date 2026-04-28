<script lang="ts">
  // Chimney Rock — worked-port template for "stops with hybrid badge,
  // warm tone, single hero silhouette." The spire reads at 24px against
  // a haze ellipse + distant sage ridge.
  //
  // Ported verbatim from handoff_bundle/landmark_icons/src/icons-arrival.jsx
  // (Lmk_ChimneyRock). Path data is committed — don't optimize or redraw.
  import HybridBadge from './_badge.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="chimney" tone="warm">
  {#snippet children()}
    <rect x="1" y="18" width="22" height="5" fill={LI.parchment} opacity="0.85" />
    <ellipse cx="12" cy="11" rx="4.5" ry="6" fill={LI.paperWarm} opacity="0.5" />
    <!-- distant ridge -->
    <path d="M 1 18 Q 6 17 12 17.5 Q 17 18 23 17 L 23 19 L 1 19 Z"
          fill={LI.sage} opacity="0.4" />
    <!-- conical pedestal -->
    <path d="M 7 19 L 10.5 11 L 13.5 11 L 17 19 Z"
          fill={LI.earthLight} stroke={LI.ink} stroke-width="0.5" stroke-linejoin="round" />
    <!-- spire -->
    <path d="M 10.5 11 L 11 5 L 11.5 4 L 12.5 4 L 13 5 L 13.5 11 Z"
          fill={LI.earthLight} stroke={LI.ink} stroke-width="0.5" stroke-linejoin="round" />
    <!-- shadow side -->
    <path d="M 12 4 L 13 5 L 13.5 11 L 17 19 L 12 19 Z" fill={LI.ink} opacity="0.22" />
  {/snippet}
</HybridBadge>
