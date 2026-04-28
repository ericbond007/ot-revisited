<script lang="ts">
  // Blacksmith — classic anvil with hammer resting on top, spark accents.
  // Ported verbatim from docs/handoff/profession-icons/src/icons-professions.jsx
  // (ProfessionIconBlacksmith). Path data is committed — don't optimize or redraw.
  import { LI } from './profession-icon-tokens';
</script>

<g>
  <!-- anvil body — horn left, heel right, waisted stand -->
  <!-- top deck -->
  <path d="M2 13 Q4 12 7 12 L18 12 L20 13.5 L20 14.6 L7 14.6 Q4 14.6 2 13.6 Z" fill={LI.inkSoft} stroke={LI.ink} stroke-width="1"/>
  <!-- horn (the pointed left tip) -->
  <path d="M2 13 Q0.6 13.4 0.4 14 Q0.6 14.4 2 14.2 Z" fill={LI.inkSoft} stroke={LI.ink} stroke-width="0.7"/>
  <!-- waisted stand -->
  <path d="M7 14.6 L17 14.6 L15.5 17 Q15 18 16 18 L17.5 18 L17.5 20 L6.5 20 L6.5 18 L8 18 Q9 18 8.5 17 Z" fill={LI.earth} stroke={LI.ink} stroke-width="0.9"/>
  <!-- base shadow -->
  <rect x="5" y="20" width="14" height="1.4" fill={LI.ink} opacity="0.6"/>
  <!-- hammer resting across the deck (slightly angled) -->
  <g transform="rotate(-12 12 11)">
    <!-- handle -->
    <rect x="4" y="10.4" width="11" height="1.2" fill={LI.brick} stroke={LI.ink} stroke-width="0.6"/>
    <!-- head -->
    <rect x="14" y="8.6" width="4.4" height="4.6" rx="0.4" fill={LI.inkSoft} stroke={LI.ink} stroke-width="0.8"/>
    <rect x="14" y="8.6" width="4.4" height="1" fill={LI.bone} opacity="0.45"/>
  </g>
  <!-- sparks above -->
  <circle cx="5" cy="7" r="0.6" fill={LI.rust}/>
  <circle cx="7.5" cy="5.5" r="0.4" fill={LI.rust} opacity="0.75"/>
  <circle cx="3.5" cy="9" r="0.35" fill={LI.rust} opacity="0.65"/>
</g>
