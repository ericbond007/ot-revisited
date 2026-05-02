<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { getLandmark, isLandmarkAbandoned, LANDMARKS } from '$lib/game/content/landmarks';
  import { enhance } from '$app/forms';
  import NumberStepper from './NumberStepper.svelte';
  import {
    accumulateMiles,
    currentLeg,
    milesToNext,
    milesToNextOfKind
  } from './trail-map/trail-map-helpers';
  import { isSunday } from '$lib/game/utils/calendar';
  // Action glyphs come from IconSprite (mounted in +layout.svelte). The
  // sprite's symbol ids are gi-travel / gi-rest / gi-hunt / gi-visit /
  // gi-ford. Travel paints itself in tan-bright; the others inherit
  // currentColor from the button.

  let { state: gameState, slot, onrest, onhunt, onford, onvisit }: {
    state: GameState;
    slot: string;
    onrest?: () => void;
    onhunt?: () => void;
    onford?: () => void;
    // Visit is the entry point for any landmark interaction (trading posts
    // today; future Indian trading posts / road ranches use the same hook).
    onvisit?: () => void;
  } = $props();
  const qp = $derived(encodeURIComponent(slot));

  // You can only interact with a landmark (trade, ford) when you've physically arrived.
  const atLandmark = $derived(
    gameState.location.atLandmarkId ? getLandmark(gameState.location.atLandmarkId) : null
  );
  // Any landmark kind that has a Visit hub. For now that's just trading
  // posts; later this widens to Indian trading posts, road ranches, etc.
  // Abandoned posts (Fort Hall 1857+) pass through as empty stockades —
  // no Visit button, nothing to trade.
  const atVisitable = $derived(
    atLandmark?.kind === 'trading_post'
      && !isLandmarkAbandoned(atLandmark, gameState.date.year)
  );
  const atRiver = $derived(atLandmark?.kind === 'river');
  const travelBlocked = $derived(atRiver);
  // #224 Sunday lay-by — Sabbath rest action visible only on Sundays.
  const sundayToday = $derived(isSunday(gameState.date));

  // Persist travelDays across remounts. localStorage + sync init means the
  // stepper is never blank on re-render.
  const storageKey = $derived(`ht_travel_days_${slot}`);
  function loadSavedDays(key: string): number {
    if (typeof window === 'undefined') return 1;
    const saved = window.localStorage.getItem(key);
    if (!saved) return 1;
    const n = parseInt(saved, 10);
    return Number.isFinite(n) && n >= 1 && n <= 10 ? n : 1;
  }
  // Initial load uses the initial slot value; subsequent slot changes are rare
  // (would only happen if the route param itself changed, which remounts).
  // svelte-ignore state_referenced_locally
  let travelDays = $state(loadSavedDays(`ht_travel_days_${slot}`));
  $effect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, String(travelDays));
  });

  // The "traveling" flag gates all action buttons during the wagon-slide
  // animation so the player can't double-submit while the server is
  // updating. On arrival at a landmark, though, the travel is resolved —
  // buttons (Ford, Visit, Rest, Hunt) should be immediately actionable.
  let traveling = $state(false);
  let travelTimer: ReturnType<typeof setTimeout> | null = null;
  $effect(() => {
    if (atLandmark && traveling) {
      traveling = false;
      if (travelTimer) {
        clearTimeout(travelTimer);
        travelTimer = null;
      }
    }
  });

  // Heading-west readout — moved up from the trail-map snippet so it
  // sits with the action bar where the player's eye is. Text-only
  // (no compass / glyphs); the snippet now just paints the map.
  const marked = $derived(accumulateMiles(LANDMARKS));
  const leg = $derived(currentLeg(marked, gameState.location.milesTraveled));
  const next = $derived(milesToNext(marked, gameState.location.milesTraveled));
  const nextFort = $derived(
    milesToNextOfKind(marked, gameState.location.milesTraveled, 'trading_post')
  );
  const fromTo = $derived(
    leg.last && leg.next
      ? `${leg.last.name.toUpperCase()} → ${leg.next.name.toUpperCase()}`
      : leg.last
        ? `${leg.last.name.toUpperCase()} → END`
        : 'INDEPENDENCE → KANSAS RIVER'
  );
  const milesLabel = $derived(next ? `${next.miles} mi to ${next.name}` : "TRAIL'S END");
  const postLabel = $derived(
    nextFort ? `next post: ${nextFort.name} in ${nextFort.miles} mi` : 'no post ahead'
  );
