# Manual playtest checklist (4 players, one machine)

Setup: `npm install && npm run dev`. Open http://localhost:5173 in **four separate windows**. Use at least one private/incognito window or a second browser so localStorage differs. Plain tabs in one browser also work. Use DevTools device mode (e.g. iPhone SE, 375 px) for one of them.

## Lobby
- [ ] Landing: logo animates in, "How to play" opens a 3-step carousel (arrow keys work, Esc closes).
- [ ] Create a room with an empty name → "Pick a name first!" error; with a name → lobby with a 6-char code, URL is `/r/CODE`.
- [ ] "Invite link" copies `http://localhost:5173/r/CODE`; open it in the other windows, and the code field is pre-filled.
- [ ] Join with a rude name (e.g. `sh1t`) → shown masked as `****`.
- [ ] Wrong code → "Room not found" screen; "Back to the start" returns to the landing page.
- [ ] Each player has a different colour, a numbered, patterned badge, and the host has a 👑.
- [ ] Ready toggles update live for everyone; "Start game" stays disabled below 4 players.
- [ ] Host changes rounds, times, categories, difficulty and toggles → other windows update live and can't edit.
- [ ] Host adds a custom pair (e.g. `pineapple / coconut`): non-hosts see only "1 custom word pair".
- [ ] Host kicks a player → that window shows "You were removed"; they can rejoin with the link.
- [ ] Chat works in the lobby; a rude word is masked.

## Round
- [ ] Role reveal: card hides the word until pressed and held (mouse, touch, or Space on the focused card). Exactly one window has a different word. With "Faker knows" on, that window says "You are the FAKER".
- [ ] Drawing: all four draw at once; strokes appear live in each other's colours, and the right sidebar or top strip pulses "drawing…".
- [ ] Brush sizes (1/2/3), eraser (E) removes only your own ink, undo (Ctrl+Z) max 3 per round, "Clear your lines".
- [ ] Word reminder chip hides and shows your word. Chat input is disabled.
- [ ] Countdown ring turns red and ticks in the last 5 s; drawing stops exactly at 0.
- [ ] Mobile window: canvas on top, one-row toolbar at the bottom, touch drawing works, no sideways scrolling.
- [ ] Gallery: replay plays, pause/play, x1/x2/x4 and scrubbing work; tapping a player chip isolates their lines; emoji reactions float up in every window.
- [ ] Voting: each card shows a thumbnail of only that player's lines; your own card is disabled; "Lock vote" stamps LOCKED; "X/Y voted" updates; voting ends early when all have voted.
- [ ] Reveal: votes flip one by one with a drum roll, then the Faker is spotlighted. Caught → confetti and "CAUGHT!"; escaped → sneaky fox.
- [ ] If caught: the Faker gets a guess box (others see "is trying to guess…"). A typo or plural of the real word counts as correct (e.g. `pinapples`).
- [ ] Round results: both words side by side, outcome banner, animated score bars with +N, rank arrows from round 2 on, speed-bonus line. Chat is enabled.

## Robustness
- [ ] Reload a window mid-drawing → back in the same seat with the full canvas.
- [ ] Close a window and reopen the room link within 60 s → same seat. After 60 s → seat released.
- [ ] Close the host's window → someone else gets 👑 and a "… is now the host" toast.
- [ ] Two players leave mid-game → game ends early with "results so far".
- [ ] Stop the server (Ctrl+C) → "Connection lost, reconnecting…" banner; restart → the room is gone, and players see a clear message.

## Final results & settings
- [ ] Podium (top 3) and awards (Master Bluffer, Bloodhound, Picasso, Scribble Disaster, Speed Demon, as earned).
- [ ] "Share result" downloads a PNG with the best drawing (native share sheet on phones).
- [ ] "Play again" (host) returns everyone to the lobby with scores reset and the same players.
- [ ] ⚙️ panel: volume slider and mute, Day/Night theme (night notebook), Reduced motion (no confetti, instant replay).
- [ ] Keyboard only: Tab through landing → lobby → vote cards; focus rings are visible.
- [ ] Screen reader (NVDA/VoiceOver): phase changes are announced ("Voting time…").
- [ ] Ink limit on: ink meter drains; drawing stops with "Out of ink!". Blind draw on: you see only your own lines until the gallery.
