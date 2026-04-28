<script lang="ts">
  // Whore — red garter ribbon with bow and lace trim (period, evocative, not crude).
  // Ported verbatim from docs/handoff/profession-icons/src/icons-professions.jsx
  // (ProfessionIconWhore). Path data is committed — don't optimize or redraw.
  import { LI } from './profession-icon-tokens';
</script>

<g>
  <!-- lace top edge (zigzag) -->
  <path d="M2 8 L4 9 L6 8 L8 9 L10 8 L12 9 L14 8 L16 9 L18 8 L20 9 L22 8" fill="none" stroke={LI.bone} stroke-width="0.7"/>
  <!-- main ribbon band -->
  <path d="M2 9 L22 9 L22 15 L2 15 Z" fill={LI.rust} stroke={LI.ink} stroke-width="1"/>
  <!-- satin highlight stripe -->
  <path d="M2 10.4 L22 10.4" stroke={LI.bone} stroke-width="0.5" opacity="0.55"/>
  <!-- lace bottom edge (zigzag) -->
  <path d="M2 15 L4 16 L6 15 L8 16 L10 15 L12 16 L14 15 L16 16 L18 15 L20 16 L22 15" fill="none" stroke={LI.bone} stroke-width="0.7"/>
  <!-- bow knot at center -->
  <rect x="10.6" y="10.4" width="2.8" height="3.2" fill={LI.rustDark} stroke={LI.ink} stroke-width="0.7"/>
  <!-- left bow loop -->
  <path d="M10.6 12 Q7 10 6 12 Q7 14 10.6 12 Z" fill={LI.rust} stroke={LI.ink} stroke-width="0.8"/>
  <path d="M8 11.2 Q7.6 12 8 12.8" fill="none" stroke={LI.rustDark} stroke-width="0.4"/>
  <!-- right bow loop -->
  <path d="M13.4 12 Q17 10 18 12 Q17 14 13.4 12 Z" fill={LI.rust} stroke={LI.ink} stroke-width="0.8"/>
  <path d="M16 11.2 Q16.4 12 16 12.8" fill="none" stroke={LI.rustDark} stroke-width="0.4"/>
  <!-- dangling ribbon tails -->
  <path d="M11 13.4 L9 18 L10.5 17.5 L10 19 L11.6 18 Z" fill={LI.rust} stroke={LI.ink} stroke-width="0.7"/>
  <path d="M13 13.4 L15 18 L13.5 17.5 L14 19 L12.4 18 Z" fill={LI.rust} stroke={LI.ink} stroke-width="0.7"/>
  <!-- tiny seductive heart on knot -->
  <path d="M12 11.6 Q11.4 11 11.4 11.6 Q11.4 12.2 12 12.6 Q12.6 12.2 12.6 11.6 Q12.6 11 12 11.6 Z" fill={LI.bone} stroke={LI.ink} stroke-width="0.3"/>
</g>
