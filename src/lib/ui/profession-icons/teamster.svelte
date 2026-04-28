<script lang="ts">
  // Teamster — ox head, front view (horns + muzzle).
  // Ported verbatim from docs/handoff/profession-icons/src/icons-professions.jsx
  // (ProfessionIconTeamster). Path data is committed — don't optimize or redraw.
  import { LI } from './profession-icon-tokens';
</script>

<g>
  <!-- horns — long, curved outward -->
  <path d="M7 8 Q4 7 2.5 4.5 Q2 3.5 3 3.5 Q4 3.5 5 5 Q6 6.5 7.5 7" fill={LI.bone} stroke={LI.ink} stroke-width="0.9"/>
  <path d="M17 8 Q20 7 21.5 4.5 Q22 3.5 21 3.5 Q20 3.5 19 5 Q18 6.5 16.5 7" fill={LI.bone} stroke={LI.ink} stroke-width="0.9"/>
  <!-- head — rounded, broad at top -->
  <path d="M7 9 Q5.5 11 6 14 Q6 17 8 19 Q10 20.5 12 20.5 Q14 20.5 16 19 Q18 17 18 14 Q18.5 11 17 9 Q14.5 7.5 12 7.5 Q9.5 7.5 7 9 Z" fill={LI.earth} stroke={LI.ink} stroke-width="1.1"/>
  <!-- muzzle (lighter, lower face) -->
  <ellipse cx="12" cy="16.5" rx="3.5" ry="2.6" fill={LI.earthLight} stroke={LI.ink} stroke-width="0.7"/>
  <!-- nostrils -->
  <ellipse cx="10.5" cy="16.4" rx="0.55" ry="0.85" fill={LI.ink}/>
  <ellipse cx="13.5" cy="16.4" rx="0.55" ry="0.85" fill={LI.ink}/>
  <!-- eyes -->
  <ellipse cx="9.2" cy="12" rx="0.7" ry="0.9" fill={LI.ink}/>
  <ellipse cx="14.8" cy="12" rx="0.7" ry="0.9" fill={LI.ink}/>
  <!-- tuft of fur on forehead -->
  <path d="M11 8.4 Q12 7.6 13 8.4" fill="none" stroke={LI.ink} stroke-width="0.5" opacity="0.6"/>
</g>
