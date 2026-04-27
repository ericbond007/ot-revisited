<!-- BarlowRoadArt.svelte — auto-ported from barlow-road-art.jsx -->
<script lang="ts">
  import { LMK, LMK_VIEW_W } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const wood = '#8a6a3a';
  const firDark = "#2a3826";
  const firMid = "#3e5638";
  const firLight = "#5e7a4c";
  const trunkBrown = "#3e2818";
  const earthMud = "#4a3520";
  const snowWhite = "#eef2f6";
  const peakBlue = "#6e7c92";
  const peakShadow = "#3a4658";
</script>

{#snippet firTree(x: number, y: number, h: number, w: number, dark: boolean = false)}
  {@const c1 = dark ? "#2a3826" : "#3e5638"}
  {@const c2 = dark ? "#3e5638" : "#5e7a4c"}
  <g transform={`translate(${x}, ${y})`}>
    <rect x={-w * 0.08} y={-h * 0.12} width={w * 0.16} height={h * 0.12} fill="#3e2818" stroke={ink} stroke-width="0.3" />
    <g stroke={ink} stroke-width="0.35" fill={c1}>
      <path d={`M ${-w * 0.5} ${-h * 0.15} L 0 ${-h} L ${w * 0.5} ${-h * 0.15} Z`} />
    </g>
    <path d={`M 0 ${-h} L ${-w * 0.45} ${-h * 0.18} L 0 ${-h * 0.18} Z`} fill={c2} opacity="0.7" />
    <g opacity="0.55" stroke={ink} stroke-width="0.25" fill="none">
      <path d={`M ${-w * 0.4} ${-h * 0.4} L 0 ${-h * 0.5}`} />
      <path d={`M ${w * 0.4} ${-h * 0.4} L 0 ${-h * 0.5}`} />
      <path d={`M ${-w * 0.3} ${-h * 0.6} L 0 ${-h * 0.7}`} />
      <path d={`M ${w * 0.3} ${-h * 0.6} L 0 ${-h * 0.7}`} />
    </g>
  </g>
{/snippet}

{#snippet stump(x: number, y: number, size: number = 3, ropeGroove: boolean = false)}
  <g transform={`translate(${x}, ${y})`}>
    <rect x={-size} y={-size * 0.5} width={size * 2} height={size * 1.4} fill="#5e3e22" stroke={ink} stroke-width="0.4" />
    <ellipse cx="0" cy={-size * 0.5} rx={size} ry={size * 0.4} fill="#7e542e" stroke={ink} stroke-width="0.4" />
    <ellipse cx="0" cy={-size * 0.5} rx={size * 0.65} ry={size * 0.26} fill="none" stroke={ink} stroke-width="0.25" opacity="0.7" />
    <ellipse cx="0" cy={-size * 0.5} rx={size * 0.35} ry={size * 0.14} fill="none" stroke={ink} stroke-width="0.25" opacity="0.7" />
    {#if ropeGroove}
      <g opacity="0.8" stroke={ink} stroke-width="0.4" fill="none">
        <path d={`M ${-size} 0 q ${size} -1.4 ${size * 2} 0`} />
        <path d={`M ${-size * 0.95} 0.5 q ${size * 0.95} -1.2 ${size * 1.9} 0`} />
      </g>
    {/if}
  </g>
{/snippet}

<g>
  <!-- Sky behind Hood -->
  <rect x="0" y="0" width={LMK_VIEW_W} height="60" fill={LMK.paperWarm} opacity="0.35" />

  <!-- MT. HOOD -->
  <g>
    <path
      d="M 100 88 L 160 60 L 200 36 L 240 22 L 280 32 L 320 56 L 380 88 L 420 92 L 80 92 Z"
      fill={peakBlue} opacity="0.85" stroke={ink} stroke-width="0.55"
    />
    <path
      d="M 240 22 L 280 32 L 320 56 L 380 88 L 420 92 L 240 92 Z"
      fill={peakShadow} opacity="0.55"
    />
    <path
      d="M 160 60 L 200 36 L 240 22 L 280 32 L 320 56 L 296 70 L 268 60 L 240 50 L 216 56 L 196 66 L 178 70 Z"
      fill={snowWhite} opacity="0.95" stroke={ink} stroke-width="0.4"
    />
    <path
      d="M 240 22 L 280 32 L 320 56 L 296 70 L 268 60 L 240 50 Z"
      fill="#cfd6dc" opacity="0.6"
    />
    <g opacity="0.55" stroke={peakShadow} stroke-width="0.4" fill="none">
      <path d="M 240 22 L 252 38 L 268 60" />
      <path d="M 220 36 L 230 50 L 240 60" />
      <path d="M 280 32 L 286 48 L 296 70" />
    </g>
    <ellipse cx="200" cy="78" rx="60" ry="3" fill={LMK.paperWarm} opacity="0.45" />
  </g>

  <!-- Mid-distance forest cloak -->
  <path
    d="M 0 92 Q 80 86 160 92 Q 240 88 320 92 Q 400 88 480 92 L 480 110 L 0 110 Z"
    fill={firDark} opacity="0.85" stroke={ink} stroke-width="0.4"
  />
  <g opacity="0.6" fill={firMid}>
    {#each Array(80) as _, i}
      {@const x = 4 + (i * 6) % 478}
      {@const y = 90 + (i % 5) * 3}
      <path d={`M ${x} ${y} l -1.4 -3 l 1.4 -2 l 1.4 2 z`} stroke={ink} stroke-width="0.2" />
    {/each}
  </g>

  <!-- DENSE FIR FOREST — left edge -->
  <g>
    {#each [{ x: 8, h: 90, w: 11 }, { x: 22, h: 84, w: 10 }, { x: 36, h: 96, w: 12 }, { x: 52, h: 80, w: 9 }, { x: 66, h: 92, w: 11 }, { x: 82, h: 76, w: 9 }, { x: 96, h: 88, w: 10 }] as t}
      {@render firTree(t.x, 170, t.h, t.w, true)}
    {/each}
  </g>
  <!-- right edge -->
  <g>
    {#each [{ x: 472, h: 92, w: 12 }, { x: 458, h: 86, w: 11 }, { x: 444, h: 98, w: 13 }, { x: 428, h: 82, w: 10 }, { x: 414, h: 94, w: 12 }, { x: 398, h: 78, w: 9 }, { x: 384, h: 90, w: 11 }, { x: 368, h: 86, w: 10 }] as t}
      {@render firTree(t.x, 170, t.h, t.w, true)}
    {/each}
  </g>

  <!-- THE CHUTE -->
  <g>
    <path
      d="M 110 110 L 280 110 L 320 170 L 100 170 Z"
      fill={earthMud} stroke={ink} stroke-width="0.55"
    />
    <path
      d="M 168 110 L 240 110 L 256 170 L 156 170 Z"
      fill="#6a4f30" opacity="0.85" stroke={ink} stroke-width="0.4"
    />
    <g opacity="0.7" stroke={ink} stroke-width="0.4" fill="none">
      <path d="M 184 112 L 188 170" />
      <path d="M 196 112 L 204 170" />
      <path d="M 210 112 L 222 170" />
      <path d="M 224 112 L 240 170" />
    </g>
    <g opacity="0.85" fill="#3a2a18" stroke={ink} stroke-width="0.2">
      <ellipse cx="170" cy="148" rx="2" ry="1" />
      <ellipse cx="232" cy="142" rx="1.6" ry="0.8" />
      <ellipse cx="254" cy="158" rx="2.2" ry="1" />
      <ellipse cx="190" cy="162" rx="1.8" ry="0.9" />
    </g>
    <!-- stumps at chute edges -->
    {@render stump(160, 114, 3)}
    {@render stump(250, 114, 3.4, true)}
    {@render stump(138, 170, 3.2)}
    {@render stump(290, 170, 3.5, true)}
  </g>

  <!-- THE WAGON BEING LOWERED -->
  <g transform="translate(196, 138)">
    <g transform="rotate(20)">
      <rect x="-12" y="-3" width="24" height="8" fill={LMK.earth} stroke={ink} stroke-width="0.55" />
      <path d="M -12 -3 Q 0 -14 12 -3 Z" fill={LMK.white} stroke={ink} stroke-width="0.6" />
      <line x1="-7" y1="-7" x2="-7" y2="-3" stroke={inkSoft} stroke-width="0.3" opacity="0.6" />
      <line x1="0" y1="-10" x2="0" y2="-3" stroke={inkSoft} stroke-width="0.3" opacity="0.6" />
      <line x1="7" y1="-7" x2="7" y2="-3" stroke={inkSoft} stroke-width="0.3" opacity="0.6" />
      <!-- CHAIN LOCKED wheels -->
      <circle cx="-7" cy="6" r="2.6" fill={wood} stroke={ink} stroke-width="0.5" />
      <circle cx="7" cy="6" r="2.6" fill={wood} stroke={ink} stroke-width="0.5" />
      <g stroke={ink} stroke-width="0.3">
        <line x1="-7" y1="3.5" x2="-7" y2="8.5" />
        <line x1="-9.5" y1="6" x2="-4.5" y2="6" />
        <line x1="7" y1="3.5" x2="7" y2="8.5" />
        <line x1="4.5" y1="6" x2="9.5" y2="6" />
      </g>
      <!-- chain links -->
      <g fill="none" stroke={ink} stroke-width="0.55">
        <ellipse cx="-7" cy="3.6" rx="0.8" ry="0.4" />
        <ellipse cx="-5" cy="4" rx="0.4" ry="0.8" />
        <ellipse cx="-7" cy="4.5" rx="0.8" ry="0.4" />
        <ellipse cx="7" cy="3.6" rx="0.8" ry="0.4" />
        <ellipse cx="9" cy="4" rx="0.4" ry="0.8" />
        <ellipse cx="7" cy="4.5" rx="0.8" ry="0.4" />
      </g>
    </g>
    <!-- ROPE to anchor stump -->
    <line x1="-2" y1="-2" x2="-44" y2="-22" stroke={ink} stroke-width="0.7" opacity="0.9" />
    <line x1="-2" y1="-2" x2="-44" y2="-22" stroke="#c8a878" stroke-width="0.3" opacity="0.7" />
  </g>

  <!-- Pioneers anchoring at top -->
  <g>
    <g transform="translate(154, 116)">
      <ellipse cx="0" cy="-3" rx="0.9" ry="0.9" fill={LMK.paperWarm} stroke={ink} stroke-width="0.2" />
      <ellipse cx="0" cy="-4" rx="1.5" ry="0.3" fill={ink} />
      <path d="M -1.2 -2 L 1.2 -2 L 1 2 L -1 2 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
      <line x1="-0.6" y1="2" x2="-1.5" y2="5" stroke={ink} stroke-width="0.4" />
      <line x1="0.6" y1="2" x2="1.5" y2="5" stroke={ink} stroke-width="0.4" />
      <line x1="-1" y1="-1" x2="-3.5" y2="-3" stroke={ink} stroke-width="0.45" />
      <line x1="1" y1="-1" x2="3.5" y2="-3" stroke={ink} stroke-width="0.45" />
    </g>
    <g transform="translate(146, 120)">
      <ellipse cx="0" cy="-3" rx="0.9" ry="0.9" fill={LMK.paperWarm} stroke={ink} stroke-width="0.2" />
      <ellipse cx="0" cy="-4" rx="1.5" ry="0.3" fill={ink} />
      <path d="M -1.2 -2 L 1.2 -2 L 1 2 L -1 2 Z" fill={LMK.rust} stroke={ink} stroke-width="0.25" />
      <line x1="-0.6" y1="2" x2="-0.6" y2="5" stroke={ink} stroke-width="0.4" />
      <line x1="0.6" y1="2" x2="0.6" y2="5" stroke={ink} stroke-width="0.4" />
    </g>
  </g>

  <!-- Pioneers waiting at bottom -->
  <g>
    <g transform="translate(266, 174)">
      <ellipse cx="0" cy="-3" rx="0.9" ry="0.9" fill={LMK.paperWarm} stroke={ink} stroke-width="0.2" />
      <ellipse cx="0" cy="-4" rx="1.5" ry="0.3" fill={ink} />
      <path d="M -1.2 -2 L 1.2 -2 L 1 2 L -1 2 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
      <line x1="-0.6" y1="2" x2="-0.6" y2="5" stroke={ink} stroke-width="0.4" />
      <line x1="0.6" y1="2" x2="0.6" y2="5" stroke={ink} stroke-width="0.4" />
      <line x1="0.6" y1="-1.5" x2="3" y2="-3.5" stroke={ink} stroke-width="0.5" stroke-linecap="round" />
    </g>
    <!-- already-descended wagon at bottom -->
    <g transform="translate(296, 178)">
      <rect x="0" y="0" width="14" height="5" fill={LMK.earth} stroke={ink} stroke-width="0.35" />
      <path d="M 0 0 Q 7 -8 14 0 Z" fill={LMK.white} stroke={ink} stroke-width="0.45" />
      <circle cx="3" cy="6" r="1.8" fill="none" stroke={ink} stroke-width="0.35" />
      <circle cx="11" cy="6" r="1.8" fill="none" stroke={ink} stroke-width="0.35" />
    </g>
  </g>

  <!-- Mossy forest floor -->
  <rect x="0" y="170" width={LMK_VIEW_W} height="30" fill="#3e3a2a" opacity="0.4" />
  <g opacity="0.55" stroke={firMid} stroke-width="0.4" fill="none">
    {#each [20, 60, 90, 360, 400, 440] as x, i}
      <g transform={`translate(${x}, ${184 + (i % 3) * 4})`}>
        <path d="M 0 0 q -2 -3 -1 -6" />
        <path d="M 0 0 q 2 -3 1 -6" />
        <path d="M 0 0 q 0 -4 0 -7" />
      </g>
    {/each}
  </g>
  <!-- fallen log -->
  <g transform="translate(40, 186)">
    <ellipse cx="0" cy="0" rx="36" ry="2.6" fill={trunkBrown} stroke={ink} stroke-width="0.45" />
    <ellipse cx="-32" cy="0" rx="3" ry="2.4" fill="#5e3e22" stroke={ink} stroke-width="0.4" />
    <circle cx="-32" cy="0" r="1.6" fill="none" stroke={ink} stroke-width="0.25" opacity="0.7" />
    <circle cx="-32" cy="0" r="0.9" fill="none" stroke={ink} stroke-width="0.25" opacity="0.7" />
  </g>

  <!-- Caption -->
  <text x="240" y="194" text-anchor="middle"
    font-family="IM Fell English, Georgia, serif" font-size="8"
    fill={inkSoft} font-style="italic" opacity="0.85">
    Barlow Road — Laurel Hill chute beneath Mt. Hood
  </text>
</g>
