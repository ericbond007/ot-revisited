<script lang="ts">
  // Confirm-before-commit modal for town services. Replaces the
  // previous inline-form-on-card pattern where clicking the cost
  // button silently submitted with no feedback or final-amount review.
  //
  // Click on a TownStage service card → open this modal with the
  // action kind. Modal owns the cost-driving stepper (repair points /
  // nights / stake / guide days) so the player can dial in the spend
  // BEFORE committing. Cancel = no commit; Confirm submits to the
  // corresponding `?/townX` server action.
  //
  // Closes #188 (no confirm), #193 (long-time-to-fire), #194 (money
  // chosen on the modal not the card).
  import type { GameState } from '$lib/game/types';
  import type { Landmark } from '$lib/game/content/landmarks';
  import { enhance } from '$app/forms';
  import NumberStepper from './NumberStepper.svelte';
  import { ICON } from '$lib/data/icon-dictionary';
  import {
    REPAIR_DOLLARS_PER_POINT,
    INN_DOLLARS_PER_PERSON_PER_NIGHT,
    BROTHEL_DOLLARS_PER_MAN,
    BROTHEL_MORALE_PER_MAN,
    BROTHEL_POX_CHANCE_PER_MAN,
    GUIDE_DOLLARS_PER_DAY,
    GAMBLE_WIN_CHANCE
  } from '$lib/game/systems/town-services';

  export type TownActionKind = 'repair' | 'inn' | 'gamble' | 'guide' | 'brothel';

  let {
    kind,
    state: gameState,
    landmark,
    slot,
    onclose
  }: {
    kind: TownActionKind;
    state: GameState;
    landmark: Landmark;
    slot: string;
    onclose: () => void;
  } = $props();

  const qp = $derived(encodeURIComponent(slot));

  // Shared derivations.
  const aliveCount = $derived(gameState.party.filter((m) => !m.dead).length);
  const adultMales = $derived(
    gameState.party.filter((m) => !m.dead && m.kind === 'adult' && m.sex === 'male').length
  );
  const innRate = $derived(landmark.innNightlyRate ?? INN_DOLLARS_PER_PERSON_PER_NIGHT);
  const wagonRoom = $derived(Math.max(1, 100 - Math.round(gameState.wagon.condition)));

  // Per-kind qty state. Only the relevant one is bound; others sit unused.
  // The initial-value derefs of wagonRoom / gameState.cash are intentional
  // (one-shot at modal open) — modal is short-lived.
  let nights = $state(1);
  // svelte-ignore state_referenced_locally
  let repairPoints = $state(Math.min(20, wagonRoom));
  // svelte-ignore state_referenced_locally
  let stake = $state(Math.min(5, gameState.cash || 1));
  let guideDays = $state(5);

  const innCost = $derived(aliveCount * nights * innRate);
  const repairCost = $derived(Math.ceil(repairPoints * REPAIR_DOLLARS_PER_POINT));
  const guideCost = $derived(guideDays * GUIDE_DOLLARS_PER_DAY);
  const brothelCost = $derived(adultMales * BROTHEL_DOLLARS_PER_MAN);

  // Clamp repair points if wagonRoom shifts (rare — wagon can take damage
  // mid-modal in theory, though it shouldn't while paused at a post).
  $effect(() => {
    if (repairPoints > wagonRoom) repairPoints = wagonRoom;
  });

  // Per-kind static config — title, glyph, accent, server action, cost
  // and computed summary line. The qty stepper itself renders per-kind
  // in markup below since each binds to a different reactive variable.
  const cost = $derived(
    kind === 'repair'  ? repairCost :
    kind === 'inn'     ? innCost :
    kind === 'gamble'  ? stake :
    kind === 'guide'   ? guideCost :
    /* brothel */        brothelCost
  );

  const canAfford = $derived(
    gameState.cash >= cost && (kind !== 'brothel' || adultMales > 0)
  );

  const meta = $derived(
    kind === 'repair' ? {
      glyph: ICON.town_services.blacksmith,
      title: 'Hire the blacksmith',
      accent: 'var(--c-rust)',
      formAction: `?/townRepair&slot=${qp}`,
      summary: `+${repairPoints} wagon condition`,
      confirmLabel: 'Confirm'
    }
    : kind === 'inn' ? {
      glyph: ICON.town_services.inn,
      title: 'Stay at the inn',
      accent: '#7a8458',
      formAction: `?/townInn&slot=${qp}`,
      summary: `${aliveCount} ${aliveCount === 1 ? 'person' : 'people'} × ${nights} ${nights === 1 ? 'night' : 'nights'} · +${nights * 5} morale, +${nights * 5} HP each`,
      confirmLabel: 'Confirm'
    }
    : kind === 'gamble' ? {
      glyph: ICON.town_services.gambling,
      title: 'Try your luck at cards',
      accent: '#a83a18',
      formAction: `?/townGamble&slot=${qp}`,
      summary: `~${Math.round(GAMBLE_WIN_CHANCE * 100)}% chance to double · ${100 - Math.round(GAMBLE_WIN_CHANCE * 100)}% lose the stake`,
      confirmLabel: 'Place stake'
    }
    : kind === 'guide' ? {
      glyph: ICON.town_services.guide,
      title: 'Hire a guide',
      accent: '#c9a04a',
      formAction: `?/townGuide&slot=${qp}`,
      summary: `${guideDays} days of +15% travel speed`,
      confirmLabel: 'Confirm'
    }
    /* brothel */ : {
      glyph: ICON.town_services.brothel,
      title: 'Visit the cribs out back',
      accent: '#a83a18',
      formAction: `?/townBrothel&slot=${qp}`,
      summary: `${adultMales} ${adultMales === 1 ? 'man' : 'men'} × $${BROTHEL_DOLLARS_PER_MAN} · +${BROTHEL_MORALE_PER_MAN * adultMales} morale · ${Math.round(BROTHEL_POX_CHANCE_PER_MAN * 100)}% pox risk per man`,
      confirmLabel: 'Go in'
    }
  );

  // Hidden field name + value per kind. Server actions read by these names.
  const hiddenName = $derived(
    kind === 'repair'  ? 'dollars' :   // server expects $cost, multiplies back to points internally
    kind === 'inn'     ? 'nights' :
    kind === 'gamble'  ? 'stake' :
    kind === 'guide'   ? 'dollars' :
    /* brothel */        ''            // brothel takes no qty input
  );
  const hiddenValue = $derived(
    kind === 'repair'  ? repairCost :
    kind === 'inn'     ? nights :
    kind === 'gamble'  ? stake :
    kind === 'guide'   ? guideCost :
    /* brothel */        0
  );
