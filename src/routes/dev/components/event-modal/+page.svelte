<script lang="ts">
  // Visual-diff harness for EventModal. Uses a real event from the
  // catalog (weather_storm) so the title / body / choice list are the
  // same text the player would see. State is mocked; the modal only
  // reads gameState.inventory for the choice gate, and we don't trip
  // any gate here.
  import EventModal from '$lib/ui/EventModal.svelte';
  import type { GameState } from '$lib/game/types';

  const gameState = {
    inventory: { flour: 60, beans: 20, gunpowder: 40, lead_balls: 40, percussion_caps: 40 }
  } as unknown as GameState;
</script>

<svelte:head><title>EventModal Showcase — dev</title></svelte:head>

<div class="page">
  <h1 class="brand-title">EventModal Showcase</h1>
  <p class="subtitle">
    Reference: <code>docs/handoff/components/src/event-modal.html</code>.
    Real event from the catalog so the choice text matches a live game.
  </p>
</div>

<EventModal eventId="weather_storm" slot="dev" {gameState} />

<style>
  .page {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--s-6) var(--s-4);
  }
  .brand-title {
    font-family: var(--f-display);
    font-size: var(--fs-3xl);
    color: var(--of-rust);
    letter-spacing: var(--ls-medium);
    margin: 0 0 var(--s-2) 0;
  }
  .subtitle {
    color: var(--of-ink);
    font-family: var(--f-body);
    margin: 0 0 var(--s-4) 0;
  }
  code { background: var(--of-paper); padding: 0 .25em; border-radius: 2px; }
</style>
