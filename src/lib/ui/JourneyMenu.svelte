<script lang="ts">
  // Popover menu anchored to the cowboy-hat journey icon. Add new actions to
  // the `items` array below — each is just a {icon, label, href, danger?}.
  import { SCENARIOS } from '$lib/dev/scenarios';
  import { ICON } from '$lib/data/icon-dictionary';

  let { open = $bindable(false), onclose }: { open?: boolean; onclose?: () => void } = $props();

  let root = $state<HTMLDivElement | undefined>(undefined);

  // Measured on open so the menu can fill the viewport below the
  // anchor button, regardless of where the parent ends up rendering.
  let availableHeight = $state<string>('80vh');
  function measureHeight() {
    if (!root) return;
    const rect = root.getBoundingClientRect();
    // Subtract a tiny floor margin so we don't clip against the bottom edge.
    availableHeight = `${Math.max(200, window.innerHeight - rect.top - 16)}px`;
  }

  // Dev-only: quick-load scenarios from the Journey menu. Vite inlines
  // `import.meta.env.DEV` to a constant, so this block drops out of the
  // production bundle entirely.
  const isDev = import.meta.env.DEV;

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

  // Recompute available height whenever the menu opens or the viewport
  // resizes — keeps the dev list's scroll region sized to the viewport.
  $effect(() => {
    if (!open || typeof window === 'undefined') return;
    measureHeight();
    window.addEventListener('resize', measureHeight);
    return () => window.removeEventListener('resize', measureHeight);
  });

  interface MenuItem {
    icon: string;
    label: string;
    sub?: string;
    href: string;
    danger?: boolean;
  }

  const items: MenuItem[] = [
    { icon: ICON.journey_menu.save, label: 'Manage Saves', sub: 'Load or delete other journeys', href: '/load' },
    { icon: ICON.journey_menu.new,  label: 'New Journey',  sub: 'Start a fresh party',           href: '/new', danger: true },
    { icon: ICON.journey_menu.home, label: 'Back to Home', sub: 'Title screen',                  href: '/' }
  ];
</script>

{#if open}
  <div class="menu" bind:this={root} role="menu" style="height: {availableHeight};">
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

    {#if isDev}
      <div class="menu-divider"></div>
      <div class="menu-head dev-head">{ICON.journey_menu.dev} DEV SCENARIOS ({SCENARIOS.length})</div>
      <div class="dev-list">
        {#each SCENARIOS as sc}
          <!-- No `onclick={close}` on the submit button — closing the menu
               before submit unmounts the form, so the POST never fires.
               Navigation to /play on the action's redirect will tear down
               the menu naturally. -->
          <form method="POST" action="/?/loadScenario" class="dev-form">
            <input type="hidden" name="scenario" value={sc.id} />
            <button type="submit" class="item dev-item" role="menuitem">
              <span class="item-icon">{ICON.journey_menu.scenario}</span>
              <span class="item-body">
                <span class="item-label">{sc.label}</span>
                <span class="item-sub">{sc.description}</span>
              </span>
            </button>
          </form>
        {/each}
      </div>
    {/if}

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
    /* Height comes from the inline `style="height: <px>"` on the menu —
       set in JS to fill the viewport from the menu's top down to a small
       floor margin. The dev-list flex-grows into whatever's left after
       the static rows. */
    padding: 0.4em;
    background: var(--of-paper-soft);
    border: 2px solid var(--of-rust);
    border-radius: 4px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.55);
    display: flex;
    flex-direction: column;
    gap: 0.2em;
  }
  .menu-head {
    font-size: 0.65em;
    letter-spacing: 0.18em;
    color: var(--of-ink-soft);
    font-weight: 700;
    padding: 0.3em 0.5em 0.5em 0.5em;
  }
  .dev-head {
    color: var(--of-status-good);
  }
  .menu-divider {
    height: 1px;
    background: rgba(138, 90, 42, 0.4);
    margin: 0.4em 0.3em 0.1em;
  }
  .dev-list {
    display: flex;
    flex-direction: column;
    gap: 0.2em;
    /* Take whatever vertical space the menu has left after the static
       items above + foot. Scrolls inside that. */
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    /* Reserve space for the scrollbar so rows don't shift. */
    padding-right: 4px;
  }
  .dev-form {
    margin: 0;
    padding: 0;
    display: block;
    width: 100%;
  }
  .dev-item {
    width: 100%;
    /* Override the theme button chrome so it matches the other menu
       items visually — it's still a submit button, just styled as a row. */
    background: var(--of-paper);
    color: var(--of-ink);
    font-family: inherit;
    font-weight: normal;
    letter-spacing: 0;
    text-transform: none;
    cursor: pointer;
    text-align: left;
    border: 2px solid rgba(139, 185, 106, 0.35);
  }
  .dev-item:hover {
    border-color: var(--of-status-good);
    color: var(--of-ink);
  }
  .menu-foot {
    font-size: 0.65em;
    color: var(--of-ink-soft);
    font-style: italic;
    text-align: right;
    padding: 0.4em 0.5em 0.2em 0.5em;
  }

  .item {
    display: flex;
    align-items: center;
    gap: 0.6em;
    padding: 0.5em 0.6em;
    background: var(--of-paper);
    border: 2px solid var(--of-ink-soft);
    border-radius: 3px;
    color: var(--of-ink);
    text-decoration: none;
    transition: background 0.1s, border-color 0.1s, color 0.1s;
  }
  .item:hover {
    background: var(--of-paper-soft);
    border-color: var(--of-rust);
    color: var(--of-ink);
  }
  .item.danger:hover {
    border-color: var(--of-status-bad);
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
    color: var(--of-ink-soft);
    font-style: italic;
  }
</style>
