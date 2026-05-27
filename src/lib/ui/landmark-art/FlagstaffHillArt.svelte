<!--
  FlagstaffHillArt — mile ~1650, Baker County, OR.

  The hill where emigrants got their first unobstructed view of the
  Blue Mountains — the last major obstacle before the Columbia. Per
  Esther Belle McMillan Hana 1851: a child in the wagon \"saw\" the
  mountains and cried \"Johnnie, I see Boo Mountains!\" The emotional
  register is profound relief — the high desert is behind them.

  Composition (per docs/historical-pass/13-landmark-visual-references/
  flagstaff_hill.md §3-4, default early afternoon panoramic vista):
   - Wide panorama from hill crest LOOKING WEST
   - Foreground: dry sagebrush bunchgrass hill crest with wagon ruts
   - Middle ground: Baker Valley floor with Powder River cottonwood
     ribbon as green-yellow thread + pale silver river glimmer
   - Background: Blue Mountains — LONG continuous dark forested ridge
     (NOT jagged peaks!), rolling, blue-purple at distance, snow on
     highest summits
   - Sky: open high desert blue, 40%+ of frame
   - 2-3 wagons at crest, emigrants stopped, one figure pointing west

  CRITICAL NON-RENDERABLES per research:
   - NO sharp/jagged mountain peaks — Blue Mountains are ROLLING
     forested ridge, not alpine spires (no Cascades volcanic cones
     either — Hood/Adams are NOT visible from this point)
   - NO modern interpretive center building (1980s BLM facility on
     the hilltop today, NOT period)
   - NO Lone Pine in valley (Frémont noted it felled 1843, gone by 1844;
     since this lands without year-variant, default assumes mid-period)
   - NO conifer trees on Flagstaff Hill itself (it's OPEN sagebrush)
   - NO paved trails or boardwalks
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;

  // September palette per research §"Atmosphere and lighting".
  const skyHi = '#5a8ac8';            // deep high-desert blue
  const skyLo = '#a8c8e0';            // pale near horizon
  const blueMtnFar = '#4a5a7a';       // blue-purple distant haze
  const blueMtnForest = '#3a5a40';    // forested slopes
  const blueMtnSnow = '#e8e8f0';      // snow highlights on summits
  const valleyGrass = '#c8a848';      // tawny September valley floor
  const cottonwoodRibbon = '#7a9840'; // still-green Sept cottonwood
  const cottonwoodHi = '#a8b860';
  const powderRiver = '#88a8b8';      // pale silver-blue river thread
  const bunchgrass = '#d4b860';       // straw-gold hilltop
  const sagebrush = '#8a9070';        // blue-gray artemisia
  const volcanicSoil = '#a88a60';
  const rutGouge = '#7a5a30';
</script>

<g>
  <!-- SKY — large, open, deep high-desert blue with pale horizon -->
  <rect x="0" y="0" width={LMK_VIEW_W} height="70" fill={skyHi} opacity="0.92" />
  <rect x="0" y="50" width={LMK_VIEW_W} height="22" fill={skyLo} opacity="0.7" />
  <!-- thin cumulus -->
  <g fill={LMK.white} opacity="0.5">
    <ellipse cx="70" cy="20" rx="34" ry="5" />
    <ellipse cx="380" cy="14" rx="46" ry="5" />
    <ellipse cx="400" cy="22" rx="22" ry="4" />
  </g>

  <!-- BLUE MOUNTAINS on the western horizon — defining element.
       LONG continuous ridge (NOT jagged), rolling, with gentle undulation
       (not sharp peaks). Blue-purple at distance shading darker on slopes. -->
  <!-- back haze layer (blue-purple) -->
  <path d="M 0 76 Q 60 68 120 72 Q 180 66 240 70 Q 300 64 360 70 Q 420 66 480 72 L 480 96 L 0 96 Z"
        fill={blueMtnFar} opacity="0.8" />
  <!-- forested-slope layer (darker green, rounded undulations) -->
  <path d="M 0 84 Q 50 78 100 82 Q 150 76 200 82 Q 250 76 300 82 Q 350 76 400 82 Q 440 78 480 80 L 480 100 L 0 100 Z"
        fill={blueMtnForest} opacity="0.85" />
  <!-- snow flashes on highest summits (subtle, only a few) -->
  <g stroke={blueMtnSnow} stroke-width="0.6" opacity="0.7">
    <line x1="118" y1="70" x2="128" y2="73" />
    <line x1="238" y1="68" x2="248" y2="71" />
    <line x1="358" y1="68" x2="368" y2="71" />
  </g>
  <!-- forest texture suggestion — small dark dots scattered on the
       forested slopes (NOT individual trees, just texture) -->
  <g fill={blueMtnFar} opacity="0.5">
    {#each Array(40) as _, i}
      {@const x = 8 + (i * 13) % 470}
      {@const y = 86 + ((i * 7) % 12)}
      <circle cx={x} cy={y} r="0.5" />
    {/each}
  </g>

  <!-- BAKER VALLEY FLOOR — wide, flat, tawny September grass spread below -->
  <rect x="0" y="100" width={LMK_VIEW_W} height="30" fill={valleyGrass} opacity="0.85" />
  <!-- subtle valley shading toward middle (foreshortened distance) -->
  <rect x="0" y="100" width={LMK_VIEW_W} height="8" fill={blueMtnFar} opacity="0.18" />

  <!-- POWDER RIVER COTTONWOOD RIBBON — green thread through the valley,
       the visual punctuation per research §3. Curves slightly across the
       valley floor. -->
  <g>
    <!-- back ribbon (further darker green) -->
    <path d="M 0 116 Q 80 112 160 116 Q 240 120 320 114 Q 400 116 480 118 L 480 122 L 0 122 Z"
          fill={cottonwoodRibbon} opacity="0.85" />
    <!-- highlight (catching afternoon light) -->
    <path d="M 0 114 Q 80 110 160 114 Q 240 118 320 112 Q 400 114 480 116"
          fill="none" stroke={cottonwoodHi} stroke-width="1" opacity="0.65" />
    <!-- river silver glimmer along the cottonwood centerline -->
    <path d="M 20 119 Q 90 116 170 120 Q 250 124 330 118 Q 410 120 470 121"
          fill="none" stroke={powderRiver} stroke-width="0.6" opacity="0.75" />
  </g>

  <!-- FLAGSTAFF HILL CREST — foreground, open sagebrush bunchgrass.
       Gentle convex curve from left descent to right descent. -->
  <path d="M 0 138 Q 60 132 130 130 Q 240 128 350 132 Q 420 134 480 138 L 480 200 L 0 200 Z"
        fill={bunchgrass} stroke={ink} stroke-width="0.4" />
  <!-- shadow valley side of crest (left, where the descent toward valley starts) -->
  <path d="M 0 138 Q 60 132 130 130 L 130 152 Q 60 156 0 162 Z"
        fill={volcanicSoil} opacity="0.4" />
  <!-- sagebrush dots scattered across the crest -->
  <g fill={sagebrush} opacity="0.7">
    {#each Array(35) as _, i}
      {@const x = 6 + (i * 14) % 472}
      {@const y = 148 + ((i * 11) % 48)}
      <ellipse cx={x} cy={y} rx="1.6" ry="0.9" />
    {/each}
  </g>
  <!-- bunchgrass tussock dots -->
  <g stroke={volcanicSoil} stroke-width="0.3" opacity="0.55">
    {#each Array(45) as _, i}
      {@const x = 4 + (i * 11) % 474}
      {@const y = 158 + ((i * 7) % 38)}
      <line x1={x} y1={y} x2={x + 1} y2={y - 2} />
    {/each}
  </g>

  <!-- WAGON RUTS pressed into the hilltop, leading from east (right) to
       west (left toward valley) — physical evidence of 55,000 crossings. -->
  <g stroke={rutGouge} stroke-width="0.7" fill="none" opacity="0.7">
    <path d="M 480 144 Q 350 142 220 144 Q 110 148 0 154" />
    <path d="M 480 148 Q 350 146 220 148 Q 110 152 0 158" />
  </g>

  <!-- 3 WAGONS at the crest, stopped — emigrants taking in the view -->
  <g>
    <!-- leftmost wagon (closest to viewer, slightly larger) -->
    <g transform="translate(120 144)">
      <rect x="-8" y="-3" width="16" height="3.2" fill={LMK.earth} stroke={ink} stroke-width="0.45" />
      <path d="M -8 -3 Q 0 -10 8 -3 Z" fill={LMK.white} stroke={ink} stroke-width="0.5" />
      <circle cx="-5" cy="1" r="2.4" fill="none" stroke={ink} stroke-width="0.45" />
      <circle cx="5" cy="1" r="2.4" fill="none" stroke={ink} stroke-width="0.45" />
    </g>
    <!-- middle wagon -->
    <g transform="translate(200 142)">
      <rect x="-7" y="-2.6" width="14" height="2.8" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
      <path d="M -7 -2.6 Q 0 -9 7 -2.6 Z" fill={LMK.white} stroke={ink} stroke-width="0.45" />
      <circle cx="-4" cy="1" r="2" fill="none" stroke={ink} stroke-width="0.4" />
      <circle cx="4" cy="1" r="2" fill="none" stroke={ink} stroke-width="0.4" />
    </g>
    <!-- right wagon, slightly back, smaller -->
    <g transform="translate(280 140) scale(0.85)">
      <rect x="-7" y="-2.6" width="14" height="2.8" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
      <path d="M -7 -2.6 Q 0 -9 7 -2.6 Z" fill={LMK.white} stroke={ink} stroke-width="0.45" />
      <circle cx="-4" cy="1" r="2" fill="none" stroke={ink} stroke-width="0.4" />
      <circle cx="4" cy="1" r="2" fill="none" stroke={ink} stroke-width="0.4" />
    </g>
  </g>

  <!-- FIGURES at the crest — the emotional beat. A woman with raised
       arm pointing west toward the Blue Mountains; child beside her;
       another figure quietly looking. Per Hana 1851: \"I see Boo
       Mountains!\" -->
  <!-- woman pointing -->
  <g transform="translate(150 148)">
    <ellipse cx="0" cy="0" rx="1" ry="3" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
    <ellipse cx="0" cy="-4" rx="0.8" ry="1" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
    <!-- raised arm pointing west (left) -->
    <line x1="-0.5" y1="-2" x2="-4" y2="-3" stroke={ink} stroke-width="0.4" />
  </g>
  <!-- child beside her (smaller) -->
  <g transform="translate(154 152)">
    <ellipse cx="0" cy="0" rx="0.7" ry="2" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
    <ellipse cx="0" cy="-2.7" rx="0.6" ry="0.8" fill={LMK.paperWarm} stroke={ink} stroke-width="0.2" />
  </g>
  <!-- second figure further right, looking quietly -->
  <g transform="translate(228 149)">
    <ellipse cx="0" cy="0" rx="1" ry="3" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
    <ellipse cx="0" cy="-4" rx="0.8" ry="1" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
  </g>

  <!-- caption — quotes Hana 1851 -->
  <text x="240" y="194" text-anchor="middle"
        font-family="IM Fell English, Georgia, serif" font-size="7"
        fill={inkSoft} font-style="italic" opacity="0.9">
    Flagstaff Hill — &ldquo;I see Boo Mountains!&rdquo; (E.B.M. Hana, 1851)
  </text>
</g>
