<!--
  BigBlueArt.svelte — mile 175, Big Blue River / Alcove Spring crossing.

  "One of the most romantic spots." Wagons camped waiting for the swollen
  Big Blue to fall, with the famous Alcove Spring as the composition anchor:
  a shelving rock projecting over a basin with a 10–12 ft cascade falling
  into a pool, surrounded by lush shrubbery. Names carved into the rocks.

  Distinguishing visual marks:
    • Hero element: the alcove — shelving rock projecting over a pool,
      waterfall cascading 10-12 ft, basin with shrubbery
    • Carved names visible on the rock face (small etched marks)
    • Wagon camp on the meadow above/beside, smoke from cookfires
    • The Big Blue itself — wide, swollen, brown current visible to one side
    • Hardwood forest framing (oak, cottonwood — heavy leafy greens)
    • A makeshift dugout-raft ferry being assembled at the crossing
-->
<script lang="ts">
  import { LMK } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const water = LMK.water;
  const stoneLight = "#b89a78";
  const stoneMid = "#8a6a48";
  const stoneDark = "#5a4028";

</script>

<g>
  <!-- Soft hardwood forest backdrop — heavy leafy -->
  <path
    d="M 0 90 Q 60 78 130 86 Q 200 76 280 84 Q 360 76 480 88 L 480 130 L 0 130 Z"
    fill={LMK.sageDark} opacity="0.55" />
  <path
    d="M 0 100 Q 80 92 160 98 Q 240 90 320 96 Q 400 90 480 98 L 480 130 L 0 130 Z"
    fill={LMK.sage} opacity="0.6" />
  <!-- canopy bumps -->
  {#each Array(18) as _, i}
    {@const x = 14 + i * 27}
    {@const r = 8 + ((i * 5) % 5)}
    <ellipse cx={x} cy={92} rx={r} ry={r * 0.7}
      fill={i % 2 ? LMK.sage : LMK.sageDark} stroke={ink} stroke-width="0.3" opacity="0.7" />
  {/each}

  <!-- Big Blue River — visible at the right side, swollen -->
  <g>
    <path
      d="M 360 110 Q 380 116 400 122 Q 420 130 440 138 Q 460 148 480 156 L 480 200 L 360 200 Z"
      fill={water} stroke={ink} stroke-width="0.4" opacity="0.9"
    />
    <!-- current striations -->
    <path d="M 372 116 Q 400 122 430 130" stroke="#5a7280" stroke-width="0.4" fill="none" opacity="0.6" />
    <path d="M 380 124 Q 410 132 440 142" stroke="#5a7280" stroke-width="0.4" fill="none" opacity="0.6" />
    <path d="M 390 134 Q 420 144 450 154" stroke="#5a7280" stroke-width="0.4" fill="none" opacity="0.5" />
    <!-- glints -->
    <line x1="395" y1="128" x2="405" y2="130" stroke={LMK.white} stroke-width="0.4" opacity="0.6" />
    <line x1="420" y1="148" x2="432" y2="150" stroke={LMK.white} stroke-width="0.4" opacity="0.6" />
    <!-- river-edge willows -->
    <!-- RiverTree at x=370, y=114, h=14 -->
    <g transform="translate(370, 114)">
      <line x1="0" y1="0" x2="0" y2="-4.2" stroke={LMK.earthDark} stroke-width="0.8" />
      <ellipse cx="0" cy="-7.7" rx="4.48" ry="7" fill={LMK.sageDark} stroke={ink} stroke-width="0.3" />
      <ellipse cx="-2" cy="-6.3" rx="3.5" ry="4.9" fill={LMK.sage} stroke={ink} stroke-width="0.3" opacity="0.8" />
    </g>
    <!-- RiverTree at x=465, y=158, h=16 -->
    <g transform="translate(465, 158)">
      <line x1="0" y1="0" x2="0" y2="-4.8" stroke={LMK.earthDark} stroke-width="0.8" />
      <ellipse cx="0" cy="-8.8" rx="5.12" ry="8" fill={LMK.sageDark} stroke={ink} stroke-width="0.3" />
      <ellipse cx="-2" cy="-7.2" rx="4" ry="5.6" fill={LMK.sage} stroke={ink} stroke-width="0.3" opacity="0.8" />
    </g>
  </g>

  <!-- HERO: Alcove Spring formation (left of center) -->
  <g transform="translate(110, 0)">
    <!-- Lush shrubbery framing the alcove -->
    <ellipse cx="-10" cy="118" rx="22" ry="18" fill={LMK.sageDark} stroke={ink} stroke-width="0.4" />
    <ellipse cx="-15" cy="112" rx="14" ry="12" fill={LMK.sage} stroke={ink} stroke-width="0.4" />
    <ellipse cx="78" cy="118" rx="20" ry="16" fill={LMK.sageDark} stroke={ink} stroke-width="0.4" />
    <ellipse cx="86" cy="110" rx="14" ry="13" fill={LMK.sage} stroke={ink} stroke-width="0.4" />

    <!-- Stone formation — main mass -->
    <path
      d="M 5 145 L 6 120 Q 14 110 28 110 L 50 108 Q 60 110 65 118 L 70 145 Z"
      fill={stoneLight} stroke={ink} stroke-width="0.6"
    />
    <!-- Shelving rock — the projecting ledge that the cascade pours over -->
    <path
      d="M 8 125 L 4 122 L 70 122 L 66 125 Z"
      fill={stoneMid} stroke={ink} stroke-width="0.6"
    />
    <!-- The shelf shadow underneath — defines the alcove -->
    <path
      d="M 8 125 Q 10 142 22 142 L 52 142 Q 64 142 66 125 Z"
      fill={stoneDark} stroke={ink} stroke-width="0.5" opacity="0.85"
    />

    <!-- WATERFALL — falling 10-12 ft from the lip into the basin -->
    <g>
      <!-- main cascade — ribbons of water -->
      <path d="M 30 122 L 28 158" stroke={LMK.white} stroke-width="2.5" fill="none" opacity="0.9" />
      <path d="M 36 122 L 34 158" stroke={LMK.white} stroke-width="3" fill="none" opacity="0.9" />
      <path d="M 42 122 L 40 158" stroke={LMK.white} stroke-width="2.5" fill="none" opacity="0.85" />
      <path d="M 48 122 L 46 158" stroke={LMK.white} stroke-width="2" fill="none" opacity="0.85" />
      <!-- shadow lines in the cascade -->
      <path d="M 32 124 L 30 156" stroke={LMK.skyHi} stroke-width="0.4" fill="none" opacity="0.7" />
      <path d="M 38 124 L 36 156" stroke={LMK.skyHi} stroke-width="0.4" fill="none" opacity="0.7" />
      <path d="M 44 124 L 42 156" stroke={LMK.skyHi} stroke-width="0.4" fill="none" opacity="0.7" />
    </g>

    <!-- Pool / basin at base -->
    <ellipse cx="38" cy="160" rx="22" ry="4" fill={water} stroke={ink} stroke-width="0.5" />
    <ellipse cx="38" cy="159" rx="18" ry="2.5" fill={LMK.skyHi} opacity="0.5" />
    <!-- splash ripples -->
    <ellipse cx="38" cy="160" rx="8" ry="1.2" fill="none" stroke={LMK.white} stroke-width="0.4" opacity="0.7" />
    <ellipse cx="38" cy="160" rx="14" ry="2" fill="none" stroke={LMK.white} stroke-width="0.3" opacity="0.5" />

    <!-- Carved-name etchings on the rock face — tiny dark marks -->
    <g opacity="0.7">
      <path d="M 12 130 L 13 132" stroke={ink} stroke-width="0.35" />
      <path d="M 14 131 L 15.5 131" stroke={ink} stroke-width="0.35" />
      <path d="M 17 130 L 17 132" stroke={ink} stroke-width="0.35" />
      <path d="M 56 130 L 57 132" stroke={ink} stroke-width="0.35" />
      <path d="M 58 131 L 59.5 131" stroke={ink} stroke-width="0.35" />
      <path d="M 60 130 L 61.5 132" stroke={ink} stroke-width="0.35" />
      <!-- "JFR" allusion -->
      <path d="M 14 116 L 14 119 M 13 116 L 15 116" stroke={ink} stroke-width="0.4" />
      <path d="M 17 116 L 17 119 M 17 116 L 19 116 M 17 117.5 L 18.5 117.5" stroke={ink} stroke-width="0.4" />
      <path d="M 21 116 L 21 119 M 21 116 L 23 116 M 21 117.5 L 22.5 117.5 M 21.5 117.5 L 23 119" stroke={ink} stroke-width="0.4" />
    </g>

    <!-- Tree growing over the alcove (oak — "monarch oak" near the spring) -->
    <g transform="translate(45, 100)">
      <line x1="0" y1="0" x2="-2" y2="-12" stroke={LMK.earthDark} stroke-width="1.4" />
      <ellipse cx="-4" cy="-18" rx="14" ry="11" fill={LMK.sageDark} stroke={ink} stroke-width="0.5" />
      <ellipse cx="2" cy="-22" rx="10" ry="8" fill={LMK.sage} stroke={ink} stroke-width="0.4" />
      <ellipse cx="-9" cy="-15" rx="8" ry="6" fill={LMK.sageLight} stroke={ink} stroke-width="0.4" opacity="0.85" />
    </g>

    <!-- Two small figures by the spring — pioneers admiring -->
    <g transform="translate(20, 172)">
      <ellipse cx="0" cy="-3" rx="1.0" ry="1.2" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
      <ellipse cx="0" cy="-4" rx="1.6" ry="0.35" fill={ink} />
      <path d="M -1.3 -2 L 1.3 -2 L 1 3 L -1 3 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
      <line x1="-0.6" y1="3" x2="-0.6" y2="6" stroke={ink} stroke-width="0.4" />
      <line x1="0.6" y1="3" x2="0.6" y2="6" stroke={ink} stroke-width="0.4" />
    </g>
    <g transform="translate(62, 172)">
      <ellipse cx="0" cy="-3" rx="1.0" ry="1.2" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
      <ellipse cx="0" cy="-4" rx="1.6" ry="0.35" fill={ink} />
      <path d="M -1.3 -2 L 1.3 -2 L 1 3 L -1 3 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
      <line x1="-0.6" y1="3" x2="-0.6" y2="6" stroke={ink} stroke-width="0.4" />
      <line x1="0.6" y1="3" x2="0.6" y2="6" stroke={ink} stroke-width="0.4" />
    </g>
  </g>

  <!-- Meadow campground -->
  <rect x="0" y="148" width="100" height="52" fill={LMK.parchment} opacity="0.55" />
  <rect x="200" y="148" width="160" height="52" fill={LMK.parchment} opacity="0.55" />
  <!-- trampled wagon swale -->
  <path d="M 0 178 Q 100 174 200 178 Q 300 174 360 180" stroke={LMK.earth} stroke-width="1" fill="none" opacity="0.4" />
  <path d="M 0 184 Q 100 182 200 184 Q 300 182 360 186" stroke={LMK.earth} stroke-width="0.7" fill="none" opacity="0.35" />

  <!-- Wagon camp — circle of wagons, fires -->
  <g>
    <!-- wagon 1 — left foreground -->
    <g transform="translate(20, 0)">
      <rect x="0" y="160" width="28" height="7" fill={LMK.earth} stroke={ink} stroke-width="0.5" />
      <path d="M 0 160 Q 14 145 28 160 Z" fill={LMK.white} stroke={ink} stroke-width="0.6" />
      <path d="M 0 160 Q 14 149 28 160" fill="none" stroke={inkSoft} stroke-width="0.3" />
      <circle cx="5" cy="170" r="3.5" fill="none" stroke={ink} stroke-width="0.5" />
      <circle cx="23" cy="170" r="3.5" fill="none" stroke={ink} stroke-width="0.5" />
    </g>
    <!-- wagon 2 — mid -->
    <g transform="translate(220, 0)">
      <rect x="0" y="158" width="30" height="8" fill={LMK.earth} stroke={ink} stroke-width="0.5" />
      <path d="M 0 158 Q 15 142 30 158 Z" fill={LMK.white} stroke={ink} stroke-width="0.6" />
      <path d="M 0 158 Q 15 146 30 158" fill="none" stroke={inkSoft} stroke-width="0.3" />
      <circle cx="5" cy="168" r="3.8" fill="none" stroke={ink} stroke-width="0.5" />
      <circle cx="25" cy="168" r="3.8" fill="none" stroke={ink} stroke-width="0.5" />
    </g>
    <!-- wagon 3 — back-right -->
    <g transform="translate(280, 0)" opacity="0.9">
      <rect x="0" y="160" width="26" height="7" fill={LMK.earth} stroke={ink} stroke-width="0.5" />
      <path d="M 0 160 Q 13 146 26 160 Z" fill={LMK.white} stroke={ink} stroke-width="0.5" />
      <circle cx="5" cy="168" r="3.4" fill="none" stroke={ink} stroke-width="0.4" />
      <circle cx="21" cy="168" r="3.4" fill="none" stroke={ink} stroke-width="0.4" />
    </g>
    <!-- wagon 4 — distant -->
    <g transform="translate(320, 0)" opacity="0.8">
      <rect x="0" y="161" width="22" height="6" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
      <path d="M 0 161 Q 11 149 22 161 Z" fill={LMK.white} stroke={ink} stroke-width="0.4" />
      <circle cx="4" cy="168" r="3" fill="none" stroke={ink} stroke-width="0.4" />
      <circle cx="18" cy="168" r="3" fill="none" stroke={ink} stroke-width="0.4" />
    </g>

    <!-- Cookfire 1 — between wagons -->
    <g transform="translate(70, 178)">
      <ellipse cx="0" cy="2" rx="3.5" ry="1" fill={LMK.earthDark} />
      <path d="M -2 2 L 0 -2 L 2 2 Z" fill={LMK.rust} />
      <path d="M -1 2 L 0 -1 L 1 2 Z" fill="#e8b830" />
      <!-- smoke -->
      <path d="M 0 -2 q -2 -4 1 -7 q 3 -3 0 -8" stroke={ink} stroke-width="0.5" fill="none" opacity="0.55" />
    </g>
    <!-- Cookfire 2 — back camp -->
    <g transform="translate(265, 178)">
      <ellipse cx="0" cy="2" rx="3" ry="1" fill={LMK.earthDark} />
      <path d="M -1.5 2 L 0 -1.5 L 1.5 2 Z" fill={LMK.rust} />
      <path d="M 0 -1.5 q -2 -4 1 -7 q 3 -3 0 -7" stroke={ink} stroke-width="0.4" fill="none" opacity="0.55" />
    </g>

    <!-- People around camp -->
    <g transform="translate(62, 186)">
      <ellipse cx="0" cy="-3" rx="1.0" ry="1.2" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
      <ellipse cx="0" cy="-4" rx="1.6" ry="0.35" fill={ink} />
      <path d="M -1.3 -2 L 1.3 -2 L 1 3 L -1 3 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
      <line x1="-0.6" y1="3" x2="-0.6" y2="6" stroke={ink} stroke-width="0.4" />
      <line x1="0.6" y1="3" x2="0.6" y2="6" stroke={ink} stroke-width="0.4" />
    </g>
    <g transform="translate(84, 186)">
      <ellipse cx="0" cy="-3" rx="1.0" ry="1.2" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
      <ellipse cx="0" cy="-4" rx="1.6" ry="0.35" fill={ink} />
      <path d="M -1.3 -2 L 1.3 -2 L 1 3 L -1 3 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
      <line x1="-0.6" y1="3" x2="-0.6" y2="6" stroke={ink} stroke-width="0.4" />
      <line x1="0.6" y1="3" x2="0.6" y2="6" stroke={ink} stroke-width="0.4" />
    </g>
    <g transform="translate(258, 186)">
      <ellipse cx="0" cy="-3" rx="1.0" ry="1.2" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
      <ellipse cx="0" cy="-4" rx="1.6" ry="0.35" fill={ink} />
      <path d="M -1.3 -2 L 1.3 -2 L 1 3 L -1 3 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
      <line x1="-0.6" y1="3" x2="-0.6" y2="6" stroke={ink} stroke-width="0.4" />
      <line x1="0.6" y1="3" x2="0.6" y2="6" stroke={ink} stroke-width="0.4" />
    </g>
    <g transform="translate(278, 186)">
      <ellipse cx="0" cy="-3" rx="1.0" ry="1.2" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
      <ellipse cx="0" cy="-4" rx="1.6" ry="0.35" fill={ink} />
      <path d="M -1.3 -2 L 1.3 -2 L 1 3 L -1 3 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
      <line x1="-0.6" y1="3" x2="-0.6" y2="6" stroke={ink} stroke-width="0.4" />
      <line x1="0.6" y1="3" x2="0.6" y2="6" stroke={ink} stroke-width="0.4" />
    </g>
    <g transform="translate(300, 186)">
      <ellipse cx="0" cy="-3" rx="1.0" ry="1.2" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
      <ellipse cx="0" cy="-4" rx="1.6" ry="0.35" fill={ink} />
      <path d="M -1.3 -2 L 1.3 -2 L 1 3 L -1 3 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
      <line x1="-0.6" y1="3" x2="-0.6" y2="6" stroke={ink} stroke-width="0.4" />
      <line x1="0.6" y1="3" x2="0.6" y2="6" stroke={ink} stroke-width="0.4" />
    </g>
  </g>

  <!-- Makeshift raft being built at the river's edge -->
  <g transform="translate(370, 168)">
    <!-- two hewn logs -->
    <ellipse cx="6" cy="2" rx="9" ry="1.5" fill={LMK.earthDark} stroke={ink} stroke-width="0.4" />
    <ellipse cx="6" cy="6" rx="9" ry="1.5" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
    <!-- lashing planks -->
    <rect x="-2" y="0" width="16" height="7" fill="none" stroke={ink} stroke-width="0.3" opacity="0.5" />
    <!-- worker figure -->
    <g transform="translate(20, 10)">
      <ellipse cx="0" cy="-3" rx="1.0" ry="1.2" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
      <ellipse cx="0" cy="-4" rx="1.6" ry="0.35" fill={ink} />
      <path d="M -1.3 -2 L 1.3 -2 L 1 3 L -1 3 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
      <line x1="-0.6" y1="3" x2="-0.6" y2="6" stroke={ink} stroke-width="0.4" />
      <line x1="0.6" y1="3" x2="0.6" y2="6" stroke={ink} stroke-width="0.4" />
    </g>
  </g>

  <!-- Caption — kept as part of the engraving -->
  <text x="240" y="195" text-anchor="middle"
        font-family="IM Fell English, Georgia, serif" font-size="8"
        fill={inkSoft} font-style="italic" opacity="0.85">
    Alcove Spring — Big Blue Crossing
  </text>
</g>
