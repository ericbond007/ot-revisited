/* global React */
// ============================================================================
// PROFESSION ICONS — 13 icons matching ICON.professions in icon-dictionary.ts
// ============================================================================
// Same vocabulary as landmark icons: 24×24 viewBox, LI palette, optional
// HybridBadge wrap. Used at:
//   - 12px badge in PartyPanel avatar corner
//   - 24px in ProfessionPicker grid (replacing emoji)
//   - 32px in PartyMemberModal hero
//
// Each <ProfessionIcon* /> renders just the inner art — wrap in <Icon size>
// at the call site. To get a parchment badge, wrap further in <HybridBadge>.
// ============================================================================

// Banker — folded banknote behind a stack of coins
function ProfessionIconBanker() {
  return (
    <g>
      {/* banknote (back layer) */}
      <rect x="3" y="5" width="18" height="9" fill={LI.parchGold} stroke={LI.ink} strokeWidth="1"/>
      <rect x="4.5" y="6.5" width="15" height="6" fill="none" stroke={LI.ink} strokeWidth="0.4" opacity="0.55"/>
      <circle cx="7" cy="9.5" r="1.4" fill="none" stroke={LI.ink} strokeWidth="0.5" opacity="0.7"/>
      <text x="7" y="10.5" textAnchor="middle" fontFamily="serif" fontWeight="700" fontSize="2.4" fill={LI.ink}>$</text>
      <text x="17" y="10.5" textAnchor="middle" fontFamily="serif" fontWeight="700" fontSize="2.4" fill={LI.ink}>$</text>
      <line x1="10" y1="8.5" x2="14" y2="8.5" stroke={LI.ink} strokeWidth="0.35" opacity="0.5"/>
      <line x1="10" y1="10" x2="14" y2="10" stroke={LI.ink} strokeWidth="0.35" opacity="0.5"/>
      <line x1="10" y1="11.5" x2="14" y2="11.5" stroke={LI.ink} strokeWidth="0.35" opacity="0.5"/>
      {/* coin stack (front layer) */}
      <ellipse cx="12" cy="15" rx="5.5" ry="1.5" fill={LI.goldFlag} stroke={LI.ink} strokeWidth="0.9"/>
      <path d="M6.5 15 L6.5 17 Q6.5 18.4 12 18.4 Q17.5 18.4 17.5 17 L17.5 15" fill={LI.goldFlag} stroke={LI.ink} strokeWidth="0.9"/>
      <ellipse cx="12" cy="17" rx="5.5" ry="1.5" fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.6" opacity="0.6"/>
      <path d="M6.5 17 L6.5 19 Q6.5 20.4 12 20.4 Q17.5 20.4 17.5 19 L17.5 17" fill={LI.goldFlag} stroke={LI.ink} strokeWidth="0.9"/>
      <ellipse cx="12" cy="19" rx="5.5" ry="1.5" fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.6" opacity="0.55"/>
      <text x="12" y="19.9" textAnchor="middle" fontFamily="serif" fontWeight="700" fontSize="2.6" fill={LI.ink}>$</text>
    </g>
  );
}

// Doctor — classic medical cross on parchment shield
function ProfessionIconDoctor() {
  return (
    <g>
      {/* shield/plaque background */}
      <path d="M4 4 L20 4 L20 15 Q20 18.5 12 21 Q4 18.5 4 15 Z" fill={LI.bone} stroke={LI.ink} strokeWidth="1.1"/>
      <path d="M5.2 5.2 L18.8 5.2 L18.8 14.8 Q18.8 17.6 12 19.7 Q5.2 17.6 5.2 14.8 Z" fill="none" stroke={LI.ink} strokeWidth="0.4" opacity="0.5"/>
      {/* red cross */}
      <path d="M10 6.5 L14 6.5 L14 10.5 L18 10.5 L18 14 L14 14 L14 18 L10 18 L10 14 L6 14 L6 10.5 L10 10.5 Z" fill={LI.rust} stroke={LI.ink} strokeWidth="0.9"/>
    </g>
  );
}

