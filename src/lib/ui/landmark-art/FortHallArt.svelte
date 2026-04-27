<!--
  FortHallArt.svelte — mile ~1290, the Hudson's Bay Company adobe post on the Snake.

  Originally Nathaniel Wyeth's wood stockade (1834), sold to HBC, rebuilt
  in adobe by 1837. Square walls with bastions at opposing corners. The
  British Union flag flew until 1846 — symbolic of contested Oregon
  Country. Set on the broad Snake River bottoms with cottonwoods.
  Shoshone and Bannock lodges typically nearby. Trade with emigrants; HBC
  chief factors sometimes urged Oregon-bound parties to redirect to
  California (the politicized turning-back story).

  Distinguishing visual marks:
    • SQUARE adobe walls (low, thick, tan) — NOT log like Bridger
    • Two bastions at opposing corners (square towers)
    • UNION JACK / HBC flag on a tall pole — period accurate, distinctive
    • Tipi cluster outside walls (Shoshone/Bannock camp)
    • Snake River bottoms — cottonwoods, broad flat plain
    • Distinctive: this is an EARLY trail fort (most reach it around mile
      1290, well past the divide). Tone: end-of-strength resupply.
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const adobeLight = "#c8a878";
  const adobeMid = "#9a7848";
  const adobeDark = "#5e4222";
  const cottonGreen = "#5a6a3a";
  const wood = '#8a6a3a';
</script>

