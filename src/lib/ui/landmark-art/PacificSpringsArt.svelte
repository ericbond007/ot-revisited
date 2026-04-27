<!--
  PacificSpringsArt — mile ~915, first water flowing WEST of the divide

  Emerges in a marshy meadow just over South Pass. Pioneers drank, ceremoniously,
  from "the first water of the Pacific slope." Boggy ground, willows, wide
  open sage, distant Wind River foothills behind. A milestone of celebration.
  Composition: marshy spring rivulet, willow tufts, an emigrant family in
  a small ceremony, "1849" carved on a peg, distant Wind Rivers.
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const gold = "#d4a832";
</script>

<g>
  <!-- distant Wind River foothills -->
  <path d="M 0 60 L 50 48 L 110 56 L 180 44 L 240 54 L 300 46 L 360 56 L 420 48 L 480 56 L 480 88 L 0 88 Z"
        fill="#8a98a8" stroke={ink} stroke-width="0.5" opacity="0.75" />
  <path d="M 0 80 Q 80 76 160 80 Q 240 74 320 80 Q 400 76 480 80 L 480 92 L 0 92 Z"
        fill="#5a6878" opacity="0.55" />

  <!-- sage flat -->
  <rect x="0" y="92" width={LMK_VIEW_W} height={LMK_VIEW_H - 92} fill={LMK.parchment} opacity="0.5" />
  <g opacity="0.55">
    {#each [20, 70, 140, 380, 440] as x, i}
      <g transform="translate({x},{108 + (i % 2) * 4})">
        <ellipse cx="0" cy="0" rx="4" ry="1.6" fill={LMK.sage} stroke={ink} stroke-width="0.3" />
        <ellipse cx="-1.5" cy="-1" rx="2" ry="1" fill={LMK.sageLight} stroke={ink} stroke-width="0.25" />
      </g>
    {/each}
  </g>

  <!-- MARSHY MEADOW — slightly darker patch around the spring -->
  <g>
    <ellipse cx="240" cy="146" rx="180" ry="32" fill="#7a8c5a" opacity="0.4" />
    <ellipse cx="240" cy="148" rx="140" ry="22" fill="#9aae6a" opacity="0.35" />
    <!-- WILLOWS — clumps along marsh edge -->
    {#each [140, 180, 220, 260, 300, 340] as x, i}
      <g>
        <ellipse cx={x} cy={130 + (i % 3) * 2} rx="9" ry="6" fill={LMK.sageDark} stroke={ink} stroke-width="0.4" opacity="0.85" />
        <ellipse cx={x - 2} cy={128 + (i % 3) * 2} rx="4" ry="3" fill={LMK.sageLight} opacity="0.55" />
      </g>
    {/each}
    <!-- tussocks -->
    <g fill="#6a7838" stroke={ink} stroke-width="0.3" opacity="0.7">
      <ellipse cx="180" cy="158" rx="5" ry="1.4" />
      <ellipse cx="216" cy="160" rx="6" ry="1.4" />
      <ellipse cx="252" cy="162" rx="5" ry="1.4" />
      <ellipse cx="296" cy="160" rx="6" ry="1.4" />
      <ellipse cx="328" cy="158" rx="4" ry="1.3" />
    </g>
  </g>

  <!-- THE SPRING — a small clear pool with a rivulet flowing WEST (right) -->
  <g>
    <ellipse cx="220" cy="152" rx="14" ry="4" fill={LMK.water} opacity="0.85" stroke="#5a7280" stroke-width="0.5" />
    <ellipse cx="220" cy="150" rx="10" ry="2.4" fill="#a8c4c8" opacity="0.65" />
    <!-- tiny ripple -->
    <ellipse cx="222" cy="152" rx="2" ry="0.6" fill={LMK.white} opacity="0.7" />
    <!-- RIVULET going WEST -->
    <path d="M 234 152 Q 280 154 340 158 Q 400 161 480 164"
          stroke={LMK.water} stroke-width="2" fill="none" opacity="0.75" stroke-linecap="round" />
    <g stroke={LMK.white} stroke-width="0.4" opacity="0.55">
      <line x1="270" y1="155" x2="290" y2="155" />
      <line x1="350" y1="159" x2="380" y2="159" />
      <line x1="420" y1="162" x2="450" y2="163" />
    </g>
  </g>

  <!-- PEG with "PACIFIC" — a marker at spring's edge -->
  <g transform="translate(208 146)">
    <rect x="-0.8" y="-7" width="1.6" height="6" fill="#4a3220" stroke={ink} stroke-width="0.3" />
    <rect x="-3.5" y="-9" width="7" height="3" fill={LMK.paperWarm} stroke={ink} stroke-width="0.35" />
    <text x="0" y="-7" font-size="2.4" font-family="IM Fell English, Georgia, serif"
          fill={ink} text-anchor="middle">PACIFIC</text>
  </g>

  <!-- CELEBRATION GROUP — three figures with tin cups -->
  <g transform="translate(252 162)">
    <!-- figure 1 -->
    <g>
      <ellipse cx="0" cy="-6" rx="0.9" ry="1" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
      <path d="M -1.2 -5 L 1.2 -5 L 1.6 0 L -1.6 0 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
      <!-- cup raised -->
      <path d="M 1.6 -5 L 3.5 -7" stroke={ink} stroke-width="0.4" />
      <rect x="3.2" y="-8" width="1.4" height="1.4" fill={LMK.earthLight} stroke={ink} stroke-width="0.3" />
      <!-- hat -->
      <path d="M -1.6 -7 L 1.6 -7 L 1 -7.5 L -1 -7.5 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
    </g>
    <!-- figure 2 — woman in bonnet -->
    <g transform="translate(8 0)">
      <ellipse cx="0" cy="-6" rx="0.9" ry="1" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
      <path d="M -1.4 -5 L 1.4 -5 L 1.8 1 L -1.8 1 Z" fill={LMK.rust} stroke={ink} stroke-width="0.3" />
      <!-- bonnet -->
      <path d="M -1.4 -7 Q 0 -8.4 1.4 -7 L 1.4 -5.5 L -1.4 -5.5 Z" fill={LMK.white} stroke={ink} stroke-width="0.3" />
      <path d="M 1.6 -5 L 3.5 -6.5" stroke={ink} stroke-width="0.4" />
      <rect x="3.2" y="-7.5" width="1.4" height="1.4" fill={LMK.earthLight} stroke={ink} stroke-width="0.3" />
    </g>
    <!-- figure 3 — child -->
    <g transform="translate(16 1)">
      <ellipse cx="0" cy="-4" rx="0.7" ry="0.8" fill={LMK.paperWarm} stroke={ink} stroke-width="0.2" />
      <path d="M -1 -3.5 L 1 -3.5 L 1.2 0 L -1.2 0 Z" fill="#3a5a78" stroke={ink} stroke-width="0.25" />
    </g>
  </g>

  <!-- a wagon parked nearby -->
  <g transform="translate(380 168)">
    <rect x="-9" y="-5" width="18" height="3" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
    <path d="M -9 -5 Q 0 -13 9 -5 Z" fill={LMK.white} stroke={ink} stroke-width="0.45" />
    <circle cx="-5" cy="0" r="2.2" fill="none" stroke={ink} stroke-width="0.4" />
    <circle cx="5" cy="0" r="2.2" fill="none" stroke={ink} stroke-width="0.4" />
  </g>

  <!-- faint sun rays — celebratory glow -->
  <g opacity="0.4">
    <path d="M 240 100 L 200 50" stroke={gold} stroke-width="0.5" />
    <path d="M 240 100 L 240 50" stroke={gold} stroke-width="0.5" />
    <path d="M 240 100 L 280 50" stroke={gold} stroke-width="0.5" />
    <circle cx="240" cy="100" r="2" fill={gold} opacity="0.45" />
  </g>

  <text x="240" y="194" text-anchor="middle"
        font-family="IM Fell English, Georgia, serif" font-size="8"
        fill={inkSoft} font-style="italic" opacity="0.85">
    Pacific Springs — &ldquo;our first drink of Pacific water&rdquo;
  </text>
</g>
