// ox-team.jsx — Ox SVG team, side profile facing LEFT.
//
// REFERENCE: 19th-century working oxen yoked in pairs (Hereford / Devon /
// "pied" red-and-white draft cattle). Source idiom: period engravings &
// Wisconsin Historical Society photos of bullock teams. Each pair shares
// a single bow yoke; the front pair's yoke connects via a pole to the
// wagon. Trailing pairs link via chains.
//
// COORDINATE SYSTEM (per ox, ox-local units):
//   origin (0, 0) = ground directly under the shoulder
//   +x = backward (toward wagon, the right side of screen)
//   -x = forward (away from wagon, the left side of screen)
//   -y = up (sky)
//   +y = down (ground / shadow)
//
// One ox at full size: ~22 long (nose to tail-tip), shoulder height 14,
// leg length 7, body depth 5. Slightly TALLER and LEANER than the prior
// draft; less potato-shaped.
//
// EXPORTS: Ox, OxTeam, OxYoke, OxPole.
// USAGE: <OxTeam count={4} gaitPhase={t} hookX={...} hookY={...} />
//        Where (hookX, hookY) is the wagon's tongue-tip in PARENT units.
//        OxTeam will render itself so its own pole tip lands at (hookX, hookY).

const OX_INK    = "#3a1a08";          // matches wagon ink
const OX_RED    = "#8a3a18";          // primary red ("rust" in palette)
const OX_RED_LT = "#a85428";          // sun-side
const OX_RED_DK = "#5a2410";          // shadow-side
const OX_WHITE  = "#efe4c8";          // pied white (parchment-tinted)
const OX_WHITE_SH = "#cbbb95";        // white shadow
const OX_HORN   = "#d8c49a";          // horn keratin
const OX_HORN_TIP = "#2a1004";
const OX_PINK   = "#c0907a";          // muzzle
const OX_HOOF   = "#1a0a04";

const YOKE_WOOD = "#8a5a2a";          // matches wagon wood
const YOKE_DARK = "#5a3a1a";
const CHAIN_INK = "#2a1a08";
const POLE_WOOD = "#7a4a20";

