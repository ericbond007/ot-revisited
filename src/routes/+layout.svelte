<script lang="ts">
  import '$lib/styles/theme.css';
  let { children } = $props();
</script>

<main>
  {@render children()}
</main>
