<!--
  LoneElmCampgroundArt — mile ~40, Johnson Co. KS prairie.

  The first overnight camp out of Independence — emigrants' first night
  truly in open prairie. Named for the single surviving elm tree at the
  campground bench (the original grove was cut down by Santa Fe traders
  and early emigrants through the 1830s). By 1843 the elm was dead or
  dying; by 1845-1849 it was a stripped grey trunk, bark scored with
  travelers' names; by 1850 the trunk was gone.

  Composition (per docs/historical-pass/13-landmark-visual-references/
  lone_elm_campground.md §3-4, default 1845-1849 dusk view):
   • Wide open sky dominates upper half (golden dusk)
   • DEAD stripped elm — vertical grey trunk, left of center, no leaves
   • Wagon camp as half-circle of white-canvas tops on prairie bench
   • Multiple cookfire smoke plumes rising
   • Cottonwood creek bottom = dark horizontal ribbon in mid-frame
   • Tallgrass prairie ground — green-gold, knee-to-chest high

  Visual identity: SINGLE dead tree on flat prairie. Multiple trees or
  a living leafy elm = wrong (research file §"What NOT to render").
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;

  // Prairie palette per research file §3, dusk variant.
  const grassFresh = '#8a9a58';     // big bluestem May-June fresh green
  const grassDry = '#b8a860';        // drying-season gold-tan
  const grassShadow = '#5e6838';
  const creekTimber = '#4a7040';    // cottonwood/willow at creek bottom
  const creekTimberDark = '#2e4628';
  const deadElmGrey = '#8a8878';    // grey weathered dead trunk
  const deadElmDark = '#5e5c50';
  const skyDusk = '#dec8a4';        // amber dusk sky
  const skyDuskHi = '#c0a878';      // gold horizon
  const skyDuskLo = '#7e98a8';      // dusk blue, upper sky

  // Cookfire smoke plumes — positions across the wagon camp.
  const fires = [
    { x: 200, y: 140 },
    { x: 248, y: 142 },
    { x: 290, y: 138 },
    { x: 330, y: 144 },
    { x: 370, y: 140 },
  ];
</script>

