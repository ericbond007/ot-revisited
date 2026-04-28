<script lang="ts">
  // Carpenter — claw hammer (head + handle + bevel curve).
  // Ported verbatim from docs/handoff/profession-icons/src/icons-professions.jsx
  // (ProfessionIconCarpenter). Path data is committed — don't optimize or redraw.
  import { LI } from './profession-icon-tokens';
</script>

<g>
  <rect x="11" y="9" width="2" height="13" fill={LI.earth} stroke={LI.ink} stroke-width="0.7"/>
  <path d="M6 5 L18 5 L17.5 9 Q17 10 15 10 L9 10 Q7 10 6.5 9 Z" fill={LI.inkSoft} stroke={LI.ink} stroke-width="0.9"/>
  <path d="M9 5 Q12 3 15 5" fill="none" stroke={LI.ink} stroke-width="0.6" opacity="0.5"/>
  <path d="M6 5 L7 7" stroke={LI.ink} stroke-width="1.4" stroke-linecap="round"/>
</g>
