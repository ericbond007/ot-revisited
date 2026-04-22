<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { PRICES } from '$lib/game/content/prices';
  import { ITEMS } from '$lib/game/content/items';
  import ItemTooltip from './ItemTooltip.svelte';
  import NumberStepper from './NumberStepper.svelte';

  let { state: gameState, slot, onclose }: { state: GameState; slot: string; onclose: () => void } = $props();
  const qp = $derived(encodeURIComponent(slot));

  // Items the player owns and can sell
  const sellableIds = $derived(
    Object.entries(gameState.inventory)
      .filter(([id, qty]) => qty > 0 && PRICES[id])
      .map(([id]) => id)
  );
  // Items available for purchase at the post. Wider than Independence's
  // outfitter for staples but fewer premium items; shovel is included so
  // well-digging isn't gated on starting with a Preacher.
  const buyableIds = [
    'flour', 'beans', 'bacon', 'hardtack', 'dried_fruit',
    'bullets', 'bandages', 'quinine', 'herbal_poultice',
    'coat', 'blanket',
    'wheel', 'axle', 'tongue', 'canvas', 'spare_plank',
    'ox_shoes', 'shovel', 'rope', 'cookware', 'bible'
  ];

  // Qty state keyed by id. Pre-populated with 0 for every possible id so
  // NumberStepper bindings always have a defined starting value at mount —
  // binding to `sellQty[id]` where the key is missing breaks the stepper
  // (initial value is undefined, later inc/dec produce NaN).
  // svelte-ignore state_referenced_locally
  const initialSellableIds = Object.entries(gameState.inventory)
    .filter(([id, qty]) => qty > 0 && PRICES[id])
    .map(([id]) => id);
  let buyQty = $state<Record<string, number>>(
    Object.fromEntries(buyableIds.map((id) => [id, 0]))
  );
  let sellQty = $state<Record<string, number>>(
    Object.fromEntries(initialSellableIds.map((id) => [id, 0]))
  );
  // If inventory changes while the modal is open (e.g., trade reloads the
  // state), add any newly-present item IDs to the sell map.
  $effect(() => {
    for (const id of sellableIds) {
      if (sellQty[id] === undefined) sellQty[id] = 0;
    }
  });

  // Totals preview
  const buyTotal = $derived(
    Object.entries(buyQty).reduce((s, [id, q]) => s + q * (PRICES[id]?.buy ?? 0), 0)
  );
  const sellTotal = $derived(
    Object.entries(sellQty).reduce((s, [id, q]) => s + q * (PRICES[id]?.sell ?? 0), 0)
  );
  const netCost = $derived(buyTotal - sellTotal);
  const canAfford = $derived(netCost <= gameState.cash);
</script>

