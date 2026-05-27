<!--
  WindlassHillArt — mile ~530, eastern rim of Ash Hollow, NE.

  The single most famous descent on the Oregon-California Trail. After
  hundreds of miles of treeless tableland, emigrants reached the rim and
  faced a near-vertical ~25° drop of 240-300 feet in less than a mile.
  Wagons were rough-locked (rear wheels chained as skids) and lowered by
  hand-ropes belayed from stakes at the rim. NO mechanical windlass ever
  existed (Mattes p. 332, 349 — the "windlass" name is post-emigration
  folklore; emigrants called it "the steep hill" or "the perpendicular
  hill"). NO drum, NO crank, NO pulley — ropes and chains only.

  Composition (per docs/historical-pass/13-landmark-visual-references/
  windlass_hill.md §5, View 1 — rim looking down): camera at top, looking
  north into the hollow. Foreground = dry tan tableland with worn ruts
  converging at the crest; mid-ground = steep slope with parallel rut
  troughs cascading down; background = green ash/cottonwood canopy in
  hollow floor + pale North Platte ribbon beyond. A single wagon at the
  crest with rope crew; the descent is the subject.

  Visual metaphor: burned upland → green canyon. The contrast IS the
  landmark.
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;

  // Palette per research file §5.3.
  const tableland = '#c4a870';      // dry tan upland, late-June bleached
  const tablelandSh = '#a89050';
  const rut = '#9e7840';            // churned sand/clay rut
  const rutDeep = '#7a5828';
  const slopeMid = '#b8965a';       // upper slope catching afternoon light
  const slopeDark = '#86663a';      // lower/shadow slope ochre
  const ashCanopy = '#7a9e5a';      // fresh green, the contrast to upland
  const cottonwood = '#8eaa6a';     // paler silver-green
  const plattePale = '#c0c8a0';     // wide braided river, more sand than water in July

  // Wagon ruts on the slope — parallel troughs, fanning slightly. Each
  // entry is { x_top, x_bot, depth } where x is the crest/floor x-pos.
  const ruts = [
    { x_top: 130, x_bot: 160, w: 1.0 },
    { x_top: 158, x_bot: 175, w: 1.2 },
    { x_top: 186, x_bot: 192, w: 1.4 },  // main central rut, deepest
    { x_top: 214, x_bot: 210, w: 1.2 },
    { x_top: 242, x_bot: 228, w: 1.0 },
    { x_top: 270, x_bot: 246, w: 0.9 },
    { x_top: 298, x_bot: 264, w: 0.8 },
  ];
</script>

<g>
  <!-- SKY — deep Nebraska blue, cumulus suggestion -->
  <rect x="0" y="0" width={LMK_VIEW_W} height="60" fill={LMK.skyHi} opacity="0.95" />
  <rect x="0" y="0" width={LMK_VIEW_W} height="20" fill="#a8b8c0" opacity="0.5" />
  <!-- distant cumulus -->
  <g fill={LMK.white} opacity="0.7">
    <ellipse cx="80" cy="22" rx="28" ry="6" />
    <ellipse cx="100" cy="18" rx="22" ry="5" />
    <ellipse cx="320" cy="20" rx="32" ry="7" />
    <ellipse cx="340" cy="14" rx="20" ry="5" />
  </g>

  <!-- DISTANT BLUFFS beyond the North Platte — pale silhouette -->
  <path d="M 0 60 Q 80 56 160 62 Q 240 56 320 60 Q 400 56 480 62 L 480 70 L 0 70 Z"
        fill="#a89878" opacity="0.55" />

  <!-- NORTH PLATTE RIBBON — distant, pale, braided -->
  <rect x="0" y="68" width={LMK_VIEW_W} height="10" fill={plattePale} opacity="0.7" />
  <g stroke={LMK.white} stroke-width="0.3" opacity="0.5">
    <line x1="20" y1="72" x2="120" y2="72" />
    <line x1="160" y1="74" x2="260" y2="74" />
    <line x1="300" y1="72" x2="400" y2="72" />
  </g>
  <!-- thin sandstone border, river's far bank -->
  <path d="M 0 78 L 480 78" stroke={inkSoft} stroke-width="0.3" opacity="0.5" />

  <!-- ASH GROVE + COTTONWOOD CANOPY in the hollow floor — the reward.
       Visual mass of trees filling the canyon below; layered greens. -->
  <g>
    <!-- back layer — ash, darker -->
    <ellipse cx="180" cy="100" rx="80" ry="14" fill={ashCanopy} opacity="0.85" />
    <ellipse cx="280" cy="98" rx="70" ry="13" fill={ashCanopy} opacity="0.85" />
    <ellipse cx="360" cy="102" rx="50" ry="10" fill={ashCanopy} opacity="0.8" />
    <!-- front layer — cottonwood, lighter/silver -->
    <ellipse cx="220" cy="106" rx="70" ry="12" fill={cottonwood} opacity="0.85" />
    <ellipse cx="320" cy="108" rx="60" ry="11" fill={cottonwood} opacity="0.85" />
    <!-- top highlights catching late-afternoon SW sun -->
    <ellipse cx="200" cy="94" rx="40" ry="4" fill={LMK.paperWarm} opacity="0.3" />
    <ellipse cx="290" cy="92" rx="35" ry="4" fill={LMK.paperWarm} opacity="0.3" />
    <!-- canyon-floor sandy patch (Ash Creek bed) -->
    <path d="M 110 116 Q 200 118 290 114 Q 380 116 470 114 L 470 122 L 110 122 Z"
          fill={LMK.parchment} opacity="0.55" />
  </g>

  <!-- CANYON WALLS on left + right — clip the hollow view to a canyon shape -->
  <!-- left wall (south side) -->
  <path d="M 0 60 L 60 80 L 90 110 L 100 200 L 0 200 Z"
        fill={tablelandSh} stroke={ink} stroke-width="0.5" opacity="0.95" />
  <g stroke={slopeDark} stroke-width="0.4" fill="none" opacity="0.5">
    <path d="M 10 100 Q 50 108 90 130" />
    <path d="M 0 130 Q 40 140 90 160" />
    <path d="M 0 160 Q 40 168 90 184" />
  </g>
  <!-- right wall (north side) — falls away from view; shallower -->
  <path d="M 480 70 L 440 90 L 420 130 L 410 200 L 480 200 Z"
        fill={tablelandSh} stroke={ink} stroke-width="0.5" opacity="0.9" />
  <g stroke={slopeDark} stroke-width="0.4" fill="none" opacity="0.5">
    <path d="M 470 100 Q 440 110 420 130" />
    <path d="M 480 140 Q 440 150 415 168" />
  </g>

  <!-- THE STEEP SLOPE — center, dropping from the crest at y=130 to floor at y=200.
       This is the rim looking down: foreshortened, slope occupies lower half. -->
  <path d="M 90 130 L 410 130 L 410 200 L 90 200 Z"
        fill={slopeMid} stroke={ink} stroke-width="0.5" />
  <!-- afternoon-light gradient — top of slope brighter, bottom shadowed -->
  <rect x="90" y="170" width="320" height="30" fill={slopeDark} opacity="0.45" />
  <rect x="90" y="130" width="320" height="14" fill={LMK.paperWarm} opacity="0.3" />

  <!-- THE RUTS — multiple parallel troughs cascading down the slope.
       Each rut: a slightly-curved trapezoid darker than the slope, with a
       darker shadow line down its center. -->
  <g stroke={rutDeep} stroke-width="0.4">
    {#each ruts as r, i}
      <!-- rut trough as a thin filled shape -->
      <path d={`M ${r.x_top - r.w} 130 L ${r.x_top + r.w} 130 L ${r.x_bot + r.w * 1.3} 200 L ${r.x_bot - r.w * 1.3} 200 Z`}
            fill={rut} opacity={0.85 - (i % 3) * 0.05} stroke="none" />
      <!-- shadow line down the rut center -->
      <line x1={r.x_top} y1="130" x2={r.x_bot} y2="200"
            stroke={rutDeep} stroke-width={r.w * 0.5} opacity="0.7" />
    {/each}
  </g>

  <!-- TABLELAND FOREGROUND — dry tan strip at the very top of the slope.
       Curves up to suggest the rim's slight ridge before the drop. -->
  <path d="M 90 130 Q 240 125 410 130 L 410 130 L 90 130 Z"
        fill={tableland} stroke={ink} stroke-width="0.5" />
  <!-- worn rut grooves at crest where wagons stage -->
  <g stroke={rutDeep} stroke-width="0.4" opacity="0.7">
    {#each ruts as r}
      <line x1={r.x_top - 8} y1="128" x2={r.x_top + 8} y2="128" />
    {/each}
  </g>

  <!-- WAGON AT THE CREST — staged, ropes attached, not yet committed.
       Small for scale (the descent is the subject, not the wagon). -->
  <g transform="translate(190 124)">
    <!-- wagon bed + canvas, side view -->
    <rect x="-9" y="-3" width="18" height="3.2" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
    <path d="M -9 -3 Q 0 -10 9 -3 Z" fill={LMK.white} stroke={ink} stroke-width="0.5" />
    <!-- wheels — rear wheel chained (rough-locked) for skid descent -->
    <circle cx="-5" cy="2" r="2.6" fill="none" stroke={ink} stroke-width="0.5" />
    <circle cx="5" cy="2" r="2.6" fill="none" stroke={ink} stroke-width="0.5" />
    <!-- chain on rear wheel suggesting rough-lock -->
    <line x1="3" y1="-0.5" x2="7" y2="4.5" stroke={ink} stroke-width="0.45" />
    <line x1="3.5" y1="0" x2="6.5" y2="4" stroke={inkSoft} stroke-width="0.35" />
  </g>

  <!-- ROPES from wagon down the slope — multiple, tied off at stakes above
       the crest. NO windlass; just ropes hand-belayed by men above. -->
  <g stroke={LMK.earthDark} stroke-width="0.5" fill="none" opacity="0.85">
    <!-- two ropes from wagon back over the rim to the staking party -->
    <path d="M 184 124 Q 175 122 165 126" />
    <path d="M 196 124 Q 205 122 215 126" />
  </g>
  <!-- belay stakes + small standing figures behind the wagon -->
  <g>
    <!-- left stake + man -->
    <line x1="158" y1="130" x2="158" y2="125" stroke={ink} stroke-width="0.5" />
    <ellipse cx="155" cy="125" rx="1.4" ry="3" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
    <ellipse cx="155" cy="121" rx="1" ry="1.2" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
    <!-- right stake + man -->
    <line x1="222" y1="130" x2="222" y2="125" stroke={ink} stroke-width="0.5" />
    <ellipse cx="225" cy="125" rx="1.4" ry="3" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
    <ellipse cx="225" cy="121" rx="1" ry="1.2" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
  </g>

  <!-- A WAGON PARTWAY DOWN — second wagon, mid-descent, smaller, foreshortened -->
  <g transform="translate(195 160) scale(0.7)">
    <rect x="-8" y="-3" width="16" height="3" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
    <path d="M -8 -3 Q 0 -9 8 -3 Z" fill={LMK.white} stroke={ink} stroke-width="0.45" />
    <circle cx="-4" cy="2" r="2.2" fill="none" stroke={ink} stroke-width="0.4" />
    <circle cx="4" cy="2" r="2.2" fill="none" stroke={ink} stroke-width="0.4" />
    <!-- rope continuing up to belayers off-frame -->
    <line x1="0" y1="-3" x2="-2" y2="-30" stroke={LMK.earthDark} stroke-width="0.55" />
  </g>

  <!-- caption — quotes Stansbury 1852, the period observation -->
  <text x="240" y="194" text-anchor="middle"
        font-family="IM Fell English, Georgia, serif" font-size="7"
        fill={inkSoft} font-style="italic" opacity="0.9">
    &ldquo;the steep hill&rdquo; — wagons let down by ropes (Stansbury, 1852)
  </text>
</g>
