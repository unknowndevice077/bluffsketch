# Bluff Sketch

A real-time multiplayer drawing-and-bluffing party game. Everyone gets the same secret word, except the **Faker**, who gets a similar but different one. Everyone draws at once on one shared canvas, then votes on who was faking it. A caught Faker gets one guess at the real word to steal the win.

- **4–10 players**, rooms with a 6-character code and a shareable link (`/r/ABC123`)
- **Server-authoritative**: roles, timers, strokes and scoring all live on the server
- **Custom stroke engine**: pointer events (mouse, touch, pen pressure), quadratic smoothing, per-player layers
- **Reconnect-safe**: reload or drop your connection and get your seat back within 60 s

## Quick start

Requires Node.js 20+ (22 recommended).

```bash
npm install
npm run dev
```

`npm install` also builds the shared package. `npm run dev` starts three processes with `concurrently`:

| Process | What it does | URL |
| --- | --- | --- |
| `shared` | `tsc --watch` for shared types | - |
| `server` | Express + Socket.IO via `tsx watch` | http://localhost:3001 |
| `client` | Vite dev server (proxies `/socket.io` to the server) | http://localhost:5173 |

Open http://localhost:5173 in four tabs (or four browsers) to play. Because Vite listens on your LAN (`--host`), phones on the same Wi-Fi can join via `http://<your-computer-ip>:5173`.

## Scripts (repository root)

| Script | Description |
| --- | --- |
| `npm run dev` | Everything in watch mode |
| `npm run build` | Builds shared, server (`server/dist`) and client (`client/dist`) |
| `npm start` | Runs the built server (`node server/dist/index.js`) |
| `npm run typecheck` | Strict type-check of all packages |
| `npm run simulate` | Headless 4-bot playtest against a running server (≈90 s); exits non-zero on failure |

## Project layout

```
bluffsketch/
├── package.json              # npm workspaces + root scripts
├── tsconfig.base.json        # strict TS settings shared by all packages
├── docker-compose.yml        # server + nginx-served client
├── render.yaml               # Render blueprint for the server
├── .env.example
├── TESTING.md                # manual 4-player playtest checklist
├── shared/src/
│   ├── constants.ts          # scoring, timings, limits, rate limits (tweak here)
│   ├── types.ts              # game state, snapshot, strokes, results
│   ├── events.ts             # every Socket.IO event with payload types
│   ├── schemas.ts            # zod validation for every client payload
│   ├── settings.ts           # default room settings
│   ├── categories.ts palette.ts avatars.ts
│   ├── fuzzy.ts              # Levenshtein guess matching
│   ├── profanity.ts          # name/chat filter
│   └── geometry.ts           # ink (path length) accounting
├── server/
│   ├── data/wordPairs.json   # 344 word pairs, 8 categories
│   ├── scripts/simulate.ts   # headless end-to-end bot test
│   └── src/
│       ├── index.ts          # Express + Socket.IO bootstrap, /health
│       ├── config.ts
│       ├── room/Room.ts      # the phase state machine and all room rules
│       ├── room/snapshot.ts  # per-player state (the only place secrets are filtered)
│       ├── room/RoomManager.ts  # room map + idle cleanup
│       ├── game/             # scoring, awards, faker rotation, word bank, stroke store
│       ├── socket/           # event handlers + token-bucket rate limiter
│       └── utils/
└── client/
    ├── tailwind.config.ts    # theme tokens (colours are CSS variables)
    ├── src/index.css         # light "sketchbook" + dark "night notebook" tokens
    ├── src/canvas/           # stroke renderer, layer compositor, input, replay
    ├── src/components/       # UI kit, avatars, badges, chat, settings, leaderboard…
    ├── src/screens/          # one component per game phase
    ├── src/store/            # zustand stores + mutable stroke model
    ├── src/lib/              # socket, clock sync, sessions, Web Audio, share image
    └── Dockerfile nginx.conf vercel.json public/_redirects
```

