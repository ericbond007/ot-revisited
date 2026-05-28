# UI Redesign PR 0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flip the entire app to the 1840s-broadsheet paper palette in one PR via an inversion-aware token bridge, rework the global element styles to paper, self-host IM Fell English SC, and add a `/dev/design-system` specimen — so every subsequent surface-port PR builds on a paper foundation.

**Architecture:** Single stylesheet (`src/lib/styles/theme.css`). Merge the `--of-*` design tokens + `.ds-*` utilities into it, then redefine the legacy `--c-*` tokens as *aliases* that resolve to `--of-*` values — inversion-aware (text tokens → ink, surfaces → paper). Because all ~59 existing files consume `var(--c-*)`, redefining the aliases flips them all at once with no per-file edits. Global element styles (`button`, `input`, `.panel`, `.modal-body`, `.eyebrow`, `html/body`) are reworked to the paper treatment in the same file.

**Tech Stack:** SvelteKit 5 (runes), CSS custom properties, self-hosted woff2 fonts, vitest + svelte-check. Project uses **jj (not git)** — each task ends with `jj describe` + `jj new`. CSS work is verified by `npm run verify` staying green + a Playwright screenshot sweep (no unit tests for pure CSS).

**Spec:** `docs/superpowers/specs/2026-05-28-ui-redesign-rollout-design.md`
**Design source:** `docs/handoff/ui-redesign/colors_and_type.css` + `Design System.html`

---

## Prerequisite

