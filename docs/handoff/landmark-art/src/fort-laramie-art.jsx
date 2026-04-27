// fort-laramie-art.jsx
// Fort Laramie / Fort John (1841–early 1850s era).
// Distinguishing visual facts (research):
//   • thick high adobe walls — "rising out of the grassland like a castle"
//   • SQUARE plan with bastions/blockhouses at two corners (peaked roofs)
//   • central two-gate entrance with arched passage
//   • flagpole rising from inside the courtyard
//   • a few buildings inside protrude above the wall (rooflines + chimneys)
//   • set on a low rise above the Laramie River
//   • emigrant wagons gathered OUTSIDE the walls (camping, repairs)
//   • cottonwoods / willows along the riverbank
//   • Laramie Mountains (faint blue) on far horizon
//
// Composition (480×200):
//   • far horizon: Laramie Mountains (~ y=70-95) — soft blue silhouette
//   • mid: the fort itself, centered (~ x=180–340), set on slight rise
//   • foreground: Laramie River curving in from left, wagon camp at right
//   • golden hour — sun behind viewer-right, walls catching warm light

function FortLaramieArt() {
  const F = "fl";
  const ink = LMK.ink;
  const adobe = "#d8b886";       // sun-lit adobe wall
  const adobeSh = "#a07a48";     // shadow side
  const adobeDk = "#7a5a30";     // deepest crevice
  const roof = "#8a4a28";        // shingled roofs (terra-cotta tone)
  const roofSh = "#5a3018";

  const horizonY = 88;
  const fortBaseY = 138;
  const groundY = 144;
  const trailY = 174;

  // Fort footprint
  const fx = 165;       // left wall x
  const fw = 162;       // total wall width
  const wallTopY = 102; // top of wall (rises 36 from base)
  const wallH = fortBaseY - wallTopY;

  return (
    <g>
      {/* ── Laramie Mountains — far horizon, blue-grey ── */}
      <g opacity="0.65">
        <path
          d={`M 0 ${horizonY}
              L 30 ${horizonY - 4} L 60 ${horizonY - 10} L 90 ${horizonY - 6}
              L 120 ${horizonY - 16} L 160 ${horizonY - 12} L 200 ${horizonY - 20}
              L 240 ${horizonY - 14} L 280 ${horizonY - 24} L 320 ${horizonY - 18}
              L 360 ${horizonY - 10} L 400 ${horizonY - 16} L 440 ${horizonY - 8}
              L ${LMK_VIEW_W} ${horizonY - 4}
              L ${LMK_VIEW_W} ${horizonY + 2} L 0 ${horizonY + 2} Z`}
          fill="#7a8a9a"
        />
        {/* lighter ridge line behind */}
        <path
          d={`M 0 ${horizonY - 2}
              L 50 ${horizonY - 6} L 100 ${horizonY - 4} L 180 ${horizonY - 10}
              L 260 ${horizonY - 6} L 340 ${horizonY - 12} L 420 ${horizonY - 4}
              L ${LMK_VIEW_W} ${horizonY - 6}
              L ${LMK_VIEW_W} ${horizonY} L 0 ${horizonY} Z`}
          fill="#a3aabc" opacity="0.65"
        />
      </g>

      {/* ── middle plain — softer green-tan ── */}
      <rect x="0" y={horizonY + 1} width={LMK_VIEW_W} height={fortBaseY - horizonY - 1}
            fill="#c8b88a" opacity="0.45" />

      {/* ── Laramie River — sweeps from lower-left up toward fort ── */}
      <g>
        <path
          d={`M 0 175
              C 50 168, 100 162, 150 156
              C 175 152, 200 150, 220 154
              L 220 159
              C 200 156, 175 158, 150 161
              C 100 167, 50 173, 0 180 Z`}
          fill={LMK.water} opacity="0.7"
        />
        {/* shimmer */}
        <path d="M 30 172 L 70 168 M 110 162 L 145 158" stroke={LMK.white} strokeWidth="0.5" opacity="0.5" />
        {/* far bank willows */}
        <Cottonwood2 cx={48}  cy={168} h={14} ink={ink} />
        <Cottonwood2 cx={75}  cy={164} h={18} ink={ink} />
        <Cottonwood2 cx={108} cy={160} h={16} ink={ink} />
        <Cottonwood2 cx={138} cy={156} h={20} ink={ink} />
      </g>

      {/* ── ground rise the fort sits on ── */}
      <path
        d={`M ${fx - 14} ${fortBaseY + 4}
            C ${fx - 4} ${fortBaseY - 2}, ${fx + 8} ${fortBaseY - 2}, ${fx + 30} ${fortBaseY + 1}
            L ${fx + fw - 30} ${fortBaseY + 1}
            C ${fx + fw - 8} ${fortBaseY - 2}, ${fx + fw + 4} ${fortBaseY - 2}, ${fx + fw + 14} ${fortBaseY + 4}
            L ${fx + fw + 14} ${fortBaseY + 16} L ${fx - 14} ${fortBaseY + 16} Z`}
        fill="#b8965e" stroke={ink} strokeWidth="0.4" opacity="0.85"
      />

      {/* ── Fort itself ── */}
      <g>
        {/* main wall block — drawn slightly 3/4 perspective: front wall + a sliver of right wall */}
        {/* front wall */}
        <rect x={fx} y={wallTopY} width={fw} height={wallH}
              fill={adobe} stroke={ink} strokeWidth="0.7" />
        {/* right-side wall (perspective sliver) */}
        <path
          d={`M ${fx + fw} ${wallTopY}
              L ${fx + fw + 14} ${wallTopY + 6}
              L ${fx + fw + 14} ${fortBaseY + 4}
              L ${fx + fw} ${fortBaseY} Z`}
          fill={adobeSh} stroke={ink} strokeWidth="0.6"
        />
        {/* left-edge shadow on front wall */}
        <rect x={fx} y={wallTopY} width="6" height={wallH} fill={adobeSh} opacity="0.4" />

        {/* adobe block courses — faint horizontal lines */}
        <g stroke={adobeDk} strokeWidth="0.3" opacity="0.55">
          <line x1={fx + 1} y1={wallTopY + 8}  x2={fx + fw - 1} y2={wallTopY + 8} />
          <line x1={fx + 1} y1={wallTopY + 16} x2={fx + fw - 1} y2={wallTopY + 16} />
          <line x1={fx + 1} y1={wallTopY + 24} x2={fx + fw - 1} y2={wallTopY + 24} />
          <line x1={fx + 1} y1={wallTopY + 30} x2={fx + fw - 1} y2={wallTopY + 30} />
        </g>
        {/* weathering streaks */}
        <g stroke={adobeDk} strokeWidth="0.4" opacity="0.4">
          <line x1={fx + 22} y1={wallTopY + 4} x2={fx + 22} y2={wallTopY + 18} />
          <line x1={fx + 80} y1={wallTopY + 4} x2={fx + 80} y2={wallTopY + 14} />
          <line x1={fx + 122} y1={wallTopY + 4} x2={fx + 122} y2={wallTopY + 22} />
        </g>

        {/* ── corner blockhouses (bastions) — peaked-roof towers extending above wall ── */}
        {/* left bastion */}
        <g>
          <rect x={fx - 4} y={wallTopY - 14} width="14" height={wallH + 14}
                fill={adobe} stroke={ink} strokeWidth="0.6" />
          <rect x={fx - 4} y={wallTopY - 14} width="4" height={wallH + 14}
                fill={adobeSh} opacity="0.5" />
          {/* hipped roof */}
          <path d={`M ${fx - 6} ${wallTopY - 14} L ${fx + 3} ${wallTopY - 22} L ${fx + 12} ${wallTopY - 14} Z`}
                fill={roof} stroke={ink} strokeWidth="0.5" />
          <path d={`M ${fx - 6} ${wallTopY - 14} L ${fx + 3} ${wallTopY - 22} L ${fx + 3} ${wallTopY - 14} Z`}
                fill={roofSh} opacity="0.6" />
          {/* gun port */}
          <rect x={fx - 1} y={wallTopY - 6} width="3" height="2" fill={ink} />
          <rect x={fx + 5} y={wallTopY - 6} width="3" height="2" fill={ink} />
        </g>
        {/* right bastion */}
        <g>
          <rect x={fx + fw - 10} y={wallTopY - 14} width="14" height={wallH + 14}
                fill={adobe} stroke={ink} strokeWidth="0.6" />
          <rect x={fx + fw - 10} y={wallTopY - 14} width="3" height={wallH + 14}
                fill={adobeSh} opacity="0.45" />
          {/* roof */}
          <path d={`M ${fx + fw - 12} ${wallTopY - 14} L ${fx + fw - 3} ${wallTopY - 22} L ${fx + fw + 6} ${wallTopY - 14} Z`}
                fill={roof} stroke={ink} strokeWidth="0.5" />
          <path d={`M ${fx + fw - 12} ${wallTopY - 14} L ${fx + fw - 3} ${wallTopY - 22} L ${fx + fw - 3} ${wallTopY - 14} Z`}
                fill={roofSh} opacity="0.6" />
          {/* gun ports */}
          <rect x={fx + fw - 7} y={wallTopY - 6} width="3" height="2" fill={ink} />
          <rect x={fx + fw - 1} y={wallTopY - 6} width="3" height="2" fill={ink} />
        </g>

        {/* ── parapet crenellations along top of wall ── */}
        <g fill={adobe} stroke={ink} strokeWidth="0.5">
          {Array.from({ length: 9 }, (_, i) => {
            const cx = fx + 16 + i * 16;
            return <rect key={i} x={cx} y={wallTopY - 4} width="6" height="4" />;
          })}
        </g>

        {/* ── central gate — arched two-leaf wooden gate ── */}
        <g>
          {/* gate housing block — slightly taller than wall */}
          <rect x={fx + fw / 2 - 16} y={wallTopY - 6} width="32" height={wallH + 6}
                fill={adobe} stroke={ink} strokeWidth="0.6" />
          <rect x={fx + fw / 2 - 16} y={wallTopY - 6} width="4" height={wallH + 6}
                fill={adobeSh} opacity="0.45" />
          {/* arched opening */}
          <path
            d={`M ${fx + fw / 2 - 9} ${fortBaseY}
                L ${fx + fw / 2 - 9} ${wallTopY + 12}
                Q ${fx + fw / 2} ${wallTopY + 2}, ${fx + fw / 2 + 9} ${wallTopY + 12}
                L ${fx + fw / 2 + 9} ${fortBaseY} Z`}
            fill="#2a1810" stroke={ink} strokeWidth="0.6"
          />
          {/* gate doors — wooden planks, partly open */}
          <path
            d={`M ${fx + fw / 2 - 9} ${fortBaseY}
                L ${fx + fw / 2 - 9} ${wallTopY + 14}
                L ${fx + fw / 2 - 1} ${wallTopY + 14}
                L ${fx + fw / 2 - 1} ${fortBaseY} Z`}
            fill={LMK.earthDark} stroke={ink} strokeWidth="0.4"
          />
          <g stroke={ink} strokeWidth="0.3" opacity="0.6">
            <line x1={fx + fw / 2 - 6} y1={wallTopY + 14} x2={fx + fw / 2 - 6} y2={fortBaseY} />
            <line x1={fx + fw / 2 - 4} y1={wallTopY + 14} x2={fx + fw / 2 - 4} y2={fortBaseY} />
          </g>
          {/* iron studs */}
          <circle cx={fx + fw / 2 - 5} cy={wallTopY + 18} r="0.5" fill={ink} />
          <circle cx={fx + fw / 2 - 5} cy={wallTopY + 26} r="0.5" fill={ink} />
          <circle cx={fx + fw / 2 - 5} cy={wallTopY + 34} r="0.5" fill={ink} />
          {/* gate parapet/peak */}
          <path d={`M ${fx + fw / 2 - 16} ${wallTopY - 6}
                    L ${fx + fw / 2} ${wallTopY - 14}
                    L ${fx + fw / 2 + 16} ${wallTopY - 6} Z`}
                fill={adobeSh} stroke={ink} strokeWidth="0.5" />
        </g>

        {/* ── inside-fort buildings: gable rooflines peeking above wall ── */}
        <g>
          {/* officer quarters roof — left */}
          <path d={`M ${fx + 24} ${wallTopY - 2}
                    L ${fx + 38} ${wallTopY - 9}
                    L ${fx + 52} ${wallTopY - 2} Z`}
                fill={roof} stroke={ink} strokeWidth="0.5" />
          {/* trade hall — right */}
          <path d={`M ${fx + fw - 50} ${wallTopY - 2}
                    L ${fx + fw - 34} ${wallTopY - 11}
                    L ${fx + fw - 18} ${wallTopY - 2} Z`}
                fill={roof} stroke={ink} strokeWidth="0.5" />
          {/* small chimney */}
          <rect x={fx + 44} y={wallTopY - 14} width="3" height="6" fill={LMK.earthDark} stroke={ink} strokeWidth="0.3" />
          {/* smoke */}
          <path d={`M ${fx + 45.5} ${wallTopY - 14} q -2 -3 1 -6 q 3 -2 0 -6`}
                stroke={ink} strokeWidth="0.4" fill="none" opacity="0.5" />
        </g>

        {/* ── flagpole rising from inside courtyard, behind gate ── */}
        <g>
          <line x1={fx + fw / 2} y1={wallTopY - 14} x2={fx + fw / 2} y2={wallTopY - 38}
                stroke={ink} strokeWidth="0.7" />
          <circle cx={fx + fw / 2} cy={wallTopY - 38} r="0.8" fill={ink} />
          {/* US flag */}
          <path
            d={`M ${fx + fw / 2} ${wallTopY - 37}
                L ${fx + fw / 2 + 16} ${wallTopY - 35}
                L ${fx + fw / 2 + 16} ${wallTopY - 27}
                L ${fx + fw / 2} ${wallTopY - 25} Z`}
            fill={LMK.redFlag} stroke={ink} strokeWidth="0.4"
          />
          <rect x={fx + fw / 2} y={wallTopY - 37} width="6" height="5" fill="#3a4a7a" />
          <line x1={fx + fw / 2 + 6} y1={wallTopY - 33} x2={fx + fw / 2 + 16} y2={wallTopY - 32}
                stroke={LMK.white} strokeWidth="0.4" opacity="0.85" />
          <line x1={fx + fw / 2} y1={wallTopY - 30} x2={fx + fw / 2 + 16} y2={wallTopY - 29}
                stroke={LMK.white} strokeWidth="0.4" opacity="0.85" />
        </g>
      </g>

      {/* ── ground in front of fort ── */}
      <rect x="0" y={groundY} width={LMK_VIEW_W} height={LMK_VIEW_H - groundY}
            fill="#c9a06a" opacity="0.4" />

      {/* ── wagon camp outside the walls — right of fort ── */}
      <g>
        {/* circled wagons (small cluster) */}
        <CampWagon x={358} y={156} ink={ink} />
        <CampWagon x={388} y={160} ink={ink} flip />
        <CampWagon x={418} y={158} ink={ink} />
        {/* campfire smoke */}
        <g opacity="0.45">
          <ellipse cx="395" cy="166" rx="4" ry="1.2" fill={LMK.earthLight} />
          <path d="M 395 166 q -2 -6 1 -10 q 3 -3 0 -8" stroke={ink} strokeWidth="0.5" fill="none" />
        </g>
        {/* a couple of figures around fire */}
        <g>
          <rect x="389" y="160" width="1.4" height="4" fill={ink} />
          <circle cx="389.7" cy="159" r="0.9" fill={LMK.earthLight} stroke={ink} strokeWidth="0.2" />
          <rect x="400" y="161" width="1.4" height="4" fill={ink} />
          <circle cx="400.7" cy="160" r="0.9" fill={LMK.earthLight} stroke={ink} strokeWidth="0.2" />
        </g>
      </g>

      {/* ── lone wagon approaching fort gate from foreground ── */}
      <g transform="translate(265 168)">
        <ApproachingWagon ink={ink} />
      </g>

      {/* ── faint trail ruts curving toward the gate ── */}
      <g stroke={ink} strokeWidth="0.5" fill="none" opacity="0.32">
        <path d="M 220 188 C 240 178, 250 170, 260 164" />
        <path d="M 235 192 C 250 184, 256 176, 264 168" />
      </g>

      {/* ── inscribed caption ── */}
      <g transform="translate(388 192)">
        <text x="0" y="0" fontFamily="'IM Fell English', Georgia, serif"
              fontSize="7" fill={ink} opacity="0.55"
              fontStyle="italic" textAnchor="end">
          Fort Laramie, on the North Platte
        </text>
      </g>
    </g>
  );
}

