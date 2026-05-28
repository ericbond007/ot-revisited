<script lang="ts">
  import { ITEMS } from '$lib/game/content/items';
  import Tooltip from './Tooltip.svelte';

  let {
    id,
    children: triggerContent
  }: {
    id: string;
    children: import('svelte').Snippet;
  } = $props();

  const item = $derived(ITEMS[id]);
</script>

{#if item}
  <Tooltip
    title={item.name}
    subtitle={item.category.replace(/_/g, ' ')}
    description={item.description}
    meta={item.weightLbPerUnit > 0 ? `${item.weightLbPerUnit} lb each` : undefined}
  >
    {#snippet children()}
      <span class="trigger">{@render triggerContent()}</span>
    {/snippet}
  </Tooltip>
{:else}
  <span class="trigger">{@render triggerContent()}</span>
{/if}

<style>
  /* Match the old ItemTooltip trigger style (dotted underline) so existing
     consumers render identically. */
  .trigger {
    border-bottom: 1px dotted var(--of-rust);
  }
</style>
