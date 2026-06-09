# Steam Deck spike — play hoosierTrail on the Deck today

Decision evidence for the engine-path question (strategy doc §5). ~20 min
setup, then ~30 min on the couch. **Out of scope:** gamepad-native focus
navigation — sizing that gap is the point of this exercise.

## 1. Serve the game on the LAN (on flattop)

```
cd ~/projects/hoosierTrail
systemd-run --user --unit=ot-deck-spike npm run dev -- --host
# stop later with: systemctl --user stop ot-deck-spike
```

Note flattop's LAN IP (`ip -4 addr show | grep 10.0.0`). The game is then at
`http://<flattop-ip>:5173`.

## 2. One-time Deck setup (Desktop Mode)

| Step | Command / action |
|---|---|
| Install a browser | `flatpak install flathub org.chromium.Chromium` |
| Copy this folder | `scp -r flattop:~/projects/hoosierTrail/tools/deck-spike ~/` |
| Add to Steam | Steam → Games → *Add a Non-Steam Game* → *Browse* → `~/deck-spike/launch-hoosiertrail.sh` |
| Set the URL | In the shortcut's *Properties* → *Launch Options*: `GAME_URL=http://<flattop-ip>:5173 %command%` |
| Name it | Rename the shortcut "Hoosier Trail (spike)" |

## 3. Controller mapping (Game Mode)

Open the shortcut's controller settings → use the **Web Browser** community
template as the base, or set manually:

| Input | Binding |
|---|---|
| Right trackpad | Mouse pointer (trackball, medium sensitivity) |
| Right trigger (R2) | Left click |
| A | Left click |
| B | Esc (closes modals) |
| Left stick | Scroll wheel |
| D-pad | Arrow keys |
| X | Enter |
| Start | F11 (fullscreen toggle) |

## 4. What to evaluate (report back to HAL)

1. **Readability** at 1280x800 from couch distance — body text, the stat
   panels, modal text. Where does it strain?
2. **Pointer play** — is trackpad-as-mouse acceptable for a session, or does
   every modal scream for D-pad focus navigation?
3. **Feel** — launch from Game Mode, fullscreen, suspend/resume. Does it read
   as "a game on my Deck" or "a website in a costume"?
4. **Latency** — any input lag over LAN?

Findings go into strategy doc §5 before the engine-path decision.
