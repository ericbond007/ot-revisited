<!--
  RachelPattisonGraveArt — mile ~622, west side of Ash Hollow's canyon mouth, NE.

  Rachel Pattison, age 18, died of cholera June 19, 1849 — three months a bride.
  Her grave was the first named one on the trail many emigrants encountered;
  carved sandstone headstone (NOT a wooden cross), low ridge above the Ash
  Hollow spring camp, visible from the hollow floor. The visual register is
  elegiac, not lurid — grave in the picture, not the subject of it.

  Composition (per docs/historical-pass/13-landmark-visual-references/
  rachel_pattison_grave.md §4-5): wide shot from the hollow floor looking up
  toward the ridge mouth. Ash canopy frames the left half; the small headstone
  is a vertical element against the canyon rim and pale tableland sky on the
  right. Sandy hollow floor + spring line in foreground.

  Period gate: `abandonedBeforeYear: 1849` (already on master). Pre-1849 game
  starts walk past this point without the grave — the landscape stays.
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;

  // Hollow palette — June, lush; the named ash and cottonwood are the
  // hollow's signature trees.
  const ashGreen = '#6e8260';
  const ashGreenDark = '#4d5e44';
  const cottonwoodSilver = '#a8b696';
  const sandFloor = '#d8c084';
  const sandShadow = '#a88e58';
  // Sandstone palette — the headstone is the visual focal point but kept
  // small in frame; warm tan reading as carved stone (NOT wood).
  const sandstone = '#c8a76e';
  const sandstoneShadow = '#8e7240';
  // Dry tableland above the hollow rim — contrast against the green floor.
  const tableland = '#b8a070';
  const tablelandDark = '#8e7848';
</script>

