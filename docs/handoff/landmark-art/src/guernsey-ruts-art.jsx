/* global React, LMK, LMK_VIEW_W, LMK_VIEW_H */

// ============================================================================
// GuernseyRutsArt — sandstone cut by 5-ft-deep wagon ruts
// ============================================================================
// At Guernsey, Wyoming, the trail funneled across a sandstone ridge. After
// thousands of wagons, the ruts were carved 4–6 ft DEEP into solid stone —
// the most dramatic physical trace of the migration. Composition: viewer
// peers down a deep, narrow rock-cut, looking through the cut at distant
// prairie. A lone wagon descending toward us, hubs scraping the walls.
// ============================================================================

function GuernseyRutsArt() {
  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const stone = "#cdb887";
  const stoneSh = "#8a704a";
  const stoneShDeep = "#5a4628";

  return (
    <g>
      {/* sky/distant prairie peeking through the cut */}
      <rect x="0" y="0" width={LMK_VIEW_W} height="60" fill={LMK.parchment} opacity="0.45" />
      <path d="M 180 60 Q 240 56 300 60 L 300 78 Q 240 80 180 78 Z" fill={LMK.sage} opacity="0.55" />

      {/* SANDSTONE RIDGE — left and right walls of the cut */}
      <g>
        {/* left wall */}
        <path d="M 0 30 L 80 28 L 140 36 L 200 60 L 200 156 L 0 156 Z"
              fill={stone} stroke={ink} strokeWidth="0.7" />
        {/* shadowed inside face */}
        <path d="M 200 60 L 180 70 L 170 90 L 165 120 L 175 156 L 200 156 Z"
              fill={stoneSh} opacity="0.7" />
        {/* strata */}
        <g stroke={stoneSh} strokeWidth="0.4" fill="none" opacity="0.55">
          <path d="M 0 60 Q 100 56 200 60" />
          <path d="M 0 90 Q 100 86 200 90" />
          <path d="M 0 116 Q 100 112 200 116" />
        </g>
        <g stroke={stoneShDeep} strokeWidth="0.4" fill="none" opacity="0.55">
          <path d="M 40 30 q -2 60 4 126" />
          <path d="M 110 36 q -2 50 4 120" />
        </g>

        {/* right wall — mirrored */}
        <path d="M 480 30 L 400 28 L 340 36 L 280 60 L 280 156 L 480 156 Z"
              fill={stone} stroke={ink} strokeWidth="0.7" />
        <path d="M 280 60 L 300 70 L 310 90 L 315 120 L 305 156 L 280 156 Z"
              fill={stoneSh} opacity="0.7" />
        <g stroke={stoneSh} strokeWidth="0.4" fill="none" opacity="0.55">
          <path d="M 280 60 Q 380 56 480 60" />
          <path d="M 280 90 Q 380 86 480 90" />
          <path d="M 280 116 Q 380 112 480 116" />
        </g>
        <g stroke={stoneShDeep} strokeWidth="0.4" fill="none" opacity="0.55">
          <path d="M 370 30 q 2 60 -4 126" />
          <path d="M 440 36 q 2 50 -4 120" />
        </g>

        {/* tops of walls — sun-side highlight */}
        <path d="M 0 30 L 80 28 L 140 36 L 200 60 L 184 60 L 134 42 L 80 36 L 0 38 Z"
              fill="#e8d2a0" opacity="0.55" />
        <path d="M 480 30 L 400 28 L 340 36 L 280 60 L 296 60 L 346 42 L 400 36 L 480 38 Z"
              fill="#e8d2a0" opacity="0.55" />

        {/* HUB-SCRAPE marks on inside walls — diagonal grooves */}
        <g stroke={stoneShDeep} strokeWidth="0.55" fill="none" opacity="0.7">
          <path d="M 192 90 q -10 18 -22 38" />
          <path d="M 188 110 q -8 14 -16 30" />
          <path d="M 184 140 q -6 8 -10 14" />
        </g>
        <g stroke={stoneShDeep} strokeWidth="0.55" fill="none" opacity="0.7">
          <path d="M 288 90 q 10 18 22 38" />
          <path d="M 292 110 q 8 14 16 30" />
          <path d="M 296 140 q 6 8 10 14" />
        </g>
      </g>

      {/* THE FLOOR OF THE CUT — receding in perspective with deep ruts */}
      <g>
        {/* floor base */}
        <path d="M 200 60 L 280 60 L 320 156 L 160 156 Z"
              fill="#a89060" stroke={ink} strokeWidth="0.55" />
        {/* the two parallel deep ruts */}
        <path d="M 226 64 L 244 156 L 232 156 L 218 64 Z" fill={stoneShDeep} opacity="0.85" />
        <path d="M 254 64 L 268 156 L 256 156 L 240 64 Z" fill={stoneShDeep} opacity="0.85" />
        {/* depth shadow inside ruts */}
        <path d="M 222 70 L 240 156 L 235 156 L 221 70 Z" fill="#2a1a0a" opacity="0.7" />
        <path d="M 252 70 L 264 156 L 260 156 L 246 70 Z" fill="#2a1a0a" opacity="0.7" />
      </g>

      {/* WAGON descending toward viewer — small in distance */}
      <g transform="translate(240 96)">
        {/* dust under it */}
        <ellipse cx="0" cy="6" rx="14" ry="2" fill={LMK.parchmentSh} opacity="0.7" />
        {/* oxen pair (small) */}
        <g transform="translate(0 -2)" opacity="0.95">
          <ellipse cx="0" cy="0" rx="3" ry="1.4" fill={LMK.earthDark} stroke={ink} strokeWidth="0.3" />
          <ellipse cx="2.6" cy="-0.5" rx="1.2" ry="1.1" fill={LMK.earthDark} stroke={ink} strokeWidth="0.3" />
        </g>
        {/* wagon */}
        <rect x="-9" y="-9" width="18" height="3" fill={LMK.earth} stroke={ink} strokeWidth="0.4" />
        <path d="M -9 -9 Q 0 -17 9 -9 Z" fill={LMK.white} stroke={ink} strokeWidth="0.45" />
        <circle cx="-5" cy="-4" r="2.2" fill="none" stroke={ink} strokeWidth="0.4" />
        <circle cx="5" cy="-4" r="2.2" fill="none" stroke={ink} strokeWidth="0.4" />
      </g>

      {/* a small carved name on the wall */}
      <text x="60" y="78" fontSize="3" fontFamily="IM Fell English, Georgia, serif"
            fill={stoneShDeep} fontStyle="italic" opacity="0.7" transform="rotate(-3 60 78)">
        Bryant · 1846
      </text>
      <text x="412" y="76" fontSize="3" fontFamily="IM Fell English, Georgia, serif"
            fill={stoneShDeep} fontStyle="italic" opacity="0.7" transform="rotate(2 412 76)">
        J·F·R · '46
      </text>

      {/* foreground walking path strip */}
      <rect x="0" y="160" width={LMK_VIEW_W} height={LMK_VIEW_H - 160} fill={LMK.parchment} opacity="0.55" />

      <text x="240" y="194" textAnchor="middle"
            fontFamily="IM Fell English, Georgia, serif" fontSize="8"
            fill={inkSoft} fontStyle="italic" opacity="0.85">
        Guernsey Ruts — &ldquo;cut five feet deep into living stone&rdquo;
      </text>
    </g>
  );
}

Object.assign(window, { GuernseyRutsArt });
