<script lang="ts">
  import TrailMap from '$lib/ui/TrailMap.svelte';
  import PartyPanel from '$lib/ui/PartyPanel.svelte';
  import InventoryPanel from '$lib/ui/InventoryPanel.svelte';
  import EventLog from '$lib/ui/EventLog.svelte';
  import ActionBar from '$lib/ui/ActionBar.svelte';
  import EndScreen from '$lib/ui/EndScreen.svelte';
  import EventModal from '$lib/ui/EventModal.svelte';
  import HuntModal from '$lib/ui/HuntModal.svelte';
  import FordModal from '$lib/ui/FordModal.svelte';
  import TradeModal from '$lib/ui/TradeModal.svelte';

  let { data, form } = $props();
  const gs = $derived(form?.state ?? data.state);
  const pendingEventId = $derived((gs.flags._pendingEventId as string | undefined));

  let showHunt = $state(false);
  let showFord = $state(false);
  let showTrade = $state(false);
</script>

<div class="play-wrap">
  <!-- Header -->
  <header class="panel top-bar">
    <h2 style="margin: 0;">{gs.party[0].name}'s Journey</h2>
    <div style="color: var(--c-wood);">
      Day {gs.day} · {gs.date.year}-{String(gs.date.month).padStart(2, '0')}-{String(gs.date.day).padStart(2, '0')} · {gs.pace} · {gs.rations}
    </div>
  </header>

  <div class="main-row">
    <!-- Left: map + actions stacked -->
    <div class="left-col">
      <TrailMap state={gs} />

      <div class="actions-row">
        {#if gs.completed}
          <EndScreen state={gs} />
        {:else}
          <ActionBar state={gs} slot={data.slot}
            onhunt={() => (showHunt = true)}
            onford={() => (showFord = true)}
            ontrade={() => (showTrade = true)}
          />
        {/if}
      </div>
    </div>

    <!-- Right rail: party, inventory, log — each with internal scroll -->
    <div class="side-rail">
      <PartyPanel state={gs} />
      <InventoryPanel state={gs} />
      <EventLog state={gs} />
    </div>
  </div>
</div>

{#if pendingEventId}
  <EventModal eventId={pendingEventId} slot={data.slot} />
{/if}

{#if showHunt && !gs.completed}
  <HuntModal state={gs} slot={data.slot} onclose={() => (showHunt = false)} />
{/if}

{#if showFord && !gs.completed}
  <FordModal slot={data.slot} onclose={() => (showFord = false)} />
{/if}

{#if showTrade && !gs.completed}
  <TradeModal state={gs} slot={data.slot} onclose={() => (showTrade = false)} />
{/if}

<style>
  .play-wrap { display: flex; flex-direction: column; gap: 0.8em; padding: 0.8em; min-height: calc(100vh - 60px); }
  .top-bar { display: flex; justify-content: space-between; align-items: center; }
  .main-row { display: grid; grid-template-columns: 1fr 280px; gap: 0.8em; }
  .left-col { display: flex; flex-direction: column; gap: 0.8em; min-width: 0; }
  .side-rail { display: flex; flex-direction: column; gap: 0.8em; min-width: 0; }

  @media (max-width: 900px) {
    .main-row { grid-template-columns: 1fr; }
  }
</style>
