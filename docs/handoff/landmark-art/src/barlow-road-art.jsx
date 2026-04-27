/* global React, LMK, LMK_VIEW_W, LMK_VIEW_H */

// ============================================================================
// BarlowRoadArt — mile ~1900, the south-of-Hood toll road & Laurel Hill chute.
// ============================================================================
// Sam Barlow's 1846 alternative to the Columbia raft descent. Ducks
// wagons through dense Cascade forest of giant Douglas-firs around the
// south flank of Mt. Hood. The notorious LAUREL HILL CHUTE is the
// signature: a near-vertical pitch where wagons were lowered down with
// ropes wrapped around tree stumps as friction posts, wheels chain-locked.
// Mt. Hood (snowy, near, dominant) shows through the firs.
//
// Distinguishing visual marks:
//   • MT. HOOD silhouette — snowy single-peak cone, top of frame, dominant
//   • DENSE conifer forest — tall narrow Douglas-firs filling sides of comp
//   • The CHUTE — a steep diagonal slope with a wagon being lowered
//   • Wagon at chute: ROPES from rear axle wrapped around a stump anchor
//   • Wheels chain-locked (visible) — the wagon is sliding, not rolling
//   • Stumps with rope grooves — indicating prior descents
//   • Pioneers at the top (anchoring rope) and bottom (catching wagon)
//   • Forest gloom — darker, mossier than anything else on the trail
// ============================================================================

