<script lang="ts">
  // Alcove Spring — sandstone alcove with curved overhang, clear pool below,
  // carved emigrant names, cottonwood at right. Warm tone.
  // Ported verbatim from icons-arrival.jsx (Lmk_AlcoveSpring).
  // Path data is committed — don't optimize or redraw.
  import HybridBadge from './_badge.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="alcove" tone="warm">
  {#snippet children()}
    <!-- sandstone alcove (curved overhang) -->
    <path d="M 4 12 Q 4 7 12 7 Q 20 7 20 12 L 20 19 L 4 19 Z"
          fill={LI.earthLight} stroke={LI.ink} stroke-width="0.5" stroke-linejoin="round" />
    <!-- shadow under overhang -->
    <path d="M 5 11 Q 5 8 12 8 Q 19 8 19 11 L 19 14 L 5 14 Z"
          fill={LI.ink} opacity="0.32" />
    <!-- names carved on the soft rock -->
    <line x1="7"  y1="10" x2="9"  y2="10" stroke={LI.bone} stroke-width="0.4" />
    <line x1="10" y1="11" x2="13" y2="11" stroke={LI.bone} stroke-width="0.4" />
    <line x1="14" y1="10" x2="17" y2="10" stroke={LI.bone} stroke-width="0.4" />
    <!-- cottonwood right of alcove -->
    <ellipse cx="22" cy="11" rx="2" ry="3" fill={LI.sageDark} opacity="0.6" />
    <!-- clear pool -->
    <ellipse cx="12" cy="17.5" rx="5" ry="1.3" fill={LI.water} stroke={LI.ink} stroke-width="0.4" />
    <path d="M 8 17.2 Q 12 16.8 16 17.2" stroke={LI.white} stroke-width="0.3" fill="none" opacity="0.5" />
  {/snippet}
</HybridBadge>
