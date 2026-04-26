# COMPONENTS_CLAUDE.md — UI Components Implementation Brief

> **Scope.** Feature-scoped brief for the UI components polish pass.
> Does **not** override the repo root `CLAUDE.md`. Read that first; defer
> to it if anything here contradicts.

---

You are landing the OT.IO **UI components polish pass** in the SvelteKit
codebase `ericbond007/ot-revisited`. This file is your contract.

The handoff bundle (this folder) contains:
- `README.md` — bundle overview, what changes per component
- `colors_and_type.css` — design tokens, ported from the target repo
- `src/*.html` — runnable HTML previews of each finished component

**This is a modification pass, not a greenfield build.** The components
already exist in `src/lib/ui/`. Your job is to translate the styling /
structure changes from the bundled HTML into the existing Svelte files
without breaking their existing prop contracts.

---

## The repo at a glance

- **Framework:** SvelteKit 2, Svelte 5 (runes), TypeScript
- **Components affected:**
  - `src/lib/ui/ActionBar.svelte`
  - `src/lib/ui/PartyPanel.svelte`
  - `src/lib/ui/EventModal.svelte`
  - global button styles in `src/lib/styles/theme.css`
  - HP / morale / hunger bar usages (probably inline in PartyPanel + others)
  - Top-bar stat readout cluster (probably `PaceReadout.svelte` /
    `RationsReadout.svelte` or similar)
- **Icon source:** `src/lib/data/icon-dictionary.ts` (from the brand handoff
  bundle, if landed first; otherwise inline emoji strings)

---

## Build order

Do these in order; each phase is independently shippable.

### 1. Action bar (`src/action-bar.html` → `ActionBar.svelte`)

**Goal:** swap the five primary action emoji for custom SVG glyphs.

Steps:

a. **Add the icon sprite to `ActionBar.svelte`.** Lift the entire hidden
   `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
   <defs>…</defs></svg>` block from `action-bar.html` and paste it at the
   top of the component's markup. Do **not** modify the path data — these
   are committed glyphs.

