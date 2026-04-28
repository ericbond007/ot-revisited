/* global React, LI, HybridBadge */

// ============================================================================
// ARRIVAL LANDMARK ICONS — 11 stop badges
// ============================================================================
// Each landmark with an entry in LANDMARK_ARRIVAL_EVENTS gets a hybrid badge.
// These are the iconic landscape features — pure-natural, no architecture.
// Composition rules per repo body text:
//   alcove_spring     — clear pool under sandstone alcove + cottonwoods
//   ash_hollow        — Windlass Hill descent + cedar/ash grove below
//   chimney_rock      — clay/sandstone spire on the plain
//   scotts_bluff      — 800ft sandstone bluff + Mitchell Pass
//   register_cliff    — long sandstone face covered in carved names
//   independence_rock — granite "turtle" squatting on prairie, names on it
//   devils_gate       — narrow rock cleft, Sweetwater cuts through
//   south_pass        — broad gentle saddle in the Rockies + Continental Divide
//   pacific_springs   — first west-flowing water, modest bubbling spring
//   soda_springs      — bubbling carbonated craters, hissing steam
//   laurel_hill       — steep muddy descent through laurel/forest
// ============================================================================

// ── ALCOVE SPRING ─────────────────────────────────────────────────────────
function Lmk_AlcoveSpring() {
  return (
    <HybridBadge tone="warm" id="alcove">
      {/* sandstone alcove (curved overhang) */}
      <path d="M 4 12 Q 4 7 12 7 Q 20 7 20 12 L 20 19 L 4 19 Z"
            fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.5" strokeLinejoin="round" />
      {/* shadow under overhang */}
      <path d="M 5 11 Q 5 8 12 8 Q 19 8 19 11 L 19 14 L 5 14 Z"
            fill={LI.ink} opacity="0.32" />
      {/* names carved on the soft rock */}
      <line x1="7"  y1="10" x2="9"  y2="10" stroke={LI.bone} strokeWidth="0.4" />
      <line x1="10" y1="11" x2="13" y2="11" stroke={LI.bone} strokeWidth="0.4" />
      <line x1="14" y1="10" x2="17" y2="10" stroke={LI.bone} strokeWidth="0.4" />
      {/* cottonwood right of alcove */}
      <ellipse cx="22" cy="11" rx="2" ry="3" fill={LI.sageDark} opacity="0.6" />
      {/* clear pool */}
      <ellipse cx="12" cy="17.5" rx="5" ry="1.3" fill={LI.water} stroke={LI.ink} strokeWidth="0.4" />
      <path d="M 8 17.2 Q 12 16.8 16 17.2" stroke={LI.white} strokeWidth="0.3" fill="none" opacity="0.5" />
    </HybridBadge>
  );
}

// ── ASH HOLLOW (Windlass Hill descent) ─────────────────────────────────────
function Lmk_AshHollow() {
  return (
    <HybridBadge tone="warm" id="ashhollow">
      {/* tall hill at left — Windlass Hill, the 300ft drop */}
      <path d="M 0 6 L 6 7 L 11 19 L 0 19 Z"
            fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.5" strokeLinejoin="round" />
      {/* shadow on east face of hill */}
      <path d="M 6 7 L 11 19 L 8 19 L 5 10 Z" fill={LI.ink} opacity="0.25" />
      {/* trail rut down the hill */}
      <path d="M 4 7.5 Q 6 12 10 19" stroke={LI.ink} strokeWidth="0.5" fill="none" opacity="0.55" />
      <path d="M 5 8 Q 7 12 11 19" stroke={LI.ink} strokeWidth="0.4" fill="none" opacity="0.4" />
      {/* hollow / shade trees at the bottom right */}
      <ellipse cx="16" cy="13" rx="2.5" ry="3.5" fill={LI.sageDark} opacity="0.7" />
      <ellipse cx="20" cy="14" rx="2.2" ry="3" fill={LI.sageDark} opacity="0.65" />
      <line x1="16" y1="13" x2="16" y2="19" stroke={LI.ink} strokeWidth="0.4" opacity="0.7" />
      <line x1="20" y1="14" x2="20" y2="19" stroke={LI.ink} strokeWidth="0.4" opacity="0.7" />
    </HybridBadge>
  );
}

