<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import type { Landmark } from '$lib/game/content/landmarks';

  // The Visit hub for any landmark interaction. Currently trading posts are
  // the only landmark kind that opens this; future kinds (Indian trading
  // posts, road ranches, river-side Native camps) plug in by adding a
  // branch in `actions` below.

  let {
    state: gameState,
    landmark,
    onclose,
    ontrade
  }: {
    state: GameState;
    landmark: Landmark;
    onclose: () => void;
    ontrade: () => void;
  } = $props();

  interface VisitAction {
    key: string;
    icon: string;
    label: string;
    sub: string;
    handler: () => void;
    disabled?: boolean;
    disabledReason?: string;
  }

  // Future: landmark.kind === 'native_post' → barter (#100 follow-up),
  // landmark.kind === 'road_ranch' → restock + rumor, etc. Each new branch
  // adds its own VisitAction[].
  const actionList = $derived.by<VisitAction[]>(() => {
    if (landmark.kind === 'trading_post') {
      return [
        {
          key: 'trade',
          icon: '🛍️',
          label: 'Trade at the post',
          sub: 'Buy and sell supplies',
          handler: () => { onclose(); ontrade(); }
        }
      ];
    }
    return [];
  });

  // Light flavor — same per-landmark pool as LandmarkStage (kept inline for
  // now; could share via text-pools.ts when Visit grows).
  const FLAVOR: Record<string, string> = {
    ft_kearny:      'Soldiers drill at dawn; emigrants trade at dusk. The post quartermaster sets fair prices.',
    ft_laramie:     'A great adobe fort at the fork of the Laramie and North Platte. Last outpost before the Rockies — supplies are dear.',
    ft_bridger:     "Jim Bridger's stockade is famously thin on stock. Take what you can get.",
    ft_hall:        "A Hudson's Bay Company post on the Snake. The California Trail splits here — half the wagons turn south.",
    ft_boise:       'A small HBC station by the Boise River. Worn travelers rest among cottonwoods.',
    ft_walla_walla: 'A lonely outpost by the Columbia. The final stretch begins.',
    the_dalles:     'A river-port town at the head of the Columbia gorge. End-of-trail chaos.'
  };
  const flavor = $derived(FLAVOR[landmark.id] ?? 'You enter the post.');
</script>

<div class="modal-backdrop" onclick={onclose} role="presentation">
  <div class="panel modal-body" onclick={(e) => e.stopPropagation()} role="presentation">
    <div class="head">
      <span class="kind-label">VISITING</span>
      <h2>{landmark.name}</h2>
    </div>
    <p class="flavor">{flavor}</p>

    <div class="actions">
      {#each actionList as a (a.key)}
        <button
          type="button"
          class="action-card"
          onclick={a.handler}
          disabled={a.disabled}
          title={a.disabled ? a.disabledReason ?? '' : ''}
        >
          <span class="action-icon">{a.icon}</span>
          <span class="action-body">
            <span class="action-label">{a.label}</span>
            <span class="action-sub">{a.sub}</span>
          </span>
        </button>
      {/each}
      {#if actionList.length === 0}
        <p class="empty">There's nothing to do here right now.</p>
      {/if}
    </div>

    <div class="footer">
      <button type="button" class="leave" onclick={onclose}>Leave</button>
      {#if gameState.cash > 0}
        <span class="cash-tag">Cash on hand: ${gameState.cash}</span>
      {/if}
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
  }
  .modal-body {
    max-width: 540px;
    width: 100%;
    padding: 1.4em;
    border-color: var(--c-rust);
  }
  .head { margin-bottom: 0.4em; }
  .kind-label {
    font-size: 0.7em;
    letter-spacing: 0.18em;
    color: var(--c-wood);
    font-weight: 700;
  }
  h2 {
    margin: 0.1em 0 0 0;
    color: var(--c-rust);
    letter-spacing: 0.04em;
  }
  .flavor {
    color: var(--c-wood);
    font-style: italic;
    margin: 0 0 1em 0;
    line-height: 1.4;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 0.4em;
    margin-bottom: 1em;
  }
  .action-card {
    display: flex;
    align-items: center;
    gap: 0.7em;
    padding: 0.7em 0.9em;
    background: var(--c-bg-raised);
    color: var(--c-tan);
    border: 2px solid var(--c-wood);
    border-radius: 3px;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: none;
    transition: background 0.12s, border-color 0.12s;
  }
  .action-card:hover:not(:disabled) {
    background: var(--c-panel);
    border-color: var(--c-rust);
  }
  .action-card:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .action-icon {
    font-size: 1.6em;
    line-height: 1;
  }
  .action-body {
    display: flex;
    flex-direction: column;
    gap: 0.15em;
    min-width: 0;
  }
  .action-label { font-size: 1em; }
  .action-sub {
    font-size: 0.78em;
    font-weight: normal;
    color: var(--c-wood);
    letter-spacing: normal;
  }
  .empty {
    color: var(--c-wood);
    font-style: italic;
    text-align: center;
    padding: 1em;
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8em;
  }
  .leave {
    background: var(--c-bg-raised);
    border: 2px solid var(--c-wood);
    color: var(--c-tan);
  }
  .cash-tag {
    font-size: 0.85em;
    color: var(--c-wood);
    font-style: italic;
  }
</style>