function BarlowRoadArt() {
  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const firDark = "#2a3826";
  const firMid = "#3e5638";
  const firLight = "#5e7a4c";
  const trunkBrown = "#3e2818";
  const earthMud = "#4a3520";
  const snowWhite = "#eef2f6";
  const peakBlue = "#6e7c92";
  const peakShadow = "#3a4658";

  return (
    <g>
      {/* ── Sky just behind Hood — slight tonal lift behind the peak ── */}
      <rect x="0" y="0" width={LMK_VIEW_W} height="60" fill={LMK.paperWarm} opacity="0.35" />

      {/* ── MT. HOOD — dominant snowy cone, upper third ───────────── */}
      <g>
        {/* base mountain mass */}
        <path
          d="M 100 88 L 160 60 L 200 36 L 240 22 L 280 32 L 320 56 L 380 88 L 420 92 L 80 92 Z"
          fill={peakBlue} opacity="0.85" stroke={ink} strokeWidth="0.55"
        />
        {/* shadow side — east face */}
        <path
          d="M 240 22 L 280 32 L 320 56 L 380 88 L 420 92 L 240 92 Z"
          fill={peakShadow} opacity="0.55"
        />
        {/* SNOWFIELD — upper slopes */}
        <path
          d="M 160 60 L 200 36 L 240 22 L 280 32 L 320 56 L 296 70 L 268 60 L 240 50 L 216 56 L 196 66 L 178 70 Z"
          fill={snowWhite} opacity="0.95" stroke={ink} strokeWidth="0.4"
        />
        {/* snow shadow / contour */}
        <path
          d="M 240 22 L 280 32 L 320 56 L 296 70 L 268 60 L 240 50 Z"
          fill="#cfd6dc" opacity="0.6"
        />
        {/* ridge lines and crevasse hints */}
        <g opacity="0.55" stroke={peakShadow} strokeWidth="0.4" fill="none">
          <path d="M 240 22 L 252 38 L 268 60" />
          <path d="M 220 36 L 230 50 L 240 60" />
          <path d="M 280 32 L 286 48 L 296 70" />
        </g>
        {/* faint cloud wisp at base */}
        <ellipse cx="200" cy="78" rx="60" ry="3" fill={LMK.paperWarm} opacity="0.45" />
      </g>

      {/* ── Mid-distance forest cloak (lower mountain) ─────────── */}
      <path
        d="M 0 92 Q 80 86 160 92 Q 240 88 320 92 Q 400 88 480 92 L 480 110 L 0 110 Z"
        fill={firDark} opacity="0.85" stroke={ink} strokeWidth="0.4"
      />
      {/* dotted tree texture in the cloak */}
      <g opacity="0.6" fill={firMid}>
        {Array.from({length: 80}).map((_, i) => {
          const x = 4 + (i * 6) % 478;
          const y = 90 + (i % 5) * 3;
          return (
            <path key={i} d={`M ${x} ${y} l -1.4 -3 l 1.4 -2 l 1.4 2 z`} stroke={ink} strokeWidth="0.2" />
          );
        })}
      </g>

      {/* ── DENSE FIR FOREST flanking the comp ────────────────── */}
      {/* Left edge — tall narrow firs filling left fifth */}
      <g>
        {[
          { x: 8, h: 90, w: 11 },
          { x: 22, h: 84, w: 10 },
          { x: 36, h: 96, w: 12 },
          { x: 52, h: 80, w: 9 },
          { x: 66, h: 92, w: 11 },
          { x: 82, h: 76, w: 9 },
          { x: 96, h: 88, w: 10 },
        ].map((t, i) => (
          <FirTree key={`l-${i}`} x={t.x} y={170} h={t.h} w={t.w} dark />
        ))}
      </g>
      {/* Right edge — taller firs */}
      <g>
        {[
          { x: 472, h: 92, w: 12 },
          { x: 458, h: 86, w: 11 },
          { x: 444, h: 98, w: 13 },
          { x: 428, h: 82, w: 10 },
          { x: 414, h: 94, w: 12 },
          { x: 398, h: 78, w: 9 },
          { x: 384, h: 90, w: 11 },
          { x: 368, h: 86, w: 10 },
        ].map((t, i) => (
          <FirTree key={`r-${i}`} x={t.x} y={170} h={t.h} w={t.w} dark />
        ))}
      </g>

      {/* ── THE CHUTE — diagonal cleared slope down center-left ── */}
      {/* A near-vertical earth pitch, surrounded by forest, where wagons
          are lowered. Diagonal from upper-left of clearing to lower-right. */}
      <g>
        {/* slope plane — a darker earth wedge */}
        <path
          d="M 110 110 L 280 110 L 320 170 L 100 170 Z"
          fill={earthMud} stroke={ink} strokeWidth="0.55"
        />
        {/* lighter chute scar — a paler stripe down the steepest line */}
        <path
          d="M 168 110 L 240 110 L 256 170 L 156 170 Z"
          fill="#6a4f30" opacity="0.85" stroke={ink} strokeWidth="0.4"
        />
        {/* drag-mark grooves down the chute */}
        <g opacity="0.7" stroke={ink} strokeWidth="0.4" fill="none">
          <path d="M 184 112 L 188 170" />
          <path d="M 196 112 L 204 170" />
          <path d="M 210 112 L 222 170" />
          <path d="M 224 112 L 240 170" />
        </g>
        {/* loose stones */}
        <g opacity="0.85" fill="#3a2a18" stroke={ink} strokeWidth="0.2">
          <ellipse cx="170" cy="148" rx="2" ry="1" />
          <ellipse cx="232" cy="142" rx="1.6" ry="0.8" />
          <ellipse cx="254" cy="158" rx="2.2" ry="1" />
          <ellipse cx="190" cy="162" rx="1.8" ry="0.9" />
        </g>
        {/* edges of chute have stumps — anchor stumps with rope grooves */}
        <g>
          <Stump x={160} y={114} size={3} />
          <Stump x={250} y={114} size={3.4} ropeGroove />
          <Stump x={138} y={170} size={3.2} />
          <Stump x={290} y={170} size={3.5} ropeGroove />
        </g>
      </g>

      {/* ── THE WAGON BEING LOWERED — the focal point ─────────── */}
      <g transform="translate(196, 138)">
        {/* wagon tipped slightly down-slope, oriented diagonally */}
        <g transform="rotate(20)">
          {/* wagon box */}
          <rect x="-12" y="-3" width="24" height="8" fill={LMK.earth} stroke={ink} strokeWidth="0.55" />
          {/* canopy */}
          <path d="M -12 -3 Q 0 -14 12 -3 Z" fill={LMK.white} stroke={ink} strokeWidth="0.6" />
          {/* canopy ribs */}
          <line x1="-7" y1="-7" x2="-7" y2="-3" stroke={inkSoft} strokeWidth="0.3" opacity="0.6" />
          <line x1="0" y1="-10" x2="0" y2="-3" stroke={inkSoft} strokeWidth="0.3" opacity="0.6" />
          <line x1="7" y1="-7" x2="7" y2="-3" stroke={inkSoft} strokeWidth="0.3" opacity="0.6" />
          {/* wheels — CHAIN LOCKED, visible chain wraps */}
          <circle cx="-7" cy="6" r="2.6" fill={LMK.wood} stroke={ink} strokeWidth="0.5" />
          <circle cx="7" cy="6" r="2.6" fill={LMK.wood} stroke={ink} strokeWidth="0.5" />
          {/* spokes */}
          <g stroke={ink} strokeWidth="0.3">
            <line x1="-7" y1="3.5" x2="-7" y2="8.5" />
            <line x1="-9.5" y1="6" x2="-4.5" y2="6" />
            <line x1="7" y1="3.5" x2="7" y2="8.5" />
            <line x1="4.5" y1="6" x2="9.5" y2="6" />
          </g>
          {/* CHAIN around wheels — a few thick dark links */}
          <g fill="none" stroke={ink} strokeWidth="0.55">
            <ellipse cx="-7" cy="3.6" rx="0.8" ry="0.4" />
            <ellipse cx="-5" cy="4" rx="0.4" ry="0.8" />
            <ellipse cx="-7" cy="4.5" rx="0.8" ry="0.4" />
            <ellipse cx="7" cy="3.6" rx="0.8" ry="0.4" />
            <ellipse cx="9" cy="4" rx="0.4" ry="0.8" />
            <ellipse cx="7" cy="4.5" rx="0.8" ry="0.4" />
          </g>
        </g>
        {/* ROPE from rear of wagon angling UP-slope to anchor stump */}
        <line x1="-2" y1="-2" x2="-44" y2="-22" stroke={ink} strokeWidth="0.7" opacity="0.9" />
        <line x1="-2" y1="-2" x2="-44" y2="-22" stroke="#c8a878" strokeWidth="0.3" opacity="0.7" />
      </g>

      {/* ── Pioneers anchoring at top of chute ────────────────── */}
      <g>
        {/* two figures braced against the rope-anchor stump */}
        <g transform="translate(154, 116)">
          <ellipse cx="0" cy="-3" r="0.9" fill={LMK.paperWarm} stroke={ink} strokeWidth="0.2" />
          <ellipse cx="0" cy="-4" rx="1.5" ry="0.3" fill={ink} />
          <path d="M -1.2 -2 L 1.2 -2 L 1 2 L -1 2 Z" fill={LMK.earthDark} stroke={ink} strokeWidth="0.25" />
          <line x1="-0.6" y1="2" x2="-1.5" y2="5" stroke={ink} strokeWidth="0.4" />
          <line x1="0.6" y1="2" x2="1.5" y2="5" stroke={ink} strokeWidth="0.4" />
          {/* arms gripping rope */}
          <line x1="-1" y1="-1" x2="-3.5" y2="-3" stroke={ink} strokeWidth="0.45" />
          <line x1="1" y1="-1" x2="3.5" y2="-3" stroke={ink} strokeWidth="0.45" />
        </g>
        <g transform="translate(146, 120)">
          <ellipse cx="0" cy="-3" r="0.9" fill={LMK.paperWarm} stroke={ink} strokeWidth="0.2" />
          <ellipse cx="0" cy="-4" rx="1.5" ry="0.3" fill={ink} />
          <path d="M -1.2 -2 L 1.2 -2 L 1 2 L -1 2 Z" fill={LMK.rust} stroke={ink} strokeWidth="0.25" />
          <line x1="-0.6" y1="2" x2="-0.6" y2="5" stroke={ink} strokeWidth="0.4" />
          <line x1="0.6" y1="2" x2="0.6" y2="5" stroke={ink} strokeWidth="0.4" />
        </g>
      </g>

      {/* ── Pioneers waiting at bottom of chute ──────────────── */}
      <g>
        <g transform="translate(266, 174)">
          <ellipse cx="0" cy="-3" r="0.9" fill={LMK.paperWarm} stroke={ink} strokeWidth="0.2" />
          <ellipse cx="0" cy="-4" rx="1.5" ry="0.3" fill={ink} />
          <path d="M -1.2 -2 L 1.2 -2 L 1 2 L -1 2 Z" fill={LMK.earthDark} stroke={ink} strokeWidth="0.25" />
          <line x1="-0.6" y1="2" x2="-0.6" y2="5" stroke={ink} strokeWidth="0.4" />
          <line x1="0.6" y1="2" x2="0.6" y2="5" stroke={ink} strokeWidth="0.4" />
          {/* one arm raised, signaling */}
          <line x1="0.6" y1="-1.5" x2="3" y2="-3.5" stroke={ink} strokeWidth="0.5" strokeLinecap="round" />
        </g>
        {/* Already-descended wagon at bottom, parked */}
        <g transform="translate(296, 178)">
          <rect x="0" y="0" width="14" height="5" fill={LMK.earth} stroke={ink} strokeWidth="0.35" />
          <path d="M 0 0 Q 7 -8 14 0 Z" fill={LMK.white} stroke={ink} strokeWidth="0.45" />
          <circle cx="3" cy="6" r="1.8" fill="none" stroke={ink} strokeWidth="0.35" />
          <circle cx="11" cy="6" r="1.8" fill="none" stroke={ink} strokeWidth="0.35" />
        </g>
      </g>

      {/* ── Mossy forest floor — foreground ─────────────────── */}
      <rect x="0" y="170" width={LMK_VIEW_W} height="30" fill="#3e3a2a" opacity="0.4" />
      {/* fern strokes */}
      <g opacity="0.55" stroke={firMid} strokeWidth="0.4" fill="none">
        {[20, 60, 90, 360, 400, 440].map((x, i) => (
          <g key={i} transform={`translate(${x}, ${184 + (i % 3) * 4})`}>
            <path d="M 0 0 q -2 -3 -1 -6" />
            <path d="M 0 0 q 2 -3 1 -6" />
            <path d="M 0 0 q 0 -4 0 -7" />
          </g>
        ))}
      </g>
      {/* fallen log */}
      <g transform="translate(40, 186)">
        <ellipse cx="0" cy="0" rx="36" ry="2.6" fill={trunkBrown} stroke={ink} strokeWidth="0.45" />
        <ellipse cx="-32" cy="0" rx="3" ry="2.4" fill="#5e3e22" stroke={ink} strokeWidth="0.4" />
        {/* age rings */}
        <circle cx="-32" cy="0" r="1.6" fill="none" stroke={ink} strokeWidth="0.25" opacity="0.7" />
        <circle cx="-32" cy="0" r="0.9" fill="none" stroke={ink} strokeWidth="0.25" opacity="0.7" />
      </g>

      {/* ── Caption ──────────────────────────────────────────────────── */}
      <text x="240" y="194" textAnchor="middle"
        fontFamily="IM Fell English, Georgia, serif" fontSize="8"
        fill={inkSoft} fontStyle="italic" opacity="0.85">
        Barlow Road &mdash; Laurel Hill chute beneath Mt. Hood
      </text>
    </g>
  );
}

