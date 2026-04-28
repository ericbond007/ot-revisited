<script lang="ts">
  // Indian Trader — single eagle feather (clean, banded tip).
  // Ported verbatim from docs/handoff/profession-icons/src/icons-professions.jsx
  // (ProfessionIconIndianTrader). Path data is committed — don't optimize or redraw.
  import { LI } from './profession-icon-tokens';

  const barbYs = [6.5, 8.5, 10.5, 12.5, 14.5, 16.5];
</script>

<g transform="rotate(15 12 12)">
  <!-- central rachis (quill shaft) -->
  <path d="M12 22 L12 4" stroke={LI.ink} stroke-width="0.9" stroke-linecap="round"/>
  <!-- hollow quill base -->
  <path d="M12 22 L12 19.5" stroke={LI.bone} stroke-width="1.5" stroke-linecap="round"/>
  <!-- feather body — eagle shape, dark tip / light base -->
  <!-- light lower vanes -->
  <path d="M12 19 Q9 18 8 16 Q8 14 9.5 13.5 Q11 13.4 12 14 Z" fill={LI.bone} stroke={LI.ink} stroke-width="0.7"/>
  <path d="M12 19 Q15 18 16 16 Q16 14 14.5 13.5 Q13 13.4 12 14 Z" fill={LI.bone} stroke={LI.ink} stroke-width="0.7"/>
  <!-- mid band — earth -->
  <path d="M12 14 Q9.5 13.6 8.4 12 Q8.4 10 10 9.5 Q11.2 9.4 12 10 Z" fill={LI.earthLight} stroke={LI.ink} stroke-width="0.7"/>
  <path d="M12 14 Q14.5 13.6 15.6 12 Q15.6 10 14 9.5 Q12.8 9.4 12 10 Z" fill={LI.earthLight} stroke={LI.ink} stroke-width="0.7"/>
  <!-- dark tip — eagle-feather signature -->
  <path d="M12 10 Q9.8 9.4 9 7.5 Q9.4 5.5 11 4.6 Q12 4 12 4.4 Z" fill={LI.inkSoft} stroke={LI.ink} stroke-width="0.7"/>
  <path d="M12 10 Q14.2 9.4 15 7.5 Q14.6 5.5 13 4.6 Q12 4 12 4.4 Z" fill={LI.inkSoft} stroke={LI.ink} stroke-width="0.7"/>
  <!-- barb texture (subtle hairlines) -->
  {#each barbYs as y, i}
    <g opacity="0.5">
      <line x1="12" y1={y} x2={11 - (i % 2 ? 0.5 : 1)} y2={y - 0.4} stroke={LI.ink} stroke-width="0.3"/>
      <line x1="12" y1={y} x2={13 + (i % 2 ? 0.5 : 1)} y2={y - 0.4} stroke={LI.ink} stroke-width="0.3"/>
    </g>
  {/each}
  <!-- sinew binding at base — single red wrap -->
  <rect x="10.4" y="19.4" width="3.2" height="1.4" fill={LI.rust} stroke={LI.ink} stroke-width="0.5"/>
  <line x1="11.2" y1="19.4" x2="11.2" y2="20.8" stroke={LI.bone} stroke-width="0.25"/>
  <line x1="12.8" y1="19.4" x2="12.8" y2="20.8" stroke={LI.bone} stroke-width="0.25"/>
</g>
