<!--
  IceSloughArt — peat marsh on the Sweetwater where ice persists below sod

  Pioneers cut through 12-18 inches of soggy peat to find SOLID ICE underneath
  even in July. Marvel of the trail. Composition: marsh foreground, a man
  kneeling and lifting a slab of ice from a dug pit, sage flat & distant
  granite hills.
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const peat = "#6a5840";
  const peatDark = "#3a2c18";
  const ice = "#bfd6dc";
  const iceLight = "#e8f0f4";
</script>

<g>
  <path d="M 0 60 L 50 50 L 110 56 L 180 48 L 250 56 L 320 48 L 380 56 L 440 50 L 480 56 L 480 88 L 0 88 Z"
        fill="#9aa0aa" stroke={ink} stroke-width="0.4" opacity="0.7" />
  <rect x="0" y="88" width={LMK_VIEW_W} height={LMK_VIEW_H - 88} fill={LMK.parchment} opacity="0.5" />

  <!-- sage flat -->
  <g opacity="0.55">
    {#each [20, 70, 130, 350, 410, 460] as x, i}
      <ellipse cx={x} cy={108 + (i % 2) * 4} rx="3.5" ry="1.5" fill={LMK.sage} stroke={ink} stroke-width="0.3" />
    {/each}
  </g>

  <!-- MARSH — broad shallow boggy patch -->
  <g>
    <ellipse cx="240" cy="148" rx="220" ry="36" fill={peat} opacity="0.7" />
    <ellipse cx="240" cy="148" rx="180" ry="28" fill={peatDark} opacity="0.5" />
    <!-- sedges & cotton-grass tufts -->
    <g>
      {#each [60, 90, 130, 170, 200, 230, 260, 290, 320, 350, 390, 420] as x, i}
        <g transform="translate({x},{136 + (i % 3) * 4})">
          <line x1="0" y1="0" x2="0" y2="-5" stroke="#7a6a48" stroke-width="0.45" />
          <line x1="-1" y1="-1" x2="-1" y2="-5" stroke="#7a6a48" stroke-width="0.4" />
          <line x1="1" y1="-1" x2="1" y2="-5" stroke="#7a6a48" stroke-width="0.4" />
          {#if i % 3 === 0}
            <ellipse cx="0" cy="-6" rx="0.9" ry="0.6" fill={LMK.white} opacity="0.85" />
          {/if}
        </g>
      {/each}
    </g>
    <!-- small standing pools -->
    <ellipse cx="120" cy="156" rx="14" ry="2" fill={LMK.water} opacity="0.6" />
    <ellipse cx="350" cy="158" rx="16" ry="2" fill={LMK.water} opacity="0.6" />
  </g>

  <!-- DUG PIT with EXPOSED ICE -->
  <g transform="translate(240 156)">
    <!-- hole in peat -->
    <ellipse cx="0" cy="0" rx="22" ry="6" fill={peatDark} stroke={ink} stroke-width="0.55" />
    <ellipse cx="0" cy="-1" rx="20" ry="4.5" fill="#1a1208" />
    <!-- ice slab inside -->
    <path d="M -16 -1 Q -10 -3 -2 -2 Q 8 -3 14 -1 L 12 2 L -12 2 Z"
          fill={ice} stroke={ink} stroke-width="0.5" />
    <path d="M -14 -1.5 Q -6 -2.5 4 -2 Q 10 -2.5 12 -1.5"
          stroke={iceLight} stroke-width="0.5" fill="none" />
    <!-- shovel -->
    <line x1="-26" y1="-12" x2="-18" y2="-3" stroke="#4a3220" stroke-width="0.7" />
    <path d="M -29 -16 L -23 -16 L -22 -10 L -28 -10 Z" fill="#9a8a78" stroke={ink} stroke-width="0.4" />
  </g>

  <!-- MAN kneeling, lifting a slab of ice -->
  <g transform="translate(214 152)">
    <!-- legs -->
    <path d="M -1.4 0 L 1.4 0 L 1.8 4 L -1.8 4 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
    <!-- torso bent -->
    <path d="M -2 -2 L 2 -2 L 4 1 L -3 1 Z" fill={LMK.rust} stroke={ink} stroke-width="0.3" />
    <!-- head -->
    <ellipse cx="-2.5" cy="-3.5" rx="0.9" ry="1" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
    <!-- hat -->
    <path d="M -3.6 -4.2 L -1.4 -4.2 L -1.6 -4.6 L -3.4 -4.6 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
    <!-- arms reaching to ice slab -->
    <line x1="3" y1="0" x2="9" y2="2" stroke={ink} stroke-width="0.5" />
    <!-- small slab in his hand -->
    <rect x="9" y="0.5" width="6" height="3" fill={ice} stroke={ink} stroke-width="0.4" />
  </g>

  <!-- second figure with bucket -->
  <g transform="translate(290 154)">
    <path d="M -1.2 0 L 1.2 0 L 1.6 4 L -1.6 4 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
    <path d="M -1.4 -2 L 1.4 -2 L 1.6 1 L -1.6 1 Z" fill="#3a5a78" stroke={ink} stroke-width="0.3" />
    <ellipse cx="0" cy="-3.5" rx="0.9" ry="1" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
    <path d="M -1.1 -4.3 L 1.1 -4.3 L 0.8 -4.9 L -0.8 -4.9 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
    <!-- bucket -->
    <line x1="-1.6" y1="0" x2="-3.2" y2="2" stroke={ink} stroke-width="0.4" />
    <path d="M -4.4 2 L -2 2 L -2.4 4.4 L -4 4.4 Z" fill={LMK.earthLight} stroke={ink} stroke-width="0.4" />
    <path d="M -4.5 1.8 Q -3.2 1.2 -1.9 1.8" stroke={ink} stroke-width="0.35" fill="none" />
  </g>

  <!-- a wagon waiting on dry sage to the side -->
  <g transform="translate(420 138)">
    <rect x="-9" y="-5" width="18" height="3" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
    <path d="M -9 -5 Q 0 -13 9 -5 Z" fill={LMK.white} stroke={ink} stroke-width="0.45" />
    <circle cx="-5" cy="0" r="2.2" fill="none" stroke={ink} stroke-width="0.4" />
    <circle cx="5" cy="0" r="2.2" fill="none" stroke={ink} stroke-width="0.4" />
  </g>

  <text x="240" y="194" text-anchor="middle"
        font-family="IM Fell English, Georgia, serif" font-size="8"
        fill={inkSoft} font-style="italic" opacity="0.85">
    Ice Slough — &ldquo;clear ice, two feet thick, in July&rdquo;
  </text>
</g>
