<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { ITEMS, type ItemCategory } from '$lib/game/content/items';
  import { foodConsumedToday } from '$lib/game/systems/consumption';
  import { warmthFor } from '$lib/game/systems/warmth';
  import { canBoilWater } from '$lib/game/systems/water-purity';
  import { getClothingCondition, getFootwearCondition } from '$lib/game/systems/clothing-wear';
  import { ICON, icon } from '$lib/data/icon-dictionary';
  import StatIcon from './stat-icons/StatIcon.svelte';
  let { state, onopen }: { state: GameState; onopen?: () => void } = $props();

  const CATEGORY_ORDER: ItemCategory[] = [
    'food',
    'feed',
    'medicine',
    'tool',
    'wagon_part',
    'weapon',
    'ammo',
    'clothing',
    'livestock',
    'comfort',
    'native_trade'
  ];
  const CATEGORY_LABEL: Record<ItemCategory, string> = {
    food: 'Food',
    feed: 'Feed',
    medicine: 'Medicine',
    weapon: 'Weapons',
    ammo: 'Ammo',
    tool: 'Tools',
    wagon_part: 'Parts',
    livestock: 'Livestock',
    clothing: 'Clothing',
    comfort: 'Comfort',
    native_trade: 'Trade'
  };
  const CATEGORY_ICON = ICON.inventory_categories;

  type Entry = { id: string; name: string; qty: number; weight: number };
  type Group = { cat: ItemCategory; entries: Entry[] };

  const groups = $derived.by<Group[]>(() => {
    const byCat: Partial<Record<ItemCategory, Entry[]>> = {};
    for (const [id, qty] of Object.entries(state.inventory)) {
      if (!qty || qty <= 0) continue;
      const meta = ITEMS[id];
      if (!meta) continue;
      (byCat[meta.category] ??= []).push({
        id,
        name: meta.name,
        qty,
        weight: meta.weightLbPerUnit * qty
      });
    }
    return CATEGORY_ORDER
      .filter((c) => byCat[c] && byCat[c]!.length > 0)
      .map((c) => ({
        cat: c,
        entries: byCat[c]!.sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name))
      }));
  });

  // Food summary — pulls the one stat the player cares about most to the
  // top of the panel so they don't have to scan the Food group to answer
  // "how much food do we have?".
  const foodGroup = $derived(groups.find((g) => g.cat === 'food'));
  // Exclude coffee/tea/sugar from the days-remaining calc — they're
  // not calorie staples (coffee/tea are brewed via applyHotDrinks,
  // sugar is a small bonus that doesn't fill bellies).
  const foodLb = $derived(foodGroup
    ? foodGroup.entries.reduce(
        (s, e) => s + (typeof ITEMS[e.id]?.foodDrawOrder === 'number' ? e.weight : 0),
        0
      )
    : 0);
  const dailyFoodLb = $derived(foodConsumedToday(state));
  const foodDays = $derived(dailyFoodLb > 0 ? Math.floor(foodLb / dailyFoodLb) : 0);
  const foodColor = $derived(
    foodDays >= 30 ? 'var(--of-status-good)' :
    foodDays >= 14 ? 'var(--of-status-warn)' :
    foodDays >= 7  ? 'var(--of-status-mid)' : 'var(--of-status-bad)'
  );

  // Warmth — aggregate clothing score (0-100). Each item warms one
  // body, so a party of N needs N of each warmth item to max it out.
  const warmth = $derived(warmthFor(state));
  const aliveCount = $derived(state.party.filter((m) => !m.dead).length);
  const warmthColor = $derived(
    warmth >= 75 ? 'var(--of-status-good)' :
    warmth >= 50 ? 'var(--of-status-warn)' :
    warmth >= 25 ? 'var(--of-status-mid)' : 'var(--of-status-bad)'
  );
  const warmthTip = $derived(
    `Warmth: ${warmth}/100. Each item warms one body — for a party of ${aliveCount}, ` +
    `buy ${aliveCount} coats, ${aliveCount} blankets, etc. ` +
    `Mitigates cold-water ford chill and cold-camp HP loss when no fire. ` +
    `Coat / blanket / buffalo robe = 25 each. Boots = 15. Moccasins = 10.`
  );

  // Water — clean + dirty. Pre-germ-theory parties (1848-1853 with no
  // doctor) don't perceive the distinction; we collapse to total water
  // for them. Once knowledge is unlocked, the breakdown shows.
  const knowsBoiling = $derived(canBoilWater(state));
  const dirtyGal = $derived(state.resources.dirtyWater ?? 0);
  const totalGal = $derived(state.resources.water + dirtyGal);

  // Water bar (#190) — matches the weight/warmth bar treatment. Color
  // goes green-when-full to red-when-empty (inverse of weight, since
  // here "more is good"). When the player knows boiling and has dirty
  // water in the keg, render the bar in two segments: clean (left,
  // water-blue) + dirty (right, rust). One bar; clean+dirty totals fill.
  const waterCap = $derived(state.resources.waterCap);
  const cleanPct = $derived(
    waterCap > 0 ? Math.min(100, Math.round((state.resources.water / waterCap) * 100)) : 0
  );
  const dirtyPct = $derived(
    waterCap > 0 ? Math.min(100 - cleanPct, Math.round((dirtyGal / waterCap) * 100)) : 0
  );
  const waterPct = $derived(cleanPct + dirtyPct);
  const waterColor = $derived(
    waterPct >= 70 ? 'var(--of-status-good)' :
    waterPct >= 30 ? 'var(--of-status-warn)' :
    waterPct >= 10 ? 'var(--of-status-mid)' : 'var(--of-status-bad)'
  );

  // Clothing condition chips (§6.1). Amber <50, red <25, default otherwise.
  const clothingCond = $derived(Math.round(getClothingCondition(state)));
  const footwearCond = $derived(Math.round(getFootwearCondition(state)));
  const clothingChipColor = $derived(
    clothingCond < 25 ? 'var(--of-status-bad)' :
    clothingCond < 50 ? 'var(--of-status-warn)' : 'var(--of-ink-soft)'
  );
  const footwearChipColor = $derived(
    footwearCond < 25 ? 'var(--of-status-bad)' :
    footwearCond < 50 ? 'var(--of-status-warn)' : 'var(--of-ink-soft)'
  );

  const totalWeight = $derived(
    Math.round(groups.reduce((s, g) => s + g.entries.reduce((a, e) => a + e.weight, 0), 0))
  );
  const capacity = $derived(state.wagon.carryCapacity);
  const weightPct = $derived(Math.min(100, Math.round((totalWeight / capacity) * 100)));
  const weightColor = $derived(
    weightPct < 70 ? 'var(--of-status-good)' :
    weightPct < 90 ? 'var(--of-status-warn)' :
    weightPct < 100 ? 'var(--of-status-mid)' : 'var(--of-status-bad)'
  );