<div class="modal-backdrop" onclick={onclose} role="presentation">
  <div class="panel modal-body" onclick={(e) => e.stopPropagation()} role="presentation">
    <h2 style="color: var(--c-rust);">🏪 Trading Post</h2>
    <p class="lede">
      Cash on hand: <strong>${gameState.cash}</strong>. Hover any item for details.
    </p>

    <form method="POST" action="?/trade&slot={qp}">
      <div class="trade-grid">
        <div class="trade-col">
          <h4>BUY</h4>
          {#each buyableIds as id}
            {#if ITEMS[id] && PRICES[id]}
              <div class="trade-row">
                <div class="trade-row-label">
                  <ItemTooltip {id}>
                    {#snippet children()}
                      <span class="item-name">{ITEMS[id].name}</span>
                    {/snippet}
                  </ItemTooltip>
                  <span class="price">${PRICES[id].buy.toFixed(2)} ea</span>
                </div>
                <NumberStepper
                  name="buy_{id}"
                  bind:value={buyQty[id]}
                  min={0}
                  max={99}
                  ariaLabel="Buy {ITEMS[id].name}"
                />
              </div>
            {/if}
          {/each}
        </div>

        <div class="trade-col">
          <h4>SELL</h4>
          {#if sellableIds.length === 0}
            <p class="empty">Nothing to sell.</p>
          {/if}
          {#each sellableIds as id}
            {#if ITEMS[id] && PRICES[id]}
              <div class="trade-row">
                <div class="trade-row-label">
                  <ItemTooltip {id}>
                    {#snippet children()}
                      <span class="item-name">{ITEMS[id].name}</span>
                    {/snippet}
                  </ItemTooltip>
                  <span class="price">
                    <span class="own">owned {gameState.inventory[id]}</span>
                    @ ${PRICES[id].sell.toFixed(2)}
                  </span>
                </div>
                <NumberStepper
                  name="sell_{id}"
                  bind:value={sellQty[id]}
                  min={0}
                  max={gameState.inventory[id]}
                  ariaLabel="Sell {ITEMS[id].name}"
                />
              </div>
            {/if}
          {/each}
        </div>
      </div>

      <!-- Totals bar -->
      <div class="totals" class:overdraw={!canAfford}>
        <div class="total-col">
          <span class="total-label">Buying</span>
          <span class="total-val">${buyTotal.toFixed(2)}</span>
        </div>
        <div class="total-col">
          <span class="total-label">Selling</span>
          <span class="total-val">${sellTotal.toFixed(2)}</span>
        </div>
        <div class="total-col">
          <span class="total-label">Net</span>
          <span class="total-val net" class:negative={netCost < 0}>
            {netCost >= 0 ? '−' : '+'}${Math.abs(netCost).toFixed(2)}
          </span>
        </div>
        <div class="total-col">
          <span class="total-label">After</span>
          <span class="total-val" class:danger={!canAfford}>
            ${(gameState.cash - netCost).toFixed(2)}
          </span>
        </div>
      </div>

      <div class="actions">
        <button type="submit" disabled={!canAfford}>Confirm Trade</button>
        <button type="button" onclick={onclose}>Cancel</button>
        {#if !canAfford}
          <span class="warning">Can't afford this.</span>
        {/if}
      </div>
    </form>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(26, 15, 8, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1em;
    overflow-y: auto;
  }
  .modal-body {
    max-width: 780px;
    width: 100%;
    padding: 1.5em;
    border-color: var(--c-rust);
    max-height: 92vh;
    overflow-y: auto;
  }
  .lede {
    margin: 0 0 1em 0;
  }

  .trade-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1em;
  }
  @media (max-width: 640px) {
    .trade-grid { grid-template-columns: 1fr; }
  }
  .trade-col h4 {
    color: var(--c-rust);
    margin: 0 0 0.5em 0;
    font-size: 0.85em;
    letter-spacing: 0.15em;
  }

  .trade-row {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 0.6em;
    padding: 0.4em 0;
    border-bottom: 1px dashed rgba(138, 90, 42, 0.2);
  }
  .trade-row:last-child { border-bottom: 0; }
  .trade-row-label {
    display: flex;
    flex-direction: column;
    gap: 0.15em;
    min-width: 0;
  }
  .item-name { font-size: 0.95em; }
  .price {
    font-size: 0.8em;
    color: var(--c-wood);
  }
  .own {
    color: var(--c-rust);
    font-weight: 700;
  }

  .empty {
    color: var(--c-wood);
    font-style: italic;
    font-size: 0.9em;
  }

  .totals {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5em;
    padding: 0.7em 0.9em;
    margin-top: 1em;
    background: var(--c-bg-raised);
    border: 1px solid var(--c-ink);
    border-radius: 3px;
    transition: border-color 0.15s;
  }
  .totals.overdraw {
    border-color: #e85a4a;
  }
  .total-col {
    display: flex;
    flex-direction: column;
    gap: 0.1em;
  }
  .total-label {
    font-size: 0.65em;
    letter-spacing: 0.15em;
    color: var(--c-wood);
    font-weight: 700;
  }
  .total-val {
    font-weight: 700;
    font-size: 0.95em;
    color: var(--c-tan-bright);
  }
  .total-val.net {
    color: #c96a2a;
  }
  .total-val.net.negative {
    color: #8bb96a;
  }
  .total-val.danger {
    color: #e85a4a;
  }

  .actions {
    display: flex;
    gap: 0.5em;
    margin-top: 1em;
    align-items: center;
    flex-wrap: wrap;
  }
  .warning {
    color: #e85a4a;
    font-size: 0.85em;
    font-style: italic;
  }
</style>