b. **Replace the action label rendering.** Wherever the component currently
   renders `<span>{action.emoji}</span>` or similar, replace with:

   ```svelte
   <svg class="gi" viewBox={action.iconViewBox}><use href={`#${action.iconId}`} /></svg>
   ```

   Map each action to its icon ID:

   ```ts
   const ACTION_ICONS = {
     travel: { id: 'gi-travel', viewBox: '0 0 64 40' },
     rest:   { id: 'gi-rest',   viewBox: '0 0 32 32' },
     hunt:   { id: 'gi-hunt',   viewBox: '0 0 64 32' },
     ford:   { id: 'gi-ford',   viewBox: '0 0 64 40' },
     visit:  { id: 'gi-visit',  viewBox: '0 0 32 32' },
   };
   ```

c. **Preserve all existing state styling** — `[disabled]`, `.primary` (rust
   glow + outer ring), the river-cue blue border, the up/down stepper for
   the day count. Don't redesign these; they're already in the bundled
   HTML.

d. **Verify.** Visual diff `/play` against `src/action-bar.html` —
   primary/disabled/normal states for each action.

### 2. Party panel (`src/party-panel.html` → `PartyPanel.svelte`)

**Goal:** restructure each party row to a 3-column grid (avatar | text+bar |
status), add status rings, HP-bar hatch ticks, sparkline, morale ribbon,
mini-stats row.

a. **Add the per-member SVG avatar.** Each row's leftmost cell is a 24×24
   SVG portrait composed of:
   - Status ring (`<circle cx="12" cy="12" r="11" fill="none" stroke="…" />`)
     — sage solid for healthy, rust dashed (`stroke-dasharray="2 1.5"`) for
     ill, omitted for dead (replaced by gravestone)
   - Head circle (`<circle cx="12" cy="9" r="3.2" fill="#e8c89a" />`)
   - Shoulders (`<path d="M5 21 Q12 14 19 21" fill="…" />`) with a profession-
     specific shirt color
   - Optional hat / bonnet / scout-cap layer (per profession)
   - Optional profession badge in the upper-right corner (e.g. red cross
     for doctor)

   These are static — pre-compose them inline based on `member.profession +
   member.status`. See `party-panel.html` for the four full examples.

b. **Add status keyframes** (paste verbatim from `party-panel.html`):

   ```css
   @keyframes hpPulse { 0%,100% { opacity: 0.85 } 50% { opacity: 1 } }
   @keyframes ill { 0%,100% { transform: translateX(0) } 25% { transform: translateX(-1px) } 75% { transform: translateX(1px) } }
   @keyframes drip { 0% { transform: translateY(-2px); opacity: 0 } 30% { opacity: 1 } 100% { transform: translateY(8px); opacity: 0 } }
   @keyframes moralePulse { 0%,100% { transform: scaleY(1) } 50% { transform: scaleY(0.85) } }
   @keyframes spark { 0%,100% { opacity: 0.4 } 50% { opacity: 1 } }
   ```

   Apply to ill rows (`.ill-shake`), low-HP heart icons (`hpPulse`), fever
   droplets (`drip`), morale meter (`moralePulse`), sparkline endpoint
   (`spark`).

c. **HP bar w/ hatch ticks.** Replace the existing flat HP bar with the
   gradient-fill-plus-tick-mask pattern from the prototype:

   ```svelte
   <div class="hp-bar-track">
     <div class="hp-bar-fill" style:width={`${pct}%`}
          style:background={ill ? 'linear-gradient(90deg,#a83a2a,#e85a4a)'
                                : 'linear-gradient(90deg,#6a9a4a,#8bb96a)'} />
     <div class="hp-bar-ticks" />  <!-- pseudo-element with 25/50/75 stripes -->
   </div>
   ```

d. **Header sparkline.** A 48×14 SVG `<polyline>` from the recent-7-days
   morale array, plus a `<circle class="spark">` at the rightmost point.
   Wire this to whichever store tracks daily morale; if no such store
   exists, ask the designer.

e. **Morale ribbon + mini-stats row.** Two new bottom rows; lift the markup
   from `party-panel.html`. The mini-stats row reads from the same stores
   the top-bar uses (rations, oxen count, pace) — duplication is
   intentional.

f. **Dead member styling.** Replace the avatar with the gravestone SVG (see
   prototype's "Amos" row), apply `text-decoration: line-through`, drop
   `opacity` to 0.55, render a "✝ day N · cause" line in monospace.

### 3. Event modal (`src/event-modal.html` → `EventModal.svelte`)

a. **Category pill at top** — eyebrow-styled inline-flex element with
   `padding: 0.2em 0.7em`, `border-radius: 20px`, the category emoji, and
   the category name in `--c-eyebrow` color.

b. **Title** — Rye serif, 24px, color `--c-rust`, `letter-spacing: 0.04em`,
   `line-height: 1.2`.

c. **Body** — IM Fell English, 1.55 line height, color `--c-tan`.

d. **"WHAT DO YOU DO?"** — eyebrow style above the choice list.

e. **Choices** — full-width buttons, gap 8px column. Primary choice gets
   `border-color: --c-rust` + bold weight. Secondary choices get
   `border-color: --c-wood`. Each button is `display: flex` with the choice
   emoji on the left and the text spanning the rest.

f. **Modal frame** — `border: 3px solid --c-rust`, `box-shadow: 0 12px 40px
   rgba(0,0,0,0.7)`. Backdrop unchanged.

### 4. Buttons + stat bars + stat readout

These are smaller passes:

- **Buttons** (`src/buttons.html`): align `theme.css`'s global button rules
  with the prototype's primary / ghost / danger / disabled variants.
- **Stat bars** (`src/stat-bars.html`): the HP / morale / hunger bar
  primitive should match the party panel's pattern (gradient fill + tick
  mask). Extract into a `StatBar.svelte` if it's used in 3+ places.
- **Stat readout** (`src/stat-readout.html`): the top-bar stat cluster.
  Confirm visually with the designer; this is the lowest-priority piece.

---

## Conventions to follow

- **Svelte 5 runes only.**
- **TypeScript strict.** No `any`. Type all props.
- **Preserve existing component prop contracts.** These components are
  consumed by routes; don't break their public surface.
- **CSS variables for colors.** All colors in styles must reference
  `--c-…` tokens from `theme.css`. The prototype's inline hex values are
  shortcuts; in Svelte, use the variables.
- **Scoped `<style>` blocks.** No global styles unless updating
  `theme.css` directly (e.g. button rules).
- **Animations stay CSS-driven.** The party panel uses `@keyframes`; that's
  the right idiom here. Don't push these to JS.

---

## Things to NOT do

- ❌ **Do not redraw the action bar SVG icons.** Path data is committed.
- ❌ **Do not change the action bar's state model** (which action is
  primary, which is disabled, when the river border shows). Just the
  visual translation of states.
- ❌ **Do not invent new HP-bar colors.** Sage healthy / rust ill is the
  contract.
- ❌ **Do not break the party panel's data shape.** Whatever `Member`
  type the existing component takes is the input; don't require new fields
  unless absolutely necessary (and if you must, ask the designer first).
- ❌ **Do not extract a `<Modal>` primitive as part of this work** unless
  the repo already has one. Restyling the existing `EventModal.svelte` in
  place is the right scope.
- ❌ **Do not add icon-library deps.** Inline SVG only.
- ❌ **Do not remove `aria-label` / `title` attributes** from existing
  buttons. Accessibility is preserved.

---

## How to verify

1. **Action bar parity.** Render `/play`'s action bar with each action as
   primary in turn; visually diff against `action-bar.html`.
2. **Action bar disabled states.** Trigger a state where Ford is required
   first (river ahead); confirm the disabled visual matches.
3. **Party panel — all four states.** Render a healthy member, an ill
   member, a low-HP member, and a dead member; visually diff against
   `party-panel.html`.
4. **Party panel animations.** Ill member shakes. Low-HP heart pulses.
   Fever droplets drip. Morale meter pulses. Sparkline endpoint sparks.
5. **Event modal.** Trigger a weather event in `/play`; visually diff
   against `event-modal.html`.
6. **Build clean.** No TypeScript errors, no Svelte warnings, no a11y
   warnings.

---

## When you're stuck

- Each `src/*.html` is the source of truth for **visual layout, color
  values, animation timings, and SVG paths.**
- This file is the source of truth for **per-component change plan and
  conventions.**
- The repo's existing components are the source of truth for **data
  shapes, prop contracts, and where each component is consumed.**
- For game-state wiring (which store feeds the sparkline, where the morale
  trend arrow data lives) — ask the designer.
