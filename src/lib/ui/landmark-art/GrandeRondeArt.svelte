<!--
  GrandeRondeArt.svelte — broad green basin between Blue Mountain ranges

  A circular flat valley ringed by mountains, full of meadows and the Grande
  Ronde river. Pioneers descended into it from the Blues — a stunning
  reveal: lush grass, abundant water, a Cayuse/Nez Perce summer camp ground.
  Composition: panoramic basin from above, river meandering, distant peaks,
  a Native village (tipis), wagons descending the slope.
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const meadow = "#88a05a";
  const meadowDark = "#5a7038";
</script>

{#snippet tipi(x: number, y: number)}
  <g transform="translate({x} {y})">
    <path d="M 0 -10 L -4.5 0 L 4.5 0 Z" fill={LMK.paperWarm} stroke={ink} stroke-width="0.45" />
    <path d="M 0 -10 L -1 -2 L -2.4 0 L -4.5 0 Z" fill={LMK.parchmentSh} opacity="0.65" />
    <!-- poles emerging at top -->
    <line x1="0" y1="-10" x2="-1.2" y2="-12.5" stroke={ink} stroke-width="0.45" />
    <line x1="0" y1="-10" x2="0" y2="-12.5" stroke={ink} stroke-width="0.45" />
    <line x1="0" y1="-10" x2="1.2" y2="-12.5" stroke={ink} stroke-width="0.45" />
    <!-- doorway -->
    <path d="M -0.7 0 L -0.7 -2 L 0.7 -2 L 0.7 0 Z" fill={LMK.earthDark} />
  </g>
{/snippet}

{#snippet smallHorse(x: number, y: number, color: string)}
  <g transform="translate({x} {y})">
    <ellipse cx="0" cy="-2.5" rx="3" ry="1.3" fill={color} stroke={ink} stroke-width="0.35" />
    <ellipse cx="2.4" cy="-3.4" rx="0.9" ry="0.8" fill={color} stroke={ink} stroke-width="0.3" />
    <line x1="-1.6" y1="-1" x2="-1.6" y2="0.6" stroke={ink} stroke-width="0.4" />
    <line x1="-0.4" y1="-1" x2="-0.4" y2="0.6" stroke={ink} stroke-width="0.4" />
    <line x1="0.8" y1="-1" x2="0.8" y2="0.6" stroke={ink} stroke-width="0.4" />
    <line x1="2" y1="-1" x2="2" y2="0.6" stroke={ink} stroke-width="0.4" />
  </g>
{/snippet}

{#snippet descWagon(x: number, y: number, angle: number, opacity: number)}
  <g transform="translate({x} {y}) rotate({angle})" opacity={opacity}>
    <rect x="-7" y="-4" width="14" height="2.6" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
    <path d="M -7 -4 Q 0 -10 7 -4 Z" fill={LMK.white} stroke={ink} stroke-width="0.4" />
    <circle cx="-4" cy="0" r="1.8" fill="none" stroke={ink} stroke-width="0.35" />
    <circle cx="4" cy="0" r="1.8" fill="none" stroke={ink} stroke-width="0.35" />
  </g>
{/snippet}

<g>
  <!-- sky -->
  <rect x="0" y="0" width={LMK_VIEW_W} height="36" fill={LMK.parchment} opacity="0.5" />

  <!-- RING OF MOUNTAINS — surrounding the basin -->
  <path d="M 0 36 L 40 22 L 90 32 L 140 14 L 200 28 L 260 16 L 320 30 L 380 18 L 440 28 L 480 22 L 480 60 L 0 60 Z"
        fill="#7a8a9a" stroke={ink} stroke-width="0.5" opacity="0.85" />
  <path d="M 0 60 Q 60 56 120 60 Q 180 56 240 60 Q 300 56 360 60 Q 420 56 480 60 L 480 70 L 0 70 Z"
        fill="#5a6878" opacity="0.55" />

  <!-- mid pine-clad slopes -->
  <g>
    {#each Array(32) as _, i}
      {@const x = 8 + (i * 15) % 480}
      {@const y = 64 + (i % 3) * 4}
      <path d={`M ${x} ${y + 6} L ${x - 2.5} ${y - 2} L ${x + 2.5} ${y - 2} Z M ${x} ${y + 4} L ${x - 2} ${y - 1} L ${x + 2} ${y - 1} Z`}
            fill={meadowDark} stroke={ink} stroke-width="0.25" opacity="0.85" />
    {/each}
  </g>

  <!-- THE BASIN FLOOR — broad, lush -->
  <g>
    <path d="M 0 84 Q 240 78 480 84 L 480 200 L 0 200 Z" fill={meadow} opacity="0.55" />
    <!-- deeper green pockets -->
    <ellipse cx="120" cy="130" rx="80" ry="20" fill={meadowDark} opacity="0.3" />
    <ellipse cx="360" cy="140" rx="100" ry="22" fill={meadowDark} opacity="0.3" />
  </g>

  <!-- GRANDE RONDE RIVER — meandering through the basin -->
  <g>
    <path d="M 0 124 Q 80 116 160 130 Q 240 142 320 128 Q 400 118 480 132"
          stroke={LMK.water} stroke-width="5" fill="none" opacity="0.75" stroke-linecap="round" />
    <path d="M 0 124 Q 80 116 160 130 Q 240 142 320 128 Q 400 118 480 132"
          stroke="#5a7280" stroke-width="0.5" fill="none" opacity="0.7" />
    <g stroke={LMK.white} stroke-width="0.4" opacity="0.55">
      <path d="M 60 122 q 6 -1 12 0" fill="none" />
      <path d="M 200 134 q 6 -1 12 0" fill="none" />
      <path d="M 360 124 q 6 -1 12 0" fill="none" />
    </g>
  </g>

  <!-- NATIVE VILLAGE — tipis on the meadow -->
  <g>
    {@render tipi(80, 154)}
    {@render tipi(106, 158)}
    {@render tipi(134, 154)}
    {@render tipi(160, 158)}
    {@render tipi(184, 154)}
    <!-- horse herd -->
    <g>
      {@render smallHorse(216, 164, "#5a3a20")}
      {@render smallHorse(228, 162, "#3a2818")}
      {@render smallHorse(240, 166, "#7a4a26")}
      {@render smallHorse(252, 162, "#a07a4a")}
    </g>
    <!-- small fire smokes -->
    <g opacity="0.55">
      <path d="M 92 152 q -2 -4 0 -7 q 2 -4 0 -7" stroke={inkSoft} stroke-width="0.45" fill="none" />
      <path d="M 146 152 q -2 -4 0 -7 q 2 -4 0 -7" stroke={inkSoft} stroke-width="0.45" fill="none" />
    </g>
  </g>

  <!-- WAGONS descending into the basin from the right slope -->
  <g>
    {@render descWagon(400, 92, 20, 1)}
    {@render descWagon(380, 104, 18, 0.95)}
    {@render descWagon(356, 118, 14, 0.9)}
    {@render descWagon(332, 132, 8, 0.85)}
  </g>

  <!-- foreground meadow fringe -->
  <rect x="0" y="178" width={LMK_VIEW_W} height={LMK_VIEW_H - 178} fill={meadow} opacity="0.4" />
  <g stroke={meadowDark} stroke-width="0.35" fill="none" opacity="0.6">
    {#each Array(28) as _, i}
      {@const x = 6 + (i * 17) % 480}
      {@const y = 184 + ((i * 5) % 14)}
      <path d={`M ${x} ${y} q 0.5 -2 1 -3.5 m -0.5 3.5 q 1 -2 1.6 -3`} />
    {/each}
  </g>

  <text x="240" y="194" text-anchor="middle"
        font-family="IM Fell English, Georgia, serif" font-size="8"
        fill={inkSoft} font-style="italic" opacity="0.85">
    Grande Ronde — &ldquo;a green saucer in the mountains&rdquo;
  </text>
</g>
