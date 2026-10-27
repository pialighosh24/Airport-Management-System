# AeroNexus

Airport boards, a live aircraft map and like-for-like fare comparison. Every number on screen carries its source and age, and unknown values stay unknown.

Informational only: not air traffic control, not an airline booking system, not an airport's official flight display.

```
aeronexus/
├─ backend/    Express + MongoDB (Mongoose) + Socket.IO, TypeScript via tsx
└─ frontend/   Vite + React + Tailwind v4 + MapLibre
```

The two are separate projects with their own `package.json` and `node_modules`. The frontend talks to the backend only over HTTP (`/api/v1`) and the `/rt` socket.

## Run it

First time? The [main README](../README.md) has a step-by-step guide with troubleshooting. Short version:

Needs Node 22.12+ and pnpm. Two terminals:

```bash
# 1. backend  → http://localhost:4000
cd backend
pnpm install
cp .env.example .env      # works as-is
pnpm dev

# 2. frontend → http://localhost:5173
cd frontend
pnpm install
pnpm dev
```

With `MONGODB_URI` empty, the backend starts an in-memory MongoDB replica set (the first run downloads a MongoDB binary, about 780 MB). Data resets on restart. For persistent data, point `MONGODB_URI` at a local MongoDB or Atlas: `mongodb://localhost:27017/aeronexus?replicaSet=rs0`.

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env` to create an admin account on boot.

## Data sources and honesty labels

| Data | Source | Label |
|---|---|---|
| Flight status, boards | AeroNexus simulator (deterministic schedule, live-moving state) | DEMO |
| Aircraft positions | Simulator in `PROVIDER_MODE=demo`; OpenSky Network in `live` | DEMO / LIVE / RECENT / STALE |
| Fares, FX | Simulator and a fixed FX table | DEMO |
| Weather | Open-Meteo, live in both modes | LIVE / RECENT / STALE |
| Base map | OpenFreeMap (OpenStreetMap data) | n/a |

Rules the code enforces:

- A cache served after a failed refresh is labelled STALE, never LIVE.
- A flight is attached to an aircraft only at ≥ `MATCH_CONFIDENCE_MIN` (0.80). Scores are 0.40 callsign + 0.30 schedule window + 0.20 route corridor + 0.10 airport proximity, and ties are refused. Live OpenSky aircraft are never matched against simulated schedules.
- Baggage the supplier didn't state is shown as "not specified", never as included.
- "Best" fare sort is disclosed on the page: 0.55 price rank + 0.30 duration rank + 0.15 stops rank.

## Checks

```bash
cd backend  && pnpm test && pnpm typecheck   # 27 tests: domain rules + API against in-memory MongoDB
cd frontend && pnpm lint && pnpm build
```

## Architecture notes

- Modular monolith: API, simulator jobs and the realtime gateway run in one process. Latest aircraft positions live in process memory, with history in a MongoDB time-series collection. Move them to Redis before running more than one API instance.
- Collections: `airports` (2dsphere + text indexes), `flightlegs`, append-only `statussnapshots`, `aircraftstates` (time-series, 6 h TTL), `fareoffers` (TTL), `farepricechecks`, `users`, `providerruns`, `auditevents`.
- Realtime: clients load a REST snapshot, then apply `flight.status.updated` deltas. On reconnect they refetch the snapshot before trusting deltas again.
- Security: argon2 passwords, httpOnly SameSite=strict session cookie, origin check on writes, helmet, rate limits on auth and fare search, zod validation on every input, RFC 7807 errors with request IDs.

## Not built yet (blueprint phases P6–P9)

Alerts and saved trips, the ops console (disruption cases, turnarounds, audited exports), staff MFA, analytics and the heatmap, PWA offline mode, and a licensed flight-status or fare provider. The adapter seams (`backend/src/providers/`) are where real providers plug in.
