<!--
  HollenbergRanchArt.svelte — mile ~150, the largest unaltered Pony Express station

  "Cottonwood Station" — Gerat Hollenberg's road-ranch in NE Kansas, 1857.
  What pioneers saw: a long, low, single-story log + frame building (~28x60 ft)
  with a pitched cedar-shingle roof, plain plank siding weathering to gray,
  a low porch along the front, two stone chimneys, and a small fenced garden.
  Set on rolling tallgrass prairie at the head of Cottonwood Creek — a few
  big bur oaks for shade, the creek snaking past to the south.

  Distinguishing visual marks:
    A SINGLE LONG BUILDING — not a fort, not a stockade. Looks domestic.
    Pitched roof, wood shingles, two stone chimneys (one each end).
    Plain horizontal plank siding, a long covered porch on the prairie side.
    Wagon and a couple of horses out front — it's both ranch and store.
    Tallgrass prairie all around, a creek + cottonwoods to one side.
    Pony Express rider (later) galloping up — distant scale figure.
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const wood = "#8a6a48";
  const woodSh = "#5a3e22";
  const woodHi = "#a88858";
  const shingle = "#6a4a2a";
  const shingleSh = "#3a2410";
  const stone = "#8a8478";
</script>

{#snippet window6(x: number, y: number)}
  <g transform="translate({x} {y})">
    <rect x="0" y="0" width="8" height="8" fill={LMK.inkSoft} stroke={ink} stroke-width="0.4" />
    <line x1="4" y1="0" x2="4" y2="8" stroke={ink} stroke-width="0.3" />
    <line x1="0" y1="2.6" x2="8" y2="2.6" stroke={ink} stroke-width="0.3" />
    <line x1="0" y1="5.3" x2="8" y2="5.3" stroke={ink} stroke-width="0.3" />
  </g>
{/snippet}

{#snippet cottonwood(cx: number, cy: number, h: number)}
  <g>
    <!-- trunk -->
    <path d={`M ${cx - 1.5} ${cy} L ${cx - 1} ${cy - h * 0.5} L ${cx + 1} ${cy - h * 0.5} L ${cx + 1.5} ${cy} Z`}
          fill="#4a3220" stroke={ink} stroke-width="0.4" />
    <!-- crown — round, lobed -->
    <ellipse cx={cx} cy={cy - h * 0.7} rx={h * 0.42} ry={h * 0.34} fill={LMK.sageDark} stroke={ink} stroke-width="0.5" />
    <ellipse cx={cx - h * 0.18} cy={cy - h * 0.78} rx={h * 0.2} ry={h * 0.16} fill={LMK.sage} opacity="0.7" />
    <ellipse cx={cx + h * 0.16} cy={cy - h * 0.66} rx={h * 0.16} ry={h * 0.13} fill={LMK.sageLight} opacity="0.55" />
  </g>
{/snippet}

{#snippet parkedSchooner(x: number, y: number)}
  <g transform="translate({x} {y})">
    <path d="M -16 -10 Q 0 -22 16 -10 Z" fill={LMK.white} stroke={ink} stroke-width="0.5" />
    <rect x="-16" y="-10" width="32" height="6" fill={LMK.earth} stroke={ink} stroke-width="0.5" />
    <circle cx="-10" cy="0" r="3.4" fill="none" stroke={ink} stroke-width="0.5" />
    <circle cx="10" cy="0" r="3.4" fill="none" stroke={ink} stroke-width="0.5" />
    <circle cx="-10" cy="0" r="0.6" fill={ink} />
    <circle cx="10" cy="0" r="0.6" fill={ink} />
    <ellipse cx="0" cy="4" rx="16" ry="0.8" fill={ink} opacity="0.2" />
  </g>
{/snippet}

{#snippet ranchHorse(x: number, y: number, color: string)}
  <g transform="translate({x} {y})">
    <path d="M -6 -7 L -6 -10 L -4 -11 L 4 -11 L 6 -10 L 6 -7 L 4 -6 L -4 -6 Z" fill={color} stroke={ink} stroke-width="0.4" />
    <path d="M 4 -11 L 7 -14 L 9 -14 L 10 -12 L 8 -10 L 5 -9 Z" fill={color} stroke={ink} stroke-width="0.4" />
    <path d="M 4 -11 q 1 -2 3 -3" stroke={ink} stroke-width="0.5" fill="none" />
    <line x1="-4" y1="-6" x2="-4" y2="0" stroke={ink} stroke-width="0.6" />
    <line x1="-1" y1="-6" x2="-1" y2="0" stroke={ink} stroke-width="0.6" />
    <line x1="1.5" y1="-6" x2="1.5" y2="0" stroke={ink} stroke-width="0.6" />
    <line x1="4" y1="-6" x2="4" y2="0" stroke={ink} stroke-width="0.6" />
    <path d="M -6 -8 q -2 1 -2 4" stroke={ink} stroke-width="0.6" fill="none" />
  </g>
{/snippet}

<g>
  <!-- distant prairie ridges -->
  <path
    d="M 0 96 Q 80 92 160 96 Q 240 92 320 96 Q 400 92 480 96 L 480 104 L 0 104 Z"
    fill={LMK.sage} opacity="0.4"
  />
  <path
    d="M 0 104 Q 100 100 200 104 Q 300 100 400 104 Q 440 102 480 104 L 480 112 L 0 112 Z"
    fill={LMK.sageDark} opacity="0.5"
  />

  <!-- cottonwood grove on right (creek-side) -->
  <g>
    {@render cottonwood(400, 132, 42)}
    {@render cottonwood(428, 134, 36)}
    {@render cottonwood(448, 136, 32)}
    <!-- creek glimmer along the base of the trees -->
    <path d="M 360 152 Q 400 154 440 152 Q 470 151 480 152" stroke={LMK.water} stroke-width="1.4" fill="none" opacity="0.7" />
  </g>

  <!-- small bur oak left of building -->
  <g>
    <ellipse cx="56" cy="120" rx="22" ry="16" fill={LMK.sageDark} stroke={ink} stroke-width="0.5" />
    <ellipse cx="48" cy="116" rx="14" ry="10" fill={LMK.sage} opacity="0.7" />
    <rect x="54" y="132" width="4" height="14" fill={woodSh} stroke={ink} stroke-width="0.4" />
  </g>

  <!-- HERO: the long ranch building -->
  <!-- base ~y=148, ridge ~y=104, ends x=140 / x=360 -->
  <g>
    <!-- main body — plank siding -->
    <rect x="140" y="124" width="220" height="24" fill={wood} stroke={ink} stroke-width="0.7" />
    <!-- horizontal siding lines -->
    <g stroke={woodSh} stroke-width="0.35" opacity="0.7">
      <line x1="142" y1="129" x2="358" y2="129" />
      <line x1="142" y1="133" x2="358" y2="133" />
      <line x1="142" y1="137" x2="358" y2="137" />
      <line x1="142" y1="141" x2="358" y2="141" />
      <line x1="142" y1="145" x2="358" y2="145" />
    </g>
    <!-- shadow on right end -->
    <rect x="340" y="124" width="20" height="24" fill={woodSh} opacity="0.45" />

    <!-- gable triangles at each end -->
    <path d="M 140 124 L 158 110 L 158 124 Z" fill={wood} stroke={ink} stroke-width="0.6" />
    <path d="M 360 124 L 342 110 L 342 124 Z" fill={woodSh} stroke={ink} stroke-width="0.6" />

    <!-- long pitched roof — shingles -->
    <path d="M 138 124 L 158 110 L 342 110 L 362 124 Z" fill={shingle} stroke={ink} stroke-width="0.7" />
    <!-- shingle courses -->
    <g stroke={shingleSh} stroke-width="0.4" opacity="0.7">
      <line x1="148" y1="117" x2="352" y2="117" />
      <line x1="143" y1="121" x2="357" y2="121" />
    </g>
    <!-- ridge cap -->
    <line x1="158" y1="110" x2="342" y2="110" stroke={ink} stroke-width="0.6" />

    <!-- two stone chimneys -->
    <g>
      <rect x="178" y="98" width="6" height="14" fill={stone} stroke={ink} stroke-width="0.5" />
      <rect x="178" y="98" width="6" height="2.5" fill={LMK.earthDark} stroke={ink} stroke-width="0.4" />
      <rect x="316" y="98" width="6" height="14" fill={stone} stroke={ink} stroke-width="0.5" />
      <rect x="316" y="98" width="6" height="2.5" fill={LMK.earthDark} stroke={ink} stroke-width="0.4" />
      <!-- smoke from one -->
      <path d="M 320 96 q -2 -3 0 -6 q 2 -3 0 -7 q -2 -3 1 -8"
            stroke={inkSoft} stroke-width="0.5" fill="none" opacity="0.55" />
    </g>

    <!-- covered porch — narrow strip in front of building -->
    <g>
      <rect x="148" y="148" width="204" height="3" fill={woodSh} stroke={ink} stroke-width="0.4" />
      <!-- porch posts -->
      {#each [160, 200, 240, 280, 320] as px}
        <line x1={px} y1="148" x2={px} y2="124" stroke={woodSh} stroke-width="0.5" opacity="0.7" />
      {/each}
      <!-- porch roof (small overhang) -->
      <path d="M 144 124 L 152 122 L 348 122 L 356 124 Z" fill={shingleSh} stroke={ink} stroke-width="0.4" opacity="0.85" />
    </g>

    <!-- doors and windows -->
    <g>
      <!-- central wide door -->
      <rect x="244" y="130" width="12" height="18" fill={LMK.earthDark} stroke={ink} stroke-width="0.5" />
      <line x1="250" y1="131" x2="250" y2="148" stroke={ink} stroke-width="0.3" />
      <!-- flanking windows -->
      {@render window6(170, 132)}
      {@render window6(200, 132)}
      {@render window6(222, 132)}
      {@render window6(278, 132)}
      {@render window6(302, 132)}
      {@render window6(328, 132)}
    </g>

    <!-- small painted sign over door -->
    <g>
      <rect x="232" y="123" width="36" height="6" fill="#cca870" stroke={ink} stroke-width="0.4" />
      <text x="250" y="128" text-anchor="middle"
            font-family="IM Fell English, Georgia, serif" font-size="4.2"
            fill={ink} letter-spacing="0.4">
        HOLLENBERG · STATION
      </text>
    </g>
  </g>

  <!-- garden patch — small fenced rectangle to the left -->
  <g>
    <rect x="92" y="148" width="38" height="14" fill={LMK.sageLight} opacity="0.55" stroke={ink} stroke-width="0.4" />
    <!-- picket fence -->
    {#each [92, 99, 106, 113, 120, 127, 130] as px}
      <line x1={px} y1="148" x2={px} y2="146" stroke={woodSh} stroke-width="0.5" />
    {/each}
    <!-- rows -->
    <g stroke={LMK.sageDark} stroke-width="0.4" opacity="0.7">
      <line x1="94" y1="153" x2="128" y2="153" />
      <line x1="94" y1="156" x2="128" y2="156" />
      <line x1="94" y1="159" x2="128" y2="159" />
    </g>
  </g>

  <!-- ground — packed yard out front -->
  <rect x="0" y="151" width={LMK_VIEW_W} height={LMK_VIEW_H - 151} fill={LMK.parchment} opacity="0.5" />
  <!-- trail rut crossing the yard -->
  <path d="M 0 168 Q 120 166 240 170 Q 360 168 480 172" stroke={LMK.earth} stroke-width="1" fill="none" opacity="0.4" />
  <path d="M 0 174 Q 120 172 240 176 Q 360 174 480 178" stroke={LMK.earth} stroke-width="0.7" fill="none" opacity="0.35" />

  <!-- tallgrass tufts -->
  <g opacity="0.6" stroke={LMK.sageDark} stroke-width="0.4" fill="none">
    {#each [14, 38, 70, 108, 200, 230, 376, 412, 460] as x, i}
      {@const y = 178 + (i % 3) * 3}
      <g transform="translate({x},{y})">
        <path d="M 0 0 q 1 -3 2 -5" />
        <path d="M 1 0 q 0 -2 2 -4" />
        <path d="M 2 0 q 1 -3 3 -4.5" />
      </g>
    {/each}
  </g>

  <!-- a wagon parked out front + two horses -->
  <g>
    {@render parkedSchooner(186, 166)}
    {@render ranchHorse(296, 166, "#3a2818")}
    {@render ranchHorse(316, 167, "#6a4830")}
    <!-- hitching post -->
    <line x1="306" y1="159" x2="306" y2="167" stroke={woodSh} stroke-width="0.6" />
    <line x1="298" y1="161" x2="320" y2="161" stroke={woodSh} stroke-width="0.5" />
  </g>

  <!-- distant Pony Express rider galloping up the trail -->
  <g transform="translate(40 170)" opacity="0.85">
    <!-- horse -->
    <ellipse cx="0" cy="2" rx="5" ry="2" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
    <ellipse cx="4.5" cy="0" rx="1.6" ry="1.4" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
    <line x1="-3" y1="3.5" x2="-4" y2="6.5" stroke={ink} stroke-width="0.5" />
    <line x1="3" y1="3.5" x2="4" y2="6.5" stroke={ink} stroke-width="0.5" />
    <path d="M -5 1 q -2 0 -3 2" stroke={ink} stroke-width="0.4" fill="none" />
    <!-- rider -->
    <ellipse cx="0" cy="-2.6" rx="1" ry="1.1" fill={LMK.paperWarm} stroke={ink} stroke-width="0.3" />
    <path d="M -1 -1.8 L 1 -1.8 L 1.2 1.5 L -1.2 1.5 Z" fill={LMK.rust} stroke={ink} stroke-width="0.3" />
    <!-- mochila satchel -->
    <rect x="-2.5" y="0" width="5" height="1.5" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
  </g>

  <!-- Caption -->
  <text x="240" y="194" text-anchor="middle"
        font-family="IM Fell English, Georgia, serif" font-size="8"
        fill={inkSoft} font-style="italic" opacity="0.85">
    Hollenberg Ranch — Cottonwood Station, Kansas
  </text>
</g>
