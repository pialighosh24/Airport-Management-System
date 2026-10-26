# AeroNexus — Smart Airport Operations, Flight Intelligence & Passenger Assistance Platform

**AeroNexus** is a professional aviation command-centre mobile application built for operational situational awareness: live aircraft tracking, airport intelligence, flight intelligence, schedules and fares, weather, currency, disruptions, and alerts — wrapped in a polished midnight-navy command-centre interface.

Built as a BCA academic group project, it demonstrates a complete real-world architecture: an Expo/React Native mobile client, a Node.js/Express REST backend, multiple live external data providers, caching, error handling, and an explicitly-labelled demo fallback.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Technology Stack](#technology-stack)
5. [API Inventory](#api-inventory)
6. [Environment Variables](#environment-variables)
7. [Backend Setup](#backend-setup)
8. [Database Setup](#database-setup)
9. [Mobile Setup](#mobile-setup)
10. [Demo Mode Behaviour](#demo-mode-behaviour)
11. [Testing](#testing)
12. [Troubleshooting](#troubleshooting)
13. [Known Limitations and Future Enhancements](#known-limitations-and-future-enhancements)
14. [BCA Practical Examination — Demonstration Checklist](#bca-practical-examination--demonstration-checklist)

---

## Overview

The application is designed around a **command-centre operator workflow**:

- **What is happening right now** at the airport(s) of interest (flights, delays, weather, alerts).
- **Where aircraft are** and where they are going (live telemetry + heading indicators).
- **How the operation is performing** (delays, congestion, disruption briefing).
- **What should the user do next** (alerts, actionable operational guidance).

Every screen distinguishes between **live data**, **cached data**, and **demo data** via a data-freshness indicator and source attribution, so a live-data label never accompanies demo values.

## Features

### A. Aviation Command Dashboard
- Operational overview: total flights, active flights, delayed flights, airport status, operational alerts.
- Live-data freshness indicators and data-source labels.
- Search and quick actions; recent operational events.
- Charts/insights for flight activity, delays, or airport performance where reliable data exists.
- Live values vs. demo values clearly distinguished.

### B. Flight Intelligence and Live Aircraft Tracking
- Flight search and filtering.
- Flight identifier, airline (when sourced), aircraft, altitude, speed, heading, origin/destination (when known), data freshness.
- **OpenSky Network** live state vectors (`/api/states/all` via backend proxy).
- Custom radar map view with heading indicators and airport markers (no third-party map SDK required; avoids Expo Go map black-screen risk).
- Flight detail panel and list/map views.
- Refresh controls, TTL caching, loading/error/retry states, rate-limit handling.
- No invented telemetry; fallbacks for unavailable map configuration.

### C. Airport Intelligence
- Search by IATA, ICAO, name, location.
- Verified coordinates, elevation, timezone, metadata.
- Weather and available flight schedules.
- Detail pages, operational status, filters; local registry + external enrichment with source attribution.

### D. Flight Schedules and Fare Intelligence
- **Amadeus** flight offers (where API plan/credentials permit) and **FlightAware AeroAPI** schedule/movement data (where supported).
- Fare breakdowns, currency, baggage info, booking links — only when supplied/verified by the source.
- Search, sorting, filtering; clear labelling of test/sandbox, cached, estimates, live responses.

### E. Weather Intelligence
- **Open-Meteo** forecasts and current conditions.
- Temperature, wind, precipitation, visibility where available; forecast timestamp and units.
- Defensible operational weather warnings (not presented as official aviation meteorology).

### F. Currency Intelligence
- **Open ER-API** exchange rates (INR, USD where available).
- TTL caching with timestamps, failure handling, rate-limit control.
- Indicative, not guaranteed transaction rates.

### G. Airport Operations and Turnaround Management
- Practical turnaround workflow with configurable milestones.
- Milestone status, timestamps, pending tasks, delay indicators.
- Role-appropriate operations views; demo workflows clearly labelled when no real ops data source exists.

### H. Alerts and Notifications
- Operational alerts for delays, weather conditions, configurable events.
- Severity, timestamps, acknowledgement state, filters.
- Notification preferences; push delivery only labelled when actually delivered.

### I. Additional Original Features (Differentiators)
1. **Data Confidence Centre** — source, retrieval time, freshness, confidence limitations for key data.
2. **Smart Disruption Briefing** — concise rule-based summaries from actual flight, weather, and alert records.

Both were implemented and are reachable from the Command Dashboard.

---

## Architecture

```
┌─────────────────────────── Mobile client (Expo SDK 58 / RN 0.88 / Expo Router) ───────────────────────────┐
│  src/app (routes) · src/components · src/services (TTL caches, health-aware base URL) · src/context        │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                       │  REST (JSON) · base http://localhost:5000 (auto LAN/emulator aware)
                                       ▼
┌──────────────────────────────────────────── AeroNexus Backend (Node.js + Express, backend/) ─────────────┐
│  /api/health · /api/flights · /api/flights/live · /api/airports · /api/weather · /api/currency          │
│  /api/fares · /api/disruptions · /api/alerts · /api/auth                                                          │
│  → backend/src/services (OpenSky, Open-Meteo, Open ER-API, demo data) → backend/src/models (MySQL/demo)     │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                       │  outbound provider calls (server-side only; keys stay backend-side)
                                       ▼
          OpenSky · FreeAirportDB · Open-Meteo · Open ER-API · Amadeus · FlightAware · (optional aviationstack/weather)

```

- **Mobile client**: Expo Router file-based routes (`src/app/`), shared components/services/hooks outside routes (`src/`).
- **Authoritative backend**: `backend/` (Express app, routes, controllers, services, models, middleware, tests).
- **Compatibility bridge**: `server/` forwards to the unified backend (`backend/server`). The backend is authoritative; no competing backend should be run.

## Technology Stack

- **Mobile**: React Native 0.88, Expo SDK 58, Expo Router 58, TypeScript, React 19.3, `@expo/vector-icons`, React Native Safe Area Context.
- **Backend**: Node.js, Express, `node --test` unit tests.
- **Database**: MySQL 8.0 (with standalone demo fallback).
- **External APIs**: OpenSky Network, FreeAirportDB, Open-Meteo, Open ER-API, Amadeus, FlightAware AeroAPI, optional aviationstack / aviationweather.gov.
- **Mapping**: custom radar view (no third-party map SDK dependency).

## API Inventory

| Capability | Provider | Purpose | Notes |
|---|---|---|---|
| Live aircraft telemetry | OpenSky Network | `/api/states/all` proxy | Optional basic auth; anonymous ≈1 req/10s; backend-cached |
| Airport data | FreeAirportDB | Airport enrichment | Coordinates, elevation, timezone, metadata; source attribution |
| Weather | Open-Meteo | Forecasts/current conditions | Units + forecast timestamp; indicative warnings only |
| Exchange rates | Open ER-API | Currency conversion | Indicative rates; TTL cache; INR/USD supported |
| Flight offers | Amadeus | Fare intelligence | Test/sandbox; requires valid API plan + credentials |
| Flight movements | FlightAware AeroAPI | Schedule/movement data | Supported endpoints only |
| Alerts/health | Internal | Operational alerts, health | Auth + health endpoints |

All provider credentials remain **server-side** (env vars); the mobile client calls only the AeroNexus backend.

## Environment Variables

- `backend/.env.example` → copy to `backend/.env`: `PORT`, `NODE_ENV`, `CLIENT_ORIGINS`, `DB_*`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `OPENSKY_USERNAME`, `OPENSKY_PASSWORD`, `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`, `FLIGHTAWARE_API_KEY`.
- `server/.env.example` → copy to `server/.env`: port/environment, CORS origins, DB settings, optional flight/fare/email keys.
- Backend URL used by the mobile client is resolved per platform (Expo Go host URI / emulator loopback / LAN IP → `http://…:5000`).

See `backend/.env.example` and `server/.env.example` for the authoritative lists. **No real secrets are committed** (`.env` is git-ignored; `.env.example` holds placeholders only).

## Backend Setup

```bash
cd backend
npm install
cp .env.example .env     # then fill values
npm test                  # backend unit tests (node --test)
npm start                # or: node server.js
```

Backend runs on `PORT` (default **5000**). Health check: `GET /api/health`.

Core endpoints implemented:

- `GET /api/health` — aggregated backend/provider/database health.
- `GET /api/flights` — flight list (DB/demo, filters: status, origin, destination).
- `GET /api/flights/live` — live OpenSky aircraft states (preset, limit supported).
- `GET /api/flights/search` — Amadeus flight offers (`origin`, `destination`, `departureDate`, `returnDate`, `adults`, `cabinClass`; 503 when unconfigured).
- `GET /api/flights/status/:identifier` — FlightAware flight status (`identifier`; 503 when unconfigured).
- `GET /api/flights/:identifier` — single flight lookup.
- `GET /api/airports`, `GET /api/airports/:code/schedule` — airport intelligence.
- `GET /api/fares` — fare comparison (demo ranking data).
- `GET /api/weather` — Open-Meteo current + forecast (`latitude`, `longitude`, `forecastDays`, `refresh`).
- `GET /api/currency` — Open Exchange Rate conversion (`base`, `symbols`, `refresh`).
- `GET /api/disruptions`, `GET /api/alerts` — operational intelligence.
- `GET|POST|PATCH /api/ground-operations` — internal ground operations task workflow.

## Database Setup

- MySQL 8.0 connection settings in backend env (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).
- Schema: `backend/src/config/schema.sql`; models under `backend/src/models`.
- If DB is unavailable, the backend runs in **standalone demo mode** with predictable demo data; connection status is surfaced via health/diagnostics.

## Mobile Setup

```bash
npx expo install        # keep SDK-pinned deps aligned
npx expo start --clear
```

- **Expo Go**: install the Expo Go build for **SDK 58** on Android (via expo.dev/go or `npx expo-go download android 58`), restart `npx expo start`, scan the QR code.
- **Android emulator**: backend reachable via `http://10.0.2.2:5000`.
- **Physical Android phone**: same Wi-Fi network; backend URL auto-resolves via Expo host URI (LAN IP).

## Demo Mode Behaviour

- External services that are unconfigured/unreachable fall back to demo data.
- Demo values are **never** mixed with live labels; the Data Confidence Centre and freshness indicators make the distinction explicit.
- Weather/currency/fares degrade gracefully with clear status.

## Testing

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor@latest
cd backend && npm test
```

Backend: `63/63` tests passing (auth, health, flights, airports, weather, currency, openSky, fares, disruptions, alerts, API).

## Troubleshooting

- Metro cache: `npx expo start --clear`.
- Expo Go version mismatch: install Expo Go SDK 58 build.
- Backend unreachable: verify `http://localhost:5000/api/health` on device (emulator → `10.0.2.2`, physical → LAN IP).
- CORS: set `CLIENT_ORIGINS` to your Expo web/dev origins.

## Known Limitations and Future Enhancements

- Live flight telemetry depends on OpenSky availability/quotas; no fallback invented data.
- Map is a custom radar view (Expo Go friendly) — no third-party tile provider.
- Push notifications optional/not configured.
- Amadeus/FlightAware require provider-side credentials/plans.

## BCA Practical Examination — Demonstration Checklist

- [ ] Backend starts and `/api/health` returns OK.
- [ ] Dashboard loads with live/demo indicators.
- [ ] Live radar refreshes with OpenSky (or demo) data.
- [ ] Airport search returns verified data.
- [ ] Weather and currency load with caching.
- [ ] Fares/disruptions/alerts screens reachable.
- [ ] Settings/diagnostics show backend connectivity.
- [ ] Demo mode works without external keys.
- [ ] Lint + typecheck + backend tests pass.

### Sample test scenarios
1. Start backend + mobile; verify health and dashboard.
2. Stop backend → verify backend-unreachable error states on client.
3. Stop weather provider → verify demo weather with confidence label.
4. Run backend test suite → 63/63 pass.
5. Toggle demo mode → verify no live/demo mixing.

---

*Documented for the AeroNexus BCA practical examination and portfolio presentation.*