// Farmer — field of crops growing in tilled rows (low horizon, simple)
function ProfessionIconFarmer() {
  return (
    <g>
      {/* sky */}
      <rect x="2" y="3" width="20" height="11" fill={LI.parchment} opacity="0.4"/>
      {/* sun on horizon */}
      <circle cx="18" cy="10" r="2" fill={LI.goldFlag} stroke={LI.ink} strokeWidth="0.5" opacity="0.85"/>
      {/* horizon line / soil */}
      <path d="M2 14 L22 14 L22 21 L2 21 Z" fill={LI.earth} stroke={LI.ink} strokeWidth="0.9"/>
      {/* tilled furrow lines (perspective) */}
      <path d="M2 17 Q12 16.4 22 17" fill="none" stroke={LI.earthLight} strokeWidth="0.5" opacity="0.7"/>
      <path d="M2 19 Q12 18.4 22 19" fill="none" stroke={LI.earthLight} strokeWidth="0.5" opacity="0.7"/>
      {/* crop sprouts in two rows */}
      {[5, 9, 13, 17].map((x, i) => (
        <g key={i}>
          <path d={`M${x} 14 L${x} 11`} stroke={LI.sageDark} strokeWidth="0.7"/>
          <path d={`M${x} 12.5 Q${x-1.4} 11.6 ${x-1.4} 10.4`} fill="none" stroke={LI.sage} strokeWidth="0.7"/>
          <path d={`M${x} 12.5 Q${x+1.4} 11.6 ${x+1.4} 10.4`} fill="none" stroke={LI.sage} strokeWidth="0.7"/>
          <ellipse cx={x} cy="11" rx="0.5" ry="0.7" fill={LI.sage}/>
        </g>
      ))}
      {[7, 11, 15].map((x, i) => (
        <g key={`b${i}`}>
          <path d={`M${x} 17 L${x} 15`} stroke={LI.sageDark} strokeWidth="0.6"/>
          <path d={`M${x} 16 Q${x-1} 15.4 ${x-1} 14.6`} fill="none" stroke={LI.sage} strokeWidth="0.6"/>
          <path d={`M${x} 16 Q${x+1} 15.4 ${x+1} 14.6`} fill="none" stroke={LI.sage} strokeWidth="0.6"/>
        </g>
      ))}
    </g>
  );
}

// Carpenter — claw hammer crossed with handsaw blade (or just a hammer for clarity)
function ProfessionIconCarpenter() {
  return (
    <g>
      <rect x="11" y="9" width="2" height="13" fill={LI.earth} stroke={LI.ink} strokeWidth="0.7"/>
      <path d="M6 5 L18 5 L17.5 9 Q17 10 15 10 L9 10 Q7 10 6.5 9 Z" fill={LI.inkSoft} stroke={LI.ink} strokeWidth="0.9"/>
      <path d="M9 5 Q12 3 15 5" fill="none" stroke={LI.ink} strokeWidth="0.6" opacity="0.5"/>
      <path d="M6 5 L7 7" stroke={LI.ink} strokeWidth="1.4" strokeLinecap="round"/>
    </g>
  );
}

