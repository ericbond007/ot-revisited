<script lang="ts">
  let { data } = $props();
</script>

<div class="wrap">
  <h1>Dev Scenario Perma URLs</h1>
  <p class="lede">
    Each link rebuilds the named scenario and drops you into <code>/play</code>.
    Share these for bug repros, design reviews, or demos.
  </p>
  <ul>
    {#each data.scenarios as s}
      <li>
        <a href="/dev/scenario/{s.id}"><code>{s.id}</code></a>
        — {s.label}
        {#if s.description}<small>{s.description}</small>{/if}
      </li>
    {/each}
  </ul>
</div>

<style>
  .wrap { padding: 1.5em; max-width: 720px; margin: 0 auto; }
  h1 { color: var(--of-rust); margin: 0 0 0.4em; }
  .lede { color: var(--of-ink-soft); margin: 0 0 1.2em; }
  ul { list-style: none; padding: 0; margin: 0; }
  li {
    padding: 0.6em 0;
    border-bottom: 1px dashed rgba(138, 90, 42, 0.18);
  }
  li:last-child { border-bottom: 0; }
  code {
    background: var(--of-paper-soft);
    padding: 0.1em 0.4em;
    border-radius: 3px;
  }
  small { display: block; color: var(--of-ink-soft); font-size: 0.85em; margin-top: 0.2em; }
  a { color: var(--of-rust); font-weight: 600; }
</style>