// ── CHIMNEY ROCK ──────────────────────────────────────────────────────────
function Lmk_ChimneyRock() {
  return (
    <HybridBadge tone="warm" id="chimney">
      <rect x="1" y="18" width="22" height="5" fill={LI.parchment} opacity="0.85" />
      <ellipse cx="12" cy="11" rx="4.5" ry="6" fill={LI.paperWarm} opacity="0.5" />
      {/* distant ridge */}
      <path d="M 1 18 Q 6 17 12 17.5 Q 17 18 23 17 L 23 19 L 1 19 Z"
            fill={LI.sage} opacity="0.4" />
      {/* conical pedestal */}
      <path d="M 7 19 L 10.5 11 L 13.5 11 L 17 19 Z"
            fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.5" strokeLinejoin="round" />
      {/* spire */}
      <path d="M 10.5 11 L 11 5 L 11.5 4 L 12.5 4 L 13 5 L 13.5 11 Z"
            fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.5" strokeLinejoin="round" />
      {/* shadow side */}
      <path d="M 12 4 L 13 5 L 13.5 11 L 17 19 L 12 19 Z" fill={LI.ink} opacity="0.22" />
    </HybridBadge>
  );
}

// ── SCOTTS BLUFF (with Mitchell Pass through it) ──────────────────────────
function Lmk_ScottsBluff() {
  return (
    <HybridBadge tone="warm" id="scotts">
      <rect x="1" y="18" width="22" height="5" fill={LI.parchment} opacity="0.85" />
      {/* massive bluff with notch (Mitchell Pass) */}
      <path d="M 1 16 L 3 11 L 6 8 L 9 9 L 10 13 L 14 13 L 15 9 L 18 8 L 21 11 L 23 16 L 23 19 L 1 19 Z"
            fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.5" strokeLinejoin="round" />
      {/* shadow on east side of pass */}
      <path d="M 14 13 L 15 9 L 18 8 L 21 11 L 23 16 L 23 19 L 14 19 Z" fill={LI.ink} opacity="0.2" />
      {/* trail through the pass */}
      <path d="M 11 19 Q 12 15 13 19" fill={LI.parchment} stroke={LI.ink} strokeWidth="0.3" opacity="0.7" />
      {/* horizontal sandstone striations */}
      <line x1="3" y1="14" x2="9.5" y2="14" stroke={LI.ink} strokeWidth="0.2" opacity="0.45" />
      <line x1="14.5" y1="14" x2="21" y2="14" stroke={LI.ink} strokeWidth="0.2" opacity="0.45" />
      <line x1="3.5" y1="16" x2="10" y2="16" stroke={LI.ink} strokeWidth="0.2" opacity="0.4" />
      <line x1="14" y1="16" x2="20.5" y2="16" stroke={LI.ink} strokeWidth="0.2" opacity="0.4" />
    </HybridBadge>
  );
}

// ── REGISTER CLIFF (long sandstone face full of names) ────────────────────
function Lmk_RegisterCliff() {
  return (
    <HybridBadge tone="warm" id="register">
      <rect x="1" y="18" width="22" height="5" fill={LI.parchment} opacity="0.85" />
      {/* tall cliff face — taller than wide, dominates */}
      <path d="M 4 5 L 20 5 L 20 19 L 4 19 Z"
            fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.5" strokeLinejoin="round" />
      {/* horizontal striations */}
      <line x1="4" y1="8"  x2="20" y2="8"  stroke={LI.ink} strokeWidth="0.25" opacity="0.4" />
      <line x1="4" y1="11" x2="20" y2="11" stroke={LI.ink} strokeWidth="0.25" opacity="0.35" />
      <line x1="4" y1="15" x2="20" y2="15" stroke={LI.ink} strokeWidth="0.25" opacity="0.3" />
      {/* names — dense scratchy marks */}
      <g stroke={LI.ink} strokeWidth="0.35" opacity="0.7">
        <line x1="6"  y1="7"  x2="9"  y2="7" />
        <line x1="10" y1="7"  x2="13" y2="7" />
        <line x1="14" y1="7"  x2="17" y2="7" />
        <line x1="6"  y1="9.5" x2="8"  y2="9.5" />
        <line x1="9"  y1="9.5" x2="13" y2="9.5" />
        <line x1="14" y1="9.5" x2="18" y2="9.5" />
        <line x1="5.5" y1="12.5" x2="9" y2="12.5" />
        <line x1="10" y1="12.5" x2="14" y2="12.5" />
        <line x1="15" y1="12.5" x2="18.5" y2="12.5" />
        <line x1="6"  y1="14" x2="10" y2="14" />
        <line x1="11" y1="14" x2="14" y2="14" />
        <line x1="15" y1="14" x2="18" y2="14" />
        <line x1="5.5" y1="16.5" x2="8.5" y2="16.5" />
        <line x1="9.5" y1="16.5" x2="13" y2="16.5" />
        <line x1="14" y1="16.5" x2="17" y2="16.5" />
      </g>
      {/* a small tree at the base for scale */}
      <ellipse cx="2.5" cy="17" rx="1.3" ry="2" fill={LI.sageDark} opacity="0.6" />
    </HybridBadge>
  );
}