function FirTree({ x, y, h, w, dark }) {
  const ink = LMK.ink;
  const c1 = dark ? "#2a3826" : "#3e5638";
  const c2 = dark ? "#3e5638" : "#5e7a4c";
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* trunk */}
      <rect x={-w * 0.08} y={-h * 0.12} width={w * 0.16} height={h * 0.12} fill="#3e2818" stroke={ink} strokeWidth="0.3" />
      {/* layered Douglas-fir silhouette — narrow & tall */}
      <g stroke={ink} strokeWidth="0.35" fill={c1}>
        <path d={`M ${-w * 0.5} ${-h * 0.15} L 0 ${-h} L ${w * 0.5} ${-h * 0.15} Z`} />
      </g>
      {/* highlight side */}
      <path d={`M 0 ${-h} L ${-w * 0.45} ${-h * 0.18} L 0 ${-h * 0.18} Z`} fill={c2} opacity="0.7" />
      {/* texture marks suggesting branches */}
      <g opacity="0.55" stroke={ink} strokeWidth="0.25" fill="none">
        <path d={`M ${-w * 0.4} ${-h * 0.4} L 0 ${-h * 0.5}`} />
        <path d={`M ${w * 0.4} ${-h * 0.4} L 0 ${-h * 0.5}`} />
        <path d={`M ${-w * 0.3} ${-h * 0.6} L 0 ${-h * 0.7}`} />
        <path d={`M ${w * 0.3} ${-h * 0.6} L 0 ${-h * 0.7}`} />
      </g>
    </g>
  );
}