// ───────────────────────────────────────────────────────────────────────────
// Single ox — side profile, facing LEFT.
// Drawn at ox-local scale. Caller wraps in <g transform> to place.
//
// The ox is built around real anatomical landmarks:
//   • withers (shoulder hump) at (-3, -14) — highest point of back
//   • hip (haunch) at (8, -13) — second hump, slightly lower than withers
//   • brisket (front of chest) drops below belly to (-5, -7.5)
//   • neck slopes from withers down-and-forward to head base at (-9, -11)
//   • head anchored at (-11, -10), nose at (-13.5, -9)
//   • horns: short, curve forward+up from poll
//   • tail at (10, -13), drops to (12, -8)
// ───────────────────────────────────────────────────────────────────────────
function Ox({
  // gait: "walking" (default — animated stride) or "stopped" (planted, idle).
  gait = "walking",
  // gaitPhase: 0..1 walking cycle. 0 = leftmost stride. Ignored when stopped.
  gaitPhase = 0,
  // swingScale: per-ox amplitude jitter (0.85..1.15 typical). Each animal
  // walks slightly differently — tired, vigorous, sore foot, etc.
  swingScale = 1,
  // strideOffset: per-ox phase shift (0..1). Yoked pairs are NOT in lockstep;
  // a small offset (e.g. 0.04) adds biological variance.
  strideOffset = 0,
  // mirror: render this ox slightly behind another (the "far" ox of a yoked
  // pair) — partial transparency, slight x-shift, no full body.
  far = false,
  // tone: a small per-ox color jitter so adjacent oxen aren't identical.
  // 0 = pure red+white, 1 = darker, -1 = lighter.
  tone = 0,
  // markings: which markings pattern.
  //   "pied"  — red back, white belly + face blaze (default)
  //   "solid" — solid red, no white belly (for variety in larger teams)
  markings = "pied",
}) {
  // ── gait math ───────────────────────────────────────────────────────────
  // Diagonal pairs: front-left + rear-right swing together; opposite pair
  // alternates. Real oxen walk slowly so swings are small.
  // When stopped, all swings/lifts collapse to 0 — the ox stands planted.
  const stopped = gait === "stopped";
  const t = ((gaitPhase + strideOffset) % 1) * Math.PI * 2;
  // Slow, heavy ox walk: small swings, low foot-clearance. Real oxen at
  // a draft pace barely lift their hooves — they shuffle/drag forward.
  // Per-ox swingScale lets each animal stride a bit differently.
  const baseSwing = 0.55 * swingScale;
  const swA = stopped ? 0 : Math.sin(t) * baseSwing;
  const swB = stopped ? 0 : Math.sin(t + Math.PI) * baseSwing;
  const liftA = stopped ? 0 : Math.max(0, swA) * 0.7;
  const liftB = stopped ? 0 : Math.max(0, swB) * 0.7;
  // No per-ox body bounce. The whole TEAM bobs as one (handled at OxTeam
  // level) so the body, yoke, ropes and wagon ride together. A double-
  // frequency per-ox bounce reads as bouncing/trotting, not walking.
  const bounce = 0;

  // tone-adjusted body color
  const bodyRed   = tone < 0 ? OX_RED_LT : tone > 0 ? OX_RED_DK : OX_RED;
  const bodyRedDk = tone > 0 ? "#3a1408" : OX_RED_DK;
  // Far oxen are NOT transparent — solid body, just slightly tucked behind
  // the near ox via x/y offset in the parent. Opacity stays 1 so there is
  // no see-through / color-shift / "ghost" effect.
  const opacity = 1;

  return (
    <g transform={`translate(0 ${-bounce})`} opacity={opacity}>
      {/* ── ground shadow ──────────────────────────────────────────────── */}
      {!far && (
        <ellipse cx="-1" cy="0.4" rx="11" ry="0.85"
                 fill={OX_INK} opacity="0.34" />
      )}

      {/* ═════════ FAR-SIDE LEGS (drawn first, dim) ═════════════════════ */}
      {/* Front-far leg (rear-right diagonal pair) */}
      <Leg hipX={-2.5} hipY={-9} sw={swB} lift={liftB}
           sock={markings === "pied"} far />
      {/* Rear-far leg */}
      <Leg hipX={7} hipY={-8.5} sw={swA} lift={liftA}
           sock={markings === "pied"} far />

      {/* ═════════ BODY MASS ════════════════════════════════════════════ */}
      {/* The body is built as TWO overlapping silhouettes: a bigger red
          shell (back/sides), and a lower white belly that overlaps. This
          gives the pied red-on-top, white-below look without per-pixel
          patchwork. */}

      {/* ── red back/shoulder/haunch shell ── */}
      {/* Walk the silhouette anatomically:
            start at neck base (top of brisket), up over withers,
            along spine to hip, down over haunch, under belly back to brisket. */}
      <path d={`
          M -5.5 -10
          C -5.2 -12.0, -4.0 -13.4, -3.0 -14.0
          C -1.0 -14.4,  4.0 -14.4,  6.5 -14.0
          C  8.5 -13.6,  9.6 -12.4, 10.0 -11.0
          L 10.0  -8.0
          C  9.0  -7.6,  6.0  -7.4,  3.0  -7.5
          C  0.0  -7.4, -3.0  -7.6, -5.0  -8.0
          L -5.5 -10 Z
        `}
        fill={bodyRed} stroke={OX_INK} strokeWidth="0.6"
        strokeLinejoin="round" />

      {/* ── topline highlight: a very soft, low-opacity wedge along the
            spine. Both edges curve gently and the wedge tapers to nothing
            at each end, so there’s no straight line to read as a seam. */}
      <path d={`
          M -2.4 -13.5
          C -0.4 -13.95, 2.6 -13.95, 4.6 -13.55
          C  6.4 -13.15, 7.8 -12.55, 8.8 -11.85
          C  8.6 -11.65, 8.4 -11.55, 8.2 -11.55
          C  7.4 -12.15, 6.2 -12.55, 4.4 -12.75
          C  2.0 -12.9,  -0.4 -12.85, -2.0 -12.55
          C -2.3 -12.85, -2.4 -13.2, -2.4 -13.5 Z
        `}
        fill={OX_RED_LT} opacity="0.30" />

      {/* NOTE — earlier drafts added engraving-style hatch marks on the
          haunch and shoulder, plus a white flank patch breaking up the
          red field. Removed: at this scale they read as confusing line
          noise rather than as muscle definition, and the user noted the
          ox was hard to recognize. The two highlight strokes above
          (withers + hip) are enough to suggest mass; the silhouette and
          its ink outline carry the rest. */}

      {/* ── white belly (pied only) ──
          To kill the “bacon-fat stripe” look, the belly is rendered as a
          rounded LOBE (not a long horizontal slab). The top edge dips and
          rises like a real cow’s underline; the ends taper up into the
          brisket and rear flank instead of running flat. Three soft red
          dapples sit over the seam at varying opacities so the red→white
          transition feels feathered, not painted. */}
      {markings === "pied" && (
        <>
          <path d={`
              M -4.6 -7.6
              C -3.6 -7.4, -2.6 -7.4, -1.6 -7.6
              C -0.4 -7.9,  0.8 -8.0,  2.0 -7.95
              C  3.4 -7.9,  4.6 -7.7,  5.8 -7.6
              C  7.0 -7.5,  8.2 -7.55,  9.2 -7.7
              L  9.4 -7.0
              C  8.4 -6.5,  6.4 -6.25,  3.4 -6.3
              C  0.6 -6.3, -2.2 -6.5, -4.6 -7.0
              C -4.9 -7.25, -4.9 -7.45, -4.6 -7.6 Z
            `}
            fill={OX_WHITE} />
          {/* feathering dapples — three soft red brushes along the seam,
              uneven so it doesn't read as a single line of edge color. */}
          <ellipse cx="-2.4" cy="-7.5" rx="1.6" ry="0.45"
                   fill={bodyRed} opacity="0.28" />
          <ellipse cx="2.6" cy="-7.85" rx="2.2" ry="0.4"
                   fill={bodyRed} opacity="0.22" />
          <ellipse cx="7.6" cy="-7.55" rx="1.4" ry="0.4"
                   fill={bodyRed} opacity="0.30" />
        </>
      )}

      {/* ═════════ NEAR-SIDE LEGS (drawn over body) ════════════════════ */}
      <Leg hipX={-2.5} hipY={-9.5} sw={swA} lift={liftA}
           sock={markings === "pied"} />
      <Leg hipX={7} hipY={-8.8} sw={swB} lift={liftB}
           sock={markings === "pied"} />

      {/* ═════════ TAIL ════════════════════════════════════════════════
          Built as THREE pieces, not a stroke + dot:
            (1) tapered tail body — filled silhouette, thick at the rump
                and narrowing toward the switch.
            (2) spine shadow line for definition.
            (3) the switch — a fan of three filled hair strands rather
                than a single ellipse, so it reads as hair.
          The whole tail sways gently with the gait. */}
      {(() => {
         // The tail emerges FROM the top-back of the rump and tucks
         // down along the haunch silhouette before falling free.
         //
         // Rump landmarks (from the body shell):
         //   top-back of rump curve  ≈ (9.0, -13.6)
         //   rear point of rump      ≈ (10.0, -11.5)
         //
         // We anchor the tail base squarely INSIDE the rump silhouette
         // (so it visibly attaches), route the upper third hugging the
         // haunch contour (down and slightly back), then let the tail
         // hang straight down past the leg.
         const sway = Math.sin(t) * 0.22;
         const tipX = 10.0 + sway;
         const tipY = -6.2 + Math.abs(sway) * 0.15;
         // Base of tail: a stub rooted on the rump curve. Both base
         // points sit ON the silhouette (one slightly forward, one
         // slightly aft) so the tail reads as growing out of the body,
         // not floating behind it.
         const tailPath = `
            M 8.8 -13.55
            C 9.4 -12.6, 9.7 -10.2, ${tipX - 0.22} ${tipY}
            L ${tipX + 0.22} ${tipY}
            C 10.2 -10.2, 9.9 -12.4, 9.5 -13.4
            Z
          `;
         return (
           <g>
             <path d={tailPath}
                   fill={bodyRed} stroke={OX_INK}
                   strokeWidth="0.45" strokeLinejoin="round" />
             {/* (tail spine-shadow line removed — see body simplification
                 note above. Silhouette + outline alone reads cleanly.) */}
             {/* switch — three hair strands fanning down from tip */}
             <path d={`
                 M ${tipX - 0.5} ${tipY - 0.05}
                 C ${tipX - 0.9} ${tipY + 0.7}, ${tipX - 0.95} ${tipY + 1.2}, ${tipX - 0.55} ${tipY + 1.55}
                 C ${tipX - 0.35} ${tipY + 1.2}, ${tipX - 0.3} ${tipY + 0.6}, ${tipX - 0.05} ${tipY + 0.05}
                 Z
               `}
               fill={OX_INK} stroke={OX_INK} strokeWidth="0.2"
               strokeLinejoin="round" />
             <path d={`
                 M ${tipX - 0.18} ${tipY - 0.05}
                 C ${tipX - 0.25} ${tipY + 0.7}, ${tipX - 0.2} ${tipY + 1.35}, ${tipX} ${tipY + 1.7}
                 C ${tipX + 0.2} ${tipY + 1.3}, ${tipX + 0.18} ${tipY + 0.6}, ${tipX + 0.18} ${tipY + 0.05}
                 Z
               `}
               fill={OX_INK} stroke={OX_INK} strokeWidth="0.2"
               strokeLinejoin="round" />
             <path d={`
                 M ${tipX + 0.12} ${tipY - 0.02}
                 C ${tipX + 0.45} ${tipY + 0.55}, ${tipX + 0.55} ${tipY + 1.15}, ${tipX + 0.35} ${tipY + 1.5}
                 C ${tipX + 0.05} ${tipY + 1.2}, ${tipX + 0.05} ${tipY + 0.55}, ${tipX + 0.4} ${tipY + 0.05}
                 Z
               `}
               fill={OX_INK} stroke={OX_INK} strokeWidth="0.2"
               strokeLinejoin="round" />
             {/* (hair-tick strokes removed — reduced switch noise) */}
           </g>
         );
       })()}

      {/* ═════════ NECK + HEAD ═════════════════════════════════════════ */}
      <OxHead markings={markings} bodyRed={bodyRed} far={far} />
    </g>
  );
}

