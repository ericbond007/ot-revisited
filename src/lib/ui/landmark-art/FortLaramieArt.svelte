<!-- FortLaramieArt.svelte — auto-ported from fort-laramie-art.jsx -->
<script lang="ts">
  import { LMK, LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';

  const ink = LMK.ink;
  const adobe = "#d8b886";
  const adobeSh = "#a07a48";
  const adobeDk = "#7a5a30";
  const roof = "#8a4a28";
  const roofSh = "#5a3018";

  const horizonY = 88;
  const fortBaseY = 138;
  const groundY = 144;

  const fx = 165;
  const fw = 162;
  const wallTopY = 102;
  const wallH = fortBaseY - wallTopY;
</script>

{#snippet cottonwood2(cx: number, cy: number, h: number = 14)}
  {@const trunk = h * 0.35}
  <g>
    <line x1={cx} y1={cy} x2={cx} y2={cy - trunk} stroke={LMK.earthDark} stroke-width="0.6" />
    <ellipse cx={cx} cy={cy - trunk - h * 0.35} rx={h * 0.45} ry={h * 0.4} fill={LMK.sage} />
    <ellipse cx={cx - h * 0.18} cy={cy - trunk - h * 0.4} rx={h * 0.3} ry={h * 0.28} fill={LMK.sageDark} />
    <ellipse cx={cx} cy={cy - trunk - h * 0.4} rx={h * 0.5} ry={h * 0.42}
             fill="none" stroke={ink} stroke-width="0.35" opacity="0.5" />
  </g>
{/snippet}

{#snippet campWagon(x: number, y: number, flip: boolean = false)}
  <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
    <path d="M -10 -2 C -12 -10, 12 -10, 10 -2 Z"
          fill={LMK.white} stroke={ink} stroke-width="0.5" />
    <rect x="-10" y="-2" width="20" height="3" fill={LMK.earthDark} stroke={ink} stroke-width="0.4" />
    <circle cx="-6" cy="2" r="2.4" fill="none" stroke={ink} stroke-width="0.55" />
    <circle cx="6" cy="2" r="2.4" fill="none" stroke={ink} stroke-width="0.55" />
    <circle cx="-6" cy="2" r="0.5" fill={ink} />
    <circle cx="6" cy="2" r="0.5" fill={ink} />
    <ellipse cx="0" cy="4.8" rx="9" ry="0.9" fill={ink} opacity="0.18" />
  </g>
{/snippet}

{#snippet approachingWagon()}
  <g>
    <ellipse cx="-12" cy="0" rx="20" ry="2" fill={LMK.earthLight} opacity="0.4" />
    {#each [0, 1] as i}
      <g transform={`translate(${i * 12} 0)`}>
        <path d="M -6 -8 L -6 -12 L -4 -13 L 4 -13 L 6 -12 L 6 -8 L 4 -6 L -4 -6 Z"
              fill="#7a4a28" stroke={ink} stroke-width="0.4" />
        <path d="M 4 -12 L 8 -12 L 9 -10 L 8 -8 L 5 -8 L 4 -9 Z"
              fill="#5a3618" stroke={ink} stroke-width="0.35" />
        <line x1="-4" y1="-6" x2="-4" y2="0" stroke={ink} stroke-width="0.7" />
        <line x1="-1" y1="-6" x2="-1" y2="0" stroke={ink} stroke-width="0.7" />
        <line x1="2"  y1="-6" x2="2"  y2="0" stroke={ink} stroke-width="0.7" />
        <line x1="5"  y1="-6" x2="5"  y2="0" stroke={ink} stroke-width="0.7" />
      </g>
    {/each}
    <line x1="22" y1="-9" x2="42" y2="-10" stroke={ink} stroke-width="0.7" />
    <g transform="translate(56 0)">
      <path d="M -12 -8 C -14 -18, 14 -18, 12 -8 Z"
            fill={LMK.white} stroke={ink} stroke-width="0.5" />
      <rect x="-12" y="-8" width="24" height="4" fill={LMK.earthDark} stroke={ink} stroke-width="0.45" />
      <circle cx="-7" cy="-2" r="3" fill="none" stroke={ink} stroke-width="0.6" />
      <circle cx="7" cy="-2" r="3" fill="none" stroke={ink} stroke-width="0.6" />
      <circle cx="-7" cy="-2" r="0.5" fill={ink} />
      <circle cx="7" cy="-2" r="0.5" fill={ink} />
    </g>
  </g>
{/snippet}

<g>
  <!-- Laramie Mountains — far horizon -->
  <g opacity="0.65">
    <path
      d={`M 0 ${horizonY}
          L 30 ${horizonY - 4} L 60 ${horizonY - 10} L 90 ${horizonY - 6}
          L 120 ${horizonY - 16} L 160 ${horizonY - 12} L 200 ${horizonY - 20}
          L 240 ${horizonY - 14} L 280 ${horizonY - 24} L 320 ${horizonY - 18}
          L 360 ${horizonY - 10} L 400 ${horizonY - 16} L 440 ${horizonY - 8}
          L ${LMK_VIEW_W} ${horizonY - 4}
          L ${LMK_VIEW_W} ${horizonY + 2} L 0 ${horizonY + 2} Z`}
      fill="#7a8a9a"
    />
    <path
      d={`M 0 ${horizonY - 2}
          L 50 ${horizonY - 6} L 100 ${horizonY - 4} L 180 ${horizonY - 10}
          L 260 ${horizonY - 6} L 340 ${horizonY - 12} L 420 ${horizonY - 4}
          L ${LMK_VIEW_W} ${horizonY - 6}
          L ${LMK_VIEW_W} ${horizonY} L 0 ${horizonY} Z`}
      fill="#a3aabc" opacity="0.65"
    />
  </g>

  <!-- middle plain -->
  <rect x="0" y={horizonY + 1} width={LMK_VIEW_W} height={fortBaseY - horizonY - 1}
        fill="#c8b88a" opacity="0.45" />

  <!-- Laramie River + willows -->
  <g>
    <path
      d={`M 0 175
          C 50 168, 100 162, 150 156
          C 175 152, 200 150, 220 154
          L 220 159
          C 200 156, 175 158, 150 161
          C 100 167, 50 173, 0 180 Z`}
      fill={LMK.water} opacity="0.7"
    />
    <path d="M 30 172 L 70 168 M 110 162 L 145 158" stroke={LMK.white} stroke-width="0.5" opacity="0.5" />
    {@render cottonwood2(48, 168, 14)}
    {@render cottonwood2(75, 164, 18)}
    {@render cottonwood2(108, 160, 16)}
    {@render cottonwood2(138, 156, 20)}
  </g>

  <!-- ground rise -->
  <path
    d={`M ${fx - 14} ${fortBaseY + 4}
        C ${fx - 4} ${fortBaseY - 2}, ${fx + 8} ${fortBaseY - 2}, ${fx + 30} ${fortBaseY + 1}
        L ${fx + fw - 30} ${fortBaseY + 1}
        C ${fx + fw - 8} ${fortBaseY - 2}, ${fx + fw + 4} ${fortBaseY - 2}, ${fx + fw + 14} ${fortBaseY + 4}
        L ${fx + fw + 14} ${fortBaseY + 16} L ${fx - 14} ${fortBaseY + 16} Z`}
    fill="#b8965e" stroke={ink} stroke-width="0.4" opacity="0.85"
  />

  <!-- Fort itself -->
  <g>
    <!-- front wall -->
    <rect x={fx} y={wallTopY} width={fw} height={wallH}
          fill={adobe} stroke={ink} stroke-width="0.7" />
    <!-- right wall perspective sliver -->
    <path
      d={`M ${fx + fw} ${wallTopY}
          L ${fx + fw + 14} ${wallTopY + 6}
          L ${fx + fw + 14} ${fortBaseY + 4}
          L ${fx + fw} ${fortBaseY} Z`}
      fill={adobeSh} stroke={ink} stroke-width="0.6"
    />
    <rect x={fx} y={wallTopY} width="6" height={wallH} fill={adobeSh} opacity="0.4" />

    <!-- adobe courses -->
    <g stroke={adobeDk} stroke-width="0.3" opacity="0.55">
      <line x1={fx + 1} y1={wallTopY + 8}  x2={fx + fw - 1} y2={wallTopY + 8} />
      <line x1={fx + 1} y1={wallTopY + 16} x2={fx + fw - 1} y2={wallTopY + 16} />
      <line x1={fx + 1} y1={wallTopY + 24} x2={fx + fw - 1} y2={wallTopY + 24} />
      <line x1={fx + 1} y1={wallTopY + 30} x2={fx + fw - 1} y2={wallTopY + 30} />
    </g>
    <!-- weathering streaks -->
    <g stroke={adobeDk} stroke-width="0.4" opacity="0.4">
      <line x1={fx + 22} y1={wallTopY + 4} x2={fx + 22} y2={wallTopY + 18} />
      <line x1={fx + 80} y1={wallTopY + 4} x2={fx + 80} y2={wallTopY + 14} />
      <line x1={fx + 122} y1={wallTopY + 4} x2={fx + 122} y2={wallTopY + 22} />
    </g>

    <!-- left bastion -->
    <g>
      <rect x={fx - 4} y={wallTopY - 14} width="14" height={wallH + 14}
            fill={adobe} stroke={ink} stroke-width="0.6" />
      <rect x={fx - 4} y={wallTopY - 14} width="4" height={wallH + 14}
            fill={adobeSh} opacity="0.5" />
      <path d={`M ${fx - 6} ${wallTopY - 14} L ${fx + 3} ${wallTopY - 22} L ${fx + 12} ${wallTopY - 14} Z`}
            fill={roof} stroke={ink} stroke-width="0.5" />
      <path d={`M ${fx - 6} ${wallTopY - 14} L ${fx + 3} ${wallTopY - 22} L ${fx + 3} ${wallTopY - 14} Z`}
            fill={roofSh} opacity="0.6" />
      <rect x={fx - 1} y={wallTopY - 6} width="3" height="2" fill={ink} />
      <rect x={fx + 5} y={wallTopY - 6} width="3" height="2" fill={ink} />
    </g>
    <!-- right bastion -->
    <g>
      <rect x={fx + fw - 10} y={wallTopY - 14} width="14" height={wallH + 14}
            fill={adobe} stroke={ink} stroke-width="0.6" />
      <rect x={fx + fw - 10} y={wallTopY - 14} width="3" height={wallH + 14}
            fill={adobeSh} opacity="0.45" />
      <path d={`M ${fx + fw - 12} ${wallTopY - 14} L ${fx + fw - 3} ${wallTopY - 22} L ${fx + fw + 6} ${wallTopY - 14} Z`}
            fill={roof} stroke={ink} stroke-width="0.5" />
      <path d={`M ${fx + fw - 12} ${wallTopY - 14} L ${fx + fw - 3} ${wallTopY - 22} L ${fx + fw - 3} ${wallTopY - 14} Z`}
            fill={roofSh} opacity="0.6" />
      <rect x={fx + fw - 7} y={wallTopY - 6} width="3" height="2" fill={ink} />
      <rect x={fx + fw - 1} y={wallTopY - 6} width="3" height="2" fill={ink} />
    </g>

    <!-- parapet crenellations -->
    <g fill={adobe} stroke={ink} stroke-width="0.5">
      {#each Array(9) as _, i}
        {@const cx2 = fx + 16 + i * 16}
        <rect x={cx2} y={wallTopY - 4} width="6" height="4" />
      {/each}
    </g>

    <!-- central gate -->
    <g>
      <rect x={fx + fw / 2 - 16} y={wallTopY - 6} width="32" height={wallH + 6}
            fill={adobe} stroke={ink} stroke-width="0.6" />
      <rect x={fx + fw / 2 - 16} y={wallTopY - 6} width="4" height={wallH + 6}
            fill={adobeSh} opacity="0.45" />
      <path
        d={`M ${fx + fw / 2 - 9} ${fortBaseY}
            L ${fx + fw / 2 - 9} ${wallTopY + 12}
            Q ${fx + fw / 2} ${wallTopY + 2}, ${fx + fw / 2 + 9} ${wallTopY + 12}
            L ${fx + fw / 2 + 9} ${fortBaseY} Z`}
        fill="#2a1810" stroke={ink} stroke-width="0.6"
      />
      <path
        d={`M ${fx + fw / 2 - 9} ${fortBaseY}
            L ${fx + fw / 2 - 9} ${wallTopY + 14}
            L ${fx + fw / 2 - 1} ${wallTopY + 14}
            L ${fx + fw / 2 - 1} ${fortBaseY} Z`}
        fill={LMK.earthDark} stroke={ink} stroke-width="0.4"
      />
      <g stroke={ink} stroke-width="0.3" opacity="0.6">
        <line x1={fx + fw / 2 - 6} y1={wallTopY + 14} x2={fx + fw / 2 - 6} y2={fortBaseY} />
        <line x1={fx + fw / 2 - 4} y1={wallTopY + 14} x2={fx + fw / 2 - 4} y2={fortBaseY} />
      </g>
      <circle cx={fx + fw / 2 - 5} cy={wallTopY + 18} r="0.5" fill={ink} />
      <circle cx={fx + fw / 2 - 5} cy={wallTopY + 26} r="0.5" fill={ink} />
      <circle cx={fx + fw / 2 - 5} cy={wallTopY + 34} r="0.5" fill={ink} />
      <path d={`M ${fx + fw / 2 - 16} ${wallTopY - 6}
                L ${fx + fw / 2} ${wallTopY - 14}
                L ${fx + fw / 2 + 16} ${wallTopY - 6} Z`}
            fill={adobeSh} stroke={ink} stroke-width="0.5" />
    </g>

    <!-- inside-fort rooflines -->
    <g>
      <path d={`M ${fx + 24} ${wallTopY - 2}
                L ${fx + 38} ${wallTopY - 9}
                L ${fx + 52} ${wallTopY - 2} Z`}
            fill={roof} stroke={ink} stroke-width="0.5" />
      <path d={`M ${fx + fw - 50} ${wallTopY - 2}
                L ${fx + fw - 34} ${wallTopY - 11}
                L ${fx + fw - 18} ${wallTopY - 2} Z`}
            fill={roof} stroke={ink} stroke-width="0.5" />
      <rect x={fx + 44} y={wallTopY - 14} width="3" height="6" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
      <path d={`M ${fx + 45.5} ${wallTopY - 14} q -2 -3 1 -6 q 3 -2 0 -6`}
            stroke={ink} stroke-width="0.4" fill="none" opacity="0.5" />
    </g>

    <!-- flagpole -->
    <g>
      <line x1={fx + fw / 2} y1={wallTopY - 14} x2={fx + fw / 2} y2={wallTopY - 38}
            stroke={ink} stroke-width="0.7" />
      <circle cx={fx + fw / 2} cy={wallTopY - 38} r="0.8" fill={ink} />
      <path
        d={`M ${fx + fw / 2} ${wallTopY - 37}
            L ${fx + fw / 2 + 16} ${wallTopY - 35}
            L ${fx + fw / 2 + 16} ${wallTopY - 27}
            L ${fx + fw / 2} ${wallTopY - 25} Z`}
        fill={LMK.redFlag} stroke={ink} stroke-width="0.4"
      />
      <rect x={fx + fw / 2} y={wallTopY - 37} width="6" height="5" fill="#3a4a7a" />
      <line x1={fx + fw / 2 + 6} y1={wallTopY - 33} x2={fx + fw / 2 + 16} y2={wallTopY - 32}
            stroke={LMK.white} stroke-width="0.4" opacity="0.85" />
      <line x1={fx + fw / 2} y1={wallTopY - 30} x2={fx + fw / 2 + 16} y2={wallTopY - 29}
            stroke={LMK.white} stroke-width="0.4" opacity="0.85" />
    </g>
  </g>

  <!-- ground in front of fort -->
  <rect x="0" y={groundY} width={LMK_VIEW_W} height={LMK_VIEW_H - groundY}
        fill="#c9a06a" opacity="0.4" />

  <!-- wagon camp outside walls -->
  <g>
    {@render campWagon(358, 156)}
    {@render campWagon(388, 160, true)}
    {@render campWagon(418, 158)}
    <g opacity="0.45">
      <ellipse cx="395" cy="166" rx="4" ry="1.2" fill={LMK.earthLight} />
      <path d="M 395 166 q -2 -6 1 -10 q 3 -3 0 -8" stroke={ink} stroke-width="0.5" fill="none" />
    </g>
    <g>
      <rect x="389" y="160" width="1.4" height="4" fill={ink} />
      <circle cx="389.7" cy="159" r="0.9" fill={LMK.earthLight} stroke={ink} stroke-width="0.2" />
      <rect x="400" y="161" width="1.4" height="4" fill={ink} />
      <circle cx="400.7" cy="160" r="0.9" fill={LMK.earthLight} stroke={ink} stroke-width="0.2" />
    </g>
  </g>

  <!-- approaching wagon -->
  <g transform="translate(265 168)">
    {@render approachingWagon()}
  </g>

  <!-- trail ruts -->
  <g stroke={ink} stroke-width="0.5" fill="none" opacity="0.32">
    <path d="M 220 188 C 240 178, 250 170, 260 164" />
    <path d="M 235 192 C 250 184, 256 176, 264 168" />
  </g>

  <!-- caption -->
  <g transform="translate(388 192)">
    <text x="0" y="0" font-family="'IM Fell English', Georgia, serif"
          font-size="7" fill={ink} opacity="0.55"
          font-style="italic" text-anchor="end">
      Fort Laramie, on the North Platte
    </text>
  </g>
</g>