function Stump({ x, y, size = 3, ropeGroove = false }) {
  const ink = LMK.ink;
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* stump cylinder side */}
      <rect x={-size} y={-size * 0.5} width={size * 2} height={size * 1.4} fill="#5e3e22" stroke={ink} strokeWidth="0.4" />
      {/* top oval */}
      <ellipse cx="0" cy={-size * 0.5} rx={size} ry={size * 0.4} fill="#7e542e" stroke={ink} strokeWidth="0.4" />
      {/* age rings */}
      <ellipse cx="0" cy={-size * 0.5} rx={size * 0.65} ry={size * 0.26} fill="none" stroke={ink} strokeWidth="0.25" opacity="0.7" />
      <ellipse cx="0" cy={-size * 0.5} rx={size * 0.35} ry={size * 0.14} fill="none" stroke={ink} strokeWidth="0.25" opacity="0.7" />
      {ropeGroove && (
        <g opacity="0.8" stroke={ink} strokeWidth="0.4" fill="none">
          <path d={`M ${-size} 0 q ${size} -1.4 ${size * 2} 0`} />
          <path d={`M ${-size * 0.95} 0.5 q ${size * 0.95} -1.2 ${size * 1.9} 0`} />
        </g>
      )}
    </g>
  );
}

Object.assign(window, { BarlowRoadArt });
