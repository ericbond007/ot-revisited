<script lang="ts">
  // Brand lockup. `?raw` inlines the SVGs so they inherit `currentColor`
  // from the parent — set CSS `color` to retheme. `auto` swaps to the
  // square mark below `breakpoint` px so narrow contexts (mobile chrome,
  // sidebar headers) don't truncate the wordmark.
  import Mark from '$lib/assets/brand/mark.svg?raw';
  import Wordmark from '$lib/assets/brand/wordmark.svg?raw';

  interface Props {
    variant?: 'mark' | 'wordmark' | 'auto';
    /** When `auto`, use mark below this width in px. Default 280. */
    breakpoint?: number;
    /** Color override; defaults to currentColor. */
    color?: string;
  }
  let { variant = 'auto', breakpoint = 280, color }: Props = $props();

  let containerWidth = $state(0);
  const resolved = $derived(
    variant === 'auto'
      ? containerWidth < breakpoint ? 'mark' : 'wordmark'
      : variant
  );
</script>

<div class="lockup" style:color bind:clientWidth={containerWidth}>
  {#if resolved === 'mark'}
    {@html Mark}
  {:else}
    {@html Wordmark}
  {/if}
</div>

<style>
  .lockup { display: inline-flex; align-items: center; }
  .lockup :global(svg) { height: 100%; width: auto; }
</style>
