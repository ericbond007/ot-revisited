<script lang="ts">
  import type { GameState } from '$lib/game/types';
  let { state }: { state: GameState } = $props();

  const summary = $derived((() => {
    if (state.outcome === 'arrived') return `You arrived in Oregon City after ${state.day} days. ${state.party.filter((m) => !m.dead).length} survivors.`;
    if (state.outcome === 'wiped') return `The whole party perished on day ${state.day}.`;
    if (state.outcome === 'stranded') return `Stranded on the trail on day ${state.day}.`;
    return 'Journey ended.';
  })());
</script>

<div class="panel" style="border-color: var(--c-rust); padding: 1.5em;">
  <h2 style="color: var(--c-rust);">Journey's End</h2>
  <p>{summary}</p>
  <ul style="font-size: 0.9em;">
    {#each state.party as m}
      <li>{m.name} ({m.profession}) — {m.dead ? `✝ died day ${m.deathDay}, ${m.deathCause}` : `survived, HP ${m.health}`}</li>
    {/each}
  </ul>
  <p style="margin-top: 1em;"><a href="/">← Home</a></p>
</div>