</script>

<div class="modal-backdrop" onclick={onclose} role="presentation">
  <div class="panel modal-body" onclick={(e) => e.stopPropagation()} role="presentation"
       style="--accent: {meta.accent};">
    <div class="head">
      <span class="head-glyph" aria-hidden="true">{meta.glyph}</span>
      <div class="head-titles">
        <span class="head-tag">{landmark.name.toUpperCase()}</span>
        <h2 class="modal-title">{meta.title}</h2>
      </div>
    </div>

    <p class="summary">{meta.summary}</p>

    <form method="POST" action={meta.formAction} use:enhance={() => {
      // Close the modal on a successful submit; SvelteKit invalidates the
      // page so cash/HP/etc. update under the now-closed overlay.
      return ({ result, update }) => {
        if (result.type === 'success' || result.type === 'redirect') onclose();
        return update();
      };
    }} class="form">
      {#if hiddenName}
        <input type="hidden" name={hiddenName} value={hiddenValue} />
      {/if}

      {#if kind === 'repair'}
        <div class="qty-row">
          <span class="qty-label">Repair points</span>
          <NumberStepper bind:value={repairPoints} min={1} max={wagonRoom} ariaLabel="Repair points" hideValue displayValue={repairPoints} />
          <span class="qty-suffix">points</span>
        </div>
      {:else if kind === 'inn'}
        <div class="qty-row">
          <span class="qty-label">Nights</span>
          <NumberStepper bind:value={nights} min={1} max={10} ariaLabel="Nights" hideValue displayValue={nights} />
          <span class="qty-suffix">{nights === 1 ? 'night' : 'nights'}</span>
        </div>
      {:else if kind === 'gamble'}
        <div class="qty-row">
          <span class="qty-label">Stake</span>
          <NumberStepper bind:value={stake} min={1} max={Math.min(50, gameState.cash || 1)} ariaLabel="Stake" hideValue displayValue={stake} />
          <span class="qty-suffix">dollars</span>
        </div>
      {:else if kind === 'guide'}
        <div class="qty-row">
          <span class="qty-label">Days hired</span>
          <NumberStepper bind:value={guideDays} min={1} max={30} ariaLabel="Guide days" hideValue displayValue={guideDays} />
          <span class="qty-suffix">{guideDays === 1 ? 'day' : 'days'}</span>
        </div>
      {/if}

      <div class="cost-row">
        <span class="cost-label">Cost</span>
        <span class="cost-val" class:cant-afford={!canAfford}>${cost}</span>
      </div>

      <div class="actions">
        <button type="button" class="btn-cancel" onclick={onclose}>Cancel</button>
        <button type="submit" class="btn-confirm" disabled={!canAfford}>{meta.confirmLabel}</button>
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
  }
  .modal-body {
    width: min(440px, 92vw);
    padding: 1.2em 1.4em;
    border-color: var(--accent);
    border-width: 2px;
    background: linear-gradient(180deg, var(--c-panel) 0%, #1a1612 100%);
  }

  .head {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.8em;
    align-items: center;
    padding-bottom: 0.6em;
    border-bottom: 1px solid rgba(138, 90, 42, 0.35);
    margin-bottom: 0.8em;
  }
  .head-glyph { font-size: 2em; line-height: 1; }
  .head-tag {
    display: block;
    font-size: 0.65em;
    font-weight: 700;
    letter-spacing: 0.18em;
    color: var(--accent);
    opacity: 0.85;
    margin-bottom: 0.2em;
  }
  .modal-title { margin: 0; color: var(--accent); font-size: 1.25em; }

  .summary {
    color: var(--c-wood);
    margin: 0 0 0.9em 0;
    font-size: 0.92em;
    line-height: 1.4;
  }

  .form { display: flex; flex-direction: column; gap: 0.7em; }

  .qty-row {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 0.7em;
    padding: 0.5em 0.7em;
    background: rgba(0, 0, 0, 0.18);
    border: 1px solid rgba(138, 90, 42, 0.25);
    border-radius: 4px;
  }
  .qty-label {
    font-size: 0.75em;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--c-rust-dark);
  }
  .qty-suffix {
    font-size: 0.85em;
    color: var(--c-wood);
    opacity: 0.7;
  }

  .cost-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 0.5em 0.7em;
    border-top: 1px dashed rgba(138, 90, 42, 0.4);
  }
  .cost-label {
    font-size: 0.75em;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: var(--c-wood);
  }
  .cost-val { font-size: 1.4em; font-weight: 700; color: var(--accent); }
  .cost-val.cant-afford { color: #e85a4a; }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1.6fr;
    gap: 0.6em;
    margin-top: 0.4em;
  }
  .btn-cancel,
  .btn-confirm {
    padding: 0.7em 1em;
    font-weight: 700;
    letter-spacing: 0.05em;
    border: 1.5px solid;
    cursor: pointer;
  }
  .btn-cancel {
    border-color: rgba(138, 90, 42, 0.5);
    background: transparent;
    color: var(--c-wood);
  }
  .btn-cancel:hover { background: rgba(138, 90, 42, 0.1); }
  .btn-confirm {
    border-color: var(--accent);
    background: var(--accent);
    color: #fff;
  }
  .btn-confirm:hover:not(:disabled) { filter: brightness(1.1); }
  .btn-confirm:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
