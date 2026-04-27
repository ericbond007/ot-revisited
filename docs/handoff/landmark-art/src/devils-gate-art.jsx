/* global React, LMK, LMK_VIEW_W, LMK_VIEW_H */

// ============================================================================
// DevilsGateArt — mile ~820, just 5 mi past Independence Rock.
// ============================================================================
// A dramatic 330-ft-deep cleft cut by the Sweetwater River through a granite
// ridge. The wagon trail goes AROUND the ridge (south side), but pioneers
// almost universally hiked over to gawk. Sheer vertical walls; the river
// rushes through a narrow gap maybe 30-40 ft wide at the bottom. The walls
// are darker, blockier granite than Independence Rock — more rugged.
//
// Distinguishing visual marks:
//   • Two SHEER VERTICAL granite walls forming a narrow slot canyon
//   • River foaming through the gap — white water, motion
//   • Trail visible going around the ridge (NOT through the gate)
//   • Tiny pioneer figures on the trail looking up, gawking
//   • Wider granite ridge on either side of the gap
//   • Sky visible through the cleft — narrow strip
// ============================================================================

function DevilsGateArt() {
  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const graniteLight = "#a89888";
  const graniteMid = "#705e50";
  const graniteDark = "#3a2e26";
  const graniteShadow = "#241c18";

  return (
    <g>
      {/* ── Far horizon (will be largely hidden by ridge) ────────── */}
      <path
        d="M 0 80 Q 80 76 160 80 Q 240 76 320 80 Q 400 76 480 80 L 480 90 L 0 90 Z"
        fill={LMK.sage} opacity="0.4"
      />

      {/* ────────────────────────────────────────────────────────────
          HERO COMPOSITION: a granite ridge filling the comp, with a
          narrow vertical CLEFT roughly center-right where the river
          cuts through. The cleft is the focal point.

          Layout:
          • Left ridge mass:   x=0  → x=212  (peaks at y=18-30)
          • Cleft (the gate):  x=212 → x=240
          • Right ridge mass:  x=240 → x=480 (peaks at y=22-34)
          • River at base:     y=130 outside, y=140 in cleft
          • Trail goes AROUND on right side (NOT through)
         ─────────────────────────────────────────────────────────── */}

      {/* ── LEFT RIDGE MASS ──────────────────────────────────────── */}
      <g>
        {/* main silhouette — rugged, blocky, taller than wide */}
        <path
          d="M 0 145 L 0 60 L 14 48 L 32 36 L 50 28 L 70 24 L 92 22 L 116 20 L 138 26 L 158 36 L 178 50 L 196 70 L 208 92 L 212 145 Z"
          fill={graniteLight} stroke={ink} strokeWidth="0.9"
        />
        {/* darker shadow side — the cleft-facing wall is in shadow */}
        <path
          d="M 196 70 L 208 92 L 212 145 L 178 145 L 178 50 Z"
          fill={graniteShadow} opacity="0.5"
        />
        {/* sheer vertical face plunging into the gate — DARK */}
        <rect x="200" y="50" width="12" height="95" fill={graniteShadow} opacity="0.7" />
        {/* horizontal joints / ledges on main face */}
        <g opacity="0.55" stroke={graniteMid} fill="none" strokeWidth="0.4">
          <path d="M 8 78 Q 80 70 180 86" />
          <path d="M 4 100 Q 80 92 200 110" />
          <path d="M 0 122 Q 80 116 210 130" />
          <path d="M 20 60 Q 80 50 160 50" />
          <path d="M 40 42 Q 80 36 130 34" />
        </g>
        {/* vertical fracture lines */}
        <g opacity="0.55" stroke={graniteDark} fill="none" strokeWidth="0.5">
          <path d="M 50 28 L 56 100" />
          <path d="M 92 22 L 96 80" />
          <path d="M 138 26 L 142 80" />
          <path d="M 178 50 L 184 130" />
          <path d="M 30 60 L 26 130" />
          <path d="M 110 50 L 116 130" />
        </g>
        {/* speckled granite texture */}
        <g opacity="0.4" fill={graniteDark}>
          {Array.from({ length: 30 }).map((_, i) => {
            const x = 8 + (i * 23) % 190;
            const y = 30 + ((i * 31) % 100);
            const r = 0.3 + (i % 3) * 0.15;
            return <circle key={i} cx={x} cy={y} r={r} />;
          })}
        </g>
        {/* a few pines on upper slopes */}
        <g>
          {[[40, 32], [70, 28], [98, 26], [130, 30], [56, 38], [88, 34], [120, 30]].map(([px, py], i) => (
            <path key={i} d={`M ${px - 1.4} ${py + 1} L ${px} ${py - 2} L ${px + 1.4} ${py + 1} Z`}
              fill="#3a4a2a" stroke={ink} strokeWidth="0.2" />
          ))}
        </g>
      </g>

      {/* ── THE CLEFT — narrow vertical gate ───────────────────────── */}
      <g>
        {/* dark interior of cleft — recedes into shadow */}
        <path
          d="M 212 145 L 212 50 L 218 28 L 230 18 L 240 18 L 240 145 Z"
          fill={graniteShadow} opacity="0.85"
        />
        <path
          d="M 240 145 L 240 18 L 250 18 L 262 28 L 268 50 L 268 145 Z"
          fill={graniteShadow} opacity="0.85"
        />
        {/* narrow strip of sky visible through the cleft at top */}
        <path
          d="M 218 28 L 230 18 L 250 18 L 262 28 L 254 30 L 226 30 Z"
          fill={LMK.paperWarm} opacity="0.55"
        />
        {/* sheer vertical striations on cleft walls */}
        <g opacity="0.6" stroke={ink} fill="none" strokeWidth="0.4">
          <path d="M 218 30 L 220 140" />
          <path d="M 224 32 L 226 140" />
          <path d="M 232 30 L 234 140" />
          <path d="M 248 30 L 250 140" />
          <path d="M 256 32 L 258 140" />
          <path d="M 262 30 L 264 140" />
        </g>
      </g>

      {/* ── RIGHT RIDGE MASS ─────────────────────────────────────── */}
      <g>
        <path
          d="M 268 145 L 268 50 L 272 36 L 280 24 L 296 18 L 318 14 L 342 16 L 364 22 L 388 32 L 410 46 L 432 62 L 454 80 L 472 100 L 480 120 L 480 145 Z"
          fill={graniteLight} stroke={ink} strokeWidth="0.9"
        />
        {/* shadow on left-facing slope (into the cleft) */}
        <path
          d="M 268 50 L 272 36 L 280 24 L 296 18 L 296 145 L 268 145 Z"
          fill={graniteShadow} opacity="0.5"
        />
        {/* sheer vertical face plunging into gate */}
        <rect x="268" y="50" width="12" height="95" fill={graniteShadow} opacity="0.7" />
        {/* horizontal joints */}
        <g opacity="0.55" stroke={graniteMid} fill="none" strokeWidth="0.4">
          <path d="M 280 60 Q 380 50 480 70" />
          <path d="M 280 80 Q 380 70 480 92" />
          <path d="M 280 100 Q 380 92 480 110" />
          <path d="M 270 122 Q 380 116 480 128" />
          <path d="M 296 40 Q 380 32 460 38" />
        </g>
        {/* vertical fractures */}
        <g opacity="0.55" stroke={graniteDark} fill="none" strokeWidth="0.5">
          <path d="M 318 14 L 322 80" />
          <path d="M 364 22 L 368 100" />
          <path d="M 410 46 L 414 130" />
          <path d="M 454 80 L 458 140" />
          <path d="M 296 24 L 300 130" />
          <path d="M 388 32 L 392 130" />
        </g>
        <g opacity="0.4" fill={graniteDark}>
          {Array.from({ length: 30 }).map((_, i) => {
            const x = 280 + (i * 27) % 200;
            const y = 24 + ((i * 31) % 110);
            const r = 0.3 + (i % 3) * 0.15;
            return <circle key={i} cx={x} cy={y} r={r} />;
          })}
        </g>
        {/* pines */}
        <g>
          {[[300, 26], [330, 22], [360, 26], [392, 34], [424, 48], [310, 36], [346, 32], [378, 36], [408, 50]].map(([px, py], i) => (
            <path key={i} d={`M ${px - 1.4} ${py + 1} L ${px} ${py - 2} L ${px + 1.4} ${py + 1} Z`}
              fill="#3a4a2a" stroke={ink} strokeWidth="0.2" />
          ))}
        </g>
      </g>

      {/* ── SWEETWATER RIVER — rushing through the gate ──────────── */}
      <g>
        {/* river leading into cleft from left, foaming through, exiting right */}
        <path
          d="M 0 142 Q 80 140 160 144 Q 200 146 212 145 L 212 142 Q 220 138 226 140
             L 254 140 Q 260 138 268 142 L 268 145 Q 280 146 320 144 Q 400 142 480 144"
          fill={LMK.water} stroke={ink} strokeWidth="0.5" opacity="0.85"
        />
        {/* white foam in the gate */}
        <g opacity="0.85" fill={LMK.paperWarm}>
          <ellipse cx="220" cy="142" rx="3" ry="0.8" />
          <ellipse cx="232" cy="141" rx="2.5" ry="0.6" />
          <ellipse cx="244" cy="141" rx="3" ry="0.7" />
          <ellipse cx="256" cy="142" rx="2.5" ry="0.7" />
        </g>
        {/* downstream wake */}
        <g opacity="0.7" stroke={LMK.paperWarm} fill="none" strokeWidth="0.5">
          <path d="M 270 144 q 4 -1 8 0 q 4 -1 8 0 q 4 -1 8 0" />
          <path d="M 296 145 q 6 -0.5 12 0 q 6 -0.5 12 0" />
        </g>
        {/* upstream water highlights */}
        <g opacity="0.55" stroke="#5a7280" fill="none" strokeWidth="0.4">
          <path d="M 40 142 q 6 -0.8 12 0 q 6 -0.8 12 0" />
          <path d="M 100 142 q 6 -0.8 12 0 q 6 -0.8 12 0" />
          <path d="M 340 144 q 6 -0.8 12 0" />
          <path d="M 400 144 q 6 -0.8 12 0" />
        </g>
        {/* willows on banks */}
        <ellipse cx="60" cy="148" rx="6" ry="2.5" fill={LMK.sageDark} stroke={ink} strokeWidth="0.3" />
        <ellipse cx="160" cy="149" rx="5" ry="2.5" fill={LMK.sageDark} stroke={ink} strokeWidth="0.3" />
        <ellipse cx="328" cy="149" rx="5" ry="2.5" fill={LMK.sageDark} stroke={ink} strokeWidth="0.3" />
        <ellipse cx="436" cy="149" rx="6" ry="2.5" fill={LMK.sageDark} stroke={ink} strokeWidth="0.3" />
      </g>

      {/* ── Foreground — sage flat, trail going AROUND the ridge ───── */}
      <rect x="0" y="150" width={LMK_VIEW_W} height="50" fill={LMK.parchment} opacity="0.55" />
      {/* trail curves AROUND on the right (south of ridge) */}
      <path
        d="M 0 178 Q 100 176 200 180 Q 280 184 340 175 Q 400 162 450 158 Q 470 156 480 156"
        stroke={LMK.earth} strokeWidth="1.2" fill="none" opacity="0.6"
      />
      <path
        d="M 0 184 Q 100 182 200 186 Q 280 190 340 181 Q 400 168 450 164"
        stroke={LMK.earth} strokeWidth="0.8" fill="none" opacity="0.5"
      />
      <text x="392" y="155" textAnchor="middle"
        fontFamily="IM Fell English, Georgia, serif" fontSize="6"
        fill={inkSoft} fontStyle="italic" opacity="0.55">
        trail bypass
      </text>

      {/* sage clumps */}
      <g opacity="0.6">
        {[16, 56, 100, 140, 200, 260, 380, 420].map((x, i) => {
          const y = 168 + (i % 3) * 6;
          return (
            <g key={i} transform={`translate(${x}, ${y})`}>
              <ellipse cx="0" cy="0" rx="3" ry="1.4" fill={LMK.sage} stroke={ink} strokeWidth="0.3" />
              <ellipse cx="-1.2" cy="-0.8" rx="1.6" ry="0.9" fill={LMK.sageLight} stroke={ink} strokeWidth="0.25" />
            </g>
          );
        })}
      </g>

      {/* ── Wagons on the bypass; pioneers gawking up at the gate ── */}
      <g>
        {/* one wagon on bypass trail */}
        <SmallWagonDG x={120} y={172} />
        <SmallWagonDG x={86} y={174} />
        <SmallWagonDG x={56} y={176} opacity={0.95} />

        {/* small group of figures who walked over to gawk */}
        <g transform="translate(180, 188)">
          {/* three figures looking UP at the gate */}
          <SmallPersonGazing x={0} y={0} />
          <SmallPersonGazing x={10} y={2} hat />
          <SmallPersonGazing x={20} y={1} />
          <SmallPersonGazing x={32} y={0} hat />
        </g>
      </g>

      {/* ── Caption ──────────────────────────────────────────────────── */}
      <text x="240" y="194" textAnchor="middle"
        fontFamily="IM Fell English, Georgia, serif" fontSize="8"
        fill={inkSoft} fontStyle="italic" opacity="0.85">
        Devil&rsquo;s Gate — the Sweetwater cleft
      </text>
    </g>
  );
}

