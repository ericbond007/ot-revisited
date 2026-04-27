/* global React, LMK, LMK_VIEW_W, LMK_VIEW_H */

// ============================================================================
// WhitmanMissionArt — mile ~1640, the Presbyterian mission at Waiilatpu.
// ============================================================================
// Marcus & Narcissa Whitman's mission station near present-day Walla Walla,
// founded 1836. A rare GREEN agricultural island — irrigated wheat, gardens,
// cottonwoods — set against the brown rolling hills of Cayuse country.
// Cluster of whitewashed adobe/frame buildings: the T-shaped mission house,
// a gristmill with race, blacksmith shop, fenced fields. Killed Nov 1847;
// after that date the mission was BURNED. The 'visited' tone naturally
// reads as ruins for late-game journeys.
//
// Distinguishing visual marks:
//   • CLUSTER of small whitewashed buildings — not a fort, not a single house
//   • T-shaped main mission house (two volumes meeting at a right angle)
//   • Gristmill with a tall waterwheel + millrace
//   • IRRIGATED green fields — wheat patch, garden squares — green stripe
//   • Brown rolling hills surrounding (Walla Walla country)
//   • A cottonwood or two near the buildings
//   • A few figures: Whitmans, Cayuse visitors, a wagon resting
// ============================================================================