// Blacksmith — classic anvil with hammer resting on top
function ProfessionIconBlacksmith() {
  return (
    <g>
      {/* anvil body — horn left, heel right, waisted stand */}
      {/* top deck */}
      <path d="M2 13 Q4 12 7 12 L18 12 L20 13.5 L20 14.6 L7 14.6 Q4 14.6 2 13.6 Z" fill={LI.inkSoft} stroke={LI.ink} strokeWidth="1"/>
      {/* horn (the pointed left tip) */}
      <path d="M2 13 Q0.6 13.4 0.4 14 Q0.6 14.4 2 14.2 Z" fill={LI.inkSoft} stroke={LI.ink} strokeWidth="0.7"/>
      {/* waisted stand */}
      <path d="M7 14.6 L17 14.6 L15.5 17 Q15 18 16 18 L17.5 18 L17.5 20 L6.5 20 L6.5 18 L8 18 Q9 18 8.5 17 Z" fill={LI.earth} stroke={LI.ink} strokeWidth="0.9"/>
      {/* base shadow */}
      <rect x="5" y="20" width="14" height="1.4" fill={LI.ink} opacity="0.6"/>
      {/* hammer resting across the deck (slightly angled) */}
      <g transform="rotate(-12 12 11)">
        {/* handle */}
        <rect x="4" y="10.4" width="11" height="1.2" fill={LI.brick} stroke={LI.ink} strokeWidth="0.6"/>
        {/* head */}
        <rect x="14" y="8.6" width="4.4" height="4.6" rx="0.4" fill={LI.inkSoft} stroke={LI.ink} strokeWidth="0.8"/>
        <rect x="14" y="8.6" width="4.4" height="1" fill={LI.bone} opacity="0.45"/>
      </g>
      {/* sparks above */}
      <circle cx="5" cy="7" r="0.6" fill={LI.rust}/>
      <circle cx="7.5" cy="5.5" r="0.4" fill={LI.rust} opacity="0.75"/>
      <circle cx="3.5" cy="9" r="0.35" fill={LI.rust} opacity="0.65"/>
    </g>
  );
}

// Hunter — long rifle crossed with hatchet
function ProfessionIconHunter() {
  return (
    <g>
      {/* bearded axe (rotated -45deg) — Norse/frontier wood axe with hooked beard */}
      <g transform="rotate(-45 12 12)">
        {/* handle / haft — slightly curved feel via two stacked rects */}
        <rect x="5" y="11.4" width="14" height="1.2" fill={LI.earth} stroke={LI.ink} strokeWidth="0.6"/>
        <line x1="6" y1="11.7" x2="18" y2="11.7" stroke={LI.ink} strokeWidth="0.25" opacity="0.5"/>
        {/* butt cap on grip end */}
        <rect x="18.6" y="11.2" width="0.6" height="1.6" fill={LI.brick} stroke={LI.ink} strokeWidth="0.4"/>
        {/* bearded axe head — flat top edge, big curved beard hooking down + back below the haft */}
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
        " fill={LI.inkSoft} stroke={LI.ink} strokeWidth="0.8"/>
        {/* eye / wedge — where the haft passes through */}
        <ellipse cx="5.6" cy="11.4" rx="0.55" ry="0.9" fill={LI.ink}/>
        {/* polished bevel highlight along cutting edge */}
        <path d="M3 11.4 Q1.4 12.6 1 14.6 Q1.4 16 3 16.4" fill="none" stroke={LI.bone} strokeWidth="0.4" opacity="0.55"/>
        {/* poll (back of head, above haft) */}
        <rect x="5.4" y="10.4" width="1.4" height="2.4" fill={LI.inkSoft} stroke={LI.ink} strokeWidth="0.6"/>
      </g>
      {/* rifle (rotated +45deg through center, drawn longer) */}
      <g transform="rotate(45 12 12)">
        {/* barrel */}
        <rect x="4" y="11.6" width="14" height="0.9" fill={LI.ink}/>
        {/* stock */}
        <path d="M18 11.2 L21 11.2 L21.5 13.6 Q21.5 14.2 20.5 14.2 L18 14 Z" fill={LI.brick} stroke={LI.ink} strokeWidth="0.6"/>
        {/* lock plate / hammer */}
        <rect x="15.5" y="12.5" width="2.4" height="1.4" fill={LI.earth} stroke={LI.ink} strokeWidth="0.4"/>
        <path d="M16.6 12.5 L17 11.6" stroke={LI.ink} strokeWidth="0.6"/>
        {/* trigger guard */}
        <path d="M14.6 12.5 Q14.6 13.6 15.6 13.6" fill="none" stroke={LI.ink} strokeWidth="0.5"/>
        {/* muzzle bead */}
        <circle cx="4.2" cy="12" r="0.4" fill={LI.ink}/>
      </g>
    </g>
  );
}

