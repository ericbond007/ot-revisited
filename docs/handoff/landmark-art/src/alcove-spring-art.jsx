/* global React, LMK, LMK_VIEW_W, LMK_VIEW_H */

// ============================================================================
// AlcoveSpringArt — mile ~110, near the Big Blue / Independence Crossing
// ============================================================================
// Historical (Edwin Bryant 1846, Fremont 1842, Donner-Reed 1846):
//   • A spring "as cold and pure as if it had just been melted from ice"
//     gushing from a ledge of LIMESTONE rock, falling 10–12 ft into a basin.
//   • A natural ALCOVE — projecting shelving rock OVERHANGS the cascade.
//   • "The whole is buried in a variety of shrubbery of the richest verdure"
//     — surrounded by trees and lush undergrowth.
//   • Pioneer names CARVED into the soft limestone — Donner Party carved
//     "Alcove Spring" itself into the rock. Names also carved into trees.
//   • Famous as the Donner Party's first death (Sarah Keyes, 1846, consumption).
//   • Tallgrass prairie above; small branch creek emptying into the Big Blue.
//
// Composition: vertical hero — limestone alcove with cascade falling into pool,
// names carved in cliff face, lush green canopy of cottonwoods + sumac
// surrounding, a single emigrant hat resting on a rock (Sarah Keyes echo).
// ============================================================================

