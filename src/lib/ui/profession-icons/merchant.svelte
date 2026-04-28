<script lang="ts">
  // Merchant — stacked trade-good crates with rope-tied bundle on top.
  // Ported verbatim from docs/handoff/profession-icons/src/icons-professions.jsx
  // (ProfessionIconMerchant). Path data is committed — don't optimize or redraw.
  import { LI } from './profession-icon-tokens';
</script>

<g>
  <!-- bottom crate (large) -->
  <rect x="3" y="13" width="18" height="8" fill={LI.earth} stroke={LI.ink} stroke-width="1"/>
  <!-- plank lines -->
  <line x1="3" y1="15" x2="21" y2="15" stroke={LI.ink} stroke-width="0.4" opacity="0.5"/>
  <line x1="3" y1="19" x2="21" y2="19" stroke={LI.ink} stroke-width="0.4" opacity="0.5"/>
  <!-- X bracing -->
  <path d="M3 13 L21 21 M21 13 L3 21" stroke={LI.ink} stroke-width="0.5" opacity="0.4"/>
  <!-- nail heads -->
  <circle cx="4.2" cy="14.2" r="0.35" fill={LI.ink}/>
  <circle cx="19.8" cy="14.2" r="0.35" fill={LI.ink}/>
  <circle cx="4.2" cy="19.8" r="0.35" fill={LI.ink}/>
  <circle cx="19.8" cy="19.8" r="0.35" fill={LI.ink}/>
  <!-- top crate (smaller, sits on top-left) -->
  <rect x="4.5" y="7" width="9" height="6" fill={LI.brick} stroke={LI.ink} stroke-width="1"/>
  <line x1="4.5" y1="9" x2="13.5" y2="9" stroke={LI.ink} stroke-width="0.4" opacity="0.5"/>
  <line x1="4.5" y1="11" x2="13.5" y2="11" stroke={LI.ink} stroke-width="0.4" opacity="0.5"/>
  <!-- burlap-bundle (top-right) tied with rope -->
  <path d="M15 13 Q14 9 17 7 Q20 6.5 21 9 Q21.5 12 20 13 Z" fill={LI.bone} stroke={LI.ink} stroke-width="0.9"/>
  <path d="M15.5 9.5 Q18 8.6 20.5 9.5" fill="none" stroke={LI.ink} stroke-width="0.6"/>
  <path d="M15.5 11 Q18 10.2 20.5 11" fill="none" stroke={LI.ink} stroke-width="0.6"/>
  <path d="M17.5 7 L18.5 5.5 L19 7" fill="none" stroke={LI.ink} stroke-width="0.5"/>
</g>
