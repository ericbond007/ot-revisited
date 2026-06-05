<script lang="ts">
  import type { EventCategory } from '$lib/game/content/events';
  import { EVENTS } from '$lib/game/content/events';
  import { LANDMARK_ARRIVAL_EVENTS } from '$lib/game/content/landmark-arrival-events';
  import type { GameState } from '$lib/game/types';
  import { enhance } from '$app/forms';
  import { ICON } from '$lib/data/icon-dictionary';
  import { dialogA11y } from '$lib/ui/actions/dialog-a11y';

  let { eventId, slot, gameState, body: bodyOverride }: {
    eventId: string;
    slot: string;
    gameState: GameState;
    body?: string;
  } = $props();
  // Look in both trail-event and landmark-arrival registries — same modal,
  // same flow, regardless of which kind of event paused the tick.
  const event = $derived(
    EVENTS.find((e) => e.id === eventId)
      ?? Object.values(LANDMARK_ARRIVAL_EVENTS).find((e) => e.id === eventId)
  );
  const qp = $derived(encodeURIComponent(slot));
  // Engine-resolved body variant takes precedence over the inline body string
  // when an event has bodyKey + a registered pool.
  const bodyText = $derived(bodyOverride ?? event?.body ?? '');

  // Resolve a choice's required-item gate against the current inventory.
  // Returns {disabled, reason, icon} so the render loop can show the lock
  // state inline without re-running the lookup.
  function requireStatus(req: { itemId: string; icon?: string; reason?: string } | undefined): {
    disabled: boolean;
    reason?: string;
    icon?: string;
  } {
    if (!req) return { disabled: false };
    const owned = gameState.inventory[req.itemId] ?? 0;
    if (owned > 0) return { disabled: false, icon: req.icon };
    return { disabled: true, reason: req.reason, icon: req.icon };
  }

  // Category-based flavor
  const categoryIcon = ICON.event_categories;

  const categoryLabel: Record<EventCategory, string> = {
    weather:    'WEATHER',
    health:     'HEALTH',
    wagon:      'WAGON / LIVESTOCK',
    encounter:  'ENCOUNTER',
    native:     'NATIVE AMERICAN',
    bandit:     'BANDITS',
    finds:      'FINDS',
    historical: 'HISTORICAL',
    personal:   'PERSONAL'
  };

  let submitting = $state(false);
</script>

{#if event}
  <div class="modal-backdrop">
    <div class="panel event-card" role="dialog" use:dialogA11y={{}}>
      <!-- Header: category label + title -->
      <div class="event-header">
        <div class="cat-chip">
          <span class="cat-icon">{categoryIcon[event.category]}</span>
          <span class="cat-label">{categoryLabel[event.category]}</span>
        </div>
        <h2 class="event-title">{event.title}</h2>
      </div>

      <p class="event-body">{bodyText}</p>

      <div class="choice-label">WHAT DO YOU DO?</div>

      <div class="choices">
        {#each event.choices.filter((c) => !c.hidden?.(gameState)) as c, i}
          {@const req = requireStatus(c.requires)}
          <form
            method="POST"
            action="?/resolveEvent&slot={qp}"
            use:enhance={() => {
              submitting = true;
              return async ({ update }) => { await update(); };
            }}
          >
            <input type="hidden" name="eventId" value={event.id} />
            <input type="hidden" name="choiceId" value={c.id} />
            <button
              type="submit"
              class="choice-card"
              class:default={c.isDefault}
              class:locked={req.disabled}
              disabled={submitting || req.disabled}
              title={req.disabled ? req.reason : ''}
              style="animation-delay: {40 + i * 60}ms;"
            >
              {#if req.icon || c.icon}
                <!-- Item-gate icon wins when present; falls back to the
                     choice's thematic action glyph (#133). -->
                <span class="choice-icon" aria-hidden="true">{req.icon ?? c.icon}</span>
              {/if}
              <span class="choice-label-text">{c.label}</span>
              {#if req.disabled && req.reason}
                <span class="choice-reason">{req.reason}</span>
              {/if}
            </button>
          </form>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(42, 29, 12, 0.80);
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

  .event-card {
    max-width: 640px;
    width: 100%;
    padding: 1.5em 1.5em 1.3em;
    border: 3px solid var(--of-rust);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.7);
    animation: card-slide 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.1);
  }
  @keyframes card-slide {
    from { opacity: 0; transform: translateY(20px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .event-header {
    margin-bottom: 0.8em;
  }
  .cat-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.4em;
    background: var(--of-paper);
    border: 1px solid var(--of-rule);
    padding: 0.2em 0.7em;
    border-radius: 20px;
    font-size: 0.75em;
    letter-spacing: 0.12em;
    color: var(--of-ink-soft);
    font-weight: 700;
    margin-bottom: 0.4em;
  }
  .cat-icon { font-size: 1.1em; line-height: 1; }

  .event-title {
    color: var(--of-rust);
    margin: 0;
    font-family: var(--f-display);
    font-size: 24px;
    line-height: 1.2;
    letter-spacing: 0.04em;
  }

  .event-body {
    font-family: var(--f-body);
    line-height: 1.55;
    margin: 12px 0 16px 0;
    color: var(--of-ink);
    font-size: 1.02em;
  }

  .choice-label {
    font-size: 0.72em;
    letter-spacing: 0.15em;
    color: var(--of-ink-soft);
    font-weight: 700;
    margin-bottom: 0.5em;
  }

  .choices {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }

  .choice-card {
    /* Override default button chrome */
    display: flex;
    align-items: center;
    gap: 0.8em;
    width: 100%;
    padding: 0.8em 1em;
    background: var(--of-paper);
    color: var(--of-ink);
    border: 2px solid var(--of-ink-soft);
    border-radius: 3px;
    cursor: pointer;
    font-family: inherit;
    font-weight: 700;
    text-transform: none;
    letter-spacing: 0.02em;
    font-size: 1em;
    text-align: left;
    transition: background 0.12s, border-color 0.12s, transform 0.1s;
    animation: choice-in 0.3s ease-out backwards;
  }
  @keyframes choice-in {
    from { opacity: 0; transform: translateX(-12px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .choice-card:hover:not(:disabled) {
    border-color: var(--of-rust);
    background: var(--of-paper-soft);
    transform: translateX(3px);
  }
  .choice-card:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .choice-icon {
    font-size: 1.2em;
    line-height: 1;
  }
  .choice-label-text {
    flex: 1;
  }
  .choice-reason {
    font-size: 0.78em;
    font-weight: 400;
    font-style: italic;
    color: #e85a4a;
    letter-spacing: 0.02em;
  }
  .choice-card.locked .choice-icon {
    filter: grayscale(1);
    opacity: 0.6;
  }

  .choice-card.default {
    border-color: var(--of-rust);
  }
</style>
