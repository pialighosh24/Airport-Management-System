# AeroNexus — Smart Airport Operations, Flight Intelligence & Passenger Assistance Platform

**AeroNexus** is a professional aviation command-centre mobile application built for operational situational awareness: live aircraft tracking, airport intelligence, flight intelligence, schedules and fares, weather, currency, disruptions, alerts, and staff operations — wrapped in a polished operational interface.

Built as a BCA academic group project, it demonstrates a complete real-world architecture: an Expo/React Native mobile client, a Node.js/Express REST backend, multiple live external data providers, caching, error handling, and an explicitly-labelled demo fallback.

**Current branch:** `feature/dashboard` · **Expo SDK:** 58 · **Mobile runtime:** React Native 0.88 / Expo Go (Android) · **Backend:** Node.js + Express (port 5000) · **Database:** MySQL 8.0 (demo fallback when unavailable)

---

## Table of Contents

1. [Project Overview and Objectives](#1-project-overview-and-objectives)
2. [Features](#2-features)
3. [Technology Stack](#3-technology-stack)
4. [System Architecture](#4-system-architecture)
5. [Folder Structure](#5-folder-structure)
6. [Database Schema](#6-database-schema)
7. [API Endpoint Documentation](#7-api-endpoint-documentation)
8. [Environment Setup](#8-environment-setup)
9. [Installation](#9-installation)
10. [Startup Instructions](#10-startup-instructions)
11. [Testing](#11-testing)
12. [Known Limitations](#12-known-limitations)
13. [Screenshots](#13-screenshots)
14. [Future Enhancements](#14-future-enhancements)
15. [Credits and Licence](#15-credits-and-licence)
16. [Project Demonstration Script](#16-project-demonstration-script)
17. [Feature-by-Feature Demonstration Checklist](#17-feature-by-feature-demonstration-checklist)
18. [Technical Communication: Frontend ↔ Backend ↔ MySQL ↔ External APIs](#18-technical-communication-frontend--backend--mysql--external-apis)

---

## 1. Project Overview and Objectives

### Overview

The application is designed around a **command-centre operator workflow**:

- **What is happening right now** at the tracked airports (flights, delays, weather, alerts).
- **Where aircraft are** and where they are going (live telemetry + heading indicators).
- **How the operation is performing** (delays, congestion, disruption briefing).
- **What should the user do next** (alerts, actionable operational guidance).

Every screen distinguishes between **live data**, **cached data**, and **demo data** via data-freshness indicators and source attribution, so a live-data label never accompanies demo values.

### Objectives

1. Deliver a mobile-first flight tracking and operations command centre.
2. Aggregate live external data (OpenSky, Open-Meteo, Open ER-API, FreeAirportDB, Amadeus, FlightAware) through a single backend.
3. Demonstrate a complete full-stack architecture: Expo/React Native client → Express REST backend → MySQL → external providers.
4. Maintain data integrity: never mix live and demo sources; always surface freshness/confidence.
5. Provide graceful loading, error, empty, retry, and offline states.

---

## 2. Features

### A. Aviation Command Dashboard

- Operational snapshot strip: **Aircraft In Scope**, **En Route Now**, **Open Disruptions**.
- KPI stat cards: **Live Fleet**, **Weather Outlook**, **FX Indicative**, **Alerts**.
- **Data Confidence** panel with per-source badges (OpenSky / Open-Meteo / Open ER-API) and honest status (CONNECTED / FRESH / ACTIVE / CHECKING / UNAVAILABLE / STALE).
- **Disruption Briefing** built from actual disruption cases via `buildDisruptionBriefing`.
- **Operations** quick-action tiles (Live Radar, Airports, Fares, Flight Intel, Staff Ops, Settings).
- Backend status strip with manual refresh; pull-to-refresh on the dashboard.
- Weather and currency are fetched through the backend with client-side TTL caching.

### B. Interactive Live Radar

- **Live OpenSky** vs **Demo Fleet** mode toggle (REAL / SIMULATED tags).
- Airspace preset selector: **Central Europe** / **US East Coast**.
- Backend status bar: endpoint display, host configuration, refresh, error toast with retry.
- Loading / error / empty / success states.
- Flight detail modal with telemetry details and watchlist save.

### C. Airport Intelligence

- Airport search via **FreeAirportDB** (IATA/ICAO/name) with quick-search chips and retry/empty states.
- Flight timetables: hub chips, departure/arrival toggle, schedule text filter, METAR banner with delay indicator, demo fallback.

### D. Flight Intelligence

- Aircraft telemetry list (flight number, callsign, route, altitude, ground speed, heading) with `FreshnessIndicator`.
- Pull-to-refresh and retry.

### E. Fares

- Fare comparison list with sorting (Best Value / Cheapest / Fastest) and breakdown modal.
- Local demo fares fallback with explicit `SIMULATED DEMO DATA` labelling.
- Live Amadeus offers via backend (`/api/flights/search`) — currently **503 Unconfigured** (honest error state).

### F. Weather Intelligence

- Backend proxy to **Open-Meteo** (`/api/weather?latitude&longitude&forecastDays&refresh`).
- Current conditions + forecast, `dataFreshness`, TTL cache, error/unavailable states.

### G. Currency Intelligence

- Backend proxy to **Open Exchange Rate API** (`/api/currency?base&symbols`).
- Indicative rates (INR/USD), TTL cache, disclaimer, error/unavailable states.

### H. Alerts, Watchlist and Notifications

- Email notification channel (edit + validation, alert preferences, threshold pills).
- Watchlist: save/unsave flights, notification timeline, simulate alert, dismiss, **mark read / mark all read**.

### I. Staff Operations

- Staff PIN authentication (demo PINs: `7700`, `1234`, `admin`).
- Disruption metrics, status filters, create disruption case modal.

### J. Settings

- Backend server URL configuration with apply + health probe.
- Data source overview.

### Original Differentiators

1. **Data Confidence Centre** — source, retrieval time, freshness, confidence limitations for key data.
2. **Smart Disruption Briefing** — concise rule-based briefing derived from actual disruption records.

Both are reachable from the Command Dashboard.

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| Mobile client | Expo SDK 58, React Native 0.88, Expo Router 58, TypeScript, React 19.3, `@expo/vector-icons`, React Native Safe Area Context, react-native-reanimated/gesture-handler/screens |
| Backend | Node.js, Express 4, `mysql2`, `cors`, `dotenv`, `node --test` |
| Database | MySQL 8.0 (with standalone demo fallback) |
| External APIs | OpenSky Network (live ADS-B), FreeAirportDB (airports), Open-Meteo (weather), Open ER-API (FX), Amadeus (offers), FlightAware AeroAPI (status) |
| Mapping | Custom radar view (no third-party map SDK) |
| Validation/QA | TypeScript, Expo Lint, Expo Doctor, backend + server test suites |

---

## 4. System Architecture

```
┌────────────────────────────────────────── Mobile client (Expo SDK 58 / RN 0.88 / Expo Router) ──────────────────────────┐
│  src/app (routes) · src/components · src/services (TTL caches, health-aware base URL) · src/context                      │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                         │  REST (JSON) · base http://localhost:5000 (auto LAN/emulator aware)
                                         ▼
┌──────────────────────────────────────────── AeroNexus Backend (Node.js + Express, backend/) ─────────────────────┐
│  /api/health · /api/auth · /api/flights · /api/airports · /api/fares · /api/disruptions · /api/alerts                     │
│  /api/weather · /api/currency · /api/ground-operations                                                                     │
│        → backend/src/services (OpenSky, Open-Meteo, Open ER-API, demo data) → backend/src/models (MySQL/demo)            │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                         │  outbound provider calls (server-side only; keys stay backend-side)
                                         ▼
       OpenSky · FreeAirportDB · Open-Meteo · Open ER-API · Amadeus · FlightAware · (optional others)
```

- **Mobile client**: Expo Router file-based routes (`src/app/`), shared code in `src/` (components, services, context, hooks, utils, types, constants).
- **Authoritative backend**: `backend/` (Express app, routes, controllers, services, models, middleware, tests).
- **Compatibility bridge**: `server/` re-exports/starts the unified backend (`backend/server`).
- **External APIs**: called server-side only; credentials stay backend-side.

---

## 5. Folder Structure

```
AeroNexus-Team/
├── app.json / package.json / tsconfig.json / eslint.config.js / metro.config.js
├── assets/                     # App icons, logos, splash assets
├── scripts/                     # Expo reset helper
├── src/                         # Mobile client
│   ├── app/                     # Expo Router screens (file-based routes)
│   ├── components/              # Shared components (airports/, fares/, map/, staff/, ui/, common/)
│   ├── constants/               # Design tokens (Palette, Radii, Elevation, Spacing, Fonts)
│   ├── context/                 # FlightContext (fleet, alerts, disruptions, staff state)
│   ├── data/                    # Demo datasets (flights, airports, disruptions, fares)
│   ├── hooks/                   # Theme/color-scheme hooks
│   ├── services/                # api.ts (fetch w/ timeout+retry, TTL caches, endpoint methods)
│   ├── types/                   # Shared TypeScript interfaces
│   ├── utils/                   # disruptionBriefing.ts
│   └── global.css
├── backend/                     # Express backend (authoritative)
│   ├── server.js
│   ├── src/
│   │   ├── config/   (schema.sql, database.js, index.js)
│   │   ├── controllers/ (auth, flight, flightAware, amadeus, airport, fare, weather, currency, disruption, alert, groundOperations, health)
│   │   ├── data/     (demoData.js)
│   │   ├── middleware/ (auth, error, notFound)
│   │   ├── models/    (User, Flight, Disruption, Alert, Notification, FlightFare)
│   │   ├── routes/    (health, auth, flights, airports, fares, weather, currency, disruptions, alerts, groundOperations)
│   │   ├── scripts/   (seed, verifyDb)
│   │   └── services/  (openSky, weather, currency, airport, fare, amadeus, flightAware, groundOperations, disruption, alert)
│   └── tests/         (apiIntegrations, auth)
└── server/                      # Compatibility bridge / standalone server entry
```

---

## 6. Database Schema

MySQL 8.0 database `aeronexus` (`backend/src/config/schema.sql`) with tables:

- `users` — authentication & role-based access (passenger/staff/admin, staff PIN).
- `flights` — flight telemetry & freshness tracking (callsign, flight number, airline, route, position, altitude, speed, heading).
- `disruptions` — disruption cases (flight, route, incident type, severity, impacted passengers, status, action plan).
- `flight_alerts` — alert/watchlist records.
- `notifications` — notification timeline records.
- `flight_fares` — fare comparison records.

When MySQL is unavailable, the backend runs in **standalone demo mode** using deterministic demo datasets (clearly labelled).

---

## 7. API Endpoint Documentation

Base URL: backend origin (default `http://localhost:5000`). Mobile base URL resolution: `EXPO_PUBLIC_BACKEND_URL` override → Expo Go host URI → emulator loopback (`10.0.2.2`) → localhost.

Response envelope (shared): `{ success, isDemo?, isLive?, source?, airspace?, disclaimer?, count?, totalInAirspace?, data, error?, message?, warning?, fromCache? }`.

| Method | Path | Purpose | Provider / Source | Verified status |
|---|---|---|---|---|
| GET | `/api/health` | Aggregated backend/provider/DB health | Internal | ✅ 200 healthy |
| POST | `/api/auth/register` | User registration | Internal | — |
| POST | `/api/auth/login` | User login | Internal | — |
| POST | `/api/auth/staff-login` | Staff PIN login | Internal | — |
| GET | `/api/auth/me` | Current user | Internal | ✅ 401 (guard verified) |
| GET | `/api/flights` | Flight list (filters: status/origin/destination) | MySQL/demo | ✅ 200 (demo) |
| GET | `/api/flights/live` | Live OpenSky states (preset/limit) | OpenSky | ✅ 200 (live) |
| GET | `/api/flights/search` | Amadeus flight offers | Amadeus | ✅ 503 unconfigured |
| GET | `/api/flights/status/:identifier` | FlightAware status | FlightAware | ✅ 503 unconfigured |
| GET | `/api/flights/:identifier` | Single flight lookup | MySQL/demo | ✅ 200 (demo) |
| GET | `/api/airports` | Airport search | FreeAirportDB | ✅ 200 |
| GET | `/api/airports/:code/schedule` | Airport timetable | MySQL/demo | ✅ 200 (demo) |
| GET | `/api/fares` | Fare comparison | MySQL/demo | ✅ 200 (demo) |
| GET | `/api/disruptions` | Disruption list | MySQL/demo | ✅ 200 |
| GET | `/api/disruptions/:id` | Disruption detail | MySQL/demo | ✅ 200 |
| POST | `/api/disruptions` | Create disruption | Internal (auth) | — |
| PATCH | `/api/disruptions/:id` | Update disruption | Internal (auth) | — |
| GET | `/api/alerts` | Alerts + watchlist + notifications | Internal | ✅ 200 |
| POST | `/api/alerts/watchlist` | Save flight to watchlist | Internal | — |
| DELETE | `/api/alerts/watchlist/:flightNumber` | Remove from watchlist | Internal | ✅ 200 (tested + restored) |
| POST | `/api/alerts/trigger-simulation` | Simulate alert | Internal | — |
| PATCH | `/api/alerts/notifications/:id/read` | Mark notification read | Internal | — |
| GET | `/api/weather` | Open-Meteo current + forecast | Open-Meteo | ✅ 200 (fresh) |
| GET | `/api/currency` | Open ER-API rates | Open ER-API | ✅ 200 (live) |
| GET | `/api/ground-operations` | Ground tasks list | Internal | ✅ 200 |
| GET | `/api/ground-operations/:id` | Ground task detail | Internal | — |
| POST | `/api/ground-operations` | Create ground task | Internal | — |
| PATCH | `/api/ground-operations/:id` | Update ground task | Internal | — |

---

## 8. Environment Setup

Placeholder-only values (never commit real secrets).

### Backend (`backend/.env.example` → `backend/.env`)

```
NODE_ENV=development
PORT=5000
CLIENT_ORIGINS=http://localhost:8081,http://localhost:19006,http://localhost:8082
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=aeronexus
DB_CONNECTION_LIMIT=10
JWT_SECRET=<your-jwt-secret>
JWT_EXPIRES_IN=7d
OPENSKY_USERNAME=
OPENSKY_PASSWORD=
AMADEUS_CLIENT_ID=
AMADEUS_CLIENT_SECRET=
AMADEUS_BASE_URL=https://test.api.amadeus.com
FLIGHTAWARE_API_KEY=
FLIGHTAWARE_BASE_URL=https://aeroapi.flightaware.com/aeroapi
```

### Server bridge (`server/.env.example` → `server/.env`)

```
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:8081,http://localhost:8082,http://localhost:19006
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=<your_mysql_password_here>
DB_NAME=aeronexus
DB_CONNECTION_LIMIT=10
FLIGHT_DATA_API_KEY=<your_flight_api_key_here>
FLIGHT_DATA_API_BASE_URL=https://api.example.com/v1
OPENSKY_USERNAME=
OPENSKY_PASSWORD=
FLIGHT_FARE_API_KEY=<your_flight_fare_api_key_here>
AMADEUS_CLIENT_ID=
AMADEUS_CLIENT_SECRET=
AMADEUS_BASE_URL=https://test.api.amadeus.com
FLIGHTAWARE_API_KEY=
FLIGHTAWARE_BASE_URL=https://aeroapi.flightaware.com/aeroapi
EMAIL_SERVICE_API_KEY=<your_email_service_api_key_here>
EMAIL_FROM_ADDRESS=alerts@aeronexus.aero
```

### Mobile client

`EXPO_PUBLIC_BACKEND_URL` (dev override) — placeholder: `http://10.86.83.4:5000` (LAN IP of dev machine). Falls back to Expo Go host URI / emulator loopback / localhost.

---

## 9. Installation

```bash
# Root (mobile)
npx expo install <package>        # SDK-aligned installs
npm install

# Backend
cd backend
npm install
cp .env.example .env               # fill placeholders

# Server bridge
cd server
npm install
cp .env.example .env               # fill placeholders
```

---

## 10. Startup Instructions

```bash
# Backend (from backend/)
npm start                          # node server.js  -> http://localhost:5000

# Mobile (from project root)
npx expo start --clear
```

- Expo Go: install Expo Go SDK 58 build on Android; scan QR.
- Emulator: backend at `http://10.0.2.2:5000`.
- Physical phone: same Wi-Fi; backend URL via Expo host URI / `EXPO_PUBLIC_BACKEND_URL`.

---

## 11. Testing

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor@latest
cd backend && npm test        # 11/11 passed
cd ../server && npm test      # 63/63 passed
```

Backend syntax: `node --check` on all backend/server JS files.

---

## 12. Known Limitations

- MySQL unavailable in current environment → demo fallback.
- Amadeus / FlightAware unconfigured → honest 503 states.
- No push notifications wired to real delivery.
- No charts implementation.
- Debounced search not implemented.
- Backend-backed watchlist persistence not wired from Alerts UI.
- Default JWT secret fallback in backend config (dev).
- Or orphaned Expo template screen (`src/app/explore.tsx`) not routed.

---

## 13. Screenshots

No UI screenshots have been captured as part of this project yet; the `assets/` folder contains only app icons/logo/splash assets and template images — **no product screenshots are included**.

---

## 14. Future Enhancements

- MySQL provisioning + live ops data.
- Amadeus/FlightAware credential activation.
- Charts / price-history.
- Deep flight search (number, status, airports, times, delays, airline).
- Debounced search.
- Backend-backed watchlist persistence.
- Push notifications.
- User profile screen.
- Dark theme enforcement (theme tokens exist).

---

## 15. Credits and Licence

- **License file:** MIT License (`LICENSE`) — inherited from the Expo/React Native template attribution (`Copyright (c) 2015-present 650 Industries, Inc. (aka Expo)`).
- **Libraries:** Expo, React Native, Expo Router, TypeScript, React, Express, MySQL, OpenSky, Open-Meteo, Open ER-API, Amadeus, FlightAware, `@expo/vector-icons`, React Native Reanimated/Gesture Handler/Screens/Safe Area Context.

---

## 16. Project Demonstration Script

```text
1. Start backend:  cd backend && npm start
2. Start mobile:   npx expo start --clear  → scan Expo Go (SDK 58) QR
3. Open Dashboard:
      - Backend badge: BACKEND 200
      - Snapshot: Aircraft In Scope / En Route / Open Disruptions
      - KPI cards: Live Fleet, Weather (14°C Clear sky), FX (₹95.29), Alerts
      - Data Confidence: OpenSky Connected, Open-Meteo Fresh, Open ER-API Active
      - Disruption Briefing: QF12 ... (demo-labelled)
4. Open Live Radar:
      - Live OpenSky mode; preset switch; refresh; detail modal; save watchlist.
5. Open Airports: search (FreeAirportDB), timetables.
6. Open Fares: sorting + breakdown; Amadeus offers → unconfigured state.
7. Open Alerts: mark read / mark all read; watchlist; simulate.
8. Open Staff: PIN login, filters, create case.
9. Open Settings: backend URL apply, health probe.
10. Stop backend → verify error/empty/retry states.
```

---

## 17. Feature-by-Feature Demonstration Checklist

- [ ] Backend starts; `GET /api/health` → 200.
- [ ] Dashboard loads with live/demo indicators and confidence badges.
- [ ] Live radar refresh works (Live OpenSky / Demo).
- [ ] Weather and FX load with freshness.
- [ ] Fares/disruptions/alerts screens reachable and honest.
- [ ] Settings/diagnostics show backend connectivity.
- [ ] Demo mode works without external keys.
- [ ] Lint + typecheck + backend tests pass.

---

## 18. Technical Communication: Frontend ↔ Backend ↔ MySQL ↔ External APIs

1. **Mobile → Backend:** React Native client (`src/services/api.ts`) issues REST JSON calls (`fetchWithTimeout` with 8s timeout, 2 retries, exponential backoff; TTL caches for weather/currency). Base URL resolution per platform.
2. **Backend → MySQL/Demo:** Controllers call models (`Flight`, `User`, `Disruption`, `Alert`, `Notification`, `FlightFare`) or use demo datasets when DB is unavailable.
3. **Backend → External APIs (server-side):** Services call OpenSky, Open-Meteo, Open ER-API, FreeAirportDB, Amadeus, FlightAware. Credentials via backend env only.
4. **Backend → Mobile:** JSON envelopes with `success`, `isDemo`, `isLive`, `source`, `count`, `data`, freshness fields; client renders confidence badges and distinguishes demo vs live.
5. **Caching/freshness:** weather & currency TTL (5 min); OpenSky via backend caching; freshness metadata (`observationTimeUtc`, `retrievalTimeUtc`, `ageSeconds`) surfaced via `FreshnessIndicator`.

---

*Docs prepared from the actual implementation for the AeroNexus BCA practical examination and GitHub portfolio presentation.*
