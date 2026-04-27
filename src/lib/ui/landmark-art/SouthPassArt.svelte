<!-- SouthPassArt.svelte — auto-ported from south-pass-art.jsx -->
<script lang="ts">
  import { LMK, LMK_VIEW_W } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const wood = '#8a6a3a';
  const peakLight = "#c8d4dc";
  const peakSnow = "#e8eef0";
  const peakShadow = "#7a8898";
  const hillsTan = "#9a8068";
</script>

{#snippet smallWagonSP(x: number, y: number, scale: number = 1, opacity: number = 1)}
  <g transform={`translate(${x}, ${y}) scale(${scale})`} opacity={opacity}>
    <g transform="translate(-9, 0)">
      <ellipse cx="0" cy="2" rx="2.4" ry="1.3" fill={LMK.earthLight} stroke={ink} stroke-width="0.3" />
      <ellipse cx="2" cy="1.4" rx="1" ry="0.8" fill={LMK.earthLight} stroke={ink} stroke-width="0.3" />
    </g>
    <g transform="translate(-16, 0)">
      <ellipse cx="0" cy="2" rx="2.4" ry="1.3" fill={LMK.earth} stroke={ink} stroke-width="0.3" />
      <ellipse cx="2" cy="1.4" rx="1" ry="0.8" fill={LMK.earth} stroke={ink} stroke-width="0.3" />
    </g>
    <rect x="0" y="0" width="12" height="4" fill={LMK.earth} stroke={ink} stroke-width="0.3" />
    <path d="M 0 0 Q 6 -7 12 0 Z" fill={LMK.white} stroke={ink} stroke-width="0.4" />
    <circle cx="2.5" cy="5" r="1.6" fill="none" stroke={ink} stroke-width="0.3" />
    <circle cx="9.5" cy="5" r="1.6" fill="none" stroke={ink} stroke-width="0.3" />
  </g>
{/snippet}

<g>
  <!-- DISTANT WIND RIVER RANGE — right side -->
  <g>
    <path
      d="M 240 80 Q 280 76 320 78 Q 360 74 400 78 Q 440 72 480 78 L 480 96 L 240 96 Z"
      fill={peakLight} opacity="0.55"
    />
    <path
      d="M 240 80
         L 252 70 L 260 76 L 272 60 L 280 70 L 290 56 L 300 70
         L 312 50 L 322 64 L 334 48 L 344 62 L 358 44 L 368 58
         L 380 42 L 392 56 L 406 40 L 418 56 L 430 46 L 444 60
         L 456 48 L 468 60 L 480 50 L 480 96 L 240 96 Z"
      fill={peakLight} stroke={ink} stroke-width="0.5" opacity="0.85"
    />
    <path
      d="M 252 70 L 260 76 M 272 60 L 280 70 L 290 56 L 300 70
         M 312 50 L 322 64 L 334 48 L 344 62 L 358 44 L 368 58
         L 380 42 L 392 56 L 406 40 L 418 56 L 430 46 L 444 60
         L 456 48 L 468 60"
      stroke={peakSnow} stroke-width="2.5" fill="none"
      stroke-linecap="round" stroke-linejoin="round" opacity="0.95"
    />
    <g opacity="0.45" fill={peakShadow}>
      <path d="M 290 56 L 300 70 L 296 80 L 290 76 Z" />
      <path d="M 322 64 L 334 48 L 338 60 L 326 72 Z" />
      <path d="M 358 44 L 368 58 L 364 70 L 354 60 Z" />
      <path d="M 392 56 L 406 40 L 410 52 L 396 66 Z" />
      <path d="M 418 56 L 430 46 L 434 58 L 422 68 Z" />
    </g>
    <path
      d="M 240 80 Q 300 74 360 76 Q 420 70 480 76 L 480 84 L 240 84 Z"
      fill={peakSnow} opacity="0.25"
    />
  </g>

  <!-- ANTELOPE HILLS — left side -->
  <g>
    <path
      d="M 0 92 Q 30 86 60 90 Q 90 84 120 88 Q 150 84 180 88 Q 210 86 240 90 L 240 100 L 0 100 Z"
      fill={hillsTan} opacity="0.6" stroke={ink} stroke-width="0.4"
    />
    <path
      d="M 0 96 Q 60 92 120 96 Q 180 92 240 96 L 240 102 L 0 102 Z"
      fill={hillsTan} opacity="0.45"
    />
  </g>

  <!-- mid-distant sage plain -->
  <rect x="0" y="100" width={LMK_VIEW_W} height="22" fill={LMK.sage} opacity="0.4" />

  <!-- PACIFIC SPRINGS -->
  <g transform="translate(150, 122)">
    <ellipse cx="0" cy="0" rx="14" ry="2.5" fill={LMK.water} stroke={ink} stroke-width="0.4" opacity="0.85" />
    <ellipse cx="-3" cy="-0.5" rx="3" ry="0.5" fill={peakSnow} opacity="0.5" />
    <ellipse cx="6" cy="0.3" rx="2" ry="0.4" fill={peakSnow} opacity="0.5" />
    {#each [-15, -10, 10, 15] as rx}
      <g transform={`translate(${rx}, 0)`}>
        <line x1="0" y1="0" x2="0" y2="-3" stroke="#5a6a3a" stroke-width="0.3" />
        <line x1="-1" y1="-1" x2="-1" y2="-3" stroke="#5a6a3a" stroke-width="0.3" />
        <line x1="1" y1="-1" x2="1" y2="-3" stroke="#5a6a3a" stroke-width="0.3" />
      </g>
    {/each}
    <ellipse cx="-18" cy="-1" rx="3" ry="2" fill={LMK.sageDark} stroke={ink} stroke-width="0.3" />
    <ellipse cx="18" cy="-1" rx="3" ry="2" fill={LMK.sageDark} stroke={ink} stroke-width="0.3" />
  </g>

  <!-- PACIFIC SPRINGS marker post -->
  <g transform="translate(132, 122)">
    <line x1="0" y1="0" x2="0" y2="-8" stroke={wood} stroke-width="1.4" stroke-linecap="round" />
    <rect x="-10" y="-12" width="20" height="6" fill={wood} stroke={ink} stroke-width="0.4" />
    <text x="0" y="-7.5" text-anchor="middle"
      font-family="IM Fell English, Georgia, serif" font-size="3.2"
      fill={LMK.parchment} opacity="0.95">
      PACIFIC
    </text>
  </g>

  <!-- FOREGROUND — vast empty sage plain -->
  <rect x="0" y="122" width={LMK_VIEW_W} height="78" fill={LMK.parchment} opacity="0.55" />

  <!-- the trail -->
  <g>
    <path
      d="M 0 158 Q 100 156 200 156 Q 300 154 400 152 Q 450 151 480 150"
      stroke={LMK.earth} stroke-width="1.4" fill="none" opacity="0.6"
    />
    <path
      d="M 0 164 Q 100 162 200 162 Q 300 160 400 158 Q 450 157 480 156"
      stroke={LMK.earth} stroke-width="1" fill="none" opacity="0.5"
    />
    <path
      d="M 0 152 Q 100 150 200 150 Q 300 148 400 146"
      stroke={LMK.earth} stroke-width="0.7" fill="none" opacity="0.35"
    />
  </g>

  <!-- sage clumps -->
  <g opacity="0.6">
    {#each [[12, 134], [40, 142], [70, 138], [102, 146], [180, 138], [220, 144], [260, 140], [294, 146], [328, 138], [360, 144], [400, 138], [440, 144], [466, 140], [20, 174], [60, 182], [110, 178], [200, 188], [260, 184], [320, 188], [380, 184], [440, 188]] as [x, y]}
      <g transform={`translate(${x}, ${y})`}>
        <ellipse cx="0" cy="0" rx="2.6" ry="1.2" fill={LMK.sage} stroke={ink} stroke-width="0.25" />
        <ellipse cx="-1" cy="-0.7" rx="1.4" ry="0.7" fill={LMK.sageLight} stroke={ink} stroke-width="0.2" />
      </g>
    {/each}
  </g>

  <!-- LONG WAGON TRAIN -->
  <g>
    {@render smallWagonSP(420, 148, 0.55, 0.85)}
    {@render smallWagonSP(388, 150, 0.6, 0.88)}
    {@render smallWagonSP(356, 152, 0.65, 0.92)}
    {@render smallWagonSP(310, 154, 0.72)}
    {@render smallWagonSP(266, 156, 0.78)}
    {@render smallWagonSP(220, 158, 0.85)}
    {@render smallWagonSP(170, 162, 0.95)}
    {@render smallWagonSP(108, 166, 1.05)}
    {@render smallWagonSP(42, 170, 1.15)}

    <!-- outrider -->
    <g transform="translate(74, 168)">
      <ellipse cx="0" cy="2" rx="3.5" ry="1.4" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
      <ellipse cx="3" cy="0.5" rx="1.2" ry="1" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
      <line x1="-2" y1="3" x2="-2" y2="5.5" stroke={ink} stroke-width="0.4" />
      <line x1="2" y1="3" x2="2" y2="5.5" stroke={ink} stroke-width="0.4" />
      <ellipse cx="0" cy="-2" rx="0.9" ry="1" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
      <ellipse cx="0" cy="-3" rx="1.4" ry="0.3" fill={ink} />
      <path d="M -0.9 -1.3 L 0.9 -1.3 L 0.7 1.8 L -0.7 1.8 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
      <line x1="0.5" y1="-0.5" x2="3" y2="-1" stroke={ink} stroke-width="0.5" stroke-linecap="round" />
    </g>
  </g>

  <!-- Birds -->
  <g opacity="0.5" stroke={ink} stroke-width="0.4" fill="none">
    <path d="M 80 30 q 2 -1.5 4 0 q 2 -1.5 4 0" />
    <path d="M 100 22 q 2 -1.2 3 0 q 2 -1.2 3 0" />
    <path d="M 200 28 q 2 -1.5 4 0 q 2 -1.5 4 0" />
    <path d="M 380 24 q 2 -1.2 3 0 q 2 -1.2 3 0" />
  </g>

  <!-- Caption -->
  <text x="240" y="194" text-anchor="middle"
    font-family="IM Fell English, Georgia, serif" font-size="8"
    fill={inkSoft} font-style="italic" opacity="0.85">
    South Pass — the Continental Divide
  </text>
</g>
