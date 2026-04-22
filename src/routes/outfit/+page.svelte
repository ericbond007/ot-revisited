<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { ITEMS, type ItemCategory } from '$lib/game/content/items';
  import { PRICES } from '$lib/game/content/prices';
  import NumberStepper from '$lib/ui/NumberStepper.svelte';
  import ItemTooltip from '$lib/ui/ItemTooltip.svelte';
  import { getProfession } from '$lib/game/content/professions';

  let { data }: { data: { slot: string; state: GameState; buyables: string[] } } = $props();
  const gs = $derived(data.state);

  // Profession bonuses apply at Independence too — Banker/Merchant discount
  // the shopkeeper's quote. Mirror the math in trade.ts exactly.
  const hasMerchant = $derived(gs.party.some((m) => !m.dead && m.profession === 'merchant'));
  const hasBanker = $derived(gs.party.some((m) => !m.dead && m.profession === 'banker'));
  const buyMult = $derived(1 - (hasMerchant ? 0.15 : 0) - (hasBanker ? 0.10 : 0));

  // Pre-populate qty=0 for every buyable so NumberStepper bindings always have
  // a defined starting value. Initial capture is intentional — data.buyables
  // is static per-page-load.
  // svelte-ignore state_referenced_locally
  let buyQty = $state<Record<string, number>>(
    Object.fromEntries(data.buyables.filter((id) => PRICES[id] && ITEMS[id]).map((id) => [id, 0]))
  );

  const totalCost = $derived(
    Object.entries(buyQty).reduce((s, [id, q]) => s + q * (PRICES[id]?.buy ?? 0) * buyMult, 0)
  );
  const canAfford = $derived(Math.ceil(totalCost) <= gs.cash);

  // Group buyables by category for display.
  type Group = { cat: ItemCategory; ids: string[] };
  const groups = $derived.by<Group[]>(() => {
    const byCat: Partial<Record<ItemCategory, string[]>> = {};
    for (const id of data.buyables) {
      const meta = ITEMS[id];
      if (!meta || !PRICES[id]) continue;
      (byCat[meta.category] ??= []).push(id);
    }
    const order: ItemCategory[] = [
      'food', 'livestock', 'wagon_part', 'weapon', 'ammo', 'tool', 'clothing', 'medicine', 'comfort', 'native_trade'
    ];
    return order
      .filter((c) => byCat[c] && byCat[c]!.length > 0)
      .map((c) => ({ cat: c, ids: byCat[c]! }));
  });

  const CATEGORY_LABEL: Record<ItemCategory, string> = {
    food: 'Food',
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
  const CATEGORY_ICON: Record<ItemCategory, string> = {
    food: '🍖',
    medicine: '💊',
    weapon: '🔫',
    ammo: '🎯',
    tool: '🔨',
    wagon_part: '🛠️',
    livestock: '🐂',
    clothing: '🧥',
    comfort: '🎁',
    native_trade: '🪶'
  };

  // Display the leader's chosen departure flavor
  const leader = $derived(gs.party[0]);
</script>

<div class="outfit-wrap">
  <header class="outfit-head">
    <h1>Outfit the Wagon</h1>
    <p class="lede">
      Last chance to stock up before leaving <strong>Independence, Missouri</strong>.
      Spend what you need — anything left over becomes your travel cash.
    </p>
  </header>

  <section class="party-preview panel">
    <div class="party-head">PARTY</div>
    <div class="party-list">
      {#each gs.party as m}
        {@const prof = getProfession(m.profession)}
        <div class="party-row">
          <strong>{m.name}</strong>
          <span class="prof">({prof.name})</span>
        </div>
      {/each}
    </div>
  </section>

  <div class="totals-bar panel" class:overdraw={!canAfford}>
    <div class="total-cell">
      <span class="total-label">STARTING CASH</span>
      <span class="total-val cash">${gs.cash}</span>
    </div>
    <div class="total-cell">
      <span class="total-label">SPEND</span>
      <span class="total-val spend">−${totalCost.toFixed(2)}</span>
    </div>
    <div class="total-cell">
      <span class="total-label">AFTER DEPARTURE</span>
      <span class="total-val after" class:danger={!canAfford}>
        ${(gs.cash - totalCost).toFixed(2)}
      </span>
    </div>
    {#if hasMerchant || hasBanker}
      <div class="total-cell">
        <span class="total-label">DISCOUNT</span>
        <span class="total-val">
          {hasMerchant && hasBanker ? 'Merchant + Banker' : hasMerchant ? 'Merchant' : 'Banker'}
          · ×{buyMult.toFixed(2)}
        </span>
      </div>
    {/if}
  </div>

  <form method="POST" action="?/outfit&slot={encodeURIComponent(data.slot)}">
    {#each groups as g}
      <section class="group">
        <h3 class="group-head">
          <span class="group-icon">{CATEGORY_ICON[g.cat]}</span>
          {CATEGORY_LABEL[g.cat]}
        </h3>
        <div class="item-grid">
          {#each g.ids as id}
            {@const price = PRICES[id].buy * buyMult}
            <div class="item-row">
              <div class="item-label">
                <ItemTooltip {id}>
                  {#snippet children()}
                    <span class="item-name">{ITEMS[id].name}</span>
                  {/snippet}
                </ItemTooltip>
                <span class="item-price">${price.toFixed(2)} ea</span>
              </div>
              <NumberStepper
                name="buy_{id}"
                bind:value={buyQty[id]}
                min={0}
                max={99}
                ariaLabel="Buy {ITEMS[id].name}"
              />
            </div>
          {/each}
        </div>
      </section>
    {/each}

    <div class="actions">
      <button type="submit" class="depart" disabled={!canAfford}>
        {leader ? `Begin ${leader.name}'s Journey` : 'Begin Journey'}
      </button>
      <a href="/" class="back">Cancel</a>
      {#if !canAfford}
        <span class="warning">Can't afford this — trim the list.</span>
      {/if}
    </div>
  </form>
</div>

<style>
  .outfit-wrap {
    max-width: 980px;
    margin: 0 auto;
    padding: 1.4em 1.2em 3em 1.2em;
    display: flex;
    flex-direction: column;
    gap: 0.9em;
  }

  .outfit-head h1 {
    margin: 0 0 0.2em 0;
    color: var(--c-rust);
    letter-spacing: 0.05em;
  }
  .lede {
    margin: 0 0 0.5em 0;
    color: var(--c-wood);
    font-size: 1em;
  }

  .party-preview {
    padding: 0.7em 0.9em;
    display: flex;
    flex-direction: column;
    gap: 0.3em;
  }
  .party-head {
    font-size: 0.7em;
    letter-spacing: 0.15em;
    color: var(--c-wood);
    font-weight: 700;
  }
  .party-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3em 1.2em;
    font-size: 0.95em;
  }
  .party-row { display: inline-flex; gap: 0.3em; align-items: baseline; }
  .prof { color: var(--c-wood); font-size: 0.85em; }

  .totals-bar {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.5em 1em;
    padding: 0.7em 0.9em;
    transition: border-color 0.15s;
    position: sticky;
    top: 0.4em;
    z-index: 5;
  }
  .totals-bar.overdraw { border-color: #e85a4a; }
  .total-cell { display: flex; flex-direction: column; gap: 0.1em; }
  .total-label {
    font-size: 0.65em;
    letter-spacing: 0.15em;
    color: var(--c-wood);
    font-weight: 700;
  }
  .total-val {
    font-weight: 700;
    font-size: 1.05em;
    color: var(--c-tan-bright);
  }
  .total-val.cash { color: var(--c-tan-bright); }
  .total-val.spend { color: #c96a2a; }
  .total-val.danger { color: #e85a4a; }

  .group-head {
    margin: 0 0 0.3em 0;
    color: var(--c-rust);
    font-size: 0.95em;
    letter-spacing: 0.1em;
    display: flex;
    align-items: baseline;
    gap: 0.4em;
  }
  .group-icon { font-size: 1.1em; }
  .group { margin-bottom: 0.6em; }

  .item-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.2em 1em;
  }
  .item-row {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 0.5em;
    padding: 0.25em 0;
    border-bottom: 1px dashed rgba(138, 90, 42, 0.2);
  }
  .item-label { display: flex; flex-direction: column; gap: 0.1em; min-width: 0; }
  .item-name { font-size: 0.95em; }
  .item-price { font-size: 0.78em; color: var(--c-wood); }

  .actions {
    display: flex;
    gap: 0.8em;
    margin-top: 1em;
    align-items: center;
    flex-wrap: wrap;
  }
  .depart {
    font-size: 1.05em;
    padding: 0.8em 1.5em;
  }
  .back {
    color: var(--c-wood);
    text-decoration: underline;
  }
  .warning {
    color: #e85a4a;
    font-size: 0.9em;
    font-style: italic;
  }
</style>