function AlcoveSpringArt() {
  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const stoneLight = "#d8c8a0";
  const stoneMid = "#a88e60";
  const stoneShadow = "#7a5e38";
  const moss = "#5a6438";
  const leaf = "#4a5828";
  const leafLight = "#7a8848";

  return (
    <g>
      {/* ── lush canopy fills the upper half ──────────────────────── */}
      <g>
        {/* big cottonwood crowns left */}
        <ellipse cx="60" cy="50" rx="50" ry="32" fill={leaf} stroke={ink} strokeWidth="0.5" />
        <ellipse cx="40" cy="42" rx="22" ry="16" fill={leafLight} opacity="0.65" />
        <ellipse cx="78" cy="58" rx="20" ry="14" fill={leafLight} opacity="0.55" />
        {/* canopy right */}
        <ellipse cx="420" cy="50" rx="50" ry="34" fill={leaf} stroke={ink} strokeWidth="0.5" />
        <ellipse cx="438" cy="42" rx="22" ry="16" fill={leafLight} opacity="0.65" />
        <ellipse cx="402" cy="58" rx="20" ry="14" fill={leafLight} opacity="0.55" />
        {/* center upper canopy */}
        <ellipse cx="240" cy="36" rx="80" ry="22" fill={leaf} opacity="0.85" stroke={ink} strokeWidth="0.4" />
        <ellipse cx="220" cy="30" rx="32" ry="12" fill={leafLight} opacity="0.65" />
        <ellipse cx="260" cy="32" rx="28" ry="11" fill={leafLight} opacity="0.55" />

        {/* tree trunks emerging */}
        <path d="M 56 80 L 54 60 L 62 60 L 60 80 Z" fill="#4a3220" stroke={ink} strokeWidth="0.4" />
        <path d="M 416 80 L 414 60 L 422 60 L 420 80 Z" fill="#4a3220" stroke={ink} strokeWidth="0.4" />
        {/* names carved into the left trunk */}
        <text x="58" y="74" fontSize="3" fontFamily="IM Fell English, Georgia, serif"
              fill={ink} textAnchor="middle" fontStyle="italic" opacity="0.7">J·F·R</text>
        <text x="58" y="78" fontSize="2.5" fontFamily="IM Fell English, Georgia, serif"
              fill={ink} textAnchor="middle" fontStyle="italic" opacity="0.6">'46</text>
      </g>

      {/* ── HERO: limestone alcove with overhang and cascade ───────── */}
      <g>
        {/* main rock face */}
        <path
          d="M 130 80 L 350 80 L 360 96 L 350 120 L 320 134 L 280 138 L 240 138 L 200 138 L 160 134 L 130 120 L 120 96 Z"
          fill={stoneLight} stroke={ink} strokeWidth="0.8"
        />
        {/* shelving overhang projecting forward — top arc */}
        <path
          d="M 140 80 Q 240 64 340 80 L 350 80 Q 240 70 130 80 Z"
          fill={stoneMid} stroke={ink} strokeWidth="0.6"
        />
        <path
          d="M 140 80 Q 240 78 340 80 L 350 86 Q 240 80 130 86 Z"
          fill={stoneShadow} opacity="0.7"
        />
        {/* shadow of the alcove cavity */}
        <path
          d="M 165 92 Q 240 86 315 92 L 320 110 Q 240 116 160 110 Z"
          fill={stoneShadow} opacity="0.55"
        />
        {/* horizontal limestone strata */}
        <g stroke={stoneShadow} strokeWidth="0.4" fill="none" opacity="0.55">
          <path d="M 130 100 Q 240 96 350 100" />
          <path d="M 130 110 Q 240 106 350 110" />
          <path d="M 130 120 Q 240 116 350 120" />
          <path d="M 130 128 Q 240 124 350 128" />
        </g>

        {/* moss on the wet shelf and in the alcove */}
        <g fill={moss} opacity="0.7">
          <ellipse cx="180" cy="84" rx="6" ry="1.4" />
          <ellipse cx="220" cy="83" rx="8" ry="1.4" />
          <ellipse cx="280" cy="84" rx="7" ry="1.4" />
          <ellipse cx="320" cy="86" rx="5" ry="1.3" />
          {/* hanging vines */}
          <path d="M 170 88 q 0 6 -2 10" stroke={moss} strokeWidth="0.5" fill="none" />
          <path d="M 200 88 q 0 8 1 12" stroke={moss} strokeWidth="0.5" fill="none" />
          <path d="M 280 88 q 0 8 -1 12" stroke={moss} strokeWidth="0.5" fill="none" />
          <path d="M 310 88 q 0 6 2 10" stroke={moss} strokeWidth="0.5" fill="none" />
        </g>

        {/* CARVED NAMES on the cliff face — the inscription record */}
        <g opacity="0.75">
          <text x="160" y="116" fontSize="3.5" fontFamily="IM Fell English, Georgia, serif"
                fill={stoneShadow} fontStyle="italic">ALCOVE SPRING</text>
          <text x="200" y="124" fontSize="2.6" fontFamily="IM Fell English, Georgia, serif"
                fill={stoneShadow} fontStyle="italic">Bryant · 1846</text>
          <text x="262" y="116" fontSize="2.6" fontFamily="IM Fell English, Georgia, serif"
                fill={stoneShadow} fontStyle="italic">J·F·Reed</text>
          <text x="290" y="124" fontSize="2.4" fontFamily="IM Fell English, Georgia, serif"
                fill={stoneShadow} fontStyle="italic">Donner</text>
          <text x="232" y="132" fontSize="2.4" fontFamily="IM Fell English, Georgia, serif"
                fill={stoneShadow} fontStyle="italic" textAnchor="middle">Whitman · '43</text>
        </g>

        {/* THE CASCADE — falling water from shelf to pool */}
        <g>
          <path d="M 226 88 Q 230 110 232 138 L 244 138 Q 246 110 250 88 Z"
                fill={LMK.water} opacity="0.65" />
          <path d="M 230 92 L 232 136" stroke={LMK.white} strokeWidth="0.5" opacity="0.7" />
          <path d="M 236 90 L 238 136" stroke={LMK.white} strokeWidth="0.4" opacity="0.55" />
          <path d="M 244 92 L 246 136" stroke={LMK.white} strokeWidth="0.45" opacity="0.65" />
        </g>
      </g>

      {/* ── basin pool below ──────────────────────────────────────── */}
      <g>
        <ellipse cx="240" cy="148" rx="62" ry="10" fill={LMK.water} opacity="0.7" stroke={ink} strokeWidth="0.5" />
        <ellipse cx="240" cy="146" rx="56" ry="6" fill="#a8c4c8" opacity="0.5" />
        {/* splash + ripples */}
        <ellipse cx="238" cy="143" rx="6" ry="1.4" fill={LMK.white} opacity="0.7" />
        <g stroke={LMK.white} strokeWidth="0.4" fill="none" opacity="0.6">
          <ellipse cx="240" cy="148" rx="40" ry="6.5" />
          <ellipse cx="240" cy="148" rx="50" ry="8" />
        </g>
        {/* outlet stream toward Big Blue */}
        <path d="M 296 152 Q 360 156 420 158 Q 460 159 480 160" stroke={LMK.water} strokeWidth="2" fill="none" opacity="0.7" />
        <path d="M 184 152 Q 120 156 60 158 Q 20 159 0 160" stroke={LMK.water} strokeWidth="2" fill="none" opacity="0.7" />
      </g>

      {/* ── undergrowth at base of cliff ─────────────────────────── */}
      <g>
        {[140, 168, 198, 280, 312, 342].map((x, i) => (
          <g key={i} transform={`translate(${x},${140 + (i % 2) * 2})`}>
            <ellipse cx="0" cy="0" rx="6" ry="2.4" fill={leaf} stroke={ink} strokeWidth="0.35" />
            <ellipse cx="-2" cy="-1" rx="3" ry="1.5" fill={leafLight} opacity="0.7" />
          </g>
        ))}
      </g>

      {/* ── lone bonnet resting on a rock — Sarah Keyes echo ────── */}
      <g transform="translate(96 156)">
        <path d="M -3 0 Q 0 -4 3 0 L 4 1 L -4 1 Z" fill={LMK.white} stroke={ink} strokeWidth="0.4" />
        <path d="M -4 1 L 4 1 L 5 2 L -5 2 Z" fill={LMK.parchmentSh} stroke={ink} strokeWidth="0.3" />
        <ellipse cx="0" cy="3" rx="6" ry="0.7" fill={ink} opacity="0.2" />
      </g>

      {/* ── prairie ground foreground ─────────────────────────── */}
      <rect x="0" y="160" width={LMK_VIEW_W} height={LMK_VIEW_H - 160} fill={LMK.parchment} opacity="0.55" />
      <g opacity="0.6" stroke={LMK.sageDark} strokeWidth="0.4" fill="none">
        {[20, 60, 110, 350, 400, 450].map((x, i) => {
          const y = 174 + (i % 3) * 4;
          return (
            <g key={i} transform={`translate(${x},${y})`}>
              <path d="M 0 0 q 1 -3 2 -5" />
              <path d="M 1 0 q 0 -2 2 -4" />
              <path d="M 2 0 q 1 -3 3 -4.5" />
            </g>
          );
        })}
      </g>

      {/* ── caption ─────────────────────────────────────────── */}
      <text x="240" y="194" textAnchor="middle"
            fontFamily="IM Fell English, Georgia, serif" fontSize="8"
            fill={inkSoft} fontStyle="italic" opacity="0.85">
        Alcove Spring — &ldquo;a most romantic spot&rdquo;
      </text>
    </g>
  );
}

Object.assign(window, { AlcoveSpringArt });
