<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import NumberStepper from './NumberStepper.svelte';
  import { CAMP_ACTIONS, hourCostFor, type CampActionId } from '$lib/game/actions/camp-actions';

  let { state: gameState, slot, onclose }: { state: GameState; slot: string; onclose: () => void } = $props();
  const qp = $derived(encodeURIComponent(slot));

  let days = $state(1);
  // Which camp actions the player has picked for day 1. Multi-select.
  let picked = $state<Set<CampActionId>>(new Set());

  // Per-action availability + hour cost snapshot.
  const actionRows = $derived(
    CAMP_ACTIONS.map((a) => ({
      action: a,
      availability: a.availability(gameState),
      hours: hourCostFor(a, gameState),
      selected: picked.has(a.id)
    }))
  );

  const TIME_BUDGET_HOURS = 12;
  const usedHours = $derived(
    actionRows
      .filter((r) => r.selected)
      .reduce((sum, r) => sum + r.hours, 0)
  );
  const remainingHours = $derived(TIME_BUDGET_HOURS - usedHours);
  const overBudget = $derived(usedHours > TIME_BUDGET_HOURS);

  function toggle(id: CampActionId) {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    picked = next;
  }

  // Would picking this action push us over budget? Disables the toggle
  // preemptively instead of letting the player stack picks that will
  // fail server-side.
  function wouldOverflow(id: CampActionId, hours: number): boolean {
    if (picked.has(id)) return false; // deselect is always allowed
    return usedHours + hours > TIME_BUDGET_HOURS;
  }
</script>

<div class="modal-backdrop" onclick={onclose} role="presentation">
  <div class="panel modal-body" onclick={(e) => e.stopPropagation()} role="presentation">
    <h2 style="color: var(--c-rust);">🏕️ Make Camp / Rest</h2>
    <p class="lede">
      Stop for 1+ days. Heals injuries, recovers ox fatigue, and lets the Farmer forage.
      Day 1 can include camp activities — 12 working hours to split however you like.
    </p>

    <form method="POST" action="?/rest&slot={qp}">
      <div class="field-row">
        <span class="field-label">DAYS</span>
        <NumberStepper name="days" bind:value={days} min={1} max={7} ariaLabel="Rest days" />
        <span class="field-hint">1 = overnight · more = extended rest</span>
      </div>

      <div class="field-col">
        <div class="budget-head">
          <span class="field-label">CAMP ACTIVITIES <span class="tiny">(first day)</span></span>
          <span class="budget" class:over={overBudget}>
            {usedHours} / {TIME_BUDGET_HOURS} hr used · {remainingHours} left
          </span>
        </div>

        <div class="cards">
          {#each actionRows as r (r.action.id)}
            {@const locked = !r.availability.available}
            {@const overflow = wouldOverflow(r.action.id, r.hours)}
            {@const disabled = locked || overflow}
            <button
              type="button"
              class="card"
              class:selected={r.selected}
              class:locked
              {disabled}
              title={locked ? r.availability.reason : overflow ? 'Not enough hours in the day' : ''}
              onclick={() => toggle(r.action.id)}
            >
              <span class="card-icon">{r.action.icon}</span>
              <span class="card-body">
                <span class="card-label">{r.action.label}</span>
                <span class="card-sub">
                  {#if locked}{r.availability.reason}{:else}{r.action.sub} · <strong>{r.hours} hr</strong>{/if}
                </span>
              </span>
              {#if r.selected}
                <!-- Hidden input in the selected button is still part of
                     the form submission even though the button itself is
                     a type=button. We render the input outside the
                     buttons below. -->
              {/if}
            </button>
          {/each}
        </div>
        {#each actionRows as r}
          {#if r.selected}
            <input type="hidden" name="campAction" value={r.action.id} />
          {/if}
        {/each}
      </div>

      <div class="actions">
        <button type="submit" disabled={overBudget}>Go</button>
        <button type="button" onclick={onclose}>Cancel</button>
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
    max-width: 680px;
    width: 100%;
    padding: 1.5em;
    border-color: var(--c-rust);
    max-height: 92vh;
    overflow-y: auto;
  }
  .lede {
    color: var(--c-wood);
    font-size: 0.9em;
    margin: 0 0 1em 0;
  }

  .field-row {
    display: flex;
    align-items: center;
    gap: 0.8em;
    margin: 0.8em 0;
    flex-wrap: wrap;
  }
  .field-col {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    margin: 1em 0;
  }
  .field-label {
    font-size: 0.75em;
    letter-spacing: 0.15em;
    color: var(--c-wood);
    font-weight: 700;
  }
  .field-hint {
    color: var(--c-wood);
    font-size: 0.8em;
    font-style: italic;
  }
  .tiny {
    font-size: 0.85em;
    font-weight: normal;
    letter-spacing: 0.08em;
    color: var(--c-wood);
    font-style: italic;
  }

  .budget-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.7em;
    flex-wrap: wrap;
  }
  .budget {
    font-size: 0.78em;
    color: var(--c-tan);
    font-weight: 700;
  }
  .budget.over { color: #e85a4a; }

  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 0.4em;
  }
  .card {
    /* Override theme button chrome — rendered as a dense row card. */
    display: inline-flex;
    align-items: flex-start;
    gap: 0.55em;
    padding: 0.5em 0.7em;
    background: var(--c-bg-raised);
    color: var(--c-tan);
    border: 2px solid var(--c-wood);
    border-radius: 3px;
    font-family: inherit;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: none;
    cursor: pointer;
    text-align: left;
    transition: background 0.12s, border-color 0.12s, color 0.12s, opacity 0.12s;
  }
  .card:hover:not(:disabled):not(.selected) {
    background: var(--c-panel);
    border-color: var(--c-rust);
  }
  .card.selected {
    background: var(--c-rust);
    color: var(--c-tan-bright);
    border-color: var(--c-ink);
  }
  .card:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .card.locked {
    opacity: 0.4;
  }
  .card-icon {
    font-size: 1.5em;
    line-height: 1;
    flex-shrink: 0;
  }
  .card-body {
    display: flex;
    flex-direction: column;
    gap: 0.15em;
    min-width: 0;
  }
  .card-label {
    font-size: 0.92em;
  }
  .card-sub {
    font-size: 0.75em;
    font-weight: normal;
    color: var(--c-wood);
    letter-spacing: normal;
    line-height: 1.3;
  }
  .card.selected .card-sub { color: var(--c-tan); }
  .card.selected .card-sub strong { color: var(--c-tan-bright); }

  .actions {
    display: flex;
    gap: 0.5em;
    margin-top: 1em;
  }
</style>
