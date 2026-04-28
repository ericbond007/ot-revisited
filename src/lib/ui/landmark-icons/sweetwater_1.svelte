<script lang="ts">
  // Sweetwater Ford — narrow calm ford between granite outcrops, shallow
  // wagon fording through middle. Cool tone (depth 2, current 1).
  // Ported verbatim from icons-rivers.jsx (Lmk_SweetwaterFord).
  // Path data is committed — don't optimize or redraw.
  import HybridBadge from './_badge.svelte';
  import ShallowFordWagon from './ShallowFordWagon.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="sweet" tone="cool">
  {#snippet children()}
    <!-- granite outcrops on both banks (Sweetwater country has them) -->
    <path d="M 0 14 L 3 12 L 5 14 L 5 19 L 0 19 Z" fill={LI.earthLight} stroke={LI.ink} stroke-width="0.4" />
    <path d="M 19 13 L 21 11 L 24 14 L 24 19 L 19 19 Z" fill={LI.earthLight} stroke={LI.ink} stroke-width="0.4" />
    <!-- shadow side of east outcrop -->
    <path d="M 21 11 L 24 14 L 24 19 L 21 19 Z" fill={LI.ink} opacity="0.22" />
    <!-- shallow water in middle -->
    <rect x="5" y="14" width="14" height="5" fill={LI.water} opacity="0.7" />
    <rect x="5" y="13.5" width="14" height="0.5" fill={LI.earth} opacity="0.6" />
    <path d="M 6 16.5 Q 9 16 12 16.5 T 18 16.5" stroke={LI.ink} stroke-width="0.3" fill="none" opacity="0.5" />
    <path d="M 6 18 Q 9 17.5 12 18 T 18 18" stroke={LI.ink} stroke-width="0.3" fill="none" opacity="0.45" />
    <!-- shallow wagon -->
    <ShallowFordWagon x={8} y={10.5} />
  {/snippet}
</HybridBadge>
