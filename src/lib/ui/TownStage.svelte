<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import type { Landmark, PostKind } from '$lib/game/content/landmarks';
  import { enhance } from '$app/forms';
  import NumberStepper from './NumberStepper.svelte';
  import {
    REPAIR_DOLLARS_PER_POINT,
    INN_DOLLARS_PER_PERSON_PER_NIGHT,
    BROTHEL_DOLLARS_PER_MAN,
    GUIDE_DOLLARS_PER_DAY
  } from '$lib/game/systems/town-services';
  import { POST_THEME } from '$lib/data/post-theme';
  import { ICON } from '$lib/data/icon-dictionary';

  // Fullscreen Town view. Replaces the VisitModal — same service-card
  // grid rendered inline in the left-column stage slot, alongside the
  // trail map / camp stage / landmark stage. Keeps Trade as a child
  // modal handoff (Trade is its own dense screen and stays modal).

  let {
    state: gameState,
    landmark,
    slot,
    onleave,
    ontrade
  }: {
    state: GameState;
    landmark: Landmark;
    slot: string;
    onleave: () => void;
    ontrade: () => void;
  } = $props();
  const qp = $derived(encodeURIComponent(slot));

  const postKind = $derived<PostKind>(landmark.postKind ?? 'frontier');
  const theme = $derived(POST_THEME[postKind]);

  const services = $derived(landmark.services ?? []);
  const innRate = $derived(landmark.innNightlyRate ?? INN_DOLLARS_PER_PERSON_PER_NIGHT);
  const aliveCount = $derived(gameState.party.filter((m) => !m.dead).length);
  const adultMales = $derived(
    gameState.party.filter((m) => !m.dead && m.kind === 'adult' && m.sex === 'male').length
  );

  let nights = $state(1);
  let repairPoints = $state(20);
  let stake = $state(5);
  let guideDays = $state(5);

  const innCost = $derived(aliveCount * nights * innRate);
  const repairCost = $derived(Math.ceil(repairPoints * REPAIR_DOLLARS_PER_POINT));
  const brothelCost = $derived(adultMales * BROTHEL_DOLLARS_PER_MAN);
  const guideCost = $derived(guideDays * GUIDE_DOLLARS_PER_DAY);

  const wagonRoom = $derived(Math.max(1, 100 - Math.round(gameState.wagon.condition)));
  const wagonNeedsRepair = $derived(gameState.wagon.condition < 100);

  $effect(() => {
    if (repairPoints > wagonRoom) repairPoints = wagonRoom;
  });

  const flavor = $derived(landmark.blurb ?? 'You enter the post.');
  const guideActive = $derived(((gameState.flags._guideUntilDay as number | undefined) ?? 0) > gameState.day);
</script>

