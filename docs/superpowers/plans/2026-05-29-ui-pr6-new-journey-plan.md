# UI Redesign PR6 — New-Journey Flow + Brand-Lockup Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]` checkboxes.

**Goal:** Port the new-journey surfaces off the `--c-*` bridge to `--of-*` broadsheet paper, and fix the deferred landing brand-lockup straggler (the wordmark SVG has baked-in colors — a cream `.` separator that vanishes on paper).

**Architecture:** PR6 of the rollout. Mechanical token migration of 3 surfaces (same bridge-backed no-op + contrast pattern as PR3–PR5) + a static recolor of `wordmark.svg` to the broadsheet `--of` palette. No logic changes.

**Tech Stack:** SvelteKit 5, TypeScript, vitest, svelte-check. jj (not git).

## Scope
| File | --c- refs | note |
|---|---|---|
| `src/routes/+page.svelte` (landing) | 3 | `--c-rust` (wordmark color), `--c-wood` (subtitle/tagline) |
| `src/routes/load/+page.svelte` | 2 | `--c-rust`, `--c-wood` |
| `src/lib/ui/NewJourneyWizard.svelte` | 18 | `--c-rust`(9), `--c-wood`(6), `--c-ink`(2), `--c-parchment`(1) |
| `src/lib/assets/brand/wordmark.svg` | — | brand-lockup recolor (the straggler) |

No rust-bg buttons in these files (the pre-scan found none) — but run the contrast scan anyway. `BrandLockup.svelte` is token-free (inherits `currentColor`) — no change needed.

## Bridge mapping (subset used here)
`--c-rust`→`--of-rust`, `--c-rust-dark`→`--of-rust-dark`, `--c-wood`→`--of-ink-soft`, `--c-ink`→`--of-ink`, `--c-tan`/`--c-tan-bright`/`--c-cream`→`--of-ink`, `--c-parchment`/`--c-panel`→`--of-paper-soft`, `--c-bg-raised`→`--of-paper`, `--c-border`→`--of-rule`. (Full safe-ordered sed below.)

**Contrast pitfall (PR2–PR5):** light text on a `--of-rust` *background* must use `--of-paper-soft`, not `--of-ink`.

## Brand-lockup fix — the collision
`wordmark.svg` baked fills, designed for the old dark theme:
- `OT` / `IO` text → `#c96a2a` (bright orange, off-palette vs broadsheet `--of-rust` `#94340e`)
- `.` separator → `#f5e6c8` (light cream — **invisible on the `#e8d4a8` paper background: the collision**)
- `OREGON TRAIL · REVISITED` sub → `#8a5a2a`
- top dashed rule → `stroke="#5a3a1a"`

Recolor to the `--of` palette so the wordmark reads as a period broadsheet masthead on paper:
- `#c96a2a` → `#94340e` (of-rust — the masthead title)
- `#f5e6c8` → `#5e1f08` (of-rust-dark — a deep accent dot that reads on paper)
- `#8a5a2a` → `#5a3f1c` (of-ink-soft — the sub line)
- `#5a3a1a` → `#8a6a3c` (of-ink-faded — the soft rule)

---

### Task 1: Migrate the 3 new-journey surfaces off `--c-*`

**Files:** `src/routes/+page.svelte`, `src/routes/load/+page.svelte`, `src/lib/ui/NewJourneyWizard.svelte`.

- [ ] **Step 1: Pre-check** — `for f in src/routes/+page.svelte src/routes/load/+page.svelte src/lib/ui/NewJourneyWizard.svelte; do echo "== $f =="; grep -oE -- '--c-[a-z-]+' "$f" | sort -u; done` (all must be in the mapping; if not, look up in `src/lib/styles/theme.css`).

- [ ] **Step 2: Migrate**
```bash
cd /home/eric/projects/hoosierTrail-ui-pr6
for f in src/routes/+page.svelte src/routes/load/+page.svelte src/lib/ui/NewJourneyWizard.svelte; do
  sed -i \
    -e 's/--c-bg-raised/--of-paper/g' \
    -e 's/--c-parchment/--of-paper-soft/g' \
    -e 's/--c-panel/--of-paper-soft/g' \
    -e 's/--c-border/--of-rule/g' \
    -e 's/--c-wood/--of-ink-soft/g' \
    -e 's/--c-tan-bright/--of-ink/g' \
    -e 's/--c-tan/--of-ink/g' \
    -e 's/--c-cream/--of-ink/g' \
    -e 's/--c-ink/--of-ink/g' \
    -e 's/--c-rust-dark/--of-rust-dark/g' \
    -e 's/--c-rust/--of-rust/g' \
    "$f"
done
grep -c -- '--c-' src/routes/+page.svelte src/routes/load/+page.svelte src/lib/ui/NewJourneyWizard.svelte
```
Each count MUST be 0.