// Ox leg — silhouette polygon. Wider at the top (forearm/thigh), bends at
// the knee, narrows through the cannon, bulges at the fetlock, ends at the
// hoof. No floating circles.
//
//      hip ╮          ← attaches to body, full-thickness
//          │          forearm/thigh (wide)
//        knee         ← silhouette KINKS here (not a stuck-on disc)
//           ╲         cannon (narrow)
//            ╲
//          fetlock    ← small bulge
//            │
//          hoof       ← cloven block
//
// hipX/hipY = where leg attaches to body. sw = forward swing offset.
// lift = how far foot is off ground at this gait point. sock = white lower leg.
function Leg({ hipX, hipY, sw, lift, sock = true, far = false }) {
  const footX = hipX + sw * 0.7;
  const footY = -0.05 - lift;
  // Knee sits ~55% down, kicked slightly back from a straight hip→foot line
  // so the leg has a believable cattle bend (not a hinge-joint).
  const lineX = hipX + (footX - hipX) * 0.55;
  const lineY = hipY + (footY - hipY) * 0.55;
  const kneeX = lineX - 0.35;
  const kneeY = lineY;
  // Fetlock — small bulge ~85% down from hip toward foot.
  const fetX = hipX + (footX - hipX) * 0.85;
  const fetY = hipY + (footY - hipY) * 0.88;

  // Far-side legs are fully opaque and use the SAME body colors as the
  // near-side leg. We only adjust the outline weight slightly. No tone
  // shift, no transparency — solid red leg behind solid red leg.
  const upperColor = OX_RED;
  const lowerColor = sock ? OX_WHITE : OX_RED;
  const sockShadow = sock ? OX_WHITE_SH : OX_RED_DK;
  const outline    = far ? 0.42 : 0.5;
  const opacity    = 1;

  // Half-widths along the leg, in ox-local units. Body is ~22 long and 7
  // tall, so a single unit reads as a substantial mass — these widths are
  // INTENTIONALLY small. Hip ≈ 0.55 means the forearm is ~1.1 units thick,
  // tapering to ~0.45 at the cannon. Anything larger reads as a block.
  const wHipFront   = 0.55;   // forearm/thigh, leading edge
  const wHipBack    = 0.62;   // forearm/thigh, trailing edge (slightly bigger)
  const wKneeFront  = 0.32;
  const wKneeBack   = 0.40;
  const wCannon     = 0.22;   // narrow shin
  const wFetFront   = 0.32;   // fetlock bulge front
  const wFetBack    = 0.36;   // fetlock bulge back
  const wHoofTop    = 0.45;

  // Where does the white "sock" start? At the knee (between forearm and cannon).
  // We render upper leg as one filled polygon, lower leg as another, so the
  // color break is a clean horizontal across the joint.

  // Upper leg polygon: hip → knee, with a slight inward curve mid-shaft.
  const midUpX = (hipX + kneeX) / 2;
  const midUpY = (hipY + kneeY) / 2;
  const upperPath = `
    M ${hipX - wHipFront} ${hipY}
    Q ${midUpX - 0.95} ${midUpY - 0.1}, ${kneeX - wKneeFront} ${kneeY}
    L ${kneeX + wKneeBack} ${kneeY}
    Q ${midUpX + 1.05} ${midUpY - 0.1}, ${hipX + wHipBack} ${hipY}
    Z
  `;

  // Lower leg polygon: knee → fetlock → hoof-top, with cannon waist.
  const midLoX = (kneeX + fetX) / 2;
  const midLoY = (kneeY + fetY) / 2;
  const lowerPath = `
    M ${kneeX - wKneeFront} ${kneeY}
    Q ${midLoX - wCannon} ${midLoY - 0.05},
      ${fetX - wFetFront} ${fetY}
    L ${fetX - wHoofTop} ${footY}
    L ${fetX + wHoofTop} ${footY}
    L ${fetX + wFetBack} ${fetY}
    Q ${midLoX + wCannon} ${midLoY - 0.05},
      ${kneeX + wKneeBack} ${kneeY}
    Z
  `;

  // Hoof — cloven block, anchored under the fetlock.
  const hX = fetX;
  const hY = footY;
  return (
    <g opacity={opacity}>
      {/* upper leg (forearm / thigh) */}
      <path d={upperPath}
            fill={upperColor} stroke={OX_INK}
            strokeWidth={outline} strokeLinejoin="round" />
      {/* (forearm leading-edge shading removed for legibility) */}

      {/* lower leg (cannon → fetlock) */}
      <path d={lowerPath}
            fill={lowerColor} stroke={OX_INK}
            strokeWidth={outline * 0.9} strokeLinejoin="round" />
      {/* (cannon-bone shadow + fetlock crease removed — the silhouette
          already has the kink at the knee and the bulge at the fetlock,
          so extra inner lines just look noisy.) */}

      {/* hoof — cloven, splayed slightly outward at the bottom */}
      <path d={`M ${hX - wHoofTop} ${hY - 0.02}
                L ${hX + wHoofTop} ${hY - 0.02}
                L ${hX + wHoofTop + 0.12} ${hY + 0.7}
                L ${hX - wHoofTop - 0.12} ${hY + 0.7} Z`}
            fill={OX_HOOF} stroke={OX_INK} strokeWidth="0.3"
            strokeLinejoin="round" />
      {/* cloven cleft */}
      <path d={`M ${hX} ${hY + 0.05} L ${hX + 0.04} ${hY + 0.66}`}
            stroke={OX_RED_DK} strokeWidth="0.22" />
      {/* (coronet band line removed — hoof outline already separates it
          from the leg above.) */}
    </g>
  );
}

