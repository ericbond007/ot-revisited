<script lang="ts">
  // Independence Rock — granite dome "turtle" squatting on prairie, emigrant
  // names smeared in axle grease, light highlight on left face. Warm tone.
  // Ported verbatim from icons-arrival.jsx (Lmk_IndependenceRock).
  // Path data is committed — don't optimize or redraw.
  import HybridBadge from './_badge.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="indeprock" tone="warm">
  {#snippet children()}
    <rect x="1" y="18" width="22" height="5" fill={LI.parchment} opacity="0.85" />
    <!-- squat granite dome — wider than tall, like a turtle -->
    <path d="M 2 19 Q 2 9 12 8 Q 22 9 22 19 Z"
          fill={LI.earthLight} stroke={LI.ink} stroke-width="0.5" stroke-linejoin="round" />
    <!-- shadow side -->
    <path d="M 12 8 Q 22 9 22 19 L 12 19 Z" fill={LI.ink} opacity="0.22" />
    <!-- small light side highlight -->
    <path d="M 4 14 Q 5 11 8 10" stroke={LI.bone} stroke-width="0.5" fill="none" opacity="0.5" />
    <!-- names smeared in axle grease -->
    <g stroke={LI.ink} stroke-width="0.3" opacity="0.7">
      <line x1="5"  y1="14" x2="7"  y2="14" />
      <line x1="8"  y1="13" x2="11" y2="13" />
      <line x1="13" y1="13" x2="16" y2="13" />
      <line x1="6"  y1="16" x2="9"  y2="16" />
      <line x1="10" y1="15.5" x2="14" y2="15.5" />
      <line x1="15" y1="16" x2="18" y2="16" />
    </g>
  {/snippet}
</HybridBadge>
