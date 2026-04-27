<!-- TheDallesArt.svelte — auto-ported from the-dalles-art.jsx -->
<script lang="ts">
  import { LMK, LMK_VIEW_W } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const tan = '#c8a870';
  const basaltDark = "#262630";
  const basaltMid = "#444450";
  const basaltLight = "#787880";
  const colWaterDark = "#3e5a66";
  const colWater = "#5a7c8a";
  const foam = "#e6ecec";
  const cedarBrown = "#7a4f2c";
</script>

{#snippet smallPersonD(x: number, y: number, hat: boolean = false)}
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
    d="M 0 64 Q 80 60 160 64 Q 240 60 320 64 Q 400 60 480 64 L 480 78 L 0 78 Z"
    fill={LMK.sageDark} opacity="0.35"
  />

  <!-- Distant peaks — Mt. Hood hint -->
  <g opacity="0.55">
    <path d="M 320 78 L 348 50 L 360 56 L 372 44 L 388 60 L 400 56 L 416 78 Z"
      fill={basaltLight} stroke={ink} stroke-width="0.4" />
    <path d="M 348 50 L 372 44 L 388 60 Z" fill={LMK.paperWarm} opacity="0.85" stroke={ink} stroke-width="0.35" />
    <path d="M 372 44 L 380 52 L 388 60 L 376 58 L 372 50 Z" fill="#cfd6dc" opacity="0.7" />
  </g>

  <!-- BASALT CLIFFS -->
  <g>
    <!-- RIGHT BANK (south) -->
    <path
      d="M 0 78 L 0 134 L 60 134 L 80 124 L 96 116 L 112 100 L 120 86 L 124 78 Z"
      fill={basaltDark} stroke={ink} stroke-width="0.6"
    />
    <path
      d="M 124 78 L 120 86 L 112 100 L 96 116 L 80 124 L 60 134 L 110 134 L 122 124 L 132 110 L 138 94 L 140 82 L 138 78 Z"
      fill={basaltMid} stroke={ink} stroke-width="0.55"
    />
    <path
      d="M 138 78 L 140 82 L 138 94 L 132 110 L 122 124 L 110 134 L 158 134 L 162 124 L 162 110 L 158 96 L 152 84 L 148 78 Z"
      fill={basaltLight} opacity="0.85" stroke={ink} stroke-width="0.5"
    />
    <!-- columnar joints right bank -->
    <g opacity="0.65" stroke={basaltDark} stroke-width="0.4" fill="none">
      {#each [6, 14, 24, 36, 50, 64, 80, 100, 118, 132, 148] as x, i}
        <line x1={x} y1={i % 2 ? 86 : 82} x2={x + (i % 2 ? -2 : 1)} y2="132" />
      {/each}
    </g>
    <!-- terraced bench lines -->
    <g opacity="0.55" stroke={basaltDark} stroke-width="0.4" fill="none">
      <path d="M 0 110 L 60 110 L 80 100 L 96 90" />
      <path d="M 0 122 L 80 122 L 110 112 L 138 100" />
    </g>

    <!-- LEFT BANK (north) — much taller -->
    <path
      d="M 480 78 L 480 130 L 410 130 L 396 120 L 380 102 L 368 80 L 364 78 Z"
      fill={basaltDark} stroke={ink} stroke-width="0.6"
    />
    <path
      d="M 364 78 L 368 80 L 380 102 L 396 120 L 410 130 L 360 130 L 348 116 L 338 96 L 332 80 L 330 78 Z"
      fill={basaltMid} stroke={ink} stroke-width="0.55"
    />
    <path
      d="M 330 78 L 332 80 L 338 96 L 348 116 L 360 130 L 318 130 L 312 116 L 308 96 L 306 80 L 304 78 Z"
      fill={basaltLight} opacity="0.85" stroke={ink} stroke-width="0.5"
    />
    <!-- columnar joints left bank -->
    <g opacity="0.7" stroke={basaltDark} stroke-width="0.45" fill="none">
      {#each [306, 314, 322, 332, 342, 352, 362, 372, 384, 398, 414, 432, 452, 470] as x, i}
        <line x1={x} y1={i % 2 ? 86 : 80} x2={x + (i % 2 ? -2 : 1.5)} y2="128" />
      {/each}
    </g>
    <!-- terraced bench -->
    <g opacity="0.55" stroke={basaltDark} stroke-width="0.4" fill="none">
      <path d="M 480 100 L 410 100 L 380 92 L 360 86" />
      <path d="M 480 116 L 410 116 L 384 108" />
    </g>

    <!-- tiny pines on right-bank top -->
    <g opacity="0.65">
      {#each [20, 40, 60, 84, 102] as x}
        <g transform={`translate(${x}, 78)`}>
          <path d="M 0 0 L -1.4 -3 L 0 -5 L 1.4 -3 Z" fill="#3a4a2a" stroke={ink} stroke-width="0.25" />
        </g>
      {/each}
    </g>
  </g>

  <!-- COLUMBIA RIVER -->
  <g>
    <path
      d="M 110 134 L 360 130 L 360 152 L 110 154 Z"
      fill={colWater} stroke={ink} stroke-width="0.4" opacity="0.92"
    />
    <path d="M 110 144 Q 240 152 360 142 L 360 152 L 110 154 Z"
      fill={colWaterDark} opacity="0.7" />
    <path
      d="M 158 134 L 318 130 L 312 124 L 168 128 Z"
      fill={colWaterDark} opacity="0.85"
    />
    <!-- RAPIDS white water -->
    <g opacity="0.85">
      {#each Array(22) as _, i}
        {@const x = 130 + i * 11}
        {@const y = 138 + (i % 3) * 3}
        <path
          d={`M ${x} ${y} q 2 -1.5 4 0 q 2 -1.5 4 0`}
          stroke={foam} stroke-width="0.7" fill="none"
        />
      {/each}
    </g>
    <!-- foam concentration -->
    <g opacity="0.85" fill={foam} stroke={ink} stroke-width="0.2">
      <ellipse cx="200" cy="142" rx="14" ry="2" />
      <ellipse cx="240" cy="146" rx="18" ry="2.4" />
      <ellipse cx="280" cy="142" rx="14" ry="2" />
    </g>
    <path d="M 168 130 Q 180 133 192 134" stroke={foam} stroke-width="1.4" fill="none" opacity="0.85" />
    <path d="M 296 130 Q 308 133 320 134" stroke={foam} stroke-width="1.4" fill="none" opacity="0.85" />
  </g>

  <!-- NATIVE FISHING SCAFFOLDS -->
  <g>
    <!-- Right-bank scaffold -->
    <g>
      <line x1="158" y1="134" x2="178" y2="138" stroke={cedarBrown} stroke-width="0.7" />
      <line x1="158" y1="134" x2="172" y2="142" stroke={cedarBrown} stroke-width="0.6" />
      <line x1="156" y1="136" x2="174" y2="146" stroke={cedarBrown} stroke-width="0.55" />
      <rect x="160" y="132" width="20" height="2" fill={cedarBrown} stroke={ink} stroke-width="0.4" />
      <line x1="160" y1="129" x2="180" y2="129" stroke={cedarBrown} stroke-width="0.4" />
      <line x1="162" y1="129" x2="162" y2="132" stroke={cedarBrown} stroke-width="0.35" />
      <line x1="170" y1="129" x2="170" y2="132" stroke={cedarBrown} stroke-width="0.35" />
      <line x1="178" y1="129" x2="178" y2="132" stroke={cedarBrown} stroke-width="0.35" />
      <!-- fisherman with dip net -->
      <g transform="translate(174, 124)">
        <ellipse cx="0" cy="-3.5" rx="0.9" ry="1.1" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
        <path d="M -1.2 -2.5 L 1.2 -2.5 L 1 2 L -1 2 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
        <line x1="-0.6" y1="2" x2="-0.6" y2="5" stroke={ink} stroke-width="0.4" />
        <line x1="0.6" y1="2" x2="0.6" y2="5" stroke={ink} stroke-width="0.4" />
        <line x1="0.5" y1="-1" x2="10" y2="14" stroke={cedarBrown} stroke-width="0.5" />
        <ellipse cx="10" cy="14" rx="2.2" ry="1.4" fill="none" stroke={ink} stroke-width="0.4" />
        <g opacity="0.55" stroke={ink} stroke-width="0.2" fill="none">
          <path d="M 8 14 q 2 4 4 0" />
          <path d="M 8.4 13.5 q 1.6 2 3.2 0" />
        </g>
      </g>
    </g>

    <!-- Left-bank scaffold -->
    <g>
      <line x1="318" y1="130" x2="298" y2="136" stroke={cedarBrown} stroke-width="0.7" />
      <line x1="318" y1="130" x2="304" y2="140" stroke={cedarBrown} stroke-width="0.55" />
      <rect x="294" y="128" width="18" height="2" fill={cedarBrown} stroke={ink} stroke-width="0.4" />
      <line x1="294" y1="125" x2="312" y2="125" stroke={cedarBrown} stroke-width="0.4" />
      <line x1="298" y1="125" x2="298" y2="128" stroke={cedarBrown} stroke-width="0.35" />
      <line x1="306" y1="125" x2="306" y2="128" stroke={cedarBrown} stroke-width="0.35" />
      <g transform="translate(300, 120)">
        <ellipse cx="0" cy="-3.5" rx="0.9" ry="1.1" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
        <path d="M -1.2 -2.5 L 1.2 -2.5 L 1 2 L -1 2 Z" fill={LMK.rust} stroke={ink} stroke-width="0.25" />
        <line x1="-0.6" y1="2" x2="-0.6" y2="5" stroke={ink} stroke-width="0.4" />
        <line x1="0.6" y1="2" x2="0.6" y2="5" stroke={ink} stroke-width="0.4" />
        <line x1="-0.4" y1="-1" x2="-9" y2="14" stroke={cedarBrown} stroke-width="0.5" />
        <ellipse cx="-9" cy="14" rx="2" ry="1.3" fill="none" stroke={ink} stroke-width="0.4" />
      </g>
    </g>

    <!-- Drying rack with salmon -->
    <g transform="translate(60, 132)">
      <line x1="0" y1="0" x2="22" y2="0" stroke={cedarBrown} stroke-width="0.5" />
      <line x1="2" y1="0" x2="2" y2="6" stroke={cedarBrown} stroke-width="0.4" />
      <line x1="20" y1="0" x2="20" y2="6" stroke={cedarBrown} stroke-width="0.4" />
      {#each [5, 9, 13, 17] as x}
        <path d={`M ${x} 0 L ${x - 1} 4 L ${x} 5 L ${x + 1} 4 Z`}
          fill={LMK.rust} stroke={ink} stroke-width="0.25" />
      {/each}
    </g>

    <!-- Riverside camp smoke -->
    <g opacity="0.55" stroke={inkSoft} stroke-width="0.4" fill="none">
      <path d="M 70 130 q -2 -8 1 -14 q 2 -6 -1 -10" />
      <path d="M 72 128 q 2 -6 -1 -12" />
    </g>
  </g>

  <!-- BIG LOG RAFTS -->
  <g>
    <!-- Raft 1 — front, larger -->
    <g transform="translate(180, 162)">
      <g>
        {#each [0, 4, 8, 12, 16, 20, 24] as dy, i}
          <ellipse cx="40" cy={dy} rx="42" ry="1.6"
            fill={i % 2 ? cedarBrown : "#8a5a36"}
            stroke={ink} stroke-width="0.35" />
        {/each}
      </g>
      <g opacity="0.7" stroke={ink} stroke-width="0.3">
        <line x1="6" y1="-2" x2="6" y2="26" />
        <line x1="34" y1="-2" x2="34" y2="26" />
        <line x1="62" y1="-2" x2="62" y2="26" />
      </g>
      <rect x="22" y="-12" width="36" height="11" fill={LMK.earth} stroke={ink} stroke-width="0.5" />
      <path d="M 22 -12 Q 40 -22 58 -12 Z" fill={LMK.white} stroke={ink} stroke-width="0.55" />
      <!-- adult with hat -->
      <g transform="translate(12, -2)">
        <ellipse cx="0" cy="-3" rx="0.9" ry="0.9" fill={LMK.paperWarm} stroke={ink} stroke-width="0.2" />
        <ellipse cx="0" cy="-4" rx="1.5" ry="0.3" fill={ink} />
        <path d="M -1.2 -2 L 1.2 -2 L 1 2 L -1 2 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
      </g>
      <!-- adult with oar -->
      <g transform="translate(68, -2)">
        <ellipse cx="0" cy="-3" rx="0.9" ry="0.9" fill={LMK.paperWarm} stroke={ink} stroke-width="0.2" />
        <ellipse cx="0" cy="-4" rx="1.5" ry="0.3" fill={ink} />
        <path d="M -1.2 -2 L 1.2 -2 L 1 2 L -1 2 Z" fill={LMK.rust} stroke={ink} stroke-width="0.25" />
        <line x1="0.5" y1="-1" x2="14" y2="6" stroke={cedarBrown} stroke-width="0.6" />
        <rect x="13" y="5" width="3" height="1.8" fill={cedarBrown} stroke={ink} stroke-width="0.3" />
      </g>
      <!-- small kid -->
      <g transform="translate(40, 0)">
        <circle cx="0" cy="-2" r="0.7" fill={LMK.paperWarm} stroke={ink} stroke-width="0.2" />
        <path d="M -0.9 -1.3 L 0.9 -1.3 L 0.7 1 L -0.7 1 Z" fill={tan} stroke={ink} stroke-width="0.2" />
      </g>
      <path d="M -8 18 q 60 -2 96 0" stroke={foam} stroke-width="0.5" fill="none" opacity="0.65" />
      <path d="M -4 22 q 50 -1 88 0" stroke={foam} stroke-width="0.45" fill="none" opacity="0.5" />
    </g>

    <!-- Raft 2 — smaller, further away -->
    <g transform="translate(310, 152)">
      <g>
        {#each [0, 3, 6, 9, 12] as dy, i}
          <ellipse cx="22" cy={dy} rx="22" ry="1.2"
            fill={i % 2 ? cedarBrown : "#8a5a36"}
            stroke={ink} stroke-width="0.3" />
        {/each}
      </g>
      <rect x="14" y="-7" width="18" height="6" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
      <path d="M 14 -7 Q 23 -13 32 -7 Z" fill={LMK.white} stroke={ink} stroke-width="0.4" />
      <g transform="translate(36, -1)">
        <ellipse cx="0" cy="-2" rx="0.7" ry="0.7" fill={LMK.paperWarm} stroke={ink} stroke-width="0.2" />
        <path d="M -0.8 -1.3 L 0.8 -1.3 L 0.6 1 L -0.6 1 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.2" />
        <line x1="0.4" y1="-0.5" x2="9" y2="3" stroke={cedarBrown} stroke-width="0.45" />
      </g>
      <path d="M -4 10 q 36 -1 56 0" stroke={foam} stroke-width="0.4" fill="none" opacity="0.6" />
    </g>
  </g>

  <!-- Foreground bank -->
  <rect x="0" y="158" width={LMK_VIEW_W} height="42" fill={LMK.parchment} opacity="0.55" />
  <g opacity="0.85">
    <ellipse cx="40" cy="180" rx="6" ry="2" fill={basaltMid} stroke={ink} stroke-width="0.4" />
    <ellipse cx="80" cy="184" rx="4" ry="1.6" fill={basaltDark} stroke={ink} stroke-width="0.35" />
    <ellipse cx="430" cy="182" rx="7" ry="2.4" fill={basaltMid} stroke={ink} stroke-width="0.4" />
    <ellipse cx="450" cy="186" rx="4" ry="1.5" fill={basaltDark} stroke={ink} stroke-width="0.35" />
  </g>
  <!-- people on bank -->
  {@render smallPersonD(56, 188, true)}
  {@render smallPersonD(68, 186)}
  {@render smallPersonD(416, 188, true)}
  {@render smallPersonD(436, 186)}

  <!-- Caption -->
  <text x="240" y="194" text-anchor="middle"
    font-family="IM Fell English, Georgia, serif" font-size="8"
    fill={inkSoft} font-style="italic" opacity="0.85">
    The Dalles — Long Narrows of the Columbia
  </text>
</g>
