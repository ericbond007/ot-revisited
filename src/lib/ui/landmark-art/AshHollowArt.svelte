<!--
  AshHollowArt.svelte — mile ~635, the descent of Windlass Hill into a green oasis

  Pioneers locked wheels with chains and lowered wagons by ROPE down a 25°
  300-ft slope (Windlass Hill). Below: Ash Hollow — a cool wooded valley
  of ash trees, springs, wild roses, an emigrant cemetery, and Rachel Pattison's
  1849 grave. Composition: hill at left with rope-lowered wagons, hollow at
  right with ash trees, springs, and a single white headstone.
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const ashGreen = "#5a7048";
  const ashLight = "#88a26a";
  const cliff = "#c8b690";
  const cliffSh = "#8a7a58";
  // LMK.gold not in token set — use local value
  const gold = '#d4a832';
</script>

<g>
  <!-- sky band -->
  <rect x="0" y="0" width={LMK_VIEW_W} height="50" fill={LMK.parchment} opacity="0.4" />

  <!-- WINDLASS HILL — the dramatic descent on the LEFT -->
  <g>
    <!-- hill mass -->
    <path d="M 0 56 L 30 50 L 80 56 L 120 70 L 160 96 L 200 130 L 200 160 L 0 160 Z"
          fill={cliff} stroke={ink} stroke-width="0.7" />
    <!-- shadow side -->
    <path d="M 80 56 L 120 70 L 160 96 L 200 130 L 200 160 L 130 160 L 100 100 L 90 70 Z"
          fill={cliffSh} opacity="0.55" />
    <!-- the steep grooved descent track — wagon ruts cut into the hill -->
    <g stroke={cliffSh} stroke-width="0.7" fill="none" opacity="0.85">
      <path d="M 80 56 Q 110 80 140 110 Q 170 140 200 158" />
      <path d="M 84 56 Q 114 80 144 110 Q 174 140 204 158" />
    </g>
    <!-- erosion gullies -->
    <g stroke={cliffSh} stroke-width="0.4" fill="none" opacity="0.55">
      <path d="M 60 70 q 6 12 14 28" />
      <path d="M 100 80 q 8 16 18 38" />
      <path d="M 50 90 q 8 16 16 36" />
    </g>

    <!-- TWO wagons being lowered — one mid-descent, one near top -->
    <!-- anchor party at top with windlass / rope -->
    <g transform="translate(72 54)">
      <line x1="0" y1="0" x2="0" y2="-6" stroke="#4a3220" stroke-width="1.2" />
      <ellipse cx="0" cy="-7" rx="2" ry="1" fill={LMK.earthDark} stroke={ink} stroke-width="0.3" />
      <!-- figure -->
      <ellipse cx="-3" cy="-2" rx="0.8" ry="0.9" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
      <path d="M -4 -1 L -2 -1 L -1.6 2 L -4.4 2 Z" fill={LMK.earthDark} stroke={ink} stroke-width="0.25" />
      <!-- rope going down -->
      <path d="M 0 -6 Q 30 30 80 80" stroke={ink} stroke-width="0.45" fill="none" />
      <path d="M 0 -6 Q 60 50 130 110" stroke={ink} stroke-width="0.45" fill="none" opacity="0.6" />
    </g>

    <!-- upper wagon — wheels chained -->
    <g transform="translate(108 86) rotate(40)">
      <rect x="-7" y="-4" width="14" height="3" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
      <path d="M -7 -4 Q 0 -11 7 -4 Z" fill={LMK.white} stroke={ink} stroke-width="0.45" />
      <circle cx="-4" cy="0" r="2" fill="none" stroke={ink} stroke-width="0.4" />
      <circle cx="4" cy="0" r="2" fill="none" stroke={ink} stroke-width="0.4" />
      <!-- chain crossing wheel -->
      <path d="M -6 -1.5 L -2 1.5" stroke={ink} stroke-width="0.5" />
      <path d="M 2 -1.5 L 6 1.5" stroke={ink} stroke-width="0.5" />
    </g>

    <!-- lower wagon — almost at bottom -->
    <g transform="translate(170 130) rotate(30)">
      <rect x="-7" y="-4" width="14" height="3" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
      <path d="M -7 -4 Q 0 -11 7 -4 Z" fill={LMK.white} stroke={ink} stroke-width="0.45" />
      <circle cx="-4" cy="0" r="2" fill="none" stroke={ink} stroke-width="0.4" />
      <circle cx="4" cy="0" r="2" fill="none" stroke={ink} stroke-width="0.4" />
    </g>
  </g>

  <!-- THE HOLLOW — green oasis at base/right -->
  <g>
    <!-- valley floor -->
    <path d="M 200 130 Q 320 122 480 126 L 480 200 L 200 200 Z" fill={LMK.sageLight} opacity="0.65" />
    <!-- ASH TREES — rounded crowns, the namesake -->
    <g>
      <ellipse cx="240" cy="118" rx="14" ry="11" fill={ashGreen} stroke={ink} stroke-width="0.5" />
      <ellipse cx="234" cy="113" rx="6" ry="5" fill={ashLight} opacity="0.65" />
      <rect x="239" y="126" width="2.4" height="10" fill="#3a2818" stroke={ink} stroke-width="0.3" />

      <ellipse cx="280" cy="112" rx="18" ry="14" fill={ashGreen} stroke={ink} stroke-width="0.5" />
      <ellipse cx="272" cy="106" rx="8" ry="6" fill={ashLight} opacity="0.65" />
      <rect x="279" y="124" width="2.4" height="10" fill="#3a2818" stroke={ink} stroke-width="0.3" />

      <ellipse cx="330" cy="118" rx="14" ry="11" fill={ashGreen} stroke={ink} stroke-width="0.5" />
      <ellipse cx="324" cy="113" rx="6" ry="5" fill={ashLight} opacity="0.65" />
      <rect x="329" y="126" width="2.4" height="10" fill="#3a2818" stroke={ink} stroke-width="0.3" />

      <ellipse cx="380" cy="114" rx="16" ry="12" fill={ashGreen} stroke={ink} stroke-width="0.5" />
      <ellipse cx="374" cy="109" rx="7" ry="5" fill={ashLight} opacity="0.65" />
      <rect x="379" y="124" width="2.4" height="10" fill="#3a2818" stroke={ink} stroke-width="0.3" />

      <ellipse cx="430" cy="118" rx="14" ry="11" fill={ashGreen} stroke={ink} stroke-width="0.5" />
      <ellipse cx="424" cy="113" rx="6" ry="5" fill={ashLight} opacity="0.65" />
      <rect x="429" y="126" width="2.4" height="10" fill="#3a2818" stroke={ink} stroke-width="0.3" />
    </g>

    <!-- SPRING + small pool -->
    <g>
      <ellipse cx="280" cy="148" rx="14" ry="3.5" fill={LMK.water} opacity="0.7" stroke="#5a7280" stroke-width="0.4" />
      <ellipse cx="280" cy="146" rx="8" ry="1.6" fill="#a8c4c8" opacity="0.65" />
      <path d="M 280 148 Q 330 152 400 158 Q 440 160 480 162" stroke={LMK.water} stroke-width="1.6" fill="none" opacity="0.75" />
    </g>

    <!-- RACHEL'S GRAVE — single white headstone, fenced -->
    <g transform="translate(360 154)">
      <!-- picket fence -->
      {#each [-7, -4, 0, 4, 7] as px}
        <line x1={px} y1="0" x2={px} y2="-5" stroke="#6a4828" stroke-width="0.5" />
      {/each}
      <line x1="-7" y1="-4" x2="7" y2="-4" stroke="#6a4828" stroke-width="0.4" />
      <!-- headstone -->
      <rect x="-2" y="-7" width="4" height="6" rx="1.6" fill={LMK.white} stroke={ink} stroke-width="0.5" />
      <line x1="-1.2" y1="-5" x2="1.2" y2="-5" stroke={inkSoft} stroke-width="0.3" />
      <line x1="-1.2" y1="-3.5" x2="1.2" y2="-3.5" stroke={inkSoft} stroke-width="0.3" />
      <!-- small flowers -->
      <circle cx="-3" cy="0" r="0.5" fill={LMK.rust} />
      <circle cx="3" cy="0" r="0.5" fill={gold} />
    </g>

    <!-- wagon resting in hollow -->
    <g transform="translate(420 158)">
      <rect x="-9" y="-5" width="18" height="3" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
      <path d="M -9 -5 Q 0 -13 9 -5 Z" fill={LMK.white} stroke={ink} stroke-width="0.45" />
      <circle cx="-5" cy="0" r="2.2" fill="none" stroke={ink} stroke-width="0.4" />
      <circle cx="5" cy="0" r="2.2" fill="none" stroke={ink} stroke-width="0.4" />
    </g>

    <!-- wild roses tufts -->
    <g opacity="0.85">
      {#each [230, 320, 400, 460] as x, i}
        <g transform="translate({x},{172 + (i % 2) * 4})">
          <circle cx="0" cy="0" r="0.6" fill={LMK.rust} />
          <circle cx="2" cy="-1" r="0.5" fill={LMK.rust} />
          <circle cx="-1" cy="-2" r="0.55" fill={LMK.rust} />
          <ellipse cx="0" cy="2" rx="3" ry="1" fill={ashGreen} opacity="0.6" />
        </g>
      {/each}
    </g>
  </g>

  <text x="240" y="194" text-anchor="middle"
        font-family="IM Fell English, Georgia, serif" font-size="8"
        fill={inkSoft} font-style="italic" opacity="0.85">
    Ash Hollow — &ldquo;down Windlass Hill, into the cool green hollow&rdquo;
  </text>
</g>