// ── INDEPENDENCE ROCK (granite "turtle") ──────────────────────────────────
function Lmk_IndependenceRock() {
  return (
    <HybridBadge tone="warm" id="indeprock">
      <rect x="1" y="18" width="22" height="5" fill={LI.parchment} opacity="0.85" />
      {/* squat granite dome — wider than tall, like a turtle */}
      <path d="M 2 19 Q 2 9 12 8 Q 22 9 22 19 Z"
            fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.5" strokeLinejoin="round" />
      {/* shadow side */}
      <path d="M 12 8 Q 22 9 22 19 L 12 19 Z" fill={LI.ink} opacity="0.22" />
      {/* small light side highlight */}
      <path d="M 4 14 Q 5 11 8 10" stroke={LI.bone} strokeWidth="0.5" fill="none" opacity="0.5" />
      {/* names smeared in axle grease */}
      <g stroke={LI.ink} strokeWidth="0.3" opacity="0.7">
        <line x1="5"  y1="14" x2="7"  y2="14" />
        <line x1="8"  y1="13" x2="11" y2="13" />
        <line x1="13" y1="13" x2="16" y2="13" />
        <line x1="6"  y1="16" x2="9"  y2="16" />
        <line x1="10" y1="15.5" x2="14" y2="15.5" />
        <line x1="15" y1="16" x2="18" y2="16" />
      </g>
    </HybridBadge>
  );
}

// ── DEVIL'S GATE (narrow Sweetwater cleft) ────────────────────────────────
function Lmk_DevilsGate() {
  return (
    <HybridBadge tone="warm" id="devils">
      {/* two sheer cliffs with narrow gap between */}
      <path d="M 1 19 L 1 6 L 8 4 L 10.5 6 L 10.5 19 Z"
            fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.5" strokeLinejoin="round" />
      <path d="M 13.5 19 L 13.5 6 L 16 4 L 23 6 L 23 19 Z"
            fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.5" strokeLinejoin="round" />
      {/* shadow sides — both faces near the gap go dark */}
      <path d="M 8 4 L 10.5 6 L 10.5 19 L 8 19 Z" fill={LI.ink} opacity="0.3" />
      <path d="M 13.5 6 L 16 4 L 16 19 L 13.5 19 Z" fill={LI.ink} opacity="0.3" />
      {/* river flowing through the cleft */}
      <rect x="10.5" y="10" width="3" height="9" fill={LI.water} opacity="0.7" />
      <path d="M 10.5 12 Q 12 11.6 13.5 12" stroke={LI.ink} strokeWidth="0.3" fill="none" opacity="0.5" />
      <path d="M 10.5 15 Q 12 14.6 13.5 15" stroke={LI.ink} strokeWidth="0.3" fill="none" opacity="0.5" />
      <path d="M 10.5 18 Q 12 17.6 13.5 18" stroke={LI.ink} strokeWidth="0.3" fill="none" opacity="0.5" />
      {/* horizontal striations on cliffs */}
      <line x1="2"  y1="10" x2="9.5"  y2="10" stroke={LI.ink} strokeWidth="0.2" opacity="0.45" />
      <line x1="14.5" y1="10" x2="22" y2="10" stroke={LI.ink} strokeWidth="0.2" opacity="0.45" />
      <line x1="2"  y1="14" x2="9.5"  y2="14" stroke={LI.ink} strokeWidth="0.2" opacity="0.4" />
      <line x1="14.5" y1="14" x2="22" y2="14" stroke={LI.ink} strokeWidth="0.2" opacity="0.4" />
    </HybridBadge>
  );
}

