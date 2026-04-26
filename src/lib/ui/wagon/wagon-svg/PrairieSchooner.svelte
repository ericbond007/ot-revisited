<script lang="ts">
  // Prairie schooner — the iconic Oregon Trail wagon. Longer bed (~30
  // wide), big arched canvas, 10-spoke front and 12-spoke rear wheels
  // (front is smaller), flared sideboards, sloped ends.
  import { healthToDamage, W_INK, W_IRON, W_WOOD, W_WOOD_DARK, W_WOOD_LIGHT, type WagonAddons } from './wagon-tokens';
  import HistoricalWheel from './HistoricalWheel.svelte';
  import CanvasTop from './CanvasTop.svelte';
  import Driver from './Driver.svelte';
  import WaterKeg from './WaterKeg.svelte';
  import ChickenCoop from './ChickenCoop.svelte';

  interface Props {
    angle?: number;
    bounce?: number;
    health?: number;
    addons?: WagonAddons;
  }

  let { angle = 0, bounce = 0, health = 100, addons = {} }: Props = $props();

  const dmg = $derived(healthToDamage(health));
  const bedW = 30;
  const bedH = 5;
  const bedX = -bedW / 2;
  const bedY = -2;

  // Flared sides: top of bed is wider than bottom (classic schooner).
  const flare = 1.2;
  const bedTopL = bedX - flare;
  const bedTopR = bedX + bedW + flare;
  const bedTopY = bedY;
  const bedBotY = bedY + bedH;

  const wheelFrontR = 4.4;
  const wheelBackR = 6.0;
  const wheelY = 6;

  // Plank seam x-coords (ratios match the JSX original).
  const seamRatios = [0.08, 0.18, 0.28, 0.38, 0.48, 0.58, 0.68, 0.78, 0.88];
  const hlRatios = [0.13, 0.23, 0.33, 0.43, 0.53, 0.63, 0.73, 0.83];
  const boltRatios = [0.33, 0.66];

  type Seam = { topX: number; topY: number; px: number; idx: number };
  const seamLines = $derived.by<Seam[]>(() => {
    return seamRatios.map((t, i) => {
      const px = bedX + bedW * t;
      const topX = bedTopL + (bedTopR - bedTopL) * (px - bedX) / bedW;
      const topY = bedTopY - 0.3 + Math.abs(t - 0.5) * 0.3;
      return { topX, topY, px, idx: i };
    });
  });
  type Hl = { topX: number; px: number; idx: number };
  const hlLines = $derived.by<Hl[]>(() =>
    hlRatios.map((t, i) => {
      const px = bedX + bedW * t;
      const topX = bedTopL + (bedTopR - bedTopL) * (px - bedX) / bedW;
      return { topX, px, idx: i };
    })
  );
</script>

