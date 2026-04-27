<!-- ThreeIslandArt.svelte — auto-ported from three-island-art.jsx -->
<script lang="ts">
  import { LMK, LMK_VIEW_W } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const tan = '#c8a870';
  const basaltDark = "#2a2a30";
  const basaltMid = "#4a4854";
  const basaltLight = "#7a7a82";
  const snakeGreen = "#4a7a6a";
  const snakeGreenDark = "#2e5648";
  const snakeGreenLight = "#7eaa92";
  const islandGreen = "#5a7048";
  const cottonGreen = "#5a7a4a";
</script>

{#snippet fordWagon(x: number, y: number, depth: number = 2)}
  <g transform={`translate(${x}, ${y})`}>
    {#if depth >= 3}
      <path d="M 0 0 Q 7 -8 14 0 Z" fill={LMK.white} stroke={ink} stroke-width="0.5" />
      <rect x="0" y="0" width="14" height="1.5" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
      <path d="M -4 1.5 q 22 -1 28 0" stroke={LMK.paperWarm} stroke-width="0.5" fill="none" opacity="0.7" />
      <path d="M -2 2.5 q 20 -0.5 24 0" stroke={LMK.paperWarm} stroke-width="0.4" fill="none" opacity="0.5" />
    {/if}
    {#if depth === 2}
      <path d="M 0 0 Q 7 -9 14 0 Z" fill={LMK.white} stroke={ink} stroke-width="0.5" />
      <rect x="0" y="0" width="14" height="3" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
      <path d="M -3 3 q 20 -1 26 0" stroke={LMK.paperWarm} stroke-width="0.5" fill="none" opacity="0.7" />
      <path d="M -1 4 q 18 -0.5 22 0" stroke={LMK.paperWarm} stroke-width="0.4" fill="none" opacity="0.5" />
    {/if}
    {#if depth === 1}
      <path d="M 0 0 Q 7 -10 14 0 Z" fill={LMK.white} stroke={ink} stroke-width="0.5" />
      <rect x="0" y="0" width="14" height="5" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
      <path d="M 1 5 q 0.5 1.6 3 1.6 q 2.5 0 3 -1.6" fill={LMK.water} opacity="0.6" />
      <circle cx="3" cy="6" r="1.4" fill="none" stroke={ink} stroke-width="0.35" />
      <circle cx="11" cy="6" r="1.4" fill="none" stroke={ink} stroke-width="0.35" />
      <path d="M -2 7 q 18 -0.5 22 0" stroke={LMK.paperWarm} stroke-width="0.4" fill="none" opacity="0.55" />
    {/if}
  </g>
{/snippet}

{#snippet smallWagonTI(x: number, y: number)}
  <g transform={`translate(${x}, ${y})`}>
    <rect x="0" y="0" width="14" height="5" fill={LMK.earth} stroke={ink} stroke-width="0.35" />
    <path d="M 0 0 Q 7 -8 14 0 Z" fill={LMK.white} stroke={ink} stroke-width="0.45" />
    <circle cx="3" cy="6" r="1.8" fill="none" stroke={ink} stroke-width="0.35" />
    <circle cx="11" cy="6" r="1.8" fill="none" stroke={ink} stroke-width="0.35" />
  </g>
{/snippet}

{#snippet smallPersonTI(x: number, y: number, hat: boolean = false)}
  <g transform={`translate(${x}, ${y})`}>
    <circle cx="0" cy="-3" r="0.9" fill={LMK.paperWarm} stroke={ink} stroke-width="0.2" />
    {#if hat}
      <ellipse cx="0" cy="-4" rx="1.5" ry="0.3" fill={ink} />
    {/if}
    <path d="M -1.2 -2 L 1.2 -2 L 1 2 L -1 2 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
    <line x1="-0.6" y1="2" x2="-0.6" y2="5" stroke={ink} stroke-width="0.4" />
    <line x1="0.6" y1="2" x2="0.6" y2="5" stroke={ink} stroke-width="0.4" />
  </g>
{/snippet}

<g>
  <!-- Far horizon -->
  <path
    d="M 0 64 Q 80 60 160 64 Q 240 60 320 64 Q 400 60 480 64 L 480 76 L 0 76 Z"
    fill={LMK.sage} opacity="0.4"
  />

  <!-- BASALT BLUFFS -->
  <g>
    <!-- RIGHT-side bluff (north bank) -->
    <path
      d="M 480 76 L 480 130 L 460 130 L 450 124 L 442 116 L 436 100 L 432 86 L 434 76 Z"
      fill={basaltDark} stroke={ink} stroke-width="0.6"
    />
    <path
      d="M 434 76 L 432 86 L 436 100 L 442 116 L 450 124 L 460 130 L 410 130 L 408 124 L 404 116 L 400 100 L 402 86 L 404 76 Z"
      fill={basaltMid} stroke={ink} stroke-width="0.6"
    />
    <path
      d="M 404 76 L 402 86 L 400 100 L 404 116 L 408 124 L 410 130 L 380 130 L 378 124 L 374 116 L 370 100 L 372 88 L 374 76 Z"
      fill={basaltLight} opacity="0.85" stroke={ink} stroke-width="0.5"
    />
    <g opacity="0.65" stroke={basaltDark} stroke-width="0.4" fill="none">
      {#each [378, 384, 390, 398, 408, 416, 424, 432, 442, 452, 462, 472] as x, i}
        <line x1={x} y1={i % 2 ? 84 : 80} x2={x + (i % 2 ? -2 : 1)} y2="128" />
      {/each}
    </g>

    <!-- LEFT-side bluff -->
    <path
      d="M 0 80 L 0 118 L 24 118 L 30 110 L 34 96 L 32 86 L 28 80 Z"
      fill={basaltDark} stroke={ink} stroke-width="0.6"
    />
    <path
      d="M 28 80 L 32 86 L 34 96 L 30 110 L 24 118 L 60 118 L 62 110 L 60 96 L 56 86 L 54 80 Z"
      fill={basaltMid} stroke={ink} stroke-width="0.6"
    />
    <g opacity="0.65" stroke={basaltDark} stroke-width="0.4" fill="none">
      {#each [8, 16, 24, 36, 44, 54] as x, i}
        <line x1={x} y1={i % 2 ? 88 : 84} x2={x} y2="116" />
      {/each}
    </g>

    <!-- sage tufts on bluffs -->
    <g opacity="0.55">
      {#each [10, 26, 42, 388, 412, 432, 458] as x, i}
        <ellipse cx={x} cy={i < 3 ? 80 : 76} rx="2" ry="0.8" fill={LMK.sage} />
      {/each}
    </g>
  </g>

  <!-- THE SNAKE RIVER -->
  <g>
    <path
      d="M 0 118 L 60 118 Q 240 132 400 122 Q 460 118 480 118 L 480 130 Q 240 144 0 130 Z"
      fill={snakeGreen} stroke={ink} stroke-width="0.5" opacity="0.92"
    />
    <path
      d="M 0 130 Q 240 144 480 130 L 480 138 Q 240 150 0 138 Z"
      fill={snakeGreenDark} opacity="0.65"
    />
    <g opacity="0.7" stroke={snakeGreenLight} fill="none" stroke-width="0.5">
      <path d="M 80 124 q 8 -1 16 0 q 8 -1 16 0" />
      <path d="M 320 126 q 10 -1 20 0 q 10 -1 20 0" />
      <path d="M 80 134 q 10 -0.5 20 0" />
      <path d="M 200 138 q 10 -0.5 20 0" />
      <path d="M 360 136 q 10 -0.5 20 0" />
    </g>
    <path
      d="M 0 138 Q 240 150 480 138 L 480 142 Q 240 152 0 142 Z"
      fill={snakeGreenDark} opacity="0.6"
    />
  </g>

  <!-- THREE ISLANDS -->
  <g>
    <!-- Far island (upstream, right) -->
    <g transform="translate(310, 122)">
      <ellipse cx="0" cy="0" rx="22" ry="3" fill={tan} stroke={ink} stroke-width="0.4" />
      <ellipse cx="-4" cy="-1" rx="6" ry="2" fill={islandGreen} stroke={ink} stroke-width="0.3" />
      <ellipse cx="6" cy="-1" rx="5" ry="1.6" fill={islandGreen} stroke={ink} stroke-width="0.3" />
      <ellipse cx="14" cy="-0.5" rx="3" ry="1.2" fill={islandGreen} stroke={ink} stroke-width="0.3" />
      <ellipse cx="-6" cy="-3" rx="3" ry="2.5" fill={cottonGreen} stroke={ink} stroke-width="0.3" />
      <line x1="-6" y1="-1" x2="-6" y2="1" stroke={ink} stroke-width="0.3" />
      <ellipse cx="6" cy="-3" rx="2.5" ry="2" fill={cottonGreen} stroke={ink} stroke-width="0.3" />
      <line x1="6" y1="-1" x2="6" y2="1" stroke={ink} stroke-width="0.3" />
    </g>

    <!-- Middle island -->
    <g transform="translate(220, 130)">
      <ellipse cx="0" cy="0" rx="26" ry="3.5" fill={tan} stroke={ink} stroke-width="0.4" />
      <ellipse cx="-6" cy="-1.2" rx="8" ry="2.4" fill={islandGreen} stroke={ink} stroke-width="0.3" />
      <ellipse cx="6" cy="-1.2" rx="8" ry="2.4" fill={islandGreen} stroke={ink} stroke-width="0.3" />
      <ellipse cx="16" cy="-0.5" rx="4" ry="1.4" fill={islandGreen} stroke={ink} stroke-width="0.3" />
      <ellipse cx="-8" cy="-3.5" rx="3.5" ry="3" fill={cottonGreen} stroke={ink} stroke-width="0.3" />
      <line x1="-8" y1="-0.5" x2="-8" y2="1.5" stroke={ink} stroke-width="0.3" />
      <ellipse cx="2" cy="-4" rx="3.5" ry="3" fill={cottonGreen} stroke={ink} stroke-width="0.3" />
      <line x1="2" y1="-1" x2="2" y2="1.5" stroke={ink} stroke-width="0.3" />
      <ellipse cx="12" cy="-3.5" rx="3" ry="2.5" fill={cottonGreen} stroke={ink} stroke-width="0.3" />
      <line x1="12" y1="-1" x2="12" y2="1" stroke={ink} stroke-width="0.3" />
    </g>

    <!-- Near island (downstream, left) -->
    <g transform="translate(120, 138)">
      <ellipse cx="0" cy="0" rx="24" ry="3.2" fill={tan} stroke={ink} stroke-width="0.4" />
      <ellipse cx="-5" cy="-1" rx="7" ry="2.2" fill={islandGreen} stroke={ink} stroke-width="0.3" />
      <ellipse cx="8" cy="-1" rx="6" ry="2" fill={islandGreen} stroke={ink} stroke-width="0.3" />
      <ellipse cx="-7" cy="-3" rx="3" ry="2.5" fill={cottonGreen} stroke={ink} stroke-width="0.3" />
      <line x1="-7" y1="-0.5" x2="-7" y2="1.5" stroke={ink} stroke-width="0.3" />
      <ellipse cx="6" cy="-3.5" rx="3.5" ry="3" fill={cottonGreen} stroke={ink} stroke-width="0.3" />
      <line x1="6" y1="-0.5" x2="6" y2="1.5" stroke={ink} stroke-width="0.3" />
    </g>
  </g>

  <!-- WAGONS MID-FORD -->
  <g>
    {@render fordWagon(166, 134, 3)}
    {@render fordWagon(264, 126, 2)}
    {@render fordWagon(350, 120, 1)}

    <!-- Swimming oxen -->
    <g>
      {#each [{ x: 142, y: 134 }, { x: 154, y: 135 }, { x: 244, y: 127 }, { x: 252, y: 128 }, { x: 332, y: 121 }, { x: 342, y: 122 }] as o, i}
        <g transform={`translate(${o.x}, ${o.y})`}>
          <ellipse cx="0" cy="0" rx="1.4" ry="0.9" fill={i % 2 ? LMK.earth : LMK.earthLight} stroke={ink} stroke-width="0.25" />
          <line x1="-0.8" y1="-0.5" x2="-1.5" y2="-1.4" stroke={ink} stroke-width="0.3" />
          <line x1="0.8" y1="-0.5" x2="1.5" y2="-1.4" stroke={ink} stroke-width="0.3" />
          <path d="M -1.5 0.5 q -3 0 -5 -0.5" stroke={LMK.paperWarm} stroke-width="0.35" fill="none" opacity="0.55" />
        </g>
      {/each}
    </g>
  </g>

  <!-- Wagons that REFUSED — south bank -->
  <g>
    {@render smallWagonTI(48, 154)}
    {@render smallWagonTI(20, 156)}
    {@render smallPersonTI(72, 172, true)}
    {@render smallPersonTI(84, 174)}
    {@render smallPersonTI(96, 172, true)}
  </g>

  <!-- Foreground south bank -->
  <rect x="0" y="142" width={LMK_VIEW_W} height="58" fill={LMK.parchment} opacity="0.55" />
  <g opacity="0.6">
    {#each [14, 110, 200, 280, 370, 460] as x, i}
      {@const y = 168 + (i % 3) * 6}
      <g transform={`translate(${x}, ${y})`}>
        <ellipse cx="0" cy="0" rx="2.6" ry="1.2" fill={LMK.sage} stroke={ink} stroke-width="0.25" />
        <ellipse cx="-1" cy="-0.7" rx="1.4" ry="0.7" fill={LMK.sageLight} stroke={ink} stroke-width="0.2" />
      </g>
    {/each}
  </g>
  <!-- trail leading to water -->
  <path d="M 70 200 Q 90 188 110 178 Q 130 165 150 152 Q 160 145 168 140"
    stroke={LMK.earth} stroke-width="1.4" fill="none" opacity="0.55" />
  <path d="M 80 200 Q 100 190 120 180 Q 140 168 156 156 Q 164 150 170 145"
    stroke={LMK.earth} stroke-width="1" fill="none" opacity="0.45" />

  <!-- birds -->
  <g opacity="0.55" stroke={ink} stroke-width="0.4" fill="none">
    <path d="M 200 28 q 2 -1.5 4 0 q 2 -1.5 4 0" />
    <path d="M 220 22 q 2 -1.2 3 0 q 2 -1.2 3 0" />
  </g>

  <!-- Caption -->
  <text x="240" y="194" text-anchor="middle"
    font-family="IM Fell English, Georgia, serif" font-size="8"
    fill={inkSoft} font-style="italic" opacity="0.85">
    Three Island Crossing of the Snake
  </text>
</g>
