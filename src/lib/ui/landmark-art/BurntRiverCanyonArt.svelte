<!--
  BurntRiverCanyonArt — mile ~1620, Baker Co. OR.

  The most-feared interior Oregon canyon. Joel Palmer Sept 1845: \"the
  most difficult road we have encountered since we started\" — narrow
  creek crossed every 200-300 yards, sidelong wagon traverses on canyon
  walls, dense brush so impenetrable it required axe-cutting.

  Composition (per docs/historical-pass/13-landmark-visual-references/
  burnt_river_canyon.md §3-5, default mid-morning mid-canyon):
   - Narrow canyon with high walls pressing in (ENCLOSURE is the
     defining feel — strip of sky above, walls on both sides)
   - Creek center: rocky-bottomed, rapid, with bright reflective patch
   - Dense riparian brush along banks (alder, birch, cottonwood, briar)
   - Trail axe-cut through brush
   - Wagon crossing the creek, oxen straining through rocky shallows
   - Second wagon on sidelong hillside traverse — tilted ~18 degrees,
     two men leaning on uphill side per Palmer's account
   - Canyon walls: left in shadow (dark schist), right in sun (oxidized
     volcanic reddish-brown)
   - Scrubby cedars on upper slopes
   - Broken wagon-tongue debris in foreground (per research: one of the
     few landmarks where trail debris is historically accurate)
   - Mood: grim determination

  Critical non-renderables per research:
   - NO open landscape (the canyon must PRESS IN)
   - NO peaceful picturesque ford (creek is rapid, cobble-bottomed)
   - NO lush verdant canyon (late-season dry palette above creek)
   - NO conifer forest (just scrub cedars upper, deciduous brush lower)
   - NO modern US-30 / Interstate
   - NO cheerful emigrants (grim determination)
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;

  // Palette per research §4 — dry late-summer, dark volcanic/metamorphic walls
  const skySlot = '#7a9ab0';          // narrow strip of OR sky
  const wallSun = '#6a3a2a';          // sun side oxidized volcanic, reddish-brown
  const wallSunHi = '#9a5a40';
  const wallShadow = '#4a4040';       // shadow side dark schist
  const wallShadowDeep = '#2e2828';
  const dryGrass = '#c8a848';         // grass above brush zone, straw-gold
  const scrubCedar = '#3a4e30';       // dark scrub cedar upper slopes
  const brush = '#5a6a40';            // dense riparian brush (alder/birch)
  const brushDark = '#3e4e30';
  const creekWater = '#7a96a0';       // cool clear water
  const creekStone = '#5a4e3a';       // cobble bottom
  const creekShallow = '#8aa8a8';     // reflective shallow
  const trailDust = '#a88858';
  const brokenWood = '#4a3220';
</script>

