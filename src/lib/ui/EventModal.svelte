<script lang="ts">
  import type { GameEvent } from '$lib/game/content/events';
  import { EVENTS } from '$lib/game/content/events';

  let { eventId, slot }: { eventId: string; slot: string } = $props();
  const event = $derived(EVENTS.find((e) => e.id === eventId));
  const qp = $derived(encodeURIComponent(slot));
</script>

{#if event}
  <div style="
    position: fixed; inset: 0; background: rgba(26, 15, 8, 0.85);
    display: flex; align-items: center; justify-content: center;
    z-index: 100; padding: 1em;
  ">
    <div class="panel" style="max-width: 600px; width: 100%; padding: 1.5em; border-color: var(--c-rust);">
      <h2 style="color: var(--c-rust);">{event.title}</h2>
      <p style="line-height: 1.5;">{event.body}</p>

      <div style="display: flex; flex-direction: column; gap: 0.5em; margin-top: 1.5em;">
        {#each event.choices as c}
          <form method="POST" action="?/resolveEvent&slot={qp}">
            <input type="hidden" name="eventId" value={event.id} />
            <input type="hidden" name="choiceId" value={c.id} />
            <button type="submit" style="width: 100%; text-align: left; padding: 0.8em 1em;">
              {c.label}
            </button>
          </form>
        {/each}
      </div>
    </div>
  </div>
{/if}
