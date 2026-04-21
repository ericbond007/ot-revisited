<script lang="ts">
  let { data } = $props();
</script>

<div class="container">
  <h1>Load a saved journey</h1>

  {#if data.saves.length === 0}
    <p>No saves yet. <a href="/new">Start a new journey</a>.</p>
  {:else}
    <div style="display: flex; flex-direction: column; gap: 0.8em;">
      {#each data.saves as save}
        <div class="panel" style="display: flex; justify-content: space-between; align-items: center; gap: 1em;">
          <div>
            <strong style="color: var(--c-rust);">{save.slotName}</strong>
            <div style="font-size: 0.9em;">{save.summary}</div>
            <div style="font-size: 0.75em; color: var(--c-wood);">Saved {new Date(save.updatedAt).toLocaleString()}</div>
          </div>
          <div style="display: flex; gap: 0.5em;">
            <form method="POST" action="?/load">
              <input type="hidden" name="slotName" value={save.slotName} />
              <button type="submit">Load</button>
            </form>
            <form method="POST" action="?/delete" onsubmit={(e) => { if (!confirm(`Delete "${save.slotName}"?`)) e.preventDefault(); }}>
              <input type="hidden" name="slotName" value={save.slotName} />
              <button type="submit" style="background: var(--c-panel); color: var(--c-wood);">Delete</button>
            </form>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <p style="margin-top: 2em;"><a href="/">← Back</a></p>
</div>
