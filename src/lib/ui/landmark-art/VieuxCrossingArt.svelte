<!--
  VieuxCrossingArt — mile 124, Pottawatomie Co. KS.

  Louis Vieux's (Métis Potawatomi-French) timber toll bridge over the
  Red Vermillion River. The crossing was difficult enough at ford that
  emigrants paid the $1-per-wagon toll gladly. In May 1849 a cholera
  epidemic struck a wagon train camped on the east bank — 45-50 deaths
  in one week. The grave cluster on the eastern rise above the bridge
  was the most-photographed feature of the site for every subsequent
  emigrant.

  Composition (per docs/historical-pass/13-landmark-visual-references/
  vieux_crossing.md §3-4, default 1849-1858 bridge-and-cemetery):
   • Oblique view (30-45°) of timber bridge over steep-banked Vermillion
   • Wagon queue on the western (left) prairie approach
   • Cottonwood corridor framing the river
   • Cholera grave cluster on eastern (right) rise — wooden markers,
     loose mounds, NO fence (the modern chain-link is post-period)
   • Louis Vieux's log cabin homestead small in mid-right
   • Tallgrass prairie above the corridor

  Critical non-renderables: NO covered bridge, NO masonry arch, NO
  modern infrastructure, NO formal enclosed cemetery, NO dry/low river
  (spring flood is why the crossing was hard).
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;

  const grass = '#9aa868';
  const grassDry = '#b8a868';
  const grassShadow = '#5a6a3a';
  const cottonwood = '#4a7040';
  const cottonwoodDark = '#2e4628';
  const river = '#7a6240';          // brown sediment-laden spring flood
  const riverShadow = '#564328';
  const bridgeTimber = '#5a3a1a';   // dark squared timber, weathered
  const bridgeTimberLight = '#8e6028';
  const cabinLog = '#5a3a20';
  const cabinChink = '#cab088';
  const graveMound = '#7a5a30';
  const graveMarker = '#a89878';    // weathered wood, grey-tan
</script>