// ── SOUTH PASS (broad gentle saddle, Continental Divide) ──────────────────
function Lmk_SouthPass() {
  return (
    <HybridBadge tone="warm" id="southpass">
      {/* sage flat */}
      <rect x="1" y="14" width="22" height="5" fill={LI.sage} opacity="0.4" />
      {/* very gentle saddle — two low rolling shoulders */}
      <path d="M 1 19 Q 6 14 12 13.5 Q 18 14 23 19 Z"
            fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.5" strokeLinejoin="round" />
      {/* shadow on east shoulder */}
      <path d="M 12 13.5 Q 18 14 23 19 L 12 19 Z" fill={LI.ink} opacity="0.18" />
      {/* distant Wind River peaks behind, far smaller — faint blue */}
      <path d="M 3 11 L 6 7 L 8 9 L 10 6 L 12 8 L 14 6 L 16 9 L 18 7 L 21 11 L 21 13 L 3 13 Z"
            fill={LI.water} opacity="0.45" stroke={LI.ink} strokeWidth="0.3" strokeLinejoin="round" />
      {/* trail across the saddle */}
      <path d="M 1 19 Q 12 17 23 19" stroke={LI.ink} strokeWidth="0.4" fill="none" opacity="0.6" strokeDasharray="0.8 0.6" />
      {/* small wagon dot on the saddle */}
      <g transform="translate(10.5 16)">
        <path d="M 0 1 Q 1.5 -0.5 3 1 Z" fill={LI.white} stroke={LI.ink} strokeWidth="0.3" />
        <rect x="0" y="1" width="3" height="0.7" fill={LI.ink} opacity="0.6" />
      </g>
    </HybridBadge>
  );
}

// ── PACIFIC SPRINGS ───────────────────────────────────────────────────────
function Lmk_PacificSprings() {
  return (
    <HybridBadge tone="warm" id="pacific">
      {/* sage prairie ground */}
      <rect x="1" y="15" width="22" height="4" fill={LI.sage} opacity="0.4" />
      {/* small mound + spring pool */}
      <ellipse cx="12" cy="17" rx="9" ry="2.5" fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.4" />
      <path d="M 12 17 Q 20 16 21 17.5" fill="none" stroke={LI.ink} strokeWidth="0.3" opacity="0.4" />
      {/* clear pool */}
      <ellipse cx="12" cy="16" rx="3" ry="1.1" fill={LI.water} stroke={LI.ink} strokeWidth="0.4" />
      {/* arrow showing water flowing WEST (right side of pool) */}
      <path d="M 15 16 L 19 16" stroke={LI.ink} strokeWidth="0.5" fill="none" />
      <path d="M 18 15.3 L 19 16 L 18 16.7" stroke={LI.ink} strokeWidth="0.5" fill="none" />
      {/* compass-rose hint above */}
      <g transform="translate(12 8)" stroke={LI.ink} fill="none" strokeWidth="0.4">
        <circle r="2.5" fill={LI.parchment} stroke={LI.ink} strokeWidth="0.4" />
        <line x1="0" y1="-2.5" x2="0" y2="2.5" />
        <line x1="-2.5" y1="0" x2="2.5" y2="0" />
        <text x="2.6" y="0.5" fontSize="2" fontFamily="Georgia, serif" fill={LI.ink} stroke="none">W</text>
      </g>
    </HybridBadge>
  );
}

