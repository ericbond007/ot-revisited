<!--
  MartinsCoveArt — mile ~855, Sweetwater Rocks, WY.

  Horseshoe-shaped granite cove in WY high desert ridge, 2 mi west of
  Devil's Gate. Site of the Nov 1856 Mormon Handcart Co. disaster.

  CRITICAL DESIGN NOTE (per docs/historical-pass/13-landmark-visual-
  references/martins_cove.md): the cove's MEANING postdates 1856.
  Pre-1856 the site was unremarkable open ground at the Sweetwater's
  first bend — no narrative weight, no name. The default render targets
  the SUMMER, EXTERIOR APPROACH view (which works for both pre-1856
  travelers passing through and post-1856 visitors stopping at the
  memorial). NO blizzard scene (that's the cliché the research file
  explicitly warns against). The code gates 'abandonedBeforeYear: 1856'
  per PR #158 so pre-1856 starts see the landscape only.

  Composition (per research §3-4, default summer exterior approach):
   • Wind River Range distant horizon NW (pale blue-grey)
   • Sweetwater Rocks ridge mid-frame
   • Horseshoe granite cove with walls visible from outside (3 walls
     curving), south-facing opening framing the valley beyond
   • Pale sand dune visible on interior west side (the cove's named
     interior feature per Stansbury 1849)
   • Sage floor inside cove + sagebrush plain in foreground
   • Two covered wagons halted in shade of the north granite wall
   • High Wyoming summer sky with cumulus

  NON-RENDERABLES per research §"What NOT to render":
   - NO blizzard disaster scene (the cliché)
   - NO LDS heritage infrastructure / Visitor Center
   - NO Fort Seminoe
   - NO dramatic canyon aesthetics — this is shelter, not Devil's Gate
   - NO water inside cove (the cove is dry)
   - NO pine trees (it's high desert)
   - NO handcarts in non-1856 scenes (anachronistic for default render)
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;

  const skyHi = '#7a9ab0';            // Wyoming high desert blue
  const windRiver = '#5a6878';         // distant range, blue-grey
  const windRiverHi = '#7e8898';
  const sweetwaterRidge = '#7a7458';   // mid-distance ridge
  const granite = '#a8a89c';           // pale grey Precambrian granite
  const graniteSh = '#6e6e62';         // shadow side
  const graniteHi = '#c8c8bc';         // highlight side
  const sandDune = '#d4c08c';          // interior pale sand
  const sandDuneSh = '#a89058';
  const sageFloor = '#a8a878';         // silver-grey-green sage
  const sageShadow = '#6a6a4e';
  const alkaliFlat = '#c4b888';
</script>

<g>
  <!-- SKY — high Wyoming blue, summer fair weather -->
  <rect x="0" y="0" width={LMK_VIEW_W} height="60" fill={skyHi} opacity="0.92" />
  <rect x="0" y="48" width={LMK_VIEW_W} height="18" fill={LMK.paperWarm} opacity="0.4" />
  <!-- cumulus -->
  <g fill={LMK.white} opacity="0.6">
    <ellipse cx="80" cy="22" rx="40" ry="6" />
    <ellipse cx="100" cy="16" rx="22" ry="5" />
    <ellipse cx="320" cy="26" rx="44" ry="7" />
    <ellipse cx="340" cy="20" rx="22" ry="4" />
    <ellipse cx="420" cy="14" rx="20" ry="4" />
  </g>

  <!-- WIND RIVER RANGE — distant NW horizon, blue-grey jagged ridge -->
  <path d="M 0 60 L 40 52 L 60 56 L 80 48 L 110 54 L 140 46 L 170 52 L 200 48 L 230 56 L 260 50 L 290 58 L 320 50 L 360 56 L 400 48 L 440 54 L 480 50 L 480 70 L 0 70 Z"
        fill={windRiver} opacity="0.7" />
  <!-- snow caps suggested on the peaks -->
  <g stroke={windRiverHi} stroke-width="0.4" opacity="0.6">
    <line x1="78" y1="48" x2="84" y2="50" />
    <line x1="138" y1="46" x2="144" y2="48" />
    <line x1="198" y1="48" x2="204" y2="50" />
    <line x1="318" y1="50" x2="324" y2="52" />
    <line x1="398" y1="48" x2="404" y2="50" />
  </g>

  <!-- SWEETWATER RIDGE in the middle distance (the larger Sweetwater
       Rocks formation that Martin's Cove is a notch in) -->
  <path d="M 0 70 Q 100 64 200 70 Q 300 64 400 70 Q 440 68 480 70 L 480 88 L 0 88 Z"
        fill={sweetwaterRidge} opacity="0.65" />

  <!-- GRANITE COVE WALLS — horseshoe shape opening southward toward
       the viewer. Three wall segments visible: north (left), back
       (center, the deepest part), south (right). All pale grey granite,
       smoothly rounded (Precambrian, weathered). The south-facing
       opening between the left wall and the right wall is where the
       wagons enter. -->
  <g>
    <!-- back wall (center, deepest) — tallest, most prominent -->
    <path d="M 140 90 Q 170 70 240 64 Q 310 68 340 88 L 340 130 L 140 130 Z"
          fill={granite} stroke={ink} stroke-width="0.5" />
    <!-- back wall shadow side (right half) -->
    <path d="M 240 64 Q 310 68 340 88 L 340 130 L 240 130 Z"
          fill={graniteSh} opacity="0.45" />
    <!-- back wall highlight (left half, catching morning light) -->
    <path d="M 140 90 Q 170 70 240 64 L 240 78 Q 170 84 140 100 Z"
          fill={graniteHi} opacity="0.5" />
    <!-- north wall (left side) — curves out toward viewer -->
    <path d="M 60 110 Q 90 100 140 90 L 140 130 L 60 130 Z"
          fill={granite} stroke={ink} stroke-width="0.5" />
    <path d="M 60 110 Q 90 100 140 90 L 140 110 Q 100 118 60 124 Z"
          fill={graniteHi} opacity="0.55" />
    <!-- south wall (right side) — curves out, smaller in frame -->
    <path d="M 340 88 Q 380 96 420 110 L 420 130 L 340 130 Z"
          fill={granite} stroke={ink} stroke-width="0.5" />
    <path d="M 340 88 Q 380 96 420 110 L 420 130 L 380 124 Z"
          fill={graniteSh} opacity="0.55" />
    <!-- weathering striations on the walls (rounded Precambrian texture) -->
    <g stroke={graniteSh} stroke-width="0.3" fill="none" opacity="0.4">
      <path d="M 70 116 Q 100 110 140 100" />
      <path d="M 150 102 Q 200 86 240 78" />
      <path d="M 250 76 Q 290 78 330 92" />
      <path d="M 350 98 Q 380 104 415 116" />
    </g>
  </g>

  <!-- PALE SAND DUNE on the interior west side of the cove (the named
       interior feature). Between the back wall and north wall. -->
  <path d="M 140 130 Q 180 122 220 124 Q 240 126 240 130 Z"
        fill={sandDune} stroke={inkSoft} stroke-width="0.4" />
  <path d="M 140 130 Q 180 122 220 124 L 220 130 Z"
        fill={sandDuneSh} opacity="0.5" />
  <!-- dune ripple lines -->
  <g stroke={sandDuneSh} stroke-width="0.3" opacity="0.5">
    <path d="M 150 128 Q 180 126 215 127" />
    <path d="M 160 129 Q 190 128 210 129" />
  </g>

  <!-- SAGE FLOOR inside the cove + opening foreground -->
  <rect x="0" y="130" width={LMK_VIEW_W} height={LMK_VIEW_H - 130} fill={sageFloor} opacity="0.85" />
  <rect x="0" y="180" width={LMK_VIEW_W} height="20" fill={sageShadow} opacity="0.3" />
  <!-- alkali patches in foreground (high desert dryness) -->
  <ellipse cx="120" cy="170" rx="35" ry="3" fill={alkaliFlat} opacity="0.5" />
  <ellipse cx="320" cy="174" rx="40" ry="3" fill={alkaliFlat} opacity="0.5" />
  <!-- scattered sage bushes (small dots) -->
  <g fill={sageShadow} opacity="0.55">
    {#each Array(30) as _, i}
      {@const x = 4 + (i * 17) % 472}
      {@const y = 140 + ((i * 11) % 56)}
      <ellipse cx={x} cy={y} rx="1.3" ry="0.7" />
    {/each}
  </g>

  <!-- TWO COVERED WAGONS halted in shade of north (left) granite wall.
       Per research: \"two covered wagons halted in the shade of the
       north granite wall, emigrants resting.\" Small in frame — the
       cove is the subject. -->
  <g transform="translate(110 144)">
    <rect x="-7" y="-2.5" width="14" height="2.8" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
    <path d="M -7 -2.5 Q 0 -8 7 -2.5 Z" fill={LMK.white} stroke={ink} stroke-width="0.45" />
    <circle cx="-4" cy="1" r="2" fill="none" stroke={ink} stroke-width="0.4" />
    <circle cx="4" cy="1" r="2" fill="none" stroke={ink} stroke-width="0.4" />
  </g>
  <g transform="translate(140 152)">
    <rect x="-7" y="-2.5" width="14" height="2.8" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
    <path d="M -7 -2.5 Q 0 -8 7 -2.5 Z" fill={LMK.white} stroke={ink} stroke-width="0.45" />
    <circle cx="-4" cy="1" r="2" fill="none" stroke={ink} stroke-width="0.4" />
    <circle cx="4" cy="1" r="2" fill="none" stroke={ink} stroke-width="0.4" />
  </g>

  <!-- A SMALL FIGURE near the wagons for human scale (emigrant standing
       by the wagons in the shade) -->
  <g transform="translate(125 150)">
    <ellipse cx="0" cy="0" rx="0.9" ry="2.5" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
    <ellipse cx="0" cy="-3.5" rx="0.7" ry="0.9" fill={LMK.paperWarm} stroke={ink} stroke-width="0.2" />
  </g>

  <!-- caption -->
  <text x="240" y="194" text-anchor="middle"
        font-family="IM Fell English, Georgia, serif" font-size="7"
        fill={inkSoft} font-style="italic" opacity="0.9">
    Martin's Cove — granite shelter on the Sweetwater, summer noon
  </text>
</g>
