// fort-kearny-art.jsx
// Fort Kearny on the Platte (1849 era).
// Distinguishing visual facts (research):
//   • NO walls, NO palisade — open Army post on a flat plain
//   • cluster of low sod and adobe buildings around a 4-acre parade ground
//   • a tall flagpole at the center flying the U.S. flag
//   • cottonwood trees ringing the perimeter (planted as windbreak)
//   • parade ground wide and DRY — bare earth, no grass
//   • blockhouse cannons + field pieces lined between the cottonwoods
//   • the Platte Valley horizon: low, hazy, with the ribbon of river
//   • emigrant ox-trains streaming past on the trail outside the post
//
// Composition (480×200 viewBox):
//   • far horizon ~ y=110 — Platte River + faint bluffs across
//   • parade ground centered, flagpole as the vertical anchor (~ x=240)
//   • two flanking sod buildings (left longer, right shorter — asymmetric)
//   • foreground trail cuts diagonally bottom-left to mid-right with an
//     ox team & wagon walking past
//   • cottonwoods clustered behind buildings (3 left, 2 right)
//
// Style: pen-and-wash period engraving — black ink linework, thin warm
// washes, lots of paper showing through. Sun is high & to the west (right
// side), so shadows fall toward viewer-left.

function FortKearnyArt() {
  const F = "fk";
  const ink = LMK.ink;
  const wood = LMK.earth;
  const sod = "#9a7a4a";
  const sodSh = "#6a4f2a";
  const adobe = "#c9a472";
  const adobeSh = "#9a7a4a";

  // ── parade ground baseline ──
  const groundY = 142;        // where the post sits
  const horizonY = 108;       // distant river / bluff line
  const trailY = 168;         // foreground trail

  return (
    <g>
      {/* ── distant Platte Valley: faint bluffs across the river ── */}
      <g opacity="0.55">
        <path
          d={`M 0 ${horizonY} 
              C 60 ${horizonY - 4}, 110 ${horizonY - 6}, 160 ${horizonY - 3}
              C 220 ${horizonY - 7}, 280 ${horizonY - 4}, 340 ${horizonY - 8}
              C 400 ${horizonY - 5}, 450 ${horizonY - 2}, ${LMK_VIEW_W} ${horizonY - 4}
              L ${LMK_VIEW_W} ${horizonY + 2} L 0 ${horizonY + 2} Z`}
          fill="#b8b08a"
        />
        <path
          d={`M 0 ${horizonY + 1} L ${LMK_VIEW_W} ${horizonY + 1}`}
          stroke={ink} strokeWidth="0.4" opacity="0.5"
        />
      </g>

      {/* ── Platte River — flat, glassy ribbon ── */}
      <g opacity="0.7">
        <rect x="0" y={horizonY + 2} width={LMK_VIEW_W} height="6" fill={LMK.water} opacity="0.55" />
        {/* sandbar streaks (Platte was famously braided/sandy) */}
        <path d={`M 30 ${horizonY + 4} L 80 ${horizonY + 4}`} stroke="#d8c898" strokeWidth="1" />
        <path d={`M 140 ${horizonY + 5} L 200 ${horizonY + 5}`} stroke="#d8c898" strokeWidth="1" />
        <path d={`M 280 ${horizonY + 4} L 340 ${horizonY + 4}`} stroke="#d8c898" strokeWidth="1" />
        <path d={`M 380 ${horizonY + 5} L 460 ${horizonY + 5}`} stroke="#d8c898" strokeWidth="0.8" />
      </g>

      {/* ── cottonwood treeline ringing the post ── */}
      <g>
        {/* left cluster behind sod barracks */}
        <Cottonwood cx={70}  cy={groundY - 2} h={28} w={20} ink={ink} />
        <Cottonwood cx={92}  cy={groundY - 2} h={32} w={22} ink={ink} />
        <Cottonwood cx={118} cy={groundY - 2} h={26} w={18} ink={ink} />
        {/* right cluster */}
        <Cottonwood cx={362} cy={groundY - 2} h={24} w={18} ink={ink} />
        <Cottonwood cx={388} cy={groundY - 2} h={30} w={22} ink={ink} />
        <Cottonwood cx={414} cy={groundY - 2} h={26} w={20} ink={ink} />
      </g>

      {/* ── sod barracks: long low building, left of center ── */}
      <g>
        {/* main wall */}
        <path
          d="M 130 142 L 130 124 L 220 122 L 220 142 Z"
          fill={sod} stroke={ink} strokeWidth="0.7"
        />
        {/* sod-block courses — horizontal stripes */}
        <g stroke={sodSh} strokeWidth="0.4" opacity="0.7">
          <line x1="130" y1="129" x2="220" y2="129" />
          <line x1="130" y1="134" x2="220" y2="134" />
          <line x1="130" y1="139" x2="220" y2="139" />
        </g>
        {/* shadow side (left) */}
        <path d="M 130 142 L 130 124 L 138 124 L 138 142 Z" fill={sodSh} opacity="0.6" />
        {/* low pitched sod roof */}
        <path
          d="M 128 124 L 175 116 L 222 122 L 220 124 L 175 118 L 130 125 Z"
          fill={sodSh} stroke={ink} strokeWidth="0.6"
        />
        {/* a couple grass tufts on the roof (real sod roofs grew grass) */}
        <path d="M 145 119 q 1 -2 2 0 M 165 117 q 1 -2 2 0 M 185 118 q 1 -2 2 0 M 205 120 q 1 -2 2 0"
              stroke={LMK.sageDark} strokeWidth="0.6" fill="none" />
        {/* door + 2 windows */}
        <rect x="171" y="132" width="8" height="10" fill={ink} />
        <rect x="148" y="132" width="6" height="6" fill={LMK.inkSoft} stroke={ink} strokeWidth="0.4" />
        <rect x="195" y="132" width="6" height="6" fill={LMK.inkSoft} stroke={ink} strokeWidth="0.4" />
        {/* stovepipe smoke */}
        <line x1="200" y1="116" x2="200" y2="110" stroke={ink} strokeWidth="0.6" />
        <path d="M 198 110 q -2 -4 1 -7 q 4 -2 1 -6"
              stroke={ink} strokeWidth="0.5" fill="none" opacity="0.55" />
      </g>

      {/* ── adobe HQ (officers' quarters): smaller, right of center, frame trim ── */}
      <g>
        <path d="M 270 142 L 270 126 L 320 124 L 320 142 Z"
              fill={adobe} stroke={ink} strokeWidth="0.7" />
        <path d="M 270 142 L 270 126 L 277 126 L 277 142 Z" fill={adobeSh} opacity="0.55" />
        {/* low gabled roof */}
        <path d="M 268 126 L 295 116 L 322 124 L 320 126 L 295 118 L 270 127 Z"
              fill={adobeSh} stroke={ink} strokeWidth="0.6" />
        {/* central door */}
        <rect x="291" y="132" width="7" height="10" fill={ink} />
        {/* shuttered windows */}
        <rect x="277" y="131" width="6" height="6" fill={LMK.inkSoft} stroke={ink} strokeWidth="0.4" />
        <rect x="307" y="131" width="6" height="6" fill={LMK.inkSoft} stroke={ink} strokeWidth="0.4" />
        {/* small porch shade */}
        <line x1="288" y1="132" x2="301" y2="132" stroke={ink} strokeWidth="0.4" />
      </g>

      {/* ── flagpole + U.S. flag — center anchor ── */}
      <g>
        <line x1="245" y1="142" x2="245" y2="80" stroke={ink} strokeWidth="0.9" />
        <circle cx="245" cy="80" r="1.2" fill={ink} />
        {/* flag — small, periodish — 13 stripes simplified */}
        <path d="M 245 81 L 268 84 L 268 95 L 245 97 Z" fill={LMK.redFlag} stroke={ink} strokeWidth="0.4" />
        {/* canton */}
        <rect x="245" y="81" width="9" height="7" fill="#3a4a7a" />
        {/* stripe lines */}
        <g stroke="#f0e6c8" strokeWidth="0.6" opacity="0.85">
          <line x1="254" y1="85" x2="268" y2="85.5" />
          <line x1="245" y1="89" x2="268" y2="89.5" />
          <line x1="245" y1="93" x2="268" y2="93.5" />
        </g>
        {/* flag shadow on parade ground */}
        <ellipse cx="240" cy="142.5" rx="6" ry="1" fill={ink} opacity="0.18" />
      </g>

      {/* ── cannon between the cottonwoods (right of HQ) ── */}
      <g transform="translate(340 138)">
        {/* carriage */}
        <rect x="-5" y="-2" width="10" height="3" fill={LMK.earthDark} stroke={ink} strokeWidth="0.4" />
        {/* wheel */}
        <circle cx="-3" cy="2" r="2.4" fill="none" stroke={ink} strokeWidth="0.5" />
        <circle cx="3" cy="2" r="2.4" fill="none" stroke={ink} strokeWidth="0.5" />
        {/* barrel */}
        <rect x="-2" y="-5" width="11" height="2.2" fill={ink} />
        <circle cx="9" cy="-3.9" r="1" fill={LMK.earthDark} />
      </g>

      {/* ── two soldiers drilling on parade ground ── */}
      <g>
        <Soldier x={210} y={150} ink={ink} />
        <Soldier x={228} y={150} ink={ink} />
        <Soldier x={246} y={150} ink={ink} />
      </g>

      {/* ── parade ground baseline — the bare earth ── */}
      <g>
        <rect x="0" y={groundY} width={LMK_VIEW_W} height={LMK_VIEW_H - groundY} fill="#c9a06a" opacity="0.35" />
        {/* hatched shadow under buildings */}
        <rect x="130" y={groundY} width="92" height="3" fill={`url(#${F}-hatch)`} opacity="0.35" />
        <rect x="270" y={groundY} width="50" height="3" fill={`url(#${F}-hatch)`} opacity="0.35" />
      </g>

      {/* ── foreground: emigrant ox-train passing on the trail ── */}
      <g transform="translate(50 168)">
        <OxTrainSilhouette ink={ink} />
      </g>

      {/* ── faint wagon ruts in foreground earth ── */}
      <g stroke={ink} strokeWidth="0.5" fill="none" opacity="0.35">
        <path d="M 0 178 C 80 174, 180 178, 280 174 C 360 172, 440 176, 480 174" />
        <path d="M 0 184 C 80 180, 180 184, 280 180 C 360 178, 440 182, 480 180" />
      </g>

      {/* ── small inscribed label, lower-right corner — engraving caption feel ── */}
      <g transform="translate(388 192)">
        <text x="0" y="0" fontFamily="'IM Fell English', Georgia, serif"
              fontSize="7" fill={ink} opacity="0.55"
              fontStyle="italic" textAnchor="end">
          Fort Kearny on the Platte
        </text>
      </g>
    </g>
  );
}

