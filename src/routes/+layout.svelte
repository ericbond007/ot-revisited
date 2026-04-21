<script lang="ts">
  import '$lib/styles/theme.css';
  let { children } = $props();
</script>

<header style="border-bottom: 2px solid var(--c-border); background: var(--c-bg-raised); padding: 0.8em 1em;">
  <a href="/" style="font-size: 1.4em; font-weight: 700; color: var(--c-rust);">🤠 HOOSIER TRAIL</a>
</header>

<main>
  {@render children()}
</main>
