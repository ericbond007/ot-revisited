# hoosierTrail — Claude Code project notes

## Pre-commit gate: `npm run verify`

`npm run verify` = `npm run check` (svelte-check / tsc) + `npm test` (vitest). Run it before opening any PR. CI runs the same gate on push + PR via `.github/workflows/verify.yml`. Pinned action SHAs — bump fresh when upgrading.

If `verify` fails, fix it before adding more code. Never `// @ts-ignore` / `as any` past a real type error — type errors are bugs (per global CLAUDE.md "Type errors are bugs" rule).

## Dependency hygiene (post-Shai-Hulud, 2025)

September 2025's `@ctrl/tinycolor` worm (Shai Hulud) showed that "install latest" is no longer safe by default. Policy for this repo:

- **Stay current with minor/patch.** `npm outdated` should show empty most weeks. `npm update` for minor/patch bumps; major bumps in their own PRs with full `verify` runs.
- **Wait 48–72 hours after a release** before bumping a major version of a popular package. Most supply-chain worms get caught within a day; the wait dodges the worst window.
- **Pin GitHub Actions to commit SHA, not tag.** Tags can be moved; SHAs cannot. Format: `actions/checkout@<sha> # v6.0.2`. Resolve SHAs via `curl -sS https://api.github.com/repos/<owner>/<action>/git/ref/tags/<tag> | jq -r .object.sha`.
- **Scan before adding new packages.** Use socket.dev or `npm audit` on a fresh tree before `npm install <new-pkg>`. Reject AI-suggested obscure packages without verifying maintainer / publication history.
- **Never blindly accept regenerated lockfiles.** If `package-lock.json` regenerates with unexpected diff size, inspect — supply-chain attacks commonly land via lockfile poisoning.

### Known transitive vulns (accepted, tracked)

- `drizzle-kit@0.31.x` pulls in deprecated `@esbuild-kit/*` chain → 7 esbuild vulns (3 low, 4 moderate). Drizzle is refactoring out @esbuild-kit upstream; no fixed version yet (even 1.0.0-beta still affected). drizzle-kit is devDependency-only (used by `db:push`/`db:studio`/`db:generate`) — not in runtime bundle, scoped impact. Re-check on each drizzle-kit minor bump.



## Version control: jj (Jujutsu) colocated with git

This project uses **jj** for branch management, colocated with git (`.git/` and `.jj/` coexist). Both tools work; `jj` is the preferred interface because it lets you switch between branches in the same folder without stash/worktree juggling.

GitHub still works normally — `jj git push` / `jj git fetch` round-trip to `origin` (`git@github.com:ericbond007/ot-revisited.git`).

### Daily commands you'll actually use

| Goal | Command |
|------|---------|
| See where you are | `jj log` (recent ancestry) or `jj log -r 'all()'` (everything) |
| See working copy diff | `jj st` |
| Switch to a branch in-place (no stash needed) | `jj edit <bookmark-or-rev>` — e.g. `jj edit feat/wagon-view-raster` |
| Start a new change off the current spot | `jj new` (creates a fresh empty change as your working copy) |
| Start a new change off master | `jj new master` |
| Describe (commit-message) the working copy | `jj describe -m "feat(x): ..."` |
| Move bookmark (branch pointer) to current change | `jj bookmark set <name> -r @` (use `--allow-backwards` if going backwards) |
| Create a new bookmark | `jj bookmark create <name>` |
| Push a bookmark to GitHub | `jj git push --bookmark <name>` |
| Fetch from GitHub | `jj git fetch` |
| Rebase a branch onto another | `jj rebase -b <bookmark> -d <dest>` |

### Mental-model translation from git

- **Bookmark ≈ branch.** jj uses "bookmark" because the underlying primitive is "named pointer to a commit," same as git. `jj git push --bookmark feat/x` is the same effect as `git push origin feat/x`.
- **Working copy is always a commit.** jj auto-commits your edits as a "working-copy commit" (no description). When you `jj edit <other>`, the previous working-copy commit stays on its branch automatically. **No stash required.**
- **Conflicts are first-class.** A change can have unresolved conflicts and still be committed. `jj st` shows them; `jj resolve` runs the merge tool.
- **Operations are reversible.** `jj op log` shows every operation; `jj op restore <op-id>` undoes anything. There is no "lost work" failure mode.

### What NOT to do

- **Don't use `git checkout` / `git reset --hard` / `git stash`** while a jj working copy is dirty — you'll desync the colocated state. If you need to drive git directly, run `jj abandon` or `jj squash` first to make the working copy a clean commit.
- **Don't run `git clean -xdf`** — it deletes `.jj/`. Use `jj abandon` to discard a change instead.
- **Don't `git push` directly** unless you know you want to bypass jj's bookmark tracking. Prefer `jj git push --bookmark <name>`.