<g transform="translate(0 {bounce})">
  <ellipse cx="0" cy="11.8" rx={bedW / 2 + 6} ry="1.6" fill={W_INK} opacity="0.32" />

  <!-- TONGUE (forward-extending pole for hitching team) -->
  <line x1={bedX + 5} y1={wheelY + 0.2} x2={bedX - 16} y2={bedY + 5.5}
        stroke={W_WOOD_DARK} stroke-width="1" stroke-linecap="round" />
  <line x1={bedX + 5} y1={wheelY + 0.2} x2={bedX - 16} y2={bedY + 5.5}
        stroke={W_INK} stroke-width="0.4" stroke-linecap="round" opacity="0.6" />
  <!-- iron clevis at end of tongue -->
  <rect x={bedX - 16.7} y={bedY + 5.1} width="1.2" height="0.8" fill={W_IRON} />

  <!-- REAR AXLE BAR (visible under wagon between wheels) -->
  <line x1={bedX + 5} y1={wheelY + 0.2} x2={bedX + bedW - 5} y2={wheelY + 0.2}
        stroke={W_INK} stroke-width="0.9" stroke-linecap="round" />
  <line x1={bedX + 5} y1={wheelY + 0.2} x2={bedX + bedW - 5} y2={wheelY + 0.2}
        stroke={W_WOOD_DARK} stroke-width="0.45" stroke-linecap="round" />

  <!-- REACH (long beam connecting front + rear axles) -->
  <line x1={bedX + 5} y1={wheelY + 0.6} x2={bedX + bedW - 5} y2={wheelY + 0.6}
        stroke={W_WOOD_DARK} stroke-width="0.5" />

  <!-- WAGON BED — flared sides, plank construction -->
  <g>
    <path d={`M${bedTopL} ${bedTopY + 0.4}
              Q${bedTopL + 2} ${bedTopY - 0.6} ${bedTopL + 5} ${bedTopY - 0.3}
              L${bedTopR - 5} ${bedTopY - 0.3}
              Q${bedTopR - 2} ${bedTopY - 0.6} ${bedTopR} ${bedTopY + 0.4}
              L${bedX + bedW} ${bedBotY}
              L${bedX} ${bedBotY} Z`}
          fill={W_WOOD} stroke={W_INK} stroke-width="0.7" stroke-linejoin="round" />

    <!-- Top edge cap — slightly lighter band along the top of the sideboard -->
    <path d={`M${bedTopL + 0.2} ${bedTopY + 0.3}
              Q${bedTopL + 2} ${bedTopY - 0.4} ${bedTopL + 5} ${bedTopY - 0.1}
              L${bedTopR - 5} ${bedTopY - 0.1}
              Q${bedTopR - 2} ${bedTopY - 0.4} ${bedTopR - 0.2} ${bedTopY + 0.3}`}
          stroke={W_WOOD_LIGHT} stroke-width="0.4" fill="none" opacity="0.85" />

    <!-- vertical plank shadow lines -->
    {#each seamLines as s (s.idx)}
      <line x1={s.topX} y1={s.topY + 0.4} x2={s.px} y2={bedBotY - 0.3}
            stroke={W_INK} stroke-width="0.22" opacity="0.55" />
    {/each}
    <!-- plank highlights -->
    {#each hlLines as h (h.idx)}
      <line x1={h.topX + 0.2} y1={bedTopY + 0.2} x2={h.px + 0.2} y2={bedBotY - 0.4}
            stroke={W_WOOD_LIGHT} stroke-width="0.18" opacity="0.4" />
    {/each}

    <!-- iron corner straps -->
    <path d={`M${bedTopL + 0.2} ${bedTopY + 0.4} L${bedX + 0.3} ${bedBotY - 0.2}`}
          stroke={W_IRON} stroke-width="0.6" />
    <path d={`M${bedTopR - 0.2} ${bedTopY + 0.4} L${bedX + bedW - 0.3} ${bedBotY - 0.2}`}
          stroke={W_IRON} stroke-width="0.6" />
    <!-- iron mid-bands -->
    <line x1={bedX + bedW * 0.33} y1={bedTopY + 0.2} x2={bedX + bedW * 0.33} y2={bedBotY - 0.4}
          stroke={W_IRON} stroke-width="0.45" opacity="0.85" />
    <line x1={bedX + bedW * 0.66} y1={bedTopY + 0.2} x2={bedX + bedW * 0.66} y2={bedBotY - 0.4}
          stroke={W_IRON} stroke-width="0.45" opacity="0.85" />

    <!-- iron bolt heads -->
    {#each boltRatios as t, i (i)}
      <circle cx={bedX + bedW * t} cy={bedTopY + 0.5} r="0.18" fill={W_INK} />
      <circle cx={bedX + bedW * t} cy={bedBotY - 0.5} r="0.18" fill={W_INK} />
    {/each}

    <!-- front bench seat (driver's seat) -->
    <path d={`M${bedTopL - 0.5} ${bedTopY - 0.3}
              L${bedTopL - 3.5} ${bedTopY + 0.5}
              L${bedTopL - 3.5} ${bedTopY + 1.5}
              L${bedTopL} ${bedTopY + 0.8} Z`}
          fill={W_WOOD_DARK} stroke={W_INK} stroke-width="0.5" stroke-linejoin="round" />
    <line x1={bedTopL - 0.5} y1={bedTopY - 0.3} x2={bedTopL - 0.5} y2={bedTopY + 0.6}
          stroke={W_INK} stroke-width="0.4" />

    {#if dmg.plank >= 0}
      <rect x={bedX + bedW * 0.4} y={bedTopY + 0.5} width="2.5" height={bedH - 1.2}
            fill={W_INK} opacity="0.7" />
    {/if}
  </g>

  <!-- ADDONS (drawn after bed but before canvas so they sit IN the bed) -->
  {#if addons.driver}
    <Driver x={bedTopL - 2} y={bedTopY - 1.5} variant="schooner" />
  {/if}
  {#if (addons.kegs ?? 0) >= 1}
    <WaterKeg x={bedX + bedW * 0.5} y={bedTopY + 1} />
  {/if}
  {#if (addons.kegs ?? 0) >= 2}
    <WaterKeg x={bedX + bedW * 0.7} y={bedTopY + 1} />
  {/if}
  {#if (addons.coop ?? 0) > 0}
    <ChickenCoop x={bedX + bedW * 0.85} y={bedTopY + 0.5} size="md"
                 chickens={Math.min(5, addons.coop ?? 0)} />
  {/if}

  <!-- CANVAS TOP — drawn LAST so its overhang sits in front of bed top -->
  <CanvasTop {bedX} bedY={bedTopY - 0.2} {bedW}
             arch={14} ribs={6} overhang={2.5} drape={1.4}
             damageLevel={dmg.canvas} dirtyLevel={dmg.dirt} />

  <!-- WHEELS — front noticeably smaller than rear -->
  <HistoricalWheel cx={bedX + 5} cy={wheelY + 0.5} r={wheelFrontR} angle={angle * 1.36}
                   spokes={10} broken={dmg.wheelFront} />
  <HistoricalWheel cx={bedX + bedW - 5} cy={wheelY} r={wheelBackR} {angle}
                   spokes={12} broken={dmg.wheelBack} />
</g>