// ── Smaller cottonwood for distant willow line ──
function Cottonwood2({ cx, cy, h = 14, ink }) {
  const trunk = h * 0.35;
  return (
    <g>
      <line x1={cx} y1={cy} x2={cx} y2={cy - trunk} stroke={LMK.earthDark} strokeWidth="0.6" />
      <ellipse cx={cx} cy={cy - trunk - h * 0.35} rx={h * 0.45} ry={h * 0.4} fill={LMK.sage} />
      <ellipse cx={cx - h * 0.18} cy={cy - trunk - h * 0.4} rx={h * 0.3} ry={h * 0.28} fill={LMK.sageDark} />
      <ellipse cx={cx} cy={cy - trunk - h * 0.4} rx={h * 0.5} ry={h * 0.42}
               fill="none" stroke={ink} strokeWidth="0.35" opacity="0.5" />
    </g>
  );
}

// ── Small camp wagon — parked, canvas only, no team ──
function CampWagon({ x, y, ink, flip = false }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
      {/* canvas */}
      <path d="M -10 -2 C -12 -10, 12 -10, 10 -2 Z"
            fill={LMK.white} stroke={ink} strokeWidth="0.5" />
      {/* bed */}
      <rect x="-10" y="-2" width="20" height="3" fill={LMK.earthDark} stroke={ink} strokeWidth="0.4" />
      {/* wheels */}
      <circle cx="-6" cy="2" r="2.4" fill="none" stroke={ink} strokeWidth="0.55" />
      <circle cx="6" cy="2" r="2.4" fill="none" stroke={ink} strokeWidth="0.55" />
      <circle cx="-6" cy="2" r="0.5" fill={ink} />
      <circle cx="6" cy="2" r="0.5" fill={ink} />
      {/* shadow */}
      <ellipse cx="0" cy="4.8" rx="9" ry="0.9" fill={ink} opacity="0.18" />
    </g>
  );
}

