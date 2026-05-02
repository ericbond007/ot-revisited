# hoosierTrail — Claude Code project notes

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

- **There is a sibling git worktree at `/home/eric/projects/hoosierTrail-wagon-bg/`** that holds the painted-backdrop generation tooling (`tools/wagon-bg/lora-train/` is ~2.5GB of LoRA training data) and historical experiment outputs. It was set up before jj adoption. Either path is a valid working copy of the same repo; jj operations from either path affect the same `.jj/` store (which lives at this repo, not in the worktree).
- **Same bookmark can't be checked out at two paths simultaneously** (git's rule, jj inherits it). If `feat/wagon-view-raster` is checked out at wagon-bg and you want to work on it from here, either remove the wagon-bg worktree (`git worktree remove ../hoosierTrail-wagon-bg`) or use `jj workspace add` (jj's worktree equivalent) for a fresh path.
- **Vite dev server**: from this repo, `npm run dev` defaults to port 5173. The wagon-bg worktree may already be using 5173 — pass `--port 5174` if so.

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