function WhitmanMissionArt() {
  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const wallWhite = "#ece2cc";  // limewashed adobe
  const wallShadow = "#b8a888";
  const woodMid = "#7a5a36";
  const fieldGreen = "#7a8a48";
  const fieldGreenLight = "#9eb060";
  const hillBrown = "#a07650";
  const hillBrownDark = "#6e4e30";

  return (
    <g>
      {/* ── Distant hills — soft brown rollers ───────────────────── */}
      <path
        d="M 0 70 Q 60 60 120 68 Q 200 56 280 66 Q 360 58 440 66 Q 470 64 480 66 L 480 96 L 0 96 Z"
        fill={hillBrown} opacity="0.6" stroke={ink} strokeWidth="0.4"
      />
      <path
        d="M 0 80 Q 80 76 160 82 Q 240 78 320 84 Q 400 80 480 82 L 480 100 L 0 100 Z"
        fill={hillBrownDark} opacity="0.55"
      />

      {/* faint sage on hill flanks */}
      <g opacity="0.55">
        {[20, 60, 120, 200, 270, 340, 420, 460].map((x, i) => (
          <ellipse key={i} cx={x} cy={70 + (i % 3) * 6} rx="3" ry="0.8" fill={LMK.sageDark} />
        ))}
      </g>

      {/* ── IRRIGATED FIELD STRIPE — the visual signature ─────────── */}
      {/* Mid-ground green band. Wheat-colored on near edge, lush green at far. */}
      <g>
        <rect x="0" y="100" width={LMK_VIEW_W} height="32" fill={fieldGreen} stroke={ink} strokeWidth="0.4" opacity="0.85" />
        {/* lighter near edge */}
        <rect x="0" y="124" width={LMK_VIEW_W} height="8" fill={fieldGreenLight} opacity="0.6" />
        {/* fence posts dividing fields */}
        <g stroke={woodMid} strokeWidth="0.5">
          {[60, 140, 230, 320, 410].map((x, i) => (
            <g key={i}>
              <line x1={x} y1="104" x2={x} y2="130" />
            </g>
          ))}
          {/* horizontal fence rails */}
          <line x1="60" y1="108" x2="410" y2="108" strokeWidth="0.3" opacity="0.7" />
          <line x1="60" y1="118" x2="410" y2="118" strokeWidth="0.3" opacity="0.7" />
        </g>
        {/* rows of crops — diagonal hatching to read as planted field */}
        <g opacity="0.45" stroke={hillBrownDark} strokeWidth="0.3">
          {Array.from({length: 38}).map((_, i) => (
            <line key={i} x1={i * 13} y1="104" x2={i * 13 - 4} y2="130" />
          ))}
        </g>
        {/* small irrigation channel — thin blue line angling across */}
        <path d="M 30 132 Q 120 128 220 132 Q 320 128 460 132"
          stroke={LMK.water} strokeWidth="1.1" fill="none" opacity="0.85" />
        <path d="M 30 132 Q 120 128 220 132 Q 320 128 460 132"
          stroke="#5a7280" strokeWidth="0.3" fill="none" opacity="0.7" />
      </g>

      {/* ── MISSION CLUSTER — left of center, tucked under cottonwoods */}
      <g>
        {/* shadow under cluster */}
        <ellipse cx="180" cy="148" rx="80" ry="6" fill={ink} opacity="0.18" />

        {/* === Mission house (T-shaped) — main building, far-left of cluster */}
        {/* Main rectangular wing */}
        <rect x="120" y="118" width="42" height="28" fill={wallWhite} stroke={ink} strokeWidth="0.6" />
        {/* shadow side */}
        <rect x="156" y="118" width="6" height="28" fill={wallShadow} opacity="0.6" />
        {/* roof — pitched, single ridge line */}
        <path d="M 118 118 L 141 106 L 164 118 Z" fill={woodMid} stroke={ink} strokeWidth="0.6" />
        {/* roof boards */}
        <line x1="141" y1="106" x2="141" y2="118" stroke={ink} strokeWidth="0.3" opacity="0.6" />
        <line x1="130" y1="112" x2="130" y2="118" stroke={ink} strokeWidth="0.25" opacity="0.4" />
        <line x1="152" y1="112" x2="152" y2="118" stroke={ink} strokeWidth="0.25" opacity="0.4" />
        {/* chimney */}
        <rect x="148" y="100" width="3" height="8" fill={wallShadow} stroke={ink} strokeWidth="0.4" />
        {/* curl of smoke */}
        <path d="M 150 99 q -1 -4 1 -7 q 1 -3 -1 -6"
          stroke={ink} strokeWidth="0.4" fill="none" opacity="0.55" />
        {/* windows + door */}
        <rect x="125" y="126" width="4" height="6" fill={ink} opacity="0.85" />
        <rect x="135" y="126" width="4" height="6" fill={ink} opacity="0.85" />
        <rect x="145" y="126" width="4" height="6" fill={ink} opacity="0.85" />
        <rect x="155" y="126" width="3" height="6" fill={ink} opacity="0.85" />
        {/* door, slightly taller */}
        <rect x="129" y="138" width="4" height="8" fill={woodMid} stroke={ink} strokeWidth="0.35" />
        {/* T cross-wing — shorter perpendicular volume jutting forward */}
        <rect x="138" y="140" width="16" height="12" fill={wallWhite} stroke={ink} strokeWidth="0.55" />
        <rect x="148" y="140" width="6" height="12" fill={wallShadow} opacity="0.55" />
        <path d="M 136 140 L 146 132 L 156 140 Z" fill={woodMid} stroke={ink} strokeWidth="0.5" />
        <rect x="143" y="143" width="2.5" height="3" fill={ink} opacity="0.85" />

        {/* === Blacksmith shop — small, dark, smoking */}
        <rect x="178" y="128" width="20" height="18" fill={wallShadow} stroke={ink} strokeWidth="0.55" />
        <path d="M 176 128 L 188 120 L 200 128 Z" fill={woodMid} stroke={ink} strokeWidth="0.5" />
        {/* open doorway showing forge glow */}
        <rect x="184" y="134" width="6" height="12" fill={ink} opacity="0.9" />
        <rect x="185" y="140" width="4" height="5" fill={LMK.rust} opacity="0.7" />
        {/* chimney + thicker smoke */}
        <rect x="192" y="116" width="2.5" height="6" fill={wallShadow} stroke={ink} strokeWidth="0.4" />
        <g stroke={inkSoft} strokeWidth="0.5" fill="none" opacity="0.7">
          <path d="M 193 115 q -2 -4 1 -8 q 2 -5 -2 -10" />
          <path d="M 195 113 q 2 -3 -1 -8 q -2 -4 1 -8" />
        </g>

        {/* === Gristmill with WATERWHEEL — right side of cluster */}
        <rect x="218" y="118" width="32" height="28" fill={wallWhite} stroke={ink} strokeWidth="0.6" />
        <rect x="244" y="118" width="6" height="28" fill={wallShadow} opacity="0.55" />
        <path d="M 216 118 L 234 106 L 252 118 Z" fill={woodMid} stroke={ink} strokeWidth="0.6" />
        <line x1="234" y1="106" x2="234" y2="118" stroke={ink} strokeWidth="0.3" opacity="0.6" />
        <rect x="224" y="126" width="4" height="6" fill={ink} opacity="0.85" />
        <rect x="234" y="126" width="4" height="6" fill={ink} opacity="0.85" />
        <rect x="244" y="126" width="3" height="6" fill={ink} opacity="0.85" />
        <rect x="228" y="138" width="5" height="8" fill={woodMid} stroke={ink} strokeWidth="0.35" />
        {/* WATERWHEEL on the right side of the mill */}
        <g transform="translate(254, 138)">
          <circle cx="0" cy="0" r="9" fill="none" stroke={ink} strokeWidth="0.7" />
          <circle cx="0" cy="0" r="9" fill={woodMid} opacity="0.5" />
          <circle cx="0" cy="0" r="6" fill="none" stroke={ink} strokeWidth="0.5" />
          {/* paddles */}
          <g stroke={ink} strokeWidth="0.45" fill={woodMid}>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
              const r1 = 6, r2 = 9;
              const a = (deg * Math.PI) / 180;
              return (
                <line key={i}
                  x1={Math.cos(a) * r1} y1={Math.sin(a) * r1}
                  x2={Math.cos(a) * r2} y2={Math.sin(a) * r2}
                />
              );
            })}
          </g>
          {/* hub */}
          <circle cx="0" cy="0" r="1.4" fill={ink} />
          {/* water trough above + falling stream */}
          <rect x="-2" y="-13" width="6" height="3" fill={woodMid} stroke={ink} strokeWidth="0.35" />
          <path d="M 0 -10 q 0 4 1 8" stroke={LMK.water} strokeWidth="1.3" fill="none" opacity="0.9" />
          {/* tail water */}
          <path d="M -8 8 q 8 1 16 0" stroke={LMK.water} strokeWidth="1.2" fill="none" opacity="0.85" />
        </g>

        {/* === Granary / outbuilding behind */}
        <rect x="200" y="113" width="14" height="10" fill={wallShadow} opacity="0.85" stroke={ink} strokeWidth="0.45" />
        <path d="M 198 113 L 207 107 L 216 113 Z" fill={woodMid} opacity="0.85" stroke={ink} strokeWidth="0.4" />
      </g>

      {/* ── Cottonwoods — flanking the cluster ───────────────────── */}
      <g>
        {/* Left of cluster */}
        <g transform="translate(96, 132)">
          <ellipse cx="0" cy="0" rx="10" ry="8" fill="#5a6a3a" stroke={ink} strokeWidth="0.4" />
          <ellipse cx="-2" cy="-2" rx="6" ry="5" fill="#7a8a48" stroke={ink} strokeWidth="0.3" />
          <ellipse cx="3" cy="-1" rx="4" ry="3" fill="#5a6a3a" stroke={ink} strokeWidth="0.3" />
          <line x1="0" y1="6" x2="0" y2="14" stroke={ink} strokeWidth="0.6" />
          <line x1="-1.5" y1="8" x2="-1.5" y2="14" stroke={inkSoft} strokeWidth="0.4" />
        </g>
        {/* Right of cluster */}
        <g transform="translate(282, 130)">
          <ellipse cx="0" cy="0" rx="11" ry="9" fill="#5a6a3a" stroke={ink} strokeWidth="0.4" />
          <ellipse cx="-3" cy="-2" rx="6" ry="5" fill="#7a8a48" stroke={ink} strokeWidth="0.3" />
          <ellipse cx="4" cy="-1" rx="5" ry="4" fill="#5a6a3a" stroke={ink} strokeWidth="0.3" />
          <line x1="0" y1="7" x2="0" y2="16" stroke={ink} strokeWidth="0.6" />
          <line x1="2" y1="9" x2="2" y2="16" stroke={inkSoft} strokeWidth="0.4" />
        </g>
      </g>

      {/* ── Foreground — wagon resting + figures ─────────────────── */}
      <rect x="0" y="148" width={LMK_VIEW_W} height="52" fill={LMK.parchment} opacity="0.55" />
      <path d="M 0 168 Q 100 166 200 170 Q 300 168 400 170 Q 460 169 480 170"
        stroke={LMK.earth} strokeWidth="1" fill="none" opacity="0.4" />
      {/* sage tufts on near plain */}
      <g opacity="0.6">
        {[20, 56, 96, 360, 408, 444, 466].map((x, i) => {
          const y = 178 + (i % 3) * 6;
          return (
            <g key={i} transform={`translate(${x}, ${y})`}>
              <ellipse cx="0" cy="0" rx="2.6" ry="1.2" fill={LMK.sage} stroke={ink} strokeWidth="0.25" />
              <ellipse cx="-1" cy="-0.7" rx="1.4" ry="0.7" fill={LMK.sageLight} stroke={ink} strokeWidth="0.2" />
            </g>
          );
        })}
      </g>

      {/* a wagon stopped at the mission */}
      <g>
        <SmallWagonW x={328} y={170} />
        <SmallWagonW x={368} y={172} />
      </g>
      {/* small group of pioneers + a Cayuse rider */}
      <SmallPersonW x={310} y={188} hat />
      <SmallPersonW x={322} y={190} />
      <SmallPersonW x={344} y={186} hat />
      {/* Mounted Cayuse visitor */}
      <g transform="translate(220, 168)">
        <ellipse cx="0" cy="2" rx="3.2" ry="1.4" fill={LMK.earthLight} stroke={ink} strokeWidth="0.3" />
        <ellipse cx="2.6" cy="0.8" rx="1.1" ry="0.9" fill={LMK.earthLight} stroke={ink} strokeWidth="0.3" />
        <line x1="-2" y1="3" x2="-2" y2="5.5" stroke={ink} strokeWidth="0.4" />
        <line x1="2" y1="3" x2="2" y2="5.5" stroke={ink} strokeWidth="0.4" />
        {/* rider */}
        <ellipse cx="0" cy="-2" rx="0.8" ry="0.9" fill={LMK.paperWarm} stroke={ink} strokeWidth="0.25" />
        <path d="M -0.9 -1.3 L 0.9 -1.3 L 0.7 1.8 L -0.7 1.8 Z" fill={LMK.rust} stroke={ink} strokeWidth="0.25" />
      </g>

      {/* a small fenced kitchen garden in the foreground left */}
      <g>
        <rect x="36" y="160" width="60" height="20" fill={fieldGreenLight} opacity="0.45" stroke={woodMid} strokeWidth="0.5" />
        {/* row markings */}
        <g opacity="0.5" stroke={hillBrownDark} strokeWidth="0.3">
          <line x1="36" y1="166" x2="96" y2="166" />
          <line x1="36" y1="172" x2="96" y2="172" />
          <line x1="36" y1="178" x2="96" y2="178" />
        </g>
        {/* fence corner posts */}
        {[36, 66, 96].map((x, i) => (
          <line key={i} x1={x} y1="160" x2={x} y2="180" stroke={woodMid} strokeWidth="0.5" />
        ))}
      </g>

      {/* ── Caption ──────────────────────────────────────────────────── */}
      <text x="240" y="194" textAnchor="middle"
        fontFamily="IM Fell English, Georgia, serif" fontSize="8"
        fill={inkSoft} fontStyle="italic" opacity="0.85">
        Whitman Mission &mdash; Waiilatpu
      </text>
    </g>
  );
}