<div class="town-stage panel" style="--post-accent: {theme.accent};">
  <!-- Header -->
  <div class="hero">
    <div class="hero-glyph" aria-hidden="true">{theme.glyph}</div>
    <div class="hero-text">
      <div class="kind">{theme.tag}</div>
      <h2 class="title">{landmark.name}</h2>
      <p class="flavor">{flavor}</p>
    </div>
    <div class="hero-stats">
      <div class="stat">
        <span class="stat-label">CASH</span>
        <span class="stat-val">${gameState.cash}</span>
      </div>
      {#if guideActive}
        <div class="stat tone-good">
          <span class="stat-label">GUIDE</span>
          <span class="stat-val">until day {gameState.flags._guideUntilDay}</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- Service grid -->
  <div class="services">
    {#if landmark.kind === 'trading_post'}
      <button type="button" class="svc-card primary" onclick={ontrade}>
        <span class="svc-icon">{ICON.town_services.store}</span>
        <div class="svc-body">
          <span class="svc-label">Trade at the post</span>
          <span class="svc-sub">Buy and sell supplies</span>
        </div>
      </button>
    {/if}

    {#if services.includes('gossip')}
      <form method="POST" action="?/townGossip&slot={qp}" use:enhance={() => () => {}} class="svc-form">
        <button type="submit" class="svc-card" disabled={gameState.cash < 1}>
          <span class="svc-icon">{ICON.town_services.gossip}</span>
          <div class="svc-body">
            <span class="svc-label">Ask around for news</span>
            <span class="svc-sub">$1 (round of drinks) · pulls a fresh rumor</span>
          </div>
        </button>
      </form>

      <form method="POST" action="?/townNewspaper&slot={qp}" use:enhance={() => () => {}} class="svc-form">
        <button type="submit" class="svc-card" disabled={gameState.cash < 1}>
          <span class="svc-icon">{ICON.town_services.newspaper}</span>
          <div class="svc-body">
            <span class="svc-label">Read the newspaper</span>
            <span class="svc-sub">$1 · headlines from back east + a rumor or two</span>
          </div>
        </button>
      </form>
    {/if}

    {#if services.includes('blacksmith')}
      <form method="POST" action="?/townRepair&slot={qp}" use:enhance={() => () => {}} class="svc-form">
        <input type="hidden" name="dollars" value={repairCost} />
        <div class="svc-card" class:disabled={!wagonNeedsRepair || gameState.cash < repairCost}>
          <span class="svc-icon">{ICON.town_services.blacksmith}</span>
          <div class="svc-body">
            <span class="svc-label">Hire the blacksmith</span>
            <span class="svc-sub">+{repairPoints} condition for ${repairCost}</span>
          </div>
          <div class="svc-controls">
            <NumberStepper bind:value={repairPoints} min={1} max={wagonRoom} ariaLabel="Repair points" hideValue displayValue={repairPoints} />
            <button type="submit" class="svc-go" disabled={!wagonNeedsRepair || gameState.cash < repairCost}>
              ${repairCost}
            </button>
          </div>
        </div>
      </form>
    {/if}

    {#if services.includes('inn')}
      <form method="POST" action="?/townInn&slot={qp}" use:enhance={() => () => {}} class="svc-form">
        <input type="hidden" name="nights" value={nights} />
        <div class="svc-card" class:disabled={gameState.cash < innCost || aliveCount === 0}>
          <span class="svc-icon">{ICON.town_services.inn}</span>
          <div class="svc-body">
            <span class="svc-label">Stay at the inn</span>
            <span class="svc-sub">{nights} {nights === 1 ? 'night' : 'nights'} × {aliveCount} × ${innRate} = ${innCost} · +{nights * 5} morale, +{nights * 5} HP/member</span>
          </div>
          <div class="svc-controls">
            <NumberStepper bind:value={nights} min={1} max={10} ariaLabel="Nights" hideValue displayValue={nights} />
            <button type="submit" class="svc-go" disabled={gameState.cash < innCost}>${innCost}</button>
          </div>
        </div>
      </form>
    {/if}

    {#if services.includes('guide')}
      <form method="POST" action="?/townGuide&slot={qp}" use:enhance={() => () => {}} class="svc-form">
        <input type="hidden" name="dollars" value={guideCost} />
        <div class="svc-card" class:disabled={gameState.cash < guideCost}>
          <span class="svc-icon">{ICON.town_services.guide}</span>
          <div class="svc-body">
            <span class="svc-label">Hire a guide</span>
            <span class="svc-sub">{guideDays} days · ${guideCost} · +15% travel speed while along</span>
          </div>
          <div class="svc-controls">
            <NumberStepper bind:value={guideDays} min={1} max={30} ariaLabel="Guide days" hideValue displayValue={guideDays} />
            <button type="submit" class="svc-go" disabled={gameState.cash < guideCost}>${guideCost}</button>
          </div>
        </div>
      </form>
    {/if}

    {#if services.includes('gambling')}
      <form method="POST" action="?/townGamble&slot={qp}" use:enhance={() => () => {}} class="svc-form">
        <input type="hidden" name="stake" value={stake} />
        <div class="svc-card" class:disabled={gameState.cash < stake}>
          <span class="svc-icon">{ICON.town_services.gambling}</span>
          <div class="svc-body">
            <span class="svc-label">Try your luck at cards</span>
            <span class="svc-sub">${stake} stake · ~45% double, 55% lose</span>
          </div>
          <div class="svc-controls">
            <NumberStepper bind:value={stake} min={1} max={Math.min(50, gameState.cash || 1)} ariaLabel="Stake" hideValue displayValue={stake} />
            <button type="submit" class="svc-go" disabled={gameState.cash < stake}>${stake}</button>
          </div>
        </div>
      </form>
    {/if}

    {#if services.includes('brothel')}
      <form method="POST" action="?/townBrothel&slot={qp}" use:enhance={() => () => {}} class="svc-form">
        <button type="submit" class="svc-card" disabled={adultMales === 0 || gameState.cash < brothelCost}>
          <span class="svc-icon">{ICON.town_services.brothel}</span>
          <div class="svc-body">
            <span class="svc-label">Visit the cribs out back</span>
            <span class="svc-sub">${brothelCost} ({adultMales} men × ${BROTHEL_DOLLARS_PER_MAN}) · party morale up · 8% pox risk per man</span>
          </div>
        </button>
      </form>
    {/if}

    {#if landmark.kind !== 'trading_post' && services.length === 0}
      <p class="empty">There's nothing to do here right now.</p>
    {/if}
  </div>

  <div class="footer">
    <button type="button" class="leave" onclick={onleave}>Leave town</button>
  </div>
</div>

<style>
  .town-stage {
    display: flex;
    flex-direction: column;
    gap: 0.7em;
    padding: 1em 1.2em;
    border-color: var(--post-accent, var(--c-rust));
    border-width: 2px;
    background: linear-gradient(180deg, var(--c-panel) 0%, #1a1612 100%);
  }

  /* Hero block — kind tag, title, flavor, cash readout. */
  .hero {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 1em;
    align-items: center;
    padding-bottom: 0.7em;
    border-bottom: 1px solid rgba(138, 90, 42, 0.35);
  }
  .hero-glyph {
    font-size: 2.6em;
    line-height: 1;
  }
  .hero-text { min-width: 0; }
  .kind {
    font-size: 0.7em;
    letter-spacing: 0.18em;
    color: var(--c-wood);
    font-weight: 700;
    text-transform: uppercase;
  }
  .title {
    margin: 0.05em 0 0.1em;
    color: var(--post-accent, var(--c-rust));
    font-size: 1.5em;
    letter-spacing: 0.04em;
  }
  .flavor {
    margin: 0;
    color: var(--c-wood);
    font-style: italic;
    font-size: 0.9em;
    line-height: 1.4;
  }
  .hero-stats {
    display: flex;
    flex-direction: column;
    gap: 0.3em;
    align-items: flex-end;
  }
  .stat {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    padding: 0.3em 0.6em;
    background: var(--c-bg-raised);
    border: 1px solid rgba(138, 90, 42, 0.4);
    border-radius: 3px;
    font-size: 0.85em;
  }
  .stat-label {
    font-size: 0.65em;
    color: var(--c-wood);
    letter-spacing: 0.12em;
    font-weight: 700;
  }
  .stat-val {
    color: var(--c-tan-bright);
    font-weight: 700;
  }
  .stat.tone-good { border-color: #8bb96a; color: #8bb96a; }

  /* Service grid */
  .services {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 0.5em;
  }
  .svc-form {
    margin: 0;
    padding: 0;
    display: block;
    width: 100%;
  }
  .svc-card {
    display: flex;
    align-items: center;
    gap: 0.7em;
    padding: 0.7em 0.9em;
    background: var(--c-bg-raised);
    color: var(--c-tan);
    border: 2px solid var(--c-wood);
    border-radius: 3px;
    font-family: inherit;
    font-weight: 700;
    text-align: left;
    width: 100%;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s;
  }
  .svc-card:hover:not(:disabled):not(.disabled) {
    background: var(--c-panel);
    border-color: var(--post-accent, var(--c-rust));
  }
  .svc-card:disabled, .svc-card.disabled { opacity: 0.55; cursor: not-allowed; }
  .svc-card.primary {
    border-color: var(--post-accent, var(--c-rust));
    background: var(--c-panel);
  }
  .svc-icon {
    font-size: 1.7em;
    line-height: 1;
    flex-shrink: 0;
  }
  .svc-body {
    display: flex;
    flex-direction: column;
    gap: 0.15em;
    flex: 1;
    min-width: 0;
  }
  .svc-label { font-size: 0.95em; }
  .svc-sub {
    font-size: 0.78em;
    font-weight: normal;
    color: var(--c-wood);
    letter-spacing: normal;
    line-height: 1.3;
  }
  .svc-controls {
    display: flex;
    align-items: center;
    gap: 0.4em;
    flex-shrink: 0;
  }
  .svc-go {
    background: var(--c-rust-dark);
    color: var(--c-tan-bright);
    border: 2px solid var(--c-rust);
    border-radius: 3px;
    padding: 0.45em 0.7em;
    font-family: inherit;
    font-weight: 700;
    font-size: 0.78em;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    cursor: pointer;
  }
  .svc-go:hover:not(:disabled) { background: var(--c-rust); }
  .svc-go:disabled { opacity: 0.5; cursor: not-allowed; }

  .empty {
    color: var(--c-wood);
    font-style: italic;
    text-align: center;
    padding: 1em;
    grid-column: 1 / -1;
  }

  .footer {
    display: flex;
    justify-content: flex-end;
    padding-top: 0.5em;
    border-top: 1px solid rgba(138, 90, 42, 0.25);
  }
  .leave {
    background: var(--c-bg-raised);
    border: 2px solid var(--c-wood);
    color: var(--c-tan);
    padding: 0.5em 1.2em;
    border-radius: 3px;
    font-family: inherit;
    font-weight: 700;
    cursor: pointer;
  }
  .leave:hover { border-color: var(--c-rust); }
</style>
