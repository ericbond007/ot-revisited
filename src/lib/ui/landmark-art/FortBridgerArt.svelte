<!--
  FortBridgerArt.svelte — Fort Bridger (Jim Bridger's post, 1843+ era).

  Distinguishing visual facts (research):
    • SMALL and CRUDE — described as "two or three miserable cabins"
    • two squarish log cabins arranged at right angles forming an L
    • dirt/sod roofs with grass growing on top
    • surrounded by an 8-foot pole stockade enclosure (not high adobe walls)
    • a separate corral with a few horses inside
    • native (Shoshone/Ute) lodges/tipis pitched nearby — Bridger married into
      these tribes and they camped at the post
    • smithy/forge as part of one cabin (smoke + anvil work)
    • Black's Fork creek meandering past
    • Uinta Mountains FAR — snowcapped peaks behind
    • sage flats foreground; mountain air feel — cooler tones

  Composition (480×200):
    • far horizon: Uinta Mountains with snow caps (~ y=50–80)
    • mid-far: dark pine/aspen treeline at the foothills
    • mid: the post — L-shaped log cabins center-left, stockade fence, corral
    • mid-right: cluster of 2–3 tipis (native camp)
    • foreground: sage brush, Black's Fork creek
    • cooler palette than the others — high-mountain valley feel
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';

  const ink = LMK.ink;
  const log = "#8a5a30";
  const logSh = "#5a3818";
  const logHi = "#a87a48";
  const sodRoof = "#7a6638";
  const sodRoofSh = "#4a3818";
  const sodGrass = "#7a8458";
  const stockade = "#6a4828";
  const tipi = "#dcc89a";
  const tipiSh = "#a89870";
  const wood = '#8a6a3a';

  const horizonY = 70;
  const treelineY = 102;
  const groundY = 138;
</script>

{#snippet tipiFn(cx: number, cy: number, h: number, smoke: boolean = false)}
  {@const w = h * 0.7}
  <g>
    <!-- cone -->
    <path
      d="M {cx - w / 2} {cy} L {cx} {cy - h} L {cx + w / 2} {cy} Z"
      fill={tipi} stroke={ink} stroke-width="0.55"
    />
    <!-- shadow side -->
    <path
      d="M {cx - w / 2} {cy} L {cx} {cy - h} L {cx} {cy} Z"
      fill={tipiSh} opacity="0.55"
    />
    <!-- poles protruding above -->
    <g stroke={ink} stroke-width="0.5">
      <line x1={cx - 1.5} y1={cy - h + 1} x2={cx - 3} y2={cy - h - 4} />
      <line x1={cx} y1={cy - h + 0.5} x2={cx + 0.5} y2={cy - h - 5} />
      <line x1={cx + 1.5} y1={cy - h + 1} x2={cx + 3.5} y2={cy - h - 4} />
      <line x1={cx - 0.5} y1={cy - h + 1} x2={cx - 1} y2={cy - h - 4.5} />
    </g>
    <!-- door flap -->
    <path d="M {cx - 2} {cy} L {cx - 1.5} {cy - 5} L {cx + 1.5} {cy - 5} L {cx + 2} {cy} Z"
          fill={LMK.earthDark} stroke={ink} stroke-width="0.35" />
    <!-- simple painted band -->
    <path d="M {cx - w / 2 + 1.5} {cy - 2} L {cx + w / 2 - 1.5} {cy - 2}"
          stroke={LMK.rust} stroke-width="0.5" opacity="0.6" />
    {#if smoke}
      <path d="M {cx + 1} {cy - h - 4} q -1.5 -3 0.5 -6 q 2 -2 0 -5"
            stroke={ink} stroke-width="0.4" fill="none" opacity="0.55" />
    {/if}
  </g>
{/snippet}

{#snippet horseFn(x: number, y: number, color: string = "#5a3a20")}
  <g transform="translate({x} {y})">
    <!-- body -->
    <path d="M -7 -8 L -7 -10 L -5 -11 L 5 -11 L 7 -10 L 7 -8 L 5 -7 L -5 -7 Z"
          fill={color} stroke={ink} stroke-width="0.4" />
    <!-- neck + head -->
    <path d="M 5 -11 L 8 -14 L 10 -14 L 11 -12 L 9 -10 L 6 -9 Z"
          fill={color} stroke={ink} stroke-width="0.4" />
    <!-- mane -->
    <path d="M 5 -11 q 1 -2 3 -3" stroke={ink} stroke-width="0.5" fill="none" />
    <!-- legs -->
    <line x1="-5" y1="-7" x2="-5" y2="0" stroke={ink} stroke-width="0.7" />
    <line x1="-2" y1="-7" x2="-2" y2="0" stroke={ink} stroke-width="0.7" />
    <line x1="2"  y1="-7" x2="2"  y2="0" stroke={ink} stroke-width="0.7" />
    <line x1="5"  y1="-7" x2="5"  y2="0" stroke={ink} stroke-width="0.7" />
    <!-- tail -->
    <path d="M -7 -9 q -2 1 -2 4" stroke={ink} stroke-width="0.7" fill="none" />
  </g>
{/snippet}

{#snippet sageBrush(x: number, y: number)}
  <g transform="translate({x} {y})">
    <ellipse cx="0" cy="0" rx="6" ry="2.5" fill="#7a8458" opacity="0.7" />
    <ellipse cx="-2" cy="-1" rx="3" ry="1.8" fill="#9aa078" opacity="0.6" />
    <ellipse cx="2" cy="-0.5" rx="2.5" ry="1.5" fill="#9aa078" opacity="0.55" />
    <ellipse cx="0" cy="2" rx="6" ry="0.6" fill={ink} opacity="0.18" />
  </g>
{/snippet}

{#snippet parkedWagon()}
  <g>
    <path d="M -14 -8 C -16 -19, 16 -19, 14 -8 Z"
          fill="#d8c8a0" stroke={ink} stroke-width="0.5" />
    <!-- canvas patches -->
    <path d="M -4 -16 q 4 -1 6 1 l -1 3 l -5 -1 z" fill="#b89868" opacity="0.7" stroke={ink} stroke-width="0.3" />
    <rect x="-14" y="-8" width="28" height="5" fill={LMK.earthDark} stroke={ink} stroke-width="0.45" />
    <circle cx="-9" cy="-1" r="3.5" fill="none" stroke={ink} stroke-width="0.6" />
    <circle cx="9" cy="-1" r="3.5" fill="none" stroke={ink} stroke-width="0.6" />
    <circle cx="-9" cy="-1" r="0.6" fill={ink} />
    <circle cx="9" cy="-1" r="0.6" fill={ink} />
    <ellipse cx="0" cy="3.6" rx="14" ry="1" fill={ink} opacity="0.2" />
  </g>
{/snippet}

<g>
  <!-- Uinta Mountains — high jagged peaks with snow -->
  <g>
    <!-- far range — pale -->
    <path
      d="M 0 {horizonY + 6}
         L 25 {horizonY - 2} L 50 {horizonY - 14} L 75 {horizonY - 6}
         L 105 {horizonY - 18} L 135 {horizonY - 10} L 170 {horizonY - 22}
         L 205 {horizonY - 14} L 240 {horizonY - 26} L 280 {horizonY - 16}
         L 320 {horizonY - 24} L 360 {horizonY - 12} L 400 {horizonY - 20}
         L 440 {horizonY - 8} L {LMK_VIEW_W} {horizonY - 14}
         L {LMK_VIEW_W} {horizonY + 8} L 0 {horizonY + 8} Z"
      fill="#8a96a8" opacity="0.85"
    />
    <!-- snow caps -->
    <g fill={LMK.white} opacity="0.85" stroke={ink} stroke-width="0.25">
      <path d="M 45 {horizonY - 11} L 50 {horizonY - 14} L 55 {horizonY - 11} L 53 {horizonY - 8} L 47 {horizonY - 8} Z" />
      <path d="M 100 {horizonY - 15} L 105 {horizonY - 18} L 111 {horizonY - 14} L 108 {horizonY - 11} L 102 {horizonY - 12} Z" />
      <path d="M 164 {horizonY - 18} L 170 {horizonY - 22} L 178 {horizonY - 17} L 174 {horizonY - 13} L 167 {horizonY - 14} Z" />
      <path d="M 234 {horizonY - 22} L 240 {horizonY - 26} L 248 {horizonY - 21} L 244 {horizonY - 17} L 237 {horizonY - 18} Z" />
      <path d="M 314 {horizonY - 20} L 320 {horizonY - 24} L 327 {horizonY - 19} L 323 {horizonY - 15} L 317 {horizonY - 16} Z" />
      <path d="M 394 {horizonY - 17} L 400 {horizonY - 20} L 407 {horizonY - 16} L 403 {horizonY - 12} L 397 {horizonY - 13} Z" />
    </g>
    <!-- shadow side of peaks -->
    <g fill="#5a6a7a" opacity="0.5">
      <path d="M 50 {horizonY - 14} L 55 {horizonY - 11} L 50 {horizonY + 6} Z" />
      <path d="M 105 {horizonY - 18} L 111 {horizonY - 14} L 105 {horizonY + 6} Z" />
      <path d="M 170 {horizonY - 22} L 178 {horizonY - 17} L 170 {horizonY + 6} Z" />
      <path d="M 240 {horizonY - 26} L 248 {horizonY - 21} L 240 {horizonY + 6} Z" />
      <path d="M 320 {horizonY - 24} L 327 {horizonY - 19} L 320 {horizonY + 6} Z" />
      <path d="M 400 {horizonY - 20} L 407 {horizonY - 16} L 400 {horizonY + 6} Z" />
    </g>
  </g>

  <!-- pine/aspen foothill band -->
  <g>
    <rect x="0" y={horizonY + 6} width={LMK_VIEW_W} height={treelineY - horizonY - 6}
          fill="#9aa088" opacity="0.55" />
    <!-- treeline silhouette -->
    <g>
      {#each Array(32) as _, i}
        {@const tx = i * 15 + (i % 2 === 0 ? 0 : 4)}
        {@const th = 6 + (i % 4) * 1.5}
        <path d="M {tx} {treelineY} L {tx + 1.5} {treelineY - th} L {tx + 3} {treelineY} Z"
              fill="#3a4a3a" opacity="0.75" />
      {/each}
    </g>
    <line x1="0" y1={treelineY} x2={LMK_VIEW_W} y2={treelineY}
          stroke={ink} stroke-width="0.4" opacity="0.5" />
  </g>

  <!-- sage flat / valley floor -->
  <rect x="0" y={treelineY} width={LMK_VIEW_W} height={groundY - treelineY}
        fill="#b0a878" opacity="0.55" />

  <!-- Black's Fork creek — meanders across mid-ground -->
  <g>
    <path
      d="M 0 156
         C 60 158, 110 152, 160 154
         C 200 156, 240 150, 290 152
         C 340 154, 400 148, {LMK_VIEW_W} 150
         L {LMK_VIEW_W} 154
         C 400 152, 340 158, 290 156
         C 240 154, 200 160, 160 158
         C 110 156, 60 162, 0 160 Z"
      fill={LMK.water} opacity="0.65"
    />
    <!-- shimmer -->
    <path d="M 30 158 L 70 156 M 200 156 L 240 154 M 340 152 L 380 150"
          stroke={LMK.white} stroke-width="0.4" opacity="0.55" />
  </g>

  <!-- pole stockade (low fence, behind cabins) -->
  <g>
    <!-- ground line of stockade -->
    <path d="M 80 138 L 80 124 L 240 122 L 240 138"
          fill="none" stroke={ink} stroke-width="0.3" />
    {#each Array(28) as _, i}
      {@const px = 80 + i * (160 / 27)}
      <path d="M {px} 138 L {px} 122 L {px + 1.3} 119 L {px + 2.6} 122 L {px + 2.6} 138 Z"
            fill={stockade} stroke={ink} stroke-width="0.3" />
    {/each}
  </g>

  <!-- L-shaped log cabin compound — main feature -->
  <g>
    <!-- CABIN A — front-facing, larger, left -->
    <g>
      <!-- gable end -->
      <path d="M 110 138 L 110 122 L 130 114 L 150 122 L 150 138 Z"
            fill={log} stroke={ink} stroke-width="0.6" />
      <!-- shadow side -->
      <path d="M 110 138 L 110 122 L 116 122 L 116 138 Z" fill={logSh} opacity="0.55" />
      <!-- log courses (horizontal) -->
      <g stroke={logSh} stroke-width="0.4" opacity="0.7">
        <line x1="111" y1="126" x2="149" y2="126" />
        <line x1="111" y1="130" x2="149" y2="130" />
        <line x1="111" y1="134" x2="149" y2="134" />
      </g>
      <!-- log-end notches at corners -->
      <g fill={logHi} stroke={ink} stroke-width="0.3">
        <circle cx="110" cy="126" r="0.9" />
        <circle cx="110" cy="130" r="0.9" />
        <circle cx="110" cy="134" r="0.9" />
        <circle cx="150" cy="126" r="0.9" />
        <circle cx="150" cy="130" r="0.9" />
        <circle cx="150" cy="134" r="0.9" />
      </g>
      <!-- sod roof — thick, dirt with grass on top -->
      <path d="M 108 122 L 130 113 L 152 122 L 150 122 L 130 114.5 L 110 122 Z"
            fill={sodRoof} stroke={ink} stroke-width="0.5" />
      <path d="M 108 122 L 130 113 L 152 122 L 152 124 L 130 115 L 108 124 Z"
            fill={sodRoofSh} stroke={ink} stroke-width="0.45" />
      <!-- grass tufts on roof -->
      <g stroke={sodGrass} stroke-width="0.6" fill="none">
        <path d="M 116 119 q 0.5 -2 1 0" />
        <path d="M 122 117 q 0.5 -2 1 0" />
        <path d="M 130 115 q 0.5 -2 1 0" />
        <path d="M 138 117 q 0.5 -2 1 0" />
        <path d="M 144 119 q 0.5 -2 1 0" />
      </g>
      <!-- heavy plank door -->
      <rect x="125" y="128" width="6" height="10" fill={LMK.earthDark} stroke={ink} stroke-width="0.4" />
      <line x1="127" y1="128" x2="127" y2="138" stroke={ink} stroke-width="0.25" />
      <line x1="129" y1="128" x2="129" y2="138" stroke={ink} stroke-width="0.25" />
      <!-- tiny window -->
      <rect x="138" y="128" width="4" height="4" fill={LMK.inkSoft} stroke={ink} stroke-width="0.3" />
      <!-- chimney + smoke (forge) -->
      <rect x="143" y="111" width="3.5" height="6" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
      <path d="M 144.5 111 q -2 -3 1 -7 q 3 -2 0 -8 q -3 -3 1 -10"
            stroke={ink} stroke-width="0.5" fill="none" opacity="0.55" />
    </g>

    <!-- CABIN B — perpendicular, smaller, behind/right of A -->
    <g>
      <path d="M 158 134 L 158 120 L 175 116 L 215 116 L 215 134 Z"
            fill={log} stroke={ink} stroke-width="0.55" />
      <path d="M 158 134 L 158 120 L 175 116 L 175 134 Z" fill={logSh} opacity="0.55" />
      <!-- logs (mostly shows long side) -->
      <g stroke={logSh} stroke-width="0.35" opacity="0.7">
        <line x1="176" y1="120" x2="214" y2="120" />
        <line x1="176" y1="124" x2="214" y2="124" />
        <line x1="176" y1="128" x2="214" y2="128" />
        <line x1="176" y1="132" x2="214" y2="132" />
      </g>
      <!-- sod roof -->
      <path d="M 156 120 L 175 113 L 215 114 L 215 116 L 175 115 L 158 121 Z"
            fill={sodRoof} stroke={ink} stroke-width="0.45" />
      <!-- grass tufts -->
      <g stroke={sodGrass} stroke-width="0.55" fill="none">
        <path d="M 180 116 q 0.5 -2 1 0" />
        <path d="M 192 115 q 0.5 -2 1 0" />
        <path d="M 204 115 q 0.5 -2 1 0" />
      </g>
      <!-- door + window -->
      <rect x="184" y="124" width="5" height="10" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
      <rect x="198" y="124" width="4" height="4" fill={LMK.inkSoft} stroke={ink} stroke-width="0.3" />
    </g>

    <!-- trade-room hand-painted sign hanging from cabin A eave -->
    <g>
      <line x1="148" y1="124" x2="148" y2="129" stroke={ink} stroke-width="0.4" />
      <rect x="148" y="129" width="9" height="4" fill="#cca870" stroke={ink} stroke-width="0.35" />
      <line x1="150" y1="131" x2="155" y2="131" stroke={ink} stroke-width="0.4" opacity="0.7" />
    </g>

    <!-- anvil / forge work outside cabin A -->
    <g transform="translate(96 138)">
      <rect x="-2" y="-3" width="4" height="3" fill={ink} />
      <rect x="-3" y="-3.5" width="6" height="0.8" fill={LMK.earthDark} />
      <!-- small fire -->
      <ellipse cx="-7" cy="-1" rx="2.5" ry="1" fill="#f4a832" opacity="0.85" />
      <path d="M -7 -1 q -1 -3 0.5 -5 q 1.5 2 -0.5 5"
            fill="#f0c060" stroke={ink} stroke-width="0.25" opacity="0.85" />
    </g>
  </g>

  <!-- corral — pole pen with horses, right of cabins -->
  <g>
    <path d="M 250 138 L 250 128 L 318 128 L 318 138"
          fill="none" stroke={stockade} stroke-width="0.6" />
    <!-- posts -->
    {#each [250, 264, 278, 292, 306, 318] as px}
      <line x1={px} y1="138" x2={px} y2="126" stroke={stockade} stroke-width="0.7" />
    {/each}
    <!-- rails -->
    <line x1="250" y1="131" x2="318" y2="131" stroke={stockade} stroke-width="0.5" />
    <line x1="250" y1="135" x2="318" y2="135" stroke={stockade} stroke-width="0.5" />
    <!-- 2 horses in the pen -->
    {@render horseFn(266, 138, "#5a3a20")}
    {@render horseFn(296, 138, "#3a2818")}
  </g>

  <!-- native tipi camp — right side of post -->
  <g>
    {@render tipiFn(350, 138, 26)}
    {@render tipiFn(385, 138, 22, true)}
    {@render tipiFn(414, 138, 28)}
    <!-- small figure + dog -->
    <g>
      <rect x="370" y="134" width="1.4" height="4" fill={ink} />
      <circle cx="370.7" cy="133" r="0.9" fill={LMK.earthLight} stroke={ink} stroke-width="0.2" />
      <!-- dog -->
      <ellipse cx="378" cy="137" rx="2" ry="0.9" fill={LMK.earthDark} />
      <line x1="376" y1="137" x2="376" y2="138" stroke={ink} stroke-width="0.4" />
      <line x1="380" y1="137" x2="380" y2="138" stroke={ink} stroke-width="0.4" />
    </g>
  </g>

  <!-- sage brush in foreground -->
  <g>
    {#each [15, 50, 200, 330, 440] as sx}
      {@render sageBrush(sx, 172)}
    {/each}
  </g>

  <!-- ground baseline -->
  <rect x="0" y={groundY} width={LMK_VIEW_W} height={LMK_VIEW_H - groundY}
        fill="#a89678" opacity="0.45" />

  <!-- single weathered wagon parked in foreground (trader's wagon, dirty) -->
  <g transform="translate(80 178)">
    {@render parkedWagon()}
  </g>

  <!-- inscribed caption -->
  <g transform="translate(388 192)">
    <text x="0" y="0" font-family="'IM Fell English', Georgia, serif"
          font-size="7" fill={ink} opacity="0.55"
          font-style="italic" text-anchor="end">
      Fort Bridger, Black's Fork
    </text>
  </g>
</g>
