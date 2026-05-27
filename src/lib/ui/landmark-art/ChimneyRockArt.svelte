<!--
  ChimneyRockArt.svelte — mile ~550, the most-mentioned landmark on the trail.
  ───────────────────────────────────────────────────────────────────────────
  WORKED PORT of src/chimney-rock-art.jsx → Svelte 5. Use this as the pattern
  for porting the other 17 landmark components.

  Translation rules:
    1. Each `<g>` block becomes Svelte markup verbatim. SVG is identical.
    2. JSX `LMK.<key>` constant references → import from landmark-art-tokens.
    3. Helper components inside the JSX file (e.g. SmallWagon below) become
       inline Svelte snippets in the same file. Don't extract them unless
       multiple landmark components share them.
    4. Captions (`<text>` at the bottom) stay in the SVG — they're part of
       the engraving. Don't move them to <figcaption>.
    5. `Object.assign(window, { ... })` at the end of the JSX is gone —
       Svelte's default export does the work.

  See LANDMARK_ART_CLAUDE.md for the full porting checklist.
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const stoneLight = '#d4c098';
  const stoneMid = '#b89a72';
  const stoneDark = '#7a5e38';

  // SmallWagon helper — distant prairie schooner, used 3× below + 1 outrider.
  // Kept as data so the markup stays readable; positions match the JSX original.
  const wagons = [
    { x: 88,  y: 172, opacity: 1    },
    { x: 148, y: 174, opacity: 0.95 },
    { x: 208, y: 176, opacity: 0.9  },
  ];
</script>

