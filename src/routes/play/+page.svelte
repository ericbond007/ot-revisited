<script lang="ts">
  import TrailMap from '$lib/ui/TrailMap.svelte';
  import PartyPanel from '$lib/ui/PartyPanel.svelte';
  import InventoryPanel from '$lib/ui/InventoryPanel.svelte';
  import EventLog from '$lib/ui/EventLog.svelte';
  import ActionBar from '$lib/ui/ActionBar.svelte';
  import EndScreen from '$lib/ui/EndScreen.svelte';
  import EventModal from '$lib/ui/EventModal.svelte';

  let { data, form } = $props();
  const state = $derived(form?.state ?? data.state);
  const pendingEventId = $derived(state.flags._pendingEventId as string | undefined);
</script>

<div style="display: grid; grid-template-columns: 1fr 240px; grid-template-rows: auto auto auto auto; gap: 0.8em; padding: 0.8em; min-height: calc(100vh - 60px);">
  <!-- Header -->
  <div class="panel" style="grid-column: 1 / 3; display: flex; justify-content: space-between; align-items: center;">
    <h2 style="margin: 0;">{state.party[0].name}'s Journey</h2>
    <div style="color: var(--c-wood);">
      Day {state.day} · {state.date.year}-{String(state.date.month).padStart(2, '0')}-{String(state.date.day).padStart(2, '0')} · {state.pace} · {state.rations}
    </div>
  </div>

  <!-- Map -->
  <div style="grid-column: 1; grid-row: 2;">
    <TrailMap {state} />
  </div>

  <!-- Right rail -->
  <div style="grid-column: 2; grid-row: 2 / 4; display: flex; flex-direction: column; gap: 0.8em;">
    <PartyPanel {state} />
    <InventoryPanel {state} />
  </div>

  <!-- Actions / End screen -->
  <div style="grid-column: 1; grid-row: 3;">
    {#if state.completed}
      <EndScreen {state} />
    {:else}
      <ActionBar slot={data.slot} />
    {/if}
  </div>

  <!-- Event log (full width bottom) -->
  <div style="grid-column: 1 / 3; grid-row: 4;">
    <EventLog {state} />
  </div>
</div>

{#if pendingEventId}
  <EventModal eventId={pendingEventId} slot={data.slot} />
{/if}