- [ ] **Step 3: Contrast scan** — `for f in src/routes/+page.svelte src/routes/load/+page.svelte src/lib/ui/NewJourneyWizard.svelte; do echo "== $f =="; grep -nE 'background:[^;]*--of-rust' "$f"; done`. For any `--of-rust`-background rule with `color: var(--of-ink)`/`--of-ink-soft`, change to `var(--of-paper-soft)`. (Pre-scan found none, but verify — the wizard's CTA/confirm buttons may use the global `.cta`/button chrome rather than a local rust bg.)

- [ ] **Step 4: Verify** — `cd /home/eric/projects/hoosierTrail-ui-pr6 && npm run check && npx vitest run` (0 errors; all tests pass).

- [ ] **Step 5: Commit** — `jj commit -m "feat(ui): migrate new-journey flow off --c-* bridge to broadsheet paper (PR6)"`.

---

### Task 2: Brand-lockup fix (recolor wordmark.svg)

**Files:** `src/lib/assets/brand/wordmark.svg`.

- [ ] **Step 1: Recolor to the --of palette**
```bash
cd /home/eric/projects/hoosierTrail-ui-pr6
sed -i \
  -e 's/#c96a2a/#94340e/g' \
  -e 's/#f5e6c8/#5e1f08/g' \
  -e 's/#8a5a2a/#5a3f1c/g' \
  -e 's/#5a3a1a/#8a6a3c/g' \
  src/lib/assets/brand/wordmark.svg
cat src/lib/assets/brand/wordmark.svg
```
Confirm: OT/IO = `#94340e`, `.` = `#5e1f08`, sub = `#5a3f1c`, rule stroke = `#8a6a3c`. No `#f5e6c8`/`#c96a2a` remain.

- [ ] **Step 2: Verify** — `npm run check && npx vitest run` (green; an SVG-asset change won't affect types/tests but confirm nothing imports a removed color).

- [ ] **Step 3: Commit** — `jj commit -m "fix(ui): recolor wordmark to broadsheet palette — cream separator was invisible on paper (PR6)"`.

---

### Task 3: Verify + Playwright sweep + PR (controller-driven)

- [ ] **Step 1:** `npm run verify`.
- [ ] **Step 2:** `systemd-run --user --unit=ot-pr6-dev --working-directory="$PWD" npm run dev -- --port 5184`; confirm 200. (Vite `@fs` 403 in a separate jj workspace is a known cosmetic artifact — SSR render + verify are the real gates.)
- [ ] **Step 3:** Playwright — `/` (landing): screenshot; confirm the wordmark reads as a broadsheet masthead on paper with a **visible** `.` separator (not the invisible cream dot), subtitle/tagline legible. Click "Start a New Journey" → NewJourneyWizard step 1 + step 2: screenshot; confirm paper styling, readable CTAs, no inverted/invisible text. Visit `/load`: screenshot (note it may be empty/disabled if no saves — that's fine; confirm paper).
- [ ] **Step 4:** `systemctl --user stop ot-pr6-dev`.
- [ ] **Step 5:** Residue — `grep -rc -- '--c-'` across the 3 surfaces → 0; `grep -c '#f5e6c8\|#c96a2a' src/lib/assets/brand/wordmark.svg` → 0.
- [ ] **Step 6:** PR — push `feat/ui-pr6-new-journey`; `gh pr create` from the colocated default workspace, base master, body covering the 3-surface migration + the wordmark recolor (closes the PR0 brand-lockup straggler). PR6 of the rollout.

---

## Self-Review
- **Spec coverage:** NewJourneyWizard + landing + /load migrated (Task 1); brand-lockup collision fixed (Task 2); verified (Task 3). ✅
- **Placeholders:** none — sed tables + exact hex swaps concrete.
- **Risk:** small PR; the only judgement is the `.` separator's new color (rust-dark, chosen to read on paper) — confirm visually in Task 3.

## Execution
subagent-driven-development: one implementer does Task 1 then Task 2 (two commits) + review; Task 3 controller-driven.
