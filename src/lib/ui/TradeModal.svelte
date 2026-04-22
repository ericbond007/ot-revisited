<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { PRICES } from '$lib/game/content/prices';
  import { ITEMS } from '$lib/game/content/items';
  import ItemTooltip from './ItemTooltip.svelte';

  let { state: gameState, slot, onclose }: { state: GameState; slot: string; onclose: () => void } = $props();
  const qp = $derived(encodeURIComponent(slot));

  // Items the player owns and can sell
  const sellableIds = $derived(
    Object.entries(gameState.inventory)
      .filter(([id, qty]) => qty > 0 && PRICES[id])
      .map(([id]) => id)
  );
  // Items available for purchase at the post (staples + common needs)
  const buyableIds = ['flour', 'beans', 'bacon', 'bullets', 'bandages', 'quinine', 'coat', 'blanket', 'wheel', 'axle', 'tongue', 'ox_shoes'];
</script>

<div style="position: fixed; inset: 0; background: rgba(26, 15, 8, 0.85); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1em; overflow-y: auto;">
  <div class="panel" style="max-width: 720px; width: 100%; padding: 1.5em; border-color: var(--c-rust);">
    <h2 style="color: var(--c-rust);">Trading Post</h2>
    <p>Cash on hand: <strong>${gameState.cash}</strong>. Hover any item for details.</p>

    <form method="POST" action="?/trade&slot={qp}">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1em;">
        <div>
          <h4>Buy</h4>
          {#each buyableIds as id}
            {#if ITEMS[id] && PRICES[id]}
              <div class="trade-row">
                <div class="trade-row-label">
                  <ItemTooltip {id}>
                    {#snippet children()}
                      <span>{ITEMS[id].name}</span>
                    {/snippet}
                  </ItemTooltip>
                  <span class="price">${PRICES[id].buy.toFixed(2)}</span>
                </div>
                <input type="number" name="buy_{id}" min="0" value="0" />
              </div>
            {/if}
          {/each}
        </div>

        <div>
          <h4>Sell</h4>
          {#if sellableIds.length === 0}
            <p style="color: var(--c-wood); font-size: 0.9em; font-style: italic;">Nothing to sell.</p>
          {/if}
          {#each sellableIds as id}
            {#if ITEMS[id] && PRICES[id]}
              <div class="trade-row">
                <div class="trade-row-label">
                  <ItemTooltip {id}>
                    {#snippet children()}
                      <span>{ITEMS[id].name}</span>
                    {/snippet}
                  </ItemTooltip>
                  <span class="price">
                    <span class="own">owned {gameState.inventory[id]}</span>
                    @ ${PRICES[id].sell.toFixed(2)}
                  </span>
                </div>
                <input type="number" name="sell_{id}" min="0" max={gameState.inventory[id]} value="0" />
              </div>
            {/if}
          {/each}
        </div>
      </div>

      <div style="display: flex; gap: 0.5em; margin-top: 1em;">
        <button type="submit">Confirm Trade</button>
        <button type="button" onclick={onclose}>Cancel</button>
      </div>
    </form>
  </div>
</div>

<style>
  .trade-row {
    display: grid;
    grid-template-columns: 1fr 5em;
    align-items: center;
    gap: 0.6em;
    padding: 0.35em 0;
    border-bottom: 1px dashed rgba(138, 90, 42, 0.2);
  }
  .trade-row:last-child {
    border-bottom: 0;
  }
  .trade-row-label {
    display: flex;
    flex-direction: column;
    gap: 0.15em;
    min-width: 0;
    overflow: visible;
  }
  .trade-row .price {
    font-size: 0.85em;
    color: var(--c-wood);
  }
  .trade-row .own {
    color: var(--c-rust);
    font-weight: 700;
  }
  .trade-row input[type='number'] {
    width: 100%;
    text-align: center;
  }
</style>
