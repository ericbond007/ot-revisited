<script lang="ts">
  let { data, form } = $props();
  const state = $derived(form?.state ?? data.state);
</script>

<div class="container">
  <h1>{state.party[0].name}'s Journey</h1>
  <p>Day {state.day} · {state.date.year}-{state.date.month}-{state.date.day} · {state.location.milesTraveled} mi</p>
  <p>Next stop: {state.location.nextLandmarkId}</p>
  <p>Morale {state.morale} · Cash ${state.cash}</p>
  <p>Pace: {state.pace} · Rations: {state.rations}</p>

  {#if state.completed}
    <p><strong>Journey ended: {state.outcome}</strong></p>
  {:else}
    <form method="POST" action="?/travel&slot={encodeURIComponent(data.slot)}">
      <input type="hidden" name="days" value="1" />
      <button type="submit">Travel 1 Day</button>
    </form>
  {/if}

  <p style="margin-top: 2em;"><a href="/">← Home</a></p>
</div>
