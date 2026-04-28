<script lang="ts">
  // Laurel Hill — steep muddy Cascades descent, forest on both sides,
  // wagon snubbed to tree with rope, twin rut lines on slope. Warm tone.
  // Ported verbatim from icons-arrival.jsx (Lmk_LaurelHill).
  // Path data is committed — don't optimize or redraw.
  import HybridBadge from './_badge.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="laurel" tone="warm">
  {#snippet children()}
    <!-- Cascades forest backdrop -->
    <ellipse cx="3"  cy="9" rx="2.5" ry="4" fill={LI.sageDark} opacity="0.7" />
    <ellipse cx="20" cy="8" rx="2.5" ry="4.5" fill={LI.sageDark} opacity="0.75" />
    <ellipse cx="11" cy="5" rx="2" ry="3" fill={LI.sageDark} opacity="0.65" />
    <!-- the steep slope itself, dropping right→left -->
    <path d="M 1 19 L 23 5 L 23 19 Z"
          fill={LI.earth} stroke={LI.ink} stroke-width="0.5" stroke-linejoin="round" />
    <!-- mud / wetness -->
    <path d="M 1 19 L 23 5 L 23 19 Z" fill={LI.ink} opacity="0.18" />
    <!-- twin trail ruts on the slope -->
    <line x1="3"  y1="18" x2="20" y2="7"  stroke={LI.ink} stroke-width="0.5" opacity="0.7" />
    <line x1="5"  y1="19" x2="22" y2="8"  stroke={LI.ink} stroke-width="0.45" opacity="0.6" />
    <!-- a wagon snubbed to a tree, lowering -->
    <g transform="translate(13 11) rotate(-30)">
      <path d="M 0 1.5 Q 1.8 -0.8 3.6 1.5 Z" fill={LI.white} stroke={LI.ink} stroke-width="0.4" />
      <rect x="0" y="1.5" width="3.6" height="1" fill={LI.ink} opacity="0.7" />
      <circle cx="0.6" cy="2.6" r="0.4" fill="none" stroke={LI.ink} stroke-width="0.3" />
      <circle cx="3.0" cy="2.6" r="0.4" fill="none" stroke={LI.ink} stroke-width="0.3" />
    </g>
    <!-- rope from wagon up to tree -->
    <line x1="14.5" y1="10.8" x2="20" y2="6" stroke={LI.ink} stroke-width="0.3" opacity="0.6" stroke-dasharray="0.6 0.4" />
  {/snippet}
</HybridBadge>
