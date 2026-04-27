<!--
  CourthouseJailArt.svelte — mile ~530, the FIRST big landmark on the plains.

  "Resembling the ruins of an old castle [which] rises abruptly from the
  plain… the voyagers have called it the Courthouse; but it looks
  infinitely more like the Capitol." Two distinct buttes — Courthouse Rock
  (larger, blocky, Capitol/castle-like silhouette) and the smaller Jail
  Rock just beside it. Both ~400 ft above the plain. Layered clay/sandstone
  in horizontal bands. The rocks were nicknamed "Castle / Capitol / Tower."

  Pioneers' first reaction: SHOCK at vertical features after weeks of flat
  plains. Many emigrants nooned (mid-day rested) at Pumpkin Creek nearby.

  Distinguishing visual marks:
    • Two formations side by side: big blocky Courthouse + smaller Jail
    • Both with FLAT TOPS (sandstone caps) — capitol-like silhouette
    • Strong horizontal layering — clay/sandstone/ash banding
    • Quadrilangular form (stepped, almost architectural)
    • Wagon noon camp at base — wagons in a loose group, oxen unyoked
    • Pumpkin Creek meadow with a few cottonwoods
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const stoneLight = "#c8b088";
  const stoneMid = "#a48058";
  const stoneDark = "#684830";

</script>