// ── Cottonwood: tall trunk, billowy round canopy. Loose period style. ──
function Cottonwood({ cx, cy, h = 28, w = 20, ink }) {
  const trunkH = h * 0.45;
  const canopyR = w / 2;
  return (
    <g>
      {/* trunk */}
      <path
        d={`M ${cx - 1.2} ${cy} L ${cx - 1} ${cy - trunkH} L ${cx + 1} ${cy - trunkH} L ${cx + 1.2} ${cy} Z`}
        fill={LMK.earthDark} stroke={ink} strokeWidth="0.4"
      />
      {/* canopy — three overlapping puffs for irregular outline */}
      <g>
        <ellipse cx={cx - canopyR * 0.45} cy={cy - trunkH - canopyR * 0.4}
                 rx={canopyR * 0.7} ry={canopyR * 0.55} fill={LMK.sageDark} />
        <ellipse cx={cx + canopyR * 0.4} cy={cy - trunkH - canopyR * 0.5}
                 rx={canopyR * 0.65} ry={canopyR * 0.55} fill={LMK.sage} />
        <ellipse cx={cx} cy={cy - trunkH - canopyR * 0.85}
                 rx={canopyR * 0.6} ry={canopyR * 0.5} fill={LMK.sageLight} opacity="0.85" />
        {/* outline */}
        <ellipse cx={cx} cy={cy - trunkH - canopyR * 0.55}
                 rx={canopyR * 0.95} ry={canopyR * 0.7}
                 fill="none" stroke={ink} strokeWidth="0.45" opacity="0.6" />
      </g>
      {/* small ground shadow */}
      <ellipse cx={cx} cy={cy + 0.6} rx={canopyR * 0.55} ry="1.2" fill={ink} opacity="0.18" />
    </g>
  );
}

