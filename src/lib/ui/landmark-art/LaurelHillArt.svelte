<!--
  LaurelHillArt — mile ~2030, Mt. Hood south slope, Cascades OR.

  The most-feared descent on the Oregon Trail and the LAST physical
  danger before the Sandy River valley + Oregon City. 60-percent grade
  in a rock chute 5-7 ft deep, eroded by thousands of wagons. Emigrants
  used \"snubbing\" — ropes wrapped around tree stumps at the top, plus
  a large log dragged behind on chains as brake. When ropes snapped,
  wagons hurtled to ruin.

  Period gate: abandonedBeforeYear: 1846 (landed PR #158) — pre-1846
  the Barlow Road didn't exist.

  Composition (per docs/historical-pass/13-landmark-visual-references/
  laurel_hill.md §3-4, default overcast mid-descent):
   - Narrow rock CHUTE descending steeply through center of frame
   - Walls of chute: rock + hardpan clay, ~7 ft deep
   - Wagon mid-chute, tilted ~25 degrees forward (the 60% grade reads
     dangerous, NOT merely steep)
   - All wheels chain-locked (rough-locked)
   - Large LOG dragged behind on chains (the period brake technique)
   - Rope from wagon-tongue UP to tree stump at chute top
   - Two figures at stump managing the snubbing rope
   - Rhododendron (\"laurel\") thickets flanking the cleared chute
   - Old-growth Douglas fir canopy framing above (massive trunks)
   - Mt. Hood glaciated summit visible top-right ABOVE the forest
   - Dead ox carcass at chute edge (period-accurate per Knight 1853:
     \"smelling the carrion\")
   - Cool overcast PNW light, deep shadow in chute
   - Caption quotes Amelia Stewart Knight 1853

  Non-renderables per research:
   - NO gradual / manageable slope (60% near-vertical)
   - NO modern second-growth tree scale (must be old-growth massive)
   - NO smooth / paved road (chute is rough rocky trench)
   - NO rhododendron in bloom (Sept-Oct foliage only)
   - NO pristine wagon (battered after 6 months)
   - NO single wagon (it's communal labor)
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;

  // PNW palette per research
  const skyOvercast = '#a8b0b0';      // overcast PNW grey
  const skyCloud = '#8a9090';
  const hoodSummit = '#dadcdc';       // glaciated white-blue
  const hoodShadow = '#909898';
  const dougFir = '#2a4028';          // old-growth dark green
  const dougFirHi = '#3a5238';
  const dougFirTrunk = '#2a1808';
  const rhodoLeaf = '#3e5436';        // dark evergreen rhodo foliage
  const rhodoShadow = '#28321e';
  const chuteWall = '#5a4a32';        // hardpan clay chute walls
  const chuteWallDark = '#3a2e1e';
  const chuteFloor = '#4a3e26';
  const chuteStone = '#6a5840';
  const ropeBrown = '#8a6a48';
  const ropeSh = '#5a3a20';
  const stumpRaw = '#a89878';         // worn-white wood from rope burns
  const carrion = '#6a5848';
</script>

<g>
  <!-- SKY — overcast PNW grey -->
  <rect x="0" y="0" width={LMK_VIEW_W} height="50" fill={skyOvercast} opacity="0.9" />
  <rect x="0" y="35" width={LMK_VIEW_W} height="15" fill={skyCloud} opacity="0.5" />

  <!-- MT HOOD glaciated summit — visible top-right above the canopy -->
  <g>
    <!-- main summit triangle -->
    <path d="M 360 50 L 405 14 L 450 50 Z" fill={hoodSummit} stroke={ink} stroke-width="0.45" />
    <!-- shadow side -->
    <path d="M 405 14 L 450 50 L 430 50 Z" fill={hoodShadow} opacity="0.6" />
    <!-- second peak ridge -->
    <path d="M 425 35 L 445 22 L 475 50 L 425 50 Z" fill={hoodShadow} opacity="0.7" />
  </g>

  <!-- OLD-GROWTH DOUGLAS FIR CANOPY — massive dark trees framing the
       chute on both sides + filling the upper background -->
  <g>
    <!-- back canopy layer -->
    <ellipse cx="80" cy="60" rx="80" ry="14" fill={dougFir} opacity="0.85" />
    <ellipse cx="200" cy="55" rx="70" ry="15" fill={dougFir} opacity="0.85" />
    <ellipse cx="320" cy="60" rx="55" ry="13" fill={dougFir} opacity="0.85" />
    <ellipse cx="430" cy="62" rx="50" ry="12" fill={dougFir} opacity="0.85" />
    <!-- foreground large fir trunks framing -->
    <!-- left fir cluster -->
    <line x1="40" y1="180" x2="38" y2="60" stroke={dougFirTrunk} stroke-width="4" />
    <line x1="80" y1="200" x2="78" y2="50" stroke={dougFirTrunk} stroke-width="5" />
    <ellipse cx="40" cy="55" rx="22" ry="40" fill={dougFir} opacity="0.9" />
    <ellipse cx="80" cy="50" rx="28" ry="50" fill={dougFirHi} opacity="0.85" />
    <!-- right fir cluster -->
    <line x1="430" y1="200" x2="432" y2="55" stroke={dougFirTrunk} stroke-width="5" />
    <line x1="470" y1="200" x2="468" y2="60" stroke={dougFirTrunk} stroke-width="4" />
    <ellipse cx="430" cy="50" rx="28" ry="50" fill={dougFir} opacity="0.9" />
    <ellipse cx="470" cy="55" rx="22" ry="40" fill={dougFirHi} opacity="0.85" />
  </g>

  <!-- RHODODENDRON THICKETS — dense evergreen foliage on the slope
       flanks of the chute (NOT in bloom, Sept-Oct) -->
  <g>
    <!-- left of chute -->
    <ellipse cx="140" cy="115" rx="40" ry="14" fill={rhodoLeaf} stroke={inkSoft} stroke-width="0.3" />
    <ellipse cx="110" cy="125" rx="28" ry="10" fill={rhodoShadow} opacity="0.85" />
    <ellipse cx="160" cy="135" rx="32" ry="11" fill={rhodoLeaf} opacity="0.85" />
    <ellipse cx="120" cy="150" rx="35" ry="11" fill={rhodoShadow} opacity="0.85" />
    <!-- right of chute -->
    <ellipse cx="350" cy="115" rx="40" ry="14" fill={rhodoLeaf} stroke={inkSoft} stroke-width="0.3" />
    <ellipse cx="380" cy="125" rx="28" ry="10" fill={rhodoShadow} opacity="0.85" />
    <ellipse cx="335" cy="135" rx="32" ry="11" fill={rhodoLeaf} opacity="0.85" />
    <ellipse cx="370" cy="150" rx="35" ry="11" fill={rhodoShadow} opacity="0.85" />
  </g>

  <!-- THE CHUTE — narrow rock trench descending steeply through center.
       The dominant visual element. Walls slope inward from top (y=92)
       to bottom (y=200) showing the 5-7 ft trench depth. Approximately
       30 px wide at top, 50 px at bottom (perspective). -->
  <g>
    <!-- chute floor (rocky, dark) -->
    <path d="M 220 92 L 260 92 L 285 200 L 195 200 Z"
          fill={chuteFloor} stroke={ink} stroke-width="0.5" />
    <!-- left chute wall (shadow side, eroded clay) -->
    <path d="M 190 100 L 220 92 L 195 200 L 165 200 Z"
          fill={chuteWallDark} stroke={ink} stroke-width="0.45" />
    <!-- right chute wall (slightly lit) -->
    <path d="M 290 100 L 260 92 L 285 200 L 315 200 Z"
          fill={chuteWall} stroke={ink} stroke-width="0.45" />
    <!-- wall textures - exposed rock chunks -->
    <g fill={chuteStone} opacity="0.7">
      <ellipse cx="180" cy="130" rx="3" ry="4" />
      <ellipse cx="172" cy="160" rx="4" ry="3" />
      <ellipse cx="305" cy="135" rx="3" ry="4" />
      <ellipse cx="310" cy="170" rx="4" ry="3" />
    </g>
    <!-- erosion striations on walls -->
    <g stroke={chuteWallDark} stroke-width="0.4" fill="none" opacity="0.6">
      <path d="M 175 110 L 198 200" />
      <path d="M 185 110 L 207 200" />
      <path d="M 295 110 L 277 200" />
      <path d="M 305 110 L 287 200" />
    </g>
    <!-- stony chute-floor texture -->
    <g fill={chuteStone} opacity="0.55">
      <ellipse cx="225" cy="120" rx="2.5" ry="1.2" />
      <ellipse cx="245" cy="140" rx="3" ry="1.4" />
      <ellipse cx="230" cy="160" rx="2.5" ry="1.2" />
      <ellipse cx="250" cy="178" rx="3.5" ry="1.5" />
    </g>
  </g>

  <!-- TREE STUMP at chute top with rope burns — the snubbing anchor.
       Worn-white from countless rope passes. -->
  <g transform="translate(230 85)">
    <!-- stump body -->
    <ellipse cx="0" cy="0" rx="6" ry="3" fill={stumpRaw} stroke={ink} stroke-width="0.4" />
    <rect x="-5" y="-4" width="10" height="4" fill={stumpRaw} stroke={ink} stroke-width="0.4" />
    <!-- rope burn ring at top -->
    <line x1="-5" y1="-3" x2="5" y2="-3" stroke={ropeSh} stroke-width="0.7" />
    <line x1="-5" y1="-2" x2="5" y2="-2" stroke={ropeSh} stroke-width="0.5" opacity="0.7" />
    <!-- worn-white scar on side -->
    <rect x="-5" y="-2" width="10" height="1" fill={LMK.white} opacity="0.6" />
  </g>

  <!-- ROPE from stump down to wagon — taut, snubbing the descent -->
  <line x1="230" y1="82" x2="244" y2="150" stroke={ropeBrown} stroke-width="0.8" />
  <line x1="232" y1="82" x2="246" y2="150" stroke={ropeSh} stroke-width="0.4" />

  <!-- TWO FIGURES at the stump managing the snubbing rope -->
  <g transform="translate(220 80)">
    <ellipse cx="0" cy="0" rx="1" ry="3" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
    <ellipse cx="0" cy="-3.5" rx="0.8" ry="0.9" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
    <!-- arm holding rope -->
    <line x1="0.5" y1="-1" x2="6" y2="0" stroke={ink} stroke-width="0.35" />
  </g>
  <g transform="translate(244 80)">
    <ellipse cx="0" cy="0" rx="1" ry="3" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
    <ellipse cx="0" cy="-3.5" rx="0.8" ry="0.9" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
    <line x1="-0.5" y1="-1" x2="-4" y2="0" stroke={ink} stroke-width="0.35" />
  </g>

  <!-- WAGON MID-CHUTE — tilted sharply forward, all wheels chain-locked,
       canvas top patched/worn. Rotated ~25 degrees to read as dangerous. -->
  <g transform="translate(245 150) rotate(20)">
    <!-- wagon body (battered) -->
    <rect x="-9" y="-3.2" width="18" height="3.5" fill={LMK.earth} stroke={ink} stroke-width="0.5" />
    <!-- canvas top (worn / patched) -->
    <path d="M -9 -3.2 Q 0 -11 9 -3.2 Z" fill={LMK.paperCool} stroke={ink} stroke-width="0.5" />
    <!-- patch suggestion -->
    <line x1="-3" y1="-6" x2="0" y2="-9" stroke={inkSoft} stroke-width="0.3" />
    <line x1="0" y1="-9" x2="3" y2="-6" stroke={inkSoft} stroke-width="0.3" />
    <!-- front wheel (chain-locked) -->
    <circle cx="-5" cy="1" r="2.6" fill="none" stroke={ink} stroke-width="0.5" />
    <line x1="-7" y1="-1" x2="-3" y2="3" stroke={ink} stroke-width="0.45" />
    <!-- rear wheel (chain-locked) -->
    <circle cx="5" cy="1" r="2.6" fill="none" stroke={ink} stroke-width="0.5" />
    <line x1="3" y1="-1" x2="7" y2="3" stroke={ink} stroke-width="0.45" />
  </g>

  <!-- LARGE LOG DRAGGED BEHIND on chains — the period brake technique
       (40 ft log per research). Trail of gouges in chute. -->
  <g transform="translate(255 168) rotate(20)">
    <!-- log body, long and thick -->
    <rect x="-3" y="-1.5" width="20" height="3" fill={dougFirTrunk} stroke={ink} stroke-width="0.4" />
    <!-- broken branches scraping the floor -->
    <line x1="2" y1="1.5" x2="0" y2="3.5" stroke={dougFirTrunk} stroke-width="0.5" />
    <line x1="8" y1="1.5" x2="7" y2="3.5" stroke={dougFirTrunk} stroke-width="0.5" />
    <line x1="14" y1="1.5" x2="14" y2="3.5" stroke={dougFirTrunk} stroke-width="0.5" />
    <!-- chain to wagon rear -->
    <line x1="-3" y1="-1" x2="-8" y2="-7" stroke={ropeSh} stroke-width="0.45" />
  </g>

  <!-- DEAD OX CARCASS at the chute edge — period detail per Knight
       1853 \"smelling the carrion\" -->
  <g transform="translate(160 188)">
    <ellipse cx="0" cy="0" rx="6" ry="2.5" fill={carrion} stroke={inkSoft} stroke-width="0.4" />
    <!-- legs sticking up (fallen on its side) -->
    <line x1="-3" y1="-1" x2="-3" y2="-4" stroke={ink} stroke-width="0.4" />
    <line x1="-1" y1="-1.5" x2="-1" y2="-5" stroke={ink} stroke-width="0.4" />
    <line x1="2" y1="-1.5" x2="2" y2="-5" stroke={ink} stroke-width="0.4" />
    <line x1="4" y1="-1" x2="4" y2="-4" stroke={ink} stroke-width="0.4" />
  </g>

  <!-- caption — quotes Amelia Stewart Knight 1853 -->
  <text x="240" y="194" text-anchor="middle"
        font-family="IM Fell English, Georgia, serif" font-size="6.5"
        fill={inkSoft} font-style="italic" opacity="0.92">
    Laurel Hill — &ldquo;steep, winding, sideling, deep down, slippery and muddy&rdquo; (Knight, 1853)
  </text>
</g>
