<!--
  FortCasparArt — mile ~810, upper N. Platte crossing at Casper, WY.

  The site went through four physical states in our 1843-1860 window:
  open ford (-1846) → Mormon Ferry (1847-52) → Reshaw's Bridge (1853-58
  at a different location 6 mi downstream) → Guinard's Bridge + Platte
  Bridge Station (1859-60). The code gates this `abandonedBeforeYear:
  1855` so the default render targets the late period (Guinard's Bridge
  era — 810-ft timber trestle + civilian stage/trading station).

  Critical: the modern \"Fort Caspar Museum\" reconstruction depicts the
  1863-1865 military fort with stockade + blockhouses. NOT applicable
  to our pre-1862 game window. NO palisade walls, NO blockhouses, NO
  earthworks. NO \"Fort Caspar\" sign — the site was not renamed until
  August 1865, three years after our game ends. Period name: Platte
  Bridge Station / Guinard's Bridge.

  Composition (per docs/historical-pass/13-landmark-visual-references/
  ft_caspar.md §State 4 Guinard's Bridge default):
   • Bridge as dominant visual — 810-ft timber trestle, log crib piers,
     pale weathered plank deck + railing
   • South bank trading-station cluster — log trading post with porch,
     stage station with waiting coach, blacksmith with smoking chimney,
     small Pony Express corral
   • Cottonwood gallery at riverbank
   • Caspar Mountains on south horizon (low, blue-gray)
   • Sage flat above the river basin
   • Wagon approaching bridge from south
   • Telegraph pole line stretching east (1860 borderline; only one or
     two suggested)

  Palette per research §"Landscape palette".
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;

  const bridgeTimber = '#c8bfa8';      // sun-bleached pale ash
  const bridgeTimberSh = '#7a6850';
  const bridgePier = '#5a3e22';        // log crib pier, water-stained
  const river = '#8a8070';             // pale gray-brown, braided
  const riverShadow = '#6a5e48';
  const cottonwood = '#4a6840';        // dark olive-green July
  const cottonwoodTrunk = '#3a2810';
  const sageFlat = '#8a8a60';
  const sageDark = '#5e6840';
  const alkaliSoil = '#d4c89a';
  const caspar = '#5a6878';            // mountains south horizon
  const logBldg = '#8b5a30';           // log building raw sienna
  const logBldgSh = '#5a3a1a';
  const sodRoof = '#6a7840';
  const sodRoofHi = '#8a9452';
  const stoneCap = '#8a8478';
</script>

<g>
  <!-- SKY — Wyoming high blue, cool zenith warm horizon -->
  <rect x="0" y="0" width={LMK_VIEW_W} height="60" fill="#7a9ab0" opacity="0.9" />
  <rect x="0" y="48" width={LMK_VIEW_W} height="18" fill={LMK.paperWarm} opacity="0.45" />
  <!-- thin cumulus -->
  <g fill={LMK.white} opacity="0.5">
    <ellipse cx="100" cy="20" rx="36" ry="5" />
    <ellipse cx="380" cy="16" rx="44" ry="6" />
  </g>

  <!-- CASPAR MOUNTAINS on south horizon — low rounded blue-gray ridges -->
  <path d="M 0 64 Q 80 56 160 60 Q 240 52 320 58 Q 400 54 480 60 L 480 76 L 0 76 Z"
        fill={caspar} opacity="0.7" />
  <!-- second mountain layer slightly closer -->
  <path d="M 0 70 Q 100 66 200 72 Q 300 66 400 72 Q 440 70 480 72 L 480 84 L 0 84 Z"
        fill={caspar} opacity="0.55" />

  <!-- DISTANT SAGE FLAT north of river — extends to Wyoming horizon -->
  <rect x="0" y="84" width={LMK_VIEW_W} height="20" fill={sageFlat} opacity="0.7" />
  <!-- sage texture dots -->
  <g fill={sageDark} opacity="0.55">
    {#each Array(20) as _, i}
      {@const x = 8 + (i * 23) % 470}
      {@const y = 88 + ((i * 7) % 12)}
      <circle cx={x} cy={y} r="0.7" />
    {/each}
  </g>

  <!-- NORTH BANK COTTONWOOD GALLERY — dark green strip at far waterline -->
  <g>
    <ellipse cx="60" cy="108" rx="35" ry="6" fill={cottonwood} opacity="0.85" />
    <ellipse cx="140" cy="106" rx="40" ry="7" fill={cottonwood} opacity="0.85" />
    <ellipse cx="220" cy="108" rx="35" ry="6" fill={cottonwood} opacity="0.85" />
    <ellipse cx="300" cy="106" rx="38" ry="7" fill={cottonwood} opacity="0.85" />
    <ellipse cx="380" cy="108" rx="36" ry="6" fill={cottonwood} opacity="0.85" />
    <ellipse cx="450" cy="108" rx="28" ry="6" fill={cottonwood} opacity="0.85" />
  </g>

  <!-- RIVER — wide, pale gray-brown, never blue; braided -->
  <rect x="0" y="114" width={LMK_VIEW_W} height="22" fill={river} stroke={inkSoft} stroke-width="0.4" />
  <!-- braided channel suggestions -->
  <g stroke={alkaliSoil} stroke-width="0.5" opacity="0.6">
    <line x1="20" y1="122" x2="80" y2="122" />
    <line x1="120" y1="124" x2="180" y2="124" />
    <line x1="220" y1="120" x2="290" y2="120" />
    <line x1="320" y1="123" x2="390" y2="123" />
    <line x1="410" y1="120" x2="470" y2="120" />
  </g>
  <!-- river shadow at near bank -->
  <rect x="0" y="132" width={LMK_VIEW_W} height="4" fill={riverShadow} opacity="0.6" />

  <!-- GUINARD'S BRIDGE — the visual anchor. 810-ft timber trestle,
       28 crib piers, heavy plank deck + railing. Spans most of the
       river width; runs left-to-right across the frame (slightly
       receding for oblique perspective). -->
  <g>
    <!-- bridge deck (pale weathered plank) -->
    <rect x="40" y="112" width={LMK_VIEW_W - 80} height="3.5" fill={bridgeTimber} stroke={ink} stroke-width="0.5" />
    <!-- railing on far side -->
    <line x1="40" y1="110" x2={LMK_VIEW_W - 40} y2="110" stroke={bridgeTimberSh} stroke-width="0.6" />
    <!-- plank seam marks across deck (every ~40px) -->
    <g stroke={bridgeTimberSh} stroke-width="0.25" opacity="0.7">
      {#each Array(10) as _, i}
        <line x1={60 + i * 36} y1="112" x2={60 + i * 36} y2="115.5" />
      {/each}
    </g>
    <!-- crib piers descending into river — diamond/square cribs, dark -->
    {#each Array(7) as _, i}
      {@const x = 70 + i * 50}
      <g>
        <!-- pier body (rectangular crib visible above water) -->
        <rect x={x - 3} y="115.5" width="6" height="18" fill={bridgePier} stroke={ink} stroke-width="0.35" />
        <!-- horizontal log courses on pier -->
        <line x1={x - 3} y1="120" x2={x + 3} y2="120" stroke={inkSoft} stroke-width="0.2" />
        <line x1={x - 3} y1="124" x2={x + 3} y2="124" stroke={inkSoft} stroke-width="0.2" />
        <line x1={x - 3} y1="128" x2={x + 3} y2="128" stroke={inkSoft} stroke-width="0.2" />
        <!-- water shadow at pier base -->
        <ellipse cx={x} cy="134" rx="4" ry="0.8" fill={riverShadow} opacity="0.6" />
      </g>
    {/each}
  </g>

  <!-- WAGON CROSSING BRIDGE (mid-span, small for scale) -->
  <g transform="translate(220 109)">
    <rect x="-6" y="-2.2" width="12" height="2.4" fill={LMK.earth} stroke={ink} stroke-width="0.35" />
    <path d="M -6 -2.2 Q 0 -7 6 -2.2 Z" fill={LMK.white} stroke={ink} stroke-width="0.4" />
    <circle cx="-3" cy="0.6" r="1.6" fill="none" stroke={inkSoft} stroke-width="0.3" />
    <circle cx="3" cy="0.6" r="1.6" fill="none" stroke={inkSoft} stroke-width="0.3" />
  </g>

  <!-- TELEGRAPH LINE — single pole line stretching east along south bank
       (1860 borderline; one or two poles suggested) -->
  <g stroke={logBldgSh} stroke-width="0.5">
    <line x1="100" y1="158" x2="100" y2="148" />
    <line x1="180" y1="158" x2="180" y2="148" />
    <line x1="100" y1="148" x2="180" y2="148" />
  </g>

  <!-- SOUTH BANK — sandy alkali ground, foreground -->
  <rect x="0" y="136" width={LMK_VIEW_W} height={LMK_VIEW_H - 136} fill={alkaliSoil} opacity="0.85" />
  <rect x="0" y="172" width={LMK_VIEW_W} height="28" fill={sageDark} opacity="0.25" />

  <!-- TRADING POST building — primary south bank structure with covered
       porch facing bridge approach. Log construction, sod roof. -->
  <g transform="translate(340 158)">
    <!-- main building body -->
    <rect x="-16" y="-12" width="32" height="14" fill={logBldg} stroke={ink} stroke-width="0.45" />
    <!-- log courses -->
    <g stroke={logBldgSh} stroke-width="0.3" opacity="0.7">
      <line x1="-16" y1="-9" x2="16" y2="-9" />
      <line x1="-16" y1="-6" x2="16" y2="-6" />
      <line x1="-16" y1="-3" x2="16" y2="-3" />
      <line x1="-16" y1="0" x2="16" y2="0" />
    </g>
    <!-- sod roof -->
    <path d="M -17 -12 L 0 -19 L 17 -12 Z" fill={sodRoof} stroke={ink} stroke-width="0.45" />
    <g stroke={sodRoofHi} stroke-width="0.4" opacity="0.75">
      <line x1="-10" y1="-15" x2="-9" y2="-17" />
      <line x1="0" y1="-17" x2="1" y2="-19" />
      <line x1="10" y1="-15" x2="11" y2="-17" />
    </g>
    <!-- stone chimney with smoke -->
    <rect x="13" y="-22" width="2.5" height="5" fill={stoneCap} stroke={ink} stroke-width="0.3" />
    <path d="M 14 -22 Q 16 -28 13 -32 Q 15 -36 12 -42"
          stroke={LMK.paperCool} stroke-width="0.55" fill="none" opacity="0.55" />
    <!-- door -->
    <rect x="-2" y="-6" width="4" height="6" fill={inkSoft} stroke={ink} stroke-width="0.3" />
    <!-- covered porch (lean-to over front) -->
    <line x1="-16" y1="-1" x2="16" y2="-1" stroke={logBldg} stroke-width="0.7" />
    <line x1="-18" y1="3" x2="18" y2="3" stroke={logBldgSh} stroke-width="0.7" />
    <line x1="-18" y1="3" x2="-16" y2="-1" stroke={ink} stroke-width="0.4" />
    <line x1="18" y1="3" x2="16" y2="-1" stroke={ink} stroke-width="0.4" />
    <!-- barrels stacked at porch -->
    <ellipse cx="-12" cy="1" rx="1.4" ry="0.5" fill={logBldgSh} stroke={inkSoft} stroke-width="0.2" />
    <ellipse cx="-8" cy="1.5" rx="1.4" ry="0.5" fill={logBldgSh} stroke={inkSoft} stroke-width="0.2" />
  </g>

  <!-- STAGE STATION building — adjacent to trading post, slightly smaller -->
  <g transform="translate(400 162)">
    <rect x="-10" y="-10" width="20" height="12" fill={logBldg} stroke={ink} stroke-width="0.45" />
    <g stroke={logBldgSh} stroke-width="0.3" opacity="0.7">
      <line x1="-10" y1="-7" x2="10" y2="-7" />
      <line x1="-10" y1="-4" x2="10" y2="-4" />
      <line x1="-10" y1="-1" x2="10" y2="-1" />
    </g>
    <path d="M -11 -10 L 0 -16 L 11 -10 Z" fill={sodRoof} stroke={ink} stroke-width="0.45" />
    <!-- door -->
    <rect x="-1.5" y="-4" width="3" height="5" fill={inkSoft} stroke={ink} stroke-width="0.3" />
  </g>

  <!-- OVERLAND STAGE COACH in front of stage station, with horses harnessed -->
  <g transform="translate(420 175)">
    <!-- coach body -->
    <rect x="-6" y="-3" width="12" height="3" fill={logBldgSh} stroke={ink} stroke-width="0.4" />
    <!-- coach top -->
    <rect x="-5" y="-5" width="10" height="2" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
    <!-- wheels -->
    <circle cx="-4" cy="1" r="2" fill="none" stroke={ink} stroke-width="0.4" />
    <circle cx="4" cy="1" r="2" fill="none" stroke={ink} stroke-width="0.4" />
    <!-- harnessed horses in front (tiny) -->
    <ellipse cx="11" cy="-1" rx="3" ry="2" fill={logBldgSh} stroke={inkSoft} stroke-width="0.3" />
    <ellipse cx="18" cy="-1" rx="3" ry="2" fill={logBldgSh} stroke={inkSoft} stroke-width="0.3" />
  </g>

  <!-- BLACKSMITH SHED — open-sided with stone forge -->
  <g transform="translate(290 168)">
    <!-- 3 corner posts + roof -->
    <line x1="-6" y1="0" x2="-6" y2="-8" stroke={logBldgSh} stroke-width="0.6" />
    <line x1="6" y1="0" x2="6" y2="-8" stroke={logBldgSh} stroke-width="0.6" />
    <line x1="0" y1="0" x2="0" y2="-8" stroke={logBldgSh} stroke-width="0.6" />
    <path d="M -7 -8 L 0 -12 L 7 -8 Z" fill={sodRoof} stroke={ink} stroke-width="0.4" />
    <!-- forge (stone) -->
    <rect x="-2" y="-3" width="4" height="3" fill={stoneCap} stroke={ink} stroke-width="0.3" />
    <!-- forge smoke -->
    <path d="M 0 -3 Q 2 -8 0 -14" stroke={LMK.paperCool} stroke-width="0.5" fill="none" opacity="0.55" />
    <!-- anvil suggestion -->
    <rect x="-5" y="-1" width="2" height="1.2" fill={inkSoft} stroke={ink} stroke-width="0.2" />
  </g>

  <!-- PONY EXPRESS CORRAL — small, simple rails, two horses -->
  <g>
    <g stroke={logBldgSh} stroke-width="0.5" fill="none">
      <line x1="240" y1="180" x2="240" y2="170" />
      <line x1="270" y1="180" x2="270" y2="170" />
      <line x1="240" y1="172" x2="270" y2="172" />
      <line x1="240" y1="176" x2="270" y2="176" />
    </g>
    <!-- two horses inside -->
    <ellipse cx="250" cy="176" rx="2.5" ry="1.5" fill={logBldgSh} opacity="0.8" />
    <ellipse cx="260" cy="176" rx="2.5" ry="1.5" fill={logBldgSh} opacity="0.8" />
  </g>

  <!-- APPROACHING WAGON + OX-TEAM at bridge approach (foreground left) -->
  <g transform="translate(80 175)">
    <rect x="-7" y="-2.6" width="14" height="3" fill={LMK.earth} stroke={ink} stroke-width="0.45" />
    <path d="M -7 -2.6 Q 0 -9 7 -2.6 Z" fill={LMK.white} stroke={ink} stroke-width="0.5" />
    <circle cx="-4" cy="1" r="2.2" fill="none" stroke={ink} stroke-width="0.4" />
    <circle cx="4" cy="1" r="2.2" fill="none" stroke={ink} stroke-width="0.4" />
  </g>

  <!-- caption — uses period name, NOT "Fort Caspar" (anachronistic) -->
  <text x="240" y="194" text-anchor="middle"
        font-family="IM Fell English, Georgia, serif" font-size="7"
        fill={inkSoft} font-style="italic" opacity="0.9">
    Platte Bridge Station — Guinard's 810-ft trestle, 1860
  </text>
</g>
