<!--
  BigHillArt — mile ~1010, ID/WY border, descent into Bear River Valley.

  Theodore Talbot (Frémont expedition, 1843) called it \"the greatest
  impediment on the whole route from the United States to Fort Hall\" —
  a striking claim from someone who had crossed South Pass. The west
  face drops at roughly 25-30° toward the Bear River bottomland. Wagons
  were rough-locked (rear wheels chained as skids) and held back by
  hand-ropes. Bare sagebrush slope — NO trees on the descent face.

  Composition (per docs/historical-pass/13-landmark-visual-references/
  big_hill.md §3-5, default mid-morning descent):
   • Steep slope dominating center/right of frame
   • Wagon mid-descent with chained rear wheels (rough-lock)
   • 3 men on ropes braced behind, leaning back against grade
   • Two oxen straining ahead
   • Skid-gouge tracks (NOT rolling rut tracks) — straight twin channels
   • Bear River Valley below with cottonwood ribbon along river
   • Bare sagebrush hillside above (no trees)
   • Pale glint suggesting Bear Lake far south
   • Snow-capped mountains on SW horizon
   • Long morning shadows raking the slope
   • Caption quotes Margaret Frink 1850: \"slid along the ground\"

  NON-RENDERABLES per research §What NOT to render:
   - NO trees on descent slope (it's bare sagebrush steppe)
   - NO comfortable / gradual slope (must look precarious)
   - NO rolling wheel tracks (rough-locked wheels SKID, leave gouges)
   - NO McAuley Cutoff route (default is main steep trail)
   - NO modern US-30 infrastructure
   - NO Bear Lake close-up (it's a horizon glint)
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;

  // Palette per research §3-4: dry sagebrush steppe, high-altitude UV
  const skyHi = '#7a9ab0';            // ID high blue
  const ridgeCrest = '#9a8a60';
  const slope = '#a89058';            // sun-bleached sagebrush slope
  const slopeShadow = '#7a6840';      // shadow side (long morning shadows)
  const slopeLight = '#c8b070';
  const skidGouge = '#5e4a28';        // dark gouged earth from locked wheels
  const skidGougeLight = '#7a5a30';
  const sagebrush = '#8a9070';
  const sageDot = '#5a6a40';
  const valleyFloor = '#9aa860';      // green Bear River Valley below
  const cottonwood = '#4a6840';        // river ribbon cottonwood
  const cottonwoodLight = '#6a8850';
  const river = '#7a96a0';             // glimmer of Bear River
  const distantMtn = '#5a6878';        // SW snow-cap mountain
  const distantMtnSnow = '#c8c8c8';
  const bearLake = '#a8b8b0';          // pale glint S horizon
</script>

<g>
  <!-- SKY — high-altitude Idaho blue, few clouds -->
  <rect x="0" y="0" width={LMK_VIEW_W} height="50" fill={skyHi} opacity="0.92" />
  <rect x="0" y="40" width={LMK_VIEW_W} height="15" fill={LMK.paperWarm} opacity="0.35" />
  <g fill={LMK.white} opacity="0.55">
    <ellipse cx="80" cy="18" rx="36" ry="5" />
    <ellipse cx="380" cy="22" rx="44" ry="6" />
  </g>

  <!-- SW SNOW-CAPPED MOUNTAINS on the horizon (Palmer's \"snow-covered
       mountains to the southwest\") -->
  <path d="M 280 56 L 310 42 L 330 50 L 360 36 L 390 46 L 420 38 L 450 48 L 480 42 L 480 64 L 280 64 Z"
        fill={distantMtn} opacity="0.8" />
  <!-- snow caps -->
  <g stroke={distantMtnSnow} stroke-width="0.7" opacity="0.75">
    <line x1="305" y1="44" x2="315" y2="48" />
    <line x1="355" y1="38" x2="365" y2="42" />
    <line x1="385" y1="48" x2="395" y2="50" />
    <line x1="415" y1="40" x2="425" y2="44" />
  </g>

  <!-- BEAR LAKE GLINT — pale, far southern horizon -->
  <ellipse cx="200" cy="62" rx="50" ry="3" fill={bearLake} opacity="0.7" />

  <!-- DISTANT MOUNTAINS / sage ridges beyond Bear River Valley -->
  <path d="M 0 60 Q 100 56 200 62 Q 280 58 480 64 L 480 76 L 0 76 Z"
        fill={ridgeCrest} opacity="0.55" />

  <!-- BEAR RIVER VALLEY FLOOR — flat green bottom seen below the slope -->
  <rect x="0" y="76" width={LMK_VIEW_W} height="34" fill={valleyFloor} opacity="0.7" />

  <!-- BEAR RIVER ribbon with cottonwood fringe — bright in the valley -->
  <g>
    <!-- cottonwood line back -->
    <ellipse cx="80" cy="92" rx="50" ry="5" fill={cottonwood} opacity="0.85" />
    <ellipse cx="180" cy="94" rx="50" ry="5" fill={cottonwood} opacity="0.85" />
    <ellipse cx="280" cy="92" rx="50" ry="5" fill={cottonwood} opacity="0.85" />
    <ellipse cx="380" cy="94" rx="50" ry="5" fill={cottonwood} opacity="0.85" />
    <ellipse cx="455" cy="92" rx="30" ry="5" fill={cottonwood} opacity="0.85" />
    <!-- cottonwood highlights catching morning light -->
    <ellipse cx="180" cy="90" rx="30" ry="2" fill={cottonwoodLight} opacity="0.55" />
    <ellipse cx="380" cy="90" rx="30" ry="2" fill={cottonwoodLight} opacity="0.55" />
    <!-- river glimmer (narrow horizontal band where the river catches sky) -->
    <rect x="0" y="98" width={LMK_VIEW_W} height="2" fill={river} opacity="0.55" />
  </g>

  <!-- RIDGE CREST on the upper-right of frame (where the trail comes from).
       Convex curve at the top of the descent. -->
  <path d="M 320 56 Q 400 50 480 54 L 480 110 L 320 110 Z"
        fill={ridgeCrest} stroke={ink} stroke-width="0.4" />
  <!-- ridge highlight -->
  <path d="M 320 56 Q 400 50 480 54 L 480 64 Q 400 60 320 66 Z"
        fill={slopeLight} opacity="0.5" />

  <!-- THE STEEP SLOPE — dominant element. Drops from upper-right
       (ridge at ~y=110) to lower-left (valley at ~y=170), 25-30° angle. -->
  <path d="M 60 170 L 480 110 L 480 200 L 60 200 Z"
        fill={slope} stroke={ink} stroke-width="0.45" />
  <!-- shadow side (long morning shadows raking from upper-right) -->
  <path d="M 60 200 L 240 200 L 240 200 L 60 200 Z"
        fill={slopeShadow} opacity="0.4" />
  <!-- Light raking from upper right -->
  <path d="M 200 200 L 480 110 L 480 140 L 280 200 Z"
        fill={slopeLight} opacity="0.35" />

  <!-- SKID-GOUGE TRACKS — twin channels straight down the slope.
       Multiple parallel sets (from accumulated seasons of locked-wheel
       traffic). Per research §"distinctive visual features": these are
       gouges, NOT rolling tracks. -->
  <g stroke={skidGouge} stroke-width="1.2" fill="none" stroke-linecap="round">
    <!-- main central track set (from wagon currently descending) -->
    <path d="M 400 116 L 220 200" opacity="0.85" />
    <path d="M 405 116 L 226 200" opacity="0.85" />
    <!-- second wagon track set, slightly to the right (earlier passage) -->
    <path d="M 425 118 L 270 200" opacity="0.65" />
    <path d="M 430 118 L 276 200" opacity="0.65" />
    <!-- a third faded set (further right, older) -->
    <path d="M 445 120 L 320 200" opacity="0.5" />
    <path d="M 450 120 L 326 200" opacity="0.5" />
  </g>
  <!-- gouge highlight inside the main rut (suggesting depth) -->
  <g stroke={skidGougeLight} stroke-width="0.3" opacity="0.6">
    <path d="M 402 118 L 222 200" />
    <path d="M 407 118 L 228 200" />
  </g>

  <!-- SAGEBRUSH dots scattered on the slope (sparse — it's exposed) -->
  <g fill={sageDot} opacity="0.6">
    {#each Array(22) as _, i}
      {@const x = 100 + (i * 17) % 360}
      {@const y = 130 + ((i * 11) % 65)}
      <ellipse cx={x} cy={y} rx="1.4" ry="0.7" />
    {/each}
  </g>
  <!-- a few pale limestone outcrops -->
  <g fill={slopeLight} opacity="0.7">
    <ellipse cx="350" cy="148" rx="3" ry="1" />
    <ellipse cx="180" cy="180" rx="4" ry="1.2" />
    <ellipse cx="420" cy="156" rx="3" ry="0.9" />
  </g>

  <!-- WAGON MID-DESCENT — small, looking precarious on the steep slope.
       Tilted to match the grade angle, rear wheels chained (rough-lock). -->
  <g transform="translate(290 158) rotate(-22)">
    <!-- wagon body + canvas, tilted -->
    <rect x="-8" y="-3" width="16" height="3" fill={LMK.earth} stroke={ink} stroke-width="0.45" />
    <path d="M -8 -3 Q 0 -9 8 -3 Z" fill={LMK.white} stroke={ink} stroke-width="0.5" />
    <!-- front wheel (rolling) -->
    <circle cx="-5" cy="1.5" r="2.4" fill="none" stroke={ink} stroke-width="0.5" />
    <!-- REAR wheel (chained, locked, NOT rolling) -->
    <circle cx="5" cy="1.5" r="2.4" fill="none" stroke={ink} stroke-width="0.5" />
    <!-- chain wrap on rear wheel (visible diagonal lines suggesting wrap) -->
    <line x1="3" y1="-0.5" x2="7" y2="3.5" stroke={ink} stroke-width="0.5" />
    <line x1="4" y1="0" x2="6.5" y2="3" stroke={inkSoft} stroke-width="0.35" />
    <line x1="3.5" y1="-0.5" x2="6.5" y2="3" stroke={inkSoft} stroke-width="0.35" />
    <!-- two oxen ahead, straining -->
    <g transform="translate(-15 0)">
      <ellipse cx="0" cy="0" rx="3.5" ry="2.2" fill={LMK.earthDark} stroke={ink} stroke-width="0.35" />
      <line x1="-1" y1="2.2" x2="-2" y2="4.5" stroke={ink} stroke-width="0.3" />
      <line x1="1" y1="2.2" x2="2" y2="4.5" stroke={ink} stroke-width="0.3" />
    </g>
  </g>

  <!-- 3 MEN ON ROPES braced behind the wagon, leaning down-slope.
       Per research: \"the defining human action at this landmark.\" -->
  <g>
    <!-- ropes from wagon-rear up-slope to men -->
    <line x1="295" y1="156" x2="345" y2="138" stroke={LMK.earthDark} stroke-width="0.5" />
    <line x1="297" y1="157" x2="358" y2="142" stroke={LMK.earthDark} stroke-width="0.5" />
    <line x1="299" y1="158" x2="370" y2="146" stroke={LMK.earthDark} stroke-width="0.5" />
    <!-- man 1 (closest) — bent back, feet braced -->
    <g transform="translate(345 138) rotate(-22)">
      <ellipse cx="0" cy="0" rx="1" ry="2.8" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
      <ellipse cx="0" cy="-3.5" rx="0.7" ry="0.9" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
      <!-- legs braced -->
      <line x1="-0.5" y1="2.5" x2="-1.5" y2="5" stroke={ink} stroke-width="0.35" />
      <line x1="0.5" y1="2.5" x2="1.5" y2="5" stroke={ink} stroke-width="0.35" />
    </g>
    <!-- man 2 -->
    <g transform="translate(358 142) rotate(-22)">
      <ellipse cx="0" cy="0" rx="1" ry="2.8" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
      <ellipse cx="0" cy="-3.5" rx="0.7" ry="0.9" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
      <line x1="-0.5" y1="2.5" x2="-1.5" y2="5" stroke={ink} stroke-width="0.35" />
      <line x1="0.5" y1="2.5" x2="1.5" y2="5" stroke={ink} stroke-width="0.35" />
    </g>
    <!-- man 3 (furthest, smaller) -->
    <g transform="translate(370 146) rotate(-22)">
      <ellipse cx="0" cy="0" rx="0.9" ry="2.4" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
      <ellipse cx="0" cy="-3" rx="0.6" ry="0.8" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
    </g>
  </g>

  <!-- caption — quotes Frink 1850 -->
  <text x="240" y="194" text-anchor="middle"
        font-family="IM Fell English, Georgia, serif" font-size="7"
        fill={inkSoft} font-style="italic" opacity="0.9">
    Big Hill — &ldquo;slid along the ground&rdquo; (Margaret Frink, 1850)
  </text>
</g>
