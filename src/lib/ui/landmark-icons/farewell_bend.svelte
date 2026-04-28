<script lang="ts">
  // Farewell Bend — Snake River curves dramatically out of frame, bluffs
  // along bank, tiny wagon waving farewell. Pass-by (no badge).
  // Ported verbatim from icons-passbys.jsx (PB_FarewellBend).
  // Path data is committed — don't optimize or redraw.
  import { LI } from './landmark-icon-tokens';
</script>

<g>
  <!-- river bending out of frame, dramatic curve -->
  <path d="M 2 6 Q 8 10 12 12 Q 18 14 22 22"
        stroke={LI.water} stroke-width="3.5" fill="none" stroke-linecap="round" />
  <path d="M 2 6 Q 8 10 12 12 Q 18 14 22 22"
        stroke={LI.ink} stroke-width="0.4" fill="none" stroke-linecap="round" opacity="0.7" />
  <!-- ripple lines -->
  <path d="M 5 7.5 Q 9 10 13 13" stroke={LI.white} stroke-width="0.3" fill="none" opacity="0.6" />
  <!-- bluffs along the bank -->
  <path d="M 2 19 L 5 16 L 8 17 L 11 15 L 13 16 L 16 18 L 19 19 L 22 22"
        fill="none" stroke={LI.earth} stroke-width="0.5" opacity="0.7" />
  <!-- small wagon waving farewell at the upper bank -->
  <g transform="translate(15 4)">
    <path d="M 0 1.5 Q 1.8 -0.5 3.6 1.5 Z" fill={LI.white} stroke={LI.ink} stroke-width="0.4" />
    <rect x="0" y="1.5" width="3.6" height="1" fill={LI.ink} opacity="0.7" />
    <circle cx="0.6" cy="2.6" r="0.4" fill="none" stroke={LI.ink} stroke-width="0.3" />
    <circle cx="3.0" cy="2.6" r="0.4" fill="none" stroke={LI.ink} stroke-width="0.3" />
  </g>
</g>
