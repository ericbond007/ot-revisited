<!--
  FortWallaWallaArt.svelte — mile ~1670, HBC's "Gibraltar of the Columbia"

  Historical (post-1841 adobe rebuild):
    Originally Fort Nez Perces (NWC 1818); HBC took over 1821.
    At Wallula Gap on the COLUMBIA RIVER, just below mouth of Snake and Walla
    Walla rivers. Wide, dramatic basalt-bluff country, treeless.
    Wooden palisade burned 1841; rebuilt with adobe brick walls + wood-frame
    interior buildings. Local "wild rye" used in the bricks.
    Heavily fortified with bastions/cannons — known as Gibraltar of the
    Columbia. Through it passed every fur pelt from the inland districts,
    bound for Fort Vancouver and London.
    Indians (Cayuse, Walla Walla, Nez Perce, Umatilla) traded furs and horses;
    emigrants stopped here for desperately needed aid before The Dalles.

  Composition: tall adobe walls with cannon-bastion at one corner, pole-and-
  adobe gateway, the broad Columbia behind, basalt bluffs across the river,
  horse herds in foreground (HBC supplied horses for the brigades).
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const adobe = "#cba884";
  const adobeSh = "#8a6840";
  const adobeHi = "#decba0";
  const basalt = "#5a5a60";
  const basaltSh = "#3a3a44";
  const beam = "#6a4828";
</script>

