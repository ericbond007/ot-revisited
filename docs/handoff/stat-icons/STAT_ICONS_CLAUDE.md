# STAT_ICONS_CLAUDE.md — Stat Icons Implementation Brief

> **Scope.** Feature-scoped brief for replacing the 8 stat emoji glyphs
> with watercolor SVGs. Does **not** override the repo root `CLAUDE.md`.
> Read that first; defer to it if anything contradicts.

---

You are landing the OT.IO **stat-icon set** in the SvelteKit codebase
`ericbond007/ot-revisited`. This file is your contract.

The handoff bundle (this folder) contains:
- `README.md` — bundle overview, per-stat provenance
- `colors_and_type.css` — design tokens
- `Watercolor Sheet.html` — runnable specimen showing each glyph at
  16/20/24/32 px and in context (top-bar readout, party-row mini)
- `src/stat-icons.jsx` — committed glyph paths

**This is a modification pass, not greenfield.** The stats already render
via `ICON.stats.X` from `src/lib/data/icon-dictionary.ts`. Your job is to
introduce a `StatIcon.svelte` dispatcher (mirroring the existing
`LandmarkIcon.svelte` pattern) and switch consumers from raw emoji strings
to the dispatcher.

---

## The repo at a glance

- **Framework:** SvelteKit 2, Svelte 5 (runes), TypeScript
- **Existing pattern to mirror:** `src/lib/ui/LandmarkIcon.svelte` —
  takes a `kind` prop, dispatches to a per-landmark SVG component.
- **Files affected:**
  - **NEW** `src/lib/ui/StatIcon.svelte` — dispatcher
  - **NEW** `src/lib/ui/stat-icons/` — 8 glyph SVG components (or one
    file with all 8, your call — match whatever `LandmarkIcon` does)
  - **EDIT** `src/lib/data/icon-dictionary.ts` — keep the emoji map for
    fallback, but also export the kind keys for type-safe dispatch
  - **EDIT** every consumer that currently does
    `{ICON.stats.day}` → wrap in `<StatIcon kind="day" size={16} />`

---

## Build order

### 1. Lift the glyph paths

Open `src/stat-icons.jsx` from this bundle. It exports 8 named React
components (`DayIcon`, `DateIcon`, `PaceIcon`, `RationsIcon`,
`MoraleIcon`, `HealthIcon`, `CashIcon`, `WaterIcon`) — these are the
committed paths. Translate each to a Svelte component (or a single
`stat-icons.svelte` with `<svelte:fragment>` blocks per kind, your call).

**Do not modify the path data, fills, or stroke widths.** They are tuned
for 16-px rendering. Colors come from CSS vars defined in
`colors_and_type.css`; if your repo has a `theme.css` that already defines
these tokens, prefer those names.

### 2. Build `StatIcon.svelte` dispatcher

```svelte
<script lang="ts">
  type Kind = 'day' | 'date' | 'pace' | 'rations'
            | 'morale' | 'health' | 'cash' | 'water';
  let { kind, size = 16, title }: { kind: Kind; size?: number; title?: string } = $props();
</script>

{#if kind === 'day'}     <DayIcon  width={size} height={size} {title} />
{:else if kind === 'date'}    <DateIcon  width={size} height={size} {title} />
…
{/if}
```

Mirror whatever pattern `LandmarkIcon.svelte` uses for its `kind` switch.

### 3. Switch consumers

Search the repo for `ICON.stats.` and `🐂`/`🍖`/`💵`/`💧`/`☀️`/`🗓️`/`❤️`/`🎵`
(the literal emoji). Replace each call site:

```svelte
<!-- BEFORE -->
<span class="stat-icon">{ICON.stats.pace}</span>

<!-- AFTER -->
<StatIcon kind="pace" size={16} />
```

The intended sizes in the existing UI:
- **Top-bar readout** — 16 px, beside a labeled value (`DAY 47`, `JUL 14`,
  `STEADY`, `142 lb`, `HIGH`, `82`, `$248`, `FULL`).
- **Party-row mini stats** — 14 px, beside a tiny value.
- **Status chips / large readouts** — 24 px (use sparingly; the top-bar is
  the dominant context).

### 4. Keep emoji fallback in `icon-dictionary.ts`

Some surfaces (toasts, log entries, copy-paste-friendly text) still want
the emoji. Don't delete those entries — they remain the textual
representation. The dispatcher is for **rendered UI**, the emoji map is
for **textual content**.

---

## Sizing & color rules

- **Minimum render size: 16 px.** Below that, fall back to the emoji.
- **Never recolor the meat (rust), bone (cream), heart (red), water
  (river-blue), sun (mustard), or sage of cash.** These are load-bearing
  identification colors — recoloring breaks recognition.
- **Today-dot** on the date icon is the rust accent (`var(--c-rust)`).
  This is the only stat icon with a "live" color element; everything
  else is statically colored.

---

## Acceptance

- [ ] All 8 stats render via `<StatIcon kind="…" />` instead of emoji.
- [ ] Top-bar readout still fits on a single row at the existing
      breakpoints (svg widths match the previous emoji-glyph widths
      within ±2px — they should).
- [ ] Party-row mini renders at 14 px without crushing.
- [ ] No console warnings about missing `kind` cases.
- [ ] `ICON.stats.*` emoji map is preserved for textual contexts.