<g>
  <!-- FLUX backdrop — ht_landscape v2_2000 LoRA, painterly Hudson-River-
       School oil-on-canvas. Sits BENEATH the SVG overlay so the decorative
       elements (wagons, ridges, caption) still composite on top.
       (#1078 / #1093 first per-landmark E2E render.) -->
  <image
    href="/wagon-bg/landmarks/chimney_rock.webp?v=1"
    x="0" y="0" width={LMK_VIEW_W} height="200"
    preserveAspectRatio="xMidYMid slice" />

  <!-- Distant low ridges (suggest the bluff line of the valley) -->
  <path
    d="M 0 100 Q 60 96 130 100 Q 200 95 280 100 Q 360 95 440 100 Q 470 98 480 100 L 480 108 L 0 108 Z"
    fill={LMK.sage} opacity="0.4" />
  <path
    d="M 0 108 Q 80 104 160 108 Q 240 104 320 108 Q 400 104 480 108 L 480 116 L 0 116 Z"
    fill={LMK.sageDark} opacity="0.45" />

  <!-- HERO: the spire ─ Centered. Tip y≈30, base of spire y≈92, base of cone y≈158 -->
  <g>
    <!-- Conical pedestal — broad sloping mound, banded eroded clay -->
    <path
      d="M 168 158 Q 184 130 220 100 L 230 92 L 250 92 L 260 100 Q 296 130 312 158 Z"
      fill={stoneLight} stroke={ink} stroke-width="0.8" />
    <!-- erosion bands on the pedestal -->
    <g opacity="0.7">
      <path d="M 178 150 Q 240 144 302 150" stroke={stoneMid} stroke-width="0.8" fill="none" />
      <path d="M 184 142 Q 240 137 296 142" stroke={stoneMid} stroke-width="0.7" fill="none" />
      <path d="M 192 132 Q 240 128 288 132" stroke={stoneMid} stroke-width="0.6" fill="none" />
      <path d="M 200 122 Q 240 118 280 122" stroke={stoneMid} stroke-width="0.5" fill="none" />
      <path d="M 210 110 Q 240 107 270 110" stroke={stoneMid} stroke-width="0.5" fill="none" />
      <path d="M 168 158 Q 240 154 312 158" stroke={stoneDark} stroke-width="1" fill="none" opacity="0.5" />
    </g>
    <!-- Vertical erosion gulleys -->
    <g opacity="0.55">
      <path d="M 222 102 L 192 158" stroke={stoneDark} stroke-width="0.5" fill="none" />
      <path d="M 230 98 L 218 158" stroke={stoneDark} stroke-width="0.4" fill="none" />
      <path d="M 250 98 L 262 158" stroke={stoneDark} stroke-width="0.4" fill="none" />
      <path d="M 258 102 L 288 158" stroke={stoneDark} stroke-width="0.5" fill="none" />
    </g>
    <!-- Shadow side of the pedestal (right) -->
    <path
      d="M 240 92 L 250 92 L 260 100 Q 296 130 312 158 L 240 158 Z"
      fill={stoneMid} opacity="0.55" />

    <!-- The SPIRE — narrow tapered column rising above. Slightly asymmetric. -->
    <path
      d="M 234 92 L 230 70 L 228 50 L 230 32 L 234 30 L 240 30 L 244 32 L 246 50 L 248 70 L 250 92 Z"
      fill={stoneLight} stroke={ink} stroke-width="0.7" />
    <!-- shadow side of spire -->
    <path
      d="M 240 30 L 244 32 L 246 50 L 248 70 L 250 92 L 240 92 Z"
      fill={stoneMid} opacity="0.6" />
    <!-- fracture lines -->
    <path d="M 236 38 L 237 78" stroke={stoneDark} stroke-width="0.3" opacity="0.5" />
    <path d="M 242 50 L 243 90" stroke={stoneDark} stroke-width="0.3" opacity="0.4" />
    <!-- harder sandstone CAP at the very top — slightly darker -->
    <path d="M 234 30 L 240 28 L 246 30 L 244 33 L 236 33 Z" fill={stoneDark} opacity="0.6" />

    <!-- Atmospheric haze halo around the spire -->
    <ellipse cx="240" cy="60" rx="22" ry="42" fill={LMK.paperWarm} opacity="0.18" />
  </g>

  <!-- Birds far overhead -->
  <g opacity="0.55" stroke={ink} stroke-width="0.4" fill="none">
    <path d="M 80 38 q 2 -1.5 4 0 q 2 -1.5 4 0" />
    <path d="M 100 30 q 2 -1.2 3 0 q 2 -1.2 3 0" />
    <path d="M 360 44 q 2 -1.5 4 0 q 2 -1.5 4 0" />
    <path d="M 388 38 q 2 -1 3 0 q 2 -1 3 0" />
  </g>

  <!-- North Platte ribbon — distant, in the valley behind -->
  <g opacity="0.7">
    <path d="M 40 116 Q 200 118 360 116 Q 420 115 480 116" stroke={LMK.water} stroke-width="2" fill="none" />
    <path d="M 40 117 Q 200 119 360 117 Q 420 116 480 117" stroke="#5a7280" stroke-width="0.4" fill="none" />
    <ellipse cx="80"  cy="113" rx="4" ry="3" fill={LMK.sageDark} stroke={ink} stroke-width="0.3" />
    <ellipse cx="160" cy="114" rx="5" ry="3" fill={LMK.sageDark} stroke={ink} stroke-width="0.3" />
    <ellipse cx="340" cy="113" rx="4" ry="3" fill={LMK.sageDark} stroke={ink} stroke-width="0.3" />
    <ellipse cx="420" cy="114" rx="5" ry="3" fill={LMK.sageDark} stroke={ink} stroke-width="0.3" />
  </g>

  <!-- Plains foreground — sage and shortgrass, mostly empty -->
  <rect x="0" y="158" width={LMK_VIEW_W} height="42" fill={LMK.parchment} opacity="0.55" />
  <path d="M 0 174 Q 120 172 240 176 Q 360 172 480 176" stroke={LMK.earth} stroke-width="1"   fill="none" opacity="0.4"  />
  <path d="M 0 180 Q 120 178 240 182 Q 360 178 480 182" stroke={LMK.earth} stroke-width="0.7" fill="none" opacity="0.35" />
  <!-- sage clumps -->
  <g opacity="0.6">
    {#each [20, 64, 108, 152, 200, 296, 348, 396, 444] as cx, i}
      {@const cy = 168 + (i % 3) * 6}
      <g transform="translate({cx}, {cy})">
        <ellipse cx="0"    cy="0"  rx="3.5" ry="1.5" fill={LMK.sage}      stroke={ink} stroke-width="0.3" />
        <ellipse cx="-1.5" cy="-1" rx="1.8" ry="1"   fill={LMK.sageLight} stroke={ink} stroke-width="0.25" />
      </g>
    {/each}
  </g>

  <!-- Wagon train passing — small, gives scale to the spire -->
  <g>
    {#each wagons as w}
      <g transform="translate({w.x}, {w.y})" opacity={w.opacity}>
        <!-- 2-ox team -->
        {#each [0, 1] as i}
          <g transform="translate({-(i + 1) * 7 - 4}, 0)">
            <ellipse cx="0"   cy="2"   rx="2.6" ry="1.4" fill={i % 2 ? LMK.earth : LMK.earthLight} stroke={ink} stroke-width="0.3" />
            <ellipse cx="2.2" cy="1.5" rx="1.1" ry="0.9" fill={i % 2 ? LMK.earth : LMK.earthLight} stroke={ink} stroke-width="0.3" />
            <line x1="-1.5" y1="3" x2="-1.5" y2="4.5" stroke={ink} stroke-width="0.3" />
            <line x1="1"    y1="3" x2="1"    y2="4.5" stroke={ink} stroke-width="0.3" />
          </g>
        {/each}
        <!-- wagon -->
        <rect x="0" y="0" width="12" height="4" fill={LMK.earth} stroke={ink} stroke-width="0.3" />
        <path d="M 0 0 Q 6 -7 12 0 Z" fill={LMK.white} stroke={ink} stroke-width="0.4" />
        <circle cx="2.5" cy="5" r="1.6" fill="none" stroke={ink} stroke-width="0.3" />
        <circle cx="9.5" cy="5" r="1.6" fill="none" stroke={ink} stroke-width="0.3" />
      </g>
    {/each}
    <!-- outrider on horseback -->
    <g transform="translate(60, 174)">
      <ellipse cx="0"   cy="2"   rx="4"   ry="1.6" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
      <ellipse cx="3.5" cy="0.5" rx="1.4" ry="1.2" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
      <line x1="-2.5" y1="3" x2="-2.5" y2="6" stroke={ink} stroke-width="0.4" />
      <line x1="2.5"  y1="3" x2="2.5"  y2="6" stroke={ink} stroke-width="0.4" />
      <ellipse cx="0" cy="-2" rx="0.9" ry="1"   fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
      <ellipse cx="0" cy="-3" rx="1.4" ry="0.3" fill={ink} />
      <path d="M -1 -1.5 L 1 -1.5 L 0.8 2 L -0.8 2 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
    </g>
  </g>

  <!-- Caption — kept as part of the engraving -->
  <text x="240" y="194" text-anchor="middle"
        font-family="IM Fell English, Georgia, serif" font-size="8"
        fill={inkSoft} font-style="italic" opacity="0.85">
    Chimney Rock — &ldquo;a grand and splendid object&rdquo;
  </text>
</g>
