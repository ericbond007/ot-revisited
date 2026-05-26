#!/usr/bin/env bash
# PreToolUse hook — block Edit/Write/MultiEdit in the shared "default" jj
# workspace at /home/eric/projects/hoosierTrail/.
#
# Why: this project's .jj/ store is shared across workspaces, and the default
# workspace is the one with .git/ colocated. Multiple Claude Code sessions
# sometimes operate against the same repo at once. Each session sharing the
# default workspace shares one @ — when one runs `jj edit <bookmark>` or
# `jj new <commit>`, the on-disk files swap out from under the others, silently
# reverting in-progress edits.
#
# The fix is to spawn a personal workspace (`jj workspace add ../hoosierTrail-<task>`)
# and edit there. This hook enforces it.
#
# Override: set CLAUDE_ALLOW_DEFAULT_WS=1 if you really mean to edit the shared
# default workspace.

set -uo pipefail

DEFAULT_WS_ROOT="/home/eric/projects/hoosierTrail"
CWD="$(pwd -P)"

# Only fire when cwd is exactly the default workspace root OR a subdirectory of
# it. Sibling worktrees (hoosierTrail-research, hoosierTrail-wagon-bg,
# hoosierTrail-claude-hygiene, hoosierTrail-period-gates, etc.) have different
# prefixes and don't match the glob.
case "$CWD" in
  "$DEFAULT_WS_ROOT" | "$DEFAULT_WS_ROOT"/*)
    if [ -n "${CLAUDE_ALLOW_DEFAULT_WS:-}" ]; then
      exit 0
    fi
    cat >&2 <<EOF
🚫 Edit/Write blocked in the shared default jj workspace.

You are at: $CWD
Default workspace: $DEFAULT_WS_ROOT

Multiple Claude sessions edit here at the same time, which causes working-copy
churn: one session's \`jj edit\` / \`jj new\` swaps the on-disk files out from
under the others, silently reverting in-progress edits.

Spawn your own workspace first:

    cd $DEFAULT_WS_ROOT
    jj workspace add ../hoosierTrail-<task-name> -r <base-bookmark-or-master>
    cd ../hoosierTrail-<task-name>

Then re-run your edit there. Each workspace has its own working copy — no
collision.

Override (you know what you're doing): export CLAUDE_ALLOW_DEFAULT_WS=1.

See: project CLAUDE.md → "jj workspace discipline".
EOF
    exit 2
    ;;
esac

exit 0
