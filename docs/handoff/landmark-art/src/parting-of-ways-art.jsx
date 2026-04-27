/* global React, LMK, LMK_VIEW_W, LMK_VIEW_H */

// ============================================================================
// PartingOfTheWaysArt — the trail forks: Sublette Cutoff vs. Fort Bridger
// ============================================================================
// At a featureless sage plain, the trail visibly DIVIDES — left to Fort
// Bridger (longer, water), right to Sublette Cutoff (shorter, dry crossing
// of 50 miles with NO water). The decision haunted everyone. A wooden
// signpost with hand-lettered boards stood there. Composition: low horizon,
// sage flat, one signpost dead center, two distinct trails diverging into
// the distance, a wagon paused at the fork.
// ============================================================================

function PartingOfTheWaysArt() {
  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;

  return (
    <g>
      {/* big sky */}
      <rect x="0" y="0" width={LMK_VIEW_W} height="80" fill={LMK.parchment} opacity="0.45" />
      {/* far blue ridge */}
      <path d="M 0 80 Q 80 76 160 78 Q 240 72 320 78 Q 400 74 480 78 L 480 96 L 0 96 Z"
            fill="#8a9aa8" opacity="0.5" />
      <path d="M 0 96 Q 80 94 160 96 Q 240 94 320 96 Q 400 94 480 96 L 480 102 L 0 102 Z"
            fill={LMK.sageDark} opacity="0.45" />

      {/* sage flat — vast, empty */}
      <rect x="0" y="102" width={LMK_VIEW_W} height={LMK_VIEW_H - 102} fill={LMK.parchment} opacity="0.5" />
      <g opacity="0.5">
        {Array.from({ length: 28 }).map((_, i) => {
          const x = 8 + (i * 17) % 480;
          const y = 110 + (i * 9) % 80;
          return (
            <ellipse key={i} cx={x} cy={y} rx={2.4 + (i % 3) * 0.8} ry="1.1"
                     fill={LMK.sage} stroke={ink} strokeWidth="0.25" />
          );
        })}
      </g>

      {/* TWO TRAILS DIVERGING — converging at vanishing point near sign */}
      <g>
        {/* left trail — toward Fort Bridger */}
        <path d="M 240 116 Q 180 130 100 144 Q 40 154 0 162"
              stroke={LMK.earth} strokeWidth="3" fill="none" opacity="0.55" strokeLinecap="round" />
        <path d="M 240 116 Q 180 130 100 144 Q 40 154 0 162"
              stroke={LMK.earthDark} strokeWidth="0.6" fill="none" opacity="0.7" strokeDasharray="2 3" />
        {/* right trail — Sublette Cutoff */}
        <path d="M 240 116 Q 300 130 380 144 Q 440 154 480 162"
              stroke={LMK.earth} strokeWidth="3" fill="none" opacity="0.55" strokeLinecap="round" />
        <path d="M 240 116 Q 300 130 380 144 Q 440 154 480 162"
              stroke={LMK.earthDark} strokeWidth="0.6" fill="none" opacity="0.7" strokeDasharray="2 3" />

        {/* approaching trail */}
        <path d="M 240 116 Q 240 138 240 200" stroke={LMK.earth} strokeWidth="3" fill="none" opacity="0.55" strokeLinecap="round" />
      </g>

      {/* THE SIGNPOST — center, hero element */}
      <g transform="translate(240 116)">
        {/* post */}
        <line x1="0" y1="0" x2="0" y2="-44" stroke="#4a3220" strokeWidth="1.4" />
        <line x1="-0.7" y1="0" x2="-0.7" y2="-44" stroke="#3a2410" strokeWidth="0.4" />
        {/* base rocks */}
        <ellipse cx="0" cy="0.5" rx="4" ry="1" fill={LMK.earthDark} stroke={ink} strokeWidth="0.35" />

        {/* left board → Fort Bridger */}
        <g transform="translate(-1 -34) rotate(-12)">
          <path d="M -22 -3 L -2 -3 L 0 0 L -2 3 L -22 3 Z"
                fill={LMK.paperWarm} stroke={ink} strokeWidth="0.55" />
          <text x="-12" y="0.6" fontSize="3.2" fontFamily="IM Fell English, Georgia, serif"
                fill={ink} textAnchor="middle">
            FORT BRIDGER
          </text>
          <text x="-12" y="3.6" fontSize="2.4" fontFamily="IM Fell English, Georgia, serif"
                fill={inkSoft} textAnchor="middle" fontStyle="italic">
            longer · water
          </text>
        </g>

        {/* right board → Sublette Cutoff */}
        <g transform="translate(1 -22) rotate(10)">
          <path d="M 22 -3 L 2 -3 L 0 0 L 2 3 L 22 3 Z"
                fill={LMK.paperWarm} stroke={ink} strokeWidth="0.55" />
          <text x="12" y="0.6" fontSize="3.2" fontFamily="IM Fell English, Georgia, serif"
                fill={ink} textAnchor="middle">
            SUBLETTE CUTOFF
          </text>
          <text x="12" y="3.6" fontSize="2.4" fontFamily="IM Fell English, Georgia, serif"
                fill={inkSoft} textAnchor="middle" fontStyle="italic">
            shorter · 50 dry miles
          </text>
        </g>

        {/* small carved arrow on top */}
        <path d="M -2 -44 L 0 -47 L 2 -44 Z" fill="#4a3220" />

        {/* a few names scratched into the post */}
        <g fontSize="1.6" fontFamily="IM Fell English, Georgia, serif" fill="#3a2410" opacity="0.7">
          <text x="0" y="-12" textAnchor="middle">JFR · 1846</text>
          <text x="0" y="-9" textAnchor="middle">B·Y · 1847</text>
          <text x="0" y="-6" textAnchor="middle">PALMER 49</text>
        </g>
      </g>

      {/* a wagon paused at the fork — driver thinking */}
      <g transform="translate(240 152)">
        {/* shadow */}
        <ellipse cx="0" cy="6" rx="14" ry="1.5" fill={LMK.parchmentSh} opacity="0.7" />
        {/* oxen */}
        <g transform="translate(0 -2)">
          <ellipse cx="0" cy="0" rx="3" ry="1.4" fill={LMK.earthDark} stroke={ink} strokeWidth="0.3" />
          <ellipse cx="2.6" cy="-0.5" rx="1.2" ry="1.1" fill={LMK.earthDark} stroke={ink} strokeWidth="0.3" />
        </g>
        {/* wagon body, facing forward */}
        <rect x="-9" y="-7" width="18" height="3" fill={LMK.earth} stroke={ink} strokeWidth="0.4" />
        <path d="M -9 -7 Q 0 -15 9 -7 Z" fill={LMK.white} stroke={ink} strokeWidth="0.45" />
        <circle cx="-5" cy="-2" r="2.2" fill="none" stroke={ink} strokeWidth="0.4" />
        <circle cx="5" cy="-2" r="2.2" fill="none" stroke={ink} strokeWidth="0.4" />
        {/* driver standing at front, hand raised */}
        <g transform="translate(-12 -8)">
          <ellipse cx="0" cy="0" rx="0.8" ry="0.9" fill={LMK.paperWarm} stroke={ink} strokeWidth="0.25" />
          <path d="M -1 1 L 1 1 L 1.2 5 L -1.2 5 Z" fill={LMK.earthDark} stroke={ink} strokeWidth="0.3" />
          <line x1="1" y1="2" x2="3" y2="-1" stroke={ink} strokeWidth="0.4" />
          <path d="M -1.2 -0.8 L 1.2 -0.8 L 1 -1.4 L -1 -1.4 Z" fill={LMK.earthDark} stroke={ink} strokeWidth="0.25" />
        </g>
      </g>

      {/* tiny dust plumes on each diverging trail (departed wagons) */}
      <g opacity="0.5">
        <ellipse cx="80" cy="148" rx="6" ry="2" fill={LMK.parchmentSh} />
        <ellipse cx="74" cy="146" rx="3" ry="1.4" fill={LMK.parchmentSh} />
        <ellipse cx="400" cy="148" rx="6" ry="2" fill={LMK.parchmentSh} />
        <ellipse cx="406" cy="146" rx="3" ry="1.4" fill={LMK.parchmentSh} />
      </g>

      <text x="240" y="194" textAnchor="middle"
            fontFamily="IM Fell English, Georgia, serif" fontSize="8"
            fill={inkSoft} fontStyle="italic" opacity="0.85">
        The Parting of the Ways — &ldquo;here the company stood and chose&rdquo;
      </text>
    </g>
  );
}

Object.assign(window, { PartingOfTheWaysArt });
