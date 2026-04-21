<script lang="ts">
  let { slot }: { slot: string } = $props();
  const qp = $derived(encodeURIComponent(slot));

  let travelDays = $state(3);
  let restDays = $state(2);
</script>

<div class="panel" style="display: flex; flex-wrap: wrap; gap: 0.5em; align-items: center;">
  <form method="POST" action="?/travel&slot={qp}" style="display: flex; gap: 0.3em; align-items: center;">
    <input type="number" name="days" bind:value={travelDays} min="1" max="10" style="width: 4em;" />
    <button type="submit">Travel</button>
  </form>

  <form method="POST" action="?/rest&slot={qp}" style="display: flex; gap: 0.3em; align-items: center;">
    <input type="number" name="days" bind:value={restDays} min="1" max="7" style="width: 4em;" />
    <button type="submit">Rest</button>
  </form>

  <form method="POST" action="?/camp&slot={qp}">
    <button type="submit">Camp</button>
  </form>

  <button type="button" disabled title="Plan 4c">Hunt</button>
  <button type="button" disabled title="Plan 4c">Trade</button>
  <button type="button" disabled title="Plan 4c">Ford</button>
</div>