// Teamster — ox head, front view (horns + muzzle)
function ProfessionIconTeamster() {
  return (
    <g>
      {/* horns — long, curved outward */}
      <path d="M7 8 Q4 7 2.5 4.5 Q2 3.5 3 3.5 Q4 3.5 5 5 Q6 6.5 7.5 7" fill={LI.bone} stroke={LI.ink} strokeWidth="0.9"/>
      <path d="M17 8 Q20 7 21.5 4.5 Q22 3.5 21 3.5 Q20 3.5 19 5 Q18 6.5 16.5 7" fill={LI.bone} stroke={LI.ink} strokeWidth="0.9"/>
      {/* head — rounded, broad at top */}
      <path d="M7 9 Q5.5 11 6 14 Q6 17 8 19 Q10 20.5 12 20.5 Q14 20.5 16 19 Q18 17 18 14 Q18.5 11 17 9 Q14.5 7.5 12 7.5 Q9.5 7.5 7 9 Z" fill={LI.earth} stroke={LI.ink} strokeWidth="1.1"/>
      {/* muzzle (lighter, lower face) */}
      <ellipse cx="12" cy="16.5" rx="3.5" ry="2.6" fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.7"/>
      {/* nostrils */}
      <ellipse cx="10.5" cy="16.4" rx="0.55" ry="0.85" fill={LI.ink}/>
      <ellipse cx="13.5" cy="16.4" rx="0.55" ry="0.85" fill={LI.ink}/>
      {/* eyes */}
      <ellipse cx="9.2" cy="12" rx="0.7" ry="0.9" fill={LI.ink}/>
      <ellipse cx="14.8" cy="12" rx="0.7" ry="0.9" fill={LI.ink}/>
      {/* tuft of fur on forehead */}
      <path d="M11 8.4 Q12 7.6 13 8.4" fill="none" stroke={LI.ink} strokeWidth="0.5" opacity="0.6"/>
    </g>
  );
}

// Merchant — stacked trade-good crates with rope-tied bundle on top
function ProfessionIconMerchant() {
  return (
    <g>
      {/* bottom crate (large) */}
      <rect x="3" y="13" width="18" height="8" fill={LI.earth} stroke={LI.ink} strokeWidth="1"/>
      {/* plank lines */}
      <line x1="3" y1="15" x2="21" y2="15" stroke={LI.ink} strokeWidth="0.4" opacity="0.5"/>
      <line x1="3" y1="19" x2="21" y2="19" stroke={LI.ink} strokeWidth="0.4" opacity="0.5"/>
      {/* X bracing */}
      <path d="M3 13 L21 21 M21 13 L3 21" stroke={LI.ink} strokeWidth="0.5" opacity="0.4"/>
      {/* nail heads */}
      <circle cx="4.2" cy="14.2" r="0.35" fill={LI.ink}/>
      <circle cx="19.8" cy="14.2" r="0.35" fill={LI.ink}/>
      <circle cx="4.2" cy="19.8" r="0.35" fill={LI.ink}/>
      <circle cx="19.8" cy="19.8" r="0.35" fill={LI.ink}/>
      {/* top crate (smaller, sits on top-left) */}
      <rect x="4.5" y="7" width="9" height="6" fill={LI.brick} stroke={LI.ink} strokeWidth="1"/>
      <line x1="4.5" y1="9" x2="13.5" y2="9" stroke={LI.ink} strokeWidth="0.4" opacity="0.5"/>
      <line x1="4.5" y1="11" x2="13.5" y2="11" stroke={LI.ink} strokeWidth="0.4" opacity="0.5"/>
      {/* burlap-bundle (top-right) tied with rope */}
      <path d="M15 13 Q14 9 17 7 Q20 6.5 21 9 Q21.5 12 20 13 Z" fill={LI.bone} stroke={LI.ink} strokeWidth="0.9"/>
      <path d="M15.5 9.5 Q18 8.6 20.5 9.5" fill="none" stroke={LI.ink} strokeWidth="0.6"/>
      <path d="M15.5 11 Q18 10.2 20.5 11" fill="none" stroke={LI.ink} strokeWidth="0.6"/>
      <path d="M17.5 7 L18.5 5.5 L19 7" fill="none" stroke={LI.ink} strokeWidth="0.5"/>
    </g>
  );
}

