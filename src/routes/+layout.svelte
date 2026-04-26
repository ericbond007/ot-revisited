<script lang="ts">
  import '$lib/styles/theme.css';
  import IconSprite from '$lib/ui/IconSprite.svelte';
  let { children } = $props();
</script>

<IconSprite />

<main>
  {@render children()}
</main>
