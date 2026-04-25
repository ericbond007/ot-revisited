<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import type { Landmark } from '$lib/game/content/landmarks';
  import { enhance } from '$app/forms';
  import {
    REPAIR_DOLLARS_PER_POINT,
    INN_DOLLARS_PER_PERSON_PER_NIGHT,
    BROTHEL_DOLLARS_PER_MAN
  } from '$lib/game/systems/town-services';

  // The Visit hub for any landmark interaction. Trading posts now offer
  // the trade window plus optional services (#152): blacksmith for
  // wagon repair, inn for paid rest, gambling for cash swings, brothel
  // for a morale jolt at certain road-ranch / Hog-Ranch posts.
  //
  // Each service is its own form POSTing to a play/+page.server.ts
  // action. The mechanics live in systems/town-services.ts.

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
  const qp = $derived(encodeURIComponent(slot));
  // svelte-ignore non_reactive_update
  let slot = '';
  // Slot is read from the URL search params on the server actions, but
  // the buttons here just need it on the form action — we read it from
  // the route once.
  $effect(() => {
    if (typeof window !== 'undefined') {
      slot = new URLSearchParams(window.location.search).get('slot') ?? '';
    }
  });

  // Service availability + pricing.
  const services = $derived(landmark.services ?? []);
  const innRate = $derived(landmark.innNightlyRate ?? INN_DOLLARS_PER_PERSON_PER_NIGHT);
  const aliveCount = $derived(gameState.party.filter((m) => !m.dead).length);
  const adultMales = $derived(
    gameState.party.filter((m) => !m.dead && m.kind === 'adult' && m.sex === 'male').length
  );

  // Default amounts for one-click services. Player can re-click for more.
  const REPAIR_DOLLARS_PER_CLICK = 20;
  const GAMBLE_STAKE = 5;

  const repairPoints = REPAIR_DOLLARS_PER_CLICK / REPAIR_DOLLARS_PER_POINT;
  const innCost = $derived(aliveCount * innRate);
  const brothelCost = $derived(adultMales * BROTHEL_DOLLARS_PER_MAN);

  const wagonNeedsRepair = $derived(gameState.wagon.condition < 100);

  // Flavor blurb lives on the Landmark itself now (landmarks.ts). Falls
  // back to a generic line for any post that hasn't been written up yet.
  const flavor = $derived(landmark.blurb ?? 'You enter the post.');
</script>

<div class="modal-backdrop" onclick={onclose} role="presentation">
  <div class="panel modal-body" onclick={(e) => e.stopPropagation()} role="presentation">
    <div class="head">
      <span class="kind-label">VISITING</span>
      <h2>{landmark.name}</h2>
    </div>
    <p class="flavor">{flavor}</p>

    <div class="actions">
      <!-- Trade is universal at trading posts. -->
      {#if landmark.kind === 'trading_post'}
        <button
          type="button"
          class="action-card"
          onclick={() => { onclose(); ontrade(); }}
        >
          <span class="action-icon">🛍️</span>
          <span class="action-body">
            <span class="action-label">Trade at the post</span>
            <span class="action-sub">Buy and sell supplies</span>
          </span>
        </button>
      {/if}

      <!-- Blacksmith — pay $20 for +40 condition (capped at 100). -->
      {#if services.includes('blacksmith')}
        <form
          method="POST"
          action="?/townRepair&slot={qp}"
          use:enhance={() => () => {}}
          class="svc-form"
        >
          <input type="hidden" name="dollars" value={REPAIR_DOLLARS_PER_CLICK} />
          <button
            type="submit"
            class="action-card"
            disabled={!wagonNeedsRepair || gameState.cash < REPAIR_DOLLARS_PER_CLICK}
            title={!wagonNeedsRepair ? 'Wagon is fully repaired' : (gameState.cash < REPAIR_DOLLARS_PER_CLICK ? 'Not enough cash' : '')}
          >
            <span class="action-icon">🔨</span>
            <span class="action-body">
              <span class="action-label">Hire the blacksmith</span>
              <span class="action-sub">${REPAIR_DOLLARS_PER_CLICK} → up to +{repairPoints} wagon condition</span>
            </span>
          </button>
        </form>
      {/if}

      <!-- Inn — one night, full party. -->
      {#if services.includes('inn')}
        <form
          method="POST"
          action="?/townInn&slot={qp}"
          use:enhance={() => () => {}}
          class="svc-form"
        >
          <input type="hidden" name="nights" value="1" />
          <button
            type="submit"
            class="action-card"
            disabled={gameState.cash < innCost || aliveCount === 0}
            title={gameState.cash < innCost ? 'Not enough cash' : ''}
          >
            <span class="action-icon">🛏️</span>
            <span class="action-body">
              <span class="action-label">Stay the night at the inn</span>
              <span class="action-sub">${innCost} ({aliveCount} × ${innRate}) · +5 morale, +5 HP each, advances 1 day</span>
            </span>
          </button>
        </form>
      {/if}

      <!-- Gambling — fixed $5 stake. -->
      {#if services.includes('gambling')}
        <form
          method="POST"
          action="?/townGamble&slot={qp}"
          use:enhance={() => () => {}}
          class="svc-form"
        >
          <input type="hidden" name="stake" value={GAMBLE_STAKE} />
          <button
            type="submit"
            class="action-card"
            disabled={gameState.cash < GAMBLE_STAKE}
            title={gameState.cash < GAMBLE_STAKE ? 'Not enough cash' : ''}
          >
            <span class="action-icon">🎲</span>
            <span class="action-body">
              <span class="action-label">Try your luck at cards</span>
              <span class="action-sub">${GAMBLE_STAKE} stake · ~45% win double, 55% lose stake</span>
            </span>
          </button>
        </form>
      {/if}

      <!-- Brothel — period-flavored "cribs out back". -->
      {#if services.includes('brothel')}
        <form
          method="POST"
          action="?/townBrothel&slot={qp}"
          use:enhance={() => () => {}}
          class="svc-form"
        >
          <button
            type="submit"
            class="action-card"
            disabled={adultMales === 0 || gameState.cash < brothelCost}
            title={adultMales === 0 ? 'No adult men in the party' : (gameState.cash < brothelCost ? 'Not enough cash' : '')}
          >
            <span class="action-icon">💋</span>
            <span class="action-body">
              <span class="action-label">Visit the cribs out back</span>
              <span class="action-sub">${brothelCost} ({adultMales} men × ${BROTHEL_DOLLARS_PER_MAN}) · party morale up</span>
            </span>
          </button>
        </form>
      {/if}

      {#if landmark.kind !== 'trading_post' && services.length === 0}
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
  .svc-form {
    margin: 0;
    padding: 0;
    display: block;
    width: 100%;
  }
  .svc-form .action-card {
    width: 100%;
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
