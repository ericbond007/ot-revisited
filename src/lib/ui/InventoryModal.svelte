<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { ITEMS, type ItemCategory } from '$lib/game/content/items';
  import { ICON } from '$lib/data/icon-dictionary';
  import ItemTooltip from './ItemTooltip.svelte';
  import StatIcon from './stat-icons/StatIcon.svelte';

  let { state, slot, onclose }: { state: GameState; slot: string; onclose: () => void } = $props();
  const qp = $derived(encodeURIComponent(slot));

  const CATEGORY_ORDER: ItemCategory[] = [
    'food',
    'feed',
    'medicine',
    'weapon',
    'ammo',
    'tool',
    'wagon_part',
    'livestock',
    'clothing',
    'comfort',
    'native_trade'
  ];
  const CATEGORY_LABEL: Record<ItemCategory, string> = {
    food: 'Food',
    feed: 'Feed',
    medicine: 'Medicine',
    weapon: 'Weapons',
    ammo: 'Ammunition',
    tool: 'Tools',
    wagon_part: 'Wagon parts',
    livestock: 'Livestock',
    clothing: 'Clothing',
    comfort: 'Comfort',
    native_trade: 'Trade goods'
  };
  const CATEGORY_ICON = ICON.inventory_categories;

  type Group = {
    cat: ItemCategory;
    entries: Array<{ id: string; name: string; qty: number; weight: number }>;
    totalWeight: number;
  };

  const groups = $derived<Group[]>(
    CATEGORY_ORDER
      .map((cat) => {
        const entries = Object.entries(state.inventory)
          .filter(([id, qty]) => qty > 0 && ITEMS[id]?.category === cat)
          .map(([id, qty]) => {
            const meta = ITEMS[id];
            return {
              id,
              name: meta?.name ?? id,
              qty,
              weight: (meta?.weightLbPerUnit ?? 0) * qty
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name));
        const totalWeight = entries.reduce((s, e) => s + e.weight, 0);
        return { cat, entries, totalWeight };
      })
      .filter((g) => g.entries.length > 0)
  );

  const totalWeight = $derived(groups.reduce((s, g) => s + g.totalWeight, 0));
  const carryCapacity = $derived(state.wagon.carryCapacity);
  const weightPct = $derived(Math.min(100, Math.round((totalWeight / carryCapacity) * 100)));
  const weightColor = $derived(
    weightPct < 70 ? '#8bb96a' :
    weightPct < 90 ? '#f5c96a' :
    weightPct < 100 ? '#c96a2a' : '#e85a4a'
  );
</script>

<div class="modal-backdrop" onclick={onclose} role="presentation">
  <div class="panel modal-body" onclick={(e) => e.stopPropagation()} role="presentation">
    <h2 class="modal-title">📦 Inventory</h2>

    <!-- Header stats -->
    <section class="stat-grid">
      <div class="stat-cell">
        <div class="stat-head">CASH</div>
        <div class="stat-val">${state.cash}</div>
      </div>
      <div class="stat-cell">
        <div class="stat-head">WATER</div>
        <div class="stat-val">
          <StatIcon kind="keg" size={16} className="keg-svg" />
          {state.resources.water} / {state.resources.waterCap} gal
        </div>
      </div>
      <div class="stat-cell wide">
        <div class="stat-head">WEIGHT</div>
        <div class="weight-row">
          <div class="weight-bar">
            <div class="weight-fill" style="width: {weightPct}%; background: {weightColor};"></div>
          </div>
          <span class="weight-num" style="color: {weightColor};">
            {Math.round(totalWeight)} / {carryCapacity} lb
          </span>
        </div>
      </div>
    </section>

    <!-- Item groups -->
    {#each groups as g}
      <section class="section">
        <div class="section-head">
          <span class="cat-icon">{CATEGORY_ICON[g.cat]}</span>
          {CATEGORY_LABEL[g.cat]}
          <span class="cat-weight">— {Math.round(g.totalWeight)} lb</span>
        </div>
        <div class="item-grid">
          {#each g.entries as e}
            {@const perItemIcon = (ICON.inventory_items as Record<string, string>)[e.id]}
            <div class="item-row">
              <ItemTooltip id={e.id}>
                {#snippet children()}
                  <span class="item-name">
                    {#if perItemIcon}<span class="item-icon">{perItemIcon}</span>{/if}{e.name}
                  </span>
                {/snippet}
              </ItemTooltip>
              <span class="item-qty">×{e.qty}</span>
              <form method="POST" action="?/discardItem&slot={qp}" class="discard">
                <input type="hidden" name="itemId" value={e.id} />
                <button type="submit" name="qty" value="1" class="drop-btn" title="Drop 1">−1</button>
                {#if e.qty > 1}
                  <button type="submit" name="qty" value={Math.min(10, e.qty)} class="drop-btn" title="Drop {Math.min(10, e.qty)}">−{Math.min(10, e.qty)}</button>
                {/if}
                {#if e.qty > 10}
                  <button type="submit" name="qty" value={e.qty} class="drop-btn" title="Drop all {e.qty}">all</button>
                {/if}
              </form>
            </div>
          {/each}
        </div>
      </section>
    {/each}

    {#if groups.length === 0}
      <p class="empty">The wagon is bare.</p>
    {/if}

    <div class="actions">
      <button type="button" onclick={onclose}>Close</button>
    </div>
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
    max-width: 680px;
    width: 100%;
    padding: 1.5em;
    border-color: var(--of-rust);
    max-height: 90vh;
    overflow-y: auto;
  }

  .stat-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.4em 0.8em;
    margin-bottom: 1.2em;
  }
  .stat-cell.wide { grid-column: 1 / -1; }
  .stat-head {
    font-size: 0.7em;
    letter-spacing: 0.15em;
    color: var(--of-ink-soft);
    font-weight: 700;
  }
  .stat-val {
    font-size: 1em;
    color: var(--of-ink);
    font-weight: 700;
  }
  .weight-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.5em;
    align-items: center;
    margin-top: 0.2em;
  }
  .weight-bar {
    height: 0.8em;
    background: var(--of-paper);
    border: 1px solid var(--of-ink);
    border-radius: 2px;
    overflow: hidden;
  }
  .weight-fill { height: 100%; transition: width 0.4s, background 0.4s; }
  .weight-num { font-weight: 700; font-size: 0.85em; }

  .section { margin-bottom: 1em; }
  .section-head {
    font-size: 0.75em;
    letter-spacing: 0.12em;
    color: var(--of-ink-soft);
    font-weight: 700;
    margin-bottom: 0.3em;
    display: flex;
    align-items: baseline;
    gap: 0.4em;
  }
  .cat-icon { font-size: 1.1em; }
  .cat-weight {
    font-size: 0.85em;
    color: var(--of-ink-soft);
    font-style: italic;
    font-weight: normal;
    letter-spacing: normal;
    margin-left: auto;
  }

  .item-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0;
  }
  .item-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.9em;
    padding: 0.25em 0.5em;
    border-bottom: 1px dashed rgba(138, 90, 42, 0.18);
  }
  .item-row:nth-child(odd) {
    background: rgba(138, 90, 42, 0.06);
  }
  .item-row:last-child {
    border-bottom: 0;
  }
  .item-name { color: var(--of-ink); }
  .item-qty {
    font-weight: 700;
    color: var(--of-rust);
  }

  /* "Lighten the wagon" controls — visible only at landmarks (#179).
     Compact ghost buttons; one form per row, each submit-button carries
     its own qty value so the player drops 1 / 10 / all in a single click
     without per-row JS state. */
  .discard {
    display: inline-flex;
    gap: 3px;
    margin-left: 6px;
  }
  .drop-btn {
    background: transparent;
    border: 1px solid rgba(138, 90, 42, 0.45);
    color: var(--of-ink-soft);
    font-size: 0.7em;
    padding: 1px 5px;
    border-radius: 2px;
    cursor: pointer;
    line-height: 1.2;
    letter-spacing: 0.02em;
    text-transform: none;
    font-weight: normal;
  }
  .drop-btn:hover {
    background: rgba(232, 90, 74, 0.18);
    color: var(--of-paper-soft);
    border-color: var(--of-bad, #8a2020);
  }

  .empty {
    font-style: italic;
    color: var(--of-ink-soft);
    text-align: center;
    padding: 1em;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 1em;
  }
</style>