{#snippet smallWagonFH(x: number, y: number)}
  <g transform="translate({x}, {y})">
    <rect x="0" y="0" width="14" height="5" fill={LMK.earth} stroke={ink} stroke-width="0.35" />
    <path d="M 0 0 Q 7 -8 14 0 Z" fill={LMK.white} stroke={ink} stroke-width="0.45" />
    <circle cx="3" cy="6" r="1.8" fill="none" stroke={ink} stroke-width="0.35" />
    <circle cx="11" cy="6" r="1.8" fill="none" stroke={ink} stroke-width="0.35" />
  </g>
{/snippet}

{#snippet smallPersonFH(x: number, y: number, hat: boolean = false)}
  <g transform="translate({x}, {y})">
    <circle cx="0" cy="-3" r="0.9" fill={LMK.paperWarm} stroke={ink} stroke-width="0.2" />
    {#if hat}<ellipse cx="0" cy="-4" rx="1.5" ry="0.3" fill={ink} />{/if}
    <path d="M -1.2 -2 L 1.2 -2 L 1 2 L -1 2 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
    <line x1="-0.6" y1="2" x2="-0.6" y2="5" stroke={ink} stroke-width="0.4" />
    <line x1="0.6" y1="2" x2="0.6" y2="5" stroke={ink} stroke-width="0.4" />
  </g>
{/snippet}

<g>
  <!-- Far horizon — low Snake River plain, hint of distant ridges -->
  <path
    d="M 0 86 Q 80 82 160 86 Q 240 82 320 86 Q 400 82 480 86 L 480 96 L 0 96 Z"
    fill={LMK.sage} opacity="0.42"
  />
  <path
    d="M 0 96 Q 80 92 160 96 Q 240 92 320 96 Q 400 92 480 96 L 480 104 L 0 104 Z"
    fill={LMK.sageDark} opacity="0.42"
  />

  <!-- Cottonwoods scattered in middle distance -->
  {#each [{ x: 36, y: 108, r: 7 }, { x: 70, y: 110, r: 6 }, { x: 380, y: 110, r: 8 }, { x: 422, y: 108, r: 6 }, { x: 452, y: 112, r: 7 }] as t}
    <g transform="translate({t.x}, {t.y})">
      <ellipse cx="0" cy="0" rx={t.r} ry={t.r * 0.7} fill={cottonGreen} stroke={ink} stroke-width="0.3" />
      <ellipse cx="-1" cy="-1.5" rx={t.r * 0.6} ry={t.r * 0.5} fill={LMK.sage} stroke={ink} stroke-width="0.25" />
      <line x1="0" y1={t.r * 0.7} x2="0" y2={t.r * 0.7 + 4} stroke={ink} stroke-width="0.5" />
    </g>
  {/each}

  <!-- HERO: the adobe fort -->
  <!-- Centered. Compact square. Two bastions at NE & SW corners. -->
  <g>
    <!-- shadow on ground -->
    <ellipse cx="240" cy="158" rx="105" ry="8" fill={ink} opacity="0.18" />

    <!-- Far (back) wall — partly visible behind near wall -->
    <rect x="170" y="100" width="140" height="22" fill={adobeMid} stroke={ink} stroke-width="0.6" />
    <!-- parapet on back wall -->
    <g fill={adobeMid} stroke={ink} stroke-width="0.4">
      {#each Array(14) as _, i}
        <rect x={172 + i * 10} y="96" width="6" height="4" />
      {/each}
    </g>

    <!-- NE Bastion (back-right, square tower w/ pyramid roof) -->
    <g>
      <rect x="296" y="82" width="22" height="40" fill={adobeLight} stroke={ink} stroke-width="0.7" />
      <!-- shadow side -->
      <rect x="312" y="82" width="6" height="40" fill={adobeMid} opacity="0.5" />
      <!-- loopholes -->
      <rect x="299" y="92" width="2" height="3" fill={ink} />
      <rect x="305" y="92" width="2" height="3" fill={ink} />
      <rect x="311" y="92" width="2" height="3" fill={ink} />
      <!-- gun port lower row -->
      <rect x="299" y="106" width="2" height="3" fill={ink} />
      <rect x="305" y="106" width="2" height="3" fill={ink} />
      <rect x="311" y="106" width="2" height="3" fill={ink} />
      <!-- hipped/pyramid roof — wood plank -->
      <path d="M 294 82 L 307 70 L 320 82 Z" fill={wood} stroke={ink} stroke-width="0.6" />
      <path d="M 307 70 L 314 76 L 320 82" stroke={ink} stroke-width="0.4" fill="none" opacity="0.5" />
    </g>

    <!-- Near (front) adobe wall — taller because closer -->
    <rect x="160" y="120" width="160" height="30" fill={adobeLight} stroke={ink} stroke-width="0.7" />
    <!-- shadow at base of wall -->
    <rect x="160" y="146" width="160" height="4" fill={adobeDark} opacity="0.45" />
    <!-- parapet on front wall -->
    <g fill={adobeLight} stroke={ink} stroke-width="0.4">
      {#each Array(16) as _, i}
        <rect x={162 + i * 10} y="116" width="6" height="4" />
      {/each}
    </g>
    <!-- adobe block tonal divisions — horizontal courses -->
    <g opacity="0.45" stroke={adobeMid} stroke-width="0.3">
      <line x1="160" y1="128" x2="320" y2="128" />
      <line x1="160" y1="135" x2="320" y2="135" />
      <line x1="160" y1="142" x2="320" y2="142" />
      <!-- vertical mortar joints in courses -->
      {#each Array(12) as _, i}
        <line x1={172 + i * 12} y1="120" x2={172 + i * 12} y2="146" stroke-dasharray="1 5" />
      {/each}
    </g>

    <!-- The MAIN GATE — heavy double timber doors -->
    <rect x="232" y="128" width="16" height="22" fill={wood} stroke={ink} stroke-width="0.7" />
    <!-- plank lines -->
    <line x1="240" y1="128" x2="240" y2="150" stroke={ink} stroke-width="0.35" />
    <line x1="236" y1="128" x2="236" y2="150" stroke={ink} stroke-width="0.25" opacity="0.6" />
    <line x1="244" y1="128" x2="244" y2="150" stroke={ink} stroke-width="0.25" opacity="0.6" />
    <!-- iron straps -->
    <rect x="232" y="134" width="16" height="1" fill={ink} opacity="0.7" />
    <rect x="232" y="142" width="16" height="1" fill={ink} opacity="0.7" />
    <!-- arch above gate -->
    <path d="M 232 128 Q 240 124 248 128" stroke={ink} stroke-width="0.5" fill={adobeMid} opacity="0.85" />

    <!-- SW Bastion (front-left) -->
    <g>
      <rect x="142" y="120" width="22" height="34" fill={adobeLight} stroke={ink} stroke-width="0.7" />
      <!-- shadow side -->
      <rect x="158" y="120" width="6" height="34" fill={adobeMid} opacity="0.5" />
      <rect x="145" y="130" width="2" height="3" fill={ink} />
      <rect x="151" y="130" width="2" height="3" fill={ink} />
      <rect x="157" y="130" width="2" height="3" fill={ink} />
      <rect x="145" y="142" width="2" height="3" fill={ink} />
      <rect x="151" y="142" width="2" height="3" fill={ink} />
      <rect x="157" y="142" width="2" height="3" fill={ink} />
      <!-- hipped roof -->
      <path d="M 140 120 L 153 108 L 166 120 Z" fill={wood} stroke={ink} stroke-width="0.6" />
      <path d="M 153 108 L 160 114 L 166 120" stroke={ink} stroke-width="0.4" fill="none" opacity="0.5" />
    </g>

    <!-- FLAGPOLE inside the fort — UNION JACK -->
    <g>
      <line x1="280" y1="120" x2="280" y2="68" stroke={ink} stroke-width="0.7" />
      <!-- British Union Flag — distinctive -->
      <g transform="translate(280, 70)">
        <rect x="0" y="0" width="18" height="11" fill="#1a3a72" stroke={ink} stroke-width="0.3" />
        <!-- white diagonals (St Andrew's saltire) -->
        <line x1="0" y1="0" x2="18" y2="11" stroke={LMK.paperWarm} stroke-width="2" />
        <line x1="18" y1="0" x2="0" y2="11" stroke={LMK.paperWarm} stroke-width="2" />
        <!-- red diagonals (St Patrick's saltire), narrower -->
        <line x1="0" y1="0" x2="18" y2="11" stroke="#aa1a22" stroke-width="0.9" />
        <line x1="18" y1="0" x2="0" y2="11" stroke="#aa1a22" stroke-width="0.9" />
        <!-- white cross of St George -->
        <rect x="7.5" y="0" width="3" height="11" fill={LMK.paperWarm} />
        <rect x="0" y="4" width="18" height="3" fill={LMK.paperWarm} />
        <!-- red cross of St George (narrower) -->
        <rect x="8.3" y="0" width="1.4" height="11" fill="#aa1a22" />
        <rect x="0" y="4.8" width="18" height="1.4" fill="#aa1a22" />
        <!-- outline -->
        <rect x="0" y="0" width="18" height="11" fill="none" stroke={ink} stroke-width="0.4" />
      </g>
      <!-- finial -->
      <circle cx="280" cy="67" r="0.9" fill={ink} />
    </g>

    <!-- Smoke rising from inside -->
    <g opacity="0.45" stroke={ink} stroke-width="0.4" fill="none">
      <path d="M 200 116 q -2 -10 1 -16 q 2 -6 -1 -12" />
      <path d="M 260 116 q 2 -8 -1 -14 q -2 -6 1 -10" />
    </g>
  </g>

  <!-- Tipi cluster outside walls (Shoshone/Bannock camp) -->
  <g>
    {#each [{ x: 100, y: 154, h: 16 }, { x: 116, y: 156, h: 18 }, { x: 86, y: 158, h: 14 }, { x: 358, y: 156, h: 17 }, { x: 374, y: 158, h: 15 }, { x: 392, y: 154, h: 19 }] as t}
      <g transform="translate({t.x}, {t.y})">
        <path d="M -{t.h * 0.4} 0 L 0 -{t.h} L {t.h * 0.4} 0 Z"
          fill={LMK.parchment} stroke={ink} stroke-width="0.5" opacity="0.95" />
        <line x1={-t.h * 0.3} y1="-1" x2={-t.h * 0.05} y2={-t.h * 0.95} stroke={inkSoft} stroke-width="0.25" />
        <line x1={t.h * 0.3} y1="-1" x2={t.h * 0.05} y2={-t.h * 0.95} stroke={inkSoft} stroke-width="0.25" />
        <!-- poles emerging at top -->
        <line x1="-0.8" y1={-t.h} x2="-1.6" y2={-t.h - 2.5} stroke={ink} stroke-width="0.3" />
        <line x1="0" y1={-t.h} x2="0" y2={-t.h - 2.8} stroke={ink} stroke-width="0.3" />
        <line x1="0.8" y1={-t.h} x2="1.6" y2={-t.h - 2.5} stroke={ink} stroke-width="0.3" />
        <!-- smoke flap shadow -->
        <path d="M -{t.h * 0.15} -{t.h * 0.85} L 0 -{t.h * 0.95} L {t.h * 0.15} -{t.h * 0.85} Z" fill={ink} opacity="0.18" />
      </g>
    {/each}
  </g>

  <!-- Foreground — Snake River bottoms -->
  <rect x="0" y="158" width={LMK_VIEW_W} height="42" fill={LMK.parchment} opacity="0.55" />
  <path d="M 0 174 Q 100 172 200 176 Q 300 174 400 176 Q 450 175 480 176"
    stroke={LMK.earth} stroke-width="1" fill="none" opacity="0.4" />
  <g opacity="0.6">
    {#each [16, 60, 120, 200, 280, 360, 432, 460] as x, i}
      {@const y = 180 + (i % 3) * 6}
      <g transform="translate({x}, {y})">
        <ellipse cx="0" cy="0" rx="2.6" ry="1.2" fill={LMK.sage} stroke={ink} stroke-width="0.25" />
        <ellipse cx="-1" cy="-0.7" rx="1.4" ry="0.7" fill={LMK.sageLight} stroke={ink} stroke-width="0.2" />
      </g>
    {/each}
  </g>

  <!-- Trade activity at gate — a few wagons, figures, a horseman -->
  <g>
    {@render smallWagonFH(170, 170)}
    {@render smallWagonFH(208, 172)}
    {@render smallWagonFH(290, 172)}
    <!-- Horseman approaching gate -->
    <g transform="translate(244, 170)">
      <ellipse cx="0" cy="2" rx="3.2" ry="1.4" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
      <ellipse cx="2.6" cy="0.8" rx="1.1" ry="0.9" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
      <line x1="-2" y1="3" x2="-2" y2="5.5" stroke={ink} stroke-width="0.4" />
      <line x1="2" y1="3" x2="2" y2="5.5" stroke={ink} stroke-width="0.4" />
      <ellipse cx="0" cy="-2" rx="0.8" ry="0.9" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
      <ellipse cx="0" cy="-3" rx="1.3" ry="0.3" fill={ink} />
      <path d="M -0.9 -1.3 L 0.9 -1.3 L 0.7 1.8 L -0.7 1.8 Z" fill={LMK.earth} stroke={ink} stroke-width="0.25" />
    </g>
    {@render smallPersonFH(144, 188)}
    {@render smallPersonFH(156, 186, true)}
    {@render smallPersonFH(326, 188, true)}
  </g>

  <!-- Caption -->
  <text x="240" y="194" text-anchor="middle"
    font-family="IM Fell English, Georgia, serif" font-size="8"
    fill={inkSoft} font-style="italic" opacity="0.85">
    Fort Hall — HBC adobe on the Snake
  </text>
</g>
