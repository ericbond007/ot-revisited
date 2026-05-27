<!--
  SalmonFallsArt — mile ~1380, Snake River, Hagerman ID.

  The major Shoshone-Bannock salmon fishery on the Snake River. After
  weeks of sage-plain travel from Fort Hall, emigrants arrived to find
  an active village with dozens of drying racks heavy with split salmon
  — instant sensory abundance + immediate trade. Palmer 1845: \"The
  Indians have an abundance of them, which they very readily dispose
  of for hooks, powder, balls, clothing, calico and knives.\"

  Composition (per docs/historical-pass/13-landmark-visual-references/
  salmon_falls.md §3-5, default late-August mid-morning):
   - Snake River SERIES OF CATARACTS across full river width (NOT a
     single dramatic plunge — that's Shoshone Falls, different site)
   - White churning water over DARK BASALT shelves, multiple broken
     ledges; highest drop ~12 ft per Palmer
   - Blue-green deep pool below main cataract
   - Shoshone-Bannock camp on near (south) bank:
     * MAT LODGES (conical tule-mat construction) — NOT tipis
       (Plains-style hide tipis are wrong for Snake River Shoshone
       summer fishing camps)
     * Salmon drying racks — upright willow poles + horizontal rails
       with split salmon hanging in rows, pale orange-tan
     * Women processing fish; cooking-fire smoke
     * Figure with spear on rock outcrop at falls edge
   - Emigrant wagon group at river edge, trading; oxen drinking
   - Snake River canyon basalt bluffs background
   - Morning light makes white water sparkle
   - Caption quotes Palmer 1845

  NON-RENDERABLES per research:
   - NO modern Lower Salmon Falls Dam
   - NO single dramatic vertical waterfall (FLUX failure mode = Shoshone
     Falls). This is a WIDE cascade of multiple small drops
   - NO tipis for the Shoshone camp (mat lodges, not hide tipis)
   - NO empty scene without native people (the fishery IS the landmark)
   - NO bull-boats (those belong to Three Island / Fort Boise)
   - NO post-1870 features (irrigation, fish hatcheries, railroad)
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;

  // Palette per research §4
  const skyHi = '#7a9ab0';            // high desert ID blue
  const skyHaze = '#a8b8c0';
  const canyonBluff = '#7a6a4e';      // pale desert bluff above canyon
  const canyonBluffDark = '#5a4e36';
  const basalt = '#3a3a3a';           // dark charcoal volcanic rock
  const basaltMid = '#5a5a52';
  const basaltLight = '#7a7a72';
  const riverDeep = '#5a9aaa';        // blue-green deep pool
  const riverShallow = '#7a9a8a';     // greenish-gray over shallow basalt
  const whiteWater = '#f0f4f4';       // turbulent cascade
  const matLodge = '#a89878';         // tule-mat lodge — pale tan-grey
  const matLodgeShadow = '#6e5e44';
  const dryRack = '#7a5a30';          // peeled willow pole
  const dryRackPost = '#5a3a1a';
  const driedSalmon = '#c89858';      // split salmon drying, pale orange
  const driedSalmonHi = '#deb070';
  const cottonwood = '#5a7848';        // riparian green
  const cookSmoke = '#dcdcd4';
</script>

<g>
  <!-- SKY — high desert ID summer -->
  <rect x="0" y="0" width={LMK_VIEW_W} height="40" fill={skyHi} opacity="0.92" />
  <rect x="0" y="30" width={LMK_VIEW_W} height="14" fill={skyHaze} opacity="0.5" />

  <!-- FAR CANYON BLUFFS on the north side of the river -->
  <path d="M 0 44 Q 80 38 160 44 Q 240 36 320 42 Q 400 38 480 44 L 480 70 L 0 70 Z"
        fill={canyonBluff} stroke={inkSoft} stroke-width="0.4" opacity="0.85" />
  <!-- bluff shadow striations -->
  <g stroke={canyonBluffDark} stroke-width="0.35" fill="none" opacity="0.55">
    <path d="M 0 54 Q 120 50 240 54 Q 360 50 480 54" />
    <path d="M 0 62 Q 120 58 240 62 Q 360 58 480 62" />
  </g>
  <!-- some basalt cliff column markings -->
  <g stroke={basalt} stroke-width="0.35" opacity="0.5">
    <line x1="80" y1="44" x2="80" y2="65" />
    <line x1="180" y1="44" x2="180" y2="65" />
    <line x1="300" y1="44" x2="300" y2="65" />
    <line x1="400" y1="44" x2="400" y2="65" />
  </g>

  <!-- THE FALLS — succession of cataracts across full river width.
       Multiple broken ledges of dark basalt with white water flowing
       over them. NOT a single dramatic vertical plunge. -->
  <g>
    <!-- river surface ABOVE the main falls (upstream, deeper) -->
    <rect x="0" y="70" width={LMK_VIEW_W} height="14" fill={riverDeep} opacity="0.85" />
    <!-- subtle upstream-flow lines -->
    <g stroke={whiteWater} stroke-width="0.25" opacity="0.5">
      <line x1="20" y1="78" x2="80" y2="78" />
      <line x1="120" y1="76" x2="180" y2="76" />
      <line x1="220" y1="78" x2="280" y2="78" />
      <line x1="320" y1="76" x2="380" y2="76" />
      <line x1="420" y1="78" x2="470" y2="78" />
    </g>

    <!-- FIRST CATARACT step (upper) — dark basalt ledge with water spilling -->
    <path d="M 0 84 L 480 84 L 480 90 L 0 90 Z" fill={basalt} stroke={ink} stroke-width="0.4" />
    <!-- white water cascading over -->
    <g>
      <rect x="0" y="86" width="480" height="6" fill={whiteWater} opacity="0.7" />
      <!-- broken white-water foam patches -->
      <ellipse cx="60" cy="89" rx="22" ry="2" fill={whiteWater} opacity="0.85" />
      <ellipse cx="160" cy="89" rx="28" ry="2" fill={whiteWater} opacity="0.85" />
      <ellipse cx="260" cy="89" rx="24" ry="2" fill={whiteWater} opacity="0.85" />
      <ellipse cx="360" cy="89" rx="30" ry="2" fill={whiteWater} opacity="0.85" />
      <ellipse cx="440" cy="89" rx="22" ry="2" fill={whiteWater} opacity="0.85" />
    </g>

    <!-- INTERMEDIATE flow over a shallow shelf -->
    <rect x="0" y="92" width="480" height="6" fill={riverShallow} opacity="0.7" />
    <g stroke={whiteWater} stroke-width="0.3" opacity="0.6">
      <line x1="10" y1="96" x2="90" y2="96" />
      <line x1="130" y1="95" x2="200" y2="95" />
      <line x1="240" y1="96" x2="310" y2="96" />
      <line x1="350" y1="95" x2="420" y2="95" />
    </g>

    <!-- SECOND (main) CATARACT step — the highest drop (~12 ft).
         Dark basalt with the biggest white-water cascade -->
    <path d="M 0 98 L 480 98 L 480 108 L 0 108 Z" fill={basalt} stroke={ink} stroke-width="0.4" />
    <!-- larger white-water plumes for the main drop -->
    <g fill={whiteWater}>
      <ellipse cx="40" cy="104" rx="28" ry="4" opacity="0.9" />
      <ellipse cx="120" cy="104" rx="34" ry="4" opacity="0.9" />
      <ellipse cx="210" cy="104" rx="28" ry="4" opacity="0.9" />
      <ellipse cx="290" cy="104" rx="32" ry="4" opacity="0.9" />
      <ellipse cx="380" cy="104" rx="28" ry="4" opacity="0.9" />
      <ellipse cx="450" cy="104" rx="22" ry="4" opacity="0.9" />
    </g>
    <!-- visible boulders projecting above the cataract -->
    <g fill={basaltMid} stroke={ink} stroke-width="0.3">
      <ellipse cx="80" cy="100" rx="6" ry="3" />
      <ellipse cx="190" cy="100" rx="7" ry="3" />
      <ellipse cx="270" cy="100" rx="6" ry="3" />
      <ellipse cx="360" cy="100" rx="7" ry="3" />
    </g>

    <!-- DEEP POOL below the main cataract — blue-green -->
    <rect x="0" y="108" width="480" height="14" fill={riverDeep} opacity="0.9" />
    <!-- eddy texture -->
    <g stroke={whiteWater} stroke-width="0.3" opacity="0.5">
      <ellipse cx="60" cy="116" rx="20" ry="1" fill="none" />
      <ellipse cx="240" cy="118" rx="30" ry="1" fill="none" />
      <ellipse cx="400" cy="116" rx="22" ry="1" fill="none" />
    </g>

    <!-- THIRD lower cataract step -->
    <path d="M 0 122 L 480 122 L 480 128 L 0 128 Z" fill={basaltMid} stroke={inkSoft} stroke-width="0.35" />
    <g fill={whiteWater} opacity="0.7">
      <ellipse cx="100" cy="125" rx="20" ry="2" />
      <ellipse cx="240" cy="125" rx="25" ry="2" />
      <ellipse cx="380" cy="125" rx="22" ry="2" />
    </g>
  </g>

  <!-- SPEAR-FISHER on a basalt outcrop above the main cataract.
       Period detail per Bonneville 1832: spear-fishing from rocks. -->
  <g transform="translate(200 96)">
    <!-- figure with spear -->
    <ellipse cx="0" cy="0" rx="0.9" ry="2.5" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
    <ellipse cx="0" cy="-3.5" rx="0.7" ry="0.9" fill={LMK.paperWarm} stroke={ink} stroke-width="0.2" />
    <!-- spear extending forward over water -->
    <line x1="0.8" y1="-1" x2="6" y2="2" stroke={ink} stroke-width="0.45" />
  </g>

  <!-- NEAR (SOUTH) BANK — sandy / volcanic soil where camp + wagons sit -->
  <rect x="0" y="128" width={LMK_VIEW_W} height={LMK_VIEW_H - 128} fill={canyonBluff} opacity="0.85" />
  <rect x="0" y="172" width={LMK_VIEW_W} height="28" fill={canyonBluffDark} opacity="0.3" />

  <!-- COTTONWOOD RIPARIAN STRIP at the bank edge (shaded relief from
       sage desert) -->
  <g fill={cottonwood} opacity="0.85">
    <ellipse cx="40" cy="132" rx="20" ry="4" />
    <ellipse cx="100" cy="134" rx="22" ry="4" />
    <ellipse cx="430" cy="132" rx="22" ry="4" />
    <ellipse cx="470" cy="134" rx="14" ry="4" />
  </g>

  <!-- SHOSHONE-BANNOCK MAT LODGES (conical tule-mat construction).
       NOT hide tipis — pale tan-grey rounded cones with vertical mat
       weave texture. Camp clustered on the bank, mid-left. -->
  <g>
    <!-- lodge 1 (largest, foreground left) -->
    <g transform="translate(140 150)">
      <path d="M 0 0 L 8 12 L -8 12 Z" fill={matLodge} stroke={ink} stroke-width="0.45" />
      <!-- shadow side -->
      <path d="M 0 0 L 8 12 L 1 12 Z" fill={matLodgeShadow} opacity="0.5" />
      <!-- mat weave texture (vertical lines) -->
      <g stroke={matLodgeShadow} stroke-width="0.25" opacity="0.5">
        <line x1="-5" y1="8" x2="-4.5" y2="3" />
        <line x1="-2" y1="11" x2="-1.5" y2="3" />
        <line x1="2" y1="11" x2="1.5" y2="3" />
        <line x1="5" y1="8" x2="4.5" y2="3" />
      </g>
      <!-- smoke hole at top + thin smoke -->
      <path d="M 0 0 Q 1 -3 -0.5 -7 Q 1 -10 0 -14" stroke={cookSmoke} stroke-width="0.5" fill="none" opacity="0.6" />
    </g>
    <!-- lodge 2 -->
    <g transform="translate(165 152)">
      <path d="M 0 0 L 7 10 L -7 10 Z" fill={matLodge} stroke={ink} stroke-width="0.4" />
      <path d="M 0 0 L 7 10 L 1 10 Z" fill={matLodgeShadow} opacity="0.5" />
      <g stroke={matLodgeShadow} stroke-width="0.25" opacity="0.5">
        <line x1="-4" y1="7" x2="-3.5" y2="2" />
        <line x1="0" y1="9" x2="0" y2="2" />
        <line x1="4" y1="7" x2="3.5" y2="2" />
      </g>
    </g>
    <!-- lodge 3 (further back) -->
    <g transform="translate(110 156)">
      <path d="M 0 0 L 6 9 L -6 9 Z" fill={matLodge} stroke={ink} stroke-width="0.4" />
      <path d="M 0 0 L 6 9 L 1 9 Z" fill={matLodgeShadow} opacity="0.5" />
    </g>
    <!-- lodge 4 -->
    <g transform="translate(195 158)">
      <path d="M 0 0 L 6 9 L -6 9 Z" fill={matLodge} stroke={ink} stroke-width="0.4" />
      <path d="M 0 0 L 6 9 L 1 9 Z" fill={matLodgeShadow} opacity="0.5" />
    </g>
  </g>

  <!-- SALMON DRYING RACKS — the most distinctive cultural element.
       Upright poles + horizontal rails with split salmon hanging in
       rows. Tall enough to keep fish out of dog reach (~5 ft). -->
  <g>
    <!-- rack 1 (front, prominent) -->
    <g transform="translate(80 158)">
      <!-- vertical posts -->
      <line x1="-10" y1="0" x2="-10" y2="14" stroke={dryRackPost} stroke-width="0.7" />
      <line x1="0" y1="0" x2="0" y2="14" stroke={dryRackPost} stroke-width="0.7" />
      <line x1="10" y1="0" x2="10" y2="14" stroke={dryRackPost} stroke-width="0.7" />
      <!-- horizontal rails -->
      <line x1="-11" y1="2" x2="11" y2="2" stroke={dryRack} stroke-width="0.5" />
      <line x1="-11" y1="5" x2="11" y2="5" stroke={dryRack} stroke-width="0.5" />
      <line x1="-11" y1="8" x2="11" y2="8" stroke={dryRack} stroke-width="0.5" />
      <!-- split salmon hanging in rows -->
      <g fill={driedSalmon} stroke={dryRackPost} stroke-width="0.2">
        <rect x="-10" y="2" width="2" height="2.5" />
        <rect x="-7" y="2" width="2" height="2.5" />
        <rect x="-4" y="2" width="2" height="2.5" />
        <rect x="-1" y="2" width="2" height="2.5" />
        <rect x="2" y="2" width="2" height="2.5" />
        <rect x="5" y="2" width="2" height="2.5" />
        <rect x="8" y="2" width="2" height="2.5" />
        <rect x="-10" y="5" width="2" height="2.5" />
        <rect x="-7" y="5" width="2" height="2.5" />
        <rect x="-4" y="5" width="2" height="2.5" />
        <rect x="-1" y="5" width="2" height="2.5" />
        <rect x="2" y="5" width="2" height="2.5" />
        <rect x="5" y="5" width="2" height="2.5" />
        <rect x="8" y="5" width="2" height="2.5" />
      </g>
      <!-- highlight on a few catching morning light -->
      <g fill={driedSalmonHi}>
        <rect x="-7" y="2" width="2" height="1" />
        <rect x="-1" y="5" width="2" height="1" />
        <rect x="5" y="2" width="2" height="1" />
      </g>
    </g>

    <!-- rack 2 (mid-distance, behind lodges) -->
    <g transform="translate(225 162)">
      <line x1="-8" y1="0" x2="-8" y2="11" stroke={dryRackPost} stroke-width="0.6" />
      <line x1="0" y1="0" x2="0" y2="11" stroke={dryRackPost} stroke-width="0.6" />
      <line x1="8" y1="0" x2="8" y2="11" stroke={dryRackPost} stroke-width="0.6" />
      <line x1="-9" y1="2" x2="9" y2="2" stroke={dryRack} stroke-width="0.4" />
      <line x1="-9" y1="5" x2="9" y2="5" stroke={dryRack} stroke-width="0.4" />
      <g fill={driedSalmon} stroke={dryRackPost} stroke-width="0.2">
        <rect x="-8" y="2" width="1.5" height="2.2" />
        <rect x="-5.5" y="2" width="1.5" height="2.2" />
        <rect x="-3" y="2" width="1.5" height="2.2" />
        <rect x="-0.5" y="2" width="1.5" height="2.2" />
        <rect x="2" y="2" width="1.5" height="2.2" />
        <rect x="4.5" y="2" width="1.5" height="2.2" />
        <rect x="7" y="2" width="1.5" height="2.2" />
        <rect x="-8" y="5" width="1.5" height="2.2" />
        <rect x="-5.5" y="5" width="1.5" height="2.2" />
        <rect x="-3" y="5" width="1.5" height="2.2" />
        <rect x="-0.5" y="5" width="1.5" height="2.2" />
        <rect x="2" y="5" width="1.5" height="2.2" />
        <rect x="4.5" y="5" width="1.5" height="2.2" />
        <rect x="7" y="5" width="1.5" height="2.2" />
      </g>
    </g>

    <!-- rack 3 (smaller, far back) -->
    <g transform="translate(265 164)">
      <line x1="-6" y1="0" x2="-6" y2="9" stroke={dryRackPost} stroke-width="0.5" />
      <line x1="0" y1="0" x2="0" y2="9" stroke={dryRackPost} stroke-width="0.5" />
      <line x1="6" y1="0" x2="6" y2="9" stroke={dryRackPost} stroke-width="0.5" />
      <line x1="-7" y1="2" x2="7" y2="2" stroke={dryRack} stroke-width="0.35" />
      <g fill={driedSalmon} stroke={dryRackPost} stroke-width="0.15">
        <rect x="-6" y="2" width="1.2" height="1.8" />
        <rect x="-4" y="2" width="1.2" height="1.8" />
        <rect x="-2" y="2" width="1.2" height="1.8" />
        <rect x="0.5" y="2" width="1.2" height="1.8" />
        <rect x="2.5" y="2" width="1.2" height="1.8" />
        <rect x="4.5" y="2" width="1.2" height="1.8" />
      </g>
    </g>
  </g>

  <!-- WOMAN PROCESSING FISH at a stretched-hide work area near rack 1 -->
  <g transform="translate(70 176)">
    <ellipse cx="0" cy="0" rx="1" ry="2.4" fill={matLodgeShadow} stroke={ink} stroke-width="0.25" />
    <ellipse cx="0" cy="-3" rx="0.7" ry="0.9" fill={LMK.paperWarm} stroke={ink} stroke-width="0.2" />
    <!-- bent forward over work -->
    <line x1="-0.5" y1="-1" x2="-3" y2="-1.5" stroke={ink} stroke-width="0.3" />
  </g>

  <!-- COOKING FIRE with smoke -->
  <g transform="translate(150 175)">
    <ellipse cx="0" cy="1" rx="1.4" ry="0.5" fill={LMK.rust} opacity="0.85" />
    <path d="M 0 0 Q 1 -4 -1 -10 Q 2 -14 0 -22" stroke={cookSmoke} stroke-width="0.55" fill="none" opacity="0.55" />
  </g>

  <!-- EMIGRANT WAGON GROUP at river's edge right — trading -->
  <g>
    <g transform="translate(360 168)">
      <rect x="-7" y="-2.6" width="14" height="2.8" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
      <path d="M -7 -2.6 Q 0 -9 7 -2.6 Z" fill={LMK.white} stroke={ink} stroke-width="0.45" />
      <circle cx="-4" cy="1" r="2" fill="none" stroke={ink} stroke-width="0.4" />
      <circle cx="4" cy="1" r="2" fill="none" stroke={ink} stroke-width="0.4" />
    </g>
    <g transform="translate(395 172)">
      <rect x="-6" y="-2.4" width="12" height="2.6" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
      <path d="M -6 -2.4 Q 0 -8 6 -2.4 Z" fill={LMK.white} stroke={ink} stroke-width="0.45" />
      <circle cx="-3" cy="1" r="1.8" fill="none" stroke={ink} stroke-width="0.35" />
      <circle cx="3" cy="1" r="1.8" fill="none" stroke={ink} stroke-width="0.35" />
    </g>

    <!-- OX TEAM drinking at water's edge -->
    <g transform="translate(340 180)">
      <ellipse cx="0" cy="0" rx="3.5" ry="2" fill={LMK.earthDark} stroke={ink} stroke-width="0.35" />
      <line x1="-1.5" y1="2" x2="-2" y2="4.5" stroke={ink} stroke-width="0.3" />
      <line x1="1.5" y1="2" x2="2" y2="4.5" stroke={ink} stroke-width="0.3" />
      <!-- head lowered to water -->
      <path d="M -3.5 -0.5 L -5 1 L -4 2 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
    </g>
  </g>

  <!-- TRADING FIGURE — emigrant + Shoshone meeting at the bank between
       camp and wagons -->
  <g transform="translate(290 178)">
    <ellipse cx="0" cy="0" rx="1" ry="2.5" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
    <ellipse cx="0" cy="-3.5" rx="0.7" ry="0.9" fill={LMK.paperWarm} stroke={ink} stroke-width="0.2" />
  </g>
  <g transform="translate(300 178)">
    <ellipse cx="0" cy="0" rx="1" ry="2.5" fill={matLodgeShadow} stroke={ink} stroke-width="0.25" />
    <ellipse cx="0" cy="-3.5" rx="0.7" ry="0.9" fill={LMK.paperWarm} stroke={ink} stroke-width="0.2" />
  </g>

  <!-- caption — quotes Palmer 1845 trade observation -->
  <text x="240" y="194" text-anchor="middle"
        font-family="IM Fell English, Georgia, serif" font-size="6.5"
        fill={inkSoft} font-style="italic" opacity="0.92">
    Salmon Falls — &ldquo;they very readily dispose of [salmon] for hooks, powder, calico&rdquo; (Palmer, 1845)
  </text>
</g>