function SmallWagonDG({ x, y, opacity = 1 }) {
  const ink = LMK.ink;
  return (
    <g transform={`translate(${x}, ${y})`} opacity={opacity}>
      {/* small ox team */}
      <g transform="translate(-9, 0)">
        <ellipse cx="0" cy="2" rx="2.4" ry="1.3" fill={LMK.earthLight} stroke={ink} strokeWidth="0.3" />
        <ellipse cx="2" cy="1.4" rx="1" ry="0.8" fill={LMK.earthLight} stroke={ink} strokeWidth="0.3" />
      </g>
      <g transform="translate(-16, 0)">
        <ellipse cx="0" cy="2" rx="2.4" ry="1.3" fill={LMK.earth} stroke={ink} strokeWidth="0.3" />
        <ellipse cx="2" cy="1.4" rx="1" ry="0.8" fill={LMK.earth} stroke={ink} strokeWidth="0.3" />
      </g>
      <rect x="0" y="0" width="12" height="4" fill={LMK.earth} stroke={ink} strokeWidth="0.3" />
      <path d="M 0 0 Q 6 -7 12 0 Z" fill={LMK.white} stroke={ink} strokeWidth="0.4" />
      <circle cx="2.5" cy="5" r="1.6" fill="none" stroke={ink} strokeWidth="0.3" />
      <circle cx="9.5" cy="5" r="1.6" fill="none" stroke={ink} strokeWidth="0.3" />
    </g>
  );
}

function SmallPersonGazing({ x, y, hat = false }) {
  const ink = LMK.ink;
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* head tilted UP — looking at the cleft */}
      <circle cx="0" cy="-3" r="0.9" fill={LMK.paperWarm} stroke={ink} strokeWidth="0.2" />
      {hat && <ellipse cx="0" cy="-4" rx="1.5" ry="0.3" fill={ink} />}
      <path d="M -1.2 -2 L 1.2 -2 L 1 2 L -1 2 Z" fill={LMK.earthDark} stroke={ink} strokeWidth="0.25" />
      <line x1="-0.6" y1="2" x2="-0.6" y2="5" stroke={ink} strokeWidth="0.4" />
      <line x1="0.6" y1="2" x2="0.6" y2="5" stroke={ink} strokeWidth="0.4" />
    </g>
  );
}

Object.assign(window, { DevilsGateArt });
