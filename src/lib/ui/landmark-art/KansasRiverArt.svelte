<!-- KansasRiverArt.svelte — auto-ported from kansas-river-art.jsx -->
<script lang="ts">
  import { LMK, LMK_VIEW_W } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const water = LMK.water;
  const waterDark = "#5a7280";
</script>

{#snippet riverTree(x: number, y: number, h: number = 16)}
  <g transform={`translate(${x}, ${y})`}>
    <line x1="0" y1="0" x2="0" y2={-h * 0.3} stroke={LMK.earthDark} stroke-width="0.8" />
    <ellipse cx="0" cy={-h * 0.55} rx={h * 0.32} ry={h * 0.5}
      fill={LMK.sageDark} stroke={ink} stroke-width="0.3" />
    <ellipse cx="-2" cy={-h * 0.45} rx={h * 0.25} ry={h * 0.35}
      fill={LMK.sage} stroke={ink} stroke-width="0.3" opacity="0.8" />
  </g>
{/snippet}

{#snippet bigTree(x: number, y: number)}
  <g transform={`translate(${x}, ${y})`}>
    <rect x="-1" y="-2" width="2" height="20" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
    <ellipse cx="0" cy="-12" rx="14" ry="16" fill={LMK.sageDark} stroke={ink} stroke-width="0.5" />
    <ellipse cx="-4" cy="-16" rx="9" ry="11" fill={LMK.sage} stroke={ink} stroke-width="0.4" />
    <ellipse cx="5" cy="-10" rx="7" ry="8" fill={LMK.sageLight} stroke={ink} stroke-width="0.4" opacity="0.85" />
  </g>
{/snippet}

{#snippet smallPerson(x: number, y: number, hat: string = "#2a1a08")}
  <g transform={`translate(${x}, ${y})`}>
    <ellipse cx="0" cy="-3" rx="1.0" ry="1.2" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
    <ellipse cx="0" cy="-4" rx="1.6" ry="0.35" fill={hat} />
    <path d="M -1.3 -2 L 1.3 -2 L 1 3 L -1 3 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
    <line x1="-0.6" y1="3" x2="-0.6" y2="6" stroke={ink} stroke-width="0.4" />
    <line x1="0.6" y1="3" x2="0.6" y2="6" stroke={ink} stroke-width="0.4" />
  </g>
{/snippet}

<g>
  <!-- Far horizon — low Kansas plains -->
  <path
    d="M 0 105 Q 80 100 160 104 Q 240 98 320 102 Q 400 99 480 104 L 480 110 L 0 110 Z"
    fill={LMK.sage} opacity="0.55"
  />
  <!-- tiny village dots — Kanza village -->
  <g opacity="0.6">
    {#each [60, 68, 76, 84] as x}
      <g transform={`translate(${x}, 102)`}>
        <path d="M -2 0 L 0 -3 L 2 0 Z" fill={LMK.earth} stroke={ink} stroke-width="0.25" />
      </g>
    {/each}
  </g>
  <!-- trees on horizon -->
  {#each Array(28) as _, i}
    {@const x = 5 + i * 17}
    {@const h = 2 + ((i * 5) % 3)}
    <ellipse cx={x} cy={104 - h * 0.3} rx="2.8" ry={h * 0.6}
      fill={LMK.sageDark} opacity="0.5" />
  {/each}

  <!-- North bank -->
  <rect x="0" y="110" width={LMK_VIEW_W} height="14" fill={LMK.earthLight} opacity="0.7" />
  <path d="M 0 110 Q 120 108 240 112 Q 360 109 480 113 L 480 124 L 0 124 Z"
    fill={LMK.earthLight} stroke={ink} stroke-width="0.4" />
  <g>
    {@render riverTree(30, 112, 16)}
    {@render riverTree(78, 112, 20)}
    {@render riverTree(130, 112, 14)}
    {@render riverTree(310, 112, 18)}
    {@render riverTree(358, 112, 22)}
    {@render riverTree(420, 112, 16)}
  </g>

  <!-- The river -->
  <rect x="0" y="124" width={LMK_VIEW_W} height="36" fill={water} />
  <g opacity="0.5">
    <path d="M 0 130 Q 120 128 240 132 Q 360 129 480 132" stroke={waterDark} stroke-width="0.5" fill="none" />
    <path d="M 0 138 Q 120 140 240 138 Q 360 141 480 138" stroke={waterDark} stroke-width="0.4" fill="none" />
    <path d="M 0 146 Q 120 144 240 148 Q 360 145 480 148" stroke={waterDark} stroke-width="0.5" fill="none" />
    <path d="M 0 154 Q 120 156 240 154 Q 360 157 480 154" stroke={waterDark} stroke-width="0.4" fill="none" />
  </g>
  <!-- glints -->
  <g opacity="0.55">
    {#each [40, 90, 160, 220, 300, 380, 440] as x, i}
      <line x1={x} y1={132 + (i % 3) * 6} x2={x + 8} y2={132 + (i % 3) * 6}
        stroke={LMK.white} stroke-width="0.4" />
    {/each}
  </g>

  <!-- rope across the river -->
  <path d="M 25 119 Q 240 124 455 119" stroke={inkSoft} stroke-width="0.6" fill="none" opacity="0.8" />
  {@render bigTree(20, 120)}
  {@render bigTree(460, 120)}

  <!-- flatboat ferry mid-crossing -->
  <g transform="translate(208, 138)">
    <ellipse cx="20" cy="6" rx="22" ry="2.2" fill={LMK.earthDark} stroke={ink} stroke-width="0.5" />
    <ellipse cx="20" cy="11" rx="22" ry="2.2" fill={LMK.earth} stroke={ink} stroke-width="0.5" />
    <rect x="0" y="4" width="40" height="9" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
    <line x1="6" y1="4" x2="6" y2="13" stroke={ink} stroke-width="0.3" />
    <line x1="14" y1="4" x2="14" y2="13" stroke={ink} stroke-width="0.3" />
    <line x1="22" y1="4" x2="22" y2="13" stroke={ink} stroke-width="0.3" />
    <line x1="30" y1="4" x2="30" y2="13" stroke={ink} stroke-width="0.3" />
    <!-- wagon on top -->
    <g transform="translate(8, -16)">
      <rect x="0" y="14" width="24" height="6" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
      <path d="M 0 14 Q 12 0 24 14 Z" fill={LMK.white} stroke={ink} stroke-width="0.5" />
      <path d="M 0 14 Q 12 4 24 14" fill="none" stroke={inkSoft} stroke-width="0.3" />
      <ellipse cx="4" cy="20" rx="2.5" ry="0.8" fill={ink} opacity="0.6" />
      <ellipse cx="20" cy="20" rx="2.5" ry="0.8" fill={ink} opacity="0.6" />
    </g>
    <!-- boatman -->
    <g transform="translate(2, -3)">
      <ellipse cx="0" cy="-3" rx="1.0" ry="1.1" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
      <ellipse cx="0" cy="-4" rx="1.5" ry="0.3" fill={ink} />
      <path d="M -1.2 -2 L 1.2 -2 L 1 3 L -1 3 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
      <line x1="1" y1="-2" x2="-8" y2="10" stroke={LMK.earthDark} stroke-width="0.5" />
    </g>
    <line x1="20" y1="4" x2="20" y2="-18" stroke={inkSoft} stroke-width="0.4" opacity="0.8" />
  </g>

  <!-- Oxen swimming -->
  <g>
    {#each [{ x: 188, y: 144, l: 1 }, { x: 196, y: 148, l: 0.9 }, { x: 256, y: 146, l: 1 }, { x: 264, y: 150, l: 0.9 }] as o}
      <g transform={`translate(${o.x}, ${o.y})`} opacity={o.l}>
        <path d="M -6 1 Q 0 -1 6 1" stroke={LMK.white} stroke-width="0.5" fill="none" opacity="0.6" />
        <ellipse cx="0" cy="0" rx="2.5" ry="1.5" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
        <ellipse cx="2" cy="0.5" rx="1" ry="0.6" fill={LMK.earthDark} />
        <path d="M -1.5 -1 q -1 -1.5 -2.5 -1" stroke={ink} stroke-width="0.5" fill="none" />
        <path d="M 1.5 -1 q 1 -1 2.5 -0.5" stroke={ink} stroke-width="0.5" fill="none" />
      </g>
    {/each}
  </g>

  <!-- South bank -->
  <path d="M 0 158 Q 120 162 240 158 Q 360 162 480 158 L 480 200 L 0 200 Z"
    fill={LMK.parchmentSh} stroke={ink} stroke-width="0.4" />
  <path d="M 80 160 Q 100 168 130 168 Q 160 166 180 160"
    stroke={LMK.earthDark} stroke-width="0.6" fill="none" opacity="0.4" />
  <rect x="0" y="160" width={LMK_VIEW_W} height="40" fill={LMK.parchment} opacity="0.5" />

  <!-- North-bank wagon double-team hauling up -->
  <g transform="translate(330, 0)">
    {#each [{ x: 0, y: 116 }, { x: 9, y: 116 }, { x: 16, y: 117 }, { x: 25, y: 117 }, { x: 32, y: 118 }, { x: 41, y: 118 }] as o, i}
      <g transform={`translate(${o.x}, ${o.y})`}>
        <ellipse cx="0" cy="0" rx="3" ry="2" fill={i % 2 ? LMK.earth : LMK.earthLight} stroke={ink} stroke-width="0.35" />
        <ellipse cx="2.5" cy="-0.5" rx="1.2" ry="1" fill={i % 2 ? LMK.earth : LMK.earthLight} stroke={ink} stroke-width="0.35" />
        <line x1="-2" y1="2" x2="-2" y2="3.5" stroke={ink} stroke-width="0.4" />
        <line x1="1.5" y1="2" x2="1.5" y2="3.5" stroke={ink} stroke-width="0.4" />
      </g>
    {/each}
    <line x1="44" y1="118" x2="60" y2="121" stroke={inkSoft} stroke-width="0.5" />
    <g transform="translate(60, 110)">
      <rect x="0" y="10" width="22" height="6" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
      <path d="M 0 10 Q 11 -2 22 10 Z" fill={LMK.white} stroke={ink} stroke-width="0.5" />
      <circle cx="4" cy="17" r="2.5" fill="none" stroke={ink} stroke-width="0.4" />
      <circle cx="18" cy="17" r="2.5" fill="none" stroke={ink} stroke-width="0.4" />
    </g>
  </g>

  <!-- Wagons queued on south bank -->
  <g>
    <g transform="translate(60, 0)">
      <rect x="0" y="170" width="30" height="8" fill={LMK.earth} stroke={ink} stroke-width="0.5" />
      <path d="M 0 170 Q 15 154 30 170 Z" fill={LMK.white} stroke={ink} stroke-width="0.6" />
      <path d="M 0 170 Q 15 158 30 170" fill="none" stroke={inkSoft} stroke-width="0.3" />
      <circle cx="5" cy="180" r="4" fill="none" stroke={ink} stroke-width="0.5" />
      <circle cx="25" cy="180" r="4" fill="none" stroke={ink} stroke-width="0.5" />
      <circle cx="5" cy="180" r="1" fill={ink} />
      <circle cx="25" cy="180" r="1" fill={ink} />
    </g>
    <g transform="translate(110, 0)" opacity="0.9">
      <rect x="0" y="172" width="26" height="7" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
      <path d="M 0 172 Q 13 159 26 172 Z" fill={LMK.white} stroke={ink} stroke-width="0.5" />
      <circle cx="4" cy="180" r="3.4" fill="none" stroke={ink} stroke-width="0.4" />
      <circle cx="22" cy="180" r="3.4" fill="none" stroke={ink} stroke-width="0.4" />
    </g>
    <g transform="translate(150, 0)" opacity="0.8">
      <rect x="0" y="174" width="22" height="6" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
      <path d="M 0 174 Q 11 162 22 174 Z" fill={LMK.white} stroke={ink} stroke-width="0.4" />
      <circle cx="4" cy="180" r="2.8" fill="none" stroke={ink} stroke-width="0.4" />
      <circle cx="18" cy="180" r="2.8" fill="none" stroke={ink} stroke-width="0.4" />
    </g>

    <!-- People on near bank -->
    {@render smallPerson(48, 186)}
    {@render smallPerson(92, 188, ink)}
    {@render smallPerson(140, 188)}
    {@render smallPerson(184, 186, ink)}
    {@render smallPerson(210, 188)}
  </g>

  <!-- Caption -->
  <text x="240" y="195" text-anchor="middle"
    font-family="IM Fell English, Georgia, serif" font-size="8"
    fill={inkSoft} font-style="italic" opacity="0.85">
    Pappan's Ferry — Kansas River
  </text>
</g>
