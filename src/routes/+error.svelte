<script lang="ts">
  import { page } from '$app/state';
</script>

<div class="container" style="text-align: center; padding: 4em 1em;">
  <h1 style="color: var(--of-rust);">The trail ends here</h1>
  <p style="font-size: 1.1em; color: var(--of-ink-soft); margin: 1em 0 2em;">
    {page.status} — {page.error?.message ?? 'Something went wrong.'}
  </p>
  <a href="/"><button>Return home</button></a>
</div>
