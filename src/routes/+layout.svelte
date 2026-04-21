<script lang="ts">
  import '$lib/styles/theme.css';
  let { children, data } = $props();
</script>

<header style="
  border-bottom: 2px solid var(--c-border);
  background: var(--c-bg-raised);
  padding: 0.8em 1em;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
">
  <a href="/" style="font-size: 1.4em; font-weight: 700; color: var(--c-rust); letter-spacing: 0.08em;">🤠 HOOSIER TRAIL</a>
  <span style="color: var(--c-wood); font-size: 0.85em; font-style: italic;">
    A journey along the Oregon Trail
  </span>
</header>

<main>
  {@render children()}
</main>