## How it works

**Phase machine** (server, `Room.ts`):
`LOBBY → ROLE_REVEAL (5s) → DRAWING (20–60s) → GALLERY_REVIEW (15s) → VOTING (10–40s) → REVEAL → FAKER_LAST_CHANCE (15s, only if caught) → ROUND_RESULTS (10s) → … → FINAL_RESULTS`

- Voting ends early once every connected player has voted.
- During REVEAL the Faker is exposed but the real word stays hidden until the Faker's guess is in, so a caught Faker can't read it off the screen.
- "Caught" means the Faker has strictly the most votes. Ties let the Faker escape.
- Faker rotation deals from a shuffled deck, so everyone is Faker once before anyone repeats.
- Word pairs never repeat within a room's lifetime. Host-added pairs are played first.

**Secrets.** Each player receives their own `room:state` snapshot built by `snapshot.ts`. Words, the Faker's identity (before the reveal) and custom pairs (non-hosts only see the count) are filtered there and nowhere else.

**Timers and clocks.** Only the server runs timers. Snapshots carry `phaseEndsAt` in server time. Clients estimate their clock offset NTP-style (`time:sync`, keeping the lowest round-trip sample) and render countdowns from that.

**Strokes.** Clients stream `[x, y, pressure, t]` points in batches every ~30 ms. The server validates the id's owner prefix, the phase and timer, and caps per batch, per stroke, per round and ink; it clamps coordinates, then relays each batch to everyone else (except in Blind Draw). At the end of drawing the server sends the authoritative canvas to everyone, and that is what the gallery replays. The replay uses the real timeline with idle gaps squeezed out. Each player's ink lives on its own layer, so the eraser only affects its owner's lines.

**Reconnects.** The session token is kept per tab (sessionStorage, survives reload) and per browser (localStorage, survives closing the tab). On reconnect the client rejoins with the token and gets the full state plus the canvas. Several tabs in one browser can't steal each other's seats: only a tab's own token may take over a live connection. Seats are released after 60 s. The host role migrates if the host disconnects, and the game ends with results so far if fewer than 3 players remain.

**Robustness.** Every payload is zod-validated. Each socket has token-bucket rate limits (strokes, chat, reactions, everything else). Rooms idle for 30 minutes are closed.

## Music & sound

Everything is synthesised live with the Web Audio API (`client/src/lib/audio/`). There are no audio files. Audio starts on the first click or keypress, as browsers require.

- **Music** (`tracks.ts`): one looping track per phase that crossfades when the phase changes. Tracks are written as chord progressions plus 16-step patterns, so adding or editing one is plain data:
  Doodle Lounge (lobby), Hold Your Card (role reveal / last chance), Scribble Rush (drawing), Gallery Stroll, Who Dunnit? (voting), Hooray! (round results), Victory Lap (final). The reveal is left silent for the drum roll. Drawing and voting add extra percussion when time runs low.
- **Effects** (`sfx.ts`): pencil tap on buttons, pencil scratch that follows your drawing speed (duller for the eraser), paper crumple (clear), tape rewind (undo), page flips, a desk bell at pencils-down, woodblock countdown, rubber-stamp vote lock, drum roll, card flips, party popper and fanfare (caught), sneaky tiptoe (escaped), slide whistle (stolen win), sad trombone (wrong guess).
- **Controls**: ⚙️ has separate Music and Effects volumes plus mute, remembered per device. Music pauses while the tab is hidden.

## Configuration

### Environment variables

| Variable | Where | Default | Purpose |
| --- | --- | --- | --- |
| `PORT` | server | `3001` | Listen port |
| `HOST` | server | `0.0.0.0` | Bind address |
| `CLIENT_ORIGIN` | server | `*` | Allowed CORS origins, comma-separated |
| `LOG_LEVEL` | server | `info` | `debug`, `info`, `warn` or `error` |
| `SERVE_CLIENT_DIR` | server | empty | Serve a built client from the same process |
| `VITE_SERVER_URL` | client (build time) | empty | Server URL; empty = same origin |
| `DEV_SERVER_TARGET` | client (dev) | `http://localhost:3001` | Vite proxy target |

