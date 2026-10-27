# AeroNexus: Airport Management System

AeroNexus is a web app for airport flight boards, a live aircraft map and like-for-like ticket fare comparison. Every number on screen shows where it came from and how old it is, and unknown values stay unknown instead of being guessed.

> Informational only. AeroNexus is not air traffic control, an airline booking system or an airport's official flight display.

## Features

- **Airport boards:** live departures and arrivals for 29 airports (19 in India), with scheduled and expected times in the airport's local timezone, delays, gates, terminals and belts. Filter by airline, status, terminal and time window. Changes flip in like a real departure board.
- **Flight details:** route, times, gate and terminal, status history, and a link to the aircraft on the map.
- **Live map:** aircraft over India and nearby, coloured by altitude. Click a plane for altitude, speed, heading, its trail, and how confidently it was matched to a flight. Includes a keyboard-friendly list view.
- **Fare comparison:** total price for the same travellers, cabin and currency (INR, USD, EUR, AED), with baggage and refund rules shown honestly ("not specified" when the supplier didn't say). Sort by best, price, duration or stops, and re-check a price before leaving.
- **Accounts:** sign up and sign in with secure sessions and role-based access.
- **Works on phones:** the layout adapts down to 375 px wide.

## Tech stack

| Part | Technology |
|---|---|
| Frontend | Vite, React, TypeScript, Tailwind CSS v4, TanStack Query, React Router, MapLibre GL JS |
| Backend | Node.js, Express, TypeScript, Socket.IO (realtime updates), Zod (validation) |
| Database | MongoDB with Mongoose |
| Tests | Vitest and Supertest |

## How to run it

You need two programs running at the same time, each in its own terminal:

| Program | Folder | Address |
|---|---|---|
| Backend (API + database) | `aeronexus/backend` | http://localhost:4000 |
| Frontend (the website) | `aeronexus/frontend` | http://localhost:5173 |

### 1. Install the tools (one time only)

1. Install **Node.js 22.12 or newer** from https://nodejs.org (the LTS version). Check with `node -v`.
2. Install **pnpm**: `npm install -g pnpm`. Check with `pnpm -v`.

### 2. Get the project

```bash
git clone https://github.com/pialighosh24/Airport-Management-System.git
cd Airport-Management-System
git checkout nilambar
```

### 3. Start the backend (terminal 1)

```bash
cd aeronexus/backend
pnpm install
```

Create the settings file by copying the example (the defaults work as they are):

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# Mac / Linux
cp .env.example .env
```

Then start it:

```bash
pnpm dev
```

**The first time only**, it downloads a MongoDB database program (about 780 MB). Wait until you see:

```
[db] connected
[api] http://localhost:4000  mode=demo
```

Leave this terminal open.

### 4. Start the frontend (terminal 2)

Open a **second** terminal:

```bash
cd aeronexus/frontend
pnpm install
pnpm dev
```

Wait until you see `Local: http://localhost:5173/`, and leave this terminal open too.

### 5. Open the app

Go to **http://localhost:5173** in your browser. You'll see the departures board for New Delhi. Try **Change airport**, the **Live map** and **Compare fares**.

To stop, press **Ctrl + C** in both terminals. To start again later, run `pnpm dev` in each folder; there's no need to install again.

### Optional settings (`aeronexus/backend/.env`)

| Setting | What it does |
|---|---|
| `MONGODB_URI` | Leave empty for a temporary in-memory database (**wiped on every restart**). Set it to a MongoDB Atlas or local MongoDB address to keep data. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Creates an admin account when the backend starts. |
| `PROVIDER_MODE=live` | Shows real aircraft from the OpenSky Network on the map instead of simulated ones. |

Restart the backend after changing `.env`.

### Troubleshooting

| Problem | Fix |
|---|---|
| `node` or `pnpm` is "not recognized" | Install it, then open a **new** terminal |
| Port 4000 or 5173 already in use | Another copy is still running; close it first |
| "Cannot reach the AeroNexus server" in the app | Start the backend (step 3) before using the website |
| Live map reloads the first time you open it | Normal after `pnpm install`; later visits are instant |
| Map is grey or blank | The base map loads from the internet; check your connection |
| Data disappeared after a restart | Expected with the in-memory database; set `MONGODB_URI` to keep data |
| "Ignored build scripts" warning during install | Safe to ignore |

## Where the data comes from

| Data | Source |
|---|---|
| Flight boards and status | Built-in simulator, labelled **Demo data** |
| Aircraft positions | Simulator by default; OpenSky Network in live mode |
| Fares and exchange rates | Simulator, labelled **Demo data** |
| Weather | Open-Meteo (real, live) |
| Base map | OpenFreeMap (OpenStreetMap data) |

Simulated data is always labelled as demo data in the app. Don't use it for real travel decisions.

## Project structure

```
Airport-Management-System/
└─ aeronexus/
   ├─ backend/    API, database, realtime updates and the flight simulator
   ├─ frontend/   the website
   └─ README.md   technical notes for developers
```

For architecture, data rules and test commands, see [`aeronexus/README.md`](aeronexus/README.md).
