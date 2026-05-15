<script lang="ts">
  // #936b — shown when flags._mudAbandonPending is set (the player chose
  // "Lighten the load" on the wagon_stuck event). The player checks which
  // heavy gear to jettison; the wagon breaks free once enough weight is
  // shed. NPC/bot wagons never see this — they resolve the same flag via
  // their persona's drop order in npc-engine / the bot runner.
  //
  // No backdrop-close: the server flag persists until a form POST clears
  // it, so a dismiss would just re-open on the next render. Confirm POSTs
  // to ?/mudAbandon; the force-through escape POSTs ?/mudForceThrough.
  import { getItem } from '$lib/game/content/items';

  let { rows, target, slot }: {
    rows: { id: string; qty: number; weightLb: number }[];
    target: number;
    slot: string;
  } = $props();

  const qp = $derived(encodeURIComponent(slot));

  let selected = $state<Record<string, boolean>>({});
  const sheddingLb = $derived(
    rows.reduce((sum, r) => sum + (selected[r.id] ? r.weightLb : 0), 0)
  );
  const enough = $derived(sheddingLb >= target);
</script>

<div class="modal-backdrop">
  <div class="panel modal-body">
    <div class="head">
      <span class="head-glyph">🪦</span>
      <div class="head-titles">
        <span class="head-tag">STUCK IN THE SLOUGH</span>
        <h2 class="modal-title">The wagon is mired to the axles</h2>
      </div>
    </div>

    <p class="advice">
      Shed roughly <strong>{target} lb</strong> of dead weight and the oxen
      can drag her free. Pick what goes to the mud.
    </p>

    <form method="POST" action="?/mudAbandon&slot={qp}" class="pick-form">
      <div class="item-list">
        {#each rows as row (row.id)}
          <label class="item-row" class:on={selected[row.id]}>
            <input
              type="checkbox"
              name="itemId"
              value={row.id}
              bind:checked={selected[row.id]}
            />
            <span class="item-name">{getItem(row.id).name}</span>
            <span class="item-weight">{row.weightLb} lb</span>
          </label>
        {/each}
      </div>

      <div class="total" class:enough>
        Shedding: <strong>{sheddingLb}</strong> / {target} lb
      </div>

      <div class="actions">
        <button type="submit" class="confirm" disabled={!enough}>
          Cut it loose
        </button>
      </div>
    </form>

    <form method="POST" action="?/mudForceThrough&slot={qp}" class="escape-form">
      <button type="submit" class="force">Force through instead (wreck the oxen)</button>
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
  @keyframes backdrop-fade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .modal-body {
    max-width: 480px;
    width: 100%;
    padding: 1.5em;
    border-color: var(--c-rust);
    border-width: 3px;
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
    margin-bottom: 0.8em;
  }
  .head-glyph {
    font-size: 2.2em;
    line-height: 1;
  }
  .head-titles {
    display: flex;
    flex-direction: column;
    gap: 0.1em;
    min-width: 0;
  }
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

  .advice {
    margin: 0 0 1em 0;
    padding: 0.6em 0.8em;
    background: rgba(201, 106, 42, 0.1);
    border-left: 3px solid #c96a2a;
    border-radius: 0 3px 3px 0;
    color: var(--c-tan);
    font-size: 0.9em;
    line-height: 1.5;
  }
  .advice strong { color: var(--c-tan-bright); }

  .item-list {
    display: flex;
    flex-direction: column;
    gap: 0.35em;
    margin-bottom: 0.9em;
    max-height: 42vh;
    overflow-y: auto;
  }
  .item-row {
    display: flex;
    align-items: center;
    gap: 0.6em;
    padding: 0.55em 0.7em;
    background: var(--c-bg-raised);
    border: 1px solid var(--c-border);
    border-radius: 3px;
    cursor: pointer;
  }
  .item-row.on {
    border-color: var(--c-rust);
    background: rgba(153, 0, 0, 0.08);
  }
  .item-row input { flex-shrink: 0; }
  .item-name {
    flex: 1;
    color: var(--c-tan-bright);
    font-weight: 700;
    min-width: 0;
  }
  .item-weight {
    color: var(--c-tan);
    font-size: 0.88em;
    flex-shrink: 0;
  }

  .total {
    text-align: right;
    color: var(--c-wood);
    font-size: 0.95em;
    margin-bottom: 1em;
  }
  .total strong { color: var(--c-tan-bright); }
  .total.enough strong { color: #8bb96a; }

  .actions {
    display: flex;
    justify-content: flex-end;
  }
  .confirm {
    font-size: 1em;
    padding: 0.65em 1.6em;
  }
  .confirm:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .escape-form {
    margin-top: 1em;
    padding-top: 0.9em;
    border-top: 1px solid var(--c-border);
    display: flex;
    justify-content: center;
  }
  .force {
    background: none;
    border: none;
    color: var(--c-wood);
    font-size: 0.88em;
    text-decoration: underline;
    cursor: pointer;
    padding: 0.3em;
  }
  .force:hover { color: var(--c-rust); }
</style>