{#snippet basicHorse(x: number, y: number, color: string)}
  <g transform="translate({x} {y})">
    <path d="M -6 -7 L -6 -10 L -4 -11 L 4 -11 L 6 -10 L 6 -7 L 4 -6 L -4 -6 Z" fill={color} stroke={ink} stroke-width="0.4" />
    <path d="M 4 -11 L 7 -14 L 9 -14 L 10 -12 L 8 -10 L 5 -9 Z" fill={color} stroke={ink} stroke-width="0.4" />
    <line x1="-4" y1="-6" x2="-4" y2="0" stroke={ink} stroke-width="0.55" />
    <line x1="-1" y1="-6" x2="-1" y2="0" stroke={ink} stroke-width="0.55" />
    <line x1="1.5" y1="-6" x2="1.5" y2="0" stroke={ink} stroke-width="0.55" />
    <line x1="4" y1="-6" x2="4" y2="0" stroke={ink} stroke-width="0.55" />
    <path d="M -6 -8 q -2 1 -2 4" stroke={ink} stroke-width="0.5" fill="none" />
  </g>
{/snippet}

<g>
  <!-- basalt bluffs across the Columbia -->
  <g>
    <!-- far ridge -->
    <path d="M 0 64 L 60 50 L 120 60 L 200 46 L 280 56 L 360 48 L 440 58 L 480 54 L 480 88 L 0 88 Z"
          fill={basalt} stroke={ink} stroke-width="0.55" />
    <!-- columnar basalt suggestion -->
    <g stroke={basaltSh} stroke-width="0.45" opacity="0.7">
      <line x1="32" y1="60" x2="34" y2="88" />
      <line x1="60" y1="56" x2="62" y2="88" />
      <line x1="92" y1="60" x2="94" y2="88" />
      <line x1="138" y1="56" x2="140" y2="88" />
      <line x1="176" y1="50" x2="178" y2="88" />
      <line x1="216" y1="52" x2="218" y2="88" />
      <line x1="256" y1="54" x2="258" y2="88" />
      <line x1="298" y1="50" x2="300" y2="88" />
      <line x1="336" y1="52" x2="338" y2="88" />
      <line x1="378" y1="50" x2="380" y2="88" />
      <line x1="420" y1="56" x2="422" y2="88" />
      <line x1="456" y1="54" x2="458" y2="88" />
    </g>
    <!-- talus skirt at base -->
    <path d="M 0 88 Q 240 92 480 88 L 480 96 L 0 96 Z" fill={basaltSh} opacity="0.7" />
  </g>

  <!-- Columbia River — broad mirror -->
  <g>
    <rect x="0" y="96" width={LMK_VIEW_W} height="22" fill={LMK.water} opacity="0.75" />
    <g stroke={LMK.white} stroke-width="0.4" opacity="0.5">
      <line x1="20" y1="104" x2="80" y2="103" />
      <line x1="120" y1="108" x2="200" y2="107" />
      <line x1="250" y1="104" x2="320" y2="105" />
      <line x1="360" y1="110" x2="440" y2="109" />
    </g>
    <!-- far bank shimmer line -->
    <line x1="0" y1="96" x2={LMK_VIEW_W} y2="96" stroke="#3a4a54" stroke-width="0.4" />
    <!-- HBC bateau on the river -->
    <g transform="translate(86 110)">
      <path d="M -8 0 Q 0 -3 8 0 L 6 2 L -6 2 Z" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
      <!-- paddlers -->
      <ellipse cx="-3" cy="-2" rx="0.7" ry="0.9" fill={LMK.earthDark} />
      <ellipse cx="0" cy="-2" rx="0.7" ry="0.9" fill={LMK.earthDark} />
      <ellipse cx="3" cy="-2" rx="0.7" ry="0.9" fill={LMK.earthDark} />
    </g>
  </g>

  <!-- HERO: adobe fort on the south bank -->
  <g>
    <path d="M 88 118 Q 240 116 392 118 L 392 122 L 88 122 Z" fill={LMK.parchmentSh} opacity="0.6" />

    <!-- corner bastion (left) — taller, with cannon -->
    <g>
      <rect x="100" y="80" width="22" height="42" fill={adobe} stroke={ink} stroke-width="0.7" />
      <rect x="115" y="86" width="7" height="36" fill={adobeSh} opacity="0.55" />
      <rect x="100" y="80" width="22" height="4" fill={beam} stroke={ink} stroke-width="0.5" />
      <!-- cannon poking from embrasure -->
      <rect x="118" y="92" width="8" height="2.6" fill={ink} />
      <circle cx="126" cy="93.3" r="1.1" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
      <!-- second embrasure -->
      <rect x="105" y="100" width="3" height="2.4" fill={LMK.earthDark} />
      <rect x="113" y="100" width="3" height="2.4" fill={LMK.earthDark} />
      <!-- roof — pyramidal -->
      <path d="M 98 80 L 111 70 L 124 80 Z" fill={beam} stroke={ink} stroke-width="0.55" />
    </g>

    <!-- curtain wall -->
    <rect x="122" y="96" width="180" height="26" fill={adobe} stroke={ink} stroke-width="0.7" />
    <!-- adobe brick courses -->
    <g stroke={adobeSh} stroke-width="0.3" opacity="0.55" fill="none">
      <path d="M 124 100 Q 214 98 302 100" />
      <path d="M 124 105 Q 214 103 302 105" />
      <path d="M 124 110 Q 214 108 302 110" />
      <path d="M 124 115 Q 214 113 302 115" />
      <path d="M 124 119 Q 214 117 302 119" />
    </g>
    <!-- timber cap -->
    <rect x="122" y="96" width="180" height="3" fill={beam} stroke={ink} stroke-width="0.4" />
    <!-- HBC flag from top of curtain wall -->
    <line x1="200" y1="96" x2="200" y2="74" stroke={ink} stroke-width="0.55" />
    <rect x="200" y="74" width="14" height="9" fill={LMK.redFlag} stroke={ink} stroke-width="0.4" />
    <rect x="200" y="74" width="5" height="4" fill="#1a3060" stroke={ink} stroke-width="0.3" />
    <line x1="200" y1="76" x2="205" y2="76" stroke={LMK.white} stroke-width="0.3" />
    <line x1="202.5" y1="74" x2="202.5" y2="78" stroke={LMK.white} stroke-width="0.3" />
    <!-- gate -->
    <rect x="208" y="106" width="14" height="16" fill={beam} stroke={ink} stroke-width="0.55" />
    <line x1="215" y1="107" x2="215" y2="121" stroke={ink} stroke-width="0.3" />
    <!-- lintel -->
    <rect x="206" y="104" width="18" height="2.5" fill={beam} stroke={ink} stroke-width="0.4" />

    <!-- corner bastion (right) -->
    <g>
      <rect x="302" y="80" width="22" height="42" fill={adobe} stroke={ink} stroke-width="0.7" />
      <rect x="317" y="86" width="7" height="36" fill={adobeSh} opacity="0.55" />
      <rect x="302" y="80" width="22" height="4" fill={beam} stroke={ink} stroke-width="0.5" />
      <rect x="307" y="100" width="3" height="2.4" fill={LMK.earthDark} />
      <rect x="315" y="100" width="3" height="2.4" fill={LMK.earthDark} />
      <path d="M 300 80 L 313 70 L 326 80 Z" fill={beam} stroke={ink} stroke-width="0.55" />
    </g>

    <!-- inner buildings peeking -->
    <g>
      <path d="M 138 96 L 138 90 L 156 90 L 156 96 Z" fill={beam} stroke={ink} stroke-width="0.45" />
      <path d="M 138 90 L 147 86 L 156 90 Z" fill={basaltSh} stroke={ink} stroke-width="0.4" />
      <path d="M 168 96 L 168 92 L 184 92 L 184 96 Z" fill={beam} stroke={ink} stroke-width="0.45" />
      <path d="M 168 92 L 176 88 L 184 92 Z" fill={basaltSh} stroke={ink} stroke-width="0.4" />
      <path d="M 232 96 L 232 90 L 252 90 L 252 96 Z" fill={beam} stroke={ink} stroke-width="0.45" />
      <path d="M 232 90 L 242 86 L 252 90 Z" fill={basaltSh} stroke={ink} stroke-width="0.4" />
      <path d="M 264 96 L 264 92 L 282 92 L 282 96 Z" fill={beam} stroke={ink} stroke-width="0.45" />
      <path d="M 264 92 L 273 88 L 282 92 Z" fill={basaltSh} stroke={ink} stroke-width="0.4" />
      <!-- chimney + smoke -->
      <rect x="170" y="84" width="2.4" height="4" fill={basaltSh} stroke={ink} stroke-width="0.3" />
      <path d="M 171 84 q -2 -3 0 -5 q 2 -3 0 -6" stroke={inkSoft} stroke-width="0.45" fill="none" opacity="0.6" />
    </g>

    <!-- sun-side highlight on adobe -->
    <rect x="122" y="96" width="6" height="26" fill={adobeHi} opacity="0.45" />
  </g>

  <!-- horse herd on flats -->
  <g>
    {@render basicHorse(360, 134, "#5a3a20")}
    {@render basicHorse(385, 136, "#3a2818")}
    {@render basicHorse(414, 134, "#7a4a26")}
    {@render basicHorse(444, 136, "#a07a4a")}
    {@render basicHorse(400, 150, "#3a2818")}
    {@render basicHorse(426, 152, "#5a3a20")}
  </g>

  <!-- trader figure & native trader at gate -->
  <g transform="translate(186 132)">
    <ellipse cx="0" cy="-4" rx="1" ry="1.1" fill={LMK.paperWarm} stroke={ink} stroke-width="0.3" />
    <path d="M -1.2 -3 L 1.2 -3 L 1.6 4 L -1.6 4 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
    <!-- tall hat -->
    <rect x="-1.2" y="-6" width="2.4" height="2.4" fill={ink} />
  </g>
  <g transform="translate(238 132)">
    <ellipse cx="0" cy="-4" rx="1" ry="1.1" fill={LMK.paperWarm} stroke={ink} stroke-width="0.3" />
    <path d="M -1.2 -3 L 1.2 -3 L 1.6 4 L -1.6 4 Z" fill={LMK.earth} stroke={ink} stroke-width="0.3" />
    <!-- feather -->
    <line x1="0" y1="-5" x2="0" y2="-8" stroke={ink} stroke-width="0.45" />
  </g>

  <!-- sage flat foreground -->
  <rect x="0" y="138" width={LMK_VIEW_W} height={LMK_VIEW_H - 138} fill={LMK.parchment} opacity="0.55" />
  <path d="M 0 168 Q 120 166 240 170 Q 360 168 480 172" stroke={LMK.earth} stroke-width="0.9" fill="none" opacity="0.4" />
  <g opacity="0.6">
    {#each [14, 50, 90, 130, 280, 320, 460] as x, i}
      <g transform="translate({x},{172 + (i % 2) * 4})">
        <ellipse cx="0" cy="0" rx="4" ry="1.6" fill={LMK.sage} stroke={ink} stroke-width="0.3" />
        <ellipse cx="-1.5" cy="-1" rx="2" ry="1" fill={LMK.sageLight} stroke={ink} stroke-width="0.25" />
      </g>
    {/each}
  </g>

  <!-- caption -->
  <text x="240" y="194" text-anchor="middle"
        font-family="IM Fell English, Georgia, serif" font-size="8"
        fill={inkSoft} font-style="italic" opacity="0.85">
    Fort Walla Walla — &ldquo;the Gibraltar of the Columbia&rdquo;
  </text>
</g>
