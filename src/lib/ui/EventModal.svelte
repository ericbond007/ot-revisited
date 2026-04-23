<script lang="ts">
  import type { EventCategory } from '$lib/game/content/events';
  import { EVENTS } from '$lib/game/content/events';
  import { enhance } from '$app/forms';

  let { eventId, slot, body: bodyOverride }: { eventId: string; slot: string; body?: string } = $props();
  const event = $derived(EVENTS.find((e) => e.id === eventId));
  const qp = $derived(encodeURIComponent(slot));
  // Engine-resolved body variant takes precedence over the inline body string
  // when an event has bodyKey + a registered pool.
  const bodyText = $derived(bodyOverride ?? event?.body ?? '');

  // Category-based flavor
  const categoryIcon: Record<EventCategory, string> = {
    weather:    '🌩️',
    health:     '🏥',
    wagon:      '🛠️',
    encounter:  '👋',
    native:     '🪶',
    bandit:     '🔫',
    finds:      '🎯',
    historical: '📜',
    personal:   '💭'
  };

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
    <div class="panel event-card">
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
        {#each event.choices as c, i}
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
              disabled={submitting}
              style="animation-delay: {40 + i * 60}ms;"
            >
              <span class="choice-label-text">{c.label}</span>
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

  .event-card {
    max-width: 640px;
    width: 100%;
    padding: 1.5em 1.5em 1.3em;
    border: 3px solid var(--c-rust);
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
    background: var(--c-bg-raised);
    border: 1px solid var(--c-border);
    padding: 0.2em 0.7em;
    border-radius: 20px;
    font-size: 0.75em;
    letter-spacing: 0.12em;
    color: var(--c-wood);
    font-weight: 700;
    margin-bottom: 0.4em;
  }
  .cat-icon { font-size: 1.1em; line-height: 1; }

  .event-title {
    color: var(--c-rust);
    margin: 0;
    font-size: 1.5em;
    line-height: 1.2;
  }

  .event-body {
    line-height: 1.55;
    margin: 0 0 1.2em 0;
    color: var(--c-tan);
    font-size: 1.02em;
  }

  .choice-label {
    font-size: 0.72em;
    letter-spacing: 0.15em;
    color: var(--c-wood);
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
    background: var(--c-bg-raised);
    color: var(--c-tan);
    border: 2px solid var(--c-wood);
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
    border-color: var(--c-rust);
    background: var(--c-panel);
    transform: translateX(3px);
  }
  .choice-card:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .choice-label-text {
    flex: 1;
  }

  .choice-card.default {
    border-color: var(--c-rust);
  }
</style>
