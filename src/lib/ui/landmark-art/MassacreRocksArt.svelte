<!--
  MassacreRocksArt — mile ~1245, Snake River Plain, Power Co. ID.

  CRITICAL: the name \"Massacre Rocks\" is anachronistic for our 1843-
  1860 window (the 1862 skirmish that gave the site its modern name
  postdates our period entirely). Period names were \"Gate of Death\"
  or \"Devil's Gate (Snake)\" — emigrants feared the narrow defile
  through ambush-cover boulders, but no incident had yet happened.
  Display string for our period (per PR #158): \"Gate of Death.\"

  Composition (per docs/historical-pass/13-landmark-visual-references/
  massacre_rocks.md §3-5):
   - Open Snake River Plain sky (FLAT plain, NOT tall canyon walls)
   - Snake River as blue-gray horizontal band immediately north of trail
   - Large ROUNDED dark basalt boulders (Bonneville Flood polished,
     NOT angular) scattered in field pattern
   - Trail narrows to single-file at the \"gate\" — two boulders frame
     the passage
   - Single-file wagon column approaching/passing the gate
   - Outriders alert at the edges (anticipatory fear posture, NOT
     panic — pre-incident passage)
   - Register Rock visible on one boulder face with carved-name marks
   - Morning light raking — deep shadow between boulders, sun on
     west-facing surfaces
   - Caption uses PERIOD-ACCURATE name

  NON-RENDERABLES per research:
   - NO 1862 massacre imagery (dead emigrants, ambush, attack)
   - NO \"Massacre Rocks\" name anywhere in the scene
   - NO angular fresh-cut basalt (boulders are TUMBLED/ROUNDED)
   - NO tall canyon walls (this is FLAT plain with anomalous boulders)
   - NO Wyoming Devil's Gate confusion (this is basalt boulders on a
     plain, not a vertical cliff slot)
   - NO modern park infrastructure
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;

  // Snake River Plain palette per research §4.
  const skyHi = '#7a9ab0';            // open ID summer sky
  const sageDistant = '#8a8a78';      // distant sagebrush flat
  const sagePlain = '#a8a888';        // closer sage
  const sageShadow = '#6a6a56';
  const sandyVolcanic = '#c4b888';    // sandy volcanic soil track
  const snakeRiver = '#7e98a8';       // Snake blue-gray
  const snakeShadow = '#5e788e';
  const snakeShallow = '#a8c0c0';
  const basaltDark = '#3a3a3a';       // boulder dark side / shadow
  const basaltMid = '#5a5a52';        // boulder body
  const basaltHi = '#7a7a72';         // sun-struck face
  const basaltCarve = '#8a8478';      // carved inscription contrast
  const cottonwood = '#4a6840';        // sparse river-edge timber
</script>

