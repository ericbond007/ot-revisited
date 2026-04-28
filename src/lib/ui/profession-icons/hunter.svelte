<script lang="ts">
  // Hunter — crossed bearded axe + flintlock rifle. Worked-port
  // template for "nested-transform composition." The two `<g>` wrappers
  // are load-bearing — they hold the rotation transforms for axe (-45)
  // and rifle (+45). Ported verbatim from
  // docs/handoff/profession-icons/src/icons-professions.jsx
  // (ProfessionIconHunter). Path data is committed — don't optimize.
  import { LI } from './profession-icon-tokens';
</script>

<g>
<!-- bearded axe (rotated -45deg) — Norse/frontier wood axe with hooked beard -->
<g transform="rotate(-45 12 12)">
  <!-- handle / haft — slightly curved feel via two stacked rects -->
  <rect x="5" y="11.4" width="14" height="1.2" fill={LI.earth} stroke={LI.ink} stroke-width="0.6"/>
  <line x1="6" y1="11.7" x2="18" y2="11.7" stroke={LI.ink} stroke-width="0.25" opacity="0.5"/>
  <!-- butt cap on grip end -->
  <rect x="18.6" y="11.2" width="0.6" height="1.6" fill={LI.brick} stroke={LI.ink} stroke-width="0.4"/>
  <!-- bearded axe head — flat top edge, big curved beard hooking down + back below the haft -->
  <path d="
    M6.4 10.4
    L4.8 10.4
    Q3.4 10.4 3 11.4
    L2.6 12
    L4.8 12
    L4.8 12.6
    L4.8 14.6
    Q4.8 16.4 3.6 16.6
    Q1.6 16.6 1 14.6
    Q0.6 12.6 1.4 11.4
    Q1.6 10 3.4 9.4
    L6.4 9.4
    Z
  " fill={LI.inkSoft} stroke={LI.ink} stroke-width="0.8"/>
  <!-- eye / wedge — where the haft passes through -->
  <ellipse cx="5.6" cy="11.4" rx="0.55" ry="0.9" fill={LI.ink}/>
  <!-- polished bevel highlight along cutting edge -->
  <path d="M3 11.4 Q1.4 12.6 1 14.6 Q1.4 16 3 16.4" fill="none" stroke={LI.bone} stroke-width="0.4" opacity="0.55"/>
  <!-- poll (back of head, above haft) -->
  <rect x="5.4" y="10.4" width="1.4" height="2.4" fill={LI.inkSoft} stroke={LI.ink} stroke-width="0.6"/>
</g>
<!-- rifle (rotated +45deg through center, drawn longer) -->
<g transform="rotate(45 12 12)">
  <!-- barrel -->
  <rect x="4" y="11.6" width="14" height="0.9" fill={LI.ink}/>
  <!-- stock -->
  <path d="M18 11.2 L21 11.2 L21.5 13.6 Q21.5 14.2 20.5 14.2 L18 14 Z" fill={LI.brick} stroke={LI.ink} stroke-width="0.6"/>
  <!-- lock plate / hammer -->
  <rect x="15.5" y="12.5" width="2.4" height="1.4" fill={LI.earth} stroke={LI.ink} stroke-width="0.4"/>
  <path d="M16.6 12.5 L17 11.6" stroke={LI.ink} stroke-width="0.6"/>
  <!-- trigger guard -->
  <path d="M14.6 12.5 Q14.6 13.6 15.6 13.6" fill="none" stroke={LI.ink} stroke-width="0.5"/>
  <!-- muzzle bead -->
  <circle cx="4.2" cy="12" r="0.4" fill={LI.ink}/>
</g>
</g>
