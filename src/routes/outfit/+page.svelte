<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { ITEMS, type ItemCategory } from '$lib/game/content/items';
  import { PRICES } from '$lib/game/content/prices';
  import NumberStepper from '$lib/ui/NumberStepper.svelte';
  import { getProfession } from '$lib/game/content/professions';
  import { getWagon, BRAN_BARREL_UPGRADE_PRICE, type WagonModel, type WagonModelId } from '$lib/game/content/wagons';
  import { BUNDLES, type Bundle } from '$lib/game/content/bundles';
  import { computeCoverage } from '$lib/game/systems/coverage';

  let { data, form }: {
    data: {
      slot: string;
      state: GameState;
      buyables: string[];
      wagons: Record<WagonModelId, WagonModel>;
      defaultWagon: WagonModelId;
      oxPrice: number;
      maxExtraOxen: number;
      suggestedDogName: string;
    };
    form?: { error?: string } | null;
  } = $props();
  const gs = $derived(data.state);

  // Dog
  let bringDog = $state(true);
  // svelte-ignore state_referenced_locally
  let dogName = $state(data.suggestedDogName);

  // Profession bonuses
  const hasMerchant = $derived(gs.party.some((m) => !m.dead && m.profession === 'merchant'));
  const hasBanker = $derived(gs.party.some((m) => !m.dead && m.profession === 'banker'));
  const buyMult = $derived(1 - (hasMerchant ? 0.15 : 0) - (hasBanker ? 0.10 : 0));

  // svelte-ignore state_referenced_locally
  let buyQty = $state<Record<string, number>>(
    Object.fromEntries(data.buyables.filter((id) => PRICES[id] && ITEMS[id]).map((id) => [id, 0]))
  );

  let appliedBundles = $state<Set<string>>(new Set());

  function applyBundle(b: Bundle) {
    for (const [id, qty] of Object.entries(b.kit)) {
      buyQty[id] = (buyQty[id] ?? 0) + qty;
    }
    appliedBundles = new Set(appliedBundles).add(b.id);
  }

  function bundleCost(b: Bundle): number {
    return Object.entries(b.kit).reduce(
      (s, [id, qty]) => s + qty * (PRICES[id]?.buy ?? 0) * buyMult,
      0
    );
  }

  // Wagon + oxen
  // svelte-ignore state_referenced_locally
  let selectedWagon = $state<WagonModelId>(gs.wagon.model);
  let extraOxen = $state(0);
  let branBarrelUpgrade = $state(false);
  // svelte-ignore state_referenced_locally
  let teamKind = $state<'ox' | 'mule'>(
    gs.oxen.find((o) => o.kind === 'mule') ? 'mule' : 'ox'
  );
  const MULE_PRICE_SURCHARGE = 10;

  const WAGON_ORDER: WagonModelId[] = ['light', 'prairie_schooner', 'heavy'];

  const defaultWagonPrice = $derived(data.wagons[data.defaultWagon].price);
  const selectedWagonModel = $derived(getWagon(selectedWagon));
  const wagonCashDiff = $derived(getWagon(gs.wagon.model).price - selectedWagonModel.price);
  const chickenRoom = $derived(
    Math.max(0, selectedWagonModel.chickenCap - (gs.inventory.chicken ?? 0))
  );

  const suppliesCost = $derived(
    Object.entries(buyQty).reduce((s, [id, q]) => s + q * (PRICES[id]?.buy ?? 0) * buyMult, 0)
  );
  const oxenCost = $derived(extraOxen * data.oxPrice);
  const teamSurcharge = $derived(
    teamKind === 'mule' ? (gs.oxen.length + extraOxen) * MULE_PRICE_SURCHARGE : 0
  );
  const branBarrelCost = $derived(
    branBarrelUpgrade && selectedWagonModel.shipsWithBranBarrel !== true
      ? BRAN_BARREL_UPGRADE_PRICE
      : 0
  );
  const totalCost = $derived(suppliesCost + oxenCost + teamSurcharge - wagonCashDiff + branBarrelCost);
  const cashLeft = $derived(gs.cash - totalCost);
  const canAfford = $derived(Math.ceil(totalCost) <= gs.cash);

  const suppliesWeight = $derived(
    Object.entries(buyQty).reduce((s, [id, q]) => s + q * (ITEMS[id]?.weightLbPerUnit ?? 0), 0)
  );
  const starterWeight = $derived(
    Object.entries(gs.inventory).reduce(
      (s, [id, q]) => s + (q || 0) * (ITEMS[id]?.weightLbPerUnit ?? 0),
      0
    )
  );
  const totalWeight = $derived(starterWeight + suppliesWeight);
  const capacity = $derived(selectedWagonModel.carryCapacity);
  const weightPct = $derived(Math.min(100, (totalWeight / capacity) * 100));

  const coverage = $derived(
    computeCoverage({
      party: gs.party,
      starterInventory: gs.inventory,
      basket: buyQty,
      wagonModel: selectedWagon
    })
  );
  const liveSouls = $derived(gs.party.filter((m) => !m.dead).length);

  const startingOxenCount = $derived(gs.oxen.length);
  const totalOxen = $derived(startingOxenCount + extraOxen);
  const teamStatus = $derived.by<{ tone: 'ok' | 'warn' | 'bad'; text: string }>(() => {
    const m = selectedWagonModel;
    if (totalOxen < m.minTeam) {
      return { tone: 'bad', text: `${m.name} needs at least ${m.minTeam} ${teamKind === 'mule' ? 'mules' : 'oxen'} to pull. You have ${totalOxen}.` };
    }
    if (totalOxen < m.optimalTeam) {
      return { tone: 'warn', text: `Below optimal team (${m.optimalTeam}) — below full speed.` };
    }
    if (totalOxen === m.optimalTeam) {
      return { tone: 'ok', text: `Optimal team (${totalOxen}).` };
    }
    return { tone: 'ok', text: `${totalOxen - m.optimalTeam} spare${totalOxen - m.optimalTeam === 1 ? '' : 's'} for insurance.` };
  });
  const canDepart = $derived(canAfford && teamStatus.tone !== 'bad');

  // Collapsing masthead on scroll (#outfit polish).
  let scrollY = $state(0);
  const headerCollapsed = $derived(scrollY > 80);

  // Group buyables by category
  const CATEGORY_LABEL: Record<ItemCategory, string> = {
    food: 'Food', feed: 'Feed', medicine: 'Medicine', weapon: 'Weapons',
    ammo: 'Ammunition', tool: 'Tools', wagon_part: 'Wagon parts',
    livestock: 'Livestock', clothing: 'Clothing', comfort: 'Comfort',
    native_trade: 'Trade goods'
  };
  const CATEGORY_SUB: Partial<Record<ItemCategory, string>> = {
    food: 'Flour, bacon, beans, dried fruit, coffee…',
    medicine: 'Quinine, laudanum, bandages, patent remedies',
    weapon: 'Rifles, pistols, blades',
    ammo: 'Powder, lead, caps — don\'t run dry',
    tool: 'Axe, shovel, rope, lantern, cooking gear',
    wagon_part: 'Wheels, axles, tongue, canvas',
    clothing: 'Coats, boots, blankets — per soul',
    livestock: 'Chickens, dairy cattle',
    feed: 'Grain, hay — essential for mules',
    comfort: 'Harmonica, fiddle, Bible — morale matters',
    native_trade: 'Mirrors, vermilion, knives — for trading with Plains tribes'
  };

  const EXTRACTED_BUYABLES = new Set(['chicken']);
  type Group = { cat: ItemCategory; ids: string[] };
  const groups = $derived.by<Group[]>(() => {
    const byCat: Partial<Record<ItemCategory, string[]>> = {};
    for (const id of data.buyables) {
      if (EXTRACTED_BUYABLES.has(id)) continue;
      const meta = ITEMS[id];
      if (!meta || !PRICES[id]) continue;
      (byCat[meta.category] ??= []).push(id);
    }
    const order: ItemCategory[] = [
      'food', 'medicine', 'tool', 'wagon_part', 'clothing', 'weapon', 'ammo', 'livestock', 'feed', 'comfort', 'native_trade'
    ];
    return order
      .filter((c) => byCat[c] && byCat[c]!.length > 0)
      .map((c) => ({ cat: c, ids: byCat[c]! }));
  });

  let openCats = $state<Record<ItemCategory, boolean>>({
    food: true, feed: false, medicine: true, weapon: false, ammo: false, tool: true,
    wagon_part: false, livestock: false, clothing: false, comfort: false, native_trade: false
  });
  function toggleCat(c: ItemCategory) { openCats[c] = !openCats[c]; }

  let feedAutoOpened = $state(false);
  $effect(() => {
    if (teamKind === 'mule' && !feedAutoOpened) {
      openCats.feed = true;
      feedAutoOpened = true;
    }
  });

  // Search
  let searchQuery = $state('');

  // Coverage dashboard cells — medDoses/spares/tradeQty computed directly
  // because Coverage type only tracks foodDays/waterDays/shots/clothingCov.
  const medDoses = $derived(
    ['quinine', 'laudanum', 'bandages', 'patent_medicine'].reduce(
      (s, id) => s + (gs.inventory[id] ?? 0) + (buyQty[id] ?? 0), 0
    )
  );
  const spareParts = $derived(
    ['wheel', 'axle', 'tongue', 'wagon_canvas'].reduce(
      (s, id) => s + (gs.inventory[id] ?? 0) + (buyQty[id] ?? 0), 0
    )
  );
  const tradeItems = $derived(
    ['mirror', 'vermilion', 'awl', 'thimble', 'calico', 'pocket_knife'].reduce(
      (s, id) => s + (gs.inventory[id] ?? 0) + (buyQty[id] ?? 0), 0
    )
  );
  const dashCells = $derived([
    {
      cat: 'food' as ItemCategory, label: 'Food', icon: '🍞',
      val: `≈ ${Math.round(coverage.foodDays)} days`,
      tone: coverage.foodDays >= 120 ? 'good' : coverage.foodDays >= 60 ? 'mid' : 'low' as 'good' | 'mid' | 'low',
    },
    {
      cat: 'weapon' as ItemCategory, label: 'Shots', icon: '💥',
      val: `${coverage.shots}`,
      tone: coverage.shots >= 100 ? 'good' : coverage.shots >= 30 ? 'mid' : 'low' as 'good' | 'mid' | 'low',
    },
    {
      cat: 'clothing' as ItemCategory, label: 'Clothing', icon: '🧥',
      val: `${Math.round(coverage.clothingCov * liveSouls)}/${liveSouls}`,
      tone: coverage.clothingCov >= 1 ? 'good' : coverage.clothingCov >= 0.5 ? 'mid' : 'low' as 'good' | 'mid' | 'low',
    },
    {
      cat: 'medicine' as ItemCategory, label: 'Medicine', icon: '💊',
      val: `${medDoses} doses`,
      tone: medDoses >= 8 ? 'good' : medDoses >= 3 ? 'mid' : 'low' as 'good' | 'mid' | 'low',
    },
    {
      cat: 'wagon_part' as ItemCategory, label: 'Spares', icon: '⚙️',
      val: `${spareParts}`,
      tone: spareParts >= 2 ? 'good' : spareParts >= 1 ? 'mid' : 'low' as 'good' | 'mid' | 'low',
    },
    {
      cat: 'native_trade' as ItemCategory, label: 'Trade', icon: '🪞',
      val: `${tradeItems}`,
      tone: tradeItems >= 6 ? 'good' : tradeItems >= 2 ? 'mid' : 'low' as 'good' | 'mid' | 'low',
    },
  ]);

  function jumpTo(cat: ItemCategory) {
    openCats[cat] = true;
    setTimeout(() => {
      const el = document.getElementById(`cat-${cat}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  // Bundle expanded state
  let expandedBundleId = $state<string | null>(null);

  function groupQtyCount(ids: string[]): number {
    return ids.reduce((n, id) => n + (buyQty[id] ?? 0), 0);
  }
  function groupSubtotal(ids: string[]): number {
    return ids.reduce((s, id) => s + (buyQty[id] ?? 0) * (PRICES[id]?.buy ?? 0) * buyMult, 0);
  }

  const leader = $derived(gs.party[0]);

  // Wagon chip info
  function wagonChip(id: WagonModelId): { text: string; tone: string } | null {
    if (id === 'light') return { text: 'Nimble', tone: 'good' };
    if (id === 'prairie_schooner') return { text: 'Standard', tone: 'neutral' };
    if (id === 'heavy') return { text: 'Roomy', tone: 'rust' };
    return null;
  }

  // Team color
  const teamNumColor = $derived(
    teamStatus.tone === 'bad' ? 'var(--of-bad)' :
    teamStatus.tone === 'warn' ? 'var(--of-warn)' : 'var(--of-good)'
  );
</script>

<svelte:window bind:scrollY={scrollY} />

<form method="POST" action="?/outfit&slot={encodeURIComponent(data.slot)}" class="of-screen">

  <!-- Hidden form fields for wagon/team -->
  <input type="hidden" name="wagonModel" value={selectedWagon} />
  <input type="hidden" name="extraOxen" value={extraOxen} />
  <input type="hidden" name="teamKind" value={teamKind} />
  {#if branBarrelUpgrade && selectedWagonModel.shipsWithBranBarrel !== true}
    <input type="hidden" name="branBarrelUpgrade" value="1" />
  {/if}
  {#if bringDog}
    <input type="hidden" name="bringDog" value="1" />
    <input type="hidden" name="dogName" value={dogName} />
  {/if}
  <!-- Hidden buy_ fields for each item in buyQty -->
  {#each Object.entries(buyQty) as [id, qty] (id)}
    {#if qty > 0}
      <input type="hidden" name="buy_{id}" value={qty} />
    {/if}
  {/each}

  <!-- ================================================================
       HEADER — Broadsheet masthead
       ================================================================ -->
  <header class="of-header" class:of-header-collapsed={headerCollapsed}>
    <div class="of-mast-l">
      <div class="of-mast-row">
        <span class="of-mast-stamp">From <strong>Independence, Mo.</strong></span>
      </div>
      <div class="of-mast-row">
        <span class="of-mast-stamp">Bound for <strong>Oregon City</strong></span>
        <span class="of-mast-rule">·</span>
        <span class="of-mast-stamp">2,170 mi</span>
      </div>
      <div class="of-mast-row">
        <span class="of-mast-stamp">Wagon-master <strong>{leader?.name ?? 'Unknown'}</strong></span>
        <span class="of-mast-rule">·</span>
        <span class="of-mast-stamp"><strong>{liveSouls}</strong> souls</span>
      </div>
    </div>

    <div class="of-mast-center">
      <div class="of-mast-eyebrow">Day One · April 1848</div>
      <h1 class="of-mast-title">The Outfitting Post</h1>
      <p class="of-mast-sub">Provision the wagon. Last counter before the open trail.</p>
      <div class="of-mast-flourish">❦</div>
      <p class="of-mast-ready">{selectedWagonModel.name} · {totalOxen} {totalOxen === 1 ? 'ox' : 'oxen'} · {Math.round(totalWeight).toLocaleString()} / {capacity.toLocaleString()} lb</p>
    </div>

    <div class="of-mast-r">
      <div class="of-purse-stamp">
        <span class="of-purse-stamp-label">Purse</span>
        <span>
          <span class="of-purse-stamp-big" class:of-bad={cashLeft < 0}>${Math.round(cashLeft)}</span>
          <span class="of-purse-stamp-of">left</span>
        </span>
        <span class="of-purse-stamp-sub">
          spent <strong>${totalCost.toFixed(2)}</strong> of ${gs.cash.toLocaleString()}
        </span>
      </div>
      <button type="submit" class="ohc-setout" disabled={!canDepart}>Set out →</button>
    </div>
  </header>

  {#if form?.error}
    <div class="of-form-error">{form.error}</div>
  {/if}

  <!-- ================================================================
       BODY — main catalog (left) + side rail (right)
       ================================================================ -->
  <div class="of-body">

    <!-- ---- MAIN COL ---- -->
    <div class="of-main" id="of-main-scroll">

      <!-- WAGON PICKER -->
      <section class="of-block">
        <header class="of-block-head">
          <h2 class="of-block-title">Choose a wagon</h2>
          <p class="of-block-sub">Trade off speed, capacity, and how big a team it needs.</p>
        </header>
        <div class="of-wagon-grid">
          {#each WAGON_ORDER as wid}
            {@const wm = data.wagons[wid]}
            {@const chip = wagonChip(wid)}
            {@const isSelected = selectedWagon === wid}
            {@const delta = wm.price - defaultWagonPrice}
            <button
              type="button"
              class="of-wagon-card"
              class:of-wagon-card-selected={isSelected}
              onclick={() => (selectedWagon = wid)}
            >
              <div class="of-wagon-card-head">
                <div>
                  <div class="of-eyebrow">{wm.shortName}</div>
                  <div class="of-wagon-card-name">{wm.name}</div>
                </div>
                {#if chip}
                  <span class="of-wagon-chip of-wagon-chip-{chip.tone}">{chip.text}</span>
                {/if}
              </div>
              <p class="of-wagon-card-blurb">{wm.description}</p>
              <div class="of-wagon-card-stats">
                <div class="of-stat">
                  <span class="of-stat-label">Carry</span>
                  <span class="of-stat-val">{wm.carryCapacity.toLocaleString()} lb</span>
                </div>
                <div class="of-stat">
                  <span class="of-stat-label">Speed</span>
                  <span class="of-stat-val">{wm.baseSpeedMult.toFixed(2)}×</span>
                </div>
                <div class="of-stat">
                  <span class="of-stat-label">Team</span>
                  <span class="of-stat-val">{wm.minTeam}–{wm.optimalTeam}</span>
                </div>
              </div>
              <div class="of-wagon-card-price">
                {#if delta > 0}
                  <span class="of-wagon-price-delta of-wagon-price-surcharge">+${delta}</span>
                {:else if delta < 0}
                  <span class="of-wagon-price-delta of-wagon-price-refund">−${-delta}</span>
                {/if}
                ${wm.price}
              </div>
            </button>
          {/each}
        </div>
        <!-- Bran barrel upgrade — only shows for wagons that don't ship with one -->
        {#if !selectedWagonModel.shipsWithBranBarrel}
          <label class="of-bran-row">
            <input type="checkbox" bind:checked={branBarrelUpgrade} />
            <span class="of-bran-label">Add bran barrel (+${BRAN_BARREL_UPGRADE_PRICE}) — insulates bacon against heat-day rancidity</span>
          </label>
        {:else}
          <p class="of-bran-included">Bran barrel included with this wagon.</p>
        {/if}
      </section>

      <!-- OXEN PANEL -->
      <section class="of-oxen-panel">
        <div class="of-oxen-l">
          <div class="of-eyebrow">Team</div>
          <div class="of-oxen-title">Hitch your team</div>
          <p class="of-oxen-blurb">
            {selectedWagonModel.shortName} needs a minimum of <strong>{selectedWagonModel.minTeam}</strong> to move;
            <strong>{selectedWagonModel.optimalTeam}</strong> is what most emigrants brought.
          </p>
          <!-- Team kind selector -->
          <div class="of-team-kind">
            <label class="of-kind-card" class:of-kind-selected={teamKind === 'ox'}>
              <input type="radio" bind:group={teamKind} value="ox" style="display:none" />
              <span class="of-kind-glyph">🐂</span>
              <span class="of-kind-body">
                <span class="of-kind-label">Oxen</span>
                <span class="of-kind-sub">Graze the prairie · no grain needed</span>
              </span>
            </label>
            <label class="of-kind-card" class:of-kind-selected={teamKind === 'mule'}>
              <input type="radio" bind:group={teamKind} value="mule" style="display:none" />
              <span class="of-kind-glyph">🐴</span>
              <span class="of-kind-body">
                <span class="of-kind-label">Mules <span class="of-kind-surcharge">+${MULE_PRICE_SURCHARGE}/head</span></span>
                <span class="of-kind-sub">+25% speed · mountains · needs grain</span>
              </span>
            </label>
          </div>
        </div>
        <div class="of-oxen-r">
          <div class="of-oxen-stepper">
            <button
              type="button"
              class="of-stepper-btn"
              onclick={() => extraOxen = Math.max(0, extraOxen - 1)}
              disabled={extraOxen <= 0}
            >−</button>
            <div class="of-oxen-count">
              <span class="of-oxen-num" style="color: {teamNumColor};">{totalOxen}</span>
              <span class="of-oxen-glyph">{teamKind === 'mule' ? '🐴' : '🐂'}</span>
            </div>
            <button
              type="button"
              class="of-stepper-btn"
              onclick={() => extraOxen = Math.min(data.maxExtraOxen, extraOxen + 1)}
              disabled={extraOxen >= data.maxExtraOxen}
            >+</button>
          </div>
          <div class="of-oxen-status">
            {#if teamStatus.tone === 'bad'}
              <span class="of-oxen-warn">{teamStatus.text}</span>
            {:else if teamStatus.tone === 'warn'}
              <span class="of-oxen-warn-soft">{teamStatus.text}</span>
            {:else}
              <span class="of-oxen-ok">{teamStatus.text}</span>
            {/if}
          </div>
          <div class="of-oxen-cost">
            {#if extraOxen > 0}
              +{extraOxen} × ${data.oxPrice + (teamKind === 'mule' ? MULE_PRICE_SURCHARGE : 0)} = <strong>${(extraOxen * (data.oxPrice + (teamKind === 'mule' ? MULE_PRICE_SURCHARGE : 0))).toFixed(0)}</strong>
            {:else}
              {startingOxenCount} starter {teamKind === 'mule' ? 'mules' : 'oxen'}
              {#if teamKind === 'mule'}
                · surcharge <strong>${teamSurcharge}</strong>
              {/if}
            {/if}
          </div>
          {#if teamKind === 'mule'}
            <div class="of-grain-hint">
              Mules need grain: ~{totalOxen} lb/day. A 150-day trip = {totalOxen * 150} lb.
            </div>
          {/if}
        </div>
      </section>

      <!-- POULTRY (chickens) -->
      <section class="of-chicken-panel of-panel">
        <div class="of-eyebrow">Poultry</div>
        <div class="of-chicken-row">
          <span class="of-chicken-glyph">🐔</span>
          <div class="of-chicken-body">
            <span class="of-chicken-label">Hens aboard</span>
            <span class="of-chicken-sub">Wagon-capped at {selectedWagonModel.chickenCap} · uncapped eggs (~½/hen/day)</span>
          </div>
          <div class="of-chicken-stepper">
            <span class="of-chicken-have">starter: {gs.inventory.chicken ?? 0}</span>
            <NumberStepper
              name="buy_chicken"
              bind:value={buyQty.chicken}
              min={0}
              max={chickenRoom}
              ariaLabel="Extra hens to buy"
              hideValue
              displayValue={(gs.inventory.chicken ?? 0) + (buyQty.chicken ?? 0)}
              addedValue={buyQty.chicken ?? 0}
            />
          </div>
        </div>
      </section>

      <!-- DOG -->
      <section class="of-dog-panel of-panel">
        <div class="of-eyebrow">Your dog</div>
        <label class="of-dog-row">
          <input type="checkbox" bind:checked={bringDog} class="of-dog-check" />
          <span class="of-dog-toggle-track">
            <span class="of-dog-toggle-thumb" class:of-dog-toggle-thumb-on={bringDog}></span>
          </span>
          <span class="of-dog-glyph">🐕</span>
          <span class="of-dog-body">
            <strong class="of-dog-title">Bring the farm dog</strong>
            <span class="of-dog-sub">Free · +15% hunt yield · +1 morale/day · reduces bandit rolls</span>
          </span>
        </label>
        {#if bringDog}
          <div class="of-dog-name-row">
            <span class="of-dog-name-label">Name</span>
            <input
              type="text"
              class="of-dog-name-input"
              bind:value={dogName}
              placeholder="Shep"
              maxlength="20"
            />
          </div>
        {/if}
      </section>

      <!-- PROVISIONS CATALOG -->
      <section class="of-block">
        <header class="of-block-head">
          <h2 class="of-block-title">Provisions & gear</h2>
          <p class="of-block-sub">Buy what you'll need; the wagon hauls only so much.</p>
        </header>

        <!-- Coverage dashboard -->
        <div class="of-dashboard">
          {#each dashCells as c}
            <button
              type="button"
              class="of-dash-cell of-dash-{c.tone}"
              onclick={() => jumpTo(c.cat)}
              title="Jump to {CATEGORY_LABEL[c.cat]}"
            >
              <span class="of-dash-icon">{c.icon}</span>
              <div class="of-dash-text">
                <span class="of-dash-label">{c.label}</span>
                <span class="of-dash-val">{c.val}</span>
              </div>
            </button>
          {/each}
        </div>

        <!-- Catalog nav — search + jump pills -->
        <div class="of-catnav">
          <div class="of-catnav-search">
            <span class="of-catnav-search-icon">🔎</span>
            <input
              type="search"
              placeholder="Search supplies…"
              bind:value={searchQuery}
              class="of-catnav-input"
            />
            {#if searchQuery}
              <button type="button" class="of-catnav-clear" onclick={() => (searchQuery = '')} title="Clear search">×</button>
            {/if}
          </div>
          <div class="of-catnav-pills">
            {#each groups as g}
              {@const filled = g.ids.filter((id) => (buyQty[id] ?? 0) > 0).length}
              <button
                type="button"
                class="of-catnav-pill"
                class:of-catnav-pill-filled={filled > 0}
                onclick={() => jumpTo(g.cat)}
              >
                {CATEGORY_LABEL[g.cat]}
                <span class="of-catnav-pill-count">{filled > 0 ? filled : g.ids.length}</span>
              </button>
            {/each}
          </div>
        </div>

        <!-- Category sections -->
        <div class="of-catalog">
          {#each groups as g}
            {@const s = searchQuery.trim().toLowerCase()}
            {@const visibleIds = s ? g.ids.filter((id) => (ITEMS[id]?.name ?? '').toLowerCase().includes(s)) : g.ids}
            {#if !s || visibleIds.length > 0}
              {@const isOpen = s ? true : openCats[g.cat]}
              {@const filledCount = g.ids.filter((id) => (buyQty[id] ?? 0) > 0).length}
              <section class="of-section" id="cat-{g.cat}">
                <header
                  class="of-section-head"
                  onclick={s ? undefined : () => toggleCat(g.cat)}
                  role="button"
                  tabindex="0"
                  onkeydown={s ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCat(g.cat); } }}
                >
                  <div class="of-section-titles">
                    <div class="of-section-title">
                      {CATEGORY_LABEL[g.cat]}
                      {#if filledCount > 0}
                        <span class="of-section-count">{filledCount}</span>
                      {/if}
                      <!-- Coverage hint chip -->
                      {#if g.cat === 'food'}
                        {@const tone = coverage.foodDays >= 120 ? 'good' : coverage.foodDays >= 60 ? 'mid' : 'low'}
                        <span class="of-cov of-cov-{tone}">≈ {Math.round(coverage.foodDays)} days</span>
                      {:else if g.cat === 'weapon' || g.cat === 'ammo'}
                        {@const tone = coverage.shots >= 100 ? 'good' : coverage.shots >= 30 ? 'mid' : 'low'}
                        <span class="of-cov of-cov-{tone}">{coverage.shots} shots</span>
                      {:else if g.cat === 'clothing'}
                        {@const tone = coverage.clothingCov >= 1 ? 'good' : coverage.clothingCov >= 0.5 ? 'mid' : 'low'}
                        <span class="of-cov of-cov-{tone}">{Math.round(coverage.clothingCov * liveSouls)}/{liveSouls} covered</span>
                      {:else if g.cat === 'medicine'}
                        {@const tone = medDoses >= 8 ? 'good' : medDoses >= 3 ? 'mid' : 'low'}
                        <span class="of-cov of-cov-{tone}">{medDoses} doses</span>
                      {:else if g.cat === 'wagon_part'}
                        {@const tone = spareParts >= 2 ? 'good' : spareParts >= 1 ? 'mid' : 'low'}
                        <span class="of-cov of-cov-{tone}">{spareParts} spares</span>
                      {:else if g.cat === 'native_trade'}
                        {@const tone = tradeItems >= 6 ? 'good' : tradeItems >= 2 ? 'mid' : 'low'}
                        <span class="of-cov of-cov-{tone}">{tradeItems} trade items</span>
                      {/if}
                    </div>
                    {#if CATEGORY_SUB[g.cat]}
                      <div class="of-section-sub">{CATEGORY_SUB[g.cat]}</div>
                    {/if}
                  </div>
                  {#if !s}
                    <span class="of-section-toggle">{isOpen ? '▾' : '▸'}</span>
                  {/if}
                </header>

                {#if isOpen}
                  <div class="of-section-body">
                    <!-- Plains Trader's Pack bundle shortcut for native_trade -->
                    {#if g.cat === 'native_trade' && !s}
                      {@const traderBundleTotal = (PRICES.mirror?.buy + PRICES.vermilion?.buy + 2 * PRICES.awl?.buy + 3 * PRICES.thimble?.buy + PRICES.calico?.buy + 2 * PRICES.pocket_knife?.buy) * buyMult}
                      <div class="of-bundle-row-inline">
                        <span class="of-bundle-inline-icon">🪞</span>
                        <span class="of-bundle-inline-label">Plains Trader's Pack — mirror · vermilion · awls · thimbles · calico · knives</span>
                        <span class="of-bundle-inline-cost">${traderBundleTotal.toFixed(2)}</span>
                        <button type="button" class="of-bundle-inline-add" onclick={() => {
                          buyQty.mirror = (buyQty.mirror ?? 0) + 1;
                          buyQty.vermilion = (buyQty.vermilion ?? 0) + 1;
                          buyQty.awl = (buyQty.awl ?? 0) + 2;
                          buyQty.thimble = (buyQty.thimble ?? 0) + 3;
                          buyQty.calico = (buyQty.calico ?? 0) + 1;
                          buyQty.pocket_knife = (buyQty.pocket_knife ?? 0) + 2;
                        }}>+ Add Pack</button>
                      </div>
                    {/if}

                    {#each visibleIds as id (id)}
                      {@const price = (PRICES[id]?.buy ?? 0) * buyMult}
                      {@const owned = gs.inventory[id] ?? 0}
                      {@const adding = buyQty[id] ?? 0}
                      {@const total = owned + adding}
                      {@const isBulkCat = g.cat === 'food' || g.cat === 'ammo' || g.cat === 'feed'}
                      <div class="of-row" class:of-row-active={adding > 0} class:of-row-hit={!!searchQuery.trim()}>
                        <span class="of-row-icon">·</span>
                        <div class="of-row-text">
                          <div class="of-row-name">
                            {ITEMS[id]?.name ?? id}
                          </div>
                          <div class="of-row-sub">
                            <span>${price.toFixed(2)} ea</span>
                            <span>·</span>
                            <span>{ITEMS[id]?.weightLbPerUnit ?? 0} lb/unit</span>
                            {#if adding > 0}
                              <span>·</span>
                              <span class="of-row-linetotal">${(adding * price).toFixed(2)} · {(adding * (ITEMS[id]?.weightLbPerUnit ?? 0)).toFixed(0)} lb</span>
                            {/if}
                          </div>
                          {#if owned > 0}
                            <span class="of-row-have">in kit: {owned}</span>
                          {/if}
                        </div>
                        <span class="of-row-leader" aria-hidden="true"></span>
                        <span class="of-row-controls">
                          {#if isBulkCat}
                            <span class="of-bulk-chips">
                              <button type="button" class="of-bulk-chip" onclick={() => { buyQty[id] = (buyQty[id] ?? 0) + 10; }}>+10</button>
                              <button type="button" class="of-bulk-chip" onclick={() => { buyQty[id] = (buyQty[id] ?? 0) + 50; }}>+50</button>
                            </span>
                          {/if}
                          <NumberStepper
                            name="buy_{id}"
                            bind:value={buyQty[id]}
                            min={0}
                            max={id === 'chicken' ? chickenRoom : (isBulkCat ? 999 : 99)}
                            ariaLabel="Buy {ITEMS[id]?.name ?? id}"
                            hideValue
                            displayValue={total}
                            addedValue={adding}
                          />
                        </span>
                      </div>
                    {/each}
                  </div>
                {/if}
              </section>
            {/if}
          {/each}
        </div>
      </section>

    </div><!-- /.of-main -->

    <!-- ================================================================
         SIDE RAIL (right)
         ================================================================ -->
    <aside class="of-rail">

      <!-- Purse panel -->
      <section class="of-panel of-purse">
        <div class="of-eyebrow">Purse</div>
        <div class="of-purse-row">
          <span>Starting cash</span>
          <span>${gs.cash.toLocaleString()}</span>
        </div>
        {#if wagonCashDiff !== 0}
          <div class="of-purse-row">
            <span>Wagon {wagonCashDiff > 0 ? 'refund' : 'surcharge'}</span>
            <span>{wagonCashDiff > 0 ? '+' : ''}${wagonCashDiff}</span>
          </div>
        {/if}
        {#if oxenCost > 0 || teamSurcharge > 0}
          <div class="of-purse-row">
            <span>{teamKind === 'mule' ? 'Mule' : 'Oxen'} cost</span>
            <span>−${(oxenCost + teamSurcharge).toFixed(2)}</span>
          </div>
        {/if}
        {#if suppliesCost > 0}
          <div class="of-purse-row of-purse-row-spend">
            <span>Supplies</span>
            <span>−${suppliesCost.toFixed(2)}</span>
          </div>
        {/if}
        <div class="of-purse-row of-purse-row-net" class:of-bad={cashLeft < 0}>
          <span>Travel cash</span>
          <strong>${cashLeft.toFixed(2)}</strong>
        </div>
        {#if hasMerchant || hasBanker}
          <div class="of-purse-discount">
            {hasMerchant && hasBanker ? 'Merchant+Banker' : hasMerchant ? 'Merchant' : 'Banker'} discount · ×{buyMult.toFixed(2)}
          </div>
        {/if}
      </section>

      <!-- Weight bar -->
      <section class="of-panel">
        <div class="of-eyebrow">Wagon load</div>
        <div class="of-weight-bar">
          <div
            class="of-weight-fill"
            class:of-weight-fill-over={totalWeight > capacity}
            style="width: {Math.min(100, weightPct)}%"
          ></div>
          <div class="of-weight-mark" style="left: 85%"></div>
        </div>
        <div class="of-weight-row">
          <span>{Math.round(totalWeight).toLocaleString()} / {capacity.toLocaleString()} lb</span>
          <span class:of-bad={totalWeight > capacity} class:of-dim={totalWeight <= capacity}>{Math.round(weightPct)}%</span>
        </div>
        {#if totalWeight > capacity}
          <p class="of-flavor of-flavor-bad">
            Over capacity by {Math.round(totalWeight - capacity).toLocaleString()} lb. The {selectedWagonModel.shortName.toLowerCase()} can't haul this load.
          </p>
        {/if}
      </section>

      <!-- Coverage dashboard (rail copy — compact) -->
      <section class="of-panel">
        <div class="of-eyebrow">Coverage at a glance</div>
        <div class="of-dash-rail">
          {#each dashCells as c}
            <button
              type="button"
              class="of-dash-cell of-dash-{c.tone}"
              onclick={() => jumpTo(c.cat)}
              title="Jump to {CATEGORY_LABEL[c.cat]}"
            >
              <span class="of-dash-icon">{c.icon}</span>
              <div class="of-dash-text">
                <span class="of-dash-label">{c.label}</span>
                <span class="of-dash-val">{c.val}</span>
              </div>
            </button>
          {/each}
        </div>
      </section>

      <!-- Bundles panel -->
      <section class="of-panel of-bundles">
        <div class="of-eyebrow">Quick loadouts</div>
        <p class="of-bundles-blurb">Period-realistic shopping lists. Tap to preview, again to add.</p>
        <div class="of-bundles-list">
          {#each BUNDLES as b (b.id)}
            {@const applied = appliedBundles.has(b.id)}
            {@const expanded = expandedBundleId === b.id}
            {@const cost = bundleCost(b)}
            {@const itemIds = Object.keys(b.kit)}
            <div class="of-bundle-card" class:of-bundle-expanded={expanded} class:of-bundle-applied={applied}>
              <button
                type="button"
                class="of-bundle-summary"
                onclick={() => (expandedBundleId = expanded ? null : b.id)}
              >
                <span class="of-bundle-icon">{b.icon}</span>
                <span class="of-bundle-titles">
                  <span class="of-bundle-name">{b.name}</span>
                  <span class="of-bundle-sub">{b.sub}</span>
                </span>
                <span class="of-bundle-meta">
                  <span class="of-bundle-itemcount">{itemIds.length} items</span>
                  <span class="of-bundle-cost">${cost.toFixed(2)}</span>
                </span>
                <span class="of-bundle-chevron">{expanded ? '▾' : '▸'}</span>
              </button>
              {#if expanded}
                <div class="of-bundle-expand">
                  <p class="of-bundle-blurb">{b.blurb}</p>
                  <div class="of-bundle-items">
                    {#each itemIds as id}
                      {@const meta = ITEMS[id]}
                      {#if meta}
                        {@const covered = (buyQty[id] ?? 0) >= (b.kit[id] ?? 0)}
                        <div class="of-bundle-item" class:of-bundle-item-covered={covered}>
                          <span class="of-bundle-item-icon">·</span>
                          <span class="of-bundle-item-name">{meta.name}</span>
                          <span class="of-bundle-item-qty">{b.kit[id]}</span>
                          {#if covered}<span class="of-bundle-item-check">✓</span>{/if}
                        </div>
                      {/if}
                    {/each}
                  </div>
                  <button
                    type="button"
                    class="of-bundle-add"
                    class:of-bundle-add-applied={applied}
                    onclick={() => applyBundle(b)}
                  >
                    {applied ? 'Add again' : `Add to basket · $${cost.toFixed(2)}`}
                  </button>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </section>

      <!-- Starter kit toggle -->
      <section class="of-panel">
        <div class="of-eyebrow">Starter kit</div>
        <p class="of-starter-blurb">
          Your profession gear is already packed. Starter inventory shown as "in kit" markers on each row.
        </p>
      </section>

      <!-- Tips -->
      <section class="of-panel">
        <div class="of-eyebrow">Trail wisdom</div>
        <ul class="of-tips">
          <li><strong>Pack light.</strong> Every pound over cap slows you and breaks things faster.</li>
          <li><strong>Food math.</strong> ~2 lb per adult per day. 120 days × 4 souls = ~1,000 lb.</li>
          <li><strong>Spare oxen.</strong> One dies on trail, you need a replacement the next morning.</li>
          <li><strong>Spare parts.</strong> Wheel + axle + tongue + canvas — cheap trail insurance.</li>
          <li><strong>Medicine.</strong> Quinine for fever, bandages for wounds.</li>
        </ul>
      </section>

    </aside><!-- /.of-rail -->

  </div><!-- /.of-body -->

  <!-- ================================================================
       FOOTER — totals + cancel/confirm
       ================================================================ -->
  <footer class="of-footer of-footer-v2">
    <div class="of-footer-l">
      <div class="of-foot-cell">
        <span class="of-eyebrow">Total spend</span>
        <span class="of-foot-val of-foot-val-big">${totalCost.toFixed(2)}</span>
      </div>
      <div class="of-foot-cell">
        <span class="of-eyebrow">Travel cash</span>
        <span class="of-foot-val" class:of-bad={cashLeft < 0}>${cashLeft.toFixed(2)}</span>
      </div>
      <div class="of-foot-cell">
        <span class="of-eyebrow">Load</span>
        <span class="of-foot-val" class:of-bad={totalWeight > capacity}>{Math.round(totalWeight).toLocaleString()} / {capacity.toLocaleString()} lb</span>
      </div>
    </div>

    <div class="of-footer-actions">
      <a href="/" class="of-btn of-btn-cancel">Cancel</a>
      <div class="of-confirm-stack">
        <button
          type="submit"
          class="of-btn of-btn-confirm"
          disabled={!canDepart}
        >
          {leader ? `Set out — ${leader.name}'s wagon` : 'Set out for Oregon'}
        </button>
        {#if canDepart}
          <span class="of-confirm-status of-confirm-status-ok">✓ Ready to depart</span>
        {:else if !canAfford}
          <span class="of-confirm-status of-confirm-status-fail">Over budget — trim the list</span>
        {:else if teamStatus.tone === 'bad'}
          <span class="of-confirm-status of-confirm-status-fail">Under-yoked — add {selectedWagonModel.minTeam - totalOxen} more</span>
        {:else}
          <span class="of-confirm-status of-confirm-status-warn">Check departure requirements</span>
        {/if}
      </div>
    </div>
  </footer>

</form>

<style>
  /* ===========================================================================
     /outfit — broadsheet single-screen layout
     Follows: docs/handoff/ui-redesign/Outfit Screen.html (.of-* classes only)
     =========================================================================== */

  :root {
    --of-paper:        #e8d4a8;
    --of-paper-soft:   #f0e0bd;
    --of-paper-deep:   #d8c08a;
    --of-paper-edge:   #b89a64;
    --of-ink:          #2a1d0c;
    --of-ink-soft:     #5a3f1c;
    --of-ink-faded:    #8a6a3c;
    --of-rule:         rgba(74, 46, 21, 0.32);
    --of-rule-soft:    rgba(74, 46, 21, 0.18);
    --of-rust:         #94340e;
    --of-rust-dark:    #5e1f08;
    --of-good:         #486c2a;
    --of-warn:         #a86a18;
    --of-bad:          #8a1c0c;
    --of-display:      'Rye', 'Smythe', Georgia, serif;
    --of-body:         'IM Fell English', Georgia, serif;
    --of-sc:           'IM Fell English SC', 'IM Fell English', Georgia, serif;
    --of-mono:         'Special Elite', 'Courier New', ui-monospace, monospace;
    --of-fs-eyebrow:   clamp(14px, 1.05vw, 16px);
    --of-fs-meta:      clamp(14px, 1.05vw, 16px);
    --of-fs-sub:       clamp(15px, 1.15vw, 17px);
    --of-fs-body:      clamp(16px, 1.2vw, 18px);
    --of-fs-label:     clamp(13px, 0.95vw, 15px);
    --of-fs-chip:      clamp(12px, 0.9vw, 14px);
    --of-btn-emboss:
      inset 0 1px 0 rgba(255, 245, 220, 0.65),
      inset 0 2px 4px rgba(74, 46, 21, 0.18),
      inset 0 -2px 0 rgba(0, 0, 0, 0.14),
      inset 0 0 0 1px rgba(94, 60, 24, 0.28),
      0 1px 0 rgba(255, 245, 220, 0.45),
      0 2px 3px rgba(74, 46, 21, 0.20),
      0 4px 6px rgba(74, 46, 21, 0.12);
    --of-btn-emboss-active:
      inset 0 3px 5px rgba(0, 0, 0, 0.28),
      inset 0 -1px 0 rgba(255, 245, 220, 0.20),
      inset 0 0 0 1px rgba(94, 60, 24, 0.40);
    --of-btn-emboss-strong:
      inset 0 2px 0 rgba(255, 220, 180, 0.50),
      inset 0 3px 4px rgba(0, 0, 0, 0.20),
      inset 0 -2px 0 rgba(0, 0, 0, 0.28),
      inset 0 -3px 4px rgba(255, 220, 180, 0.20),
      inset 0 0 0 1px rgba(0, 0, 0, 0.28),
      0 1px 0 rgba(255, 220, 180, 0.28),
      0 3px 4px rgba(74, 46, 21, 0.28),
      0 6px 10px rgba(74, 46, 21, 0.18);
  }

  /* ----- Screen shell ----- */
  .of-screen {
    width: 100%;
    min-height: 100vh;
    background: var(--of-paper);
    display: grid;
    grid-template-rows: auto 1fr auto;
    font-family: var(--of-body);
    color: var(--of-ink);
    box-sizing: border-box;
    position: relative;
    background-image:
      radial-gradient(circle 6px at 12% 18%,  rgba(94, 60, 24, 0.28), transparent 70%),
      radial-gradient(circle 4px at 28% 7%,   rgba(94, 60, 24, 0.22), transparent 70%),
      radial-gradient(circle 9px at 88% 12%,  rgba(94, 60, 24, 0.22), transparent 70%),
      radial-gradient(circle 5px at 6% 62%,   rgba(94, 60, 24, 0.20), transparent 70%),
      radial-gradient(circle 7px at 64% 78%,  rgba(94, 60, 24, 0.18), transparent 70%),
      radial-gradient(circle 4px at 38% 88%,  rgba(94, 60, 24, 0.22), transparent 70%),
      radial-gradient(circle 8px at 92% 64%,  rgba(94, 60, 24, 0.16), transparent 70%),
      radial-gradient(circle 3px at 54% 42%,  rgba(94, 60, 24, 0.18), transparent 70%),
      radial-gradient(ellipse 720px 380px at -10% -10%, rgba(184, 154, 100, 0.55), transparent 60%),
      radial-gradient(ellipse 720px 380px at 110% 110%, rgba(94, 60, 24, 0.38), transparent 60%),
      radial-gradient(ellipse 1100px 220px at 50% 0%, rgba(0, 0, 0, 0.06), transparent 60%),
      linear-gradient(180deg, transparent 20%, rgba(94, 60, 24, 0.025) 40%, transparent 60%);
    background-repeat: no-repeat;
  }
  .of-screen .of-eyebrow {
    font-family: var(--of-sc);
    font-size: var(--of-fs-eyebrow);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--of-ink-soft);
    font-weight: 400;
    opacity: 0.9;
  }

  /* ----- Header — broadsheet masthead ----- */
  .of-header {
    position: relative;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: stretch;
    padding: 0;
    background: transparent;
    border: 0;
    color: var(--of-ink);
    z-index: 1;
  }
  .of-header::before,
  .of-header::after {
    content: "";
    position: absolute;
    left: 18px; right: 18px;
    height: 0;
    border-top: 3px double var(--of-ink);
    pointer-events: none;
  }
  .of-header::before { top: 6px; }
  .of-header::after  { bottom: 6px; }

  .of-mast-l, .of-mast-r {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    padding: 22px 28px 18px;
    font-family: var(--of-sc);
  }
  .of-mast-l { align-items: flex-start; }
  .of-mast-r { align-items: flex-end; }
  .of-mast-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    line-height: 1.1;
  }
  .of-mast-stamp {
    font-family: var(--of-sc);
    font-size: var(--of-fs-meta);
    letter-spacing: 0.20em;
    text-transform: uppercase;
    color: var(--of-ink-soft);
  }
  .of-mast-stamp strong {
    color: var(--of-ink);
    font-family: var(--of-display);
    font-weight: 400;
    font-size: clamp(20px, 1.4vw, 22px);
    letter-spacing: 0.03em;
    margin-left: 4px;
  }
  .of-mast-rule { color: var(--of-ink-faded); padding: 0 2px; }

  .of-mast-center {
    text-align: center;
    padding: 14px 36px 12px;
    position: relative;
  }
  .of-mast-eyebrow {
    font-family: var(--of-sc);
    font-size: var(--of-fs-eyebrow);
    letter-spacing: 0.30em;
    text-transform: uppercase;
    color: var(--of-ink-soft);
    margin-bottom: 4px;
  }
  .of-mast-title {
    margin: 0;
    font-family: var(--of-display);
    font-size: clamp(40px, 3.4vw, 52px);
    color: var(--of-ink);
    letter-spacing: 0.06em;
    line-height: 1;
    text-shadow: 0 1px 0 rgba(0,0,0,0.06);
  }
  .of-mast-sub {
    margin: 6px 0 0;
    font-family: var(--of-body);
    font-style: italic;
    font-size: clamp(17px, 1.25vw, 20px);
    color: var(--of-ink-soft);
    line-height: 1.2;
  }
  .of-mast-flourish {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-top: 8px;
    color: var(--of-ink-faded);
    font-family: var(--of-display);
    font-size: 16px;
    letter-spacing: 0.10em;
  }
  .of-mast-flourish::before,
  .of-mast-flourish::after {
    content: "";
    flex: 0 0 60px;
    height: 0;
    border-top: 1px solid var(--of-ink-faded);
  }

  /* Purse stamp */
  .of-purse-stamp {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    line-height: 1.05;
  }
  .of-purse-stamp-label {
    font-family: var(--of-sc);
    font-size: var(--of-fs-meta);
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--of-ink-soft);
  }
  .of-purse-stamp-big {
    font-family: var(--of-display);
    font-size: clamp(38px, 2.8vw, 44px);
    color: var(--of-rust);
    letter-spacing: 0.02em;
    line-height: 1;
    margin-top: 2px;
  }
  .of-purse-stamp-of {
    font-family: var(--of-sc);
    font-size: var(--of-fs-meta);
    color: var(--of-ink-soft);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin-left: 6px;
  }
  .of-purse-stamp-sub {
    font-family: var(--of-body);
    font-style: italic;
    font-size: var(--of-fs-sub);
    color: var(--of-ink-soft);
    margin-top: 4px;
  }
  .of-purse-stamp-sub strong {
    color: var(--of-ink);
    font-style: normal;
    font-family: var(--of-mono);
    font-weight: 400;
  }

  /* Form error */
  .of-form-error {
    background: rgba(138, 28, 12, 0.12);
    border: 2px solid var(--of-bad);
    color: var(--of-bad);
    padding: 10px 28px;
    font-weight: 700;
    font-size: var(--of-fs-body);
  }

  /* ----- Body grid ----- */
  .of-body {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 20px;
    padding: 26px 28px 18px;
    min-height: 0;
    overflow: visible;
  }
  .of-main {
    min-height: 0;
    overflow-y: visible;
    padding-right: 4px;
    display: flex;
    flex-direction: column;
    gap: 22px;
  }
  .of-block {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .of-block-head {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-bottom: 8px;
    border-bottom: 3px double var(--of-ink-soft);
  }
  .of-block-title {
    font-family: var(--of-display);
    font-size: clamp(28px, 2.2vw, 34px);
    color: var(--of-ink);
    margin: 0;
    letter-spacing: 0.04em;
    line-height: 1.05;
  }
  .of-block-sub {
    margin: 2px 0 0;
    font-family: var(--of-body);
    font-style: italic;
    color: var(--of-ink-soft);
    font-size: var(--of-fs-sub);
    line-height: 1.4;
  }

  /* Panels */
  .of-panel {
    background: var(--of-paper-soft);
    border: 3px double var(--of-ink-soft);
    border-radius: 2px;
    padding: 12px 14px;
    box-shadow:
      inset 0 0 18px rgba(94, 60, 24, 0.06),
      inset 0 0 0 1px rgba(255, 245, 220, 0.32),
      0 1px 0 rgba(0, 0, 0, 0.08),
      0 4px 8px rgba(0, 0, 0, 0.06);
    position: relative;
  }
  .of-panel > .of-eyebrow:first-child {
    display: block;
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--of-rule-soft);
  }

  /* ----- Wagon picker ----- */
  .of-wagon-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 14px;
  }
  .of-wagon-card {
    background: var(--of-paper-soft);
    border: 3px double var(--of-ink-soft);
    border-radius: 2px;
    padding: 16px 18px 22px;
    text-align: left;
    cursor: pointer;
    color: var(--of-ink);
    font-family: var(--of-body);
    text-transform: none;
    letter-spacing: 0;
    font-weight: 400;
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: border-color 0.12s;
    position: relative;
    box-shadow:
      inset 0 0 22px rgba(94, 60, 24, 0.10),
      inset 0 0 0 1px rgba(255, 245, 220, 0.30),
      0 1px 0 rgba(0, 0, 0, 0.06),
      0 4px 10px rgba(0, 0, 0, 0.08);
  }
  .of-wagon-card:hover:not(.of-wagon-card-selected) { border-color: var(--of-ink); }
  .of-wagon-card-selected {
    border-color: var(--of-rust);
    border-style: double;
    border-width: 5px;
    padding: 14px 16px 20px;
    box-shadow: inset 0 0 0 1px var(--of-rust), 0 2px 0 rgba(0, 0, 0, 0.05);
  }
  .of-wagon-card-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .of-wagon-card-name {
    font-family: var(--of-display);
    font-size: 26px;
    margin-top: 4px;
    color: var(--of-ink);
    line-height: 1;
    letter-spacing: 0.02em;
  }
  .of-wagon-chip {
    font-family: var(--of-sc);
    font-size: 13px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    font-weight: 400;
    padding: 3px 9px;
    border-radius: 2px;
    border: 1.5px solid;
  }
  .of-wagon-chip-good    { color: var(--of-good); border-color: var(--of-good); background: rgba(72,108,42,0.10); }
  .of-wagon-chip-rust    { color: var(--of-rust); border-color: var(--of-rust); background: rgba(148,52,14,0.10); }
  .of-wagon-chip-neutral { color: var(--of-ink-soft); border-color: var(--of-rule); }
  .of-wagon-card-blurb {
    margin: 0;
    font-family: var(--of-body);
    font-style: italic;
    color: var(--of-ink-soft);
    font-size: var(--of-fs-body);
    line-height: 1.45;
  }
  .of-wagon-card-stats {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
    padding-top: 10px;
    border-top: 3px double var(--of-rule);
  }
  .of-stat { display: flex; flex-direction: column; gap: 2px; }
  .of-stat-label {
    font-family: var(--of-sc);
    font-size: var(--of-fs-label);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--of-ink-soft);
    opacity: 0.9;
    font-weight: 400;
  }
  .of-stat-val {
    font-family: var(--of-mono);
    font-size: var(--of-fs-body);
    font-weight: 700;
    color: var(--of-ink);
    font-variant-numeric: tabular-nums;
  }
  .of-wagon-card-price {
    position: absolute;
    bottom: 14px;
    right: 18px;
    font-size: clamp(26px, 2vw, 32px);
    color: var(--of-rust);
    font-family: var(--of-display);
    letter-spacing: 0.02em;
  }
  .of-wagon-price-delta {
    font-family: var(--of-sc);
    font-size: var(--of-fs-label);
    font-weight: 700;
    margin-right: 6px;
  }
  .of-wagon-price-refund { color: var(--of-good); }
  .of-wagon-price-surcharge { color: var(--of-rust); }
  .of-bran-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--of-body);
    font-style: italic;
    font-size: var(--of-fs-sub);
    color: var(--of-ink-soft);
    cursor: pointer;
    padding: 6px 0;
  }
  .of-bran-row input { accent-color: var(--of-rust); cursor: pointer; }
  .of-bran-label { color: var(--of-ink-soft); }
  .of-bran-included {
    font-family: var(--of-body);
    font-style: italic;
    font-size: var(--of-fs-sub);
    color: var(--of-good);
    margin: 4px 0;
  }

  /* ----- Oxen panel ----- */
  .of-oxen-panel {
    background: var(--of-paper-soft);
    border: 3px double var(--of-ink-soft);
    border-radius: 2px;
    padding: 16px 20px;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 24px;
    align-items: center;
    box-shadow:
      inset 0 0 22px rgba(94, 60, 24, 0.10),
      inset 0 0 0 1px rgba(255, 245, 220, 0.30),
      0 1px 0 rgba(0, 0, 0, 0.06);
  }
  .of-oxen-l { display: flex; flex-direction: column; gap: 4px; }
  .of-oxen-title {
    font-family: var(--of-display);
    font-size: clamp(24px, 1.8vw, 28px);
    color: var(--of-ink);
    letter-spacing: 0.03em;
    line-height: 1;
  }
  .of-oxen-blurb {
    margin: 4px 0 0;
    font-family: var(--of-body);
    font-style: italic;
    color: var(--of-ink-soft);
    font-size: var(--of-fs-body);
    line-height: 1.5;
    max-width: 500px;
  }
  .of-team-kind {
    display: flex;
    gap: 8px;
    margin-top: 10px;
  }
  .of-kind-card {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--of-paper);
    border: 2px solid var(--of-ink-soft);
    border-radius: 2px;
    cursor: pointer;
    transition: border-color 0.12s, background 0.12s;
    flex: 1;
  }
  .of-kind-card:hover { border-color: var(--of-rust); }
  .of-kind-selected {
    background: var(--of-rust-dark);
    border-color: var(--of-rust);
  }
  .of-kind-glyph { font-size: 1.6em; line-height: 1; }
  .of-kind-body { display: flex; flex-direction: column; gap: 1px; }
  .of-kind-label { color: var(--of-ink); font-weight: 700; font-size: var(--of-fs-body); }
  .of-kind-sub { font-size: var(--of-fs-label); color: var(--of-ink-soft); }
  .of-kind-selected .of-kind-label { color: var(--of-paper-soft); }
  .of-kind-selected .of-kind-sub { color: var(--of-paper-soft); opacity: 0.8; }
  .of-kind-surcharge { font-size: 0.8em; color: var(--of-warn); margin-left: 4px; }
  .of-kind-selected .of-kind-surcharge { color: var(--of-paper-soft); opacity: 0.85; }
  .of-oxen-r { display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
  .of-oxen-stepper {
    display: inline-flex;
    align-items: center;
    gap: 14px;
    background: var(--of-paper);
    border: 3px double var(--of-ink-soft);
    border-radius: 2px;
    padding: 8px 16px;
  }
  .of-stepper-btn {
    background: var(--of-paper-soft);
    color: var(--of-ink);
    border: 2px solid var(--of-ink-soft);
    border-radius: 2px;
    width: 34px; height: 34px;
    padding: 0;
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    font-family: var(--of-display);
    box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.08);
  }
  .of-stepper-btn:hover:not(:disabled) {
    background: var(--of-paper-deep);
    border-color: var(--of-ink);
  }
  .of-stepper-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .of-oxen-count {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 92px;
    justify-content: center;
  }
  .of-oxen-num {
    font-family: var(--of-display);
    font-size: clamp(32px, 2.4vw, 38px);
    min-width: 42px;
    text-align: center;
    letter-spacing: 0.02em;
  }
  .of-oxen-glyph { font-size: clamp(22px, 1.6vw, 26px); }
  .of-oxen-status {
    font-family: var(--of-sc);
    font-size: var(--of-fs-label);
    letter-spacing: 0.16em;
    text-transform: uppercase;
    text-align: right;
  }
  .of-oxen-warn { color: var(--of-bad); }
  .of-oxen-warn-soft { color: var(--of-warn); }
  .of-oxen-ok { color: var(--of-good); }
  .of-oxen-cost {
    font-family: var(--of-mono);
    font-size: var(--of-fs-body);
    color: var(--of-ink);
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
  .of-grain-hint {
    font-family: var(--of-body);
    font-style: italic;
    font-size: var(--of-fs-label);
    color: var(--of-warn);
    text-align: right;
    max-width: 220px;
    line-height: 1.4;
  }

  /* Chicken panel */
  .of-chicken-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 4px;
  }
  .of-chicken-glyph { font-size: 24px; line-height: 1; }
  .of-chicken-body { display: flex; flex-direction: column; gap: 2px; flex: 1; }
  .of-chicken-label { font-family: var(--of-body); font-weight: 700; font-size: var(--of-fs-body); color: var(--of-ink); }
  .of-chicken-sub { font-family: var(--of-body); font-style: italic; font-size: var(--of-fs-label); color: var(--of-ink-soft); }
  .of-chicken-stepper {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .of-chicken-have {
    font-family: var(--of-sc);
    font-size: var(--of-fs-label);
    color: var(--of-ink-soft);
    letter-spacing: 0.08em;
  }

  /* Dog panel */
  .of-dog-row {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    padding: 6px 0;
    margin-top: 4px;
  }
  .of-dog-check { display: none; }
  .of-dog-toggle-track {
    display: inline-block;
    width: 32px; height: 18px;
    background: var(--of-paper);
    border: 1.5px solid var(--of-ink-soft);
    border-radius: 9px;
    position: relative;
    flex-shrink: 0;
    transition: background 0.16s;
  }
  .of-dog-check:checked ~ .of-dog-toggle-track { background: var(--of-rust); border-color: var(--of-rust-dark); }
  .of-dog-toggle-thumb {
    position: absolute;
    top: 1px; left: 1px;
    width: 12px; height: 12px;
    background: var(--of-ink-soft);
    border-radius: 50%;
    transition: left 0.16s, background 0.16s;
  }
  .of-dog-toggle-thumb-on { left: 16px; background: var(--of-paper-soft); }
  .of-dog-glyph { font-size: 22px; line-height: 1; }
  .of-dog-body { display: flex; flex-direction: column; gap: 2px; flex: 1; }
  .of-dog-title { font-family: var(--of-body); font-weight: 700; font-size: var(--of-fs-body); color: var(--of-ink); }
  .of-dog-sub { font-family: var(--of-body); font-style: italic; font-size: var(--of-fs-label); color: var(--of-ink-soft); line-height: 1.4; }
  .of-dog-name-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    padding-left: 52px;
  }
  .of-dog-name-label {
    font-family: var(--of-sc);
    font-size: var(--of-fs-label);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--of-ink-soft);
  }
  .of-dog-name-input {
    flex: 1;
    max-width: 160px;
    padding: 4px 8px;
    background: var(--of-paper);
    color: var(--of-ink);
    border: 2px solid var(--of-ink-soft);
    border-radius: 2px;
    font-family: var(--of-body);
    font-size: var(--of-fs-body);
    font-weight: 700;
  }
  .of-dog-name-input:focus { outline: 2px solid var(--of-rust); outline-offset: -2px; }

  /* ----- Coverage dashboard strip ----- */
  .of-dashboard {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 6px;
    margin-bottom: 10px;
  }
  .of-dash-rail {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin-top: 8px;
  }
  .of-dash-cell {
    display: grid;
    grid-template-columns: 22px 1fr;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: var(--of-paper-soft);
    border: 1.5px solid var(--of-rule);
    border-radius: 3px;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    text-transform: none;
    letter-spacing: 0;
    font-weight: 400;
    color: var(--of-ink);
    transition: border-color 0.12s;
  }
  .of-dash-cell:hover { border-color: var(--of-ink-soft); }
  .of-dash-icon { font-size: 16px; line-height: 1; text-align: center; }
  .of-dash-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; line-height: 1.1; }
  .of-dash-label {
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--of-ink-soft);
    opacity: 0.7;
  }
  .of-dash-val {
    font-size: 13px;
    font-weight: 700;
    color: var(--of-ink);
    font-variant-numeric: tabular-nums;
  }
  .of-dash-good { border-left: 4px solid var(--of-good); padding-left: 7px; }
  .of-dash-good .of-dash-val { color: var(--of-good); }
  .of-dash-mid { border-left: 4px solid var(--of-warn); padding-left: 7px; }
  .of-dash-mid .of-dash-val { color: var(--of-warn); }
  .of-dash-low { border-left: 4px solid var(--of-bad); padding-left: 7px; background: rgba(154, 40, 24, 0.04); }
  .of-dash-low .of-dash-val { color: var(--of-bad); }

  /* ----- Catalog nav ----- */
  .of-catnav {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
    background: var(--of-paper-soft);
    border: 1px solid var(--of-rule);
    border-radius: 3px;
    margin-bottom: 8px;
    position: sticky;
    top: 52px;
    z-index: 4;
    box-shadow: 0 4px 10px rgba(74, 46, 21, 0.08);
  }
  .of-catnav-search {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--of-paper);
    border: 1.5px solid var(--of-ink-soft);
    border-radius: 3px;
    padding: 4px 10px;
  }
  .of-catnav-search-icon { font-size: 13px; color: var(--of-ink-soft); opacity: 0.6; }
  .of-catnav-input {
    flex: 1;
    border: 0;
    background: transparent;
    color: var(--of-ink);
    font-family: inherit;
    font-size: 13px;
    padding: 4px 0;
    outline: none;
  }
  .of-catnav-input::placeholder { color: var(--of-ink-soft); opacity: 0.6; font-style: italic; }
  .of-catnav-clear {
    background: transparent;
    border: 0;
    color: var(--of-ink-soft);
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 0 4px;
    text-transform: none;
    letter-spacing: 0;
    font-weight: 400;
  }
  .of-catnav-clear:hover { color: var(--of-bad); }
  .of-catnav-pills { display: flex; gap: 4px; flex-wrap: wrap; }
  .of-catnav-pill {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    padding: 4px 9px;
    background: var(--of-paper);
    color: var(--of-ink-soft);
    border: 1px solid var(--of-rule);
    border-radius: 12px;
    cursor: pointer;
    font-family: inherit;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    transition: border-color 0.12s, color 0.12s, background 0.12s;
  }
  .of-catnav-pill:hover { border-color: var(--of-rust); color: var(--of-ink); }
  .of-catnav-pill-filled { background: var(--of-rust); color: var(--of-paper-soft); border-color: var(--of-rust-dark); }
  .of-catnav-pill-filled:hover { color: var(--of-paper-soft); }
  .of-catnav-pill-count { font-size: 12px; background: rgba(0, 0, 0, 0.12); padding: 1px 5px; border-radius: 8px; color: inherit; font-variant-numeric: tabular-nums; }
  .of-catnav-pill-filled .of-catnav-pill-count { background: rgba(255, 255, 255, 0.22); }

  /* ----- Category sections ----- */
  .of-catalog { display: flex; flex-direction: column; gap: 10px; }
  .of-section {
    background: var(--of-paper-soft);
    border: 3px double var(--of-ink-soft);
    border-radius: 2px;
    overflow: hidden;
    box-shadow:
      inset 0 0 20px rgba(94, 60, 24, 0.08),
      inset 0 0 0 1px rgba(255, 245, 220, 0.30),
      0 1px 0 rgba(0, 0, 0, 0.06);
  }
  .of-section-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    cursor: pointer;
    background: var(--of-paper-deep);
    border-bottom: 2px solid var(--of-ink-soft);
  }
  .of-section-head:hover { background: var(--of-paper-edge); }
  .of-section-titles { display: flex; flex-direction: column; gap: 1px; line-height: 1.15; }
  .of-section-title {
    font-family: var(--of-display);
    font-size: clamp(20px, 1.5vw, 24px);
    color: var(--of-ink);
    letter-spacing: 0.02em;
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .of-section-count {
    font-family: var(--of-mono);
    font-size: var(--of-fs-label);
    color: var(--of-paper-soft);
    background: var(--of-rust);
    padding: 2px 8px;
    border-radius: 8px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }
  .of-section-sub {
    font-family: var(--of-body);
    font-style: italic;
    font-size: var(--of-fs-sub);
    color: var(--of-ink-soft);
    margin-top: 1px;
  }
  .of-section-toggle { font-family: var(--of-display); font-size: 16px; color: var(--of-ink-soft); }
  .of-section-body { display: flex; flex-direction: column; }

  /* Coverage chips */
  .of-cov {
    margin-left: 8px;
    font-family: var(--of-mono);
    font-size: 13px;
    letter-spacing: 0.04em;
    padding: 2px 7px;
    border-radius: 2px;
    border: 1px solid;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .of-cov-good { color: var(--of-good); border-color: var(--of-good); background: rgba(74, 122, 58, 0.08); }
  .of-cov-mid  { color: var(--of-warn); border-color: var(--of-warn); background: rgba(184, 115, 42, 0.08); }
  .of-cov-low  { color: var(--of-bad); border-color: var(--of-bad); background: rgba(154, 40, 24, 0.06); }

  /* ----- Item rows ----- */
  .of-row {
    display: grid;
    grid-template-columns: 28px auto 1fr auto auto;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    transition: background 0.12s;
  }
  .of-row:hover { background: rgba(216, 192, 138, 0.30); }
  .of-row-active {
    background: rgba(148, 52, 14, 0.12) !important;
    box-shadow: inset 4px 0 0 0 var(--of-rust);
  }
  .of-row-hit { box-shadow: inset 3px 0 0 0 var(--of-warn); }
  .of-row-hit.of-row-active { box-shadow: inset 3px 0 0 0 var(--of-rust); }
  .of-row-icon { font-size: 19px; text-align: center; line-height: 1; }
  .of-row-text { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .of-row-name {
    color: var(--of-ink);
    font-family: var(--of-body);
    font-weight: 700;
    font-size: var(--of-fs-body);
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    line-height: 1.15;
  }
  .of-row-sub {
    display: flex;
    gap: 8px;
    align-items: baseline;
    font-family: var(--of-mono);
    font-size: var(--of-fs-sub);
    color: var(--of-ink-soft);
    font-variant-numeric: tabular-nums;
  }
  .of-row-linetotal { color: var(--of-rust); font-weight: 700; }
  .of-row-have {
    font-family: var(--of-sc);
    font-size: var(--of-fs-label);
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: var(--of-good);
    background: rgba(72, 108, 42, 0.12);
    padding: 1px 7px;
    border-radius: 2px;
    border: 1px solid rgba(72, 108, 42, 0.4);
  }
  .of-row-leader {
    align-self: center;
    margin: 0 4px;
    border-bottom: 2px dotted var(--of-ink-faded);
    opacity: 0.55;
    min-width: 24px;
  }
  .of-row-active .of-row-leader { opacity: 0.85; border-bottom-color: var(--of-rust); }
  .of-row-controls {
    justify-self: end;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  /* Bulk chips */
  .of-bulk-chips { display: inline-flex; gap: 4px; align-items: stretch; }
  .of-bulk-chip {
    padding: 0 10px;
    height: 30px;
    background: var(--of-paper);
    color: var(--of-ink);
    border: 2px solid var(--of-ink-soft);
    border-radius: 2px;
    font-family: var(--of-mono);
    font-size: var(--of-fs-label);
    letter-spacing: 0.04em;
    font-weight: 700;
    cursor: pointer;
    font-variant-numeric: tabular-nums;
    display: inline-flex;
    align-items: center;
    box-shadow: var(--of-btn-emboss);
    transition: box-shadow 0.08s, background 0.12s;
  }
  .of-bulk-chip:hover { background: var(--of-paper-deep); border-color: var(--of-ink); }

  /* Inline bundle row (native_trade) */
  .of-bundle-row-inline {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(148, 52, 14, 0.06);
    border-bottom: 1px dashed var(--of-rule);
    flex-wrap: wrap;
  }
  .of-bundle-inline-icon { font-size: 18px; line-height: 1; }
  .of-bundle-inline-label { flex: 1; font-family: var(--of-body); font-size: var(--of-fs-sub); color: var(--of-ink); font-style: italic; }
  .of-bundle-inline-cost { font-family: var(--of-mono); font-size: var(--of-fs-body); color: var(--of-rust); font-weight: 700; font-variant-numeric: tabular-nums; }
  .of-bundle-inline-add {
    padding: 4px 12px;
    background: var(--of-rust);
    color: var(--of-paper-soft);
    border: 1.5px solid var(--of-rust-dark);
    border-radius: 2px;
    font-family: var(--of-sc);
    font-size: var(--of-fs-label);
    letter-spacing: 0.10em;
    text-transform: uppercase;
    cursor: pointer;
  }
  .of-bundle-inline-add:hover { background: var(--of-rust-dark); }

  /* ----- Side rail ----- */
  .of-rail {
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: visible;
    min-height: 0;
    padding-right: 4px;
  }

  /* Purse panel */
  .of-purse { border-color: var(--of-rust); border-width: 3px; }
  .of-purse-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    font-size: 13px;
    color: var(--of-ink);
    font-variant-numeric: tabular-nums;
  }
  .of-purse-row-spend { border-top: 1px dashed var(--of-rule); padding-top: 6px; }
  .of-purse-row-net {
    border-top: 2px solid var(--of-rust);
    padding-top: 8px;
    margin-top: 4px;
    font-family: var(--of-display);
    font-size: 18px;
    color: var(--of-rust);
  }
  .of-purse-discount {
    margin-top: 4px;
    font-family: var(--of-sc);
    font-size: var(--of-fs-label);
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: var(--of-good);
    opacity: 0.85;
  }

  /* Weight bar */
  .of-weight-bar {
    position: relative;
    height: 16px;
    background: var(--of-paper);
    border: 2px solid var(--of-ink-soft);
    border-radius: 2px;
    margin: 8px 0 6px;
    overflow: hidden;
    box-shadow:
      inset 0 3px 5px rgba(0, 0, 0, 0.28),
      inset 0 -2px 0 rgba(255, 245, 220, 0.32);
  }
  .of-weight-fill {
    height: 100%;
    background: var(--of-good);
    transition: width 0.18s ease;
  }
  .of-weight-fill-over { background: var(--of-bad); }
  .of-weight-mark {
    position: absolute;
    top: -2px; bottom: -2px;
    width: 0;
    border-left: 2px dashed var(--of-warn);
  }
  .of-weight-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: var(--of-ink);
  }
  .of-dim { color: var(--of-ink-soft); opacity: 0.6; }
  .of-bad { color: var(--of-bad) !important; }
  .of-flavor {
    margin: 8px 0 0;
    padding: 6px 8px;
    font-family: var(--of-body);
    font-style: italic;
    font-size: 13px;
    line-height: 1.4;
    border-radius: 2px;
  }
  .of-flavor-bad {
    background: rgba(154,40,24,0.10);
    color: var(--of-bad);
    border-left: 3px solid var(--of-bad);
  }

  /* ----- Bundles ----- */
  .of-bundles { display: flex; flex-direction: column; gap: 6px; }
  .of-bundles-blurb {
    margin: 0;
    font-family: var(--of-body);
    font-style: italic;
    font-size: 13px;
    color: var(--of-ink-soft);
    line-height: 1.4;
  }
  .of-bundles-list { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
  .of-bundle-card {
    background: var(--of-paper);
    border: 1.5px solid var(--of-rule);
    border-radius: 3px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: border-color 0.12s;
  }
  .of-bundle-card:hover { border-color: var(--of-ink-soft); }
  .of-bundle-expanded { border-color: var(--of-rust); border-width: 2px; box-shadow: 0 2px 6px rgba(74, 46, 21, 0.10); }
  .of-bundle-applied { background: rgba(74, 122, 58, 0.05); border-color: var(--of-good); }
  .of-bundle-summary {
    display: grid;
    grid-template-columns: 22px 1fr auto auto;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: transparent;
    border: 0;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    color: var(--of-ink);
  }
  .of-bundle-icon { font-size: 17px; line-height: 1; text-align: center; }
  .of-bundle-titles { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .of-bundle-name { font-family: var(--of-display); font-size: 14px; color: var(--of-ink); letter-spacing: 0.02em; line-height: 1.1; }
  .of-bundle-sub { font-size: 12px; color: var(--of-ink-soft); font-style: italic; line-height: 1.2; }
  .of-bundle-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 0; line-height: 1.1; }
  .of-bundle-itemcount { font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--of-ink-soft); opacity: 0.7; font-weight: 700; }
  .of-bundle-cost { font-size: 13px; color: var(--of-rust); font-weight: 700; font-variant-numeric: tabular-nums; }
  .of-bundle-chevron { color: var(--of-ink-soft); font-size: 13px; width: 14px; text-align: center; }
  .of-bundle-expand {
    padding: 4px 12px 12px;
    border-top: 1px dashed var(--of-rule);
    background: var(--of-paper-soft);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .of-bundle-blurb { margin: 6px 0 0; font-family: var(--of-body); font-style: italic; font-size: 13px; color: var(--of-ink); line-height: 1.5; }
  .of-bundle-items {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px 12px;
    padding: 6px 0;
    border-top: 1px dashed var(--of-rule);
    border-bottom: 1px dashed var(--of-rule);
  }
  .of-bundle-item {
    display: grid;
    grid-template-columns: 16px 1fr auto auto;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--of-ink);
    padding: 2px 0;
    font-variant-numeric: tabular-nums;
  }
  .of-bundle-item-icon { font-size: 13px; line-height: 1; }
  .of-bundle-item-name { color: var(--of-ink); }
  .of-bundle-item-qty { color: var(--of-rust); font-weight: 700; min-width: 22px; text-align: right; }
  .of-bundle-item-covered { opacity: 0.6; }
  .of-bundle-item-covered .of-bundle-item-qty { color: var(--of-good); }
  .of-bundle-item-check { color: var(--of-good); font-weight: 700; }
  .of-bundle-add {
    background: var(--of-rust);
    color: var(--of-paper-soft);
    border: 2px solid var(--of-rust-dark);
    border-radius: 3px;
    padding: 8px 14px;
    font-family: inherit;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-size: 13px;
    cursor: pointer;
    margin-top: 4px;
  }
  .of-bundle-add:hover { background: var(--of-rust-dark); }
  .of-bundle-add-applied { background: var(--of-paper); color: var(--of-good); border-color: var(--of-good); }
  .of-bundle-add-applied:hover { background: rgba(74,122,58,0.08); }

  /* Starter blurb */
  .of-starter-blurb {
    margin: 0;
    font-family: var(--of-body);
    font-style: italic;
    font-size: var(--of-fs-sub);
    color: var(--of-ink-soft);
    line-height: 1.4;
  }

  /* Tips */
  .of-tips {
    margin: 6px 0 0;
    padding: 0 0 0 14px;
    font-size: 13px;
    color: var(--of-ink-soft);
    line-height: 1.5;
  }
  .of-tips li { margin-bottom: 4px; }
  .of-tips strong { color: var(--of-ink); font-weight: 700; }

  /* ----- Footer ----- */
  .of-footer {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 28px;
    background: transparent;
    border: 0;
    gap: 20px;
    flex-wrap: wrap;
    z-index: 1;
  }
  .of-footer::before,
  .of-footer::after {
    content: "";
    position: absolute;
    left: 18px; right: 18px;
    height: 0;
    border-top: 3px double var(--of-ink);
    pointer-events: none;
  }
  .of-footer::before { top: 4px; }
  .of-footer::after  { bottom: 4px; }
  .of-footer-v2 {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 24px;
  }
  .of-footer-l {
    display: flex;
    gap: 28px;
    align-items: baseline;
  }
  .of-foot-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
    line-height: 1.1;
  }
  .of-foot-val {
    font-family: var(--of-mono);
    font-size: var(--of-fs-body);
    color: var(--of-ink);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .of-foot-val-big {
    font-family: var(--of-display);
    font-size: clamp(28px, 2.2vw, 34px);
    color: var(--of-rust);
    font-weight: 400;
    letter-spacing: 0.02em;
  }
  .of-footer-actions { display: flex; gap: 12px; align-items: stretch; }
  .of-confirm-stack {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 3px;
  }
  .of-confirm-status {
    font-family: var(--of-body);
    font-style: italic;
    font-size: 13px;
    text-align: center;
    line-height: 1.3;
  }
  .of-confirm-status-ok { color: var(--of-good); font-weight: 700; font-style: normal; letter-spacing: 0.06em; text-transform: uppercase; font-size: 12px; }
  .of-confirm-status-warn { color: var(--of-warn); }
  .of-confirm-status-fail { color: var(--of-bad); }
  .of-btn {
    padding: 12px 24px;
    border: 3px double var(--of-ink-soft);
    border-radius: 2px;
    cursor: pointer;
    font-family: var(--of-sc);
    font-weight: 400;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-size: var(--of-fs-body);
    box-shadow: var(--of-btn-emboss);
    transition: box-shadow 0.08s, background 0.12s;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .of-btn:active { box-shadow: var(--of-btn-emboss-active); transform: translateY(1px); }
  .of-btn-cancel {
    background: var(--of-paper-soft);
    color: var(--of-ink-soft);
    border-color: var(--of-ink-faded);
  }
  .of-btn-cancel:hover { background: var(--of-paper); color: var(--of-ink); border-color: var(--of-ink-soft); }
  .of-btn-confirm {
    background: var(--of-rust);
    color: var(--of-paper-soft);
    border-color: var(--of-rust-dark);
    font-family: var(--of-display);
    font-size: clamp(17px, 1.3vw, 20px);
    letter-spacing: 0.06em;
    padding: 14px 32px;
    box-shadow: var(--of-btn-emboss-strong);
  }
  .of-btn-confirm:hover:not(:disabled) { background: var(--of-rust-dark); }
  .of-btn-confirm:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Responsive — stack on narrow screens */
  @media (max-width: 900px) {
    .of-body {
      grid-template-columns: 1fr;
      overflow: visible;
    }
    .of-main { overflow-y: visible; }
    .of-rail { overflow-y: visible; }
    .of-dashboard { grid-template-columns: repeat(3, 1fr); }
    .of-wagon-grid { grid-template-columns: 1fr; }
  }

  /* Collapsing sticky masthead — condense the full masthead, keep its decorations */
  .of-header { position: sticky; top: 0; z-index: 6; background: var(--of-paper); transition: padding 0.15s ease; }
  .of-mast-ready {
    margin: 6px 0 0;
    font-family: var(--of-sc);
    font-size: 13px;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: var(--of-ink-soft);
    display: none;
  }
  .ohc-setout { display: none; }
  /* Collapsed: drop the flowery lines, shrink title + purse, reveal readiness + set-out.
     Keep the 3-column grid, the double-rule borders, the SC stamps + purse styling. */
  .of-header-collapsed .of-mast-l { padding-top: 12px; padding-bottom: 12px; gap: 2px; }
  .of-header-collapsed .of-mast-center { padding-top: 8px; padding-bottom: 8px; }
  .of-header-collapsed .of-mast-r { padding-top: 12px; padding-bottom: 12px; flex-direction: row; align-items: center; gap: 16px; }
  .of-header-collapsed .of-mast-sub,
  .of-header-collapsed .of-mast-flourish,
  .of-header-collapsed .of-mast-eyebrow { display: none; }
  .of-header-collapsed .of-mast-title { font-size: 24px; }
  .of-header-collapsed .of-mast-ready { display: block; }
  .of-header-collapsed .of-purse-stamp-big { font-size: 26px; }
  .of-header-collapsed .ohc-setout { display: inline-block; }
  .ohc-setout {
    padding: 9px 20px;
    background: var(--of-rust);
    color: var(--of-paper-soft);
    border: 2px solid var(--of-rust-dark);
    border-radius: 2px;
    font-family: var(--of-display);
    font-size: 16px;
    letter-spacing: 0.04em;
    white-space: nowrap;
    cursor: pointer;
    box-shadow: var(--of-btn-emboss-strong);
  }
  .of-header-collapsed .ohc-setout:hover:not(:disabled) { background: var(--of-rust-dark); }
  .ohc-setout:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
