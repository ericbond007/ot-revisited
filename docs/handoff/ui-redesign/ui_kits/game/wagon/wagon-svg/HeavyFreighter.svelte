<script lang="ts">
  // Heavy freighter — Conestoga-style. Distinctive *swayback* curved
  // bed (high ends, low middle), tall canopy, big wheels. The classic
  // Conestoga silhouette; needs 6 oxen to move.
  import { healthToDamage, W_INK, W_IRON, W_WOOD, W_WOOD_DARK, type WagonAddons } from './wagon-tokens';
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
    /** Animation tick in seconds. Currently unused on this variant
     *  (no feathers wired yet); accepted to satisfy the WagonRender
     *  Component contract. */
    t?: number;
    /** Render canvas top? Currently unused on this variant; accepted
     *  to satisfy the WagonRender Component contract. */
    showCanvas?: boolean;
    /** Use FLUX painterly body? Currently unused on this variant. */
    useFluxBody?: boolean;
  }

  let {
    angle = 0,
    bounce = 0,
    health = 100,
    addons = {},
    t: _t = 0,
    showCanvas: _showCanvas = true,
    useFluxBody: _useFluxBody = false
  }: Props = $props();

  const dmg = $derived(healthToDamage(health));
  const bedW = 36;
  const bedH = 6;
  const bedX = -bedW / 2;
  const bedY = -2;

  // Plank line ratios (port-faithful to the JSX original).
  const plankRatios = [0.15, 0.3, 0.45, 0.55, 0.7, 0.85];
  type Plank = { px: number; topY: number; botY: number; idx: number };
  const plankLines = $derived.by<Plank[]>(() =>
    plankRatios.map((t, i) => {
      const px = bedX + bedW * t;
      const topY = bedY - 1.5 + Math.sin(Math.PI * t) * 4;
      const botY = bedY + bedH - 1 + Math.sin(Math.PI * t) * 2.5;
      return { px, topY, botY, idx: i };
    })
  );
</script>

<g transform="translate(0 {bounce})">
  <ellipse cx="0" cy="13" rx={bedW / 2 + 6} ry="2" fill={W_INK} opacity="0.3" />

  <!-- tongue (longer, heavier wagon) -->
  <line x1={bedX - 1} y1={bedY + 3} x2={bedX - 17} y2={bedY + 5.5}
        stroke={W_INK} stroke-width="1.3" stroke-linecap="round" />
  <!-- iron clevis -->
  <rect x={bedX - 17.5} y={bedY + 5} width="1.5" height="1" fill={W_IRON} />

  <!-- canvas top — Conestoga "boat" shape: high arched ends with slack -->
  <CanvasTop {bedX} {bedY} {bedW} arch={17} ribs={7} slack={2.5}
             damageLevel={dmg.canvas} dirtyLevel={dmg.dirt} />

  <!-- wagon bed — Conestoga swayback (concave top, convex bottom) -->
  <g>
    <path d={`M${bedX} ${bedY - 1.5}
              Q${bedX + bedW * 0.5} ${bedY + 2.5} ${bedX + bedW} ${bedY - 1.5}
              L${bedX + bedW} ${bedY + bedH - 1}
              Q${bedX + bedW * 0.5} ${bedY + bedH + 1.5} ${bedX} ${bedY + bedH - 1} Z`}
          fill={W_WOOD} stroke={W_INK} stroke-width="0.9" stroke-linejoin="round" />
    <!-- darker shadow at trough bottom -->
    <path d={`M${bedX + 2} ${bedY + bedH * 0.3}
              Q${bedX + bedW * 0.5} ${bedY + bedH * 0.85} ${bedX + bedW - 2} ${bedY + bedH * 0.3}`}
          fill="none" stroke={W_WOOD_DARK} stroke-width="0.6" opacity="0.7" />
    <!-- plank lines following the curve -->
    {#each plankLines as p (p.idx)}
      <line x1={p.px} y1={p.topY + 0.5} x2={p.px} y2={p.botY - 0.3}
            stroke={W_INK} stroke-width="0.3" opacity="0.6" />
    {/each}
    <!-- iron straps at the bow-shaped ends -->
    <path d={`M${bedX + 0.3} ${bedY - 1.3} L${bedX + 0.3} ${bedY + bedH - 1.2}`}
          stroke={W_IRON} stroke-width="0.7" />
    <path d={`M${bedX + bedW - 0.9} ${bedY - 1.3} L${bedX + bedW - 0.9} ${bedY + bedH - 1.2}`}
          stroke={W_IRON} stroke-width="0.7" />
    {#if dmg.plank >= 0}
      <rect x={bedX + 5 + dmg.plank * 5} y={bedY + 1} width="3" height="3"
            fill={W_INK} opacity="0.7" />
    {/if}
  </g>

  <!-- addons -->
  {#if addons.driver}
    <Driver x={bedX + 3} y={bedY} variant="conestoga" useBlender={addons.useBlenderDriver} />
  {/if}
  {#if (addons.kegs ?? 0) >= 1}
    <WaterKeg x={bedX + bedW * 0.45} y={bedY + 1.5} large />
  {/if}
  {#if (addons.kegs ?? 0) >= 2}
    <WaterKeg x={bedX + bedW * 0.6} y={bedY + 1.5} large />
  {/if}
  {#if (addons.coop ?? 0) > 0}
    <ChickenCoop x={bedX + bedW * 0.85} y={bedY + 0.5} size="lg"
                 chickens={Math.min(8, addons.coop ?? 0)} />
  {/if}

  <!-- wheels — large, both sizable -->
  <HistoricalWheel cx={bedX + 6} cy={8} r={5.5} {angle} spokes={12}
                   broken={dmg.wheelFront} />
  <HistoricalWheel cx={bedX + bedW - 6} cy={8} r={6.5} angle={angle * 0.9}
                   spokes={14} broken={dmg.wheelBack} />
</g>