// Scout — compass rose / star
function ProfessionIconScout() {
  return (
    <g>
      <circle cx="12" cy="12" r="8.5" fill={LI.parchment} stroke={LI.ink} strokeWidth="1"/>
      <circle cx="12" cy="12" r="7.2" fill="none" stroke={LI.ink} strokeWidth="0.4" opacity="0.5"/>
      <path d="M12 4 L13.5 12 L12 20 L10.5 12 Z" fill={LI.rust} stroke={LI.ink} strokeWidth="0.7"/>
      <path d="M4 12 L12 13.2 L20 12 L12 10.8 Z" fill={LI.bone} stroke={LI.ink} strokeWidth="0.7"/>
      <text x="12" y="6.5" textAnchor="middle" fontFamily="serif" fontSize="2.2" fontWeight="700" fill={LI.ink}>N</text>
      <circle cx="12" cy="12" r="0.9" fill={LI.ink}/>
    </g>
  );
}

// Preacher — open Bible
function ProfessionIconPreacher() {
  return (
    <g>
      <path d="M12 6 L12 20" stroke={LI.ink} strokeWidth="0.6"/>
      <path d="M3 6 Q7 4.5 12 6 L12 20 Q7 18.5 3 20 Z" fill={LI.bone} stroke={LI.ink} strokeWidth="1"/>
      <path d="M21 6 Q17 4.5 12 6 L12 20 Q17 18.5 21 20 Z" fill={LI.bone} stroke={LI.ink} strokeWidth="1"/>
      <line x1="5" y1="9" x2="10" y2="8.4" stroke={LI.ink} strokeWidth="0.4"/>
      <line x1="5" y1="11" x2="10" y2="10.5" stroke={LI.ink} strokeWidth="0.4"/>
      <line x1="5" y1="13" x2="10" y2="12.6" stroke={LI.ink} strokeWidth="0.4"/>
      <line x1="14" y1="8.4" x2="19" y2="9" stroke={LI.ink} strokeWidth="0.4"/>
      <line x1="14" y1="10.5" x2="19" y2="11" stroke={LI.ink} strokeWidth="0.4"/>
      <line x1="14" y1="12.6" x2="19" y2="13" stroke={LI.ink} strokeWidth="0.4"/>
      <path d="M12 9 L12 13 M10.6 11 L13.4 11" stroke={LI.rust} strokeWidth="0.7"/>
    </g>
  );
}

