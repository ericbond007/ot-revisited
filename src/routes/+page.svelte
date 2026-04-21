<script lang="ts">
  let { data } = $props();
  const hasSaves = $derived(data.saves.length > 0);
</script>

<div class="container">
  <h1>Hoosier Trail</h1>
  <p style="color: var(--c-wood); font-size: 1.1em; margin-bottom: 2em;">
    A single-player journey along the Oregon Trail, 1841–1869.
  </p>

  <div style="display: flex; flex-direction: column; gap: 1em; max-width: 400px;">
    <a href="/new">
      <button style="width: 100%; padding: 1em;">Start a New Journey</button>
    </a>
    <a href="/load" aria-disabled={!hasSaves}>
      <button style="width: 100%; padding: 1em;" disabled={!hasSaves}>
        Load a Saved Game {hasSaves ? `(${data.saves.length})` : ''}
      </button>
    </a>
  </div>
</div>
