<script lang="ts">
  // Post-trade receipt — pops when flags._tradeResult is set. Same
  // pattern as CampSummaryModal / FordSummaryModal: structured reveal,
  // "Continue" posts to `?/ackTrade` to clear the flag.
  import type { TradeResult } from '$lib/game/actions/trade';
  import { ITEMS } from '$lib/game/content/items';

  let { result, slot }: { result: TradeResult; slot: string } = $props();
  const qp = $derived(encodeURIComponent(slot));

  const weightDelta = $derived(result.weightAfter - result.weightBefore);
  const hasBonus = $derived(result.professionBonus.merchant || result.professionBonus.banker);

  function itemName(id: string) {
    return ITEMS[id]?.name ?? id.replace(/_/g, ' ');
  }
  function fmt(n: number) {
    return n.toFixed(2);
  }
</script>

<div class="modal-backdrop">
  <div class="panel modal-body">
    <div class="head">
      <span class="head-glyph">🧾</span>
      <div class="head-titles">
        <span class="head-tag">RECEIPT · {result.postName}</span>
        <h2 class="modal-title">Trade complete</h2>
      </div>
    </div>

    <!-- Bought + sold line items -->
    <div class="columns">
      {#if result.bought.length > 0}
        <section class="col">
          <div class="col-head bought">BOUGHT</div>
          {#each result.bought as line}
            <div class="line">
              <span class="qty">×{line.qty}</span>
              <span class="name">{itemName(line.id)}</span>
              <span class="amount neg">−${fmt(line.lineTotal)}</span>
            </div>
          {/each}
          <div class="subtotal">
            <span>Subtotal</span>
            <span class="neg">−${fmt(result.rawCost)}</span>
          </div>
        </section>
      {/if}

      {#if result.sold.length > 0}
        <section class="col">
          <div class="col-head sold">SOLD</div>
          {#each result.sold as line}
            <div class="line">
              <span class="qty">×{line.qty}</span>
              <span class="name">{itemName(line.id)}</span>
              <span class="amount pos">+${fmt(line.lineTotal)}</span>
            </div>
          {/each}
          <div class="subtotal">
            <span>Subtotal</span>
            <span class="pos">+${fmt(result.rawRevenue)}</span>
          </div>
        </section>
      {/if}
    </div>

    <!-- Profession bonus callout -->
    {#if hasBonus}
      <section class="bonus">
        <span class="bonus-icon">🤝</span>
        <div class="bonus-body">
          <span class="bonus-title">
            {#if result.professionBonus.merchant && result.professionBonus.banker}
              Merchant + Banker haggled
            {:else if result.professionBonus.merchant}
              Merchant haggled
            {:else}
              Banker bankrolled
            {/if}
          </span>
          <span class="bonus-sub">
            Buy ×{result.professionBonus.buyMult.toFixed(2)} ·
            Sell ×{result.professionBonus.sellMult.toFixed(2)} ·
            <strong>Saved ≈${fmt(result.professionBonus.estimatedSavings)}</strong>
          </span>
        </div>
      </section>
    {/if}

    <!-- Net totals -->
    <div class="totals">
      <div class="totals-row">
        <span class="label">Net</span>
        <span class="val" class:neg={result.netCost > 0} class:pos={result.netCost < 0}>
          {result.netCost >= 0 ? '−' : '+'}${fmt(Math.abs(result.netCost))}
        </span>
      </div>
      <div class="totals-row">
        <span class="label">Cash</span>
        <span class="val">
          ${result.cashBefore}
          <span class="arrow">→</span>
          <strong>${result.cashAfter}</strong>
        </span>
      </div>
      <div class="totals-row">
        <span class="label">Wagon weight</span>
        <span class="val">
          {Math.round(result.weightBefore)}
          <span class="arrow">→</span>
          <strong>{Math.round(result.weightAfter)} lb</strong>
          {#if weightDelta !== 0}
            <span class="weight-delta" class:heavier={weightDelta > 0} class:lighter={weightDelta < 0}>
              {weightDelta > 0 ? '+' : ''}{Math.round(weightDelta)}
            </span>
          {/if}
        </span>
      </div>
    </div>

    <form method="POST" action="?/ackTrade&slot={qp}" class="actions">
      <button type="submit" class="continue">Pack up</button>
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
    max-width: 620px;
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

  .columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.7em 1em;
    margin-bottom: 0.9em;
  }
  .col { display: flex; flex-direction: column; gap: 0.1em; }
  .col-head {
    font-size: 0.7em;
    letter-spacing: 0.15em;
    font-weight: 700;
    padding: 0.2em 0;
    border-bottom: 1px dashed rgba(138, 90, 42, 0.3);
    margin-bottom: 0.2em;
  }
  .col-head.bought { color: #c96a2a; }
  .col-head.sold { color: #8bb96a; }

  .line {
    display: grid;
    grid-template-columns: 2.2em 1fr auto;
    align-items: baseline;
    gap: 0.35em;
    padding: 0.2em 0.1em;
    font-size: 0.88em;
  }
  .qty { color: var(--c-rust); font-weight: 700; text-align: right; }
  .name { color: var(--c-tan); }
  .amount { font-weight: 700; font-variant-numeric: tabular-nums; }
  .amount.pos, .val.pos { color: #8bb96a; }
  .amount.neg, .val.neg { color: #e85a4a; }

  .subtotal {
    display: flex;
    justify-content: space-between;
    padding: 0.3em 0.1em 0.1em;
    border-top: 1px solid rgba(138, 90, 42, 0.3);
    margin-top: 0.25em;
    font-size: 0.82em;
    font-weight: 700;
    color: var(--c-wood);
    letter-spacing: 0.05em;
  }
  .subtotal .pos { color: #8bb96a; }
  .subtotal .neg { color: #e85a4a; }

  .bonus {
    display: flex;
    gap: 0.6em;
    align-items: center;
    padding: 0.5em 0.7em;
    background: rgba(139, 185, 106, 0.1);
    border-left: 3px solid #8bb96a;
    border-radius: 0 3px 3px 0;
    margin-bottom: 0.9em;
  }
  .bonus-icon { font-size: 1.4em; line-height: 1; }
  .bonus-body { display: flex; flex-direction: column; gap: 0.1em; min-width: 0; }
  .bonus-title {
    color: var(--c-tan-bright);
    font-weight: 700;
    font-size: 0.92em;
  }
  .bonus-sub {
    color: var(--c-tan);
    font-size: 0.8em;
  }
  .bonus-sub strong { color: #8bb96a; }

  .totals {
    padding: 0.6em 0.8em;
    background: var(--c-bg-raised);
    border: 1px solid var(--c-border);
    border-radius: 3px;
    display: flex;
    flex-direction: column;
    gap: 0.25em;
  }
  .totals-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.6em;
  }
  .label {
    color: var(--c-wood);
    font-size: 0.78em;
    letter-spacing: 0.08em;
    font-weight: 700;
  }
  .val {
    color: var(--c-tan-bright);
    font-weight: 700;
    display: inline-flex;
    align-items: baseline;
    gap: 0.25em;
  }
  .val .arrow { color: var(--c-wood); font-weight: normal; }
  .weight-delta {
    font-size: 0.78em;
    font-weight: 700;
    padding: 0.08em 0.4em;
    border-radius: 10px;
  }
  .weight-delta.heavier { color: #c96a2a; background: rgba(201, 106, 42, 0.15); }
  .weight-delta.lighter { color: #8bb96a; background: rgba(139, 185, 106, 0.15); }

  .actions {
    display: flex;
    justify-content: flex-end;
    margin: 0.9em 0 0 0;
  }
  .continue {
    font-size: 1em;
    padding: 0.65em 1.6em;
    background: var(--c-rust);
    color: var(--c-tan-bright);
  }
  .continue:hover { filter: brightness(1.15); }
</style>