### Caveats specific to this project

- **Single-folder layout (consolidated 2026-05-23).** All work happens in this one repo path. A `hoosierTrail-wagon-bg/` sibling worktree was retired because its stale fork-point hid semantic conflicts at merge time (the `WagonAddons` drift post-mortem). The LoRA training data that used to justify the sibling now lives at `~/datasets/ot-revisited/lora-train/` (~2.5 GB, gitignored-by-virtue-of-being-outside-the-repo; needed only when retraining the `ht_landscape` LoRA — see the `hoosiertrail-render-pipeline` skill).
- **Vite dev server**: `npm run dev` defaults to port 5173 from this repo.

### Common workflows

**Start a new feature off master:**
```
jj git fetch
jj new master
jj describe -m "feat(x): start"
# ...edit files, jj auto-commits to working copy...
jj describe -m "feat(x): real first commit message"
jj bookmark create feat/x -r @
jj git push --bookmark feat/x
```

**Switch to an existing branch to make a small change, then come back:**
```
jj edit feat/some-other  # working copy switches in-place
# ...edit, save...
jj describe -m "fix: small thing"
jj git push --bookmark feat/some-other
jj edit feat/x           # back to where you were, your prior work is preserved
```

**Update a branch from master (rebase):**
```
jj git fetch
jj rebase -b feat/x -d master
jj git push --bookmark feat/x  # may need --allow-new if first push of rebased state
```

### Identity

```
user.name  = "Eric Bond"
user.email = "ericbond007@gmail.com"
```
Set globally via `jj config set --user`. Already configured on flattop.

## jj workspace discipline — concurrent Claude sessions

This project frequently has multiple Claude Code sessions running at the same
time (one fixing a bug, one doing visual work, etc.). They all share one `.jj/`
store. The **default** workspace at `/home/eric/projects/hoosierTrail/` is the
one with `.git/` colocated — and every session inside it shares the same `@`.
When one session runs `jj edit <bookmark>` or `jj new <commit>`, the on-disk
files swap out from under the others. In-progress edits silently revert. This
has burned hours.

**Rule: before any code-edit work, spawn your own workspace.**

```
cd /home/eric/projects/hoosierTrail
jj workspace add ../hoosierTrail-<task-name> -r <base-bookmark-or-master>
cd ../hoosierTrail-<task-name>
# Edit, npm run dev, verify, push, PR. Each workspace has its own @.
```

Cleanup when the branch lands:

```
jj workspace forget <task-name>
rm -rf /home/eric/projects/hoosierTrail-<task-name>
```

A PreToolUse hook at `.claude/hooks/block-default-workspace-edits.sh` enforces
this — `Edit` / `Write` / `MultiEdit` fail when the edit *targets* a file in
the default workspace (judged by `tool_input.file_path`; edits to sibling
workspaces, plan files, and memory files pass). Override (you really mean to edit the shared default): export
`CLAUDE_ALLOW_DEFAULT_WS=1`.

### Existing long-lived workspaces — do not disturb

- `hoosierTrail-research/` — landmark research corpus, anchored to bookmark
  `research-stable-2026-05-25`. Stores ~7 MB of gitignored CDL excerpts under
  `docs/historical-pass/sources/` that can NOT be restored from git history if
  swapped out.
- `hoosierTrail-wagon-bg/` — git-only sibling worktree (NOT a jj workspace,
  no `.jj/`). Holds the large blender models + LoRA training data outside the
  jj snapshot ceiling.

## FLUX landmark backdrops — no SVG decorative overlay

When a per-landmark FLUX backdrop ships at `static/wagon-bg/landmarks/<id>.webp`
(via `tools/wagon-bg/render_landmark.py`), the matching `<Name>Art.svelte`
component must contain ONLY the `<image href>` element. Strip every
decorative `<path>`/`<g>`/`<text>` from the component.

**Why:** the hand-drawn SVG vector layer (carved silhouettes, tiny
wagons, italic captions) does not blend visually with the painterly
oil-on-canvas raster. Side-by-side comparison at chimney_rock
(PR #185 vs the SVG-stripped follow-up) was clear — the painted
backdrop reads as finished period art on its own; the SVG over it
looks like a vector mockup pasted on top of a painting.

Pattern for a FLUX-backed component:

```svelte
<script lang="ts">
  import { LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';
</script>

<g>
  <image
    href="/wagon-bg/landmarks/<id>.webp?v=N"
    x="0" y="0" width={LMK_VIEW_W} height={LMK_VIEW_H}
    preserveAspectRatio="xMidYMid slice" />
</g>
```

The decorative SVG remains valuable for landmarks WITHOUT a FLUX backdrop
yet — strip only after the raster lands. The "show SVG overlay" toggle on
`/dev/landmark-art` confirms the visual decision (uncheck to evaluate
the raster standalone).