</script>

<button type="button" class="panel inventory-panel" onclick={onopen} title="Click for full inventory">
  <div class="ip-head">
    <h4>INVENTORY</h4>
    <span class="expand-hint">▸</span>
  </div>

  <div class="stats">
    <span class="cash">{icon('stats', 'cash')} ${state.cash}</span>
    {#if knowsBoiling && dirtyGal > 0}
      <span class="water" title="Clean / dirty / capacity. Boil dirty before drinking.">
        <StatIcon kind="keg" size={14} className="keg-svg" /> {state.resources.water}<span class="water-dirty">+{dirtyGal}</span>/{state.resources.waterCap} gal
      </span>
    {:else}
      <span class="water"><StatIcon kind="keg" size={14} className="keg-svg" /> {totalGal}/{state.resources.waterCap} gal</span>
    {/if}
  </div>

  <!-- At-a-glance food summary. Days remaining is the number the player
       actually uses to make decisions; lb is included for the math-minded. -->
  <div class="food-summary" title="{Math.round(foodLb)} lb of food / {dailyFoodLb} lb per day">
    <span class="food-icon">{icon('inventory_categories', 'food')}</span>
    <span class="food-days" style="color: {foodColor};">
      <strong>{foodDays}</strong>
      <span class="food-unit">days</span>
    </span>
    <span class="food-lb">{Math.round(foodLb)} lb</span>
  </div>

  <div class="weight-row">
    <span class="weight-label">Weight</span>
    <div class="weight-bar">
      <div class="weight-fill" style="width: {weightPct}%; background: {weightColor};"></div>
    </div>
    <span class="weight-num" style="color: {weightColor};">{totalWeight}/{capacity}</span>
  </div>

  <div class="weight-row" title={warmthTip}>
    <span class="weight-label">{icon('inventory_categories', 'clothing')} Warmth</span>
    <div class="weight-bar">
      <div class="weight-fill" style="width: {warmth}%; background: {warmthColor};"></div>
    </div>
    <span class="weight-num" style="color: {warmthColor};">{warmth}/100</span>
  </div>

  <div class="weight-row" title="Water in the keg{knowsBoiling && dirtyGal > 0 ? ' — clean (left) + dirty (right). Boil at camp before drinking.' : ''}">
    <span class="weight-label"><StatIcon kind="keg" size={13} className="keg-svg" /> Water</span>
    <div class="weight-bar">
      {#if knowsBoiling && dirtyGal > 0}
        <div class="weight-fill" style="width: {cleanPct}%; background: {waterColor};"></div>
        <div class="weight-fill water-dirty-fill" style="left: {cleanPct}%; width: {dirtyPct}%;"></div>
      {:else}
        <div class="weight-fill" style="width: {waterPct}%; background: {waterColor};"></div>
      {/if}
    </div>
    <span class="weight-num" style="color: {waterColor};">{totalGal}/{waterCap}</span>
  </div>

  <!-- Category-grouped items. Short enough per-group that the panel is
       scannable at a glance; full detail lives in the modal. -->
  <div class="groups">
    {#each groups as g}
      <div class="group">
        <div class="group-head">
          <span class="group-icon">{CATEGORY_ICON[g.cat]}</span>
          <span class="group-label">{CATEGORY_LABEL[g.cat]}</span>
          {#if g.cat === 'clothing'}
            <span class="clothing-chips">
              <span class="cond-chip" style="color: {clothingChipColor};">🧥{clothingCond}%</span>
              <span class="cond-sep">·</span>
              <span class="cond-chip" style="color: {footwearChipColor};">🥾{footwearCond}%</span>
            </span>
          {/if}
          <span class="group-count">{g.entries.length}</span>
        </div>
        <div class="group-rows">
          {#each g.entries as e}
            {@const perItemIcon = (ICON.inventory_items as Record<string, string>)[e.id]}
            <div class="row">
              <span class="row-name">{#if perItemIcon}<span class="row-icon">{perItemIcon}</span>{/if}{e.name}</span>
              <span class="row-qty">×{Number.isInteger(e.qty) ? e.qty : e.qty.toFixed(2).replace(/\.?0+$/, '')}</span>
            </div>
          {/each}
        </div>
      </div>
    {/each}
    {#if groups.length === 0}
      <div class="empty">(empty)</div>
    {/if}
  </div>
</button>

<style>
  .inventory-panel {
    display: flex;
    flex-direction: column;
    gap: 0.4em;
    padding: 0.7em 0.9em;
    background: var(--of-paper-soft);
    border: 2px solid var(--of-ink-soft);
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    color: var(--of-ink);
    letter-spacing: normal;
    text-transform: none;
    font-weight: normal;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .inventory-panel:hover:not(:disabled) {
    background: var(--of-paper-soft);
    border-color: var(--of-rust);
    box-shadow: 0 0 0 1px var(--of-rust) inset;
  }

  .ip-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .ip-head h4 {
    color: var(--of-rust);
    margin: 0;
    font-size: 0.75em;
    letter-spacing: 0.15em;
  }
  .expand-hint {
    color: var(--of-ink-soft);
    font-size: 0.85em;
    opacity: 0.6;
  }
  .inventory-panel:hover .expand-hint {
    color: var(--of-rust);
    opacity: 1;
  }

  .stats {
    display: flex;
    /* #1147 — push cash to the left edge, water to the right edge so the
     *  row fills the container instead of bunching to the left with a big
     *  empty right margin (visible especially on small screens / Z Fold 4). */
    justify-content: space-between;
    gap: 0.8em;
    font-size: 0.82em;
    color: var(--of-ink);
  }
  .cash { font-weight: 700; }
  .water { color: var(--of-ink); }
  .water-dirty { color: var(--of-status-mid); font-weight: 700; }

  /* Food summary — the at-a-glance "how long will we last?" chip. */
  .food-summary {
    display: flex;
    align-items: baseline;
    gap: 0.5em;
    padding: 0.3em 0.5em;
    background: var(--of-paper);
    border: 1px solid rgba(138, 90, 42, 0.35);
    border-radius: 3px;
  }
  .food-icon { font-size: 1.1em; line-height: 1; }
  .food-days { display: inline-flex; align-items: baseline; gap: 0.2em; }
  .food-days strong {
    font-weight: 700;
    font-size: 1.25em;
  }
  .food-unit {
    font-size: 0.78em;
    color: var(--of-ink);
  }
  .food-lb {
    margin-left: auto;
    font-size: 0.78em;
    color: var(--of-ink-soft);
    font-style: italic;
  }

  .weight-row {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 0.5em;
    align-items: center;
    font-size: 0.8em;
  }
  .weight-label { color: var(--of-ink-soft); }
  .weight-bar {
    height: 0.6em;
    background: var(--of-paper);
    border: 1px solid var(--of-ink);
    border-radius: 2px;
    overflow: hidden;
    position: relative;
  }
  .weight-fill {
    height: 100%;
    transition: width 0.4s, background 0.4s;
  }
  /* Dirty water segment — sits to the right of the clean segment, in
     a muted rust to match `.water-dirty` in the stats line. The
     diagonal hatch makes it read as "fouled, needs boiling" against
     the solid clean segment. */
  .weight-fill.water-dirty-fill {
    position: absolute;
    top: 0;
    bottom: 0;
    background: repeating-linear-gradient(
      45deg,
      var(--of-status-mid),
      var(--of-status-mid) 3px,
      #8a4a1c 3px,
      #8a4a1c 6px
    );
    transition: left 0.4s, width 0.4s;
  }
  .weight-num {
    font-weight: 700;
    font-size: 0.9em;
    min-width: 4em;
    text-align: right;
  }

  /* Grouped item list. Category heads break the panel into scannable
     chunks; without them the list is a 20-row alphabetical wall. */
  .groups {
    display: flex;
    flex-direction: column;
    gap: 0.35em;
    margin-top: 0.2em;
  }
  .group-head {
    display: flex;
    align-items: baseline;
    gap: 0.35em;
    padding: 0.1em 0.15em 0.15em 0.15em;
    border-bottom: 1px solid rgba(138, 90, 42, 0.35);
  }
  .group-icon { font-size: 0.95em; line-height: 1; }
  .group-label {
    font-size: 0.7em;
    letter-spacing: 0.1em;
    font-weight: 700;
    color: var(--of-rust);
    text-transform: uppercase;
  }
  /* Clothing condition chips — inline in the group header; no wrap. */
  .clothing-chips {
    display: inline-flex;
    align-items: baseline;
    gap: 0.2em;
    font-size: 0.72em;
    font-weight: 700;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .cond-chip {
    font-style: normal;
    letter-spacing: 0.02em;
  }
  .cond-sep {
    color: var(--of-ink-soft);
    font-style: normal;
  }

  .group-count {
    margin-left: auto;
    font-size: 0.72em;
    color: var(--of-ink-soft);
    font-style: italic;
  }
  .group-rows {
    display: flex;
    flex-direction: column;
    gap: 0.05em;
    padding: 0.1em 0.15em;
  }
  .row {
    display: flex;
    justify-content: space-between;
    font-size: 0.8em;
  }
  .row-name { color: var(--of-ink); }
  .row-qty { color: var(--of-rust); font-weight: 700; }
  .empty {
    color: var(--of-ink-soft);
    font-style: italic;
    font-size: 0.85em;
    padding: 0.3em 0;
  }
</style>