<g>
  <!-- SKY — open Snake River Plain, large -->
  <rect x="0" y="0" width={LMK_VIEW_W} height="60" fill={skyHi} opacity="0.92" />
  <rect x="0" y="48" width={LMK_VIEW_W} height="16" fill={LMK.paperWarm} opacity="0.35" />
  <!-- thin cumulus high -->
  <g fill={LMK.white} opacity="0.5">
    <ellipse cx="100" cy="18" rx="38" ry="5" />
    <ellipse cx="380" cy="22" rx="50" ry="6" />
  </g>

  <!-- DISTANT SAGEBRUSH HORIZON — flat, not mountainous -->
  <path d="M 0 64 Q 120 60 240 64 Q 360 60 480 64 L 480 76 L 0 76 Z"
        fill={sageDistant} opacity="0.7" />

  <!-- SNAKE RIVER — horizontal band north of trail, immediately adjacent -->
  <rect x="0" y="78" width={LMK_VIEW_W} height="22" fill={snakeRiver} opacity="0.85" />
  <!-- flow texture suggestions -->
  <g stroke={LMK.white} stroke-width="0.3" opacity="0.5">
    <line x1="30" y1="84" x2="100" y2="84" />
    <line x1="160" y1="86" x2="230" y2="86" />
    <line x1="280" y1="84" x2="360" y2="84" />
    <line x1="400" y1="86" x2="470" y2="86" />
  </g>
  <!-- shallow shore patches -->
  <ellipse cx="200" cy="92" rx="60" ry="2" fill={snakeShallow} opacity="0.6" />
  <ellipse cx="380" cy="92" rx="50" ry="2" fill={snakeShallow} opacity="0.6" />
  <!-- river shadow at near (south) bank -->
  <rect x="0" y="96" width={LMK_VIEW_W} height="4" fill={snakeShadow} opacity="0.55" />

  <!-- A SPARSE COTTONWOOD or two on the river bank (not dense; this is
       open desert) -->
  <g fill={cottonwood} opacity="0.75">
    <ellipse cx="50" cy="98" rx="10" ry="3" />
    <ellipse cx="420" cy="98" rx="12" ry="3" />
  </g>

  <!-- NEAR SHORE strip + sagebrush plain stretching south of trail -->
  <rect x="0" y="100" width={LMK_VIEW_W} height="32" fill={sandyVolcanic} opacity="0.85" />
  <!-- a hint of sagebrush dots on the plain -->
  <g fill={sageShadow} opacity="0.55">
    {#each Array(20) as _, i}
      {@const x = 8 + (i * 24) % 472}
      {@const y = 108 + ((i * 7) % 18)}
      <ellipse cx={x} cy={y} rx="1.4" ry="0.7" />
    {/each}
  </g>

  <!-- LARGE ROUNDED BASALT BOULDERS — Bonneville Flood polished, dark.
       Scattered field along the south bank, with TWO LARGE BOULDERS
       framing the central \"gate\" defile. -->

  <!-- Left flanker boulder of the gate (largest, ~2-story) -->
  <g>
    <!-- main body -->
    <ellipse cx="190" cy="135" rx="32" ry="30" fill={basaltMid} stroke={ink} stroke-width="0.5" />
    <!-- shadow side (left, dark) -->
    <path d="M 190 110 Q 165 115 158 135 Q 162 165 185 165 Q 190 138 190 110 Z"
          fill={basaltDark} opacity="0.7" />
    <!-- sun-struck right face -->
    <path d="M 190 110 Q 215 115 222 135 Q 218 165 195 165 Q 192 138 190 110 Z"
          fill={basaltHi} opacity="0.45" />
    <!-- weathering striations -->
    <g stroke={basaltDark} stroke-width="0.3" fill="none" opacity="0.5">
      <path d="M 170 130 Q 190 132 210 130" />
      <path d="M 170 145 Q 190 148 210 145" />
      <path d="M 175 158 Q 190 161 205 158" />
    </g>
    <!-- Register Rock — carved-name lines on the sun-side face -->
    <g stroke={basaltCarve} stroke-width="0.3" opacity="0.65" font-family="IM Fell English, Georgia, serif">
      <text x="200" y="126" font-size="3" fill={basaltCarve} font-style="italic">J · GREEN · 49</text>
      <text x="200" y="134" font-size="3" fill={basaltCarve} font-style="italic">PALMER · 45</text>
      <text x="200" y="142" font-size="3" fill={basaltCarve} font-style="italic">1850</text>
      <text x="200" y="150" font-size="3" fill={basaltCarve} font-style="italic">M·W·DEAN</text>
      <text x="200" y="158" font-size="2.6" fill={basaltCarve} font-style="italic">A · F · M · 48</text>
    </g>
  </g>

  <!-- Right flanker boulder of the gate (slightly smaller, ~1.5-story) -->
  <g>
    <ellipse cx="290" cy="140" rx="28" ry="26" fill={basaltMid} stroke={ink} stroke-width="0.5" />
    <!-- shadow (left side, in shadow from morning sun behind) -->
    <path d="M 290 118 Q 268 122 262 140 Q 266 166 285 166 Q 290 145 290 118 Z"
          fill={basaltDark} opacity="0.7" />
    <!-- sun face right -->
    <path d="M 290 118 Q 312 122 318 140 Q 314 166 295 166 Q 292 145 290 118 Z"
          fill={basaltHi} opacity="0.45" />
    <!-- striations -->
    <g stroke={basaltDark} stroke-width="0.3" fill="none" opacity="0.5">
      <path d="M 270 138 Q 290 140 310 138" />
      <path d="M 272 152 Q 290 154 308 152" />
    </g>
  </g>

  <!-- THE \"GATE\" — narrow gap between the two big boulders. Cast in
       shadow except for a slash of morning light cutting through. -->
  <path d="M 220 110 L 220 175 L 260 175 L 260 110 Z" fill={basaltDark} opacity="0.18" />
  <!-- slash of direct light through the gap -->
  <line x1="225" y1="115" x2="245" y2="170" stroke={LMK.paperWarm} stroke-width="0.6" opacity="0.5" />

  <!-- SCATTERED SMALLER BOULDERS in the field — defining the scatter
       pattern. NOT in a wall, but distributed. -->
  <g>
    <!-- back row (further from viewer) -->
    <ellipse cx="80" cy="125" rx="14" ry="11" fill={basaltMid} stroke={ink} stroke-width="0.4" />
    <ellipse cx="80" cy="123" rx="8" ry="5" fill={basaltDark} opacity="0.65" />
    <ellipse cx="125" cy="118" rx="11" ry="9" fill={basaltMid} stroke={ink} stroke-width="0.4" />
    <ellipse cx="125" cy="116" rx="6" ry="4" fill={basaltDark} opacity="0.65" />
    <ellipse cx="350" cy="118" rx="10" ry="8" fill={basaltMid} stroke={ink} stroke-width="0.4" />
    <ellipse cx="385" cy="124" rx="13" ry="10" fill={basaltMid} stroke={ink} stroke-width="0.4" />
    <ellipse cx="385" cy="122" rx="7" ry="5" fill={basaltDark} opacity="0.65" />
    <ellipse cx="445" cy="126" rx="16" ry="12" fill={basaltMid} stroke={ink} stroke-width="0.4" />
    <ellipse cx="445" cy="124" rx="9" ry="6" fill={basaltDark} opacity="0.65" />

    <!-- foreground smaller boulders -->
    <ellipse cx="40" cy="178" rx="9" ry="6" fill={basaltMid} stroke={ink} stroke-width="0.4" />
    <ellipse cx="40" cy="176" rx="6" ry="3" fill={basaltDark} opacity="0.65" />
    <ellipse cx="155" cy="180" rx="7" ry="5" fill={basaltMid} stroke={ink} stroke-width="0.4" />
    <ellipse cx="330" cy="182" rx="10" ry="6" fill={basaltMid} stroke={ink} stroke-width="0.4" />
    <ellipse cx="330" cy="180" rx="6" ry="3" fill={basaltDark} opacity="0.65" />
    <ellipse cx="425" cy="184" rx="8" ry="5" fill={basaltMid} stroke={ink} stroke-width="0.4" />
  </g>

  <!-- TRAIL through the gate — narrow path of dust between boulders.
       Visibly constricted at the gate point. -->
  <path d="M 0 168 Q 60 165 130 162 L 220 158 L 260 158 L 330 162 Q 400 165 480 168"
        fill="none" stroke={sandyVolcanic} stroke-width="3" opacity="0.7" />
  <!-- darker shadow line down trail center suggesting wagon rut -->
  <path d="M 0 168 Q 60 165 130 162 L 220 158 L 260 158 L 330 162 Q 400 165 480 168"
        fill="none" stroke={sageShadow} stroke-width="0.6" opacity="0.6" />

  <!-- SINGLE-FILE WAGON COLUMN — three wagons in a line, one in the
       gate, one approaching, one beyond -->
  <!-- wagon in the gate (smallest, in shadow) -->
  <g transform="translate(240 158)">
    <rect x="-6" y="-2.2" width="12" height="2.4" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
    <path d="M -6 -2.2 Q 0 -7 6 -2.2 Z" fill={LMK.white} stroke={ink} stroke-width="0.45" />
    <circle cx="-3" cy="0.5" r="1.7" fill="none" stroke={ink} stroke-width="0.35" />
    <circle cx="3" cy="0.5" r="1.7" fill="none" stroke={ink} stroke-width="0.35" />
  </g>
  <!-- wagon approaching from east (right) -->
  <g transform="translate(360 162)">
    <rect x="-7" y="-2.5" width="14" height="2.8" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
    <path d="M -7 -2.5 Q 0 -9 7 -2.5 Z" fill={LMK.white} stroke={ink} stroke-width="0.45" />
    <circle cx="-4" cy="0.8" r="2" fill="none" stroke={ink} stroke-width="0.4" />
    <circle cx="4" cy="0.8" r="2" fill="none" stroke={ink} stroke-width="0.4" />
  </g>
  <!-- wagon already through (west, foreground left) -->
  <g transform="translate(110 165)">
    <rect x="-7" y="-2.5" width="14" height="2.8" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
    <path d="M -7 -2.5 Q 0 -9 7 -2.5 Z" fill={LMK.white} stroke={ink} stroke-width="0.45" />
    <circle cx="-4" cy="0.8" r="2" fill="none" stroke={ink} stroke-width="0.4" />
    <circle cx="4" cy="0.8" r="2" fill="none" stroke={ink} stroke-width="0.4" />
  </g>

  <!-- OUTRIDER on horseback at the edge — alert/scanning posture, the
       anticipatory-fear human element per research -->
  <g transform="translate(420 168)">
    <!-- horse -->
    <ellipse cx="0" cy="0" rx="4" ry="2" fill={LMK.earthDark} stroke={ink} stroke-width="0.35" />
    <line x1="-2" y1="2" x2="-2.5" y2="5" stroke={ink} stroke-width="0.3" />
    <line x1="2" y1="2" x2="2.5" y2="5" stroke={ink} stroke-width="0.3" />
    <!-- rider -->
    <ellipse cx="0" cy="-3" rx="0.8" ry="2" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
    <ellipse cx="0" cy="-5.5" rx="0.6" ry="0.8" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
  </g>

  <!-- caption — uses PERIOD-ACCURATE name -->
  <text x="240" y="194" text-anchor="middle"
        font-family="IM Fell English, Georgia, serif" font-size="7"
        fill={inkSoft} font-style="italic" opacity="0.9">
    Gate of Death — single-file through the basalt scatter, Snake River
  </text>
</g>
