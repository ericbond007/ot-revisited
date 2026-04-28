<script lang="ts">
  // Kansas River ferry — worked-port template for "river crossing with
  // shared RiverSurface helper + bespoke ferry detail." Cool tone badge.
  // Ported verbatim from icons-rivers.jsx (Lmk_KansasRiver).
  import HybridBadge from './_badge.svelte';
  import RiverSurface from './RiverSurface.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="kansas" tone="cool">
  {#snippet children()}
    <RiverSurface y={11} h={11} />
    <!-- far bank trees -->
    <ellipse cx="3" cy="9" rx="2" ry="2.5" fill={LI.sageDark} opacity="0.55" />
    <ellipse cx="20" cy="9" rx="2.5" ry="2.5" fill={LI.sageDark} opacity="0.55" />
    <!-- ferry rope across -->
    <line x1="2" y1="11" x2="22" y2="11" stroke={LI.ink} stroke-width="0.4" opacity="0.7" />
    <!-- flat ferry — wide low platform -->
    <g transform="translate(7 12.5)">
      <path d="M 0 3 L 1 1 L 9 1 L 10 3 Z" fill={LI.earth} stroke={LI.ink} stroke-width="0.5" stroke-linejoin="round" />
      <rect x="0" y="3" width="10" height="0.6" fill={LI.ink} opacity="0.4" />
      <!-- small wagon riding the ferry -->
      <path d="M 3 1 Q 5 -1.5 7 1 Z" fill={LI.white} stroke={LI.ink} stroke-width="0.4" />
      <rect x="3" y="1" width="4" height="0.6" fill={LI.ink} opacity="0.6" />
      <!-- tiny figure poling -->
      <line x1="9" y1="1" x2="10.5" y2="-1.5" stroke={LI.ink} stroke-width="0.35" />
      <circle cx="9.3" cy="0.3" r="0.4" fill={LI.ink} />
    </g>
  {/snippet}
</HybridBadge>
