<!--
  FarewellBendArt.svelte — the last view of the Snake River

  After 330 miles along the Snake, the trail TURNED NORTHWEST and the river
  peeled south into Hells Canyon. Pioneers said goodbye to their water source
  from a high overlook. Ahead: dry Burnt River canyon. Composition: the
  viewer stands on a high bend, the river curving away below, a small group
  pausing to look back, distant Blue Mountains ahead.
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
</script>

<g>
  <!-- sky -->
  <rect x="0" y="0" width={LMK_VIEW_W} height="60" fill={LMK.parchment} opacity="0.45" />
  <!-- DISTANT BLUE MOUNTAINS — what's ahead -->
  <path d="M 200 60 L 260 38 L 320 54 L 380 30 L 440 50 L 480 40 L 480 80 L 200 80 Z"
        fill="#7a8aa0" stroke={ink} stroke-width="0.5" opacity="0.85" />
  <path d="M 200 80 Q 280 76 360 80 Q 420 76 480 80 L 480 88 L 200 88 Z" fill="#5a6a80" opacity="0.55" />

  <!-- near-side bluffs/cliffs (we're standing on one) -->
  <g>
    <path d="M 0 88 L 60 70 L 130 80 L 200 60 L 200 200 L 0 200 Z"
          fill="#a09078" stroke={ink} stroke-width="0.6" />
    <path d="M 0 88 L 60 70 L 130 80 L 200 60 L 184 70 L 130 90 L 60 86 L 0 100 Z"
          fill="#7a6a52" opacity="0.55" />
    <!-- strata -->
    <g stroke="#7a6a52" stroke-width="0.4" fill="none" opacity="0.5">
      <path d="M 0 116 Q 80 112 160 116" />
      <path d="M 0 140 Q 80 136 160 140" />
    </g>
  </g>

  <!-- SNAKE RIVER curving away — receding with perspective -->
  <g>
    <!-- river bend -->
    <path d="M 200 110 Q 260 120 280 140 Q 290 160 320 178 Q 360 195 400 200 L 480 200 L 480 100 L 240 100 Z"
          fill={LMK.water} opacity="0.6" />
    <!-- river inner shape (the actual water curve) -->
    <path d="M 220 108 Q 240 122 248 140 Q 254 162 280 178 Q 320 192 380 196"
          stroke="#3a5460" stroke-width="6" fill="none" opacity="0.85" stroke-linecap="round" />
    <path d="M 220 108 Q 240 122 248 140 Q 254 162 280 178 Q 320 192 380 196"
          stroke="#5a7280" stroke-width="0.6" fill="none" />
    <!-- shimmer -->
    <g stroke={LMK.white} stroke-width="0.4" opacity="0.55">
      <path d="M 230 116 q 4 4 6 12" fill="none" />
      <path d="M 260 156 q 4 4 8 12" fill="none" />
      <path d="M 320 184 q 6 1 14 2" fill="none" />
    </g>
    <!-- far bank — sage shore -->
    <path d="M 220 108 Q 280 100 360 102 Q 420 98 480 100 L 480 116 Q 420 110 360 112 Q 280 114 240 118 Z"
          fill={LMK.sage} opacity="0.55" />
  </g>

  <!-- GROUP looking back — silhouettes on the bluff edge -->
  <g transform="translate(70 85)">
    <!-- figure 1 — man with hat, back to viewer -->
    <g>
      <ellipse cx="0" cy="-6" rx="0.9" ry="1" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
      <path d="M -1.4 -7 L 1.4 -7 L 1.6 -5.5 L -1.6 -5.5 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
      <path d="M -1.2 -5 L 1.2 -5 L 1.6 1 L -1.6 1 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
    </g>
    <!-- figure 2 — woman, bonnet -->
    <g transform="translate(7 1)">
      <ellipse cx="0" cy="-6" rx="0.9" ry="1" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
      <path d="M -1.4 -7.5 Q 0 -8.4 1.4 -7.5 L 1.4 -5.5 L -1.4 -5.5 Z" fill={LMK.white} stroke={ink} stroke-width="0.3" />
      <path d="M -1.2 -5 L 1.2 -5 L 1.4 1 L -1.4 1 Z" fill={LMK.rust} stroke={ink} stroke-width="0.3" />
    </g>
    <!-- figure 3 — child clinging -->
    <g transform="translate(13 1)">
      <ellipse cx="0" cy="-4" rx="0.7" ry="0.8" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
      <path d="M -1 -3.5 L 1 -3.5 L 1.2 0 L -1.2 0 Z" fill="#3a5a78" stroke={ink} stroke-width="0.25" />
    </g>
  </g>

  <!-- a wagon and team paused on the trail behind them -->
  <g transform="translate(124 94)">
    <rect x="-9" y="-5" width="18" height="3" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
    <path d="M -9 -5 Q 0 -13 9 -5 Z" fill={LMK.white} stroke={ink} stroke-width="0.45" />
    <circle cx="-5" cy="0" r="2.2" fill="none" stroke={ink} stroke-width="0.4" />
    <circle cx="5" cy="0" r="2.2" fill="none" stroke={ink} stroke-width="0.4" />
    <!-- oxen -->
    <g transform="translate(-16 -1)">
      <ellipse cx="0" cy="0" rx="2.6" ry="1.3" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
      <ellipse cx="2.4" cy="-0.5" rx="1.1" ry="1" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
    </g>
  </g>

  <!-- trail ruts continuing right (NW into Burnt River country) -->
  <path d="M 0 168 Q 80 162 160 158 Q 200 156 200 152" stroke={LMK.earth} stroke-width="2.4" fill="none" opacity="0.55" stroke-linecap="round" />
  <path d="M 0 168 Q 80 162 160 158" stroke={LMK.earthDark} stroke-width="0.5" fill="none" opacity="0.6" stroke-dasharray="2 3" />

  <!-- sage on bluff foreground -->
  <g opacity="0.55">
    {#each [20, 70, 120, 170] as x, i}
      <ellipse cx={x} cy={184 + (i % 2) * 4} rx="3.5" ry="1.5" fill={LMK.sage} stroke={ink} stroke-width="0.3" />
    {/each}
  </g>

  <text x="240" y="194" text-anchor="middle"
        font-family="IM Fell English, Georgia, serif" font-size="8"
        fill={inkSoft} font-style="italic" opacity="0.85">
    Farewell Bend — &ldquo;our last sight of the Snake&rdquo;
  </text>
</g>
