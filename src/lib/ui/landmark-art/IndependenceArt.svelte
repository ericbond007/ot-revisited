<!-- IndependenceArt.svelte — auto-ported from independence-art.jsx -->
<script lang="ts">
  import { LMK, LMK_VIEW_W } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
</script>

{#snippet tree(x: number, y: number, h: number = 20)}
  <g transform={`translate(${x}, ${y})`}>
    <line x1="0" y1="0" x2="0" y2={-h * 0.4} stroke={LMK.earthDark} stroke-width="1.2" />
    <ellipse cx="-3" cy={-h * 0.55} rx={h * 0.35} ry={h * 0.45}
      fill={LMK.sage} stroke={ink} stroke-width="0.4" />
    <ellipse cx="3" cy={-h * 0.65} rx={h * 0.32} ry={h * 0.42}
      fill={LMK.sageLight} stroke={ink} stroke-width="0.4" />
    <ellipse cx="0" cy={-h * 0.45} rx={h * 0.3} ry={h * 0.4}
      fill={LMK.sageDark} stroke={ink} stroke-width="0.4" opacity="0.7" />
  </g>
{/snippet}

{#snippet person(x: number, y: number, hatColor: string = "#2a1a08")}
  <g transform={`translate(${x}, ${y})`}>
    <ellipse cx="0" cy="-3" rx="1.2" ry="1.4" fill={LMK.paperWarm} stroke={ink} stroke-width="0.3" />
    <ellipse cx="0" cy="-4" rx="1.8" ry="0.4" fill={hatColor} />
    <ellipse cx="0" cy="-4.4" rx="1.0" ry="0.6" fill={hatColor} />
    <path d="M -1.5 -2 L 1.5 -2 L 1.2 4 L -1.2 4 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
    <line x1="-0.7" y1="4" x2="-0.7" y2="7" stroke={ink} stroke-width="0.5" />
    <line x1="0.7" y1="4" x2="0.7" y2="7" stroke={ink} stroke-width="0.5" />
  </g>
{/snippet}

<g>
  <!-- Distant wooded bluffs -->
  <path
    d="M 0 132 Q 40 120 90 124 Q 140 116 200 122 Q 260 114 320 120 Q 380 116 440 122 Q 470 118 480 122 L 480 138 L 0 138 Z"
    fill={LMK.sage} opacity="0.55"
  />
  <path
    d="M 0 138 Q 60 128 130 134 Q 200 126 280 132 Q 360 126 440 134 Q 470 130 480 134 L 480 142 L 0 142 Z"
    fill={LMK.sageDark} opacity="0.5"
  />
  {#each Array(24) as _, i}
    {@const x = 8 + i * 20}
    {@const h = 3 + ((i * 7) % 4)}
    <ellipse cx={x} cy={130 - h * 0.4} rx="3.5" ry={h * 0.7}
      fill={LMK.sageDark} opacity="0.45" />
  {/each}

  <!-- Distant town silhouette -->
  <g opacity="0.6">
    <rect x="20" y="124" width="14" height="10" fill={LMK.earthLight} stroke={ink} stroke-width="0.3" />
    <path d="M 19 124 L 27 119 L 35 124 Z" fill={LMK.earth} stroke={ink} stroke-width="0.3" />
    <rect x="50" y="126" width="20" height="8" fill={LMK.earthLight} stroke={ink} stroke-width="0.3" />
    <path d="M 49 126 L 60 121 L 71 126 Z" fill={LMK.earth} stroke={ink} stroke-width="0.3" />
    <rect x="380" y="125" width="22" height="9" fill={LMK.earthLight} stroke={ink} stroke-width="0.3" />
    <path d="M 379 125 L 391 119 L 403 125 Z" fill={LMK.earth} stroke={ink} stroke-width="0.3" />
    <rect x="425" y="127" width="16" height="7" fill={LMK.earthLight} stroke={ink} stroke-width="0.3" />
    <path d="M 424 127 L 433 122 L 442 127 Z" fill={LMK.earth} stroke={ink} stroke-width="0.3" />
  </g>

  <!-- Brick courthouse (HERO) -->
  <g transform="translate(195, 0)">
    <rect x="0" y="86" width="90" height="48" fill={LMK.brick} stroke={ink} stroke-width="0.7" />
    <rect x="0" y="86" width="90" height="3" fill="#9a5a30" opacity="0.5" />
    <rect x="0" y="103" width="90" height="3" fill="#9a5a30" opacity="0.4" />
    <path d="M -2 86 L 45 70 L 92 86 Z" fill={LMK.brick} stroke={ink} stroke-width="0.7" />
    <path d="M -2 86 L 45 70 L 92 86 Z" fill="none" stroke={ink} stroke-width="0.7" />
    <rect x="40" y="60" width="10" height="10" fill={LMK.earthLight} stroke={ink} stroke-width="0.5" />
    <path d="M 39 60 L 45 54 L 51 60 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.5" />
    <line x1="45" y1="54" x2="45" y2="49" stroke={ink} stroke-width="0.6" />
    <circle cx="45" cy="49" r="0.8" fill={ink} />
    <rect x="42" y="63" width="6" height="4" fill={ink} opacity="0.6" />
    <rect x="14" y="116" width="62" height="18" fill={LMK.paperWarm} opacity="0.5" stroke={ink} stroke-width="0.5" />
    <line x1="14" y1="116" x2="76" y2="116" stroke={ink} stroke-width="0.7" />
    {#each [20, 32, 44, 56, 68] as cx}
      <rect x={cx - 1} y="118" width="2" height="16" fill={LMK.white} stroke={ink} stroke-width="0.3" />
    {/each}
    <rect x="40" y="124" width="10" height="10" fill={LMK.earthDark} stroke={ink} stroke-width="0.4" />
    <rect x="36" y="132" width="18" height="2" fill={LMK.earthLight} stroke={ink} stroke-width="0.3" />
    {#each [10, 26, 64, 80] as wx}
      <g>
        <rect x={wx} y="92" width="6" height="8" fill={LMK.skyHi} stroke={ink} stroke-width="0.4" />
        <line x1={wx + 3} y1="92" x2={wx + 3} y2="100" stroke={ink} stroke-width="0.3" />
        <line x1={wx} y1="96" x2={wx + 6} y2="96" stroke={ink} stroke-width="0.3" />
      </g>
    {/each}
    {#each [18, 60] as wx}
      <g>
        <rect x={wx} y="108" width="6" height="6" fill={LMK.skyHi} stroke={ink} stroke-width="0.4" />
        <line x1={wx + 3} y1="108" x2={wx + 3} y2="114" stroke={ink} stroke-width="0.3" />
      </g>
    {/each}
  </g>

  <!-- Mercantile storefront left -->
  <g>
    <rect x="60" y="100" width="42" height="34" fill={LMK.earthLight} stroke={ink} stroke-width="0.6" />
    {#each [105, 110, 115, 120, 125, 130] as y}
      <line x1="60" y1={y} x2="102" y2={y} stroke={ink} stroke-width="0.25" opacity="0.5" />
    {/each}
    <rect x="58" y="96" width="46" height="6" fill={LMK.earthLight} stroke={ink} stroke-width="0.6" />
    <rect x="63" y="98" width="36" height="3" fill={LMK.earthDark} />
    <rect x="68" y="118" width="6" height="16" fill={LMK.earthDark} stroke={ink} stroke-width="0.4" />
    <rect x="80" y="112" width="16" height="10" fill={LMK.skyHi} stroke={ink} stroke-width="0.4" />
    <line x1="88" y1="112" x2="88" y2="122" stroke={ink} stroke-width="0.3" />
    <path d="M 60 112 L 102 112 L 100 116 L 62 116 Z" fill={LMK.earthDark} opacity="0.6" />
  </g>

  <!-- Blacksmith shed right -->
  <g>
    <rect x="306" y="104" width="44" height="30" fill={LMK.earthDark} stroke={ink} stroke-width="0.6" />
    <path d="M 304 104 L 328 92 L 352 104 Z" fill={LMK.earth} stroke={ink} stroke-width="0.6" />
    <rect x="338" y="86" width="5" height="12" fill={LMK.earthDark} stroke={ink} stroke-width="0.4" />
    <path d="M 340.5 86 q -3 -6 2 -10 q 5 -3 1 -9 q -2 -5 4 -10 q 4 -4 0 -10"
      stroke={ink} stroke-width="0.7" fill="none" opacity="0.55" />
    <path d="M 340.5 86 q -2 -5 3 -8 q 4 -3 0 -7"
      stroke={inkSoft} stroke-width="0.6" fill="none" opacity="0.45" />
    <rect x="320" y="124" width="6" height="3" fill={ink} />
    <rect x="321" y="121" width="4" height="3" fill={ink} />
    <rect x="306" y="104" width="44" height="30" fill="#c84a18" opacity="0.18" />
    <ellipse cx="334" cy="120" rx="2.2" ry="3.5" fill={ink} />
    <rect x="332" y="123" width="4" height="9" fill={ink} />
  </g>

  <!-- Trees -->
  <g>
    {@render tree(20, 124, 22)}
    {@render tree(42, 124, 18)}
    {@render tree(160, 118, 24)}
    {@render tree(298, 120, 20)}
    {@render tree(370, 122, 22)}
    {@render tree(408, 122, 20)}
    {@render tree(446, 126, 16)}
    {@render tree(468, 128, 14)}
  </g>

  <!-- Ground -->
  <rect x="0" y="134" width={LMK_VIEW_W} height="66" fill={LMK.parchment} opacity="0.7" />
  <path d="M 0 148 Q 120 144 240 150 Q 360 146 480 152" stroke={LMK.earth} stroke-width="1.5" fill="none" opacity="0.35" />
  <path d="M 0 158 Q 120 156 240 160 Q 360 156 480 162" stroke={LMK.earth} stroke-width="1" fill="none" opacity="0.3" />

  <!-- Foreground wagons + action -->
  <g>
    <!-- parked wagon left foreground -->
    <g transform="translate(80, 0)">
      <rect x="0" y="156" width="32" height="10" fill={LMK.earth} stroke={ink} stroke-width="0.5" />
      <path d="M 0 156 Q 16 138 32 156 Z" fill={LMK.white} stroke={ink} stroke-width="0.6" />
      <path d="M 0 156 Q 16 142 32 156" fill="none" stroke={inkSoft} stroke-width="0.4" />
      <circle cx="6" cy="170" r="5" fill="none" stroke={ink} stroke-width="0.6" />
      <circle cx="6" cy="170" r="1.5" fill={ink} />
      <circle cx="26" cy="170" r="5" fill="none" stroke={ink} stroke-width="0.6" />
      <circle cx="26" cy="170" r="1.5" fill={ink} />
      {#each [0, 60, 120, 180, 240, 300] as a}
        <g>
          <line x1="6" y1="170"
            x2={6 + 5 * Math.cos(a * Math.PI / 180)}
            y2={170 + 5 * Math.sin(a * Math.PI / 180)}
            stroke={ink} stroke-width="0.4" />
          <line x1="26" y1="170"
            x2={26 + 5 * Math.cos(a * Math.PI / 180)}
            y2={170 + 5 * Math.sin(a * Math.PI / 180)}
            stroke={ink} stroke-width="0.4" />
        </g>
      {/each}
    </g>

    <!-- second wagon right foreground -->
    <g transform="translate(240, 0)">
      <rect x="0" y="160" width="30" height="10" fill={LMK.earth} stroke={ink} stroke-width="0.5" />
      <path d="M 0 160 Q 15 144 30 160 Z" fill={LMK.white} stroke={ink} stroke-width="0.6" />
      <circle cx="5" cy="173" r="4.5" fill="none" stroke={ink} stroke-width="0.6" />
      <circle cx="5" cy="173" r="1.2" fill={ink} />
      <circle cx="25" cy="173" r="4.5" fill="none" stroke={ink} stroke-width="0.6" />
      <circle cx="25" cy="173" r="1.2" fill={ink} />
    </g>

    <!-- barrels + crates -->
    <g transform="translate(280, 165)">
      <rect x="0" y="0" width="6" height="8" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
      <line x1="0" y1="2.5" x2="6" y2="2.5" stroke={ink} stroke-width="0.3" />
      <line x1="0" y1="5.5" x2="6" y2="5.5" stroke={ink} stroke-width="0.3" />
      <rect x="7" y="2" width="6" height="6" fill={LMK.earthLight} stroke={ink} stroke-width="0.4" />
      <rect x="3" y="-6" width="5" height="6" fill={LMK.earthDark} stroke={ink} stroke-width="0.4" />
    </g>

    <!-- yoked oxen pair -->
    <g transform="translate(140, 0)">
      <ellipse cx="6" cy="166" rx="7" ry="4.5" fill={LMK.earth} stroke={ink} stroke-width="0.5" />
      <ellipse cx="13" cy="164" rx="3" ry="3" fill={LMK.earth} stroke={ink} stroke-width="0.5" />
      <path d="M 14 162 q 1.5 -1.5 3 -0.5" stroke={ink} stroke-width="0.5" fill="none" />
      <path d="M 12 162 q -1 -1 -2 0" stroke={ink} stroke-width="0.5" fill="none" />
      <line x1="2" y1="170" x2="2" y2="174" stroke={ink} stroke-width="0.6" />
      <line x1="9" y1="170" x2="9" y2="174" stroke={ink} stroke-width="0.6" />
      <ellipse cx="6" cy="174" rx="7" ry="4.5" fill={LMK.earthLight} stroke={ink} stroke-width="0.5" />
      <ellipse cx="13" cy="172" rx="3" ry="3" fill={LMK.earthLight} stroke={ink} stroke-width="0.5" />
      <line x1="2" y1="178" x2="2" y2="182" stroke={ink} stroke-width="0.6" />
      <line x1="9" y1="178" x2="9" y2="182" stroke={ink} stroke-width="0.6" />
    </g>

    <!-- people -->
    {@render person(120, 170)}
    {@render person(172, 172, ink)}
    {@render person(216, 168)}
    {@render person(278, 170, ink)}
    {@render person(344, 172)}
    {@render person(368, 170, ink)}
  </g>

  <!-- Caption -->
  <text x="240" y="194" text-anchor="middle"
    font-family="IM Fell English, Georgia, serif" font-size="8"
    fill={inkSoft} font-style="italic" opacity="0.85">
    Independence — Queen City of the Trails
  </text>
</g>
