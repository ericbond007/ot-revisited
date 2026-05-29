<script lang="ts">
  // Post-rest reveal — pops when flags._campSummary is set. Same pattern
  // as PostHuntModal: hard-stop acknowledgement, "Continue" button POSTs
  // to `?/ackCamp` which clears the flag.
  import type { CampSummary } from '$lib/game/actions/rest';
  import { ITEMS } from '$lib/game/content/items';
  import { ICON, icon } from '$lib/data/icon-dictionary';

  let { summary, slot }: { summary: CampSummary; slot: string } = $props();
  const qp = $derived(encodeURIComponent(slot));

  const moraleDelta = $derived(summary.morale.after - summary.morale.before);
  const fatigueDelta = $derived(summary.oxen.avgFatigueAfter - summary.oxen.avgFatigueBefore);

  // Classify inventory deltas so the template can group them cleanly.
  const gained = $derived(summary.inventoryDelta.filter((e) => e.delta > 0));
  const consumed = $derived(summary.inventoryDelta.filter((e) => e.delta < 0));

  // Item name + per-item or category-based icon. Per-item overrides
  // (ICON.inventory_items, #174) win when present; otherwise fall back
  // to the category default; finally a decorative '📦'.
  function itemDisplay(id: string) {
    const meta = ITEMS[id];
    const perItem = (ICON.inventory_items as Record<string, string>)[id];
    const cat = meta?.category as keyof typeof ICON.inventory_categories | undefined;
    return {
      name: meta?.name ?? id.replace(/_/g, ' '),
      icon: perItem ?? (cat && ICON.inventory_categories[cat] ? ICON.inventory_categories[cat] : '📦')
    };
  }

  // Sort party by most-injured delta first so the player sees who
  // healed (or died) up top.
  const partyRows = $derived(
    [...summary.party]
      .map((p) => ({ ...p, delta: p.healthAfter - p.healthBefore }))
      .sort((a, b) => {
        if (a.diedDuringRest !== b.diedDuringRest) return a.diedDuringRest ? -1 : 1;
        return Math.abs(b.delta) - Math.abs(a.delta);
      })
  );
</script>