// ── SODA SPRINGS (bubbling carbonated craters) ────────────────────────────
function Lmk_SodaSprings() {
  return (
    <HybridBadge tone="warm" id="soda">
      <rect x="1" y="15" width="22" height="4" fill={LI.earthLight} opacity="0.5" />
      {/* multiple small craters */}
      <ellipse cx="6"  cy="16" rx="2.5" ry="1" fill={LI.water} stroke={LI.ink} strokeWidth="0.4" />
      <ellipse cx="13" cy="17" rx="3.5" ry="1.2" fill={LI.water} stroke={LI.ink} strokeWidth="0.4" />
      <ellipse cx="19" cy="16" rx="2"  ry="0.9" fill={LI.water} stroke={LI.ink} strokeWidth="0.4" />
      {/* bubbles + steam plumes */}
      <circle cx="5"  cy="15.5" r="0.4" fill={LI.bone} opacity="0.8" />
      <circle cx="7"  cy="15.7" r="0.3" fill={LI.bone} opacity="0.7" />
      <circle cx="12" cy="16.3" r="0.45" fill={LI.bone} opacity="0.8" />
      <circle cx="14" cy="16.5" r="0.35" fill={LI.bone} opacity="0.7" />
      <circle cx="18.5" cy="15.6" r="0.35" fill={LI.bone} opacity="0.7" />
      {/* steam plumes rising */}
      <path d="M 6 14 Q 5 11 7 9 Q 8 7 6.5 5"
            stroke={LI.ink} strokeWidth="0.4" fill="none" opacity="0.5" />
      <path d="M 13 13 Q 14 10 12 8 Q 11 6 13 4"
            stroke={LI.ink} strokeWidth="0.4" fill="none" opacity="0.55" />
      <path d="M 19 14 Q 20 11 19 9"
            stroke={LI.ink} strokeWidth="0.4" fill="none" opacity="0.5" />
    </HybridBadge>
  );
}

// ── LAUREL HILL (steep muddy descent through forest) ──────────────────────
function Lmk_LaurelHill() {
  return (
    <HybridBadge tone="warm" id="laurel">
      {/* Cascades forest backdrop */}
      <ellipse cx="3"  cy="9" rx="2.5" ry="4" fill={LI.sageDark} opacity="0.7" />
      <ellipse cx="20" cy="8" rx="2.5" ry="4.5" fill={LI.sageDark} opacity="0.75" />
      <ellipse cx="11" cy="5" rx="2" ry="3" fill={LI.sageDark} opacity="0.65" />
      {/* the steep slope itself, dropping right→left */}
      <path d="M 1 19 L 23 5 L 23 19 Z"
            fill={LI.earth} stroke={LI.ink} strokeWidth="0.5" strokeLinejoin="round" />
      {/* mud / wetness */}
      <path d="M 1 19 L 23 5 L 23 19 Z" fill={LI.ink} opacity="0.18" />
      {/* twin trail ruts on the slope */}
      <line x1="3"  y1="18" x2="20" y2="7"  stroke={LI.ink} strokeWidth="0.5" opacity="0.7" />
      <line x1="5"  y1="19" x2="22" y2="8"  stroke={LI.ink} strokeWidth="0.45" opacity="0.6" />
      {/* a wagon snubbed to a tree, lowering */}
      <g transform="translate(13 11) rotate(-30)">
        <path d="M 0 1.5 Q 1.8 -0.8 3.6 1.5 Z" fill={LI.white} stroke={LI.ink} strokeWidth="0.4" />
        <rect x="0" y="1.5" width="3.6" height="1" fill={LI.ink} opacity="0.7" />
        <circle cx="0.6" cy="2.6" r="0.4" fill="none" stroke={LI.ink} strokeWidth="0.3" />
        <circle cx="3.0" cy="2.6" r="0.4" fill="none" stroke={LI.ink} strokeWidth="0.3" />
      </g>
      {/* rope from wagon up to tree */}
      <line x1="14.5" y1="10.8" x2="20" y2="6" stroke={LI.ink} strokeWidth="0.3" opacity="0.6" strokeDasharray="0.6 0.4" />
    </HybridBadge>
  );
}

Object.assign(window, {
  Lmk_AlcoveSpring, Lmk_AshHollow, Lmk_ChimneyRock, Lmk_ScottsBluff,
  Lmk_RegisterCliff, Lmk_IndependenceRock, Lmk_DevilsGate, Lmk_SouthPass,
  Lmk_PacificSprings, Lmk_SodaSprings, Lmk_LaurelHill,
});
