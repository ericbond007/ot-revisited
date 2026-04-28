<script lang="ts">
  // Green River — deep fast expensive crossing (4.5ft, 4mph), Mormon Ferry,
  // strong current chevrons, green-tinted water, guide rope. Cool tone.
  // Ported verbatim from icons-rivers.jsx (Lmk_GreenRiver).
  // Path data is committed — don't optimize or redraw.
  import HybridBadge from './_badge.svelte';
  import RiverSurface from './RiverSurface.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="green" tone="cool">
  {#snippet children()}
    <RiverSurface y={9} h={13} opacity={0.78} />
    <!-- a stronger green-ish overlay -->
    <rect x="1" y="9" width="22" height="13" fill={LI.sage} opacity="0.18" />
    <!-- current chevrons — stronger -->
    <path d="M 3 13 L 5 14 L 3 15" stroke={LI.ink} stroke-width="0.5" fill="none" opacity="0.6" />
    <path d="M 19 16 L 21 17 L 19 18" stroke={LI.ink} stroke-width="0.5" fill="none" opacity="0.6" />
    <path d="M 8 18 L 10 19 L 8 20" stroke={LI.ink} stroke-width="0.5" fill="none" opacity="0.6" />
    <path d="M 13 20 L 15 21 L 13 22" stroke={LI.ink} stroke-width="0.5" fill="none" opacity="0.55" />
    <!-- mountain man's flat ferry — Green had Mormon Ferry -->
    <g transform="translate(7 9)">
      <path d="M 0 3 L 1 1 L 9 1 L 10 3 Z" fill={LI.earth} stroke={LI.ink} stroke-width="0.5" stroke-linejoin="round" />
      <rect x="0" y="3" width="10" height="0.6" fill={LI.ink} opacity="0.4" />
      <path d="M 3 1 Q 5 -1.5 7 1 Z" fill={LI.white} stroke={LI.ink} stroke-width="0.4" />
    </g>
    <!-- guide rope -->
    <line x1="2" y1="9" x2="22" y2="9" stroke={LI.ink} stroke-width="0.35" opacity="0.6" />
  {/snippet}
</HybridBadge>
