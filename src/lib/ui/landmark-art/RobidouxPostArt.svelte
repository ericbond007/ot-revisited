<!--
  RobidouxPostArt — mile ~580, Joseph Robidoux's blacksmith trading post

  Tucked at the foot of Scotts Bluff in Robidoux Pass (later Mitchell Pass
  became the more-used route). What pioneers saw: a tiny adobe-and-log
  trading hut + an open-air blacksmith's forge under a brush ramada, set
  against the dramatic flank of the bluffs. Famous for OUTRAGEOUS prices —
  "$2 a pound for blacksmithing" — and being the only iron-work for hundreds
  of miles.

  Distinguishing visual marks:
    - Small SQUAT log + adobe shack (~16 ft square) — half-buried look
    - Brush-roof RAMADA shading the forge (poles + sage thatch)
    - Glowing forge fire, anvil, smith at work
    - Rough corral with pack mules / Indian ponies
    - Scotts Bluff cliffs LOOMING in background — close, not distant
    - A line of wagons waiting their turn for repairs
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const adobe = "#c9a878";
  const adobeSh = "#8a6a3c";
  const log = "#7a5430";
  const logSh = "#4a2e14";
  const brush = "#7a6238";
  const stoneLight = "#d4c098";
  const stoneMid = "#a88858";
  const stoneShadow = "#7a5836";
</script>