// Indian Trader — single eagle feather (clean, banded tip)
function ProfessionIconIndianTrader() {
  return (
    <g transform="rotate(15 12 12)">
      {/* central rachis (quill shaft) */}
      <path d="M12 22 L12 4" stroke={LI.ink} strokeWidth="0.9" strokeLinecap="round"/>
      {/* hollow quill base */}
      <path d="M12 22 L12 19.5" stroke={LI.bone} strokeWidth="1.5" strokeLinecap="round"/>
      {/* feather body — eagle shape, dark tip / light base */}
      {/* light lower vanes */}
      <path d="M12 19 Q9 18 8 16 Q8 14 9.5 13.5 Q11 13.4 12 14 Z" fill={LI.bone} stroke={LI.ink} strokeWidth="0.7"/>
      <path d="M12 19 Q15 18 16 16 Q16 14 14.5 13.5 Q13 13.4 12 14 Z" fill={LI.bone} stroke={LI.ink} strokeWidth="0.7"/>
      {/* mid band — earth */}
      <path d="M12 14 Q9.5 13.6 8.4 12 Q8.4 10 10 9.5 Q11.2 9.4 12 10 Z" fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.7"/>
      <path d="M12 14 Q14.5 13.6 15.6 12 Q15.6 10 14 9.5 Q12.8 9.4 12 10 Z" fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.7"/>
      {/* dark tip — eagle-feather signature */}
      <path d="M12 10 Q9.8 9.4 9 7.5 Q9.4 5.5 11 4.6 Q12 4 12 4.4 Z" fill={LI.inkSoft} stroke={LI.ink} strokeWidth="0.7"/>
      <path d="M12 10 Q14.2 9.4 15 7.5 Q14.6 5.5 13 4.6 Q12 4 12 4.4 Z" fill={LI.inkSoft} stroke={LI.ink} strokeWidth="0.7"/>
      {/* barb texture (subtle hairlines) */}
      {[6.5, 8.5, 10.5, 12.5, 14.5, 16.5].map((y, i) => (
        <g key={i} opacity="0.5">
          <line x1="12" y1={y} x2={11 - (i % 2 ? 0.5 : 1)} y2={y - 0.4} stroke={LI.ink} strokeWidth="0.3"/>
          <line x1="12" y1={y} x2={13 + (i % 2 ? 0.5 : 1)} y2={y - 0.4} stroke={LI.ink} strokeWidth="0.3"/>
        </g>
      ))}
      {/* sinew binding at base — single red wrap */}
      <rect x="10.4" y="19.4" width="3.2" height="1.4" fill={LI.rust} stroke={LI.ink} strokeWidth="0.5"/>
      <line x1="11.2" y1="19.4" x2="11.2" y2="20.8" stroke={LI.bone} strokeWidth="0.25"/>
      <line x1="12.8" y1="19.4" x2="12.8" y2="20.8" stroke={LI.bone} strokeWidth="0.25"/>
    </g>
  );
}

// Gunsmith — readable flintlock pistol, side profile
function ProfessionIconGunsmith() {
  return (
    <g>
      {/* long barrel */}
      <rect x="2" y="9" width="15" height="1.6" fill={LI.ink}/>
      <rect x="2" y="9" width="15" height="0.5" fill={LI.bone} opacity="0.5"/>
      {/* muzzle ring */}
      <rect x="2" y="8.6" width="0.8" height="2.4" fill={LI.ink}/>
      {/* lock plate (the metal part behind barrel) */}
      <path d="M11 10.6 L17 10.6 L17 13.4 L11 13.4 Z" fill={LI.earth} stroke={LI.ink} strokeWidth="0.7"/>
      {/* hammer (cocked back) */}
      <path d="M14 10.6 L14.5 8 Q14.7 7.4 15.3 7.5 Q15.8 7.7 15.6 8.3 L15 10.6 Z" fill={LI.ink}/>
      {/* frizzen / pan (small) */}
      <rect x="12.5" y="9.4" width="1.4" height="1.2" fill={LI.inkSoft} stroke={LI.ink} strokeWidth="0.4"/>
      {/* trigger */}
      <path d="M14.2 13.4 Q14.2 14.6 13.4 14.8" fill="none" stroke={LI.ink} strokeWidth="0.7"/>
      {/* trigger guard */}
      <path d="M13 13.4 Q13 15.4 15.2 15.4" fill="none" stroke={LI.ink} strokeWidth="0.7"/>
      {/* curved walnut grip */}
      <path d="M15 13.4 Q19 14.4 20.5 18 Q21 19.6 19.6 20.4 Q18 20.6 17 19.5 Q15.5 17 14.4 14.4 Z" fill={LI.brick} stroke={LI.ink} strokeWidth="0.9"/>
      {/* grip cap / butt plate */}
      <path d="M19.6 20.4 L20.5 18" stroke={LI.ink} strokeWidth="0.4"/>
      {/* wood grain on grip */}
      <path d="M16 16 Q18 17 19.4 19" fill="none" stroke={LI.ink} strokeWidth="0.3" opacity="0.5"/>
    </g>
  );
}

