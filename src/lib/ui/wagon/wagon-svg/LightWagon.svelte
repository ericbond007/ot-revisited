<script lang="ts">
  // Light wagon — short bed (~24 wide), small arched canvas, 4-spoke
  // wheels, low and quick. Used by the "light" wagon model in the
  // catalog.
  import { healthToDamage, W_INK, W_IRON, W_WOOD, type WagonAddons } from './wagon-tokens';
  import HistoricalWheel from './HistoricalWheel.svelte';
  import PlankBed from './PlankBed.svelte';
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
  const bedW = 24;
  const bedH = 4;
  const bedX = -bedW / 2;
  const bedY = -2;
</script>

<g transform="translate(0 {bounce})">
  <!-- shadow -->
  <ellipse cx="0" cy="11" rx={bedW / 2 + 4} ry="1.6" fill={W_INK} opacity="0.25" />

  <!-- tongue extending forward (LEFT, since facing west) -->
  <line x1={bedX - 1} y1={bedY + 1.5} x2={bedX - 12} y2={bedY + 4}
        stroke={W_INK} stroke-width="1" stroke-linecap="round" />

  <!-- canvas top — shorter arch -->
  <CanvasTop {bedX} {bedY} {bedW} arch={9} ribs={4}
             damageLevel={dmg.canvas} dirtyLevel={dmg.dirt} />

  <!-- wagon bed -->
  <PlankBed x={bedX} y={bedY} w={bedW} h={bedH} planks={4}
            dropPlank={dmg.plank} fill={W_WOOD} />
  <!-- underbody axle bar -->
  <line x1={bedX + 1} y1={bedY + bedH + 0.2} x2={bedX + bedW - 1} y2={bedY + bedH + 0.2}
        stroke={W_IRON} stroke-width="0.6" />

  <!-- addons -->
  {#if addons.driver}
    <Driver x={bedX + 2} y={bedY - 1} variant="light" />
  {/if}
  {#if (addons.kegs ?? 0) >= 1}
    <WaterKeg x={bedX + bedW * 0.55} y={bedY + 0.5} />
  {/if}
  {#if (addons.coop ?? 0) > 0}
    <ChickenCoop x={bedX + bedW * 0.78} y={bedY + 0.2} size="sm"
                 chickens={Math.min(3, addons.coop ?? 0)} />
  {/if}

  <!-- wheels — small, even-sized -->
  <HistoricalWheel cx={bedX + 4} cy={5} r={4.2} {angle} spokes={8}
                   broken={dmg.wheelBack} />
  <HistoricalWheel cx={bedX + bedW - 4} cy={5} r={4.2} angle={angle * 0.96}
                   spokes={8} broken={dmg.wheelFront} />
</g>
