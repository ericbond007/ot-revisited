<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import NumberStepper from './NumberStepper.svelte';

  let { state: gameState, slot, onclose }: { state: GameState; slot: string; onclose: () => void } = $props();
  const qp = $derived(encodeURIComponent(slot));
  const hasShovel = $derived((gameState.inventory.shovel ?? 0) > 0);

  let days = $state(1);
  let digWell = $state(false);
  let digGrave = $state(false);
  let digOut = $state(false);
</script>

<div style="position: fixed; inset: 0; background: rgba(26, 15, 8, 0.85); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1em;">
  <div class="panel" style="max-width: 500px; width: 100%; padding: 1.5em; border-color: var(--c-rust);">
    <h2 style="color: var(--c-rust);">Make Camp / Rest</h2>
    <p style="color: var(--c-wood); font-size: 0.9em;">
      Stop for 1+ days. Heals injuries, recovers ox fatigue, and lets the Farmer forage.
      Day 1 can include shovel work if you have a shovel.
    </p>

    <form method="POST" action="?/rest&slot={qp}">
      <div style="margin: 0.8em 0; display: flex; align-items: center; gap: 0.8em; flex-wrap: wrap;">
        <span>Days <span style="color: var(--c-wood); font-size: 0.85em;">(1 = overnight camp, more = extended rest)</span></span>
        <NumberStepper name="days" bind:value={days} min={1} max={7} ariaLabel="Rest days" />
      </div>

      {#if hasShovel}
        <div style="margin: 0.8em 0;">
          <div style="font-weight: 700; color: var(--c-rust); margin-bottom: 0.4em;">SHOVEL WORK (first day, 12-hour budget)</div>
          <label style="display: block; margin: 0.3em 0;">
            <input type="checkbox" name="shovelAction" value="dig_well" bind:checked={digWell} disabled={!hasShovel} />
            Dig a well (5 hrs) — chance to find water
          </label>
          <label style="display: block; margin: 0.3em 0;">
            <input type="checkbox" name="shovelAction" value="dig_grave" bind:checked={digGrave} disabled={!hasShovel} />
            Dig a grave (2 hrs) — softens future death
          </label>
          <label style="display: block; margin: 0.3em 0;">
            <input type="checkbox" name="shovelAction" value="dig_out" bind:checked={digOut} disabled={!hasShovel} />
            Dig wagon out of mud / snow (4 hrs)
          </label>
        </div>
      {:else}
        <p style="color: var(--c-wood); font-size: 0.85em; font-style: italic;">
          (No shovel in inventory — shovel work unavailable.)
        </p>
      {/if}

      <div style="display: flex; gap: 0.5em; margin-top: 1em;">
        <button type="submit">Go</button>
        <button type="button" onclick={onclose}>Cancel</button>
      </div>
    </form>
  </div>
</div>
