<!-- ScottsBluffArt.svelte — auto-ported from scotts-bluff-art.jsx -->
<script lang="ts">
  import { LMK, LMK_VIEW_W } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const stoneLight = "#cdb088";
  const stoneMid = "#a07852";
  const stoneDark = "#5a3d22";
  const pineDark = "#3a4a2a";
</script>

{#snippet smallWagonSB(x: number, y: number, ox: number = 2, scale: number = 1, opacity: number = 1)}
  <g transform={`translate(${x}, ${y}) scale(${scale})`} opacity={opacity}>
    {#each Array(ox) as _, i}
      <g transform={`translate(${-(i + 1) * 7 - 4}, 0)`}>
        <ellipse cx="0" cy="2" rx="2.6" ry="1.4" fill={i % 2 ? LMK.earth : LMK.earthLight} stroke={ink} stroke-width="0.3" />
        <ellipse cx="2.2" cy="1.5" rx="1.1" ry="0.9" fill={i % 2 ? LMK.earth : LMK.earthLight} stroke={ink} stroke-width="0.3" />
        <line x1="-1.5" y1="3" x2="-1.5" y2="4.5" stroke={ink} stroke-width="0.3" />
        <line x1="1" y1="3" x2="1" y2="4.5" stroke={ink} stroke-width="0.3" />
      </g>
    {/each}
    <rect x="0" y="0" width="12" height="4" fill={LMK.earth} stroke={ink} stroke-width="0.3" />
    <path d="M 0 0 Q 6 -7 12 0 Z" fill={LMK.white} stroke={ink} stroke-width="0.4" />
    <circle cx="2.5" cy="5" r="1.6" fill="none" stroke={ink} stroke-width="0.3" />
    <circle cx="9.5" cy="5" r="1.6" fill="none" stroke={ink} stroke-width="0.3" />
  </g>
{/snippet}

<g>
  <!-- Far horizon -->
  <path
    d="M 0 90 Q 60 86 130 90 Q 200 88 280 92 Q 360 88 440 92 Q 470 90 480 92 L 480 100 L 0 100 Z"
    fill={LMK.sage} opacity="0.4"
  />

  <!-- LEFT MASS — Scotts Bluff itself -->
  <g>
    <path
      d="M 0 130 L 0 70 L 18 56 L 38 44 L 56 30 L 78 28 L 96 36 L 112 50 L 128 64 L 142 78 L 156 92 L 170 108 L 178 130 Z"
      fill={stoneLight} stroke={ink} stroke-width="0.8"
    />
    <path
      d="M 96 36 L 112 50 L 128 64 L 142 78 L 156 92 L 170 108 L 178 130 L 130 130 L 130 80 L 110 60 Z"
      fill={stoneMid} opacity="0.55"
    />
    <g opacity="0.65">
      <path d="M 8 80 Q 80 76 156 90" stroke={stoneMid} stroke-width="0.5" fill="none" />
      <path d="M 4 96 Q 80 90 168 104" stroke={stoneMid} stroke-width="0.5" fill="none" />
      <path d="M 0 110 Q 80 106 174 118" stroke={stoneMid} stroke-width="0.6" fill="none" />
      <path d="M 0 122 Q 80 120 178 128" stroke={stoneDark} stroke-width="0.6" fill="none" opacity="0.6" />
      <path d="M 28 60 Q 60 56 100 50" stroke={stoneMid} stroke-width="0.5" fill="none" />
      <path d="M 38 50 Q 60 46 88 42" stroke={stoneMid} stroke-width="0.4" fill="none" />
    </g>
    <g opacity="0.55">
      <path d="M 38 44 Q 36 80 28 130" stroke={stoneDark} stroke-width="0.5" fill="none" />
      <path d="M 56 30 Q 60 80 64 130" stroke={stoneDark} stroke-width="0.5" fill="none" />
      <path d="M 78 28 Q 80 80 92 130" stroke={stoneDark} stroke-width="0.6" fill="none" />
      <path d="M 112 50 Q 122 88 128 130" stroke={stoneDark} stroke-width="0.5" fill="none" />
      <path d="M 142 78 Q 152 100 158 130" stroke={stoneDark} stroke-width="0.4" fill="none" />
    </g>
    <!-- pines on upper slopes -->
    <g>
      {#each [[40, 56], [52, 50], [62, 42], [72, 38], [86, 38], [98, 44], [110, 56], [122, 68], [50, 64], [70, 56], [44, 78], [60, 72], [84, 70], [104, 72], [120, 84]] as [px, py]}
        <g transform={`translate(${px}, ${py})`}>
          <path d="M -1.4 1 L 0 -2 L 1.4 1 Z" fill={pineDark} stroke={ink} stroke-width="0.2" />
        </g>
      {/each}
    </g>
  </g>

  <!-- MITCHELL PASS -->
  <g>
    <path
      d="M 178 130 L 200 124 L 230 122 L 260 122 L 290 124 L 312 130 Z"
      fill={LMK.parchment} stroke={ink} stroke-width="0.5" opacity="0.85"
    />
    <path
      d="M 178 130 L 200 124 L 215 100 L 200 92 L 178 110 Z"
      fill={stoneDark} opacity="0.35"
    />
    <path
      d="M 312 130 L 290 124 L 275 100 L 290 92 L 312 110 Z"
      fill={stoneDark} opacity="0.35"
    />
    <path d="M 0 130 Q 100 130 178 130 L 200 124 L 230 122 L 260 122 L 290 124 L 312 130 Q 400 130 480 130"
      stroke={LMK.earth} stroke-width="1" fill="none" opacity="0.5" />
  </g>

  <!-- RIGHT MASS — South Bluff / Eagle Rock -->
  <g>
    <path
      d="M 312 130 L 322 110 L 336 92 L 354 76 L 374 64 L 396 50 L 418 42 L 438 36 L 458 38 L 478 46 L 480 60 L 480 130 Z"
      fill={stoneLight} stroke={ink} stroke-width="0.8"
    />
    <path
      d="M 312 130 L 322 110 L 336 92 L 354 76 L 374 64 L 374 130 Z"
      fill={stoneMid} opacity="0.55"
    />
    <g opacity="0.65">
      <path d="M 318 96 Q 400 88 480 84" stroke={stoneMid} stroke-width="0.5" fill="none" />
      <path d="M 314 110 Q 400 102 480 98" stroke={stoneMid} stroke-width="0.5" fill="none" />
      <path d="M 312 122 Q 400 116 480 114" stroke={stoneDark} stroke-width="0.5" fill="none" opacity="0.7" />
      <path d="M 350 80 Q 410 72 470 64" stroke={stoneMid} stroke-width="0.4" fill="none" />
    </g>
    <g opacity="0.55">
      <path d="M 336 92 Q 332 110 326 130" stroke={stoneDark} stroke-width="0.4" fill="none" />
      <path d="M 374 64 Q 380 100 388 130" stroke={stoneDark} stroke-width="0.5" fill="none" />
      <path d="M 418 42 Q 422 90 432 130" stroke={stoneDark} stroke-width="0.5" fill="none" />
      <path d="M 458 38 Q 466 90 472 130" stroke={stoneDark} stroke-width="0.4" fill="none" />
    </g>
    <g>
      {#each [[340, 90], [358, 78], [378, 66], [398, 54], [418, 50], [436, 44], [456, 46], [472, 54], [350, 86], [368, 76], [388, 64], [408, 56], [428, 58], [448, 56], [466, 64]] as [px, py]}
        <g transform={`translate(${px}, ${py})`}>
          <path d="M -1.4 1 L 0 -2 L 1.4 1 Z" fill={pineDark} stroke={ink} stroke-width="0.2" />
        </g>
      {/each}
    </g>
  </g>

  <!-- Birds overhead -->
  <g opacity="0.55" stroke={ink} stroke-width="0.4" fill="none">
    <path d="M 200 22 q 2 -1.5 4 0 q 2 -1.5 4 0" />
    <path d="M 220 28 q 2 -1.2 3 0 q 2 -1.2 3 0" />
    <path d="M 240 18 q 2 -1.5 4 0 q 2 -1.5 4 0" />
    <path d="M 280 24 q 2 -1.2 3 0 q 2 -1.2 3 0" />
  </g>

  <!-- Foreground plain -->
  <rect x="0" y="130" width={LMK_VIEW_W} height="70" fill={LMK.parchment} opacity="0.55" />
  <path d="M 0 144 Q 80 142 160 146 Q 240 144 320 146 Q 400 144 480 148"
    stroke={LMK.earth} stroke-width="0.7" fill="none" opacity="0.4" />
  <!-- sage clumps -->
  <g opacity="0.6">
    {#each [20, 64, 100, 360, 400, 444] as x, i}
      {@const y = 156 + (i % 3) * 6}
      <g transform={`translate(${x}, ${y})`}>
        <ellipse cx="0" cy="0" rx="3" ry="1.4" fill={LMK.sage} stroke={ink} stroke-width="0.3" />
        <ellipse cx="-1.2" cy="-0.8" rx="1.6" ry="0.9" fill={LMK.sageLight} stroke={ink} stroke-width="0.25" />
      </g>
    {/each}
  </g>

  <!-- Wagon train through pass -->
  <g>
    {@render smallWagonSB(232, 120, 2, 0.6, 0.85)}
    {@render smallWagonSB(252, 122, 2, 0.65, 0.9)}
    {@render smallWagonSB(272, 124, 2, 0.7, 0.95)}
    {@render smallWagonSB(210, 144, 2, 0.85)}
    {@render smallWagonSB(166, 150, 2, 1)}
    {@render smallWagonSB(108, 158, 3, 1.05)}
    {@render smallWagonSB(44, 166, 3, 1.15)}

    <!-- outrider -->
    <g transform="translate(140, 168)">
      <ellipse cx="0" cy="2" rx="3.5" ry="1.4" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
      <ellipse cx="3" cy="0.5" rx="1.2" ry="1" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
      <line x1="-2" y1="3" x2="-2" y2="5.5" stroke={ink} stroke-width="0.4" />
      <line x1="2" y1="3" x2="2" y2="5.5" stroke={ink} stroke-width="0.4" />
      <ellipse cx="0" cy="-2" rx="0.8" ry="0.9" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
      <ellipse cx="0" cy="-3" rx="1.3" ry="0.3" fill={ink} />
      <path d="M -0.9 -1.3 L 0.9 -1.3 L 0.7 1.8 L -0.7 1.8 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
    </g>
  </g>

  <!-- Caption -->
  <text x="240" y="194" text-anchor="middle"
    font-family="IM Fell English, Georgia, serif" font-size="8"
    fill={inkSoft} font-style="italic" opacity="0.85">
    Scotts Bluff — Mitchell Pass
  </text>
</g>
