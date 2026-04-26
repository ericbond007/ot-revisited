# BRAND_CLAUDE.md — Brand Assets Implementation Brief

> **Scope.** Feature-scoped brief for the brand-assets work only. Does
> **not** override the repo root `CLAUDE.md`. Read that first; defer to it
> if anything here contradicts.

---

You are landing the OT.IO **brand assets** in the SvelteKit codebase
`ericbond007/ot-revisited`. This file is your contract.

The handoff bundle (this folder) contains:
- `README.md` — bundle overview, status, design tokens
- `colors_and_type.css` — design tokens, ported from the target repo
- `src/mark.svg`, `wordmark.svg` — final brand SVGs
- `src/icon-dictionary.json` — canonical concept → glyph map

This is mostly a file-copy task. Read the README first.

---

## Slot map — where the new code goes

```
src/lib/
├── assets/
│   └── brand/
│       ├── mark.svg          ← from src/mark.svg
│       └── wordmark.svg      ← from src/wordmark.svg
├── data/
│   └── icon-dictionary.ts    ← converted from src/icon-dictionary.json (see below)
└── ui/
    └── BrandLockup.svelte    ← NEW.  Convenience component that picks mark vs wordmark by available width
```

---

## Build order

### 1. Copy the SVGs

```
src/mark.svg        → src/lib/assets/brand/mark.svg
src/wordmark.svg    → src/lib/assets/brand/wordmark.svg
```

Verbatim copy. Do not rewrite or "optimize" them — they're already small.

### 2. Convert the icon dictionary to typed TypeScript

`src/icon-dictionary.json` is JSON for portability. In the target repo,
convert to `src/lib/data/icon-dictionary.ts` so consumers get type-checked
keys:

```ts
// src/lib/data/icon-dictionary.ts

export const ICON = {
  actions: {
    travel: '🚶',
    rest: '🏕️',
    hunt: '🏹',
    ford: '🛶',
    visit: '🏛️',
    trade: '💰',
    camp: '⛺',
    menu: '🤠',
  },
  stats: {
    day: '📅',
    date: '🗓️',
    pace: '🐂',
    rations: '🍖',
    morale: '🎵',
    health: '❤️',
    cash: '💵',
    water: '💧',
  },
  // … the rest of the dictionary, verbatim from src/icon-dictionary.json
} as const;

export type IconCategory = keyof typeof ICON;
export type IconKey<C extends IconCategory> = keyof typeof ICON[C];

export function icon<C extends IconCategory>(category: C, key: IconKey<C>): string {
  return ICON[category][key];
}
```

Don't paraphrase the values — copy them exactly from the JSON. The JSON is
authoritative.

### 3. Audit existing emoji usage

Grep the codebase for every emoji currently used inline in `src/lib/ui/*.svelte`
and `src/routes/**/*.svelte`. For each occurrence:

- If it matches the dictionary value for the concept it represents → leave
  it alone (no action needed).
- If it uses a different glyph for a concept the dictionary defines → replace
  with the dictionary value, ideally via `icon('category', 'key')` so future
  drift is impossible.
- If it's an emoji for a concept **not** in the dictionary → flag it. Either
  the dictionary needs to grow, or the emoji is being used decoratively
  outside the system. Ask the designer; don't unilaterally extend the
  dictionary.

### 4. Build `BrandLockup.svelte`

```svelte
<!-- src/lib/ui/BrandLockup.svelte -->
<script lang="ts">
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
      ? (containerWidth < breakpoint ? 'mark' : 'wordmark')
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
```

Use SvelteKit's Vite `?raw` loader to inline the SVG so it can inherit
`currentColor`. If the project uses a different SVG-as-component pattern
(e.g. `vite-plugin-svelte-svg`), follow that instead.

### 5. Wire into the app shell

Replace any text-only "OT.IO" headings in `src/routes/+layout.svelte` and
the landing page with `<BrandLockup />`. Don't touch `/play`'s in-game
chrome — the brand should live in the navigational shell, not on the
gameplay surface.

---

## Conventions to follow

- **Svelte 5 runes only.**
- **TypeScript strict.** No `any`.
- **CSS variables for color.** The SVGs use `currentColor`; set the parent
  `color` to `var(--c-ink)` (default) or whatever the context requires.
- **No new fonts.** The wordmark is a baked-in SVG; no font load needed.
- **Don't inline the SVGs as React-style JSX.** Use the framework's native
  pattern (`?raw`, `?component`, or `<img src>` — pick what the repo
  already uses for SVGs).

---

## Things to NOT do

- ❌ **Do not redraw the SVGs.** They're final.
- ❌ **Do not change the icon dictionary values.** It's a contract; if
  something needs to change, that's a designer decision, not an
  implementation one.
- ❌ **Do not ship multiple "OT.IO" string spellings.** The wordmark is
  the only allowed visual lockup.
- ❌ **Do not introduce a CSS recolor on the mark via `filter: invert()`
  or similar.** Use `currentColor` and set the parent.

---

## How to verify

1. **Mark renders at every size.** Drop the mark into a test page at
   16/24/32/48/64/96/128 px and confirm it stays legible.
2. **Wordmark in header.** Replace the landing page heading; confirm it
   inherits the page's text color.
3. **Auto variant.** Resize the window narrow; `<BrandLockup variant="auto" />`
   should swap to the mark below ~280px.
4. **Icon dictionary type-check.** `icon('actions', 'travel')` compiles;
   `icon('actions', 'nonexistent')` fails to compile.
5. **No regressed emoji.** Re-grep for any emoji in `src/lib/ui/*.svelte`
   that doesn't match the dictionary — should be zero.

---

## When you're stuck

- The SVGs are the source of truth for **shape and proportion.**
- `icon-dictionary.json` is the source of truth for **which emoji means
  what.**
- For anything else — where the brand should appear, sizing rules, dark/
  light variants — ask the designer. Don't guess.