// ── Soldier: tiny silhouette, blue tunic, musket. ~8px tall. ──
function Soldier({ x, y, ink }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* legs */}
      <line x1="-1" y1="0" x2="-1" y2="-4" stroke={ink} strokeWidth="0.9" />
      <line x1="1" y1="0" x2="1" y2="-4" stroke={ink} strokeWidth="0.9" />
      {/* torso (blue tunic) */}
      <rect x="-1.6" y="-8" width="3.2" height="4" fill="#3a4a7a" stroke={ink} strokeWidth="0.3" />
      {/* head + kepi */}
      <circle cx="0" cy="-9.3" r="0.9" fill={LMK.earthLight} stroke={ink} strokeWidth="0.25" />
      <rect x="-1.2" y="-10.3" width="2.4" height="1.2" fill="#3a4a7a" stroke={ink} strokeWidth="0.25" />
      {/* musket — held vertically at right side */}
      <line x1="2.2" y1="-9" x2="2.2" y2="-2" stroke={ink} strokeWidth="0.5" />
      <line x1="2.2" y1="-9" x2="2.2" y2="-10.5" stroke={ink} strokeWidth="0.7" />
    </g>
  );
}

// ── OxTrainSilhouette — quick painterly ox + canvas wagon, 4 oxen visible ──
function OxTrainSilhouette({ ink }) {
  // sits at y=0; viewer at right of the team
  return (
    <g>
      {/* dust trail */}
      <ellipse cx="-10" cy="0" rx="22" ry="2.5" fill={LMK.earthLight} opacity="0.4" />
      {/* 4 oxen — overlapping side-on silhouettes, walking right */}
      {[0, 1, 2, 3].map(i => (
        <g key={i} transform={`translate(${i * 14} 0)`}>
          {/* body */}
          <path
            d="M -7 -8 L -7 -12 L -5 -14 L 5 -14 L 7 -12 L 7 -8 L 5 -6 L -5 -6 Z"
            fill="#7a4a28" stroke={ink} strokeWidth="0.4"
          />
          {/* head + horns — front of body */}
          <path
            d="M 5 -13 L 9 -13 L 10 -11 L 9 -9 L 6 -9 L 5 -10 Z"
            fill="#5a3618" stroke={ink} strokeWidth="0.35"
          />
          <path d="M 8 -13 q 1 -2 0 -4" stroke={LMK.earthLight} strokeWidth="0.5" fill="none" />
          {/* legs */}
          <line x1="-5" y1="-6" x2="-5" y2="0" stroke={ink} strokeWidth="0.7" />
          <line x1="-2" y1="-6" x2="-2" y2="0" stroke={ink} strokeWidth="0.7" />
          <line x1="3" y1="-6" x2="3" y2="0" stroke={ink} strokeWidth="0.7" />
          <line x1="6" y1="-6" x2="6" y2="0" stroke={ink} strokeWidth="0.7" />
        </g>
      ))}
      {/* yoke pole connecting team to wagon */}
      <line x1="62" y1="-9" x2="86" y2="-10" stroke={ink} strokeWidth="0.8" />

      {/* wagon — canvas-topped prairie schooner */}
      <g transform="translate(105 0)">
        {/* wagon bed */}
        <rect x="-14" y="-9" width="28" height="5" fill={LMK.earthDark} stroke={ink} strokeWidth="0.5" />
        {/* canvas — arched */}
        <path
          d="M -14 -9 C -16 -20, 16 -20, 14 -9 Z"
          fill={LMK.white} stroke={ink} strokeWidth="0.5"
        />
        {/* canvas ribs hint */}
        <path d="M -8 -16 q 1 -3 0 0 M 0 -18 q 1 -3 0 0 M 8 -16 q 1 -3 0 0"
              stroke={ink} strokeWidth="0.3" fill="none" opacity="0.5" />
        {/* wheels */}
        <circle cx="-9" cy="-2" r="3.5" fill="none" stroke={ink} strokeWidth="0.7" />
        <circle cx="9" cy="-2" r="3.5" fill="none" stroke={ink} strokeWidth="0.7" />
        <circle cx="-9" cy="-2" r="0.6" fill={ink} />
        <circle cx="9" cy="-2" r="0.6" fill={ink} />
        {/* spokes */}
        {[0, 60, 120].map(a => (
          <g key={a} transform={`rotate(${a} -9 -2)`}>
            <line x1="-9" y1="-2" x2="-9" y2="-5.4" stroke={ink} strokeWidth="0.4" />
            <line x1="-9" y1="-2" x2="-9" y2="1.4" stroke={ink} strokeWidth="0.4" />
          </g>
        ))}
        {[0, 60, 120].map(a => (
          <g key={a} transform={`rotate(${a} 9 -2)`}>
            <line x1="9" y1="-2" x2="9" y2="-5.4" stroke={ink} strokeWidth="0.4" />
            <line x1="9" y1="-2" x2="9" y2="1.4" stroke={ink} strokeWidth="0.4" />
          </g>
        ))}
      </g>
    </g>
  );
}

Object.assign(window, { FortKearnyArt });
