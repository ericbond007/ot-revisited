<!--
  NorthPlatteWestArt — second crossing (Mormon Ferry / Casper area)

  Deeper, faster — unlike the first crossing. Pioneers used a CAULKED-WAGON
  raft or paid the Mormon Ferry. Cottonwoods, swift current, occasional
  drownings. Composition: a wagon being floated across on a log raft, ferry
  rope above, party waiting on far bank.
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const water = LMK.water;
</script>

{#snippet waitingFordWagon(x: number, y: number, opacity: number)}
  <g transform="translate({x} {y})" {opacity}>
    <rect x="-9" y="-5" width="18" height="3" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
    <path d="M -9 -5 Q 0 -13 9 -5 Z" fill={LMK.white} stroke={ink} stroke-width="0.45" />
    <circle cx="-5" cy="0" r="2.2" fill="none" stroke={ink} stroke-width="0.4" />
    <circle cx="5" cy="0" r="2.2" fill="none" stroke={ink} stroke-width="0.4" />
  </g>
{/snippet}

<g>
  <!-- far ridge -->
  <path d="M 0 70 L 60 60 L 140 50 L 220 56 L 300 48 L 380 56 L 460 50 L 480 54 L 480 96 L 0 96 Z"
        fill="#9aa098" opacity="0.55" stroke={ink} stroke-width="0.4" />
  <path d="M 0 92 Q 120 88 240 92 Q 360 88 480 92 L 480 100 L 0 100 Z"
        fill={LMK.sageDark} opacity="0.55" />

  <!-- far bank cottonwoods + waiting wagon -->
  <g>
    <ellipse cx="60" cy="98" rx="14" ry="9" fill={LMK.sageDark} stroke={ink} stroke-width="0.4" />
    <ellipse cx="100" cy="100" rx="11" ry="7" fill={LMK.sageDark} stroke={ink} stroke-width="0.4" />
    <rect x="58" y="103" width="2" height="7" fill="#4a3220" stroke={ink} stroke-width="0.3" />
    <rect x="100" y="106" width="2" height="6" fill="#4a3220" stroke={ink} stroke-width="0.3" />
    <!-- waiting wagon on far bank -->
    <g transform="translate(160 110)">
      <rect x="-7" y="-4" width="14" height="2.4" fill={LMK.earth} stroke={ink} stroke-width="0.3" />
      <path d="M -7 -4 Q 0 -10 7 -4 Z" fill={LMK.white} stroke={ink} stroke-width="0.4" />
      <circle cx="-4" cy="0" r="1.8" fill="none" stroke={ink} stroke-width="0.3" />
      <circle cx="4" cy="0" r="1.8" fill="none" stroke={ink} stroke-width="0.3" />
    </g>
  </g>

  <!-- DEEP, fast river — wide single channel -->
  <g>
    <path d="M 0 112 Q 240 110 480 114 L 480 162 L 0 160 Z" fill={water} opacity="0.85" />
    <!-- current chevrons -->
    <g stroke="#3a4a54" stroke-width="0.5" fill="none" opacity="0.65">
      <path d="M 30 130 q 4 -2 8 0 q 4 -2 8 0" />
      <path d="M 80 138 q 4 -2 8 0 q 4 -2 8 0" />
      <path d="M 140 144 q 4 -2 8 0 q 4 -2 8 0" />
      <path d="M 220 138 q 4 -2 8 0 q 4 -2 8 0" />
      <path d="M 300 144 q 4 -2 8 0 q 4 -2 8 0" />
      <path d="M 380 134 q 4 -2 8 0 q 4 -2 8 0" />
      <path d="M 60 150 q 4 -2 8 0 q 4 -2 8 0" />
      <path d="M 200 154 q 4 -2 8 0 q 4 -2 8 0" />
      <path d="M 340 152 q 4 -2 8 0 q 4 -2 8 0" />
    </g>
    <!-- white-water highlights -->
    <g stroke={LMK.white} stroke-width="0.5" opacity="0.6">
      <path d="M 20 124 q 6 -1 12 0" fill="none" />
      <path d="M 110 132 q 8 -1 16 0" fill="none" />
      <path d="M 250 130 q 8 -1 16 0" fill="none" />
      <path d="M 380 128 q 6 -1 12 0" fill="none" />
    </g>
  </g>

  <!-- FERRY ROPE stretched across the river -->
  <g>
    <!-- anchor posts -->
    <line x1="20" y1="108" x2="20" y2="120" stroke="#4a3220" stroke-width="1.2" />
    <line x1="460" y1="108" x2="460" y2="120" stroke="#4a3220" stroke-width="1.2" />
    <!-- main rope sagging slightly -->
    <path d="M 20 108 Q 240 116 460 108" stroke={ink} stroke-width="0.7" fill="none" opacity="0.7" />
  </g>

  <!-- RAFT in midstream with caulked wagon on it -->
  <g transform="translate(240 134)">
    <!-- raft logs -->
    <rect x="-22" y="-2" width="44" height="6" fill="#5a3a1a" stroke={ink} stroke-width="0.5" />
    <g stroke="#3a2410" stroke-width="0.4" opacity="0.7">
      <line x1="-22" y1="-0.5" x2="22" y2="-0.5" />
      <line x1="-22" y1="1" x2="22" y2="1" />
      <line x1="-22" y1="2.5" x2="22" y2="2.5" />
    </g>
    <!-- lashings -->
    <line x1="-12" y1="-2.5" x2="-12" y2="4.5" stroke={ink} stroke-width="0.4" />
    <line x1="0" y1="-2.5" x2="0" y2="4.5" stroke={ink} stroke-width="0.4" />
    <line x1="12" y1="-2.5" x2="12" y2="4.5" stroke={ink} stroke-width="0.4" />

    <!-- wagon on raft (wheels off) -->
    <rect x="-12" y="-9" width="24" height="6" fill={LMK.earth} stroke={ink} stroke-width="0.5" />
    <path d="M -12 -9 Q 0 -19 12 -9 Z" fill={LMK.white} stroke={ink} stroke-width="0.5" />

    <!-- line connecting raft to overhead rope -->
    <line x1="0" y1="-9" x2="0" y2="-22" stroke={ink} stroke-width="0.4" />
    <circle cx="0" cy="-22" r="0.8" fill={ink} />

    <!-- poler at front -->
    <g transform="translate(-18 -6)">
      <ellipse cx="0" cy="0" rx="0.8" ry="0.9" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
      <path d="M -1 0.5 L 1 0.5 L 1.2 4 L -1.2 4 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
      <line x1="0" y1="2" x2="-12" y2="-4" stroke={ink} stroke-width="0.4" />
    </g>
  </g>

  <!-- near bank — wagons waiting -->
  <g transform="translate(330 158)">
    {@render waitingFordWagon(0, 0, 1)}
    {@render waitingFordWagon(50, 2, 0.85)}
    {@render waitingFordWagon(96, 4, 0.7)}
  </g>

  <!-- near bank ground -->
  <path d="M 0 160 Q 240 162 480 160 L 480 168 L 0 168 Z" fill={LMK.parchmentSh} opacity="0.7" />
  <rect x="0" y="168" width={LMK_VIEW_W} height={LMK_VIEW_H - 168} fill={LMK.parchment} opacity="0.55" />

  <text x="240" y="194" text-anchor="middle"
        font-family="IM Fell English, Georgia, serif" font-size="8"
        fill={inkSoft} font-style="italic" opacity="0.85">
    North Platte — Mormon Ferry, deep and swift
  </text>
</g>