<div class="modal-backdrop">
  <div class="panel modal-body">
    <div class="head">
      <span class="head-glyph">{icon('camp_scene', 'fire')}</span>
      <div class="head-titles">
        <span class="head-tag">CAMP · {summary.daysRested} day{summary.daysRested === 1 ? '' : 's'} rested</span>
        <h2 class="modal-title">Broke camp on day {summary.startDay + summary.daysRested}</h2>
      </div>
    </div>

    <!-- Top strip: headline deltas -->
    <div class="strip">
      <div class="stat">
        <span class="stat-label">MORALE</span>
        <span class="stat-val">
          {summary.morale.before}
          <span class="arrow">→</span>
          <strong class="morale-after" class:up={moraleDelta > 0} class:down={moraleDelta < 0}>
            {summary.morale.after}
          </strong>
          {#if moraleDelta !== 0}
            <span class="delta" class:up={moraleDelta > 0} class:down={moraleDelta < 0}>
              {moraleDelta > 0 ? '+' : ''}{moraleDelta}
            </span>
          {/if}
        </span>
      </div>
      <div class="stat">
        <span class="stat-label">OX FATIGUE</span>
        <span class="stat-val">
          {summary.oxen.avgFatigueBefore}
          <span class="arrow">→</span>
          <strong>{summary.oxen.avgFatigueAfter}</strong>
          {#if fatigueDelta !== 0}
            <!-- Fatigue inverted: lower is better, so a drop is "up" good. -->
            <span class="delta" class:up={fatigueDelta < 0} class:down={fatigueDelta > 0}>
              {fatigueDelta > 0 ? '+' : ''}{fatigueDelta}
            </span>
          {/if}
          <span class="small">({summary.oxen.alive}/{summary.oxen.total} alive)</span>
        </span>
      </div>
      <div class="stat">
        <span class="stat-label">WATER</span>
        <span class="stat-val">
          {summary.water.before}
          <span class="arrow">→</span>
          <strong>{summary.water.after}</strong>
          <span class="small">gal</span>
        </span>
      </div>
    </div>

    <!-- Activities fired -->
    {#if summary.activities.length > 0}
      <section class="section">
        <div class="section-head">ACTIVITIES</div>
        <div class="chips">
          {#each summary.activities as a}
            <span class="chip">
              <span class="chip-icon">{a.icon}</span>
              <span>{a.label}</span>
            </span>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Party health -->
    <section class="section">
      <div class="section-head">THE PARTY</div>
      <div class="party-rows">
        {#each partyRows as p}
          <div
            class="party-row"
            class:died={p.diedDuringRest}
            class:dead-before={p.dead && !p.diedDuringRest}
          >
            <span class="name">{p.name}</span>
            {#if p.diedDuringRest}
              <span class="tag died">DIED</span>
            {:else if p.dead}
              <span class="tag dead">still gone</span>
            {:else}
              <span class="health">
                {p.healthBefore}
                <span class="arrow">→</span>
                <strong>{p.healthAfter}</strong>
                {#if p.delta !== 0}
                  <span class="delta" class:up={p.delta > 0} class:down={p.delta < 0}>
                    {p.delta > 0 ? '+' : ''}{p.delta}
                  </span>
                {/if}
              </span>
            {/if}
          </div>
        {/each}
      </div>
    </section>

    <!-- Inventory changes -->
    {#if gained.length > 0 || consumed.length > 0}
      <section class="section">
        <div class="section-head">SUPPLIES</div>
        <div class="inv-grid">
          {#if gained.length > 0}
            <div class="inv-col">
              <div class="inv-col-head gained">GAINED</div>
              {#each gained as e}
                {@const d = itemDisplay(e.id)}
                <div class="inv-row">
                  <span class="inv-icon">{d.icon}</span>
                  <span class="inv-name">{d.name}</span>
                  <span class="inv-delta up">+{e.delta}</span>
                </div>
              {/each}
            </div>
          {/if}
          {#if consumed.length > 0}
            <div class="inv-col">
              <div class="inv-col-head consumed">CONSUMED</div>
              {#each consumed as e}
                {@const d = itemDisplay(e.id)}
                <div class="inv-row">
                  <span class="inv-icon">{d.icon}</span>
                  <span class="inv-name">{d.name}</span>
                  <span class="inv-delta down">{e.delta}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </section>
    {/if}

    <form method="POST" action="?/ackCamp&slot={qp}" class="actions">
      <button type="submit" class="continue">Break camp</button>
    </form>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(42, 29, 12, 0.80);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1em;
    animation: backdrop-fade 0.2s ease-out;
  }
  @keyframes backdrop-fade {
    from { opacity: 0; } to { opacity: 1; }
  }
  .modal-body {
    max-width: 640px;
    width: 100%;
    padding: 1.5em;
    border-color: var(--of-rust);
    border-width: 3px;
    max-height: 92vh;
    overflow-y: auto;
    animation: card-slide 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.1);
  }
  @keyframes card-slide {
    from { opacity: 0; transform: translateY(16px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .head {
    display: flex;
    align-items: center;
    gap: 0.7em;
    margin-bottom: 1em;
  }
  .head-glyph {
    font-size: 2.2em;
    line-height: 1;
    /* gentle flicker to echo the campfire from CampStage */
    animation: flicker 1.6s ease-in-out infinite alternate;
    filter: drop-shadow(0 0 6px rgba(255, 140, 0, 0.4));
  }
  @keyframes flicker {
    from { transform: scale(1); }
    to   { transform: scale(1.06); filter: drop-shadow(0 0 10px rgba(255, 180, 60, 0.6)); }
  }
  .head-titles { display: flex; flex-direction: column; gap: 0.1em; min-width: 0; }
  .head-tag {
    font-size: 0.7em;
    letter-spacing: 0.15em;
    font-weight: 700;
    color: var(--of-ink-soft);
  }
  .head-titles h2 {
    margin: 0;
    color: var(--of-rust);
    font-size: 1.4em;
    line-height: 1.1;
  }

  .strip {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.5em 1em;
    padding: 0.7em 0.9em;
    background: var(--of-paper);
    border: 1px solid var(--of-rule);
    border-radius: 3px;
    margin-bottom: 1em;
  }
  .stat { display: flex; flex-direction: column; gap: 0.1em; }
  .stat-label {
    font-size: 0.65em;
    letter-spacing: 0.15em;
    color: var(--of-ink-soft);
    font-weight: 700;
  }
  .stat-val {
    font-size: 1em;
    color: var(--of-ink);
    display: inline-flex;
    align-items: baseline;
    gap: 0.3em;
  }
  .stat-val strong { font-weight: 700; }
  .morale-after.up { color: #8bb96a; }
  .morale-after.down { color: #e85a4a; }
  .stat-val .arrow { color: var(--of-ink-soft); font-weight: normal; }
  .stat-val .small { color: var(--of-ink-soft); font-style: italic; font-size: 0.85em; }

  .delta {
    font-size: 0.78em;
    font-weight: 700;
    padding: 0.08em 0.4em;
    border-radius: 10px;
  }
  .delta.up { color: #8bb96a; background: rgba(139, 185, 106, 0.15); }
  .delta.down { color: #e85a4a; background: rgba(232, 90, 74, 0.15); }

  .section { margin-bottom: 1em; }
  .section-head {
    font-size: 0.7em;
    letter-spacing: 0.15em;
    color: var(--of-ink-soft);
    font-weight: 700;
    margin-bottom: 0.4em;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35em;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35em;
    padding: 0.25em 0.6em;
    background: var(--of-rust-dark);
    color: var(--of-paper-soft);
    border-radius: 12px;
    font-size: 0.82em;
    font-weight: 700;
  }
  .chip-icon { font-size: 1em; line-height: 1; }

  .party-rows {
    display: flex;
    flex-direction: column;
    gap: 0.15em;
  }
  .party-row {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 0.6em;
    padding: 0.35em 0.55em;
    background: var(--of-paper);
    border-radius: 2px;
  }
  .party-row.died {
    border-left: 3px solid #e85a4a;
    background: rgba(232, 90, 74, 0.08);
  }
  .party-row.dead-before { opacity: 0.5; }
  .name { color: var(--of-ink); font-weight: 700; }
  .health { color: var(--of-ink); display: inline-flex; align-items: baseline; gap: 0.3em; font-size: 0.92em; }
  .tag {
    font-size: 0.7em;
    letter-spacing: 0.12em;
    font-weight: 700;
    padding: 0.2em 0.5em;
    border-radius: 2px;
  }
  .tag.died { background: #e85a4a; color: var(--of-ink); }
  .tag.dead { color: var(--of-ink-soft); font-style: italic; }

  .inv-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.5em 1em;
  }
  .inv-col { display: flex; flex-direction: column; gap: 0.15em; }
  .inv-col-head {
    font-size: 0.68em;
    letter-spacing: 0.12em;
    font-weight: 700;
    padding: 0.15em 0;
  }
  .inv-col-head.gained { color: #8bb96a; }
  .inv-col-head.consumed { color: #c96a2a; }
  .inv-row {
    display: grid;
    grid-template-columns: 1.3em 1fr auto;
    align-items: baseline;
    gap: 0.35em;
    padding: 0.2em 0.25em;
    font-size: 0.88em;
  }
  .inv-row:nth-child(even) { background: rgba(138, 90, 42, 0.06); }
  .inv-icon { font-size: 0.95em; line-height: 1; }
  .inv-name { color: var(--of-ink); }
  .inv-delta { font-weight: 700; }
  .inv-delta.up { color: #8bb96a; }
  .inv-delta.down { color: #e85a4a; }

  .actions {
    display: flex;
    justify-content: flex-end;
    margin: 0.8em 0 0 0;
  }
  .continue {
    font-size: 1em;
    padding: 0.65em 1.6em;
    background: var(--of-rust);
    color: var(--of-paper-soft);
  }
  .continue:hover { filter: brightness(1.15); }
</style>
