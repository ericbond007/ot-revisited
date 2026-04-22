<script lang="ts">
  import type { Landmark } from '$lib/game/content/landmarks';

  let { landmark }: { landmark: Landmark } = $props();

  const icon = $derived(
    landmark.kind === 'trading_post' ? '🏛️'
    : landmark.kind === 'river'       ? '🌊'
    : landmark.kind === 'end'         ? '🏁'
    : '📍'
  );

  const prompt = $derived(
    landmark.kind === 'trading_post' ? 'Trade supplies, rest, hunt — or continue when ready.'
    : landmark.kind === 'river'       ? 'The river blocks your path. Ford, caulk & float, hire a ferry, or wait it out.'
    : landmark.kind === 'end'         ? 'The end of the trail.'
    : 'You have arrived.'
  );
</script>

<div class="chip chip-{landmark.kind}">
  <div class="icon">{icon}</div>
  <div class="body">
    <div class="kind-label">
      {landmark.kind === 'trading_post' ? 'TRADING POST'
       : landmark.kind === 'river'       ? 'RIVER CROSSING'
       : landmark.kind === 'end'         ? 'JOURNEY\'S END'
       : 'STOPPED AT'}
    </div>
    <div class="name">{landmark.name}</div>
    <div class="prompt">{prompt}</div>
  </div>
</div>

<style>
  .chip {
    display: flex;
    align-items: center;
    gap: 0.9em;
    padding: 0.9em 1.1em;
    border-radius: 4px;
    border: 3px solid;
    margin-bottom: 0.8em;
  }

  .icon {
    font-size: 2.2em;
    line-height: 1;
    flex-shrink: 0;
  }

  .body { flex: 1; min-width: 0; }

  .kind-label {
    font-size: 0.7em;
    font-weight: 700;
    letter-spacing: 0.2em;
    opacity: 0.75;
  }

  .name {
    font-size: 1.3em;
    font-weight: 700;
    letter-spacing: 0.04em;
    margin: 0.1em 0 0.3em 0;
  }

  .prompt {
    font-size: 0.9em;
    line-height: 1.4;
    font-style: italic;
  }

  /* Trading post: warm parchment / rust — welcoming */
  .chip-trading_post {
    background: var(--c-parchment);
    color: var(--c-ink);
    border-color: var(--c-rust);
  }
  .chip-trading_post .kind-label { color: var(--c-rust-dark); }
  .chip-trading_post .name { color: var(--c-rust-dark); }

  /* River: cool, insistent — a problem to solve */
  .chip-river {
    background: #1a2a3a;
    color: #c8dae8;
    border-color: #4a8bc9;
  }
  .chip-river .kind-label { color: #4a8bc9; }
  .chip-river .name { color: #c8dae8; }

  /* End: gold, celebratory */
  .chip-end {
    background: #3a2a10;
    color: #f5c96a;
    border-color: #f5c96a;
  }
  .chip-end .kind-label { color: #e8c89a; }
  .chip-end .name { color: #f5c96a; }
</style>
