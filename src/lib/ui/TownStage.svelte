<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import type { Landmark, PostKind } from '$lib/game/content/landmarks';
  import { isNativeCampHostile, isLandmarkAbandoned } from '$lib/game/content/landmarks';
  import { getTribeAttitude } from '$lib/game/systems/tribe-relations';
  import { enhance } from '$app/forms';
  import LandmarkArt, { hasLandmarkArt } from '$lib/ui/landmark-art/LandmarkArt.svelte';
  import TownActionModal, { type TownActionKind } from './TownActionModal.svelte';
  import {
    REPAIR_DOLLARS_PER_POINT,
    INN_DOLLARS_PER_PERSON_PER_NIGHT,
    BROTHEL_DOLLARS_PER_MAN,
    GUIDE_DOLLARS_PER_DAY,
    FORGE_OX_SHOES_DOLLARS_PER_PAIR,
    BATH_HOUSE_DOLLARS_PER_PERSON
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

  // Cards show estimated cost using sensible defaults; the modal lets
  // the player tune the actual amount before committing. Defaults match
  // the modal's initial $state values so the displayed estimate is what
  // the player actually sees on first open.
  const NIGHTS_DEFAULT = 1;
  const REPAIR_POINTS_DEFAULT = 20;
  const STAKE_DEFAULT = 5;
  const GUIDE_DAYS_DEFAULT = 5;
  const FORGE_PAIRS_DEFAULT = 4;

  const innEstCost = $derived(aliveCount * NIGHTS_DEFAULT * innRate);
  const repairEstCost = $derived(Math.ceil(REPAIR_POINTS_DEFAULT * REPAIR_DOLLARS_PER_POINT));
  const brothelCost = $derived(adultMales * BROTHEL_DOLLARS_PER_MAN);
  const guideEstCost = $derived(GUIDE_DAYS_DEFAULT * GUIDE_DOLLARS_PER_DAY);
  const stakeEstCost = $derived(STAKE_DEFAULT);
  const forgeEstCost = $derived(Math.ceil(FORGE_PAIRS_DEFAULT * FORGE_OX_SHOES_DOLLARS_PER_PAIR));
  const bathCost = $derived(aliveCount * BATH_HOUSE_DOLLARS_PER_PERSON);

  const wagonNeedsRepair = $derived(gameState.wagon.condition < 100);

  // Pending action modal — set by card click, cleared by modal's onclose.
  let pendingAction = $state<TownActionKind | null>(null);

  const flavor = $derived(landmark.blurb ?? 'You enter the post.');
  const guideActive = $derived(((gameState.flags._guideUntilDay as number | undefined) ?? 0) > gameState.day);
  // Mirror LandmarkStage's abandoned-tinting on the hero art (#173). The
  // post can be shuttered (Fort Hall 1856+) or a fled native camp.
  const abandoned = $derived(isLandmarkAbandoned(landmark, gameState.date.year));

  // Native camp tribe-hostility gate (#202). When the affiliated tribe
  // is hostile, the camp is empty (band fled / war is on) — replace
  // services with a "camp avoided" flavor and disable trade.
  const tribeAttitude = $derived(
    landmark.tribeId ? getTribeAttitude(gameState, landmark.tribeId) : 100
  );
  const campAvoided = $derived(
    landmark.postKind === 'native' && isNativeCampHostile(landmark, tribeAttitude)
  );
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

  <!-- Hero artwork (#173). Same per-landmark SVG used by LandmarkStage,
       hoisted here so trading-post visits get the bespoke painting too.
       Falls back gracefully when the post has no registered art yet. -->
  {#if hasLandmarkArt(landmark.id)}
    <div class="art-canvas">
      <LandmarkArt id={landmark.id} {abandoned} />
    </div>
  {/if}

  <!-- Service grid -->
  <div class="services">
    {#if campAvoided}
      <p class="empty">
        The lodge poles are bare and the fire pits cold — the band has fled. War is on. Best to ride past without lingering.
      </p>
    {:else}
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
      <button type="button" class="svc-card" disabled={!wagonNeedsRepair || gameState.cash < repairEstCost}
              onclick={() => (pendingAction = 'repair')}>
        <span class="svc-icon">{ICON.town_services.blacksmith}</span>
        <div class="svc-body">
          <span class="svc-label">Hire the blacksmith</span>
          <span class="svc-sub">~${repairEstCost} for {REPAIR_POINTS_DEFAULT} condition · adjust on the next screen</span>
        </div>
      </button>
      <button type="button" class="svc-card" disabled={gameState.cash < forgeEstCost}
              onclick={() => (pendingAction = 'forge')}>
        <span class="svc-icon">⚒️</span>
        <div class="svc-body">
          <span class="svc-label">Forge ox shoes</span>
          <span class="svc-sub">${forgeEstCost} for {FORGE_PAIRS_DEFAULT} pairs · adjust on the next screen</span>
        </div>
      </button>
    {/if}

    {#if services.includes('inn')}
      <button type="button" class="svc-card" disabled={gameState.cash < innEstCost || aliveCount === 0}
              onclick={() => (pendingAction = 'inn')}>
        <span class="svc-icon">{ICON.town_services.inn}</span>
        <div class="svc-body">
          <span class="svc-label">Stay at the inn</span>
          <span class="svc-sub">${innRate}/person/night · {aliveCount} {aliveCount === 1 ? 'person' : 'people'} · adjust nights on the next screen</span>
        </div>
      </button>
    {/if}

    {#if services.includes('bath_house')}
      <!-- #270 — Flat-rate service like gossip/newspaper, direct form submit. -->
      <form method="POST" action="?/townBathHouse&slot={qp}" use:enhance={() => () => {}} class="svc-form">
        <button type="submit" class="svc-card" disabled={gameState.cash < bathCost || aliveCount === 0}>
          <span class="svc-icon">{ICON.town_services.bath_house}</span>
          <div class="svc-body">
            <span class="svc-label">Soak at the bath-house</span>
            <span class="svc-sub">${BATH_HOUSE_DOLLARS_PER_PERSON}/person · {aliveCount} {aliveCount === 1 ? 'person' : 'people'} · cleanliness +50, morale +4</span>
          </div>
        </button>
      </form>
    {/if}

    {#if services.includes('guide')}
      <button type="button" class="svc-card" disabled={gameState.cash < guideEstCost}
              onclick={() => (pendingAction = 'guide')}>
        <span class="svc-icon">{ICON.town_services.guide}</span>
        <div class="svc-body">
          <span class="svc-label">Hire a guide</span>
          <span class="svc-sub">${GUIDE_DOLLARS_PER_DAY}/day · +15% travel speed · adjust days on the next screen</span>
        </div>
      </button>
    {/if}

    {#if services.includes('gambling')}
      <button type="button" class="svc-card" disabled={gameState.cash < stakeEstCost}
              onclick={() => (pendingAction = 'gamble')}>
        <span class="svc-icon">{ICON.town_services.gambling}</span>
        <div class="svc-body">
          <span class="svc-label">Try your luck at cards</span>
          <span class="svc-sub">~45% double, 55% lose · adjust stake on the next screen</span>
        </div>
      </button>
    {/if}

    {#if services.includes('brothel')}
      <button type="button" class="svc-card" disabled={adultMales === 0 || gameState.cash < brothelCost}
              onclick={() => (pendingAction = 'brothel')}>
        <span class="svc-icon">{ICON.town_services.brothel}</span>
        <div class="svc-body">
          <span class="svc-label">Visit the cribs out back</span>
          <span class="svc-sub">${brothelCost} ({adultMales} men × ${BROTHEL_DOLLARS_PER_MAN}) · party morale up · 8% pox risk per man</span>
        </div>
      </button>
    {/if}

    <!-- #176 Wagon-train sign-up. Visible at every trading post when
         the party is solo. Joining bumps morale, halves smithy if a
         train smith is on hand, and clamps pace to moderate. -->
    {#if landmark.kind === 'trading_post' && !gameState.wagonTrain}
      <form method="POST" action="?/townJoinTrain&slot={qp}" use:enhance={() => () => {}} class="svc-form">
        <button type="submit" class="svc-card">
          <span class="svc-icon">🛞</span>
          <div class="svc-body">
            <span class="svc-label">Join a wagon train</span>
            <span class="svc-sub">5–12 companion wagons · +1 morale/day · half-price smithy if any member is a blacksmith · pace clamped to moderate</span>
          </div>
        </button>
      </form>
    {/if}

    <!-- #176 In-train info + leave option. Shown at every landmark
         when the party is currently traveling with a train. -->
    {#if gameState.wagonTrain}
      <div class="svc-card train-info">
        <span class="svc-icon">🛞</span>
        <div class="svc-body">
          <span class="svc-label">{gameState.wagonTrain.name}</span>
          <span class="svc-sub">
            {gameState.wagonTrain.companions.length} wagons · joined day {gameState.wagonTrain.joinedDay}
            {#if gameState.wagonTrain.companions.some((c) => c.leaderProfession === 'blacksmith')}
              · blacksmith on hand
            {/if}
            {#if gameState.wagonTrain.companions.some((c) => c.leaderProfession === 'doctor')}
              · doctor on hand
            {/if}
          </span>
          <ul class="train-roster">
            {#each gameState.wagonTrain.companions.slice(0, 6) as c}
              <li>
                <span class="train-roster-line">
                  {c.name} — {c.leaderProfession.replace(/_/g, ' ')}, {c.oxen.filter((o) => o.health > 0).length} oxen, {c.party.filter((p) => !p.dead).length} {c.party.filter((p) => !p.dead).length === 1 ? 'person' : 'people'}{c.hasChildren ? ' (with children)' : ''}
                </span>
                {#if c.outcome === 'in-progress' && (gameState.inventory.flour ?? 0) >= 20}
                  <form method="POST" action="?/townGiveToCompanion&slot={qp}" use:enhance={() => () => {}} class="train-give-form">
                    <input type="hidden" name="wagonId" value={c.id} />
                    <input type="hidden" name="item" value="flour" />
                    <input type="hidden" name="qty" value="20" />
                    <button type="submit" class="train-give-btn" title="Give 20 lb flour as a gift">Give 20 lb flour</button>
                  </form>
                {/if}
              </li>
            {/each}
            {#if gameState.wagonTrain.companions.length > 6}
              <li>… and {gameState.wagonTrain.companions.length - 6} more</li>
            {/if}
          </ul>
        </div>
      </div>
      <form method="POST" action="?/townLeaveTrain&slot={qp}" use:enhance={() => () => {}} class="svc-form">
        <button type="submit" class="svc-card svc-card-danger">
          <span class="svc-icon">↗</span>
          <div class="svc-body">
            <span class="svc-label">Split off from the train</span>
            <span class="svc-sub">Continue alone — pace unclamps, services end, morale bonus drops.</span>
          </div>
        </button>
      </form>
    {/if}

    {#if landmark.kind !== 'trading_post' && services.length === 0 && !gameState.wagonTrain}
      <p class="empty">There's nothing to do here right now.</p>
    {/if}
    {/if}
  </div>

  <div class="footer">
    <button type="button" class="leave" onclick={onleave}>Leave town</button>
  </div>
</div>

{#if pendingAction}
  <TownActionModal
    kind={pendingAction}
    state={gameState}
    {landmark}
    {slot}
    onclose={() => (pendingAction = null)}
  />
{/if}

<style>
  .town-stage {
    display: flex;
    flex-direction: column;
    gap: 0.7em;
    padding: 1em 1.2em;
    border-color: var(--post-accent, var(--of-rust));
    border-width: 2px;
    background: linear-gradient(180deg, var(--of-paper-soft) 0%, var(--of-paper) 100%);
  }

  /* Hero artwork canvas (#173) — bespoke per-landmark SVG between
     header and the service grid. Aspect locked to a wide cinematic
     band that matches LandmarkStage's framing. */
  .art-canvas {
    border-radius: 3px;
    overflow: hidden;
    aspect-ratio: 16 / 5;
    border: 1px solid rgba(138, 90, 42, 0.35);
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
    color: var(--of-ink-soft);
    font-weight: 700;
    text-transform: uppercase;
  }
  .title {
    margin: 0.05em 0 0.1em;
    color: var(--post-accent, var(--of-rust));
    font-size: 1.5em;
    letter-spacing: 0.04em;
  }
  .flavor {
    margin: 0;
    color: var(--of-ink-soft);
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
    background: var(--of-paper);
    border: 1px solid rgba(138, 90, 42, 0.4);
    border-radius: 3px;
    font-size: 0.85em;
  }
  .stat-label {
    font-size: 0.65em;
    color: var(--of-ink-soft);
    letter-spacing: 0.12em;
    font-weight: 700;
  }
  .stat-val {
    color: var(--of-ink);
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
    background: var(--of-paper);
    color: var(--of-ink);
    border: 2px solid var(--of-ink-soft);
    border-radius: 3px;
    font-family: inherit;
    font-weight: 700;
    text-align: left;
    width: 100%;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s;
  }
  .svc-card:hover:not(:disabled) {
    background: var(--of-paper-soft);
    border-color: var(--post-accent, var(--of-rust));
  }
  .svc-card:disabled { opacity: 0.55; cursor: not-allowed; }
  .svc-card.primary {
    border-color: var(--post-accent, var(--of-rust));
    background: var(--of-paper-soft);
  }
  /* #176 — leave-train confirmation: muted red border so it doesn't
     visually outweigh the join-train action above. */
  .svc-card-danger {
    border-color: var(--of-rust);
    opacity: 0.85;
  }
  .train-info {
    cursor: default;
    flex-direction: row;
    align-items: flex-start;
  }
  .train-info:hover { background: var(--of-paper); border-color: var(--of-ink-soft); }
  .train-roster {
    list-style: none;
    padding: 0.3em 0 0;
    margin: 0.3em 0 0;
    font-weight: 400;
    font-size: 0.85em;
    color: var(--of-ink);
    line-height: 1.4;
  }
  .train-roster li {
    margin: 0.1em 0;
    display: flex;
    align-items: center;
    gap: 0.6em;
    flex-wrap: wrap;
  }
  .train-roster-line { flex: 1 1 auto; }
  .train-give-form { margin: 0; padding: 0; }
  .train-give-btn {
    background: var(--of-paper);
    color: var(--of-ink);
    border: 1px solid var(--of-ink-soft);
    border-radius: 3px;
    font-family: inherit;
    font-size: 0.85em;
    padding: 0.2em 0.6em;
    cursor: pointer;
  }
  .train-give-btn:hover {
    background: var(--of-paper-soft);
    border-color: var(--of-rust);
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
    color: var(--of-ink-soft);
    letter-spacing: normal;
    line-height: 1.3;
  }

  .empty {
    color: var(--of-ink-soft);
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
    background: var(--of-paper);
    border: 2px solid var(--of-ink-soft);
    color: var(--of-ink);
    padding: 0.5em 1.2em;
    border-radius: 3px;
    font-family: inherit;
    font-weight: 700;
    cursor: pointer;
  }
  .leave:hover { border-color: var(--of-rust); }
</style>
