<!--
  CheyenneCampArt — mile ~860, North Platte corridor (WY/NE high plains).

  Northern Cheyenne summer encampment — a band-level camp of 30-60
  buffalo-hide tipis pitched in a circle on short-grass prairie, with
  a large horse herd grazing. The code calls this 'trading_post' but
  the visual is FUNDAMENTALLY DIFFERENT from forts: NO stockade,
  NO flag, NO European structures. Active inhabited camp; whites
  visited *to* the camp rather than the reverse.

  Composition (per docs/historical-pass/13-landmark-visual-references/
  cheyenne_camp.md §3-4, default summer morning):
   - TIPI CIRCLE: 30+ conical buffalo-hide lodges in a circle/crescent
     on open short-grass plains. NOT a town, NOT a fort.
   - Lodge height: 15-18 ft, poles extending 3-5 ft above smoke hole
     (the distinctive Cheyenne silhouette). NOT squat, NOT tent-like.
   - PAINTED COVERS: at least some lodges with geometric red-ochre +
     black designs on lower third (NOT all — only prominent families;
     undecorated lodges OK alongside)
   - Buffalo-hide color: warm buff/golden-brown #c4a870 (NOT white
     canvas — by 1843-1855 canvas was beginning but hide dominant)
   - LARGE HORSE HERD grazing on surrounding plain (defining wealth
     indicator — a Cheyenne camp without horses is wrong)
   - SMOKE from lodge fires rising from smoke holes
   - DRYING RACKS with strips of buffalo meat at camp perimeter
   - Creek with willow at one edge of frame (campsite always near water)
   - Open low horizon, wide sky (Plains short-grass landscape)
   - Distant low ridge (Black Hills suggestion) blue silhouette N
   - A mounted figure or two for scale
   - Caption uses Parkman 1846 quote (the closest emigrant-era account)

  NON-RENDERABLES per research §"What NOT to render":
   - NO stockade / fence / perimeter wall (the tipi circle IS the form)
   - NO US/HBC/European flag
   - NO log cabins / adobe buildings
   - NO white canvas tents (default to hide)
   - NO feathered headdresses on every figure (war bonnets ceremonial,
     specific occasions only)
   - NO totem poles (Pacific NW, not Plains)
   - NO "chief receiving emigrants in doorway" cliché
   - NO 1864+ imagery (Sand Creek associations outside window)
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;

  // Plains palette per research §4
  const skyHi = '#8aa6c0';            // wide WY plains morning
  const skyLo = '#c8d4dc';
  const distantRidge = '#5a6878';     // Black Hills suggestion N horizon
  const distantRidgeShadow = '#3e4858';
  const shortGrass = '#a89868';       // pale gold-green summer
  const shortGrassShadow = '#7a6e48';
  const buffaloGrass = '#c4ba88';     // even paler grass mid-range
  const hideTan = '#c4a870';          // buffalo-hide lodge cover
  const hideTanShadow = '#8a6e48';
  const hideTanLight = '#dec48a';
  const lodgePole = '#5a3a1a';        // dark lodgepole pine poles
  const paintRed = '#a8462a';         // red-ochre lodge paint
  const paintBlack = '#2a1a08';       // charcoal black paint
  const horseDark = '#3a2818';        // dark horse
  const horseMid = '#6a4830';         // bay horse
  const horseLight = '#8a6648';       // lighter horse
  const cottonwood = '#5a7848';        // willow/cottonwood at creek
  const cottonwoodDark = '#3e5430';
  const creekWater = '#7a96a0';
  const smokeFire = '#dcdcd4';
  const meatDry = '#7a4a28';          // drying buffalo meat strips
</script>