function SmallWagonW({ x, y }) {
  const ink = LMK.ink;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x="0" y="0" width="14" height="5" fill={LMK.earth} stroke={ink} strokeWidth="0.35" />
      <path d="M 0 0 Q 7 -8 14 0 Z" fill={LMK.white} stroke={ink} strokeWidth="0.45" />
      <circle cx="3" cy="6" r="1.8" fill="none" stroke={ink} strokeWidth="0.35" />
      <circle cx="11" cy="6" r="1.8" fill="none" stroke={ink} strokeWidth="0.35" />
    </g>
  );
}

function SmallPersonW({ x, y, hat = false }) {
  const ink = LMK.ink;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx="0" cy="-3" r="0.9" fill={LMK.paperWarm} stroke={ink} strokeWidth="0.2" />
      {hat && <ellipse cx="0" cy="-4" rx="1.5" ry="0.3" fill={ink} />}
      <path d="M -1.2 -2 L 1.2 -2 L 1 2 L -1 2 Z" fill={LMK.earthDark} stroke={ink} strokeWidth="0.25" />
      <line x1="-0.6" y1="2" x2="-0.6" y2="5" stroke={ink} strokeWidth="0.4" />
      <line x1="0.6" y1="2" x2="0.6" y2="5" stroke={ink} strokeWidth="0.4" />
    </g>
  );
}

Object.assign(window, { WhitmanMissionArt });
