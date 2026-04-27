<!-- FortKearnyArt.svelte — auto-ported from fort-kearny-art.jsx -->
<script lang="ts">
  import { LMK, LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';

  const ink = LMK.ink;
  const sod = "#9a7a4a";
  const sodSh = "#6a4f2a";
  const adobe = "#c9a472";
  const adobeSh = "#9a7a4a";

  const groundY = 142;
  const horizonY = 108;
</script>

{#snippet cottonwood(cx: number, cy: number, h: number = 28, w: number = 20)}
  {@const trunkH = h * 0.45}
  {@const canopyR = w / 2}
  <g>
    <path
      d={`M ${cx - 1.2} ${cy} L ${cx - 1} ${cy - trunkH} L ${cx + 1} ${cy - trunkH} L ${cx + 1.2} ${cy} Z`}
      fill={LMK.earthDark} stroke={ink} stroke-width="0.4"
    />
    <g>
      <ellipse cx={cx - canopyR * 0.45} cy={cy - trunkH - canopyR * 0.4}
               rx={canopyR * 0.7} ry={canopyR * 0.55} fill={LMK.sageDark} />
      <ellipse cx={cx + canopyR * 0.4} cy={cy - trunkH - canopyR * 0.5}
               rx={canopyR * 0.65} ry={canopyR * 0.55} fill={LMK.sage} />
      <ellipse cx={cx} cy={cy - trunkH - canopyR * 0.85}
               rx={canopyR * 0.6} ry={canopyR * 0.5} fill={LMK.sageLight} opacity="0.85" />
      <ellipse cx={cx} cy={cy - trunkH - canopyR * 0.55}
               rx={canopyR * 0.95} ry={canopyR * 0.7}
               fill="none" stroke={ink} stroke-width="0.45" opacity="0.6" />
    </g>
    <ellipse cx={cx} cy={cy + 0.6} rx={canopyR * 0.55} ry="1.2" fill={ink} opacity="0.18" />
  </g>
{/snippet}

{#snippet soldier(x: number, y: number)}
  <g transform={`translate(${x} ${y})`}>
    <line x1="-1" y1="0" x2="-1" y2="-4" stroke={ink} stroke-width="0.9" />
    <line x1="1" y1="0" x2="1" y2="-4" stroke={ink} stroke-width="0.9" />
    <rect x="-1.6" y="-8" width="3.2" height="4" fill="#3a4a7a" stroke={ink} stroke-width="0.3" />
    <circle cx="0" cy="-9.3" r="0.9" fill={LMK.earthLight} stroke={ink} stroke-width="0.25" />
    <rect x="-1.2" y="-10.3" width="2.4" height="1.2" fill="#3a4a7a" stroke={ink} stroke-width="0.25" />
    <line x1="2.2" y1="-9" x2="2.2" y2="-2" stroke={ink} stroke-width="0.5" />
    <line x1="2.2" y1="-9" x2="2.2" y2="-10.5" stroke={ink} stroke-width="0.7" />
  </g>
{/snippet}

{#snippet oxTrainSilhouette()}
  <g>
    <ellipse cx="-10" cy="0" rx="22" ry="2.5" fill={LMK.earthLight} opacity="0.4" />
    {#each [0, 1, 2, 3] as i}
      <g transform={`translate(${i * 14} 0)`}>
        <path
          d="M -7 -8 L -7 -12 L -5 -14 L 5 -14 L 7 -12 L 7 -8 L 5 -6 L -5 -6 Z"
          fill="#7a4a28" stroke={ink} stroke-width="0.4"
        />
        <path
          d="M 5 -13 L 9 -13 L 10 -11 L 9 -9 L 6 -9 L 5 -10 Z"
          fill="#5a3618" stroke={ink} stroke-width="0.35"
        />
        <path d="M 8 -13 q 1 -2 0 -4" stroke={LMK.earthLight} stroke-width="0.5" fill="none" />
        <line x1="-5" y1="-6" x2="-5" y2="0" stroke={ink} stroke-width="0.7" />
        <line x1="-2" y1="-6" x2="-2" y2="0" stroke={ink} stroke-width="0.7" />
        <line x1="3" y1="-6" x2="3" y2="0" stroke={ink} stroke-width="0.7" />
        <line x1="6" y1="-6" x2="6" y2="0" stroke={ink} stroke-width="0.7" />
      </g>
    {/each}
    <line x1="62" y1="-9" x2="86" y2="-10" stroke={ink} stroke-width="0.8" />
    <g transform="translate(105 0)">
      <rect x="-14" y="-9" width="28" height="5" fill={LMK.earthDark} stroke={ink} stroke-width="0.5" />
      <path
        d="M -14 -9 C -16 -20, 16 -20, 14 -9 Z"
        fill={LMK.white} stroke={ink} stroke-width="0.5"
      />
      <path d="M -8 -16 q 1 -3 0 0 M 0 -18 q 1 -3 0 0 M 8 -16 q 1 -3 0 0"
            stroke={ink} stroke-width="0.3" fill="none" opacity="0.5" />
      <circle cx="-9" cy="-2" r="3.5" fill="none" stroke={ink} stroke-width="0.7" />
      <circle cx="9" cy="-2" r="3.5" fill="none" stroke={ink} stroke-width="0.7" />
      <circle cx="-9" cy="-2" r="0.6" fill={ink} />
      <circle cx="9" cy="-2" r="0.6" fill={ink} />
      {#each [0, 60, 120] as a}
        <g transform={`rotate(${a} -9 -2)`}>
          <line x1="-9" y1="-2" x2="-9" y2="-5.4" stroke={ink} stroke-width="0.4" />
          <line x1="-9" y1="-2" x2="-9" y2="1.4" stroke={ink} stroke-width="0.4" />
        </g>
      {/each}
      {#each [0, 60, 120] as a}
        <g transform={`rotate(${a} 9 -2)`}>
          <line x1="9" y1="-2" x2="9" y2="-5.4" stroke={ink} stroke-width="0.4" />
          <line x1="9" y1="-2" x2="9" y2="1.4" stroke={ink} stroke-width="0.4" />
        </g>
      {/each}
    </g>
  </g>
{/snippet}

<g>
  <!-- distant Platte Valley: faint bluffs across the river -->
  <g opacity="0.55">
    <path
      d={`M 0 ${horizonY}
          C 60 ${horizonY - 4}, 110 ${horizonY - 6}, 160 ${horizonY - 3}
          C 220 ${horizonY - 7}, 280 ${horizonY - 4}, 340 ${horizonY - 8}
          C 400 ${horizonY - 5}, 450 ${horizonY - 2}, ${LMK_VIEW_W} ${horizonY - 4}
          L ${LMK_VIEW_W} ${horizonY + 2} L 0 ${horizonY + 2} Z`}
      fill="#b8b08a"
    />
    <path
      d={`M 0 ${horizonY + 1} L ${LMK_VIEW_W} ${horizonY + 1}`}
      stroke={ink} stroke-width="0.4" opacity="0.5"
    />
  </g>

  <!-- Platte River -->
  <g opacity="0.7">
    <rect x="0" y={horizonY + 2} width={LMK_VIEW_W} height="6" fill={LMK.water} opacity="0.55" />
    <path d={`M 30 ${horizonY + 4} L 80 ${horizonY + 4}`} stroke="#d8c898" stroke-width="1" />
    <path d={`M 140 ${horizonY + 5} L 200 ${horizonY + 5}`} stroke="#d8c898" stroke-width="1" />
    <path d={`M 280 ${horizonY + 4} L 340 ${horizonY + 4}`} stroke="#d8c898" stroke-width="1" />
    <path d={`M 380 ${horizonY + 5} L 460 ${horizonY + 5}`} stroke="#d8c898" stroke-width="0.8" />
  </g>

  <!-- cottonwood treeline -->
  <g>
    {@render cottonwood(70, groundY - 2, 28, 20)}
    {@render cottonwood(92, groundY - 2, 32, 22)}
    {@render cottonwood(118, groundY - 2, 26, 18)}
    {@render cottonwood(362, groundY - 2, 24, 18)}
    {@render cottonwood(388, groundY - 2, 30, 22)}
    {@render cottonwood(414, groundY - 2, 26, 20)}
  </g>

  <!-- sod barracks -->
  <g>
    <path
      d="M 130 142 L 130 124 L 220 122 L 220 142 Z"
      fill={sod} stroke={ink} stroke-width="0.7"
    />
    <g stroke={sodSh} stroke-width="0.4" opacity="0.7">
      <line x1="130" y1="129" x2="220" y2="129" />
      <line x1="130" y1="134" x2="220" y2="134" />
      <line x1="130" y1="139" x2="220" y2="139" />
    </g>
    <path d="M 130 142 L 130 124 L 138 124 L 138 142 Z" fill={sodSh} opacity="0.6" />
    <path
      d="M 128 124 L 175 116 L 222 122 L 220 124 L 175 118 L 130 125 Z"
      fill={sodSh} stroke={ink} stroke-width="0.6"
    />
    <path d="M 145 119 q 1 -2 2 0 M 165 117 q 1 -2 2 0 M 185 118 q 1 -2 2 0 M 205 120 q 1 -2 2 0"
          stroke={LMK.sageDark} stroke-width="0.6" fill="none" />
    <rect x="171" y="132" width="8" height="10" fill={ink} />
    <rect x="148" y="132" width="6" height="6" fill={LMK.inkSoft} stroke={ink} stroke-width="0.4" />
    <rect x="195" y="132" width="6" height="6" fill={LMK.inkSoft} stroke={ink} stroke-width="0.4" />
    <line x1="200" y1="116" x2="200" y2="110" stroke={ink} stroke-width="0.6" />
    <path d="M 198 110 q -2 -4 1 -7 q 4 -2 1 -6"
          stroke={ink} stroke-width="0.5" fill="none" opacity="0.55" />
  </g>

  <!-- adobe HQ -->
  <g>
    <path d="M 270 142 L 270 126 L 320 124 L 320 142 Z"
          fill={adobe} stroke={ink} stroke-width="0.7" />
    <path d="M 270 142 L 270 126 L 277 126 L 277 142 Z" fill={adobeSh} opacity="0.55" />
    <path d="M 268 126 L 295 116 L 322 124 L 320 126 L 295 118 L 270 127 Z"
          fill={adobeSh} stroke={ink} stroke-width="0.6" />
    <rect x="291" y="132" width="7" height="10" fill={ink} />
    <rect x="277" y="131" width="6" height="6" fill={LMK.inkSoft} stroke={ink} stroke-width="0.4" />
    <rect x="307" y="131" width="6" height="6" fill={LMK.inkSoft} stroke={ink} stroke-width="0.4" />
    <line x1="288" y1="132" x2="301" y2="132" stroke={ink} stroke-width="0.4" />
  </g>

  <!-- flagpole + US flag -->
  <g>
    <line x1="245" y1="142" x2="245" y2="80" stroke={ink} stroke-width="0.9" />
    <circle cx="245" cy="80" r="1.2" fill={ink} />
    <path d="M 245 81 L 268 84 L 268 95 L 245 97 Z" fill={LMK.redFlag} stroke={ink} stroke-width="0.4" />
    <rect x="245" y="81" width="9" height="7" fill="#3a4a7a" />
    <g stroke="#f0e6c8" stroke-width="0.6" opacity="0.85">
      <line x1="254" y1="85" x2="268" y2="85.5" />
      <line x1="245" y1="89" x2="268" y2="89.5" />
      <line x1="245" y1="93" x2="268" y2="93.5" />
    </g>
    <ellipse cx="240" cy="142.5" rx="6" ry="1" fill={ink} opacity="0.18" />
  </g>

  <!-- cannon -->
  <g transform="translate(340 138)">
    <rect x="-5" y="-2" width="10" height="3" fill={LMK.earthDark} stroke={ink} stroke-width="0.4" />
    <circle cx="-3" cy="2" r="2.4" fill="none" stroke={ink} stroke-width="0.5" />
    <circle cx="3" cy="2" r="2.4" fill="none" stroke={ink} stroke-width="0.5" />
    <rect x="-2" y="-5" width="11" height="2.2" fill={ink} />
    <circle cx="9" cy="-3.9" r="1" fill={LMK.earthDark} />
  </g>

  <!-- soldiers drilling -->
  <g>
    {@render soldier(210, 150)}
    {@render soldier(228, 150)}
    {@render soldier(246, 150)}
  </g>

  <!-- parade ground baseline -->
  <g>
    <rect x="0" y={groundY} width={LMK_VIEW_W} height={LMK_VIEW_H - groundY} fill="#c9a06a" opacity="0.35" />
    <rect x="130" y={groundY} width="92" height="3" fill="url(#fk-hatch)" opacity="0.35" />
    <rect x="270" y={groundY} width="50" height="3" fill="url(#fk-hatch)" opacity="0.35" />
  </g>

  <!-- emigrant ox-train -->
  <g transform="translate(50 168)">
    {@render oxTrainSilhouette()}
  </g>

  <!-- wagon ruts -->
  <g stroke={ink} stroke-width="0.5" fill="none" opacity="0.35">
    <path d="M 0 178 C 80 174, 180 178, 280 174 C 360 172, 440 176, 480 174" />
    <path d="M 0 184 C 80 180, 180 184, 280 180 C 360 178, 440 182, 480 180" />
  </g>

  <!-- caption -->
  <g transform="translate(388 192)">
    <text x="0" y="0" font-family="'IM Fell English', Georgia, serif"
          font-size="7" fill={ink} opacity="0.55"
          font-style="italic" text-anchor="end">
      Fort Kearny on the Platte
    </text>
  </g>
</g>