// ── Single approaching wagon — head-on-ish, canvas + 2 oxen ──
function ApproachingWagon({ ink }) {
  return (
    <g>
      {/* dust */}
      <ellipse cx="-12" cy="0" rx="20" ry="2" fill={LMK.earthLight} opacity="0.4" />
      {/* 2 oxen */}
      {[0, 1].map(i => (
        <g key={i} transform={`translate(${i * 12} 0)`}>
          <path d="M -6 -8 L -6 -12 L -4 -13 L 4 -13 L 6 -12 L 6 -8 L 4 -6 L -4 -6 Z"
                fill="#7a4a28" stroke={ink} strokeWidth="0.4" />
          <path d="M 4 -12 L 8 -12 L 9 -10 L 8 -8 L 5 -8 L 4 -9 Z"
                fill="#5a3618" stroke={ink} strokeWidth="0.35" />
          <line x1="-4" y1="-6" x2="-4" y2="0" stroke={ink} strokeWidth="0.7" />
          <line x1="-1" y1="-6" x2="-1" y2="0" stroke={ink} strokeWidth="0.7" />
          <line x1="2"  y1="-6" x2="2"  y2="0" stroke={ink} strokeWidth="0.7" />
          <line x1="5"  y1="-6" x2="5"  y2="0" stroke={ink} strokeWidth="0.7" />
        </g>
      ))}
      {/* yoke pole */}
      <line x1="22" y1="-9" x2="42" y2="-10" stroke={ink} strokeWidth="0.7" />
      {/* wagon */}
      <g transform="translate(56 0)">
        <path d="M -12 -8 C -14 -18, 14 -18, 12 -8 Z"
              fill={LMK.white} stroke={ink} strokeWidth="0.5" />
        <rect x="-12" y="-8" width="24" height="4" fill={LMK.earthDark} stroke={ink} strokeWidth="0.45" />
        <circle cx="-7" cy="-2" r="3" fill="none" stroke={ink} strokeWidth="0.6" />
        <circle cx="7" cy="-2" r="3" fill="none" stroke={ink} strokeWidth="0.6" />
        <circle cx="-7" cy="-2" r="0.5" fill={ink} />
        <circle cx="7" cy="-2" r="0.5" fill={ink} />
      </g>
    </g>
  );
}

Object.assign(window, { FortLaramieArt });
