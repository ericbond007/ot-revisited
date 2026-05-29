# UI Redesign PR7 — Camp + Landmark Stages Restyle Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]` checkboxes.

**Goal:** Port CampStage + LandmarkStage off the `--c-*` bridge to `--of-*` broadsheet paper (TownStage was done in PR3). Mechanical migration + contrast fix; no logic changes.

**Tech Stack:** SvelteKit 5, TypeScript, vitest, svelte-check. jj (not git).

## Scope
| File | lines | --c- refs |
|---|---|---|
| `src/lib/ui/CampStage.svelte` | 548 | 34 (rust-bg buttons present) |
| `src/lib/ui/LandmarkStage.svelte` | 321 | 8 |

All tokens in-bridge: wood, rust, rust-dark, ink, tan, tan-bright, panel, bg-raised, parchment. No dark scrim (inline stages, not modals).

## Bridge mapping
`--c-bg-raised`→`--of-paper`, `--c-parchment`/`--c-panel`→`--of-paper-soft`, `--c-border`→`--of-rule`, `--c-wood`→`--of-ink-soft`, `--c-tan-bright`/`--c-tan`/`--c-cream`/`--c-ink`→`--of-ink`, `--c-rust-dark`→`--of-rust-dark`, `--c-rust`→`--of-rust`. (Plus status colors if any appear: `--c-good`→`--of-good`, `--c-warn`/`--c-amber-dark`→`--of-warn`, `--c-danger`/`--c-blood`→`--of-bad`.)

**Contrast pitfall (PR2–PR6):** after migrating, any `color: var(--of-ink)`/`--of-ink-soft` on a `--of-rust`/`--of-rust-dark` *background* must become `var(--of-paper-soft)`.

---

### Task 1: Migrate the 2 stages off `--c-*` + contrast fix

**Files:** `src/lib/ui/CampStage.svelte`, `src/lib/ui/LandmarkStage.svelte`.

- [ ] **Step 1: Pre-check** — `for f in src/lib/ui/CampStage.svelte src/lib/ui/LandmarkStage.svelte; do echo "== $f =="; grep -oE -- '--c-[a-z-]+' "$f" | sort -u; done`. All must be in the mapping; if a new one appears, look it up in `src/lib/styles/theme.css`.

- [ ] **Step 2: Migrate**
```bash
cd /home/eric/projects/hoosierTrail-ui-pr7
for f in src/lib/ui/CampStage.svelte src/lib/ui/LandmarkStage.svelte; do
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
    -e 's/--c-amber-dark/--of-warn/g' \
    -e 's/--c-good/--of-good/g' \
    -e 's/--c-warn/--of-warn/g' \
    -e 's/--c-danger/--of-bad/g' \
    -e 's/--c-blood/--of-bad/g' \
    "$f"
done
grep -c -- '--c-' src/lib/ui/CampStage.svelte src/lib/ui/LandmarkStage.svelte
```
Each count MUST be 0.

- [ ] **Step 3: Contrast scan + fix** (CampStage has rust-bg buttons):
```bash
cd /home/eric/projects/hoosierTrail-ui-pr7
for f in src/lib/ui/CampStage.svelte src/lib/ui/LandmarkStage.svelte; do echo "== $f =="; grep -nE 'background:[^;]*--of-rust|background-color:[^;]*--of-rust' "$f"; done
```
For each `--of-rust`/`--of-rust-dark`-background rule whose text `color:` is now `var(--of-ink)`/`--of-ink-soft`, change to `var(--of-paper-soft)`. Include `:hover`/`.active`/`.selected`/`.primary` state rules that flip a background to rust. Leave `color: var(--of-rust)` text and `button:hover` rust-fill overrides alone. Report what changed / left.

- [ ] **Step 4: Verify** — `cd /home/eric/projects/hoosierTrail-ui-pr7 && npm run check && npx vitest run` (0 errors; all tests pass).

- [ ] **Step 5: Commit** — `jj commit -m "feat(ui): migrate camp + landmark stages off --c-* bridge to broadsheet paper (PR7)"`.

---

### Task 2: Verify + Playwright sweep + PR (controller-driven)

- [ ] **Step 1:** `npm run verify`.
- [ ] **Step 2:** `systemd-run --user --unit=ot-pr7-dev --working-directory="$PWD" npm run dev -- --port 5185`; confirm 200. (Vite `@fs` 403 in a separate jj workspace is a known cosmetic artifact.)
- [ ] **Step 3:** Playwright — CampStage: on a travel scenario (`at_kearny`) click **Rest** (or the camp action) to enter CampStage → screenshot; LandmarkStage: `at_chimney_rock` (a non-town landmark) → the landmark stage renders → screenshot. Confirm broadsheet paper, readable rust buttons, no inverted/invisible text. Add a Task 3 polish only if a stage visibly diverges beyond tokens.
- [ ] **Step 4:** `systemctl --user stop ot-pr7-dev`.
- [ ] **Step 5:** Residue — `grep -rc -- '--c-'` across both stages → 0.
- [ ] **Step 6:** PR — push `feat/ui-pr7-stages`; `gh pr create` from the colocated default workspace, base master. PR7 of the rollout.

---

## Self-Review
- **Spec coverage:** CampStage + LandmarkStage migrated (Task 1) + verified (Task 2). ✅
- **Placeholders:** none — sed table concrete; contrast procedure pre-specified.
- **Risk:** mechanical; only judgement is CampStage rust-button contrast (pre-flagged).

## Execution
subagent-driven-development: Task 1 → one implementer + review; Task 2 controller-driven.