<g>
  <!-- Far horizon — flat prairie sweeping out either side -->
  <path
    d="M 0 110 Q 80 108 160 112 Q 240 108 320 112 Q 400 108 480 112 L 480 118 L 0 118 Z"
    fill={LMK.sage} opacity="0.45"
  />

  <!-- Pumpkin Creek meadow band — a slightly greener mid-ground -->
  <rect x="0" y="118" width={LMK_VIEW_W} height="20" fill={LMK.sage} opacity="0.35" />
  <!-- a few cottonwood clumps -->
  <g>
    <ellipse cx="36" cy="124" rx="10" ry="6" fill={LMK.sageDark} stroke={ink} stroke-width="0.3" />
    <ellipse cx="40" cy="120" rx="6" ry="5" fill={LMK.sage} stroke={ink} stroke-width="0.3" />
    <ellipse cx="404" cy="125" rx="10" ry="6" fill={LMK.sageDark} stroke={ink} stroke-width="0.3" />
    <ellipse cx="408" cy="121" rx="6" ry="5" fill={LMK.sage} stroke={ink} stroke-width="0.3" />
  </g>

  <!-- HERO: the two formations -->
  <!-- Composed slightly off-center to leave room for the noon camp on right.
       Courthouse Rock LEFT (bigger), Jail Rock RIGHT (smaller).
       Both have FLAT TOPS with sloping skirts of eroded clay. -->

  <!-- COURTHOUSE ROCK — the big "Capitol" silhouette -->
  <g>
    <!-- eroded skirt at base — broad sloping mound -->
    <path
      d="M 88 138 Q 100 120 130 110 L 220 110 Q 250 120 262 138 Z"
      fill={stoneLight} stroke={ink} stroke-width="0.7"
    />
    <!-- main blocky body — quadrilangular, stepped -->
    <path
      d="M 122 110 L 130 56 L 150 50 L 200 50 L 220 56 L 228 110 Z"
      fill={stoneLight} stroke={ink} stroke-width="0.8"
    />
    <!-- upper "Capitol-dome" subtle cap — flat top with slightly raised middle -->
    <path
      d="M 130 56 L 140 48 L 210 48 L 220 56 Z"
      fill={stoneMid} stroke={ink} stroke-width="0.7"
    />
    <!-- narrow flat-top platform -->
    <rect x="148" y="44" width="54" height="6" fill={stoneLight} stroke={ink} stroke-width="0.5" />
    <!-- tiny "tower-like" raised section in the middle (hint of dome) -->
    <rect x="166" y="38" width="18" height="6" fill={stoneMid} stroke={ink} stroke-width="0.5" />
    <path d="M 165 38 L 175 32 L 185 38 Z" fill={stoneDark} stroke={ink} stroke-width="0.5" opacity="0.85" />

    <!-- horizontal layering — strong banding signature -->
    <g opacity="0.7">
      <line x1="124" y1="68" x2="226" y2="68" stroke={stoneMid} stroke-width="0.5" />
      <line x1="124" y1="78" x2="226" y2="78" stroke={stoneMid} stroke-width="0.5" />
      <line x1="124" y1="88" x2="226" y2="88" stroke={stoneMid} stroke-width="0.5" />
      <line x1="124" y1="98" x2="226" y2="98" stroke={stoneMid} stroke-width="0.6" />
      <!-- darker basal band -->
      <line x1="120" y1="106" x2="230" y2="106" stroke={stoneDark} stroke-width="0.7" opacity="0.7" />
      <!-- skirt erosion bands -->
      <path d="M 92 132 Q 175 128 258 132" stroke={stoneMid} stroke-width="0.5" fill="none" />
      <path d="M 96 124 Q 175 120 254 124" stroke={stoneMid} stroke-width="0.4" fill="none" />
      <path d="M 102 116 Q 175 113 248 116" stroke={stoneMid} stroke-width="0.4" fill="none" />
    </g>

    <!-- shadow side of body (right) -->
    <path
      d="M 200 50 L 220 56 L 228 110 L 175 110 L 175 50 Z"
      fill={stoneMid} opacity="0.45"
    />
    <!-- vertical erosion gulleys on the skirt -->
    <g opacity="0.5">
      <path d="M 130 110 L 110 138" stroke={stoneDark} stroke-width="0.4" fill="none" />
      <path d="M 165 110 L 158 138" stroke={stoneDark} stroke-width="0.4" fill="none" />
      <path d="M 195 110 L 198 138" stroke={stoneDark} stroke-width="0.4" fill="none" />
      <path d="M 220 110 L 240 138" stroke={stoneDark} stroke-width="0.4" fill="none" />
    </g>
  </g>

  <!-- JAIL ROCK — smaller, blockier, just to the right -->
  <g>
    <!-- skirt -->
    <path
      d="M 280 138 Q 290 124 308 116 L 348 116 Q 366 124 376 138 Z"
      fill={stoneLight} stroke={ink} stroke-width="0.6"
    />
    <!-- squarer body — more prison-like -->
    <path
      d="M 304 116 L 308 70 L 348 70 L 352 116 Z"
      fill={stoneLight} stroke={ink} stroke-width="0.7"
    />
    <!-- flat top -->
    <rect x="306" y="64" width="44" height="6" fill={stoneMid} stroke={ink} stroke-width="0.5" />
    <!-- horizontal layering -->
    <g opacity="0.7">
      <line x1="306" y1="82" x2="350" y2="82" stroke={stoneMid} stroke-width="0.5" />
      <line x1="306" y1="92" x2="350" y2="92" stroke={stoneMid} stroke-width="0.5" />
      <line x1="306" y1="102" x2="350" y2="102" stroke={stoneMid} stroke-width="0.5" />
      <line x1="304" y1="112" x2="352" y2="112" stroke={stoneDark} stroke-width="0.6" opacity="0.7" />
      <path d="M 282 132 Q 328 128 374 132" stroke={stoneMid} stroke-width="0.4" fill="none" />
      <path d="M 286 124 Q 328 120 370 124" stroke={stoneMid} stroke-width="0.4" fill="none" />
    </g>
    <!-- shadow side -->
    <path
      d="M 332 70 L 348 70 L 352 116 L 332 116 Z"
      fill={stoneMid} opacity="0.45"
    />
    <!-- vertical gulleys -->
    <g opacity="0.5">
      <path d="M 312 116 L 296 138" stroke={stoneDark} stroke-width="0.35" fill="none" />
      <path d="M 348 116 L 360 138" stroke={stoneDark} stroke-width="0.35" fill="none" />
    </g>
  </g>

  <!-- A couple birds wheeling overhead -->
  <g opacity="0.55" stroke={ink} stroke-width="0.4" fill="none">
    <path d="M 60 38 q 2 -1.5 4 0 q 2 -1.5 4 0" />
    <path d="M 408 32 q 2 -1.2 3 0 q 2 -1.2 3 0" />
    <path d="M 422 40 q 2 -1.5 4 0 q 2 -1.5 4 0" />
  </g>

  <!-- Foreground — open shortgrass plain -->
  <rect x="0" y="138" width={LMK_VIEW_W} height="62" fill={LMK.parchment} opacity="0.55" />
  <!-- sage clumps -->
  <g opacity="0.6">
    {#each [16, 56, 84, 192, 232, 272, 412, 446] as x, i}
      {@const y = 152 + (i % 3) * 8}
      <g transform="translate({x}, {y})">
        <ellipse cx="0" cy="0" rx="3" ry="1.4" fill={LMK.sage} stroke={ink} stroke-width="0.3" />
        <ellipse cx="-1.2" cy="-0.8" rx="1.6" ry="0.9" fill={LMK.sageLight} stroke={ink} stroke-width="0.25" />
      </g>
    {/each}
  </g>
  <!-- trail ruts -->
  <path d="M 0 168 Q 120 166 240 170 Q 360 166 480 170" stroke={LMK.earth} stroke-width="1" fill="none" opacity="0.4" />
  <path d="M 0 174 Q 120 172 240 176 Q 360 172 480 176" stroke={LMK.earth} stroke-width="0.7" fill="none" opacity="0.35" />

  <!-- Wagon noon camp — loose group, oxen grazing -->
  <g>
    <!-- wagon 1 — left foreground -->
    <g transform="translate(80, 0)">
      <rect x="0" y="160" width="26" height="7" fill={LMK.earth} stroke={ink} stroke-width="0.5" />
      <path d="M 0 160 Q 13 145 26 160 Z" fill={LMK.white} stroke={ink} stroke-width="0.6" />
      <path d="M 0 160 Q 13 149 26 160" fill="none" stroke={inkSoft} stroke-width="0.3" />
      <circle cx="4" cy="170" r="3.4" fill="none" stroke={ink} stroke-width="0.5" />
      <circle cx="22" cy="170" r="3.4" fill="none" stroke={ink} stroke-width="0.5" />
      <circle cx="4" cy="170" r="0.9" fill={ink} />
      <circle cx="22" cy="170" r="0.9" fill={ink} />
    </g>
    <!-- wagon 2 — mid -->
    <g transform="translate(120, 0)" opacity="0.95">
      <rect x="0" y="161" width="24" height="6" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
      <path d="M 0 161 Q 12 147 24 161 Z" fill={LMK.white} stroke={ink} stroke-width="0.5" />
      <circle cx="4" cy="170" r="3" fill="none" stroke={ink} stroke-width="0.4" />
      <circle cx="20" cy="170" r="3" fill="none" stroke={ink} stroke-width="0.4" />
    </g>
    <!-- wagon 3 — back, smaller -->
    <g transform="translate(258, 0)" opacity="0.9">
      <rect x="0" y="160" width="22" height="6" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
      <path d="M 0 160 Q 11 147 22 160 Z" fill={LMK.white} stroke={ink} stroke-width="0.5" />
      <circle cx="4" cy="168" r="2.8" fill="none" stroke={ink} stroke-width="0.4" />
      <circle cx="18" cy="168" r="2.8" fill="none" stroke={ink} stroke-width="0.4" />
    </g>

    <!-- unyoked oxen grazing -->
    <g>
      {#each [{x: 156, y: 170}, {x: 168, y: 172}, {x: 178, y: 168}, {x: 220, y: 174}, {x: 232, y: 170}] as o, i}
        <g transform="translate({o.x}, {o.y})">
          <ellipse cx="0" cy="0" rx="3" ry="1.7" fill={i % 2 ? LMK.earth : LMK.earthLight} stroke={ink} stroke-width="0.35" />
          <!-- head down grazing -->
          <ellipse cx="2.8" cy="1.2" rx="1.4" ry="1" fill={i % 2 ? LMK.earth : LMK.earthLight} stroke={ink} stroke-width="0.3" />
          <line x1="-2" y1="1.7" x2="-2" y2="3.5" stroke={ink} stroke-width="0.4" />
          <line x1="1" y1="1.7" x2="1" y2="3.5" stroke={ink} stroke-width="0.4" />
        </g>
      {/each}
    </g>

    <!-- cookfire smoke -->
    <g transform="translate(106, 178)">
      <ellipse cx="0" cy="2" rx="2.5" ry="0.8" fill={LMK.earthDark} />
      <path d="M -1.5 2 L 0 -1 L 1.5 2 Z" fill={LMK.rust} />
      <path d="M 0 -1 q -1.5 -3 1 -6 q 2 -2.5 0 -6" stroke={ink} stroke-width="0.4" fill="none" opacity="0.55" />
    </g>

    <!-- People -->
    <g transform="translate(102, 186)">
      <ellipse cx="0" cy="-3" rx="1.0" ry="1.2" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
      <ellipse cx="0" cy="-4" rx="1.6" ry="0.35" fill={ink} />
      <path d="M -1.3 -2 L 1.3 -2 L 1 3 L -1 3 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
      <line x1="-0.6" y1="3" x2="-0.6" y2="6" stroke={ink} stroke-width="0.4" />
      <line x1="0.6" y1="3" x2="0.6" y2="6" stroke={ink} stroke-width="0.4" />
    </g>
    <g transform="translate(148, 184)">
      <ellipse cx="0" cy="-3" rx="1.0" ry="1.2" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
      <ellipse cx="0" cy="-4" rx="1.6" ry="0.35" fill={ink} />
      <path d="M -1.3 -2 L 1.3 -2 L 1 3 L -1 3 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
      <line x1="-0.6" y1="3" x2="-0.6" y2="6" stroke={ink} stroke-width="0.4" />
      <line x1="0.6" y1="3" x2="0.6" y2="6" stroke={ink} stroke-width="0.4" />
    </g>
    <g transform="translate(244, 184)">
      <ellipse cx="0" cy="-3" rx="1.0" ry="1.2" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
      <ellipse cx="0" cy="-4" rx="1.6" ry="0.35" fill={ink} />
      <path d="M -1.3 -2 L 1.3 -2 L 1 3 L -1 3 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
      <line x1="-0.6" y1="3" x2="-0.6" y2="6" stroke={ink} stroke-width="0.4" />
      <line x1="0.6" y1="3" x2="0.6" y2="6" stroke={ink} stroke-width="0.4" />
    </g>
    <g transform="translate(282, 186)">
      <ellipse cx="0" cy="-3" rx="1.0" ry="1.2" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
      <ellipse cx="0" cy="-4" rx="1.6" ry="0.35" fill={ink} />
      <path d="M -1.3 -2 L 1.3 -2 L 1 3 L -1 3 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
      <line x1="-0.6" y1="3" x2="-0.6" y2="6" stroke={ink} stroke-width="0.4" />
      <line x1="0.6" y1="3" x2="0.6" y2="6" stroke={ink} stroke-width="0.4" />
    </g>
  </g>

  <!-- Caption -->
  <text x="240" y="194" text-anchor="middle"
    font-family="IM Fell English, Georgia, serif" font-size="8"
    fill={inkSoft} font-style="italic" opacity="0.85">
    Courthouse &amp; Jail Rocks — &ldquo;the Capitol of Solitude&rdquo;
  </text>
</g>
