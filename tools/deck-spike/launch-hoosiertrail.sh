#!/usr/bin/env bash
# hoosierTrail Steam Deck spike launcher.
#
# Purpose: play the CURRENT web game on the Deck as a non-Steam game, to
# evaluate web-on-Deck feel (readability at 1280x800, fullscreen launch,
# Steam Input latency) BEFORE the engine-path decision. This is decision
# evidence, not product code — see docs/superpowers/specs/
# 2026-06-09-platform-and-multiplayer-strategy.md §5.
#
# Usage:
#   GAME_URL=http://<host>:5173 ./launch-hoosiertrail.sh
#
# GAME_URL points at a running dev server or node build on the LAN
# (see README.md for starting one on flattop). No server runs on the Deck.

set -euo pipefail

GAME_URL="${GAME_URL:-}"
if [ -z "$GAME_URL" ]; then
  echo "GAME_URL is required, e.g. GAME_URL=http://10.0.0.5:5173 $0" >&2
  exit 1
fi

# Find a chromium-family browser. SteamOS ships none by default; install one
# in Desktop Mode first:  flatpak install flathub org.chromium.Chromium
ARGS=(--app="$GAME_URL" --window-size=1280,800 --start-fullscreen
      --no-first-run --disable-session-crashed-bubble)

if command -v flatpak >/dev/null 2>&1 && flatpak info org.chromium.Chromium >/dev/null 2>&1; then
  exec flatpak run org.chromium.Chromium "${ARGS[@]}"
elif command -v flatpak >/dev/null 2>&1 && flatpak info com.google.Chrome >/dev/null 2>&1; then
  exec flatpak run com.google.Chrome "${ARGS[@]}"
elif command -v chromium >/dev/null 2>&1; then
  exec chromium "${ARGS[@]}"
elif command -v google-chrome >/dev/null 2>&1; then
  exec google-chrome "${ARGS[@]}"
else
  echo "No chromium-family browser found. In Desktop Mode:" >&2
  echo "  flatpak install flathub org.chromium.Chromium" >&2
  exit 1
fi