// Ox head — joined to the body via a thick neck. Drawn from the body's
// withers anchor outward & forward.
function OxHead({ markings = "pied", bodyRed = OX_RED, far = false }) {
  // Neck originates at withers (~ -3, -13.5), drops to head base (~ -9, -10).
  // Head extends from -9, -10 to nose at -13.5, -9.
  const isPied = markings === "pied";
  return (
    <g>
      {/* ── NECK (thick wedge from withers to head) ── */}
      <path d={`
          M -3.0 -13.6
          C -5.5 -13.4, -7.0 -12.6, -8.4 -11.4    
          L -9.0 -10.4                              
          L -8.6  -9.4                              
          C -7.0  -9.6, -5.0 -10.0, -3.5 -10.6     
          L -3.0 -10.0                              
          L -5.5 -10.0
          Z
        `}
        fill={bodyRed} stroke={OX_INK} strokeWidth="0.55"
        strokeLinejoin="round" />
      {/* dewlap (loose throat skin) */}
      <path d={`
          M -8.6 -9.4
          C -7.4 -8.6, -5.6 -8.4, -4.0 -8.8
          C -4.6 -9.4, -6.4 -9.7, -8.4 -9.7 Z
        `}
        fill={isPied ? OX_WHITE : bodyRed}
        stroke={OX_INK} strokeWidth="0.45"
        strokeLinejoin="round" />

      {/* ── HEAD ── 3/4 side view, head facing screen-LEFT.
          Reference: working-ox photos. Key observations:
            • Long, fairly FLAT profile from poll → muzzle
            • Subtle stop, not a sharp angle
            • Wide SQUARE muzzle (the pink nose pad is BIG)
            • Strong angular cheek/jaw drops sharply behind the muzzle
            • Eyes large, set on the side mid-height
            • Big leaf-shaped EARS flaring sideways below the horns
            • THICK horns emerging from poll, sweeping FORWARD and UP

          Coordinate plan in the body's coord system (y down = positive):
            poll/back of skull ........ x=-8.5, y=-11.0
            crown ..................... x=-9.5, y=-11.2  ← horns anchor here
            brow ridge ................ x=-10.5, y=-10.8
            bridge of nose (long flat). x=-12.0, y=-10.0
            top of muzzle ............. x=-13.5, y=-9.4
            nose pad bottom ........... x=-13.6, y=-8.4
            chin/lower lip ............ x=-12.7, y=-8.0
            front of jaw .............. x=-11.4, y=-7.7
            cheek bottom .............. x=-9.5, y=-8.2
            jaw → throat .............. x=-8.6, y=-9.0
       */}

      {/* HEAD silhouette — single closed path traced clockwise from poll */}
      <path d={`
          M -8.5 -11.0
          C -9.2 -11.3, -10.0 -11.25, -10.6 -10.85
          C -11.7 -10.5, -12.7 -10.0, -13.4 -9.5
          C -13.85 -9.15, -14.0 -8.8, -13.95 -8.5
          C -13.9 -8.2, -13.65 -8.0, -13.3 -8.0
          C -13.0 -8.0, -12.7 -8.05, -12.45 -8.05
          C -12.3 -7.85, -11.9 -7.7, -11.4 -7.7
          C -10.6 -7.75, -9.85 -8.0, -9.3 -8.5
          C -8.85 -9.0, -8.55 -9.6, -8.45 -10.2
          C -8.4 -10.6, -8.4 -10.85, -8.5 -11.0
          Z
        `}
        fill={isPied ? OX_WHITE : bodyRed}
        stroke={OX_INK} strokeWidth="0.55"
        strokeLinejoin="round" />

      {/* Red top-of-head patch — pied oxen typically have a red crown
          and forehead, white running down the bridge of the nose to
          the muzzle. */}
      {isPied && (
        <path d={`
            M -8.5 -11.0
            C -9.2 -11.3, -10.0 -11.25, -10.6 -10.85
            C -10.85 -10.6, -11.0 -10.35, -11.05 -10.1
            C -10.5 -10.2, -9.8 -10.15, -9.1 -10.0
            C -8.7 -10.35, -8.5 -10.7, -8.5 -11.0
            Z
          `}
          fill={bodyRed} stroke={OX_INK} strokeWidth="0.4"
          strokeLinejoin="round" />
      )}

      {/* Cheek/jowl shadow — angular meaty cheek in the bodyRed,
          wraps from below the eye down to the throat. */}
      {isPied && (
        <path d={`
            M -8.45 -10.2
            C -8.55 -9.6, -8.85 -9.0, -9.3 -8.5
            C -9.85 -8.0, -10.6 -7.75, -11.4 -7.7
            C -11.0 -8.05, -10.4 -8.35, -9.7 -8.55
            C -9.15 -8.7, -8.7 -8.95, -8.4 -9.4
            Z
          `}
          fill={bodyRed} stroke={OX_INK} strokeWidth="0.35"
          strokeLinejoin="round" opacity="0.95" />
      )}

      {/* ── MUZZLE (pink leather nose pad) ──
          Bovine muzzles are BIG and squarish — covers most of the
          front of the snout, both nostrils, and the upper lip area.
          Drawn as a rounded-trapezoid at the front-bottom of the head. */}
      <path d={`
          M -13.95 -9.15
          C -14.1 -8.85, -14.15 -8.5, -14.0 -8.2
          C -13.75 -7.95, -13.3 -7.85, -12.85 -7.9
          C -12.55 -7.95, -12.4 -8.2, -12.45 -8.55
          C -12.55 -8.95, -12.85 -9.2, -13.25 -9.3
          C -13.6 -9.35, -13.85 -9.3, -13.95 -9.15
          Z
        `}
        fill={OX_PINK} stroke={OX_INK} strokeWidth="0.4"
        strokeLinejoin="round" />
      {/* near nostril — comma-shaped slit on the side of the muzzle */}
      <path d="M -13.7 -8.6 C -13.55 -8.45, -13.4 -8.4, -13.25 -8.5"
            stroke={OX_INK} strokeWidth="0.32"
            fill="none" strokeLinecap="round" />
      {/* mouth line — corner of the lip just behind the muzzle */}
      <path d="M -12.4 -8.0 C -12.05 -7.85, -11.65 -7.85, -11.3 -7.95"
            stroke={OX_INK} strokeWidth="0.3"
            fill="none" strokeLinecap="round" opacity="0.85" />

      {/* ── EYE ──
          Large, dark, almond-shaped, set on the side of the skull
          roughly halfway between brow and cheek. */}
      <ellipse cx="-10.55" cy="-9.7" rx="0.38" ry="0.28"
               fill={OX_INK} />
      {/* catchlight */}
      <ellipse cx="-10.65" cy="-9.78" rx="0.12" ry="0.08" fill="#f8e8c0" />
      {/* upper lid crease — the heavy lid that sits above bovine eyes */}
      <path d="M -10.95 -9.95 C -10.55 -10.05, -10.15 -10.0, -9.9 -9.85"
            stroke={OX_INK} strokeWidth="0.22"
            fill="none" strokeLinecap="round" opacity="0.7" />

      {/* ── EAR — drawn before horns so horns sit on top.
          Big floppy leaf-shape projecting sideways/back from below the
          horn base. Cattle ears are LONG and droop — much bigger than
          a horse's perky ear. In 3/4 side view we see the near ear
          flaring out to the side and slightly down. */}
      <path d={`
          M -8.6 -10.5
          C -7.7 -10.45, -6.9 -10.0, -6.4 -9.3
          C -6.25 -9.0, -6.45 -8.85, -6.85 -8.95
          C -7.5 -9.15, -8.15 -9.55, -8.55 -10.1
          Z
        `}
        fill={isPied ? OX_WHITE : bodyRed}
        stroke={OX_INK} strokeWidth="0.45"
        strokeLinejoin="round" />
      {/* inner-ear cup — soft pink/dark wash showing the cupped interior */}
      <path d="M -8.2 -10.05 C -7.55 -9.75, -7.05 -9.4, -6.75 -9.05"
            stroke={OX_PINK} strokeWidth="0.3"
            fill="none" opacity="0.85" />
      <path d="M -8.0 -10.2 C -7.4 -9.95, -6.95 -9.65, -6.7 -9.3"
            stroke={OX_RED_DK} strokeWidth="0.18"
            fill="none" opacity="0.5" />

      {/* ── HORNS ──────────────────────────────────────────────────────
          Reference: working-ox photos. Both horns emerge from the TOP
          of the skull (poll), close together. Each one then sweeps:
              OUT to the side  →  FORWARD over the brow  →  UP at the tip.
          In 3/4 side view, the NEAR horn becomes a thick forward-curving
          "C" projecting forward and up; the FAR horn shows mostly its
          upward curve, peeking above the poll on the far side.

          Crucial properties:
            • THICK at the base — about as wide as the eye
            • Tapers gradually to a sharp dark point
            • Pale cream keratin with darker tip (last ~20%)
            • Larger than my previous attempts — these are HERO elements
       */}

      {/* FAR horn — TRUE side profile means the far horn is fully
          occluded by the near horn / skull. We DO NOT draw it.
          (Earlier versions drew a second horn behind the head, but that
          implies a 3/4 view which clashes with the side-profile body.) */}

      {/* NEAR horn — HERO. Drawn as a TAPERED STROKE: a thick stroked
          path with a separate stroke for the dark tip. Much simpler than
          tracing a closed taper, and reads cleanly at panel scale.

          The horn rises from the poll (x≈-8.7, y≈-11), sweeps forward
          and up to a bend at (x≈-10.7, y≈-12.2), then hooks up to the
          tip at (x≈-11.0, y≈-13.5).
       */}
      {/* base segment — thickest, near the poll */}
      <path d="M -8.5 -10.95 Q -9.5 -11.4, -10.0 -11.85"
            stroke={OX_INK} strokeWidth="1.55"
            fill="none" strokeLinecap="round" />
      <path d="M -8.5 -10.95 Q -9.5 -11.4, -10.0 -11.85"
            stroke={OX_HORN} strokeWidth="1.2"
            fill="none" strokeLinecap="round" />

      {/* mid segment — slightly narrower, through the bend */}
      <path d="M -10.0 -11.85 Q -10.55 -12.25, -10.85 -12.7"
            stroke={OX_INK} strokeWidth="1.25"
            fill="none" strokeLinecap="round" />
      <path d="M -10.0 -11.85 Q -10.55 -12.25, -10.85 -12.7"
            stroke={OX_HORN} strokeWidth="0.9"
            fill="none" strokeLinecap="round" />

      {/* tip segment — narrowest, hooking up */}
      <path d="M -10.85 -12.7 Q -11.0 -13.05, -11.05 -13.4"
            stroke={OX_INK} strokeWidth="0.9"
            fill="none" strokeLinecap="round" />
      <path d="M -10.85 -12.7 Q -11.0 -13.05, -11.05 -13.4"
            stroke={OX_HORN} strokeWidth="0.55"
            fill="none" strokeLinecap="round" />

      {/* dark tip cap — small, just the very point */}
      <path d="M -11.02 -13.25 L -11.05 -13.4"
            stroke={OX_HORN_TIP} strokeWidth="0.38"
            fill="none" strokeLinecap="round" />

      {/* one subtle growth-ring tick near the base */}
      <path d="M -9.45 -11.5 l -0.15 -0.4"
            stroke={OX_HORN_TIP} strokeWidth="0.13"
            fill="none" strokeLinecap="round" opacity="0.5" />

    </g>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// OxYoke — a single bow yoke spanning a pair of oxen.
// Draws the horizontal beam plus two bows that curve down around each
// ox's neck. Anchored at the midpoint between the two oxen.
//   width: distance between the two oxen's necks (default 8)
//   y:     vertical position of the beam (default -13.5, just above necks)
// ───────────────────────────────────────────────────────────────────────────
function OxYoke({ width = 8, y = -13.5, withRing = false }) {
  const halfW = width / 2;
  // Bow positions — each bow is a slim wooden U passing UNDER the beam and
  // around an ox's neck. Drawn as a filled path (two parallel curves) so it
  // reads as a piece of bent hickory, not a stroked ring.
  const bow = (cx, side) => {
    // cx = horizontal center of this bow. side = +1 or -1 for tilt.
    const w = 1.3;          // outer half-width of the bow opening
    const wIn = 0.95;       // inner half-width
    const top = y + 0.1;    // bow top tucks just under beam
    const bot = y + 2.55;   // bow bottom (under ox neck)
    return `
      M ${cx - w} ${top}
      C ${cx - w} ${top + 1.8}, ${cx - w * 0.4} ${bot}, ${cx} ${bot}
      C ${cx + w * 0.4} ${bot}, ${cx + w} ${top + 1.8}, ${cx + w} ${top}
      L ${cx + wIn} ${top}
      C ${cx + wIn} ${top + 1.5}, ${cx + wIn * 0.4} ${bot - 0.35}, ${cx} ${bot - 0.35}
      C ${cx - wIn * 0.4} ${bot - 0.35}, ${cx - wIn} ${top + 1.5}, ${cx - wIn} ${top}
      Z
    `;
  };
  const beamY = y - 0.55;
  const beamH = 1.1;
  return (
    <g>
      {/* ── BOWS (drawn first so beam covers their tops) ── */}
      <path d={bow(-halfW + 0.2)} fill={YOKE_WOOD}
            stroke={OX_INK} strokeWidth="0.4" strokeLinejoin="round" />
      <path d={bow( halfW - 0.2)} fill={YOKE_WOOD}
            stroke={OX_INK} strokeWidth="0.4" strokeLinejoin="round" />
      {/* bow grain — single dark stripe down the outside curve */}
      <path d={`M ${-halfW + 0.2 - 1.15} ${y + 0.6}
                C ${-halfW + 0.2 - 1.1} ${y + 1.8},
                  ${-halfW + 0.2 - 0.5} ${y + 2.45},
                  ${-halfW + 0.2} ${y + 2.45}`}
            stroke={YOKE_DARK} strokeWidth="0.22"
            fill="none" opacity="0.75" />
      <path d={`M ${ halfW - 0.2 + 1.15} ${y + 0.6}
                C ${ halfW - 0.2 + 1.1} ${y + 1.8},
                  ${ halfW - 0.2 + 0.5} ${y + 2.45},
                  ${ halfW - 0.2} ${y + 2.45}`}
            stroke={YOKE_DARK} strokeWidth="0.22"
            fill="none" opacity="0.75" />

      {/* ── BEAM ── single piece of squared timber, gently arched on top */}
      <path d={`
          M ${-halfW - 1.1} ${beamY + 0.15}
          Q ${0} ${beamY - 0.25},
            ${ halfW + 1.1} ${beamY + 0.15}
          L ${ halfW + 1.1} ${beamY + beamH}
          L ${-halfW - 1.1} ${beamY + beamH} Z
        `}
        fill={YOKE_WOOD} stroke={OX_INK} strokeWidth="0.45"
        strokeLinejoin="round" />
      {/* dark wood grain along the beam */}
      <path d={`M ${-halfW - 0.9} ${beamY + 0.55}
                Q ${0} ${beamY + 0.35},
                  ${ halfW + 0.9} ${beamY + 0.55}`}
            stroke={YOKE_DARK} strokeWidth="0.22"
            fill="none" opacity="0.7" />
      <path d={`M ${-halfW - 0.7} ${beamY + 0.85}
                Q ${0} ${beamY + 0.7},
                  ${ halfW + 0.7} ${beamY + 0.85}`}
            stroke={YOKE_DARK} strokeWidth="0.16"
            fill="none" opacity="0.55" />
      {/* small notch where each bow passes through the beam — replaces the
          peg-circles. Reads as a shadow, not a button. */}
      <rect x={-halfW + 0.05} y={beamY + 0.2} width="0.3" height={beamH - 0.3}
            fill={YOKE_DARK} opacity="0.85" />
      <rect x={ halfW - 0.35} y={beamY + 0.2} width="0.3" height={beamH - 0.3}
            fill={YOKE_DARK} opacity="0.85" />

      {/* ── center hitch hardware (only on the lead pair) ── */}
      {withRing && (
        <g>
          {/* iron staple driven through the beam top */}
          <path d={`M -0.55 ${beamY - 0.45}
                    L -0.55 ${beamY + 0.05}
                    M  0.55 ${beamY - 0.45}
                    L  0.55 ${beamY + 0.05}`}
                stroke={CHAIN_INK} strokeWidth="0.32" />
          {/* the ring itself, hanging just below the beam */}
          <ellipse cx="0" cy={beamY + beamH + 0.55}
                   rx="0.6" ry="0.45"
                   fill="none" stroke={CHAIN_INK} strokeWidth="0.4" />
          {/* short link connecting staple to ring */}
          <line x1="0" y1={beamY + beamH}
                x2="0" y2={beamY + beamH + 0.2}
                stroke={CHAIN_INK} strokeWidth="0.32" />
        </g>
      )}
    </g>
  );
}

// Single-ox yoke (for N=1) — half a bow yoke with a balance arm extending
// toward the wagon side. Same construction language as the pair yoke.
function OxSingleYoke({ y = -13.5 }) {
  const beamY = y - 0.55;
  const beamH = 1.1;
  const cx = -0.4; // bow centered roughly over the single ox's neck
  const w = 1.3, wIn = 0.95;
  const top = y + 0.1, bot = y + 2.55;
  const bowPath = `
    M ${cx - w} ${top}
    C ${cx - w} ${top + 1.8}, ${cx - w * 0.4} ${bot}, ${cx} ${bot}
    C ${cx + w * 0.4} ${bot}, ${cx + w} ${top + 1.8}, ${cx + w} ${top}
    L ${cx + wIn} ${top}
    C ${cx + wIn} ${top + 1.5}, ${cx + wIn * 0.4} ${bot - 0.35}, ${cx} ${bot - 0.35}
    C ${cx - wIn * 0.4} ${bot - 0.35}, ${cx - wIn} ${top + 1.5}, ${cx - wIn} ${top}
    Z
  `;
  return (
    <g>
      {/* bow first */}
      <path d={bowPath} fill={YOKE_WOOD}
            stroke={OX_INK} strokeWidth="0.4" strokeLinejoin="round" />
      {/* beam — short, with an extension arm toward the wagon (right) */}
      <path d={`
          M -2.6 ${beamY + 0.1}
          Q 0 ${beamY - 0.2}, 2.6 ${beamY + 0.1}
          L 2.6 ${beamY + beamH}
          L -2.6 ${beamY + beamH} Z
        `}
        fill={YOKE_WOOD} stroke={OX_INK} strokeWidth="0.45"
        strokeLinejoin="round" />
      {/* grain */}
      <path d="M -2.4 -13.0 Q 0 -13.15, 2.4 -13.0"
            stroke={YOKE_DARK} strokeWidth="0.22"
            fill="none" opacity="0.7" />
      {/* notch where bow passes through */}
      <rect x={cx - 0.15} y={beamY + 0.2} width="0.3" height={beamH - 0.3}
            fill={YOKE_DARK} opacity="0.85" />
      {/* hitch staple at the right end of the beam */}
      <path d="M 1.55 -12.95 L 1.55 -12.55 M 1.95 -12.95 L 1.95 -12.55"
            stroke={CHAIN_INK} strokeWidth="0.3" />
      <ellipse cx="1.75" cy="-12.0" rx="0.5" ry="0.38"
               fill="none" stroke={CHAIN_INK} strokeWidth="0.38" />
    </g>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// OxPole — the wooden tongue running from the front yoke back to the wagon.
// Drawn as one straight wood stick with iron hardware at both ends.
//   length: how far the pole extends (in OxTeam units)
//   y: vertical position
// ───────────────────────────────────────────────────────────────────────────
function OxPole({ length = 30, y = -12 }) {
  return (
    <g>
      <line x1="0" y1={y} x2={length} y2={y}
            stroke={POLE_WOOD} strokeWidth="0.85" strokeLinecap="round" />
      <line x1="0" y1={y} x2={length} y2={y}
            stroke={OX_INK} strokeWidth="0.25" opacity="0.7" />
      {/* end ring (hitches to wagon) */}
      <circle cx={length} cy={y} r="0.85"
              fill="none" stroke={CHAIN_INK} strokeWidth="0.55" />
      <circle cx={length} cy={y} r="0.4"
              fill={CHAIN_INK} />
    </g>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// OxChain — a chain link tug between two yokes (when more than one pair).
// Drawn as a series of small ovals.
// ───────────────────────────────────────────────────────────────────────────
function OxChain({ x1, y1, x2, y2, links = 6 }) {
  const els = [];
  for (let i = 0; i <= links; i++) {
    const f = i / links;
    const cx = x1 + (x2 - x1) * f;
    const cy = y1 + (y2 - y1) * f;
    const tilt = i % 2 === 0 ? 0 : 90;
    els.push(
      <ellipse key={i} cx={cx} cy={cy} rx="0.42" ry="0.22"
               fill="none" stroke={CHAIN_INK} strokeWidth="0.35"
               transform={`rotate(${tilt} ${cx} ${cy})`} />
    );
  }
  return <g>{els}</g>;
}

// ───────────────────────────────────────────────────────────────────────────
// OxTeam — composer. Renders N oxen yoked in pairs, with a pole running
// back to the wagon hitch.
//
//   count: 1..6 (or more — handles arbitrary N gracefully)
//   gaitPhase: 0..1 walk cycle
//   poleLength: distance from front yoke to wagon hitch (caller owns wagon)
//   abreastSpacing: x-offset between paired oxen (along travel axis).
//                   Real teams stand SIDE BY SIDE (perpendicular to travel).
//                   In side-profile, "near" and "far" oxen of one pair
//                   occupy the SAME x — we tuck the far ox slightly behind.
//   pairSpacing: distance between successive pairs along x.
// ───────────────────────────────────────────────────────────────────────────

// Per-ox stride variance. Deterministic from (pairIndex, nearOrFar) so the
// same animal always strides the same way across renders. Two animals never
// share the same {phase, swing} pair within a 6-ox team.
//
// phase: 0..0.06 — small forward/back offset in the gait cycle. Large
//   enough to read ("that one is half a beat behind") but small enough
//   that the pair still reads as yoked together.
// swing: 0.88..1.12 — leg-swing amplitude multiplier. One ox might step
//   a bit more vigorously, another a bit more sluggishly.
function jitterFor(pairIdx, nearOrFar /* 0 = near, 1 = far */) {
  // Deterministic pseudo-random from (p, side). Mulberry-style hash.
  const seed = (pairIdx * 13 + nearOrFar * 7 + 1) | 0;
  const a = ((Math.sin(seed * 12.9898) * 43758.5453) % 1 + 1) % 1;
  const b = ((Math.sin(seed * 78.233 + 4.1)  * 43758.5453) % 1 + 1) % 1;
  return {
    phase: (a - 0.5) * 0.06,         // ±0.03 phase offset
    swing: 0.88 + b * 0.24,          // 0.88..1.12 amplitude
  };
}

function OxTeam({
  count = 4,
  // gait: "walking" (default) or "stopped". When stopped, no leg/body/
  // team motion. Animals stand planted at the same layout positions.
  gait = "walking",
  gaitPhase = 0,
  poleLength = 28,
  pairSpacing = 24,
  showPole = true,
  // When true, the team's shared bob translation is also applied to
  // whatever the caller has hitched at x=0 (i.e. the wagon). The caller
  // can read this off via the `teamBob` value posted on the gaitPhase, but
  // the simplest path is: caller wraps the wagon in the same translate.
  // Here we just bake the bob into the team's own root <g>.
}) {
  const numPairs = Math.ceil(count / 2);
  const stopped = gait === "stopped";
  // ── shared team bob ──────────────────────────────────────────────
  // One slow vertical settle per gait cycle, very small amplitude. This
  // is the rocking of the whole hitched mass — oxen + yoke + chains +
  // pole — as the diagonals alternate. Single-frequency, not double; a
  // double-frequency bob reads as trotting. Zero when stopped.
  const teamT = gaitPhase * Math.PI * 2;
  const teamBob = stopped ? 0 : Math.sin(teamT) * 0.08;
  // Pairs are laid out to the LEFT of the origin (origin = front of pole,
  // closest to wagon). Pair 0 is closest to wagon; pair (numPairs-1) is
  // farthest (lead pair).
  // Within a pair, near ox is at +0 in y/depth, far ox tucked behind at
  // a small x-offset and lower opacity.

  const pairs = [];
  for (let p = 0; p < numPairs; p++) {
    const isLast = p === numPairs - 1;
    const oxenInPair = (isLast && count % 2 === 1) ? 1 : 2;
    // x position of this pair's center (negative = farther from wagon)
    const px = -(p * pairSpacing) - pairSpacing * 0.5;
    pairs.push({ p, oxenInPair, px, isLeadPair: isLast });
  }

  return (
    // Everything hitched together — pole, yokes, chains, oxen — bobs as
    // a single mass. The wagon (rendered by the caller at x=0) should be
    // wrapped in the same translate to ride along; OxTeam exposes
    // teamBob via its returned subtree's root transform so the caller
    // can mirror it.
    <g transform={`translate(0 ${teamBob})`} data-team-bob={teamBob.toFixed(4)}>
      {/* ── POLE: from wagon hitch (origin) back to front pair's yoke ── */}
      {showPole && (
        <g transform="translate(0 0)">
          {/* Pole goes from x=0 (wagon hitch) to x = front pair's yoke. */}
          {(() => {
            const frontPair = pairs[0];
            const poleEnd = frontPair.px + 4; // yoke sits a bit forward of pair center
            return (
              <g transform={`translate(${poleEnd} 0)`}>
                <OxPole length={Math.abs(poleEnd)} y={-11.5} />
              </g>
            );
          })()}
        </g>
      )}

      {/* ── PAIRS (drawn from far/lead to near/wagon, so near pair overlaps) */}
      {[...pairs].reverse().map(({ p, oxenInPair, px, isLeadPair }) => {
        // Tiny phase stagger between pairs so they don't lockstep, but
        // small enough that the team reads as marching together. (Was
        // 0.13 — too desynced; reduced to 0.05.)
        const pairPhase = (gaitPhase + p * 0.05) % 1;
        const oppPhase  = (pairPhase + 0.5) % 1;
        // ── per-ox biological variance ──────────────────────────────
        // Animals are not soldiers. Each ox in the team gets a small
        // deterministic phase + amplitude jitter so they don't all move
        // identically. Deterministic-from-index so renders are stable.
        // Hashing on (pair index, near/far) gives 4 distinct values for
        // a 4-ox team, 6 for a 6-ox team, etc.
        //
        // Magnitudes are intentionally small — too much desync and the
        // pair stops looking yoked together. ~5% phase, ±10% amplitude.
        const nearJitter = jitterFor(p, 0);
        const farJitter  = jitterFor(p, 1);
        return (
          <g key={p} transform={`translate(${px} 0)`}>
            {/* far ox (tucked back & up slightly so its silhouette peeks
                over the near ox's back). Same tone and markings as the
                near ox so the pair reads as one solid mass — no color
                shift, no see-through. */}
            {oxenInPair === 2 && (
              <g transform="translate(1.5 -0.6)">
                <Ox gaitPhase={oppPhase} far
                    gait={gait}
                    strideOffset={farJitter.phase}
                    swingScale={farJitter.swing}
                    tone={p % 2 === 0 ? 0 : -1}
                    markings={p === 1 ? "solid" : "pied"} />
              </g>
            )}
            {/* near ox */}
            <Ox gaitPhase={pairPhase}
                gait={gait}
                strideOffset={nearJitter.phase}
                swingScale={nearJitter.swing}
                tone={p % 2 === 0 ? 0 : -1}
                markings={p === 1 ? "solid" : "pied"} />

            {/* yoke spans both oxen of this pair (or single yoke if count=1) */}
            {oxenInPair === 2 ? (
              <g transform="translate(-0.5 0)">
                <OxYoke width={3.5} y={-14.0}
                        withRing={isLeadPair} />
              </g>
            ) : (
              <g transform="translate(0 0)">
                <OxSingleYoke y={-14.0} />
              </g>
            )}
          </g>
        );
      })}

      {/* ── CHAINS between yokes of successive pairs ──
          REMOVED — the inter-pair chain ran through the gap between
          paired oxen and was almost entirely hidden by the near ox. With
          most of it occluded it read as visual noise rather than
          structure. Real teams DO link yokes with chains, but at this
          rendered scale they don't survive the occlusion test. OxChain
          is still exported for callers who want it explicitly. */}
    </g>
  );
}

Object.assign(window, { Ox, OxHead, OxTeam, OxYoke, OxPole, OxChain });