<g>
  <!-- SKY — warm afternoon, mid-period 1850-ish -->
  <rect x="0" y="0" width={LMK_VIEW_W} height="55" fill={LMK.skyHi} opacity="0.92" />
  <rect x="0" y="40" width={LMK_VIEW_W} height="20" fill={LMK.paperWarm} opacity="0.5" />
  <g fill={LMK.white} opacity="0.55">
    <ellipse cx="60" cy="22" rx="34" ry="6" />
    <ellipse cx="80" cy="16" rx="22" ry="4" />
    <ellipse cx="380" cy="26" rx="40" ry="6" />
  </g>

  <!-- DISTANT ROLLING PRAIRIE HORIZON — both sides of corridor -->
  <path d="M 0 60 Q 60 56 130 62 Q 200 56 280 62 Q 350 56 410 62 Q 450 58 480 62 L 480 70 L 0 70 Z"
        fill={grassDry} opacity="0.65" />

  <!-- WESTERN PRAIRIE BENCH (left of river) — gentle rise from approach -->
  <path d="M 0 70 Q 60 78 130 88 L 150 130 L 0 130 Z"
        fill={grass} stroke={ink} stroke-width="0.4" />
  <!-- prairie shadow texture left -->
  <g stroke={grassShadow} stroke-width="0.3" opacity="0.5">
    {#each Array(18) as _, i}
      {@const x = 4 + (i * 8) % 140}
      {@const y = 96 + ((i * 11) % 28)}
      <line x1={x} y1={y} x2={x} y2={y - 2} />
    {/each}
  </g>

  <!-- EASTERN RISE (right of river) — higher than west bank, where
       Louis Vieux's cabin + cholera cemetery sit -->
  <path d="M 330 88 Q 380 76 430 72 Q 460 70 480 70 L 480 130 L 330 130 Z"
        fill={grassDry} stroke={ink} stroke-width="0.4" />
  <!-- subtle rise shading -->
  <path d="M 330 88 Q 380 76 430 72 L 430 92 Q 380 96 330 105 Z"
        fill={grass} opacity="0.55" />

  <!-- COTTONWOOD CORRIDOR — dark green canopy fringing the river on
       both banks, peeking above the bridge level -->
  <g>
    <!-- left bank cottonwood cluster -->
    <ellipse cx="100" cy="96" rx="40" ry="9" fill={cottonwood} opacity="0.85" />
    <ellipse cx="80" cy="92" rx="22" ry="7" fill={cottonwoodDark} opacity="0.85" />
    <ellipse cx="120" cy="90" rx="26" ry="7" fill={cottonwoodDark} opacity="0.8" />
    <!-- right bank cottonwood cluster -->
    <ellipse cx="370" cy="98" rx="44" ry="9" fill={cottonwood} opacity="0.85" />
    <ellipse cx="345" cy="94" rx="22" ry="7" fill={cottonwoodDark} opacity="0.85" />
    <ellipse cx="395" cy="92" rx="26" ry="7" fill={cottonwoodDark} opacity="0.8" />
  </g>

  <!-- RIVER CHANNEL — steep-banked trench cutting through the prairie.
       Brown sediment-laden spring flood, fast-moving. -->
  <!-- river surface viewed obliquely (downstream to upper-left) -->
  <path d="M 150 130 L 330 130 L 320 148 L 160 148 Z"
        fill={river} stroke={inkSoft} stroke-width="0.4" />
  <!-- bright crest line on water indicating flow speed -->
  <g stroke={LMK.white} stroke-width="0.3" opacity="0.5">
    <line x1="170" y1="138" x2="200" y2="138" />
    <line x1="220" y1="140" x2="260" y2="140" />
    <line x1="280" y1="138" x2="310" y2="138" />
  </g>
  <!-- river shadow under near bank -->
  <path d="M 160 148 L 320 148 L 318 150 L 162 150 Z" fill={riverShadow} opacity="0.6" />

  <!-- STEEP BANK FACES on both sides (exposed earth, ~8-12 ft IRL) -->
  <path d="M 130 92 L 150 130 L 160 148 L 140 148 Z"
        fill={LMK.earthDark} stroke={ink} stroke-width="0.4" opacity="0.9" />
  <path d="M 350 92 L 330 130 L 320 148 L 340 148 Z"
        fill={LMK.earthDark} stroke={ink} stroke-width="0.4" opacity="0.9" />
  <!-- bank texture striations -->
  <g stroke={inkSoft} stroke-width="0.3" opacity="0.5">
    <line x1="138" y1="100" x2="156" y2="142" />
    <line x1="146" y1="106" x2="160" y2="148" />
    <line x1="352" y1="100" x2="334" y2="142" />
    <line x1="344" y1="106" x2="324" y2="148" />
  </g>

  <!-- THE TIMBER TOLL BRIDGE — simple flat-deck plank-on-piling.
       NOT covered, NOT arched. Oblique view: deck angles slightly. -->
  <g>
    <!-- bridge deck (planks visible in foreshortened oblique) -->
    <path d="M 150 130 L 330 130 L 320 132 L 160 132 Z"
          fill={bridgeTimber} stroke={ink} stroke-width="0.5" />
    <!-- plank lines on deck -->
    <g stroke={inkSoft} stroke-width="0.3" opacity="0.65">
      <line x1="178" y1="130" x2="180" y2="132" />
      <line x1="206" y1="130" x2="208" y2="132" />
      <line x1="234" y1="130" x2="236" y2="132" />
      <line x1="262" y1="130" x2="264" y2="132" />
      <line x1="290" y1="130" x2="292" y2="132" />
    </g>
    <!-- bridge railing — simple thin rail along far side -->
    <line x1="150" y1="128" x2="330" y2="128" stroke={bridgeTimberLight} stroke-width="0.45" />
    <!-- piling supports descending into river -->
    <g stroke={bridgeTimber} stroke-width="0.8" fill="none">
      <line x1="200" y1="132" x2="200" y2="148" />
      <line x1="240" y1="132" x2="240" y2="148" />
      <line x1="280" y1="132" x2="280" y2="148" />
    </g>
  </g>

  <!-- WAGON ON THE BRIDGE — currently crossing -->
  <g transform="translate(240 127)">
    <rect x="-7" y="-2.4" width="14" height="2.6" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
    <path d="M -7 -2.4 Q 0 -8 7 -2.4 Z" fill={LMK.white} stroke={ink} stroke-width="0.45" />
    <circle cx="-4" cy="1" r="2" fill="none" stroke={ink} stroke-width="0.4" />
    <circle cx="4" cy="1" r="2" fill="none" stroke={ink} stroke-width="0.4" />
  </g>

  <!-- WAGON QUEUE on western prairie approach (left), waiting their turn -->
  <g>
    <!-- closer wagon -->
    <g transform="translate(80 116)">
      <rect x="-7" y="-2.4" width="14" height="2.8" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
      <path d="M -7 -2.4 Q 0 -8 7 -2.4 Z" fill={LMK.white} stroke={ink} stroke-width="0.45" />
      <circle cx="-4" cy="1" r="2" fill="none" stroke={ink} stroke-width="0.4" />
      <circle cx="4" cy="1" r="2" fill="none" stroke={ink} stroke-width="0.4" />
    </g>
    <!-- second in line, slightly further back -->
    <g transform="translate(50 110) scale(0.85)">
      <rect x="-7" y="-2.4" width="14" height="2.8" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
      <path d="M -7 -2.4 Q 0 -8 7 -2.4 Z" fill={LMK.white} stroke={ink} stroke-width="0.45" />
      <circle cx="-4" cy="1" r="2" fill="none" stroke={ink} stroke-width="0.4" />
      <circle cx="4" cy="1" r="2" fill="none" stroke={ink} stroke-width="0.4" />
    </g>
    <!-- third, distant -->
    <g transform="translate(24 106) scale(0.7)">
      <rect x="-7" y="-2.4" width="14" height="2.8" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
      <path d="M -7 -2.4 Q 0 -8 7 -2.4 Z" fill={LMK.white} stroke={ink} stroke-width="0.45" />
    </g>
  </g>

  <!-- VIEUX'S LOG CABIN — small, domestic; set back from the bridge on
       the eastern rise. Single-story, dark logs with light chinking,
       cookfire smoke rising from chimney -->
  <g transform="translate(420 92)">
    <!-- cabin body -->
    <rect x="-9" y="-6" width="18" height="8" fill={cabinLog} stroke={ink} stroke-width="0.45" />
    <!-- horizontal log/chink lines -->
    <g stroke={cabinChink} stroke-width="0.4" opacity="0.7">
      <line x1="-9" y1="-4" x2="9" y2="-4" />
      <line x1="-9" y1="-2" x2="9" y2="-2" />
      <line x1="-9" y1="0" x2="9" y2="0" />
    </g>
    <!-- roof -->
    <path d="M -10 -6 L 0 -11 L 10 -6 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.45" />
    <!-- door -->
    <rect x="-1.6" y="-3" width="3.2" height="5" fill={inkSoft} stroke={ink} stroke-width="0.3" />
    <!-- stone chimney + smoke -->
    <rect x="6" y="-11" width="2.5" height="6" fill={inkSoft} stroke={ink} stroke-width="0.3" />
    <path d="M 7 -12 Q 8.5 -18 6 -22 Q 4 -26 6 -32"
          stroke={LMK.paperCool} stroke-width="0.7" fill="none" opacity="0.6" />
  </g>

  <!-- CHOLERA GRAVE CLUSTER on eastern rise — loose mounds with wooden
       headboards, NO fence (the chain-link enclosure today is post-
       period). Most-photographed feature of the site for 1849+ travelers. -->
  <g>
    {#each [{ x: 350, y: 100 }, { x: 358, y: 102 }, { x: 368, y: 100 }, { x: 380, y: 104 }, { x: 390, y: 102 }, { x: 360, y: 110 }, { x: 374, y: 110 }, { x: 386, y: 112 }] as g, i}
      <!-- mound -->
      <ellipse cx={g.x} cy={g.y + 2.5} rx="2.8" ry="0.8" fill={graveMound}
               stroke={inkSoft} stroke-width="0.25" opacity="0.85" />
      <!-- wooden headboard -->
      <rect x={g.x - 0.6} y={g.y - 2} width="1.2" height="4" fill={graveMarker}
            stroke={ink} stroke-width="0.25" />
      <!-- a few have a tiny incised cross-line suggesting carving -->
      {#if i % 3 === 0}
        <line x1={g.x - 0.4} y1={g.y - 1} x2={g.x + 0.4} y2={g.y - 1}
              stroke={inkSoft} stroke-width="0.2" />
      {/if}
    {/each}
  </g>

  <!-- TALLGRASS PRAIRIE FOREGROUND below the bridge level (foreground
       continuation of the western bench) -->
  <rect x="0" y="148" width={LMK_VIEW_W} height={LMK_VIEW_H - 148} fill={grass} opacity="0.85" />
  <rect x="0" y="180" width={LMK_VIEW_W} height="20" fill={grassShadow} opacity="0.3" />

  <!-- caption — references the 1849 cholera (the period's defining event here) -->
  <text x="240" y="194" text-anchor="middle"
        font-family="IM Fell English, Georgia, serif" font-size="7"
        fill={inkSoft} font-style="italic" opacity="0.9">
    Vieux Crossing — &ldquo;camped near a grave&rdquo; (Celinda Hines, 1853)
  </text>
</g>