<g>
  <!-- SKY — parchment, soft June morning -->
  <rect x="0" y="0" width={LMK_VIEW_W} height="40" fill={LMK.skyHi} opacity="0.85" />
  <rect x="0" y="34" width={LMK_VIEW_W} height="12" fill={LMK.paperWarm} opacity="0.5" />

  <!-- DISTANT TABLELAND HORIZON — beyond the canyon's western mouth -->
  <path d="M 0 46 Q 120 42 240 48 Q 360 42 480 46 L 480 56 L 0 56 Z"
        fill={tableland} opacity="0.65" stroke={inkSoft} stroke-width="0.4" />

  <!-- CANYON WEST WALL (left) — Ash Hollow's southern wall rising on the
       far left, falling away to expose the canyon mouth toward center -->
  <path d="M 0 36 Q 30 52 60 70 Q 80 88 90 110 L 90 200 L 0 200 Z"
        fill={tablelandDark} stroke={ink} stroke-width="0.45" opacity="0.9" />
  <!-- bedding/erosion striations on the west wall -->
  <g stroke={sandstoneShadow} stroke-width="0.35" fill="none" opacity="0.45">
    <path d="M 0 70 Q 30 76 60 90" />
    <path d="M 0 92 Q 30 100 60 116" />
    <path d="M 0 116 Q 30 124 70 142" />
  </g>

  <!-- THE LOW RIDGE — west side of canyon's mouth, where the grave sits.
       Lower and more rounded than the west wall; rises gently from the
       canyon floor on right of center, dies into the tableland horizon. -->
  <path d="M 220 88 Q 280 70 340 76 Q 400 80 480 84 L 480 130 L 220 130 Z"
        fill={tablelandDark} opacity="0.85" stroke={inkSoft} stroke-width="0.4" />
  <!-- ridge top highlight — morning light raking from upper-left -->
  <path d="M 230 88 Q 290 74 360 78 Q 420 82 470 86"
        fill="none" stroke={LMK.paperWarm} stroke-width="0.8" opacity="0.55" />

  <!-- HOLLOW FLOOR — sandy canyon bottom, spring-fed greenery rim -->
  <rect x="0" y="148" width={LMK_VIEW_W} height={LMK_VIEW_H - 148} fill={sandFloor} opacity="0.85" />
  <!-- spring line — winding moisture mark across the floor -->
  <path d="M 30 168 Q 100 164 180 170 Q 260 174 330 168 Q 400 164 480 170"
        fill="none" stroke={LMK.water} stroke-width="0.8" opacity="0.5" />
  <!-- sand shadow under west wall -->
  <path d="M 0 148 Q 60 156 110 152 L 110 200 L 0 200 Z"
        fill={sandShadow} opacity="0.35" />

  <!-- ASH CANOPY — left-frame framing element. The hollow's namesake.
       Compound foliage cluster + suggestion of trunks below. -->
  <g transform="translate(40 110)">
    <!-- back trunks (further into the hollow) -->
    <line x1="-20" y1="-20" x2="-22" y2="40" stroke={LMK.earthDark} stroke-width="1.1" opacity="0.7" />
    <line x1="-10" y1="-26" x2="-12" y2="42" stroke={LMK.earthDark} stroke-width="1.2" />
    <line x1="6" y1="-24" x2="4" y2="40" stroke={LMK.earthDark} stroke-width="1.0" />
    <line x1="20" y1="-22" x2="22" y2="42" stroke={LMK.earthDark} stroke-width="0.9" opacity="0.75" />
    <!-- canopy mass — three overlapping ellipses, lit on upper-left -->
    <ellipse cx="-8" cy="-22" rx="32" ry="20" fill={ashGreenDark} opacity="0.85" />
    <ellipse cx="14" cy="-28" rx="26" ry="18" fill={ashGreen} opacity="0.85" />
    <ellipse cx="-2" cy="-34" rx="22" ry="14" fill={cottonwoodSilver} opacity="0.7" />
    <!-- canopy highlight, top-left rake -->
    <ellipse cx="-12" cy="-36" rx="14" ry="6" fill={LMK.paperWarm} opacity="0.3" />
  </g>

  <!-- A SECOND, SMALLER COTTONWOOD CLUSTER mid-hollow, behind the ridge -->
  <g transform="translate(150 130)">
    <line x1="-2" y1="-12" x2="-2" y2="18" stroke={LMK.earthDark} stroke-width="0.7" opacity="0.6" />
    <ellipse cx="-2" cy="-14" rx="12" ry="8" fill={cottonwoodSilver} opacity="0.6" />
  </g>

  <!-- THE GRAVE — small in frame, on the low ridge top, slightly right of
       center. Earth mound + carved sandstone headstone. The single focal
       element; everything else is landscape framing it. -->
  <g transform="translate(320 86)">
    <!-- low rounded earth mound, fresh-ish (June 1849 → settled by 1850) -->
    <ellipse cx="0" cy="6" rx="9" ry="2.2" fill={LMK.earth} stroke={inkSoft} stroke-width="0.35" />
    <ellipse cx="0" cy="5" rx="9" ry="1.6" fill={LMK.earthLight} opacity="0.5" />
    <!-- carved sandstone headstone — small vertical slab with rounded top,
         set at the mound's head (uphill side). NOT a wooden cross. -->
    <path d="M -2.6 5 L -2.6 -6 Q -2.6 -8.4 0 -8.4 Q 2.6 -8.4 2.6 -6 L 2.6 5 Z"
          fill={sandstone} stroke={ink} stroke-width="0.45" />
    <!-- stone's shaded right edge -->
    <path d="M 1.4 -5.6 L 1.4 4.6 L 2.6 5 L 2.6 -6 Q 2.6 -7.6 1.8 -8.2 Z"
          fill={sandstoneShadow} opacity="0.6" />
    <!-- engraved text suggestion — 3 horizontal incised lines (NAME / DATE / AGE) -->
    <line x1="-1.8" y1="-5" x2="1.8" y2="-5" stroke={sandstoneShadow} stroke-width="0.3" />
    <line x1="-1.6" y1="-2" x2="1.6" y2="-2" stroke={sandstoneShadow} stroke-width="0.3" />
    <line x1="-1.4" y1="1" x2="1.4" y2="1" stroke={sandstoneShadow} stroke-width="0.3" />
  </g>

  <!-- DISTANT EMIGRANT CAMP IN HOLLOW — two wagons paused at the spring,
       very small for scale. Reinforces the grave's smallness in landscape. -->
  <g transform="translate(180 158)">
    <rect x="-4" y="-2" width="8" height="1.4" fill={LMK.earth} stroke={inkSoft} stroke-width="0.25" />
    <path d="M -4 -2 Q 0 -5.5 4 -2 Z" fill={LMK.white} stroke={ink} stroke-width="0.3" />
  </g>
  <g transform="translate(210 162)">
    <rect x="-3.5" y="-1.6" width="7" height="1.2" fill={LMK.earth} stroke={inkSoft} stroke-width="0.25" />
    <path d="M -3.5 -1.6 Q 0 -4.6 3.5 -1.6 Z" fill={LMK.white} stroke={ink} stroke-width="0.3" />
  </g>

  <!-- caption — restrained, quotes Nathan Pattison's nine-word diary entry -->
  <text x="240" y="194" text-anchor="middle"
        font-family="IM Fell English, Georgia, serif" font-size="7"
        fill={inkSoft} font-style="italic" opacity="0.85">
    Rachel Pattison — &ldquo;taken sick in the morning, died that night&rdquo;
  </text>
</g>
