<!--
  ShoshoneCampArt — mile ~1085, Green River valley, WY.

  Eastern/Wind River Shoshone summer encampment near the Upper Crossing
  of the Green River. CULTURAL-SENSITIVITY CARE: the Shoshone are NOT
  a monolith — Eastern (Wind River) are Plains-inflected (tipis,
  horses), Western (Great Basin) use brush wickiups. The Green River
  camp historically included BOTH groups. The visual must show mixed
  dwelling types — primarily tipis with a few wickiups at the edges.

  DISTINCT FROM cheyenne_camp (PR #175):
   - Smaller / more scattered (20-50 lodges, not the tight Cheyenne circle)
   - River-anchored (Green River corridor), NOT open plain
   - Mixed tipis + brush wickiups (Cheyenne are all tipis)
   - Smaller horse herd (50-200 not Cheyenne's hundreds)
   - BULL-BOATS at river crossing (unique signature — code mechanic
     nativeFerry: { tribeId: 'shoshone' })
   - Wind River Mountains snowcapped NW horizon backdrop
   - Drying racks: BUFFALO/antelope, NOT salmon (Green River is buffalo
     country; salmon belongs to Salmon Falls on the Snake)

  Composition (per docs/historical-pass/13-landmark-visual-references/
  shoshone_camp.md §3-4, default summer afternoon):
   - Wide horizontal format with mountains backdrop
   - Wind River Mountains snowcapped NW horizon
   - Sage desert valley floor
   - Cottonwood/willow strip along Green River bank
   - GREEN RIVER as broad swift clear blue-green band (NOT muddy)
   - BULL-BOATS on gravel bar + one in use crossing the river
   - Mix of conical hide TIPIS (Eastern Shoshone, primary) + a few
     dome-shaped brush WICKIUPS (Western Shoshone, at edges)
   - Modest horse herd grazing on near bank
   - Drying racks with BUFFALO meat strips (NOT salmon)
   - Smoke from lodge fires
   - Caption quotes Frémont 1843 or Townsend 1834

  NON-RENDERABLES per research §"What NOT to render":
   - NO stockade / fort / enclosed perimeter
   - NO totem poles (Pacific NW only)
   - NO war bonnet on every figure (ceremonial regalia, not everyday)
   - NO salmon at Green River (buffalo country here)
   - NO Algonquin/Northeast rounded-bark wigwam form (Shoshone brush
     shelters are conical-ish or low dome — different vocabulary)
   - NO Buffalo-Bill-style Plains regalia cliché
   - NO dramatic canyon walls (Wyoming crossing was broad flat valley)
   - NO railroad / telegraph / post-1860 infrastructure
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;

  // Green River basin palette per research §4
  const skyHi = '#7a9ab0';            // high WY blue
  const skyLo = '#b8c8d4';
  const windRiverFar = '#5a6878';     // distant blue Wind Rivers
  const windRiverSnow = '#e8e8ec';    // snowcap
  const windRiverShadow = '#3e4858';
  const sageDesert = '#8a8a68';       // pale sage/greasewood
  const sageShadow = '#5e5e48';
  const sandBank = '#c4b888';         // gravel bar / sand
  const greenRiver = '#5a9aaa';       // clear blue-green NOT muddy
  const greenRiverShallow = '#7eaeb6';
  const greenRiverDeep = '#4a8090';
  const cottonwood = '#4a6a3a';        // green riparian
  const cottonwoodLight = '#6a8a4e';
  const cottonwoodTrunk = '#2a1808';
  const hideTan = '#c4a870';           // tipi cover
  const hideTanShadow = '#8a6e48';
  const hideTanLight = '#dec48a';
  const lodgePole = '#5a3a1a';
  const brushWickiup = '#7a6a48';      // willow-and-grass dome shelter
  const brushWickiupShadow = '#4a3e28';
  const horseDark = '#3a2818';
  const horseMid = '#6a4830';
  const bullBoat = '#5a3a1a';          // dark buffalo-hide bull-boat
  const bullBoatHi = '#7a5630';
  const bullBoatRim = '#3a2410';
  const meatDry = '#7a4a28';
  const smokeFire = '#dcdcd4';
  const paintRed = '#a8462a';
</script>

<g>
  <!-- SKY — wide WY high-altitude blue -->
  <rect x="0" y="0" width={LMK_VIEW_W} height="55" fill={skyHi} opacity="0.92" />
  <rect x="0" y="44" width={LMK_VIEW_W} height="20" fill={skyLo} opacity="0.55" />

  <!-- WIND RIVER MOUNTAINS — snowcapped NW horizon (defining Green
       River backdrop feature). Distant peaks with snow flashes. -->
  <g>
    <!-- back range haze -->
    <path d="M 0 60 L 50 38 L 90 52 L 140 30 L 180 50 L 230 32 L 270 50 L 310 36 L 360 48 L 410 30 L 450 46 L 480 38 L 480 70 L 0 70 Z"
          fill={windRiverFar} opacity="0.85" />
    <!-- snow caps on peaks -->
    <g stroke={windRiverSnow} stroke-width="0.8" opacity="0.85">
      <line x1="48" y1="38" x2="56" y2="40" />
      <line x1="138" y1="30" x2="148" y2="34" />
      <line x1="228" y1="32" x2="238" y2="34" />
      <line x1="308" y1="36" x2="316" y2="38" />
      <line x1="408" y1="30" x2="418" y2="32" />
    </g>
    <!-- snow patches lower on slopes -->
    <g fill={windRiverSnow} opacity="0.55">
      <ellipse cx="138" cy="42" rx="6" ry="1.5" />
      <ellipse cx="228" cy="44" rx="6" ry="1.5" />
      <ellipse cx="408" cy="42" rx="6" ry="1.5" />
    </g>
    <!-- foreground shadow ridge -->
    <path d="M 0 64 Q 100 60 200 66 Q 300 60 400 66 Q 440 64 480 66 L 480 78 L 0 78 Z"
          fill={windRiverShadow} opacity="0.55" />
  </g>

  <!-- DISTANT SAGE DESERT valley floor -->
  <rect x="0" y="78" width={LMK_VIEW_W} height="16" fill={sageDesert} opacity="0.8" />

  <!-- COTTONWOOD/WILLOW strip along Green River bank (research:
       \"only significant trees; surrounding terrain is sage desert\") -->
  <g>
    <ellipse cx="60" cy="100" rx="38" ry="7" fill={cottonwood} opacity="0.85" />
    <ellipse cx="35" cy="98" rx="22" ry="6" fill={cottonwoodLight} opacity="0.75" />
    <ellipse cx="430" cy="100" rx="44" ry="7" fill={cottonwood} opacity="0.85" />
    <ellipse cx="460" cy="98" rx="22" ry="6" fill={cottonwoodLight} opacity="0.75" />
    <!-- a couple individual cottonwood trunks at near edge -->
    <line x1="50" y1="106" x2="50" y2="120" stroke={cottonwoodTrunk} stroke-width="0.7" />
    <line x1="440" y1="106" x2="440" y2="120" stroke={cottonwoodTrunk} stroke-width="0.7" />
  </g>

  <!-- GREEN RIVER — broad, swift, CLEAR BLUE-GREEN (NOT muddy Platte) -->
  <rect x="0" y="112" width={LMK_VIEW_W} height="24" fill={greenRiver} opacity="0.92" />
  <!-- flow texture suggesting swift current -->
  <g stroke={greenRiverShallow} stroke-width="0.4" opacity="0.65">
    <line x1="30" y1="118" x2="110" y2="118" />
    <line x1="150" y1="120" x2="220" y2="120" />
    <line x1="260" y1="118" x2="330" y2="118" />
    <line x1="380" y1="120" x2="450" y2="120" />
    <line x1="50" y1="126" x2="140" y2="126" />
    <line x1="200" y1="128" x2="290" y2="128" />
    <line x1="340" y1="126" x2="430" y2="126" />
  </g>
  <!-- darker deep water mid-channel -->
  <ellipse cx="240" cy="124" rx="120" ry="3" fill={greenRiverDeep} opacity="0.45" />

  <!-- BULL-BOAT MID-RIVER — one in active use crossing. Distinctive
       round/oval buffalo-hide vessel. The signature visual of this
       landmark. -->
  <g transform="translate(245 122)">
    <!-- boat hull (round/oval, dark hide) -->
    <ellipse cx="0" cy="0" rx="6" ry="2.5" fill={bullBoat} stroke={bullBoatRim} stroke-width="0.5" />
    <!-- hide highlight (catching afternoon sun) -->
    <ellipse cx="0" cy="-0.5" rx="5.5" ry="1.4" fill={bullBoatHi} opacity="0.5" />
    <!-- rim/edge -->
    <ellipse cx="0" cy="0" rx="6" ry="2.5" fill="none" stroke={ink} stroke-width="0.35" />
    <!-- ferryman with pole -->
    <ellipse cx="0" cy="-2" rx="0.9" ry="2" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
    <ellipse cx="0" cy="-4.5" rx="0.7" ry="0.9" fill={hideTanLight} stroke={ink} stroke-width="0.2" />
    <!-- pole extending into water -->
    <line x1="0.8" y1="-3" x2="5" y2="3.5" stroke={lodgePole} stroke-width="0.45" />
    <!-- wake/ripple on water from boat -->
    <path d="M -8 1 Q -6 2 -3 1.5" stroke={LMK.white} stroke-width="0.3" fill="none" opacity="0.6" />
    <path d="M 3 1.5 Q 6 2 9 1" stroke={LMK.white} stroke-width="0.3" fill="none" opacity="0.6" />
  </g>

  <!-- GRAVEL BAR + BULL-BOATS drawn up — at the near (south) bank
       waiting to ferry or recently arrived -->
  <rect x="0" y="134" width={LMK_VIEW_W} height="4" fill={sandBank} opacity="0.85" />
  <g>
    <!-- bull-boat 1 on bar (foreground left of crossing) -->
    <g transform="translate(140 138)">
      <ellipse cx="0" cy="0" rx="6" ry="2.5" fill={bullBoat} stroke={bullBoatRim} stroke-width="0.5" />
      <ellipse cx="0" cy="-0.5" rx="5.5" ry="1.4" fill={bullBoatHi} opacity="0.45" />
      <!-- willow frame ribs visible on interior -->
      <g stroke={bullBoatRim} stroke-width="0.25" opacity="0.55">
        <line x1="-4" y1="0" x2="4" y2="0" />
        <line x1="0" y1="-2" x2="0" y2="2" />
      </g>
    </g>
    <!-- bull-boat 2 on bar (right of crossing, smaller) -->
    <g transform="translate(335 138)">
      <ellipse cx="0" cy="0" rx="5" ry="2.2" fill={bullBoat} stroke={bullBoatRim} stroke-width="0.5" />
      <ellipse cx="0" cy="-0.5" rx="4.5" ry="1.2" fill={bullBoatHi} opacity="0.45" />
      <g stroke={bullBoatRim} stroke-width="0.25" opacity="0.55">
        <line x1="-3.5" y1="0" x2="3.5" y2="0" />
      </g>
    </g>
  </g>

  <!-- NEAR-BANK SAGE FOREGROUND — where camp + horse herd sit -->
  <rect x="0" y="138" width={LMK_VIEW_W} height={LMK_VIEW_H - 138} fill={sageDesert} opacity="0.85" />
  <rect x="0" y="172" width={LMK_VIEW_W} height="28" fill={sageShadow} opacity="0.3" />
  <!-- sage dots -->
  <g fill={sageShadow} opacity="0.55">
    {#each Array(30) as _, i}
      {@const x = 6 + (i * 17) % 472}
      {@const y = 150 + ((i * 11) % 38)}
      <ellipse cx={x} cy={y} rx="1.4" ry="0.7" />
    {/each}
  </g>

  <!-- TIPI CLUSTER (Eastern Shoshone) — mid-frame on south bank.
       Smaller / less elaborate than the Cheyenne camp (research:
       \"smaller, more scattered\"). 6-8 lodges. -->
  {#snippet tipi(cx: number, cy: number, h: number, painted: boolean)}
    <g transform={`translate(${cx} ${cy})`}>
      <path d={`M 0 ${-h} L ${h * 0.42} 0 L ${-h * 0.42} 0 Z`}
            fill={hideTan} stroke={ink} stroke-width="0.4" />
      <path d={`M 0 ${-h} L ${h * 0.42} 0 L ${h * 0.06} 0 Z`}
            fill={hideTanShadow} opacity="0.55" />
      <path d={`M 0 ${-h} L ${-h * 0.42} 0 L ${-h * 0.22} 0 Z`}
            fill={hideTanLight} opacity="0.4" />
      <!-- POLES extending above smoke hole -->
      <g stroke={lodgePole} stroke-width="0.35" opacity="0.85">
        <line x1="0" y1={-h} x2="-1.2" y2={-h - h * 0.22} />
        <line x1="0" y1={-h} x2="1.2" y2={-h - h * 0.22} />
        <line x1="0" y1={-h} x2="0.2" y2={-h - h * 0.25} />
      </g>
      {#if painted}
        <path d={`M ${-h * 0.3} ${-h * 0.28} L ${h * 0.3} ${-h * 0.28} L ${h * 0.42} 0 L ${-h * 0.42} 0 Z`}
              fill={paintRed} opacity="0.45" />
      {/if}
      <!-- door opening -->
      <path d={`M ${-h * 0.05} 0 L ${-h * 0.05} ${-h * 0.16} Q 0 ${-h * 0.19} ${h * 0.05} ${-h * 0.16} L ${h * 0.05} 0 Z`}
            fill={ink} opacity="0.7" />
    </g>
  {/snippet}

  {#snippet wickiup(cx: number, cy: number, w: number)}
    <!-- low conical-dome brush shelter — willow branches bent over a
         frame, covered with grass mats / bark. Lower profile than
         tipi, more irregular silhouette. -->
    <g transform={`translate(${cx} ${cy})`}>
      <!-- dome body -->
      <path d={`M ${-w} 0 Q ${-w * 0.7} ${-w * 0.85} 0 ${-w * 0.95} Q ${w * 0.7} ${-w * 0.85} ${w} 0 Z`}
            fill={brushWickiup} stroke={ink} stroke-width="0.35" />
      <!-- shadow side -->
      <path d={`M 0 ${-w * 0.95} Q ${w * 0.7} ${-w * 0.85} ${w} 0 L ${w * 0.2} 0 Z`}
            fill={brushWickiupShadow} opacity="0.55" />
      <!-- twig/branch texture suggestion -->
      <g stroke={brushWickiupShadow} stroke-width="0.25" opacity="0.6" fill="none">
        <path d={`M ${-w * 0.7} 0 Q ${-w * 0.4} ${-w * 0.4} ${-w * 0.1} ${-w * 0.9}`} />
        <path d={`M ${-w * 0.3} 0 Q ${-w * 0.1} ${-w * 0.5} ${w * 0.1} ${-w * 0.9}`} />
        <path d={`M ${w * 0.3} 0 Q ${w * 0.1} ${-w * 0.5} ${-w * 0.05} ${-w * 0.9}`} />
        <path d={`M ${w * 0.6} 0 Q ${w * 0.4} ${-w * 0.4} ${w * 0.1} ${-w * 0.85}`} />
      </g>
      <!-- low door opening -->
      <ellipse cx="0" cy={-w * 0.25} rx={w * 0.18} ry={w * 0.2} fill={ink} opacity="0.7" />
    </g>
  {/snippet}

  {#snippet smokeWisp(cx: number, cy: number)}
    <path d={`M ${cx} ${cy} Q ${cx + 1} ${cy - 4} ${cx - 1} ${cy - 9} Q ${cx + 1.5} ${cy - 14} ${cx} ${cy - 22}`}
          stroke={smokeFire} stroke-width="0.45" fill="none" opacity="0.55" />
  {/snippet}

  <!-- Tipis (primary structures, Eastern Shoshone) — scattered around
       the bank, less tight than Cheyenne circle -->
  {@render tipi(85, 158, 15, true)}
  {@render tipi(115, 158, 14, false)}
  {@render tipi(155, 160, 13, false)}
  {@render tipi(195, 158, 15, true)}
  {@render tipi(225, 159, 13, false)}
  {@render tipi(390, 158, 15, false)}

  <!-- Smoke from tipi fires -->
  {@render smokeWisp(85, 143)}
  {@render smokeWisp(195, 143)}
  {@render smokeWisp(390, 143)}

  <!-- WICKIUPS — at the edges, smaller, lower profile (Western Shoshone
       presence in mixed camp per research) -->
  {@render wickiup(70, 168, 5)}
  {@render wickiup(255, 167, 4)}
  {@render wickiup(420, 168, 5)}

  <!-- DRYING RACK with BUFFALO meat strips (NOT salmon — Green River
       is buffalo country per research §"What NOT") -->
  <g transform="translate(280 168)">
    <!-- tripod posts -->
    <line x1="-5" y1="0" x2="0" y2="-7" stroke={lodgePole} stroke-width="0.55" />
    <line x1="5" y1="0" x2="0" y2="-7" stroke={lodgePole} stroke-width="0.55" />
    <line x1="0" y1="0" x2="0" y2="-7" stroke={lodgePole} stroke-width="0.55" />
    <!-- horizontal rail with hanging meat -->
    <line x1="-4" y1="-4" x2="4" y2="-4" stroke={lodgePole} stroke-width="0.35" />
    <g fill={meatDry} stroke={lodgePole} stroke-width="0.2">
      <rect x="-4" y="-4" width="1" height="2.5" />
      <rect x="-2.5" y="-4" width="1" height="2.5" />
      <rect x="-1" y="-4" width="1" height="2.5" />
      <rect x="0.5" y="-4" width="1" height="2.5" />
      <rect x="2" y="-4" width="1" height="2.5" />
      <rect x="3.5" y="-4" width="1" height="2.5" />
    </g>
  </g>

  <!-- MODEST HORSE HERD — smaller than Cheyenne per research (50-200
       vs Cheyenne's hundreds). A few foreground + scattered mid-distance. -->
  <g>
    <!-- foreground horses (3) -->
    <g transform="translate(45 178)">
      <ellipse cx="0" cy="0" rx="3.5" ry="2" fill={horseMid} stroke={ink} stroke-width="0.35" />
      <line x1="-1.5" y1="2" x2="-2" y2="4.5" stroke={ink} stroke-width="0.3" />
      <line x1="1.5" y1="2" x2="2" y2="4.5" stroke={ink} stroke-width="0.3" />
    </g>
    <g transform="translate(355 180)">
      <ellipse cx="0" cy="0" rx="3.5" ry="2" fill={horseDark} stroke={ink} stroke-width="0.35" />
      <line x1="-1.5" y1="2" x2="-2" y2="4.5" stroke={ink} stroke-width="0.3" />
      <line x1="1.5" y1="2" x2="2" y2="4.5" stroke={ink} stroke-width="0.3" />
    </g>
    <!-- distant horses in mid-range (small dark dots) -->
    <g fill={horseDark} opacity="0.7">
      {#each Array(12) as _, i}
        {@const x = 100 + (i * 21) % 280}
        {@const y = 178 + ((i * 5) % 10)}
        <ellipse cx={x} cy={y} rx="1.4" ry="0.7" />
        <line x1={x - 0.5} y1={y + 0.4} x2={x - 0.5} y2={y + 1.8} stroke={horseDark} stroke-width="0.3" />
        <line x1={x + 0.5} y1={y + 0.4} x2={x + 0.5} y2={y + 1.8} stroke={horseDark} stroke-width="0.3" />
      {/each}
    </g>
  </g>

  <!-- EMIGRANT WAGON at FAR BANK waiting for ferry (across the river,
       right side) — visual that ties this to the trail crossing -->
  <g transform="translate(335 128)">
    <rect x="-5" y="-2" width="10" height="2" fill={LMK.earth} stroke={inkSoft} stroke-width="0.3" />
    <path d="M -5 -2 Q 0 -6 5 -2 Z" fill={LMK.white} stroke={ink} stroke-width="0.35" />
    <circle cx="-2.5" cy="0.5" r="1.4" fill="none" stroke={inkSoft} stroke-width="0.3" />
    <circle cx="2.5" cy="0.5" r="1.4" fill="none" stroke={inkSoft} stroke-width="0.3" />
  </g>

  <!-- caption — quotes Stansbury 1850 (closest in-window) or Townsend -->
  <text x="240" y="194" text-anchor="middle"
        font-family="IM Fell English, Georgia, serif" font-size="6.5"
        fill={inkSoft} font-style="italic" opacity="0.92">
    Shoshone camp — &ldquo;wigwams erected among the bushes&rdquo; (Stansbury, 1850)
  </text>
</g>
