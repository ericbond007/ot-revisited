<script lang="ts">
  // Gunsmith — readable flintlock pistol, side profile.
  // Ported verbatim from docs/handoff/profession-icons/src/icons-professions.jsx
  // (ProfessionIconGunsmith). Path data is committed — don't optimize or redraw.
  import { LI } from './profession-icon-tokens';
</script>

<g>
  <!-- long barrel -->
  <rect x="2" y="9" width="15" height="1.6" fill={LI.ink}/>
  <rect x="2" y="9" width="15" height="0.5" fill={LI.bone} opacity="0.5"/>
  <!-- muzzle ring -->
  <rect x="2" y="8.6" width="0.8" height="2.4" fill={LI.ink}/>
  <!-- lock plate (the metal part behind barrel) -->
  <path d="M11 10.6 L17 10.6 L17 13.4 L11 13.4 Z" fill={LI.earth} stroke={LI.ink} stroke-width="0.7"/>
  <!-- hammer (cocked back) -->
  <path d="M14 10.6 L14.5 8 Q14.7 7.4 15.3 7.5 Q15.8 7.7 15.6 8.3 L15 10.6 Z" fill={LI.ink}/>
  <!-- frizzen / pan (small) -->
  <rect x="12.5" y="9.4" width="1.4" height="1.2" fill={LI.inkSoft} stroke={LI.ink} stroke-width="0.4"/>
  <!-- trigger -->
  <path d="M14.2 13.4 Q14.2 14.6 13.4 14.8" fill="none" stroke={LI.ink} stroke-width="0.7"/>
  <!-- trigger guard -->
  <path d="M13 13.4 Q13 15.4 15.2 15.4" fill="none" stroke={LI.ink} stroke-width="0.7"/>
  <!-- curved walnut grip -->
  <path d="M15 13.4 Q19 14.4 20.5 18 Q21 19.6 19.6 20.4 Q18 20.6 17 19.5 Q15.5 17 14.4 14.4 Z" fill={LI.brick} stroke={LI.ink} stroke-width="0.9"/>
  <!-- grip cap / butt plate -->
  <path d="M19.6 20.4 L20.5 18" stroke={LI.ink} stroke-width="0.4"/>
  <!-- wood grain on grip -->
  <path d="M16 16 Q18 17 19.4 19" fill="none" stroke={LI.ink} stroke-width="0.3" opacity="0.5"/>
</g>
