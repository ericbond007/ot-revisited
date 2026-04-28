<script lang="ts">
  // Whitman Mission (Waiilatpu) — fresh glyph drawn in the handoff
  // vocabulary because the bundle pre-dates the historical pass that
  // added this landmark. A plain Methodist mission chapel: peaked
  // shake roof, single door, small cross atop the gable, sage ground.
  //
  // The landmark is gated `abandonedAfterYear: 1847` (post-massacre).
  // Drawing the standing mission here; an abandoned-state variant
  // can layer with desaturation at the call site if needed.
  import HybridBadge from './_badge.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="whitman" tone="warm">
  {#snippet children()}
    <!-- ground band -->
    <rect x="1" y="18" width="22" height="5" fill={LI.sage} opacity="0.45" />
    <!-- distant ridge -->
    <path d="M 1 18 Q 7 17.2 12 17.6 Q 18 18 23 17.4 L 23 19 L 1 19 Z"
          fill={LI.sageDark} opacity="0.35" />
    <!-- chapel body -->
    <rect x="7" y="13" width="10" height="6" fill={LI.white} stroke={LI.ink} stroke-width="0.4" />
    <!-- shadow side -->
    <rect x="13" y="13" width="4" height="6" fill={LI.ink} opacity="0.18" />
    <!-- shake roof — A-frame -->
    <path d="M 6 13 L 12 8.5 L 18 13 Z" fill={LI.earth} stroke={LI.ink} stroke-width="0.45" stroke-linejoin="round" />
    <path d="M 12 8.5 L 18 13 L 12 13 Z" fill={LI.ink} opacity="0.2" />
    <!-- door -->
    <rect x="11" y="15.5" width="2" height="3.5" fill={LI.ink} opacity="0.85" />
    <!-- window -->
    <rect x="8.5" y="14.5" width="1.4" height="1.4" fill={LI.ink} opacity="0.6" />
    <!-- gable cross -->
    <line x1="12" y1="6" x2="12" y2="9" stroke={LI.ink} stroke-width="0.55" stroke-linecap="round" />
    <line x1="10.7" y1="7.2" x2="13.3" y2="7.2" stroke={LI.ink} stroke-width="0.55" stroke-linecap="round" />
  {/snippet}
</HybridBadge>