<g>
  <!-- NARROW SKY STRIP at top — about 15% of frame, the canyon's defining
       enclosure means the sky is a slot above, not a dominant element -->
  <rect x="0" y="0" width={LMK_VIEW_W} height="28" fill={skySlot} opacity="0.92" />
  <!-- a hint of soft cloud at the top -->
  <ellipse cx="240" cy="10" rx="100" ry="3" fill={LMK.white} opacity="0.4" />

  <!-- LEFT CANYON WALL — in SHADOW (dark schist).
       Rising from canyon floor (y~150) to upper rim (y~28). Almost
       vertical. -->
  <path d="M 0 28 L 100 28 Q 90 60 110 100 Q 130 130 150 150 L 150 200 L 0 200 Z"
        fill={wallShadow} stroke={ink} stroke-width="0.5" />
  <!-- darker shadow striations -->
  <g stroke={wallShadowDeep} stroke-width="0.4" fill="none" opacity="0.7">
    <path d="M 20 50 L 90 90" />
    <path d="M 10 100 L 100 130" />
    <path d="M 30 140 L 120 170" />
    <path d="M 0 70 L 80 110" />
  </g>
  <!-- scrub cedars on the upper-left rim -->
  <g fill={scrubCedar} opacity="0.85">
    <ellipse cx="30" cy="26" rx="6" ry="3" />
    <ellipse cx="55" cy="24" rx="5" ry="3" />
    <ellipse cx="80" cy="28" rx="4" ry="2.5" />
  </g>
  <!-- dry grass strip just below the rim -->
  <path d="M 0 28 L 100 28 Q 90 35 110 50 L 0 50 Z"
        fill={dryGrass} opacity="0.45" />

  <!-- RIGHT CANYON WALL — in SUN (oxidized volcanic reddish-brown).
       Rises from canyon floor up to rim. -->
  <path d="M 380 28 L 480 28 L 480 200 L 330 200 Q 350 170 360 140 Q 370 90 380 28 Z"
        fill={wallSun} stroke={ink} stroke-width="0.5" />
  <!-- sun-lit highlight on the right wall -->
  <path d="M 380 28 L 480 28 L 480 80 Q 420 70 380 90 Z"
        fill={wallSunHi} opacity="0.55" />
  <!-- volcanic rock fracture lines -->
  <g stroke={ink} stroke-width="0.35" fill="none" opacity="0.5">
    <path d="M 390 60 Q 420 90 410 140" />
    <path d="M 440 80 Q 450 120 430 160" />
    <path d="M 460 50 Q 470 100 460 180" />
  </g>
  <!-- scrub cedars on upper-right rim -->
  <g fill={scrubCedar} opacity="0.85">
    <ellipse cx="395" cy="26" rx="5" ry="3" />
    <ellipse cx="420" cy="24" rx="6" ry="3" />
    <ellipse cx="450" cy="26" rx="5" ry="3" />
  </g>
  <!-- dry grass strip just below right rim -->
  <path d="M 380 28 L 480 28 L 480 50 L 385 50 Z"
        fill={dryGrass} opacity="0.45" />

  <!-- DENSE RIPARIAN BRUSH along the canyon floor on both banks.
       Per research §"distinctive": birch, alder, bitter cottonwood,
       \"so impenetrable as to preclude ingress.\" -->
  <g>
    <!-- left bank brush -->
    <ellipse cx="170" cy="158" rx="35" ry="6" fill={brushDark} opacity="0.85" />
    <ellipse cx="200" cy="156" rx="30" ry="6" fill={brush} opacity="0.85" />
    <ellipse cx="220" cy="154" rx="20" ry="5" fill={brushDark} opacity="0.85" />
    <!-- right bank brush -->
    <ellipse cx="320" cy="158" rx="32" ry="6" fill={brushDark} opacity="0.85" />
    <ellipse cx="290" cy="156" rx="28" ry="6" fill={brush} opacity="0.85" />
    <ellipse cx="270" cy="154" rx="18" ry="5" fill={brushDark} opacity="0.85" />
  </g>

  <!-- CANYON FLOOR / TRAIL DUST — narrow strip between brush -->
  <rect x="150" y="160" width="180" height="40" fill={trailDust} opacity="0.85" />
  <!-- foreground deep shadow from canyon walls -->
  <path d="M 150 200 L 200 180 L 330 180 L 330 200 Z"
        fill={inkSoft} opacity="0.25" />

  <!-- THE CREEK — rapid, rocky, ten-yard width visible through the
       brush. Crosses center of frame. -->
  <g>
    <!-- creek main course -->
    <path d="M 170 168 Q 200 166 240 170 Q 280 174 320 168 L 320 178 L 170 178 Z"
          fill={creekWater} stroke={inkSoft} stroke-width="0.4" />
    <!-- bright shallow patch -->
    <ellipse cx="240" cy="172" rx="40" ry="2" fill={creekShallow} opacity="0.6" />
    <!-- cobble stones visible on bottom -->
    <g fill={creekStone} opacity="0.7">
      <circle cx="190" cy="174" r="1.2" />
      <circle cx="210" cy="176" r="0.9" />
      <circle cx="225" cy="173" r="1.1" />
      <circle cx="245" cy="175" r="1" />
      <circle cx="262" cy="174" r="1.3" />
      <circle cx="280" cy="176" r="0.9" />
      <circle cx="300" cy="173" r="1.1" />
    </g>
    <!-- flow crests -->
    <g stroke={LMK.white} stroke-width="0.3" opacity="0.5">
      <line x1="180" y1="170" x2="210" y2="170" />
      <line x1="240" y1="172" x2="270" y2="172" />
      <line x1="290" y1="170" x2="315" y2="170" />
    </g>
  </g>

  <!-- WAGON CROSSING THE CREEK — center, oxen mid-ford -->
  <g transform="translate(240 162)">
    <!-- wagon body, slightly tilted on uneven rocky bottom -->
    <g transform="rotate(-4)">
      <rect x="-8" y="-3.2" width="16" height="3" fill={LMK.earth} stroke={ink} stroke-width="0.45" />
      <path d="M -8 -3.2 Q 0 -10 8 -3.2 Z" fill={LMK.white} stroke={ink} stroke-width="0.5" />
      <circle cx="-5" cy="0.8" r="2.4" fill="none" stroke={ink} stroke-width="0.45" />
      <circle cx="5" cy="0.8" r="2.4" fill="none" stroke={ink} stroke-width="0.45" />
    </g>
    <!-- oxen in the water ahead -->
    <g transform="translate(-15 1)">
      <ellipse cx="0" cy="0" rx="3.5" ry="2.2" fill={LMK.earthDark} stroke={ink} stroke-width="0.35" />
      <line x1="-1" y1="2.2" x2="-2" y2="4.5" stroke={ink} stroke-width="0.3" />
      <line x1="1" y1="2.2" x2="2" y2="4.5" stroke={ink} stroke-width="0.3" />
    </g>
    <g transform="translate(-22 1)">
      <ellipse cx="0" cy="0" rx="3.2" ry="2" fill={LMK.earthDark} stroke={ink} stroke-width="0.35" />
    </g>
  </g>

  <!-- SECOND WAGON on sidelong hillside traverse — visible above and
       to the right, climbing the right canyon wall on an angled track.
       Tilted ~18° (the Palmer \"sidelong\" reality). Two figures leaning
       on uphill side. -->
  <g transform="translate(360 110) rotate(-18)">
    <!-- wagon body -->
    <rect x="-7" y="-2.5" width="14" height="2.8" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
    <path d="M -7 -2.5 Q 0 -9 7 -2.5 Z" fill={LMK.white} stroke={ink} stroke-width="0.45" />
    <circle cx="-4" cy="1" r="2.2" fill="none" stroke={ink} stroke-width="0.4" />
    <circle cx="4" cy="1" r="2.2" fill="none" stroke={ink} stroke-width="0.4" />
    <!-- two men on uphill (left) side leaning against wagon body -->
    <g transform="translate(-9 -1)">
      <ellipse cx="0" cy="0" rx="0.9" ry="2.5" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
      <ellipse cx="0" cy="-3.5" rx="0.7" ry="0.9" fill={LMK.paperWarm} stroke={ink} stroke-width="0.2" />
    </g>
    <g transform="translate(-7 1)">
      <ellipse cx="0" cy="0" rx="0.9" ry="2.5" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
      <ellipse cx="0" cy="-3.5" rx="0.7" ry="0.9" fill={LMK.paperWarm} stroke={ink} stroke-width="0.2" />
    </g>
  </g>
  <!-- the sidelong traverse track on the right wall (visible as
       diagonal dust line) -->
  <line x1="335" y1="135" x2="395" y2="85" stroke={trailDust} stroke-width="1.5" opacity="0.6" />

  <!-- BROKEN WAGON TONGUE debris on the near creek bank (per research:
       one of the few landmarks where trail debris is period-accurate) -->
  <g>
    <line x1="200" y1="186" x2="220" y2="184" stroke={brokenWood} stroke-width="1.4" />
    <!-- splintered end -->
    <line x1="220" y1="184" x2="223" y2="186" stroke={brokenWood} stroke-width="0.8" />
    <line x1="220" y1="184" x2="222" y2="182" stroke={brokenWood} stroke-width="0.6" />
    <!-- a discarded wheel rim -->
    <ellipse cx="240" cy="188" rx="6" ry="2.5" fill="none" stroke={brokenWood} stroke-width="0.5" opacity="0.8" />
  </g>

  <!-- caption — quotes Palmer 1845 -->
  <text x="240" y="194" text-anchor="middle"
        font-family="IM Fell English, Georgia, serif" font-size="6.5"
        fill={inkSoft} font-style="italic" opacity="0.9">
    Burnt River — &ldquo;the most difficult road we have encountered&rdquo; (Palmer, 1845)
  </text>
</g>