The handoff files (`docs/handoff/ui-redesign/`) and the rollout spec live on branch `docs/ui-redesign-handoff` (PR #204), NOT yet on master. **Before starting, merge PR #204 to master** so this PR0 branch can be rebased onto a master that contains the handoff source files the implementer copies tokens from. If #204 is already merged, skip.

```bash
gh pr merge 204 --squash --delete-branch          # from the default colocated workspace
cd /home/eric/projects/hoosierTrail-ui-pr0
jj git fetch && jj rebase -d master                # rebase PR0 branch onto handoff-bearing master
```

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `static/fonts/im-fell-english-sc-latin.woff2` | Create | self-hosted SC font binary (latin subset) |
| `src/lib/styles/theme.css` | Modify | the entire foundation: SC @font-face, `--of-*` tokens, `.ds-*` utilities, inversion-aware `--c-*` alias bridge, reworked global element styles |
| `src/routes/dev/design-system/+page.svelte` | Create | specimen route rendering palette / type / components for visual diffing |

Everything funnels through `theme.css` (already imported once in `src/routes/+layout.svelte`). No second stylesheet.

---

## Task 1: Source + self-host IM Fell English SC (the external-dependency step — do it first)

**Files:**
- Create: `static/fonts/im-fell-english-sc-latin.woff2`

The app self-hosts 4 fonts as `static/fonts/*-latin.woff2`; SC is missing and currently degrades to a fallback. `pyftsubset` + `fontTools 4.63.0` are installed. Source the woff2 latin subset.

- [ ] **Step 1: Fetch the latin woff2 from the Google Fonts CSS2 API**

Google serves an already-subset latin woff2 when queried with a modern browser UA. Extract the `/* latin */` block's woff2 URL and download it:

```bash
cd /home/eric/projects/hoosierTrail-ui-pr0
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
CSS=$(curl -s -A "$UA" "https://fonts.googleapis.com/css2?family=IM+Fell+English+SC&display=swap")
echo "$CSS"
# The CSS contains one or more @font-face blocks each preceded by a /* <subset> */ comment.
# Grab the woff2 URL from the block commented /* latin */ (NOT latin-ext).
WOFF2_URL=$(echo "$CSS" | awk '/\/\* latin \*\//{f=1} f&&/src:/{print; f=0}' | grep -oE "https://[^ )]+\.woff2" | head -1)
echo "latin woff2: $WOFF2_URL"
curl -s -L "$WOFF2_URL" -o static/fonts/im-fell-english-sc-latin.woff2
```

- [ ] **Step 2: Verify it is a real woff2 of sane size**

```bash
cd /home/eric/projects/hoosierTrail-ui-pr0
file static/fonts/im-fell-english-sc-latin.woff2
ls -l static/fonts/im-fell-english-sc-latin.woff2
```

Expected: `file` reports "Web Open Font Format (Version 2)"; size in the 20-80 KB range (the existing `im-fell-english-latin.woff2` is ~59 KB). If the file is HTML/empty or `file` doesn't say woff2, **STOP** — the API path failed; use the fallback in Step 3. Otherwise skip Step 3.

- [ ] **Step 3 (FALLBACK only if Step 2 failed): subset a sourced TTF with pyftsubset**

The GF GitHub path for the family is `ofl/imfellenglishsc/`. Source the TTF, then subset latin to woff2:

```bash
cd /home/eric/projects/hoosierTrail-ui-pr0
# Try the GF GitHub raw TTF (family dir is lowercase, no spaces):
curl -s -L "https://raw.githubusercontent.com/google/fonts/main/ofl/imfellenglishsc/IMFellEnglishSC-Regular.ttf" -o /tmp/imfellsc.ttf
file /tmp/imfellsc.ttf   # must report TrueType/OpenType; if 404/HTML, report BLOCKED with what you found
pyftsubset /tmp/imfellsc.ttf \
  --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD" \
  --flavor=woff2 \
  --output-file=static/fonts/im-fell-english-sc-latin.woff2
file static/fonts/im-fell-english-sc-latin.woff2
```

If neither the API nor the GitHub TTF resolves, report **BLOCKED** with the HTTP codes seen — do not commit a broken/HTML file as a woff2.

- [ ] **Step 4: Commit**

```bash
cd /home/eric/projects/hoosierTrail-ui-pr0
jj describe -m "feat(ui): self-host IM Fell English SC latin woff2"
jj new
```

---

## Task 2: Merge `--of-*` tokens + `.ds-*` utilities into theme.css

**Files:**
- Modify: `src/lib/styles/theme.css`
- Read: `docs/handoff/ui-redesign/colors_and_type.css`

Bring the design-system token layer into the app's single stylesheet. Do NOT add a second stylesheet.

- [ ] **Step 1: Read both files**

Read `docs/handoff/ui-redesign/colors_and_type.css` in full (the `--of-*` `:root` block, the `.ds-*` utility classes, and note its trailing legacy `--c-*` block — you will NOT copy that legacy block; the app's theme.css already has the canonical `--c-*` set, which Task 3 rewrites). Read `src/lib/styles/theme.css` in full to see the existing `:root` and where to insert.

- [ ] **Step 2: Insert the `--of-*` token block into theme.css `:root`**

Copy the `--of-*` declarations from the handoff `colors_and_type.css` `:root` (palette `--of-paper*`/`--of-ink*`/`--of-rule*`/`--of-rust*`/`--of-good`/`--of-warn`/`--of-bad`, type `--of-display`/`--of-body`/`--of-sc`/`--of-mono` + the `--of-fs-*` clamp scale, emboss `--of-btn-emboss*`/`--of-channel-*`, texture `--of-tex-crinkle`/`--of-tex-fiber`, radii/spacing `--of-r-*`/`--of-s-*`) into the existing `:root {}` in `src/lib/styles/theme.css`, after the existing typography families block and before the legacy `--c-*` block (which Task 3 will overwrite). Preserve the existing `--f-*` / `--fs-*` / `--s-*` / `--r-*` legacy vars for now (still consumed; Task 3's bridge does not touch those non-color tokens).

- [ ] **Step 3: Append the `.ds-*` utility classes**

Copy the `.ds-eyebrow`, `.ds-paper`, `.ds-btn`, `.ds-btn-strong`, `.ds-stepper(+ -btn/-val)`, `.ds-bulk-chip`, `.ds-progress(+ -fill/-fill-warn/-fill-bad)`, `.ds-leader`, `.ds-row` rules verbatim from the handoff `colors_and_type.css` to the END of `src/lib/styles/theme.css` (after all existing rules).

- [ ] **Step 4: Verify the stylesheet still parses**

```bash
cd /home/eric/projects/hoosierTrail-ui-pr0 && npm run check 2>&1 | tail -5
```

Expected: svelte-check completes with no NEW errors (the 4 pre-existing `WagonShadows.svelte` reactivity warnings are fine). CSS parse errors would surface in the build; if `npm run check` is clean, the CSS is syntactically valid.

- [ ] **Step 5: Commit**

```bash
cd /home/eric/projects/hoosierTrail-ui-pr0
jj describe -m "feat(ui): merge --of-* tokens + .ds-* utilities into theme.css"
jj new
```

---

## Task 3: Inversion-aware `--c-* → --of-*` alias bridge

**Files:**
- Modify: `src/lib/styles/theme.css` (the legacy `--c-*` color block in `:root`)

Redefine every `--c-*` COLOR token the app consumes so it resolves to its `--of-*` equivalent. This is what flips all ~59 consumers at once. Surfaces → paper; text tokens → ink; borders → ink-soft; accents carry over.

- [ ] **Step 1: Replace the `--c-*` color declarations in `:root`**

In `src/lib/styles/theme.css`, replace the existing `--c-*` color literals (the `BASE PALETTE`, `SEMANTIC STATUS`, gradient-shade, and `BRIGHTER PARCHMENT` groups) with these alias definitions. Keep the non-color legacy vars (`--f-*`, `--fs-*`, `--lh-*`, `--ls-*`, `--s-*`, `--r-*`, `--bw-*`, `--sh-*`, `--t-*`, `--e-*`) untouched.

```css
  /* ---------- LEGACY --c-* → --of-* ALIAS BRIDGE (#ui-redesign PR0) ----------
     The whole app is on the paper palette now. Every --c-* token below
     resolves to a design-system --of-* value. INVERSION-AWARE: surface
     tokens map to paper, TEXT tokens (--c-tan / --c-tan-bright / --c-cream /
     --c-parchment) map to INK so light-on-dark becomes dark-on-light rather
     than vanishing. Bridge is temporary — surface-port PRs migrate files to
     --of-* directly; the final cleanup PR deletes this block. */

  /* surfaces */
  --c-bg:            var(--of-paper);
  --c-bg-raised:     var(--of-paper);
  --c-panel:         var(--of-paper-soft);
  --c-parchment:     var(--of-paper-soft);
  --c-paper:         var(--of-paper-soft);
  --c-parchment-visited: var(--of-paper);
  --c-parchment-trade:   var(--of-paper-soft);
  --c-parchment-end:     var(--of-paper-soft);

  /* borders + rules */
  --c-border:        var(--of-rule);
  --c-wood:          var(--of-ink-soft);
  --c-wood-soft:     var(--of-ink-faded);

  /* text / ink */
  --c-ink:           var(--of-ink);
  --c-tan:           var(--of-ink);
  --c-tan-bright:    var(--of-ink);
  --c-cream:         var(--of-ink);

  /* accents — carry over */
  --c-rust:          var(--of-rust);
  --c-rust-dark:     var(--of-rust-dark);

  /* semantic status — map to --of-* roles */
  --c-good:          var(--of-good);
  --c-sage:          var(--of-good);
  --c-sage-dark:     var(--of-good);
  --c-warn:          var(--of-warn);
  --c-amber-dark:    var(--of-warn);
  --c-danger:        var(--of-bad);
  --c-blood:         var(--of-bad);
  --c-ill-dark:      var(--of-bad);

  /* river (info/water) — keep its distinct blue; no --of- equivalent, so
     retain literal values rather than collapsing into a paper tone */
  --c-river:         #4a6a8c;
  --c-river-pale:    #c8d4dc;
```

Note on `--c-river*`: there is no paper-palette blue, and river/water UI needs a cool hue to read as water. The literals above are muted to sit on parchment (darker/desaturated vs the old `#4a8bc9` which was tuned for dark bg). The trade/town surface-port PR can refine if needed.

- [ ] **Step 2: Verify**

```bash
cd /home/eric/projects/hoosierTrail-ui-pr0 && npm run check 2>&1 | tail -3
```

Expected: clean (no new errors).

- [ ] **Step 3: Commit**

```bash
cd /home/eric/projects/hoosierTrail-ui-pr0
jj describe -m "feat(ui): inversion-aware --c-* to --of-* alias bridge"
jj new
```

---

## Task 4: Rework global element styles to paper

**Files:**
- Modify: `src/lib/styles/theme.css` (the global element rules below `:root`)

The bridge flips token *values*, but several global element rules in theme.css hardcode dark-surface BEHAVIOR (e.g. `button { background: var(--c-rust-dark); color: var(--c-tan-bright); }` now yields rust-bg + ink-text — low contrast). Rework them to the paper treatment.

- [ ] **Step 1: Rework `html, body` base**

Replace the existing `html, body { ... }` rule:

```css
html, body {
  margin: 0;
  padding: 0;
  background: var(--of-paper);
  color: var(--of-ink);
  font-family: var(--of-body);
  font-size: var(--of-fs-body);
  line-height: var(--lh-body);
  min-height: 100vh;
}
```

- [ ] **Step 2: Rework headings + brand + eyebrow**

```css
h1, h2, h3, h4 {
  color: var(--of-ink);
  letter-spacing: 0.02em;
  margin: 0 0 0.5em 0;
  font-family: var(--of-display);
  font-weight: 400;
  line-height: var(--lh-tight);
}
h1 { font-size: var(--of-fs-h1); }
h2 { font-size: var(--of-fs-h2); }
h3 { font-size: var(--of-fs-h3); }
h4 { font-size: var(--of-fs-sub); letter-spacing: 0.08em; color: var(--of-rust); }

.brand { font-family: var(--of-display); font-size: var(--of-fs-display-l); letter-spacing: 0.04em; color: var(--of-rust); font-weight: 400; margin: 0; }
.brand .dot { color: var(--of-ink); }

.eyebrow {
  font-family: var(--of-sc);
  font-size: var(--of-fs-eyebrow);
  letter-spacing: 0.12em;
  font-weight: 400;
  color: var(--of-ink-soft);
  text-transform: uppercase;
}

a { color: var(--of-rust); text-decoration: none; }
a:hover { color: var(--of-rust-dark); text-decoration: underline; }
```

- [ ] **Step 3: Rework `button` + variants to carved paper**

Replace the `button`, `button:hover`, `button.btn-ghost`, `button.btn-danger` rules:

```css
button {
  font-family: var(--of-sc);
  background: var(--of-paper-soft);
  color: var(--of-ink);
  border: 1px solid var(--of-ink-soft);
  border-radius: var(--of-r-sm);
  padding: 0.5em 1em;
  cursor: pointer;
  letter-spacing: 0.06em;
  font-weight: 400;
  text-transform: uppercase;
  box-shadow: var(--of-btn-emboss);
  transition: background var(--t-fast), box-shadow var(--t-fast), border-color var(--t-fast), transform var(--t-fast);
}
button:hover:not(:disabled) { background: var(--of-paper); border-color: var(--of-ink); }
button:active:not(:disabled) { box-shadow: var(--of-btn-emboss-active); transform: translateY(1px); }
button:disabled { opacity: 0.4; cursor: not-allowed; }

/* Primary CTA — rust fill, paper text */
button.btn-strong {
  background: var(--of-rust);
  color: var(--of-paper-soft);
  border-color: var(--of-rust-dark);
  box-shadow: var(--of-btn-emboss-strong);
}
button.btn-strong:hover:not(:disabled) { background: var(--of-rust-dark); }

/* Ghost — secondary; transparent on paper, ink-soft stroke */
button.btn-ghost {
  background: transparent;
  color: var(--of-ink);
  border-color: var(--of-ink-faded);
  box-shadow: none;
}
button.btn-ghost:hover:not(:disabled) { background: rgba(94,60,24,0.08); border-color: var(--of-ink-soft); }

/* Danger — keep the alarm read, on paper */
button.btn-danger {
  background: var(--of-bad);
  color: var(--of-paper-soft);
  border-color: var(--of-rust-dark);
}
button.btn-danger:hover:not(:disabled) { background: #6e1608; }
```

- [ ] **Step 4: Rework `input / select / textarea`**

Replace the input/select/textarea + focus + select-chrome rules:

```css
input, select, textarea {
  font-family: var(--of-body);
  background: var(--of-paper-soft);
  color: var(--of-ink);
  border: 1px solid var(--of-ink-soft);
  padding: 0.4em 0.6em;
  border-radius: var(--of-r-sm);
}
input:focus, select:focus, textarea:focus {
  outline: 0;
  border-color: var(--of-rust);
  box-shadow: 0 0 0 2px rgba(148,52,14,0.25);
}
select {
  appearance: none; -webkit-appearance: none; -moz-appearance: none;
  padding: 0.5em 2em 0.5em 0.8em; cursor: pointer;
  background-image:
    linear-gradient(45deg, transparent 50%, var(--of-rust) 50%),
    linear-gradient(135deg, var(--of-rust) 50%, transparent 50%);
  background-position: calc(100% - 14px) 55%, calc(100% - 8px) 55%;
  background-size: 6px 6px, 6px 6px; background-repeat: no-repeat;
  font-weight: 400; letter-spacing: 0.02em;
}
select:hover:not(:disabled) { border-color: var(--of-rust); }
select:disabled { opacity: 0.55; cursor: not-allowed; }
select option { background: var(--of-paper-soft); color: var(--of-ink); }
```

- [ ] **Step 5: Rework `.panel`, `.modal-body`, `.modal-title`**

```css
.panel {
  background: var(--of-paper-soft);
  border: 3px double var(--of-ink-soft);
  padding: var(--of-s-4);
  border-radius: var(--of-r-sm);
  box-shadow: inset 0 0 0 1px rgba(255,245,220,0.30), 0 1px 0 rgba(0,0,0,0.05), 0 3px 7px rgba(74,46,21,0.12);
}
.modal-body {
  border: 3px double var(--of-ink-soft);
  box-shadow: 0 12px 40px rgba(74,46,21,0.35);
}
.modal-title {
  font-family: var(--of-display);
  font-size: var(--of-fs-h3);
  line-height: 1.2;
  letter-spacing: 0.02em;
  color: var(--of-rust);
  margin: 0;
}
```

- [ ] **Step 6: Verify**

```bash
cd /home/eric/projects/hoosierTrail-ui-pr0 && npm run check 2>&1 | tail -3
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
cd /home/eric/projects/hoosierTrail-ui-pr0
jj describe -m "feat(ui): rework theme.css global element styles to paper treatment"
jj new
```

---

## Task 5: Wire the SC @font-face + point `--of-sc` at it

**Files:**
- Modify: `src/lib/styles/theme.css` (the `@font-face` block at the top)

- [ ] **Step 1: Add the @font-face declaration**

After the existing `@font-face` for `'Rye'` (or alongside the other font faces at the top of theme.css), add:

```css
@font-face {
  font-family: 'IM Fell English SC';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/im-fell-english-sc-latin.woff2') format('woff2');
}
```

- [ ] **Step 2: Confirm `--of-sc` already points at it**

`--of-sc` was merged in Task 2 as `'IM Fell English SC', 'IM Fell English', Georgia, serif`. No change needed — the @font-face now satisfies the first family. Verify the var line exists:

```bash
cd /home/eric/projects/hoosierTrail-ui-pr0 && grep -n "of-sc:" src/lib/styles/theme.css
```

Expected: one line showing `--of-sc: 'IM Fell English SC', ...`.

- [ ] **Step 3: Verify**

```bash
cd /home/eric/projects/hoosierTrail-ui-pr0 && npm run check 2>&1 | tail -3
```

- [ ] **Step 4: Commit**

```bash
cd /home/eric/projects/hoosierTrail-ui-pr0
jj describe -m "feat(ui): @font-face for IM Fell English SC"
jj new
```

---

## Task 6: `/dev/design-system` specimen route

**Files:**
- Create: `src/routes/dev/design-system/+page.svelte`

A visual-diff reference rendering the palette, type scale, and core components on the new paper palette. Mirrors the existing `/dev/*` harness pattern (plain `+page.svelte`, no dev gate — `/dev/scenario` is open in prod by design).

- [ ] **Step 1: Create the specimen page**

```svelte
<script lang="ts">
  // #ui-redesign PR0 — design-system specimen. Visual reference for the
  // 1840s-broadsheet paper palette established in the handoff. Diff target
  // for every surface-port PR. Source: docs/handoff/ui-redesign/Design System.html.
  const palette: Array<[string, string]> = [
    ['--of-paper', 'base rag-paper'],
    ['--of-paper-soft', 'card surface'],
    ['--of-paper-deep', 'section head'],
    ['--of-paper-edge', 'shadowed edge'],
    ['--of-ink', 'body text'],
    ['--of-ink-soft', 'secondary'],
    ['--of-ink-faded', 'tertiary'],
    ['--of-rust', 'primary action'],
    ['--of-rust-dark', 'pressed rust'],
    ['--of-good', 'good'],
    ['--of-warn', 'warn'],
    ['--of-bad', 'bad']
  ];
  const typeScale: Array<[string, string]> = [
    ['--of-fs-h1', 'Display H1 — Rye'],
    ['--of-fs-h2', 'Heading H2 — Rye'],
    ['--of-fs-h3', 'Heading H3 — Rye'],
    ['--of-fs-body', 'Body — IM Fell English'],
    ['--of-fs-sub', 'Sub — IM Fell English'],
    ['--of-fs-label', 'Label — IM Fell English SC'],
    ['--of-fs-eyebrow', 'Eyebrow — IM Fell English SC']
  ];
</script>

<div class="spec">
  <h1 class="brand">OT<span class="dot">.</span>IO Design System</h1>
  <p class="ds-eyebrow">Specimen · paper-broadsheet · PR0 foundation</p>

  <section class="panel">
    <h2>Palette</h2>
    <div class="swatches">
      {#each palette as [token, label]}
        <div class="swatch">
          <div class="chip" style="background: var({token})"></div>
          <code>{token}</code>
          <span class="ds-eyebrow">{label}</span>
        </div>
      {/each}
    </div>
  </section>

  <section class="panel">
    <h2>Typography</h2>
    {#each typeScale as [token, label]}
      <div style="font-size: var({token}); font-family: {label.includes('Rye') ? 'var(--of-display)' : label.includes('SC') ? 'var(--of-sc)' : 'var(--of-body)'};">
        {label}
      </div>
    {/each}
    <p style="font-family: var(--of-mono)">Special Elite numerals — 0123456789 · $1,240 · 142 LB</p>
  </section>

  <section class="panel">
    <h2>Controls</h2>
    <div class="row">
      <button>Default</button>
      <button class="btn-strong">Primary</button>
      <button class="btn-ghost">Ghost</button>
      <button class="btn-danger">Danger</button>
      <button disabled>Disabled</button>
    </div>
    <div class="row">
      <input placeholder="text input" />
      <select><option>select option</option></select>
    </div>
    <div class="row">
      <span class="ds-stepper"><button class="ds-stepper-btn">−</button><span class="ds-stepper-val">12</span><button class="ds-stepper-btn">+</button></span>
      <span class="ds-bulk-chip">×5</span>
    </div>
    <div class="ds-progress" style="max-width:320px"><div class="ds-progress-fill" style="width:62%"></div></div>
  </section>
</div>

<style>
  .spec { max-width: 900px; margin: 0 auto; padding: var(--of-s-8) var(--of-s-4); display: flex; flex-direction: column; gap: var(--of-s-6); }
  .swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: var(--of-s-3); }
  .swatch { display: flex; flex-direction: column; gap: 2px; }
  .chip { height: 44px; border-radius: var(--of-r-sm); border: 1px solid var(--of-ink-soft); }
  .swatch code { font-family: var(--of-mono); font-size: var(--of-fs-chip); }
  .row { display: flex; gap: var(--of-s-3); align-items: center; flex-wrap: wrap; margin-bottom: var(--of-s-3); }
</style>
```

- [ ] **Step 2: Verify it renders + type-checks**

```bash
cd /home/eric/projects/hoosierTrail-ui-pr0 && npm run check 2>&1 | tail -3
```

Expected: clean. (Visual check happens in Task 7's sweep.)

- [ ] **Step 3: Commit**

```bash
cd /home/eric/projects/hoosierTrail-ui-pr0
jj describe -m "feat(ui): /dev/design-system specimen route"
jj new
```

---

## Task 7: Full verify + Playwright screenshot sweep

**Files:** none (verification only)

CSS has no unit tests; the gate is `npm run verify` staying green PLUS a real-browser screenshot sweep confirming the big-bang flip produced no inverted/invisible text (per memory `feedback_verify_ui_myself`).

- [ ] **Step 1: Run the full gate**

```bash
cd /home/eric/projects/hoosierTrail-ui-pr0 && npm run verify 2>&1 | tail -8
```

Expected: `npm run check` 0 errors + full vitest suite passes (~2442 tests on master at PR0 time). No engine logic changed, so tests should be untouched.

- [ ] **Step 2: Start the dev server (systemd-run, not nohup — per project convention)**

```bash
systemd-run --user --unit=ot-dev-uipr0 -p WorkingDirectory=/home/eric/projects/hoosierTrail-ui-pr0 /usr/bin/bash -c 'npm run dev -- --port 5179 > /tmp/dev-uipr0.log 2>&1'
sleep 5 && tail -5 /tmp/dev-uipr0.log
```

- [ ] **Step 3: Screenshot the sweep via Playwright MCP**

Capture and visually inspect each, confirming dark-on-paper text (no light-on-light vanish, no rust-on-rust low-contrast buttons):

1. `http://localhost:5179/dev/design-system` — the specimen (palette chips, type, controls all legible)
2. `http://localhost:5179/` — landing page (brand mark, new-journey entry)
3. `http://localhost:5179/dev/scenario/at_chimney_rock` → lands on `/play` — the live game shell (status bar, party/inventory/wagon panels, action bar, the WagonScene frame)
4. Open one modal from `/play` (e.g. trigger Rest or Visit) — confirm modal chrome is paper, title legible

For each: read the screenshot, list any inverted/invisible/low-contrast spots. These become the triage notes the surface-port PRs (1-8) act on — PR0's bar is "flipped, nothing vanished," NOT "every surface fully designed."

- [ ] **Step 4: Stop the dev server**

```bash
systemctl --user stop ot-dev-uipr0
```

- [ ] **Step 5: Commit any screenshot-driven straggler fixes**

If the sweep finds a global-level inversion the bridge missed (e.g. a token the app uses that wasn't in Task 3's list, or a hardcoded hex in a globally-shared element), fix it in theme.css and re-sweep. Per-surface stragglers (single-component issues) are NOT fixed here — they're logged for the surface-port PRs.

```bash
cd /home/eric/projects/hoosierTrail-ui-pr0
jj describe -m "fix(ui): PR0 global-flip straggler fixes from screenshot sweep"
jj new
```

(Skip this commit if the sweep was clean.)

---

## Task 8: Push + open PR

- [ ] **Step 1: Squash the working commits into a clean foundation set (optional)**

The per-task commits are already well-scoped; leave them as-is unless any are empty. Confirm the bookmark points at the tip:

```bash
cd /home/eric/projects/hoosierTrail-ui-pr0
jj bookmark set feat/ui-pr0-foundation -r @- --allow-backwards
jj git push --bookmark feat/ui-pr0-foundation --allow-new
```

- [ ] **Step 2: Open the PR**

From the default colocated workspace (gh needs `.git`):

```bash
cd /home/eric/projects/hoosierTrail
gh pr create --head feat/ui-pr0-foundation --base master \
  --title "feat(ui): redesign PR0 — paper foundation (token bridge + global elements + SC font + specimen)" \
  --body-file /tmp/ui-pr0-body.md
```

PR body (`/tmp/ui-pr0-body.md`) covers: the inversion-aware bridge, global-element rework, SC font, `/dev/design-system`, and a **"known not-yet-designed surfaces"** list (everything is flipped to paper but surfaces 1-8 are still generic until their port PRs). Include the screenshot-sweep findings.

- [ ] **Step 3: Wait for CI, merge on green**

```bash
gh pr view <N> --json statusCheckRollup -q '.statusCheckRollup[0].detailsUrl'
gh run watch <RUN_ID> --exit-status
gh pr merge <N> --squash --delete-branch
```

- [ ] **Step 4: Cleanup**

```bash
cd /home/eric/projects/hoosierTrail
jj workspace forget hoosierTrail-ui-pr0
rm -rf /home/eric/projects/hoosierTrail-ui-pr0
```

---

## Out of scope (later PRs)

- Per-surface broadsheet design ports (PRs 1-8) — PR0 only flips the palette; surfaces stay generically-flipped until their own ports.
- Migrating files off `--c-*` to `--of-*` directly + deleting the alias bridge — happens during the surface ports + final cleanup (PR 9).
- The travel-scene paper frame — PR 8.
