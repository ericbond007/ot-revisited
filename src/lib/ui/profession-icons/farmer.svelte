<script lang="ts">
  // Farmer — field of crops growing in tilled rows (low horizon, simple).
  // Ported verbatim from docs/handoff/profession-icons/src/icons-professions.jsx
  // (ProfessionIconFarmer). Path data is committed — don't optimize or redraw.
  import { LI } from './profession-icon-tokens';

  const row1 = [5, 9, 13, 17];
  const row2 = [7, 11, 15];
</script>

<g>
  <!-- sky -->
  <rect x="2" y="3" width="20" height="11" fill={LI.parchment} opacity="0.4"/>
  <!-- sun on horizon -->
  <circle cx="18" cy="10" r="2" fill={LI.goldFlag} stroke={LI.ink} stroke-width="0.5" opacity="0.85"/>
  <!-- horizon line / soil -->
  <path d="M2 14 L22 14 L22 21 L2 21 Z" fill={LI.earth} stroke={LI.ink} stroke-width="0.9"/>
  <!-- tilled furrow lines (perspective) -->
  <path d="M2 17 Q12 16.4 22 17" fill="none" stroke={LI.earthLight} stroke-width="0.5" opacity="0.7"/>
  <path d="M2 19 Q12 18.4 22 19" fill="none" stroke={LI.earthLight} stroke-width="0.5" opacity="0.7"/>
  <!-- crop sprouts in two rows -->
  {#each row1 as x, i}
    <g>
      <path d="M{x} 14 L{x} 11" stroke={LI.sageDark} stroke-width="0.7"/>
      <path d="M{x} 12.5 Q{x-1.4} 11.6 {x-1.4} 10.4" fill="none" stroke={LI.sage} stroke-width="0.7"/>
      <path d="M{x} 12.5 Q{x+1.4} 11.6 {x+1.4} 10.4" fill="none" stroke={LI.sage} stroke-width="0.7"/>
      <ellipse cx={x} cy="11" rx="0.5" ry="0.7" fill={LI.sage}/>
    </g>
  {/each}
  {#each row2 as x, i}
    <g>
      <path d="M{x} 17 L{x} 15" stroke={LI.sageDark} stroke-width="0.6"/>
      <path d="M{x} 16 Q{x-1} 15.4 {x-1} 14.6" fill="none" stroke={LI.sage} stroke-width="0.6"/>
      <path d="M{x} 16 Q{x+1} 15.4 {x+1} 14.6" fill="none" stroke={LI.sage} stroke-width="0.6"/>
    </g>
  {/each}
</g>