<g>
  <!-- SKY — wide WY morning, large -->
  <rect x="0" y="0" width={LMK_VIEW_W} height="60" fill={skyHi} opacity="0.92" />
  <rect x="0" y="48" width={LMK_VIEW_W} height="22" fill={skyLo} opacity="0.65" />
  <!-- a few wispy morning clouds -->
  <g fill={LMK.white} opacity="0.5">
    <ellipse cx="80" cy="20" rx="40" ry="4" />
    <ellipse cx="350" cy="16" rx="50" ry="5" />
  </g>

  <!-- DISTANT BLACK HILLS RIDGE — low blue silhouette N horizon -->
  <path d="M 0 70 Q 80 64 160 70 Q 240 62 320 70 Q 400 64 480 70 L 480 80 L 0 80 Z"
        fill={distantRidge} opacity="0.7" />
  <path d="M 0 78 Q 100 74 200 80 Q 300 74 400 80 Q 440 78 480 80 L 480 88 L 0 88 Z"
        fill={distantRidgeShadow} opacity="0.4" />

  <!-- DISTANT SHORT-GRASS PLAIN -->
  <rect x="0" y="88" width={LMK_VIEW_W} height="18" fill={buffaloGrass} opacity="0.85" />

  <!-- COTTONWOOD/WILLOW STRIP along creek (LEFT edge — research: \"creek
       and willow trees at camp edge\") -->
  <g>
    <ellipse cx="35" cy="100" rx="35" ry="7" fill={cottonwood} opacity="0.85" />
    <ellipse cx="20" cy="98" rx="22" ry="6" fill={cottonwoodDark} opacity="0.85" />
    <ellipse cx="55" cy="102" rx="20" ry="5" fill={cottonwood} opacity="0.85" />
  </g>
  <!-- creek hint visible below cottonwoods -->
  <path d="M 0 112 Q 40 110 80 113 L 80 116 L 0 116 Z"
        fill={creekWater} opacity="0.7" stroke={inkSoft} stroke-width="0.3" />

  <!-- DISTANT HORSE HERD grazing on the plain BEHIND the camp.
       Dozens of horses as small dark shapes — defining wealth feature. -->
  <g fill={horseDark} opacity="0.75">
    {#each Array(25) as _, i}
      {@const x = 100 + (i * 13) % 360}
      {@const y = 92 + ((i * 7) % 12)}
      <ellipse cx={x} cy={y} rx="1.8" ry="0.9" />
      <!-- short leg lines -->
      <line x1={x - 0.8} y1={y + 0.5} x2={x - 0.8} y2={y + 2} stroke={horseDark} stroke-width="0.35" opacity="0.85" />
      <line x1={x + 0.8} y1={y + 0.5} x2={x + 0.8} y2={y + 2} stroke={horseDark} stroke-width="0.35" opacity="0.85" />
    {/each}
  </g>

  <!-- SHORT-GRASS PRAIRIE FOREGROUND — open, where camp + foreground
       horses sit -->
  <rect x="0" y="116" width={LMK_VIEW_W} height={LMK_VIEW_H - 116} fill={shortGrass} opacity="0.85" />
  <rect x="0" y="172" width={LMK_VIEW_W} height="28" fill={shortGrassShadow} opacity="0.3" />
  <!-- grass tussock texture -->
  <g stroke={shortGrassShadow} stroke-width="0.3" opacity="0.55">
    {#each Array(50) as _, i}
      {@const x = 6 + (i * 11) % 472}
      {@const y = 138 + ((i * 13) % 56)}
      <line x1={x} y1={y} x2={x} y2={y - 1.5 - (i % 2)} />
    {/each}
  </g>

  <!-- TIPI CIRCLE — cluster of conical buffalo-hide lodges arranged
       in a rough circle/crescent in the mid-frame. Each lodge: tall
       cone with poles extending above the smoke hole; some painted. -->

  {#snippet tipi(cx: number, cy: number, h: number, painted: boolean, paintColor: string)}
    <g transform={`translate(${cx} ${cy})`}>
      <!-- main cone body (buffalo hide) -->
      <path d={`M 0 ${-h} L ${h * 0.45} 0 L ${-h * 0.45} 0 Z`}
            fill={hideTan} stroke={ink} stroke-width="0.4" />
      <!-- shadow side (right, since light from upper-left) -->
      <path d={`M 0 ${-h} L ${h * 0.45} 0 L ${h * 0.08} 0 Z`}
            fill={hideTanShadow} opacity="0.55" />
      <!-- highlight on left edge (morning light from left) -->
      <path d={`M 0 ${-h} L ${-h * 0.45} 0 L ${-h * 0.25} 0 Z`}
            fill={hideTanLight} opacity="0.4" />
      <!-- POLES extending above smoke hole (the distinctive Cheyenne
           silhouette per research) -->
      <g stroke={lodgePole} stroke-width="0.4" opacity="0.85">
        <line x1="0" y1={-h} x2="-1.5" y2={-h - h * 0.25} />
        <line x1="0" y1={-h} x2="1.5" y2={-h - h * 0.25} />
        <line x1="0" y1={-h} x2="0.3" y2={-h - h * 0.28} />
        <line x1="0" y1={-h} x2="-0.3" y2={-h - h * 0.28} />
      </g>
      <!-- smoke flap suggestion at top -->
      <line x1={-h * 0.05} y1={-h * 0.9} x2={h * 0.05} y2={-h * 0.9}
            stroke={paintBlack} stroke-width="0.3" opacity="0.6" />
      <!-- PAINTED LOWER THIRD (only on some tipis) -->
      {#if painted}
        <!-- horizontal band of color on lower third -->
        <path d={`M ${-h * 0.32} ${-h * 0.3} L ${h * 0.32} ${-h * 0.3} L ${h * 0.45} 0 L ${-h * 0.45} 0 Z`}
              fill={paintColor} opacity="0.5" />
        <!-- pictographic accents (small circles or dots) -->
        <circle cx={-h * 0.15} cy={-h * 0.15} r="0.6" fill={paintBlack} opacity="0.7" />
        <circle cx={h * 0.15} cy={-h * 0.15} r="0.6" fill={paintBlack} opacity="0.7" />
        <circle cx="0" cy={-h * 0.2} r="0.5" fill={paintBlack} opacity="0.7" />
      {/if}
      <!-- door opening (small dark arch at front) -->
      <path d={`M ${-h * 0.06} 0 L ${-h * 0.06} ${-h * 0.18} Q 0 ${-h * 0.21} ${h * 0.06} ${-h * 0.18} L ${h * 0.06} 0 Z`}
            fill={paintBlack} opacity="0.7" />
    </g>
  {/snippet}

  {#snippet smokeWisp(cx: number, cy: number)}
    <path d={`M ${cx} ${cy} Q ${cx + 1} ${cy - 4} ${cx - 1} ${cy - 9} Q ${cx + 1.5} ${cy - 14} ${cx} ${cy - 22}`}
          stroke={smokeFire} stroke-width="0.5" fill="none" opacity="0.55" />
  {/snippet}

  <!-- BACK ARC of tipis (further from viewer, smaller) -->
  {@render tipi(180, 138, 12, true, paintRed)}
  {@render tipi(205, 137, 11, false, paintRed)}
  {@render tipi(230, 137, 12, true, paintBlack)}
  {@render tipi(258, 137, 11, false, paintRed)}
  {@render tipi(286, 138, 12, true, paintRed)}
  {@render tipi(312, 137, 11, false, paintRed)}
  {@render tipi(338, 138, 12, false, paintBlack)}

  <!-- Smoke from a few back tipis -->
  {@render smokeWisp(180, 126)}
  {@render smokeWisp(230, 125)}
  {@render smokeWisp(286, 126)}
  {@render smokeWisp(338, 126)}

  <!-- FRONT ARC of tipis (larger, closer) -->
  {@render tipi(160, 156, 16, false, paintRed)}
  {@render tipi(190, 158, 18, true, paintRed)}
  {@render tipi(225, 158, 16, false, paintBlack)}
  {@render tipi(265, 159, 18, true, paintBlack)}
  {@render tipi(305, 158, 16, false, paintRed)}
  {@render tipi(340, 158, 17, true, paintRed)}
  {@render tipi(370, 156, 15, false, paintRed)}

  <!-- Smoke from front tipis -->
  {@render smokeWisp(190, 140)}
  {@render smokeWisp(265, 141)}
  {@render smokeWisp(340, 141)}

  <!-- DRYING RACK with buffalo meat strips — camp perimeter detail -->
  <g transform="translate(120 162)">
    <!-- tripod posts -->
    <line x1="-6" y1="0" x2="0" y2="-9" stroke={lodgePole} stroke-width="0.6" />
    <line x1="6" y1="0" x2="0" y2="-9" stroke={lodgePole} stroke-width="0.6" />
    <line x1="0" y1="0" x2="0" y2="-9" stroke={lodgePole} stroke-width="0.6" />
    <!-- horizontal cross-rail with hanging meat strips -->
    <line x1="-5" y1="-5" x2="5" y2="-5" stroke={lodgePole} stroke-width="0.4" />
    <g fill={meatDry} stroke={paintBlack} stroke-width="0.2">
      <rect x="-5" y="-5" width="1" height="3" />
      <rect x="-3" y="-5" width="1" height="3" />
      <rect x="-1" y="-5" width="1" height="3" />
      <rect x="1" y="-5" width="1" height="3" />
      <rect x="3" y="-5" width="1" height="3" />
    </g>
  </g>

  <!-- FOREGROUND TETHERED HORSES near front-left of camp -->
  <g>
    <!-- horse 1 -->
    <g transform="translate(95 174)">
      <ellipse cx="0" cy="0" rx="4" ry="2.2" fill={horseMid} stroke={ink} stroke-width="0.35" />
      <!-- head extended down (grazing) -->
      <path d="M -3.5 -0.5 L -5.5 1.5 L -4.5 2.5 L -3 1 Z" fill={horseMid} stroke={ink} stroke-width="0.3" />
      <!-- mane -->
      <path d="M -2 -1.8 L -1 -3 L 0 -1.8" stroke={horseDark} stroke-width="0.35" fill="none" />
      <!-- legs -->
      <line x1="-2" y1="2.2" x2="-2.5" y2="5" stroke={horseDark} stroke-width="0.4" />
      <line x1="-0.5" y1="2.2" x2="-1" y2="5" stroke={horseDark} stroke-width="0.4" />
      <line x1="1.5" y1="2.2" x2="2" y2="5" stroke={horseDark} stroke-width="0.4" />
      <line x1="3" y1="2.2" x2="3.5" y2="5" stroke={horseDark} stroke-width="0.4" />
      <!-- tail -->
      <line x1="4" y1="-0.5" x2="6" y2="1.5" stroke={horseDark} stroke-width="0.45" />
    </g>
    <!-- horse 2 -->
    <g transform="translate(78 180)">
      <ellipse cx="0" cy="0" rx="3.5" ry="2" fill={horseLight} stroke={ink} stroke-width="0.35" />
      <line x1="-1.8" y1="2" x2="-2" y2="4.5" stroke={ink} stroke-width="0.35" />
      <line x1="-0.5" y1="2" x2="-0.7" y2="4.5" stroke={ink} stroke-width="0.35" />
      <line x1="1.5" y1="2" x2="1.7" y2="4.5" stroke={ink} stroke-width="0.35" />
      <line x1="2.8" y1="2" x2="3" y2="4.5" stroke={ink} stroke-width="0.35" />
    </g>
  </g>

  <!-- MOUNTED FIGURE in middle distance for scale + the active living
       quality of the camp. Single horseman between camp and herd. -->
  <g transform="translate(410 158)">
    <!-- horse -->
    <ellipse cx="0" cy="0" rx="3.5" ry="2" fill={horseMid} stroke={ink} stroke-width="0.35" />
    <line x1="-1.8" y1="2" x2="-2" y2="4.5" stroke={ink} stroke-width="0.35" />
    <line x1="1.8" y1="2" x2="2" y2="4.5" stroke={ink} stroke-width="0.35" />
    <path d="M -3.5 -0.5 L -5.5 -1 L -5 1 L -3 0.5 Z" fill={horseMid} stroke={ink} stroke-width="0.3" />
    <!-- rider on top — silhouette, NOT in war bonnet per research -->
    <ellipse cx="0" cy="-4" rx="1" ry="2.5" fill={paintBlack} stroke={ink} stroke-width="0.3" />
    <ellipse cx="0" cy="-7" rx="0.7" ry="0.9" fill={hideTanLight} stroke={ink} stroke-width="0.25" />
  </g>

  <!-- caption — quotes Parkman 1846 (the closest emigrant-era account) -->
  <text x="240" y="194" text-anchor="middle"
        font-family="IM Fell English, Georgia, serif" font-size="6.5"
        fill={inkSoft} font-style="italic" opacity="0.92">
    Cheyenne summer camp — &ldquo;a wide green meadow, lodges in a circle&rdquo; (Parkman, 1846)
  </text>
</g>
