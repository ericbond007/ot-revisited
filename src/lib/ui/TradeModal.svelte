<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { PRICES } from '$lib/game/content/prices';
  import { ITEMS } from '$lib/game/content/items';

  let { state: gameState, slot, onclose }: { state: GameState; slot: string; onclose: () => void } = $props();
  const qp = $derived(encodeURIComponent(slot));

  // Items the player owns and can sell
  const sellableIds = $derived(
    Object.entries(gameState.inventory)
      .filter(([id, qty]) => qty > 0 && PRICES[id])
      .map(([id]) => id)
  );
  // Items available for purchase (top 8 staples for Plan 4c)
  const buyableIds = ['flour', 'beans', 'bacon', 'bullets', 'bandages', 'quinine', 'coat', 'blanket'];
</script>

<div style="position: fixed; inset: 0; background: rgba(26, 15, 8, 0.85); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1em; overflow-y: auto;">
  <div class="panel" style="max-width: 700px; width: 100%; padding: 1.5em; border-color: var(--c-rust);">
    <h2 style="color: var(--c-rust);">Trading Post</h2>
    <p>Cash on hand: <strong>${gameState.cash}</strong></p>

    <form method="POST" action="?/trade&slot={qp}">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1em;">
        <div>
          <h4>Buy</h4>
          {#each buyableIds as id}
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5em; margin: 0.3em 0;">
              <span>{ITEMS[id]?.name ?? id} (${PRICES[id]?.buy.toFixed(2)})</span>
              <input type="number" name="buy_{id}" min="0" value="0" style="width: 5em;" />
            </div>
          {/each}
        </div>

        <div>
          <h4>Sell</h4>
          {#each sellableIds as id}
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5em; margin: 0.3em 0;">
              <span>{ITEMS[id]?.name ?? id} ({gameState.inventory[id]}) @ ${PRICES[id]?.sell.toFixed(2)}</span>
              <input type="number" name="sell_{id}" min="0" max={gameState.inventory[id]} value="0" style="width: 5em;" />
            </div>
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
