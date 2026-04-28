<script lang="ts">
  import type { ProfessionId } from '$lib/game/types';
  import Tooltip from './Tooltip.svelte';
  import { ICON } from '$lib/data/icon-dictionary';
  import ProfessionIcon, { hasProfessionIcon } from './profession-icons/ProfessionIcon.svelte';

  interface Profession {
    id: string;
    name: string;
    bonusSummary: string;
    femaleOnly: boolean;
  }

  let {
    name,
    value = $bindable(),
    professions
  }: {
    name: string;
    value: string;
    professions: Profession[];
  } = $props();

  const ICONS = ICON.professions;
</script>

<!-- Hidden native input keeps FormData submission working without changes to the server action -->
<input type="hidden" {name} {value} />

<div class="grid">
  {#each professions as p}
    {@const selected = value === p.id}
    <Tooltip
      title={p.name}
      subtitle={p.femaleOnly ? 'PROFESSION · FEMALE-ONLY' : 'PROFESSION'}
      description={p.bonusSummary}
    >
      {#snippet children()}
        <button
          type="button"
          class="card"
          class:selected
          onclick={() => (value = p.id as ProfessionId)}
        >
          {#if hasProfessionIcon(p.id)}
            <ProfessionIcon id={p.id} size={32} title={p.name} className="icon-svg" />
          {:else}
            <span class="icon">{ICONS[p.id as keyof typeof ICONS] ?? '•'}</span>
          {/if}
          <span class="label">
            {p.name}
            {#if p.femaleOnly}<span class="fem">♀</span>{/if}
          </span>
        </button>
      {/snippet}
    </Tooltip>
  {/each}
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    gap: 0.3em;
  }

  .card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.2em;
    padding: 0.5em 0.3em;
    background: var(--c-bg-raised);
    color: var(--c-tan);
    border: 2px solid var(--c-wood);
    border-radius: 3px;
    cursor: pointer;
    font-family: inherit;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: none;
    font-size: 0.78em;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
    min-height: 3.2em;
    /* Let the card fill the tooltip trigger span so hover area matches the card. */
    width: 100%;
  }
  .card:hover:not(:disabled):not(.selected) {
    background: var(--c-panel);
    border-color: var(--c-rust);
  }
  .card.selected {
    background: var(--c-rust);
    color: var(--c-tan-bright);
    border-color: var(--c-ink);
  }

  .icon {
    font-size: 1.4em;
    line-height: 1;
  }
  .label {
    font-size: 0.82em;
    text-align: center;
    line-height: 1.1;
  }
  .fem {
    color: var(--c-rust);
    font-size: 0.9em;
    margin-left: 0.2em;
  }
  .card.selected .fem {
    color: var(--c-tan-bright);
  }

  /* The Tooltip wrapper spans inline by default — make it a grid item so the
     card fills its cell in the picker grid. */
  .grid > :global(.tt-wrap) {
    display: block;
  }
</style>
