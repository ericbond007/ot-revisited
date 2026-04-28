<script lang="ts">
  // Soda Springs — bubbling carbonated craters with steam plumes rising,
  // three pools of varying size. Warm tone.
  // Ported verbatim from icons-arrival.jsx (Lmk_SodaSprings).
  // Path data is committed — don't optimize or redraw.
  import HybridBadge from './_badge.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="soda" tone="warm">
  {#snippet children()}
    <rect x="1" y="15" width="22" height="4" fill={LI.earthLight} opacity="0.5" />
    <!-- multiple small craters -->
    <ellipse cx="6"  cy="16" rx="2.5" ry="1" fill={LI.water} stroke={LI.ink} stroke-width="0.4" />
    <ellipse cx="13" cy="17" rx="3.5" ry="1.2" fill={LI.water} stroke={LI.ink} stroke-width="0.4" />
    <ellipse cx="19" cy="16" rx="2"  ry="0.9" fill={LI.water} stroke={LI.ink} stroke-width="0.4" />
    <!-- bubbles + steam plumes -->
    <circle cx="5"  cy="15.5" r="0.4" fill={LI.bone} opacity="0.8" />
    <circle cx="7"  cy="15.7" r="0.3" fill={LI.bone} opacity="0.7" />
    <circle cx="12" cy="16.3" r="0.45" fill={LI.bone} opacity="0.8" />
    <circle cx="14" cy="16.5" r="0.35" fill={LI.bone} opacity="0.7" />
    <circle cx="18.5" cy="15.6" r="0.35" fill={LI.bone} opacity="0.7" />
    <!-- steam plumes rising -->
    <path d="M 6 14 Q 5 11 7 9 Q 8 7 6.5 5"
          stroke={LI.ink} stroke-width="0.4" fill="none" opacity="0.5" />
    <path d="M 13 13 Q 14 10 12 8 Q 11 6 13 4"
          stroke={LI.ink} stroke-width="0.4" fill="none" opacity="0.55" />
    <path d="M 19 14 Q 20 11 19 9"
          stroke={LI.ink} stroke-width="0.4" fill="none" opacity="0.5" />
  {/snippet}
</HybridBadge>