<g>
  <!-- SKY — dusk gradient, blue upper to gold horizon -->
  <rect x="0" y="0" width={LMK_VIEW_W} height="60" fill={skyDuskLo} opacity="0.9" />
  <rect x="0" y="40" width={LMK_VIEW_W} height="40" fill={skyDusk} opacity="0.75" />
  <rect x="0" y="70" width={LMK_VIEW_W} height="20" fill={skyDuskHi} opacity="0.8" />
  <!-- a few high cumulus catching last light -->
  <g fill={LMK.paperWarm} opacity="0.65">
    <ellipse cx="120" cy="32" rx="40" ry="6" />
    <ellipse cx="350" cy="26" rx="50" ry="7" />
    <ellipse cx="370" cy="20" rx="30" ry="5" />
  </g>

  <!-- DISTANT PRAIRIE HORIZON — gently rolling, NOT table-flat -->
  <path d="M 0 92 Q 80 88 160 94 Q 240 88 320 94 Q 400 88 480 94 L 480 102 L 0 102 Z"
        fill={grassDry} opacity="0.6" />

  <!-- CREEK-BOTTOM TIMBER — dark horizontal band of cottonwood/willow,
       the "dark anchor below the pale grass" per research §5. -->
  <g>
    <!-- back layer of timber, slightly washed out -->
    <ellipse cx="60" cy="118" rx="50" ry="10" fill={creekTimberDark} opacity="0.7" />
    <ellipse cx="140" cy="116" rx="60" ry="11" fill={creekTimberDark} opacity="0.7" />
    <ellipse cx="240" cy="118" rx="55" ry="10" fill={creekTimberDark} opacity="0.7" />
    <ellipse cx="340" cy="116" rx="60" ry="11" fill={creekTimberDark} opacity="0.7" />
    <ellipse cx="430" cy="118" rx="50" ry="10" fill={creekTimberDark} opacity="0.7" />
    <!-- front layer — denser cottonwood crown -->
    <ellipse cx="100" cy="122" rx="55" ry="9" fill={creekTimber} opacity="0.85" />
    <ellipse cx="200" cy="124" rx="60" ry="10" fill={creekTimber} opacity="0.85" />
    <ellipse cx="300" cy="122" rx="55" ry="9" fill={creekTimber} opacity="0.85" />
    <ellipse cx="400" cy="124" rx="55" ry="10" fill={creekTimber} opacity="0.85" />
  </g>

  <!-- TALLGRASS PRAIRIE BENCH — the camp's ground plane. Catches golden
       dusk light on top, grades into shadow below. -->
  <rect x="0" y="128" width={LMK_VIEW_W} height={LMK_VIEW_H - 128} fill={grassFresh} opacity="0.9" />
  <rect x="0" y="128" width={LMK_VIEW_W} height="18" fill={grassDry} opacity="0.5" />
  <rect x="0" y="180" width={LMK_VIEW_W} height="20" fill={grassShadow} opacity="0.35" />
  <!-- grass tussock texture — short upright marks across the bench -->
  <g stroke={grassShadow} stroke-width="0.35" opacity="0.55">
    {#each Array(50) as _, i}
      {@const x = 6 + (i * 11) % 472}
      {@const y = 148 + ((i * 13) % 45)}
      <line x1={x} y1={y} x2={x} y2={y - 2 - (i % 3)} />
    {/each}
  </g>

  <!-- WAGON CAMP — half-circle arrangement on the bench, mid/right of frame.
       White canvas tops catching the last light. Loose corral form. -->
  <g>
    <!-- back arc of wagons (further from viewer) -->
    {#each [{ x: 200, y: 144 }, { x: 232, y: 142 }, { x: 264, y: 140 }, { x: 296, y: 140 }, { x: 328, y: 142 }, { x: 360, y: 144 }] as w}
      <g transform={`translate(${w.x} ${w.y})`}>
        <rect x="-6" y="-2" width="12" height="2.4" fill={LMK.earth} stroke={inkSoft} stroke-width="0.3" />
        <path d="M -6 -2 Q 0 -7 6 -2 Z" fill={LMK.white} stroke={ink} stroke-width="0.4" />
        <circle cx="-3" cy="1" r="1.6" fill="none" stroke={inkSoft} stroke-width="0.3" />
        <circle cx="3" cy="1" r="1.6" fill="none" stroke={inkSoft} stroke-width="0.3" />
      </g>
    {/each}
    <!-- front arc, slightly larger (closer to viewer) -->
    {#each [{ x: 218, y: 158 }, { x: 252, y: 162 }, { x: 290, y: 164 }, { x: 328, y: 162 }, { x: 362, y: 158 }] as w}
      <g transform={`translate(${w.x} ${w.y})`}>
        <rect x="-7" y="-2.4" width="14" height="2.8" fill={LMK.earth} stroke={ink} stroke-width="0.35" />
        <path d="M -7 -2.4 Q 0 -9 7 -2.4 Z" fill={LMK.white} stroke={ink} stroke-width="0.45" />
        <circle cx="-4" cy="1.2" r="2" fill="none" stroke={ink} stroke-width="0.35" />
        <circle cx="4" cy="1.2" r="2" fill="none" stroke={ink} stroke-width="0.35" />
      </g>
    {/each}
  </g>

  <!-- COOKFIRE SMOKE PLUMES — multiple fires; smoke drifts NE (research §
       prevailing SW wind). Each fire is a small ember + a thin column. -->
  {#each fires as f, i}
    <g>
      <!-- fire ember -->
      <ellipse cx={f.x} cy={f.y + 8} rx="1.2" ry="0.6" fill={LMK.rust} opacity="0.85" />
      <!-- smoke column — drifting up-right -->
      <path d={`M ${f.x} ${f.y + 6} Q ${f.x + 4 + i} ${f.y - 6} ${f.x + 12 + i * 2} ${f.y - 24}`}
            stroke={LMK.paperCool} stroke-width={1.2 - (i % 2) * 0.2}
            fill="none" opacity="0.55" />
      <path d={`M ${f.x + 1} ${f.y + 4} Q ${f.x + 6 + i} ${f.y - 8} ${f.x + 16 + i * 2} ${f.y - 28}`}
            stroke={LMK.white} stroke-width="0.5" fill="none" opacity="0.4" />
    </g>
  {/each}

  <!-- THE DEAD ELM — vertical grey trunk, left of center. Stripped of bark
       and branches; reads as a grey spike against the dusk sky. ~50-70 ft
       in reality — should dwarf the figure beside it at base. -->
  <g transform="translate(110 0)">
    <!-- main trunk, tapering -->
    <path d="M -2.2 178 L -1.8 60 L 1.8 60 L 2.2 178 Z"
          fill={deadElmGrey} stroke={ink} stroke-width="0.45" />
    <!-- shadow side (right) -->
    <path d="M 0 178 L 0 60 L 2.2 60 L 1.8 178 Z" fill={deadElmDark} opacity="0.55" />
    <!-- a couple stripped branch stubs near top -->
    <line x1="0" y1="78" x2="6" y2="72" stroke={deadElmGrey} stroke-width="0.7" />
    <line x1="0" y1="84" x2="-5" y2="80" stroke={deadElmGrey} stroke-width="0.6" />
    <line x1="0" y1="100" x2="-8" y2="96" stroke={deadElmGrey} stroke-width="0.5" />
    <line x1="0" y1="108" x2="6" y2="104" stroke={deadElmGrey} stroke-width="0.5" />
    <!-- bark-scored marks (carved names) suggested as small horizontal cuts -->
    <g stroke={deadElmDark} stroke-width="0.3" opacity="0.7">
      <line x1="-1.5" y1="130" x2="1.5" y2="130" />
      <line x1="-1.4" y1="138" x2="1.4" y2="138" />
      <line x1="-1.3" y1="146" x2="1.3" y2="146" />
      <line x1="-1.2" y1="154" x2="1.2" y2="154" />
    </g>
    <!-- elm base — small mound of stripped twigs at the trunk base -->
    <ellipse cx="0" cy="180" rx="6" ry="1.4" fill={LMK.earthDark} opacity="0.6" />

    <!-- single small figure at base for scale — "barely reaching first
         branch stub" per research §"Composition references" -->
    <g transform="translate(6 174)">
      <ellipse cx="0" cy="0" rx="1.2" ry="3" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
      <ellipse cx="0" cy="-4" rx="0.9" ry="1.1" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
    </g>
  </g>

  <!-- caption — quotes the 1849 forty-niner observation -->
  <text x="240" y="194" text-anchor="middle"
        font-family="IM Fell English, Georgia, serif" font-size="7"
        fill={inkSoft} font-style="italic" opacity="0.9">
    Lone Elm — &ldquo;all the branches have been cut from it&rdquo; (forty-niner, 1849)
  </text>
</g>
