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

# Judge by where the edit LANDS, not where the session sits. PreToolUse hooks
# receive the tool call as JSON on stdin; the edit target is at
# .tool_input.file_path. A session anchored in the default workspace
# legitimately edits files in sibling jj workspaces, plan files under
# ~/.claude/plans/, and memory files — all outside the default workspace, all
# collision-safe, all previously false-positive blocked (2026-06-09). Fall
# back to the old cwd check when stdin yields no path (defensive: jq missing,
# unexpected payload).
TARGET=""
if command -v jq >/dev/null 2>&1; then
  TARGET="$(jq -r '.tool_input.file_path // empty' 2>/dev/null || true)"
fi
if [ -z "$TARGET" ]; then
  TARGET="$(pwd -P)"
elif [ "${TARGET#/}" = "$TARGET" ]; then
  # Relative target paths resolve against the session cwd.
  TARGET="$(pwd -P)/$TARGET"
fi

# Only fire when the target is the default workspace root or inside it.
# Sibling workspaces (hoosierTrail-research, hoosierTrail-code-health, etc.)
# have different prefixes and don't match the glob.
case "$TARGET" in
  "$DEFAULT_WS_ROOT" | "$DEFAULT_WS_ROOT"/*)
    if [ -n "${CLAUDE_ALLOW_DEFAULT_WS:-}" ]; then
      exit 0
    fi
    cat >&2 <<EOF
🚫 Edit/Write blocked in the shared default jj workspace.

Edit target: $TARGET
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
