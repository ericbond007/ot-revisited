<script lang="ts">
  // Popover menu anchored to the cowboy-hat journey icon. Add new actions to
  // the `items` array below — each is just a {icon, label, href, danger?}.

  let { open = $bindable(false), onclose }: { open?: boolean; onclose?: () => void } = $props();

  let root = $state<HTMLDivElement | undefined>(undefined);

  function close() {
    open = false;
    onclose?.();
  }
  function onWindowClick(e: MouseEvent) {
    if (!open) return;
    if (root && !root.contains(e.target as Node)) close();
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) close();
  }
  $effect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener('click', onWindowClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', onWindowClick);
      window.removeEventListener('keydown', onKey);
    };
  });

  interface MenuItem {
    icon: string;
    label: string;
    sub?: string;
    href: string;
    danger?: boolean;
  }

  const items: MenuItem[] = [
    { icon: '💾', label: 'Manage Saves', sub: 'Load or delete other journeys', href: '/load' },
    { icon: '🆕', label: 'New Journey',  sub: 'Start a fresh party',           href: '/new', danger: true },
    { icon: '🏠', label: 'Back to Home', sub: 'Title screen',                  href: '/' }
  ];
</script>

{#if open}
  <div class="menu" bind:this={root} role="menu">
    <div class="menu-head">JOURNEY MENU</div>
    {#each items as it}
      <a class="item" class:danger={it.danger} href={it.href} role="menuitem" onclick={close}>
        <span class="item-icon">{it.icon}</span>
        <span class="item-body">
          <span class="item-label">{it.label}</span>
          {#if it.sub}<span class="item-sub">{it.sub}</span>{/if}
        </span>
      </a>
    {/each}
    <div class="menu-foot">Esc to close</div>
  </div>
{/if}

<style>
  .menu {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    z-index: 60;
    min-width: 240px;
    padding: 0.4em;
    background: var(--c-panel);
    border: 2px solid var(--c-rust);
    border-radius: 4px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.55);
    display: flex;
    flex-direction: column;
    gap: 0.2em;
  }
  .menu-head {
    font-size: 0.65em;
    letter-spacing: 0.18em;
    color: var(--c-wood);
    font-weight: 700;
    padding: 0.3em 0.5em 0.5em 0.5em;
  }
  .menu-foot {
    font-size: 0.65em;
    color: var(--c-wood);
    font-style: italic;
    text-align: right;
    padding: 0.4em 0.5em 0.2em 0.5em;
  }

  .item {
    display: flex;
    align-items: center;
    gap: 0.6em;
    padding: 0.5em 0.6em;
    background: var(--c-bg-raised);
    border: 2px solid var(--c-wood);
    border-radius: 3px;
    color: var(--c-tan);
    text-decoration: none;
    transition: background 0.1s, border-color 0.1s, color 0.1s;
  }
  .item:hover {
    background: var(--c-panel);
    border-color: var(--c-rust);
    color: var(--c-tan-bright);
  }
  .item.danger:hover {
    border-color: #e85a4a;
  }

  .item-icon {
    font-size: 1.4em;
    line-height: 1;
  }
  .item-body {
    display: flex;
    flex-direction: column;
    gap: 0.1em;
  }
  .item-label {
    font-weight: 700;
    font-size: 0.95em;
    letter-spacing: 0.04em;
  }
  .item-sub {
    font-size: 0.78em;
    color: var(--c-wood);
    font-style: italic;
  }
</style>