</script>

<div class="panel action-panel {atLandmark ? `panel-${atLandmark.kind}` : ''}">
  <div class="button-row">
  <form
    method="POST"
    action="?/travel&slot={qp}"
    use:enhance={() => {
      traveling = true;
      return async ({ update }) => {
        // `reset: false` keeps the user's typed travel-days in the
        // stepper. The default update() resets the form on success,
        // which snaps the number input back to its SSR default.
        await update({ reset: false });
        // Hold the "traveling" indicator for the full wagon-slide duration,
        // unless we've already arrived at a landmark — in which case the
        // atLandmark $effect above has already cleared the flag.
        if (travelTimer) clearTimeout(travelTimer);
        travelTimer = setTimeout(() => {
          traveling = false;
          travelTimer = null;
        }, 2500);
      };
    }}
    class="travel-form"
  >
    <NumberStepper name="days" bind:value={travelDays} min={1} max={10} disabled={traveling || travelBlocked} ariaLabel="Travel days" />
    <button type="submit" class="action travel" disabled={traveling || travelBlocked} title={travelBlocked ? 'Ford the river first' : (sundayToday ? 'Traveling on the Sabbath — morale will suffer' : '')}>
      <svg class="gi gi-wide-travel" viewBox="0 0 64 40" aria-hidden="true"><use href="#gi-travel" /></svg>
      <span class="action-label">
        {#if traveling}
          Traveling…
        {:else if travelBlocked}
          Ford first
        {:else if atLandmark}
          Continue {travelDays}d
        {:else}
          Travel {travelDays}d
        {/if}
      </span>
    </button>
  </form>

  <button type="button" class="action" onclick={onrest} disabled={traveling}>
    <svg class="gi" viewBox="0 0 32 32" aria-hidden="true"><use href="#gi-rest" /></svg>
    <span class="action-label">Rest</span>
  </button>

  {#if sundayToday}
    <form method="POST" action="?/sundayLayBy&slot={qp}" use:enhance class="lay-by-form">
      <button type="submit" class="action lay-by" disabled={traveling} title="Sabbath rest — religious morale, full ox recovery">
        <span class="lay-by-glyph" aria-hidden="true">🕊️</span>
        <span class="action-label">Lay by</span>
      </button>
    </form>
  {/if}

  <button type="button" class="action" onclick={onhunt} disabled={traveling}>
    <svg class="gi gi-wide-hunt" viewBox="0 0 64 32" aria-hidden="true"><use href="#gi-hunt" /></svg>
    <span class="action-label">Hunt</span>
  </button>

  <button
    type="button"
    class="action"
    class:highlight={atVisitable}
    onclick={onvisit}
    disabled={traveling || !atVisitable}
    title={atVisitable ? '' : 'Only when stopped at a trading post'}
  >
    <svg class="gi" viewBox="0 0 32 32" aria-hidden="true"><use href="#gi-visit" /></svg>
    <span class="action-label">Visit</span>
  </button>

  <button
    type="button"
    class="action"
    class:highlight={atRiver}
    onclick={onford}
    disabled={traveling || !atRiver}
    title={atRiver ? '' : 'Only when stopped at a river crossing'}
  >
    <svg class="gi gi-wide-ford" viewBox="0 0 64 40" aria-hidden="true"><use href="#gi-ford" /></svg>
    <span class="action-label">Ford</span>
  </button>
  </div>

  <div class="heading-line">
    <span class="heading-label">Heading West</span>
    <span class="heading-sep">·</span>
    <span class="heading-leg">{fromTo}</span>
    <span class="heading-sep">·</span>
    <span class="heading-sub">{milesLabel}</span>
    <span class="heading-sep">·</span>
    <span class="heading-sub">{postLabel}</span>
  </div>
</div>

<style>
  /* Action panel splits 50/50 (#212): button row on the left,
     heading-west readout on the right. The 0.5em gap matches the
     bottom row (EventLog | TrailMapSnippet) so the heading text
     left-aligns with the map below. */
  .action-panel {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5em;
    align-items: center;
    transition: border-color 0.25s;
  }
  .button-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
    align-items: stretch;
  }
  /* Heading-west readout — text-only port of the strip that used to
     sit on the trail-map snippet. */
  .heading-line {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.4em;
    color: var(--c-tan);
    font-size: 0.85em;
  }
  .heading-label {
    color: var(--c-rust);
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-size: 0.78em;
  }
  .heading-leg {
    color: var(--c-tan-bright);
    font-weight: 700;
    letter-spacing: 0.04em;
  }
  .heading-sub {
    color: var(--c-wood);
  }
  .heading-sep {
    color: var(--c-wood);
    opacity: 0.6;
  }
  .travel-form {
    display: flex;
    gap: 0.4em;
    align-items: stretch;
  }

  .action {
    /* Override default button chrome to unify icon + label layout */
    display: inline-flex;
    align-items: center;
    gap: 0.4em;
    padding: 0.4em 0.8em;
    background: var(--c-rust-dark);
    color: var(--c-tan-bright);
    border: 2px solid var(--c-ink);
    border-radius: 3px;
    font-family: inherit;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    font-size: 0.85em;
    cursor: pointer;
    transition: background 0.12s, box-shadow 0.12s;
  }
  .action:hover:not(:disabled) {
    background: var(--c-rust);
  }
  .action:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  /* Custom SVG glyph from IconSprite. The sprite's <symbol> intrinsic
     viewBox preserves aspect; we control display size via CSS so the
     icons line up next to the action label. The wider hunt/ford glyphs
     get bumped width per the prototype. */
  .gi {
    width: 1.15em;
    height: 1.15em;
    display: block;
  }
  .gi-wide-travel { width: 1.5em; }
  .gi-wide-hunt   { width: 1.6em; }
  .gi-wide-ford   { width: 1.5em; }
  .action.travel {
    /* Slightly wider label to accommodate dynamic text */
    min-width: 8em;
  }
  /* #224 Sunday lay-by — Sabbath dove glyph in cream-ink. Visible only
     on Sundays; sized to match the SVG-glyph buttons around it. */
  .action.lay-by {
    background: #2a2a32;
    border-color: var(--c-cream);
  }
  .action.lay-by:hover:not(:disabled) {
    background: #3a3540;
    border-color: var(--c-cream);
  }
  .lay-by-glyph {
    font-size: 1.4em;
    line-height: 1;
    display: block;
  }
  .lay-by-form {
    display: contents;
  }

  /* Contextual highlight on the action panel border per location */
  .panel-trading_post { border-color: var(--c-rust); }
  .panel-river { border-color: #4a8bc9; background: #1a1f28; }
  .panel-end { border-color: #f5c96a; }

  /* Highlight the contextually-relevant action button */
  .highlight:not(:disabled) {
    background: var(--c-rust);
    box-shadow: 0 0 0 2px var(--c-rust-dark), 0 0 10px rgba(201, 106, 42, 0.4);
    animation: action-pulse 1.6s ease-in-out infinite;
  }
  @keyframes action-pulse {
    0%, 100% { box-shadow: 0 0 0 2px var(--c-rust-dark), 0 0 10px rgba(201, 106, 42, 0.3); }
    50%      { box-shadow: 0 0 0 2px var(--c-rust-dark), 0 0 16px rgba(201, 106, 42, 0.7); }
  }
</style>
