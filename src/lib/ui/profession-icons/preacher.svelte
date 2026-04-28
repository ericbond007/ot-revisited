<script lang="ts">
  // Preacher — open Bible with text lines and a cross spine marker.
  // Ported verbatim from docs/handoff/profession-icons/src/icons-professions.jsx
  // (ProfessionIconPreacher). Path data is committed — don't optimize or redraw.
  import { LI } from './profession-icon-tokens';
</script>

<g>
  <path d="M12 6 L12 20" stroke={LI.ink} stroke-width="0.6"/>
  <path d="M3 6 Q7 4.5 12 6 L12 20 Q7 18.5 3 20 Z" fill={LI.bone} stroke={LI.ink} stroke-width="1"/>
  <path d="M21 6 Q17 4.5 12 6 L12 20 Q17 18.5 21 20 Z" fill={LI.bone} stroke={LI.ink} stroke-width="1"/>
  <line x1="5" y1="9" x2="10" y2="8.4" stroke={LI.ink} stroke-width="0.4"/>
  <line x1="5" y1="11" x2="10" y2="10.5" stroke={LI.ink} stroke-width="0.4"/>
  <line x1="5" y1="13" x2="10" y2="12.6" stroke={LI.ink} stroke-width="0.4"/>
  <line x1="14" y1="8.4" x2="19" y2="9" stroke={LI.ink} stroke-width="0.4"/>
  <line x1="14" y1="10.5" x2="19" y2="11" stroke={LI.ink} stroke-width="0.4"/>
  <line x1="14" y1="12.6" x2="19" y2="13" stroke={LI.ink} stroke-width="0.4"/>
  <path d="M12 9 L12 13 M10.6 11 L13.4 11" stroke={LI.rust} stroke-width="0.7"/>
</g>
