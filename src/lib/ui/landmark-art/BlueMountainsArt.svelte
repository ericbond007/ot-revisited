<!--
  BlueMountainsArt.svelte — dense forested ridges, the trail's first deep timber

  After 1500 miles of plains and sage, pioneers entered the Blue Mountains:
  thick conifer forest, steep grades, fallen timber to chop through, COLD
  nights even in August. Often the first real forest the children had ever
  seen. Composition: dense fir-clad ridge, wagons winding through a cleared
  trail among the trees, axes biting into a fresh stump.
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const fir = "#3a4830";
  const firDark = "#22301c";
  const firLight = "#5a6c44";

  // Build a layered mass of conifer triangles
  const trees: Array<{ x: number; y: number; h: number; w: number; layer: number }> = [];
  for (let i = 0; i < 38; i++) {
    const x = 8 + (i * 13) % 480 + ((i % 5) * 4);
    const baseY = 40 + (i * 7) % 80;
    const h = 18 + (i % 4) * 4;
    const w = 8 + (i % 3) * 2;
    trees.push({ x, y: baseY, h, w, layer: (i % 3) });
  }
</script>

<!-- BigFir snippet: layered conifer triangle -->
{#snippet bigFir(x: number, y: number, h: number, fill: string)}
  <g transform="translate({x} {y})">
    <!-- trunk -->
    <rect x="-1.4" y="-2" width="2.8" height="6" fill="#3a2410" stroke={ink} stroke-width="0.3" />
    <!-- layered triangle — path computed with numeric h -->
    <path d={`M 0 -2 L ${-h*0.4} ${-h*0.2} L ${-h*0.25} ${-h*0.2} L ${-h*0.32} ${-h*0.5} L ${-h*0.18} ${-h*0.5} L ${-h*0.24} ${-h*0.8} L 0 ${-h} L ${h*0.24} ${-h*0.8} L ${h*0.18} ${-h*0.5} L ${h*0.32} ${-h*0.5} L ${h*0.25} ${-h*0.2} L ${h*0.4} ${-h*0.2} Z`}
          fill={fill} stroke={ink} stroke-width="0.4" />
  </g>
{/snippet}

<!-- ForestWagon snippet -->
{#snippet forestWagon(x: number, y: number, opacity: number)}
  <g transform="translate({x} {y})" opacity={opacity}>
    <rect x="-9" y="-5" width="18" height="3" fill={LMK.earth} stroke={ink} stroke-width="0.4" />
    <path d="M -9 -5 Q 0 -13 9 -5 Z" fill={LMK.white} stroke={ink} stroke-width="0.45" />
    <circle cx="-5" cy="0" r="2.2" fill="none" stroke={ink} stroke-width="0.4" />
    <circle cx="5" cy="0" r="2.2" fill="none" stroke={ink} stroke-width="0.4" />
  </g>
{/snippet}

<g>
  <!-- sky strip -->
  <rect x="0" y="0" width={LMK_VIEW_W} height="38" fill={LMK.parchment} opacity="0.5" />

  <!-- far blue ridge line -->
  <path d="M 0 38 L 60 24 L 130 36 L 200 18 L 280 32 L 350 16 L 420 28 L 480 20 L 480 60 L 0 60 Z"
        fill="#5a6878" stroke={ink} stroke-width="0.4" opacity="0.8" />

  <!-- layered conifer mass -->
  <g>
    {#each trees.filter(t => t.layer === 0) as t, i}
      <path d={`M ${t.x} ${t.y + t.h} L ${t.x - t.w/2} ${t.y + t.h * 0.4} L ${t.x - t.w/4} ${t.y + t.h * 0.4} L ${t.x - t.w/3} ${t.y} L ${t.x + t.w/3} ${t.y} L ${t.x + t.w/4} ${t.y + t.h * 0.4} L ${t.x + t.w/2} ${t.y + t.h * 0.4} Z`}
            fill={firDark} opacity="0.85" />
    {/each}
    {#each trees.filter(t => t.layer === 1) as t, i}
      <path d={`M ${t.x} ${t.y + t.h} L ${t.x - t.w/2} ${t.y + t.h * 0.5} L ${t.x - t.w/4} ${t.y + t.h * 0.5} L ${t.x - t.w/3} ${t.y} L ${t.x + t.w/3} ${t.y} L ${t.x + t.w/4} ${t.y + t.h * 0.5} L ${t.x + t.w/2} ${t.y + t.h * 0.5} Z`}
            fill={fir} opacity="0.95" />
    {/each}
    {#each trees.filter(t => t.layer === 2) as t, i}
      <path d={`M ${t.x} ${t.y + t.h} L ${t.x - t.w/2} ${t.y + t.h * 0.45} L ${t.x - t.w/3} ${t.y} L ${t.x + t.w/3} ${t.y} L ${t.x + t.w/2} ${t.y + t.h * 0.45} Z`}
            fill={firLight} opacity="0.7" />
    {/each}
  </g>

  <!-- TRAIL clearing — a winding cut through the trees -->
  <g>
    <path d="M 0 152 Q 100 140 200 134 Q 300 128 400 138 Q 460 144 480 148"
          stroke={LMK.earth} stroke-width="14" fill="none" opacity="0.85" stroke-linecap="round" />
    <path d="M 0 152 Q 100 140 200 134 Q 300 128 400 138 Q 460 144 480 148"
          stroke={LMK.earthDark} stroke-width="0.6" fill="none" opacity="0.5" stroke-dasharray="3 4" />
  </g>

  <!-- big foreground firs flanking the trail -->
  <g>
    {@render bigFir(28, 156, 50, firDark)}
    {@render bigFir(64, 158, 42, fir)}
    {@render bigFir(420, 158, 48, firDark)}
    {@render bigFir(448, 154, 44, fir)}
  </g>

  <!-- fresh STUMP with axe -->
  <g transform="translate(120 158)">
    <ellipse cx="0" cy="2" rx="6" ry="1.3" fill="#3a2818" opacity="0.5" />
    <ellipse cx="0" cy="0" rx="6" ry="2.5" fill="#a08868" stroke={ink} stroke-width="0.5" />
    <ellipse cx="0" cy="-0.8" rx="5" ry="2" fill="#decb9a" stroke={ink} stroke-width="0.4" />
    <!-- growth rings -->
    <g stroke="#7a6240" stroke-width="0.3" fill="none" opacity="0.7">
      <ellipse cx="0" cy="-0.8" rx="3.5" ry="1.4" />
      <ellipse cx="0" cy="-0.8" rx="2" ry="0.8" />
    </g>
    <!-- axe stuck in -->
    <line x1="-1" y1="-1.6" x2="-7" y2="-7" stroke="#3a2410" stroke-width="0.55" />
    <path d="M -8 -7 L -5 -10 L -3 -8 L -6 -5 Z" fill="#9a8a78" stroke={ink} stroke-width="0.4" />
  </g>

  <!-- WAGONS winding along the trail -->
  <g>
    {@render forestWagon(170, 140, 1)}
    {@render forestWagon(230, 138, 0.95)}
    {@render forestWagon(290, 134, 0.85)}
    {@render forestWagon(350, 140, 0.75)}
  </g>

  <!-- a few axemen ahead, clearing fallen log -->
  <g transform="translate(376 148)">
    <!-- fallen log -->
    <ellipse cx="0" cy="0" rx="14" ry="2" fill="#5a3a1a" stroke={ink} stroke-width="0.4" />
    <ellipse cx="-14" cy="0" rx="1.5" ry="2" fill="#a08868" stroke={ink} stroke-width="0.4" />
    <!-- axeman -->
    <g transform="translate(0 -3)">
      <ellipse cx="0" cy="-4" rx="0.8" ry="0.9" fill={LMK.paperWarm} stroke={ink} stroke-width="0.25" />
      <path d="M -1.2 -3 L 1.2 -3 L 1.6 1 L -1.6 1 Z" fill={LMK.rust} stroke={ink} stroke-width="0.3" />
      <line x1="1.5" y1="-2" x2="5" y2="-7" stroke={ink} stroke-width="0.4" />
      <path d="M 5.5 -8 L 7 -10 L 8.5 -8 L 7 -7 Z" fill="#9a8a78" stroke={ink} stroke-width="0.35" />
    </g>
  </g>

  <!-- small campfire smoke from camp deeper in trees -->
  <g transform="translate(80 100)" opacity="0.6">
    <path d="M 0 0 q -2 -6 0 -10 q 2 -6 0 -12" stroke={inkSoft} stroke-width="0.55" fill="none" />
    <path d="M 1 0 q 2 -6 0 -10" stroke={inkSoft} stroke-width="0.4" fill="none" />
  </g>

  <text x="240" y="194" text-anchor="middle"
        font-family="IM Fell English, Georgia, serif" font-size="8"
        fill={inkSoft} font-style="italic" opacity="0.85">
    Blue Mountains — &ldquo;the children stared at trees they had never seen&rdquo;
  </text>
</g>