{#snippet smallMule(x: number, y: number)}
  <g transform="translate({x} {y})">
    <path d="M -5 -7 L -5 -10 L -3 -11 L 3 -11 L 5 -10 L 5 -7 L 3 -6 L -3 -6 Z" fill="#7a6240" stroke={ink} stroke-width="0.4" />
    <path d="M 3 -11 L 6 -13 L 7 -13 L 8 -12 L 6 -10 L 4 -9 Z" fill="#7a6240" stroke={ink} stroke-width="0.4" />
    <!-- mule ears — long -->
    <path d="M 6 -13 L 5.5 -16 L 7 -13 Z" fill="#7a6240" stroke={ink} stroke-width="0.3" />
    <path d="M 7 -13 L 7.5 -16 L 8.2 -13 Z" fill="#7a6240" stroke={ink} stroke-width="0.3" />
    <line x1="-3" y1="-6" x2="-3" y2="0" stroke={ink} stroke-width="0.6" />
    <line x1="-1" y1="-6" x2="-1" y2="0" stroke={ink} stroke-width="0.6" />
    <line x1="1" y1="-6" x2="1" y2="0" stroke={ink} stroke-width="0.6" />
    <line x1="3" y1="-6" x2="3" y2="0" stroke={ink} stroke-width="0.6" />
  </g>
{/snippet}

{#snippet waitingWagon(x: number, y: number, opacity: number)}
  <g transform="translate({x} {y})" {opacity}>
    <path d="M -10 -6 Q 0 -14 10 -6 Z" fill={LMK.white} stroke={ink} stroke-width="0.4" />
    <rect x="-10" y="-6" width="20" height="3.5" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
    <circle cx="-6" cy="0" r="2.4" fill="none" stroke={ink} stroke-width="0.4" />
    <circle cx="6" cy="0" r="2.4" fill="none" stroke={ink} stroke-width="0.4" />
    <ellipse cx="0" cy="3" rx="10" ry="0.6" fill={ink} opacity="0.2" />
  </g>
{/snippet}

<g>
  <!-- Scotts Bluff cliff face looming behind -->
  <g>
    <!-- main mass -->
    <path
      d="M 0 60 L 30 50 L 70 36 L 110 28 L 160 22 L 220 18 L 280 22 L 340 32 L 400 44 L 450 56 L 480 64 L 480 130 L 0 130 Z"
      fill={stoneLight} stroke={ink} stroke-width="0.8"
    />
    <!-- shadow stratum -->
    <path
      d="M 0 80 Q 100 76 200 78 Q 300 76 400 80 Q 440 79 480 82 L 480 100 Q 380 96 280 98 Q 180 96 80 100 L 0 100 Z"
      fill={stoneMid} opacity="0.6"
    />
    <path
      d="M 0 100 Q 120 98 240 100 Q 360 98 480 102 L 480 122 Q 360 118 240 122 Q 120 118 0 122 Z"
      fill={stoneShadow} opacity="0.5"
    />
    <!-- vertical cracks/erosion -->
    <g stroke={stoneShadow} stroke-width="0.5" fill="none" opacity="0.6">
      <path d="M 80 30 L 76 124" />
      <path d="M 138 22 L 134 124" />
      <path d="M 200 18 L 198 124" />
      <path d="M 268 22 L 270 124" />
      <path d="M 340 34 L 344 124" />
      <path d="M 410 48 L 416 124" />
    </g>
    <!-- horizontal strata -->
    <g stroke={stoneShadow} stroke-width="0.4" fill="none" opacity="0.4">
      <path d="M 0 56 Q 240 52 480 60" />
      <path d="M 0 70 Q 240 66 480 74" />
      <path d="M 0 90 Q 240 88 480 92" />
    </g>
    <!-- a few sage clumps clinging to the slope -->
    <g opacity="0.6" fill={LMK.sageDark} stroke={ink} stroke-width="0.3">
      <ellipse cx="60" cy="80" rx="3" ry="1.5" />
      <ellipse cx="140" cy="60" rx="2.5" ry="1.2" />
      <ellipse cx="240" cy="50" rx="3" ry="1.3" />
      <ellipse cx="320" cy="68" rx="2.5" ry="1.2" />
      <ellipse cx="400" cy="86" rx="3" ry="1.4" />
    </g>
  </g>

  <!-- ground talus / scree skirt at base of bluff -->
  <path d="M 0 130 Q 80 128 160 132 Q 240 128 320 132 Q 400 128 480 132 L 480 144 L 0 144 Z"
        fill={LMK.parchmentSh} opacity="0.8" />

  <!-- HERO: the trading shack -->
  <g>
    <!-- shack body — adobe + log -->
    <rect x="170" y="116" width="46" height="28" fill={adobe} stroke={ink} stroke-width="0.7" />
    <!-- adobe texture -->
    <g stroke={adobeSh} stroke-width="0.3" fill="none" opacity="0.6">
      <path d="M 172 124 q 10 -1 20 0 q 12 1 22 0" />
      <path d="M 172 132 q 14 -1 24 0 q 12 1 18 0" />
      <path d="M 172 138 q 8 -1 16 0 q 12 1 24 0" />
    </g>
    <!-- log frame at base -->
    <rect x="170" y="138" width="46" height="6" fill={log} stroke={ink} stroke-width="0.5" />
    <g stroke={logSh} stroke-width="0.3" opacity="0.7">
      <line x1="172" y1="141" x2="214" y2="141" />
    </g>
    <!-- shadow side -->
    <rect x="204" y="116" width="12" height="28" fill={adobeSh} opacity="0.5" />

    <!-- heavy plank door -->
    <rect x="186" y="124" width="8" height="14" fill={LMK.earthDark} stroke={ink} stroke-width="0.5" />
    <line x1="190" y1="124" x2="190" y2="138" stroke={ink} stroke-width="0.3" />
    <!-- tiny shuttered window -->
    <rect x="200" y="124" width="6" height="5" fill={LMK.earthDark} stroke={ink} stroke-width="0.4" />
    <line x1="203" y1="124" x2="203" y2="129" stroke={ink} stroke-width="0.25" />

    <!-- sod-and-pole roof -->
    <path d="M 168 116 L 184 108 L 218 108 L 218 116 Z" fill={brush} stroke={ink} stroke-width="0.5" />
    <g stroke={logSh} stroke-width="0.4" fill="none" opacity="0.7">
      <line x1="170" y1="113" x2="216" y2="113" />
    </g>
    <!-- poles sticking out -->
    <g stroke={ink} stroke-width="0.4">
      <line x1="171" y1="116" x2="170" y2="118" />
      <line x1="180" y1="116" x2="180" y2="118" />
      <line x1="200" y1="116" x2="200" y2="118" />
      <line x1="216" y1="116" x2="216" y2="118" />
    </g>

    <!-- trade-goods pelts hanging from a rail -->
    <g>
      <line x1="172" y1="118" x2="184" y2="118" stroke={ink} stroke-width="0.4" />
      <path d="M 174 118 L 173 124 L 178 124 L 177 118 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
      <path d="M 180 118 L 179 124 L 183 124 L 182 118 Z" fill="#5a3a1a" stroke={ink} stroke-width="0.3" />
    </g>
  </g>

  <!-- RAMADA — open-air forge under brush roof -->
  <g>
    <!-- posts -->
    <line x1="80" y1="144" x2="80" y2="120" stroke={log} stroke-width="1.2" />
    <line x1="120" y1="144" x2="120" y2="120" stroke={log} stroke-width="1.2" />
    <line x1="160" y1="144" x2="160" y2="120" stroke={log} stroke-width="1.2" />
    <!-- cross-beams -->
    <line x1="76" y1="120" x2="164" y2="120" stroke={log} stroke-width="0.8" />
    <!-- brush thatch — sage piled on top -->
    <path d="M 76 120 Q 100 114 124 118 Q 144 114 164 120 L 164 122 Q 144 117 124 120 Q 100 116 76 122 Z"
          fill={brush} stroke={ink} stroke-width="0.5" />
    <!-- thatch tufts -->
    <g stroke={LMK.sageDark} stroke-width="0.4" fill="none" opacity="0.6">
      <path d="M 84 116 q 1 -2 2 -3" />
      <path d="M 100 114 q 1 -2 2 -3" />
      <path d="M 120 116 q 1 -2 2 -3" />
      <path d="M 140 114 q 1 -2 2 -3" />
      <path d="M 156 116 q 1 -2 2 -3" />
    </g>

    <!-- anvil + forge fire -->
    <g>
      <!-- stone forge base -->
      <rect x="98" y="134" width="12" height="10" fill={stoneShadow} stroke={ink} stroke-width="0.5" />
      <!-- glowing fire -->
      <ellipse cx="104" cy="132" rx="5" ry="2" fill="#f4a832" opacity="0.9" />
      <path d="M 100 132 q 1 -4 2 -6 q 1 4 2 6" fill="#f6cc60" stroke={ink} stroke-width="0.25" opacity="0.85" />
      <path d="M 105 132 q 1 -3 1.5 -5 q 1 3 1.5 5" fill="#f4a832" stroke={ink} stroke-width="0.25" opacity="0.85" />
      <!-- anvil -->
      <g transform="translate(132 138)">
        <rect x="-3" y="-3" width="6" height="3" fill={ink} />
        <rect x="-4" y="-3.5" width="8" height="0.8" fill={LMK.earthDark} />
        <rect x="-1.5" y="-1" width="3" height="3.5" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
      </g>
      <!-- smith — figure swinging hammer -->
      <g transform="translate(128 132)">
        <ellipse cx="0" cy="0" rx="1.4" ry="1.5" fill={LMK.paperWarm} stroke={ink} stroke-width="0.3" />
        <!-- body -->
        <path d="M -1.6 1 L 1.6 1 L 2 6 L -2 6 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.35" />
        <!-- arm raised with hammer -->
        <path d="M 1.6 1.5 L 5 -2" stroke={ink} stroke-width="0.7" />
        <rect x="4.6" y="-3.4" width="2" height="2" fill={ink} />
      </g>
    </g>
  </g>

  <!-- corral with mules & ponies, right side -->
  <g>
    <rect x="248" y="128" width="80" height="16" fill="none" stroke={log} stroke-width="0.6" />
    {#each [248, 268, 288, 308, 328] as px}
      <line x1={px} y1="144" x2={px} y2="128" stroke={log} stroke-width="0.7" />
    {/each}
    <line x1="248" y1="134" x2="328" y2="134" stroke={log} stroke-width="0.5" />
    <!-- mules -->
    {@render smallMule(266, 144)}
    {@render smallMule(290, 144)}
    {@render smallMule(314, 144)}
  </g>

  <!-- line of wagons waiting for repairs (right) -->
  <g>
    {@render waitingWagon(372, 154, 1)}
    {@render waitingWagon(420, 156, 0.85)}
    {@render waitingWagon(460, 158, 0.7)}
  </g>

  <!-- foreground ground -->
  <rect x="0" y="144" width={LMK_VIEW_W} height={LMK_VIEW_H - 144} fill={LMK.parchment} opacity="0.55" />
  <!-- trail rut crossing -->
  <path d="M 0 168 Q 120 166 240 170 Q 360 168 480 172" stroke={LMK.earth} stroke-width="0.9" fill="none" opacity="0.4" />

  <!-- sage clumps -->
  <g opacity="0.6">
    {#each [16, 50, 220, 350] as x, i}
      <g transform="translate({x},{172 + (i % 2) * 4})">
        <ellipse cx="0" cy="0" rx="4" ry="1.6" fill={LMK.sage} stroke={ink} stroke-width="0.3" />
        <ellipse cx="-1.5" cy="-1" rx="2" ry="1" fill={LMK.sageLight} stroke={ink} stroke-width="0.25" />
      </g>
    {/each}
  </g>

  <!-- caption -->
  <text x="240" y="194" text-anchor="middle"
        font-family="IM Fell English, Georgia, serif" font-size="8"
        fill={inkSoft} font-style="italic" opacity="0.85">
    Robidoux Post — &ldquo;blacksmithing at outrageous prices&rdquo;
  </text>
</g>