See `.env.example`. The server reads `server/.env`; Vite reads `client/.env`.

### Game tuning

All scoring values, timings and limits are in `shared/src/constants.ts`:

```ts
export const SCORING = {
  fakerUncaught: 3,          // Faker escapes
  wrongVoter: 0,
  correctVoterCaught: 2,     // per correct voter when caught
  fakerCaught: 0,
  fakerSteal: 2,             // caught, but guessed the word
  correctVoterWhenStolen: 1,
  speedBonus: 1,             // earliest correct voter, any outcome
};
```

Guess matching (`shared/src/fuzzy.ts`) is case-insensitive, trims whitespace, ignores plurals and allows a Levenshtein distance of ≤ 1. Answers of three letters or fewer must match exactly, otherwise "cat" would also accept "car", "hat" and "bat".

## Adding words

Edit `server/data/wordPairs.json`. Each entry is one line:

```json
{"category":"food","real":"pizza","fake":"pie","difficulty":"easy"}
```

- `category`: one of `animals`, `food`, `objects`, `places`, `actions`, `popculture`, `nature`, `sports`
- `real`: the word most players get; `fake`: the Faker's word. Aim for "close but clearly different" (cat/tiger, guitar/violin).
- `difficulty`: `easy`, `medium` or `hard`
- Avoid trademarks, and avoid pairs that are pure synonyms.

The file is validated with zod when the server starts, so a typo fails loudly rather than mid-game. To add a whole new category, add its id to `CATEGORY_IDS` and `CATEGORIES` in `shared/src/categories.ts`.

Hosts can also add custom pairs in the lobby; only the host sees them.

## Deployment

The server keeps rooms in memory, so run **exactly one server instance** (no horizontal scaling without a shared adapter such as `@socket.io/redis-adapter`).

### Docker Compose (both parts)

```bash
docker compose up --build
# client: http://localhost:8080   server: http://localhost:3001/health
```

nginx serves the client and proxies `/socket.io` to the server, so no `VITE_SERVER_URL` is needed.

### Single container

Build everything, then serve the client from the game server:

```bash
npm run build
SERVE_CLIENT_DIR=client/dist npm start      # http://localhost:3001
```

### Server on Render, Railway or Fly.io

- **Render**: "New → Blueprint", point it at the repo (uses `render.yaml`), then set `CLIENT_ORIGIN` to your client URL.
- **Railway**: new service from the repo, Dockerfile path `server/Dockerfile`, root directory `/`, and set `CLIENT_ORIGIN`.
- **Fly.io**: `fly launch --dockerfile server/Dockerfile --internal-port 3001`, then `fly secrets set CLIENT_ORIGIN=https://…`, and keep `min_machines_running = 1` with a single machine.

All three support WebSockets out of the box. The health check is `GET /health`.

### Client on Vercel or Netlify

- Root directory: `client`
- Build command: `cd .. && npm install && npm run build -w @bluffsketch/shared && npm run build -w @bluffsketch/client`
- Output directory: `dist` (i.e. `client/dist`)
- Environment variable: `VITE_SERVER_URL=https://your-server.example.com`

SPA fallbacks for invite links are included (`client/vercel.json`, `client/public/_redirects`).

## Testing

- `npm run typecheck`: strict TypeScript, no `any`.
- `npm run simulate` (server running): 35 end-to-end checks covering secrecy of words and roles, stroke relay and anti-cheat, undo, early vote end, fuzzy guessing, scoring, reconnect and seat takeover rules, early game end, awards, share data, and play again.
- `TESTING.md`: manual 4-tab playtest checklist.
