<!-- IndependenceRockArt.svelte — auto-ported from independence-rock-art.jsx -->
<script lang="ts">
  import { LMK, LMK_VIEW_W } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const tan = '#c8a870';
  const graniteLight = "#bda898";
  const graniteMid = "#8e7868";
  const graniteDark = "#54443a";
</script>

{#snippet smallWagonIR(x: number, y: number, angle: number = 0)}
  <g transform={`translate(${x}, ${y}) rotate(${angle})`}>
    <rect x="0" y="0" width="14" height="5" fill={LMK.earth} stroke={ink} stroke-width="0.35" />
    <path d="M 0 0 Q 7 -8 14 0 Z" fill={LMK.white} stroke={ink} stroke-width="0.45" />
    <circle cx="3" cy="6" r="1.8" fill="none" stroke={ink} stroke-width="0.35" />
    <circle cx="11" cy="6" r="1.8" fill="none" stroke={ink} stroke-width="0.35" />
    <circle cx="3" cy="6" r="0.5" fill={ink} />
    <circle cx="11" cy="6" r="0.5" fill={ink} />
  </g>
{/snippet}

{#snippet smallPersonIR(x: number, y: number, hat: boolean = false)}
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
    d="M 0 90 Q 50 84 100 88 Q 160 80 220 86 Q 290 78 360 84 Q 420 80 480 84 L 480 100 L 0 100 Z"
    fill={LMK.sage} opacity="0.4"
  />
  <path
    d="M 0 100 Q 80 96 160 100 Q 240 96 320 100 Q 400 96 480 100 L 480 110 L 0 110 Z"
    fill={LMK.sageDark} opacity="0.4"
  />

  <!-- HERO: the rock -->
  <g>
    <path
      d="M 70 145
         Q 80 130 100 118
         Q 130 102 170 88
         Q 220 76 270 72
         Q 320 76 360 88
         Q 390 100 410 118
         Q 425 130 432 145 Z"
      fill={graniteLight} stroke={ink} stroke-width="0.9"
    />
    <path
      d="M 100 118 Q 130 106 170 94 Q 220 84 270 80 Q 320 84 360 94"
      stroke={LMK.paperWarm} stroke-width="3" fill="none" opacity="0.4"
      stroke-linecap="round"
    />
    <path
      d="M 270 72
         Q 320 76 360 88
         Q 390 100 410 118
         Q 425 130 432 145
         L 270 145 Z"
      fill={graniteMid} opacity="0.4"
    />
    <g opacity="0.55" fill="none" stroke={graniteMid} stroke-width="0.5">
      <path d="M 100 130 Q 200 108 320 112 Q 390 118 420 132" />
      <path d="M 130 138 Q 220 124 320 128 Q 380 134 410 142" />
      <path d="M 90 124 Q 180 100 280 96 Q 360 102 420 124" />
      <path d="M 160 92 Q 240 84 320 90" />
    </g>
    <g opacity="0.45" stroke={graniteDark} fill="none">
      <path d="M 200 90 L 204 102" stroke-width="0.5" />
      <path d="M 240 82 L 245 96" stroke-width="0.5" />
      <path d="M 280 80 L 286 94" stroke-width="0.5" />
      <path d="M 320 88 L 322 100" stroke-width="0.4" />
      <path d="M 160 100 L 164 116" stroke-width="0.4" />
      <path d="M 360 100 L 366 114" stroke-width="0.4" />
    </g>
    <!-- granite speckle -->
    <g opacity="0.4" fill={graniteDark}>
      {#each Array(60) as _, i}
        {@const x = 90 + (i * 47) % 320 + (i % 7) * 3}
        {@const y = 84 + ((i * 31) % 56)}
        {@const r = 0.3 + (i % 3) * 0.15}
        <circle cx={x} cy={y} r={r} />
      {/each}
    </g>
    <!-- carved names -->
    <g opacity="0.6" stroke={graniteDark} stroke-width="0.4" fill="none">
      <path d="M 130 132 q 2 -2 4 0 q 2 -2 4 0 q 2 -2 4 0" />
      <path d="M 152 138 q 2 -1 3 0 q 2 -1 3 0 q 2 -1 3 0" />
      <path d="M 180 130 q 1.5 -2 3 0 q 1.5 -2 3 0 q 1.5 -2 3 0 q 1.5 -2 3 0" />
      <path d="M 208 134 q 2 -1.5 4 0 q 2 -1.5 4 0" />
      <path d="M 234 130 q 1.5 -1.8 3 0 q 1.5 -1.8 3 0 q 1.5 -1.8 3 0" />
      <path d="M 262 128 q 2 -1.5 4 0 q 2 -1.5 4 0 q 2 -1.5 4 0" />
      <path d="M 296 132 q 1.5 -2 3 0 q 1.5 -2 3 0 q 1.5 -2 3 0" />
      <path d="M 326 136 q 2 -1.5 4 0 q 2 -1.5 4 0" />
      <path d="M 356 134 q 2 -1.5 4 0 q 2 -1.5 4 0" />
      <path d="M 200 124 l 2 0 l 0 -3 m 1 0 l 2 0 l 0 3" stroke-width="0.3" />
      <path d="M 270 118 l 2 0 l 0 -3 m 1 3 l 0 -3 l 2 0 l 0 3" stroke-width="0.3" />
    </g>
    <!-- tiny pioneer figures climbing -->
    <g>
      <g transform="translate(244, 80)">
        <circle cx="0" cy="0" r="0.7" fill={LMK.paperWarm} stroke={ink} stroke-width="0.2" />
        <path d="M -0.5 0.5 L 0.5 0.5 L 0.4 2 L -0.4 2 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.2" />
      </g>
      <g transform="translate(218, 96)">
        <circle cx="0" cy="0" r="0.7" fill={LMK.paperWarm} stroke={ink} stroke-width="0.2" />
        <path d="M -0.5 0.5 L 0.5 0.5 L 0.4 2 L -0.4 2 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.2" />
      </g>
      <g transform="translate(296, 100)">
        <circle cx="0" cy="0" r="0.7" fill={LMK.paperWarm} stroke={ink} stroke-width="0.2" />
        <path d="M -0.5 0.5 L 0.5 0.5 L 0.4 2 L -0.4 2 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.2" />
      </g>
      <g transform="translate(180, 116)">
        <circle cx="0" cy="0" r="0.7" fill={LMK.paperWarm} stroke={ink} stroke-width="0.2" />
        <path d="M -0.5 0.5 L 0.5 0.5 L 0.4 2 L -0.4 2 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.2" />
      </g>
      <g transform="translate(340, 110)">
        <circle cx="0" cy="0" r="0.7" fill={LMK.paperWarm} stroke={ink} stroke-width="0.2" />
        <path d="M -0.5 0.5 L 0.5 0.5 L 0.4 2 L -0.4 2 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.2" />
      </g>
    </g>
  </g>

  <!-- Sweetwater River -->
  <g>
    <path
      d="M 0 154 Q 60 152 120 156 Q 200 162 280 158 Q 360 154 420 158 Q 450 160 480 158"
      stroke={LMK.water} stroke-width="3" fill="none" opacity="0.85"
    />
    <path
      d="M 0 154 Q 60 152 120 156 Q 200 162 280 158 Q 360 154 420 158 Q 450 160 480 158"
      stroke="#5a7280" stroke-width="0.5" fill="none" opacity="0.7"
    />
    <path d="M 80 153 q 8 -1 16 0 m 80 7 q 8 -0.5 16 0 m 100 -3 q 8 -1 16 0"
      stroke={LMK.paperWarm} stroke-width="0.4" fill="none" opacity="0.6" />
    <ellipse cx="40" cy="151" rx="6" ry="3" fill={LMK.sageDark} stroke={ink} stroke-width="0.3" />
    <ellipse cx="160" cy="158" rx="5" ry="3" fill={LMK.sageDark} stroke={ink} stroke-width="0.3" />
    <ellipse cx="380" cy="155" rx="5" ry="3" fill={LMK.sageDark} stroke={ink} stroke-width="0.3" />
    <ellipse cx="450" cy="156" rx="5" ry="3" fill={LMK.sageDark} stroke={ink} stroke-width="0.3" />
  </g>

  <!-- Birds -->
  <g opacity="0.5" stroke={ink} stroke-width="0.4" fill="none">
    <path d="M 80 32 q 2 -1.5 4 0 q 2 -1.5 4 0" />
    <path d="M 100 24 q 2 -1.2 3 0 q 2 -1.2 3 0" />
    <path d="M 380 28 q 2 -1.5 4 0 q 2 -1.5 4 0" />
  </g>

  <!-- Foreground sage flat + encampment -->
  <rect x="0" y="160" width={LMK_VIEW_W} height="40" fill={LMK.parchment} opacity="0.55" />
  <g opacity="0.6">
    {#each [16, 56, 104, 156, 220, 280, 340, 400, 446] as x, i}
      {@const y = 174 + (i % 3) * 6}
      <g transform={`translate(${x}, ${y})`}>
        <ellipse cx="0" cy="0" rx="3" ry="1.4" fill={LMK.sage} stroke={ink} stroke-width="0.3" />
        <ellipse cx="-1.2" cy="-0.8" rx="1.6" ry="0.9" fill={LMK.sageLight} stroke={ink} stroke-width="0.25" />
      </g>
    {/each}
  </g>

  <!-- Wagon encampment -->
  <g>
    {@render smallWagonIR(108, 170, 10)}
    {@render smallWagonIR(150, 172, -5)}
    {@render smallWagonIR(196, 174, 0)}
    {@render smallWagonIR(244, 174, 5)}
    {@render smallWagonIR(294, 172, -8)}
    {@render smallWagonIR(342, 170, 12)}

    <!-- central bonfire -->
    <g transform="translate(225, 188)">
      <ellipse cx="0" cy="2" rx="5" ry="1.2" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
      <path d="M -3 2 L -1.5 -2 L 0 -4 L 1.5 -2 L 3 2 Z"
        fill={LMK.rust} stroke={ink} stroke-width="0.3" />
      <path d="M -1.5 -2 L 0 -5 L 1.5 -2" fill={tan} opacity="0.85" />
      <path d="M 0 -5 q -2 -3 1 -7 q 2 -2 0 -6 q -1 -2 1 -5"
        stroke={ink} stroke-width="0.4" fill="none" opacity="0.55" />
    </g>

    <!-- people gathered -->
    {@render smallPersonIR(196, 188, true)}
    {@render smallPersonIR(210, 190)}
    {@render smallPersonIR(244, 190)}
    {@render smallPersonIR(258, 188, true)}

    <!-- fiddler -->
    <g transform="translate(176, 188)">
      <circle cx="0" cy="-3" r="0.9" fill={LMK.paperWarm} stroke={ink} stroke-width="0.2" />
      <path d="M -1.2 -2 L 1.2 -2 L 1 2 L -1 2 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
      <line x1="-0.6" y1="2" x2="-0.6" y2="5" stroke={ink} stroke-width="0.4" />
      <line x1="0.6" y1="2" x2="0.6" y2="5" stroke={ink} stroke-width="0.4" />
      <ellipse cx="2.5" cy="-2" rx="1.6" ry="0.7" fill={tan} stroke={ink} stroke-width="0.25" />
      <line x1="3" y1="-2.5" x2="5" y2="-3.8" stroke={ink} stroke-width="0.3" />
    </g>
  </g>

  <!-- Caption -->
  <text x="240" y="194" text-anchor="middle"
    font-family="IM Fell English, Georgia, serif" font-size="8"
    fill={inkSoft} font-style="italic" opacity="0.85">
    Independence Rock — "the Register of the Desert"
  </text>
</g>
