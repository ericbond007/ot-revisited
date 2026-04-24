<script lang="ts">
  // Post-ford reveal — pops when flags._fordResult is set. Same pattern
  // as CampSummaryModal: structured diff card, "Continue" clears the
  // flag via the `?/ackFord` server action.
  import type { FordResult } from '$lib/game/actions/ford';
  import { ITEMS } from '$lib/game/content/items';

  let { result, slot }: { result: FordResult; slot: string } = $props();
  const qp = $derived(encodeURIComponent(slot));

  const METHOD_LABEL: Record<FordResult['method'], string> = {
    ford: 'Forded',
    caulk: 'Caulked & floated',
    ferry: 'Took the ferry',
    wait: 'Waited'
  };
  const METHOD_GLYPH: Record<FordResult['method'], string> = {
    ford: '🏞️',
    caulk: '🛶',
    ferry: '⛴️',
    wait: '⏳'
  };

  const wagonDelta = $derived(result.wagonConditionAfter - result.wagonConditionBefore);
  const lost = $derived(result.inventoryDelta.filter((e) => e.delta < 0));
  const gained = $derived(result.inventoryDelta.filter((e) => e.delta > 0));

  function itemName(id: string) {
    return ITEMS[id]?.name ?? id.replace(/_/g, ' ');
  }
</script>

<div class="modal-backdrop">
  <div class="panel modal-body">
    <div class="head">
      <span class="head-glyph">{METHOD_GLYPH[result.method]}</span>
      <div class="head-titles">
        <span class="head-tag">
          RIVER · {result.crossed ? 'CROSSED' : 'STILL WAITING'}
        </span>
        <h2>{METHOD_LABEL[result.method]}</h2>
      </div>
    </div>

    <!-- Top strip: headline deltas -->
    <div class="strip">
      <div class="stat">
        <span class="stat-label">DAYS</span>
        <span class="stat-val">{result.daysElapsed}</span>
      </div>
      {#if result.cashDelta !== 0}
        <div class="stat">
          <span class="stat-label">CASH</span>
          <span class="stat-val">
            <span class="delta" class:down={result.cashDelta < 0} class:up={result.cashDelta > 0}>
              {result.cashDelta > 0 ? '+' : ''}${result.cashDelta}
            </span>
          </span>
        </div>
      {/if}
      <div class="stat">
        <span class="stat-label">WAGON</span>
        <span class="stat-val">
          {result.wagonConditionBefore}
          <span class="arrow">→</span>
          <strong>{result.wagonConditionAfter}</strong>
          {#if wagonDelta !== 0}
            <span class="delta" class:down={wagonDelta < 0} class:up={wagonDelta > 0}>
              {wagonDelta > 0 ? '+' : ''}{wagonDelta}
            </span>
          {/if}
        </span>
      </div>
    </div>

    <!-- Narrative events -->
    <section class="section">
      <div class="section-head">WHAT HAPPENED</div>
      <ul class="events">
        {#each result.events as line}
          <li>{line}</li>
        {/each}
      </ul>
    </section>

    <!-- Inventory change -->
    {#if lost.length > 0 || gained.length > 0}
      <section class="section">
        <div class="section-head">SUPPLIES</div>
        <div class="inv-rows">
          {#each lost as e}
            <div class="inv-row">
              <span class="inv-name">{itemName(e.id)}</span>
              <span class="inv-delta down">{e.delta}</span>
            </div>
          {/each}
          {#each gained as e}
            <div class="inv-row">
              <span class="inv-name">{itemName(e.id)}</span>
              <span class="inv-delta up">+{e.delta}</span>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <form method="POST" action="?/ackFord&slot={qp}" class="actions">
      <button type="submit" class="continue">Continue</button>
    </form>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(26, 15, 8, 0.88);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1em;
    animation: backdrop-fade 0.2s ease-out;
  }
  @keyframes backdrop-fade { from { opacity: 0; } to { opacity: 1; } }
  .modal-body {
    max-width: 560px;
    width: 100%;
    padding: 1.5em;
    border-color: var(--c-rust);
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
  .head-glyph { font-size: 2.2em; line-height: 1; }
  .head-titles { display: flex; flex-direction: column; gap: 0.1em; min-width: 0; }
  .head-tag {
    font-size: 0.7em;
    letter-spacing: 0.15em;
    font-weight: 700;
    color: var(--c-wood);
  }
  .head-titles h2 {
    margin: 0;
    color: var(--c-rust);
    font-size: 1.4em;
    line-height: 1.1;
  }

  .strip {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.5em 1em;
    padding: 0.7em 0.9em;
    background: var(--c-bg-raised);
    border: 1px solid var(--c-border);
    border-radius: 3px;
    margin-bottom: 1em;
  }
  .stat { display: flex; flex-direction: column; gap: 0.1em; }
  .stat-label {
    font-size: 0.65em;
    letter-spacing: 0.15em;
    color: var(--c-wood);
    font-weight: 700;
  }
  .stat-val {
    font-size: 1em;
    color: var(--c-tan-bright);
    display: inline-flex;
    align-items: baseline;
    gap: 0.3em;
  }
  .stat-val .arrow { color: var(--c-wood); font-weight: normal; }
  .stat-val strong { font-weight: 700; }

  .delta {
    font-size: 0.82em;
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
    color: var(--c-wood);
    font-weight: 700;
    margin-bottom: 0.4em;
  }

  .events {
    margin: 0;
    padding-left: 1.2em;
    color: var(--c-tan);
    line-height: 1.5;
  }
  .events li { margin: 0.15em 0; }

  .inv-rows { display: flex; flex-direction: column; gap: 0.15em; }
  .inv-row {
    display: flex;
    justify-content: space-between;
    padding: 0.25em 0.5em;
    font-size: 0.9em;
    background: var(--c-bg-raised);
    border-radius: 2px;
  }
  .inv-name { color: var(--c-tan); }
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
    background: var(--c-rust);
    color: var(--c-tan-bright);
  }
  .continue:hover { filter: brightness(1.15); }
</style>
