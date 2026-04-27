<!--
  OregonCityArt — END OF THE TRAIL — Willamette Falls, log cabins, 1846 town

  At the foot of Willamette Falls, where the trail formally ENDED. A small
  muddy frontier town of log cabins, the McLoughlin House, a sawmill, the
  land office where pioneers filed donation claims. The Falls thunder beside.
  Composition: town in foreground (cabins, smoke, milling crowd), big falls
  at right, ships on the river beyond, distant Cascades w/ Mt Hood. Bunting,
  bell, painted "END OF THE TRAIL" arch.
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const log = "#7a5230";
  const logDark = "#4a3018";
  const shake = "#5a4028";
  const gold = "#d4a832";
</script>

{#snippet cabin(x: number, y: number, smoke: boolean)}
  <g transform="translate({x} {y})">
    <rect x="-10" y="0" width="20" height="14" fill={log} stroke={ink} stroke-width="0.5" />
    <g stroke={logDark} stroke-width="0.3" opacity="0.6">
      <line x1="-10" y1="3" x2="10" y2="3" />
      <line x1="-10" y1="6" x2="10" y2="6" />
      <line x1="-10" y1="9" x2="10" y2="9" />
      <line x1="-10" y1="12" x2="10" y2="12" />
    </g>
    <path d="M -11 0 L 0 -7 L 11 0 Z" fill={shake} stroke={ink} stroke-width="0.45" />
    <rect x="-1.6" y="6" width="3.2" height="8" fill={logDark} stroke={ink} stroke-width="0.3" />
    <rect x="-7" y="4" width="3.5" height="3.5" fill={LMK.paperWarm} stroke={ink} stroke-width="0.3" />
    {#if smoke}
      <rect x="5" y="-5" width="2" height="4" fill="#9a7654" stroke={ink} stroke-width="0.3" />
      <path d="M 6 -6 q -2 -3 0 -6 q 2 -3 0 -6" stroke="#7a6a58" stroke-width="0.4" fill="none" opacity="0.6" />
    {/if}
  </g>
{/snippet}

<g>
  <!-- sky -->
  <rect x="0" y="0" width={LMK_VIEW_W} height="40" fill={LMK.parchment} opacity="0.5" />

  <!-- DISTANT MT HOOD — snow-capped, far ahead -->
  <g>
    <path d="M 280 50 L 320 18 L 360 50 Z" fill="#8a96a8" stroke={ink} stroke-width="0.5" />
    <!-- snowcap -->
    <path d="M 304 28 L 320 18 L 336 28 L 332 32 L 326 30 L 322 32 L 316 30 L 310 32 Z"
          fill={LMK.white} stroke={ink} stroke-width="0.4" />
    <!-- shadow side -->
    <path d="M 320 18 L 360 50 L 332 50 L 322 32 Z" fill="#5a6878" opacity="0.55" />
  </g>
  <!-- lesser Cascade ridge -->
  <path d="M 0 56 L 60 46 L 130 54 L 200 42 L 280 50 L 360 50 L 420 46 L 480 52 L 480 76 L 0 76 Z"
        fill="#7a8aa0" stroke={ink} stroke-width="0.4" opacity="0.85" />
  <path d="M 0 76 Q 120 72 240 76 Q 360 72 480 76 L 480 86 L 0 86 Z" fill="#5a6878" opacity="0.5" />

  <!-- WILLAMETTE FALLS at right — wide horseshoe -->
  <g>
    <!-- basalt ledge -->
    <path d="M 360 100 L 480 96 L 480 116 L 360 118 Z" fill="#5a5a60" stroke={ink} stroke-width="0.5" />
    <!-- upstream river above falls -->
    <path d="M 360 86 L 480 86 L 480 100 L 360 100 Z" fill={LMK.water} opacity="0.85" />
    <!-- falling water — multiple sheets -->
    <g>
      <path d="M 364 100 L 366 138 L 372 138 L 370 100 Z" fill={LMK.water} opacity="0.85" />
      <path d="M 380 100 L 382 138 L 388 138 L 386 100 Z" fill={LMK.water} opacity="0.85" />
      <path d="M 396 100 L 398 138 L 404 138 L 402 100 Z" fill={LMK.water} opacity="0.85" />
      <path d="M 412 100 L 414 138 L 420 138 L 418 100 Z" fill={LMK.water} opacity="0.85" />
      <path d="M 428 100 L 430 138 L 436 138 L 434 100 Z" fill={LMK.water} opacity="0.85" />
      <path d="M 444 100 L 446 138 L 452 138 L 450 100 Z" fill={LMK.water} opacity="0.85" />
      <path d="M 460 100 L 462 138 L 468 138 L 466 100 Z" fill={LMK.water} opacity="0.85" />
      <!-- white streaks -->
      <g stroke={LMK.white} stroke-width="0.5" opacity="0.85">
        <line x1="368" y1="108" x2="370" y2="136" />
        <line x1="384" y1="108" x2="386" y2="136" />
        <line x1="400" y1="108" x2="402" y2="136" />
        <line x1="416" y1="108" x2="418" y2="136" />
        <line x1="432" y1="108" x2="434" y2="136" />
        <line x1="448" y1="108" x2="450" y2="136" />
        <line x1="464" y1="108" x2="466" y2="136" />
      </g>
    </g>
    <!-- basin spray cloud -->
    <ellipse cx="420" cy="142" rx="56" ry="6" fill={LMK.white} opacity="0.7" />
    <ellipse cx="430" cy="146" rx="44" ry="3" fill={LMK.white} opacity="0.55" />
    <!-- lower river -->
    <path d="M 360 142 L 480 144 L 480 168 L 360 168 Z" fill={LMK.water} opacity="0.8" />
    <g stroke={LMK.white} stroke-width="0.4" opacity="0.55">
      <line x1="370" y1="156" x2="410" y2="155" />
      <line x1="430" y1="158" x2="470" y2="157" />
    </g>
    <!-- a small ship (early steamer/sloop) below the falls -->
    <g transform="translate(420 162)">
      <path d="M -7 0 L 7 0 L 5 2 L -5 2 Z" fill="#3a2410" stroke={ink} stroke-width="0.4" />
      <line x1="0" y1="0" x2="0" y2="-8" stroke={ink} stroke-width="0.5" />
      <path d="M 0 -8 L -3 -2 L 0 -2 Z" fill={LMK.white} stroke={ink} stroke-width="0.35" />
      <path d="M 0 -8 L 3 -2 L 0 -2 Z" fill={LMK.white} stroke={ink} stroke-width="0.35" />
    </g>
  </g>

  <!-- downstream river continues left -->
  <path d="M 0 118 L 360 118 L 360 168 L 0 168 Z" fill={LMK.water} opacity="0.45" />
  <g stroke={LMK.white} stroke-width="0.4" opacity="0.4">
    <line x1="40" y1="142" x2="100" y2="141" />
    <line x1="160" y1="148" x2="220" y2="147" />
    <line x1="260" y1="148" x2="320" y2="146" />
  </g>

  <!-- TOWN — log cabins on near bank -->
  <g>
    <!-- near bank ground -->
    <path d="M 0 120 Q 180 116 360 118 L 360 200 L 0 200 Z" fill={LMK.parchment} opacity="0.55" />

    <!-- McLOUGHLIN HOUSE — bigger, centered -->
    <g transform="translate(180 142)">
      <rect x="-26" y="0" width="52" height="22" fill={log} stroke={ink} stroke-width="0.55" />
      <!-- log courses -->
      <g stroke={logDark} stroke-width="0.35" opacity="0.6">
        <line x1="-26" y1="4" x2="26" y2="4" />
        <line x1="-26" y1="8" x2="26" y2="8" />
        <line x1="-26" y1="12" x2="26" y2="12" />
        <line x1="-26" y1="16" x2="26" y2="16" />
        <line x1="-26" y1="20" x2="26" y2="20" />
      </g>
      <!-- gable roof -->
      <path d="M -28 0 L 0 -10 L 28 0 Z" fill={shake} stroke={ink} stroke-width="0.55" />
      <g stroke={logDark} stroke-width="0.3" opacity="0.55">
        <path d="M -22 -2 L 22 -2" />
        <path d="M -16 -5 L 16 -5" />
        <path d="M -10 -7 L 10 -7" />
      </g>
      <!-- chimney + smoke -->
      <rect x="14" y="-8" width="3.5" height="6" fill="#9a7654" stroke={ink} stroke-width="0.3" />
      <path d="M 15.5 -9 q -2 -4 0 -7 q 2 -4 0 -7" stroke={inkSoft} stroke-width="0.45" fill="none" opacity="0.65" />
      <!-- door + windows -->
      <rect x="-3" y="10" width="6" height="12" fill={logDark} stroke={ink} stroke-width="0.35" />
      <rect x="-18" y="8" width="6" height="6" fill={LMK.paperWarm} stroke={ink} stroke-width="0.35" />
      <line x1="-15" y1="8" x2="-15" y2="14" stroke={ink} stroke-width="0.3" />
      <line x1="-18" y1="11" x2="-12" y2="11" stroke={ink} stroke-width="0.3" />
      <rect x="12" y="8" width="6" height="6" fill={LMK.paperWarm} stroke={ink} stroke-width="0.35" />
      <line x1="15" y1="8" x2="15" y2="14" stroke={ink} stroke-width="0.3" />
      <line x1="12" y1="11" x2="18" y2="11" stroke={ink} stroke-width="0.3" />
      <!-- sign over door -->
      <rect x="-6" y="6" width="12" height="3" fill={LMK.paperWarm} stroke={ink} stroke-width="0.3" />
      <text x="0" y="8.3" font-size="2" font-family="IM Fell English, Georgia, serif"
            fill={ink} text-anchor="middle">LAND OFFICE</text>
    </g>

    <!-- smaller cabins -->
    {@render cabin(86, 150, true)}
    {@render cabin(130, 154, false)}
    {@render cabin(236, 150, true)}
    {@render cabin(278, 154, false)}
    {@render cabin(314, 156, true)}

    <!-- "END OF THE TRAIL" arch — wooden, with bunting -->
    <g transform="translate(80 122)">
      <line x1="0" y1="0" x2="0" y2="-22" stroke="#4a3220" stroke-width="1.4" />
      <line x1="48" y1="0" x2="48" y2="-22" stroke="#4a3220" stroke-width="1.4" />
      <path d="M 0 -22 Q 24 -32 48 -22" stroke="#4a3220" stroke-width="1.4" fill="none" />
      <!-- bunting -->
      <path d="M 0 -22 Q 8 -18 12 -22 Q 20 -18 24 -22 Q 32 -18 36 -22 Q 44 -18 48 -22"
            stroke={LMK.redFlag} stroke-width="0.6" fill="none" />
      <!-- signboard -->
      <rect x="6" y="-30" width="36" height="6" fill={LMK.paperWarm} stroke={ink} stroke-width="0.4" />
      <text x="24" y="-25.6" font-size="3" font-family="IM Fell English, Georgia, serif"
            fill={ink} text-anchor="middle" font-style="italic">
        END OF THE TRAIL
      </text>
    </g>

    <!-- CROWD of pioneers in main street -->
    <g>
      {#each [100, 110, 120, 142, 156, 170, 218, 232, 248, 296, 310, 326] as x, i}
        <g transform="translate({x},{178 + (i % 3) * 2})">
          <ellipse cx="0" cy="-4" rx="0.7" ry="0.8" fill={LMK.paperWarm} stroke={ink} stroke-width="0.2" />
          <path d="M -1 -3 L 1 -3 L 1.2 0 L -1.2 0 Z"
                fill={i % 4 === 0 ? LMK.rust : i % 4 === 1 ? "#3a5a78" : i % 4 === 2 ? LMK.earthDark : LMK.earth}
                stroke={ink} stroke-width="0.2" />
          {#if i % 2 === 0}
            <path d="M -1 -4.6 L 1 -4.6 L 0.8 -5 L -0.8 -5 Z" fill={ink} />
          {:else}
            <path d="M -1 -5 Q 0 -5.8 1 -5 L 1 -4.4 L -1 -4.4 Z" fill={LMK.white} stroke={ink} stroke-width="0.2" />
          {/if}
        </g>
      {/each}
    </g>

    <!-- arrived wagon, oxen unhitched -->
    <g transform="translate(60 166)">
      <rect x="-10" y="-6" width="20" height="3" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
      <path d="M -10 -6 Q 0 -14 10 -6 Z" fill={LMK.white} stroke={ink} stroke-width="0.45" />
      <!-- worn patches -->
      <path d="M -7 -9 q 1 1 2 0" stroke={LMK.parchmentSh} stroke-width="0.45" fill="none" />
      <path d="M 4 -10 q 1 1 2 0" stroke={LMK.parchmentSh} stroke-width="0.45" fill="none" />
      <circle cx="-6" cy="0" r="2.4" fill="none" stroke={ink} stroke-width="0.4" />
      <circle cx="6" cy="0" r="2.4" fill="none" stroke={ink} stroke-width="0.4" />
    </g>

    <!-- BELL on a post -->
    <g transform="translate(346 144)">
      <line x1="0" y1="0" x2="0" y2="-10" stroke="#4a3220" stroke-width="0.7" />
      <path d="M -2.5 -10 L 2.5 -10 L 2 -7 L -2 -7 Z" fill={gold} stroke={ink} stroke-width="0.4" />
      <line x1="0" y1="-7" x2="0" y2="-5.6" stroke={ink} stroke-width="0.35" />
      <circle cx="0" cy="-5.4" r="0.5" fill="#5a4828" />
    </g>
  </g>

  <text x="240" y="194" text-anchor="middle"
        font-family="IM Fell English, Georgia, serif" font-size="9"
        fill={ink} font-style="italic" font-weight="600">
    Oregon City — Journey's End
  </text>
</g>