// Whore — red garter ribbon with bow & lace trim (period, evocative, not crude)
function ProfessionIconWhore() {
  return (
    <g>
      {/* lace top edge (zigzag) */}
      <path d="M2 8 L4 9 L6 8 L8 9 L10 8 L12 9 L14 8 L16 9 L18 8 L20 9 L22 8" fill="none" stroke={LI.bone} strokeWidth="0.7"/>
      {/* main ribbon band */}
      <path d="M2 9 L22 9 L22 15 L2 15 Z" fill={LI.rust} stroke={LI.ink} strokeWidth="1"/>
      {/* satin highlight stripe */}
      <path d="M2 10.4 L22 10.4" stroke={LI.bone} strokeWidth="0.5" opacity="0.55"/>
      {/* lace bottom edge (zigzag) */}
      <path d="M2 15 L4 16 L6 15 L8 16 L10 15 L12 16 L14 15 L16 16 L18 15 L20 16 L22 15" fill="none" stroke={LI.bone} strokeWidth="0.7"/>
      {/* bow knot at center */}
      <rect x="10.6" y="10.4" width="2.8" height="3.2" fill={LI.rustDark} stroke={LI.ink} strokeWidth="0.7"/>
      {/* left bow loop */}
      <path d="M10.6 12 Q7 10 6 12 Q7 14 10.6 12 Z" fill={LI.rust} stroke={LI.ink} strokeWidth="0.8"/>
      <path d="M8 11.2 Q7.6 12 8 12.8" fill="none" stroke={LI.rustDark} strokeWidth="0.4"/>
      {/* right bow loop */}
      <path d="M13.4 12 Q17 10 18 12 Q17 14 13.4 12 Z" fill={LI.rust} stroke={LI.ink} strokeWidth="0.8"/>
      <path d="M16 11.2 Q16.4 12 16 12.8" fill="none" stroke={LI.rustDark} strokeWidth="0.4"/>
      {/* dangling ribbon tails */}
      <path d="M11 13.4 L9 18 L10.5 17.5 L10 19 L11.6 18 Z" fill={LI.rust} stroke={LI.ink} strokeWidth="0.7"/>
      <path d="M13 13.4 L15 18 L13.5 17.5 L14 19 L12.4 18 Z" fill={LI.rust} stroke={LI.ink} strokeWidth="0.7"/>
      {/* tiny seductive heart on knot */}
      <path d="M12 11.6 Q11.4 11 11.4 11.6 Q11.4 12.2 12 12.6 Q12.6 12.2 12.6 11.6 Q12.6 11 12 11.6 Z" fill={LI.bone} stroke={LI.ink} strokeWidth="0.3"/>
    </g>
  );
}

// ── Dispatcher ─────────────────────────────────────────────────────────────
const PROFESSION_ICONS = {
  banker:        ProfessionIconBanker,
  doctor:        ProfessionIconDoctor,
  farmer:        ProfessionIconFarmer,
  carpenter:     ProfessionIconCarpenter,
  blacksmith:    ProfessionIconBlacksmith,
  hunter:        ProfessionIconHunter,
  teamster:      ProfessionIconTeamster,
  merchant:      ProfessionIconMerchant,
  scout:         ProfessionIconScout,
  preacher:      ProfessionIconPreacher,
  indian_trader: ProfessionIconIndianTrader,
  gunsmith:      ProfessionIconGunsmith,
  whore:         ProfessionIconWhore,
};

// Wrapper: <ProfessionIcon id="banker" size={24} badge="warm" />
function ProfessionIcon({ id, size = 24, badge = null }) {
  const Comp = PROFESSION_ICONS[id];
  if (!Comp) return null;
  const inner = <Comp />;
  return (
    <Icon size={size}>
      {badge ? <HybridBadge tone={badge} id={`pi-${id}`}>{inner}</HybridBadge> : inner}
    </Icon>
  );
}

Object.assign(window, {
  PROFESSION_ICONS,
  ProfessionIcon,
  ProfessionIconBanker, ProfessionIconDoctor, ProfessionIconFarmer,
  ProfessionIconCarpenter, ProfessionIconBlacksmith, ProfessionIconHunter,
  ProfessionIconTeamster, ProfessionIconMerchant, ProfessionIconScout,
  ProfessionIconPreacher, ProfessionIconIndianTrader, ProfessionIconGunsmith,
  ProfessionIconWhore,
});
