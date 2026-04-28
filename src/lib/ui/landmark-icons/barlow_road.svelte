<script lang="ts">
  // Barlow Road — fresh glyph for the toll road around Mt. Hood, the
  // alternative to the Columbia raft route. A snow-capped peak rising
  // behind a forested slope, a switchback ribbon climbing the
  // foreground. Dark fir silhouettes give the Cascades read.
  //
  // The handoff bundle pre-dates the historical pass that added this
  // landmark; drawing in matching vocabulary (warm tone, sage ridge,
  // earthLight slope, ink + white peak).
  import HybridBadge from './_badge.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="barlow" tone="warm">
  {#snippet children()}
    <!-- ground band -->
    <rect x="1" y="18" width="22" height="5" fill={LI.sage} opacity="0.45" />
    <!-- mt. hood — snow-capped triangle -->
    <path d="M 8 17 L 13 5 L 18 17 Z"
          fill={LI.earthLight} stroke={LI.ink} stroke-width="0.5" stroke-linejoin="round" />
    <!-- snowcap -->
    <path d="M 11.4 8.5 L 13 5 L 14.6 8.5 Q 13 9.3 11.4 8.5 Z"
          fill={LI.white} stroke={LI.ink} stroke-width="0.3" />
    <!-- shadow side of peak -->
    <path d="M 13 5 L 18 17 L 13 17 Z" fill={LI.ink} opacity="0.22" />
    <!-- second smaller ridge to the left -->
    <path d="M 1 17 L 5 12 L 9 17 Z" fill={LI.earth} stroke={LI.ink} stroke-width="0.4" stroke-linejoin="round" />
    <path d="M 5 12 L 9 17 L 5 17 Z" fill={LI.ink} opacity="0.2" />
    <!-- foreground fir trees — dark sage clumps -->
    <path d="M 3 19 L 4 16 L 5 19 Z" fill={LI.sageDark} opacity="0.85" />
    <path d="M 6 19 L 7 15.5 L 8 19 Z" fill={LI.sageDark} opacity="0.85" />
    <path d="M 16 19 L 17 16 L 18 19 Z" fill={LI.sageDark} opacity="0.85" />
    <path d="M 19 19 L 20 16.5 L 21 19 Z" fill={LI.sageDark} opacity="0.85" />
    <!-- switchback road — pale ribbon climbing the slope -->
    <path d="M 9 19 Q 11 18 12 17 Q 13 16 11.5 14.5 Q 10 13 11.5 11"
          stroke={LI.paperWarm} stroke-width="0.9" fill="none" stroke-linecap="round" opacity="0.85" />
  {/snippet}
</HybridBadge>
