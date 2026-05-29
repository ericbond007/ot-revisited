<script lang="ts">
  // #280d Wagon-party summary panel. Side-rail companion to
  // PartyPanel / WagonPanel / InventoryPanel. Renders only when the
  // player is in a wagon train (#176). Click opens the full roster
  // modal.
  import type { GameState } from '$lib/game/types';

  let { state, onopen }: { state: GameState; onopen?: () => void } = $props();

  const train = $derived(state.wagonTrain);
  const aliveCount = $derived(train?.companions.length ?? 0);
  const avgMorale = $derived(
    train && train.companions.length > 0
      ? Math.round(
          train.companions.reduce((sum, c) => sum + c.morale, 0)
            / train.companions.length
        )
      : 0
  );
  const moraleColor = $derived(
    avgMorale >= 70 ? '#8bb96a' :
    avgMorale >= 40 ? '#f5c96a' :
    avgMorale >= 20 ? '#c96a2a' : '#e85a4a'
  );
  const totalSouls = $derived(
    (train?.companions ?? []).reduce(
      (sum, c) => sum + c.party.filter((p) => !p.dead).length,
      0
    )
  );
</script>

{#if train}
  <button type="button" class="panel train-panel" onclick={onopen} title="Click for the full roster">
    <div class="tp-head">
      <h4>🛞 TRAIN <span class="tp-name">· {train.name}</span></h4>
      <span class="expand-hint">▸</span>
    </div>
    <div class="tp-stats">
      <div class="tp-stat">
        <span class="tp-num">{aliveCount}</span>
        <span class="tp-lbl">wagons</span>
      </div>
      <div class="tp-stat">
        <span class="tp-num">{totalSouls}</span>
        <span class="tp-lbl">souls</span>
      </div>
      <div class="tp-stat">
        <span class="tp-num" style="color: {moraleColor};">{avgMorale}</span>
        <span class="tp-lbl">morale</span>
      </div>
    </div>
  </button>
{/if}

<style>
  .panel.train-panel {
    background: var(--of-paper);
    border: 1px solid var(--of-ink-soft);
    border-radius: 4px;
    padding: 0.6em 0.8em;
    color: var(--of-ink);
    font-family: inherit;
    text-align: left;
    width: 100%;
    cursor: pointer;
    margin-bottom: 0.5em;
  }
  .panel.train-panel:hover { border-color: var(--of-rust); }
  .tp-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.4em;
  }
  .tp-head h4 {
    margin: 0;
    font-size: 0.78em;
    letter-spacing: 0.12em;
    color: var(--of-ink-soft);
    font-weight: 700;
  }
  .tp-name {
    color: var(--of-ink);
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
  }
  .expand-hint {
    color: var(--of-ink-soft);
    font-size: 0.9em;
    opacity: 0.7;
  }
  .tp-stats {
    display: flex;
    gap: 1.1em;
    margin-top: 0.4em;
  }
  .tp-stat {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  .tp-num {
    font-size: 1.3em;
    font-weight: 700;
    line-height: 1;
  }
  .tp-lbl {
    font-size: 0.7em;
    color: var(--of-ink-soft);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-top: 0.15em;
  }
</style>
