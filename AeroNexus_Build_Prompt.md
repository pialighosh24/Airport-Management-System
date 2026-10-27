# Build Prompt: AeroNexus (Vite + React + Node + MongoDB, light glassmorphic UI)

> Paste everything below this line into Claude Code, run from an **empty folder** (not the Expo app folder).

---

You are building **AeroNexus**, an airport operations, live flight tracking and smart fare comparison web platform. The product spec is the "AeroNexus Major Project Blueprint v2.0". This prompt adapts it to a **Vite + React + TypeScript frontend, Node.js (Express) backend and MongoDB** database. Follow the product rules exactly; the stack substitutions are listed in section 2.

Work in phases (section 9). At the end of every phase, stop, run lint + typecheck + tests, take screenshots, and report to me before continuing.

Before using any library API, check its current docs. Do not rely on memory for Vite, Tailwind, React Router, Mongoose, MapLibre or Motion versions. Install with the package manager, never hand-write version numbers.

---

## 1. Product in one paragraph

AeroNexus unifies a live aircraft map, airport arrivals/departures boards, like-for-like ticket fare comparison, alerts and an airport ops console. Its core principle: **every number on screen shows its source and freshness, and unknown values stay unknown, never guessed.** It is informational only: not air traffic control, not airline dispatch, not a booking system, not an airport's official FIDS. Default currency INR, default region India (DEL, BOM, BLR, CCU, MAA, HYD, COK, GOI, AMD, PNQ...).

**Personas:** Riya (traveller: "is my flight on time, best fare DEL→CCU next Friday?"), Arjun (ops analyst: spots disruptions, opens cases), Meera (airport supervisor: assigns/closes cases, audited shift report), Kabir (platform admin: provider health, users, roles, retention), Sana (analyst: delay and fare trends).

**Non-goals:** selling tickets or storing payment data (link out to suppliers), claiming a flight's origin/destination from proximity alone, letting staff overwrite provider-owned flight status, scraping sites that forbid it.

---

## 2. Stack (replaces the blueprint's Next.js / NestJS / Postgres stack)

| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces: `apps/web`, `apps/server`, `packages/shared` |
| Frontend | Vite + React + TypeScript (strict), React Router (data router), TanStack Query, Tailwind CSS v4 via `@tailwindcss/vite` |
| UI primitives | Radix primitives (via shadcn/ui CLI as a starting point only, every component restyled, see section 6) |
| Motion | Motion (`motion/react`) |
| Charts | Recharts or visx, styled per the `dataviz` skill |
| Map | MapLibre GL JS with a free light basemap (OpenFreeMap "positron"/"bright" or Carto Positron), WebGL symbol layers + clustering |
| Backend | Node.js + Express + TypeScript, zod validation, Socket.IO (`/rt` namespace), node-cron for background jobs (modular monolith: API and worker in one process, split later only if needed) |
| Database | MongoDB 7+ with Mongoose. Run as a single-node replica set in Docker (enables transactions and change streams) or MongoDB Atlas |
| Auth | Email + password (argon2), JWT access token in httpOnly secure cookie + rotating refresh token, TOTP MFA (otplib) required for staff/admin roles, RBAC + airport scope, deny by default |
| Email | Nodemailer → Mailpit locally |
| Tests | Vitest (unit), Supertest + mongodb-memory-server (integration), Playwright (e2e), axe-core (a11y) |
| Data sources | OpenSky Network REST (aircraft positions), Amadeus Self-Service test env or any licensed fare API (fares; verify availability first), Open-Meteo (weather context), a licensed FX source. All behind adapters. `PROVIDER_MODE=demo` works fully offline with fixtures |

Redis/BullMQ is **not** required. Use an in-process event bus for realtime fan-out and a `jobs` collection for retries. Add Redis only if a measured need appears.

---

## 3. Folder structure

```
aeronexus/
├─ package.json  pnpm-workspace.yaml  tsconfig.base.json  .env.example  docker-compose.yml  README.md
├─ apps/
│  ├─ web/                         # Vite app
│  │  ├─ index.html  vite.config.ts
│  │  └─ src/
│  │     ├─ main.tsx  router.tsx
│  │     ├─ routes/                # one file per page (section 5)
│  │     ├─ components/{map,flights,fares,airports,alerts,ops,admin,shared}/
│  │     ├─ design/                # tokens.css, glass.css, fonts, icons
│  │     ├─ lib/{api-client,socket,formatters,time,a11y}.ts
│  │     └─ hooks/{useBoard,useAircraftStream,useFareSearch}.ts
│  └─ server/
│     └─ src/
│        ├─ index.ts  app.ts  env.ts
│        ├─ common/{auth,rbac,validate,errors,request-id,rate-limit,audit}.ts
│        ├─ modules/{identity,airports,flight-board,tracking,fares,providers,alerts,trips,disruptions,analytics,audit,realtime}/
│        │     # each: routes.ts, service.ts, model.ts, schema.ts, *.test.ts
│        ├─ integrations/{opensky,flight-status,fare-search,fx,weather}/{client,mapper,contract.test}.ts
│        ├─ jobs/{opensky.poll,board.sync,fare.refresh,alert.evaluate,alert.deliver,retention.purge}.ts
│        └─ seed/                  # DEMO airports, flights, offers
└─ packages/shared/                # zod schemas, canonical types, freshness logic, API contracts
```

Rules: apps import only from `packages/shared`, never from each other. Vendor JSON never leaks past an integration's `mapper.ts`. Add a field to the canonical model first, then mapper, model, API, UI.

---

## 4. Backend

### Provider adapter contract (keep exactly)
```ts
interface ProviderAdapter<TQuery, TCanonical> {
  readonly id: string;
  fetch(q: TQuery, ctx: RequestCtx): Promise<ProviderResult<TCanonical>>;
  health(): Promise<ProviderHealth>;   // latency, last success, quota
}
type Freshness = 'LIVE' | 'RECENT' | 'STALE' | 'DEMO' | 'UNAVAILABLE';
type ProviderResult<T> = {
  data: T[]; source: string; fetchedAt: string; providerTimestamp: string | null; freshness: Freshness;
};
```
Wrap every adapter with timeout, bounded retry with backoff, circuit breaker and quota guard. Cache fallback is always labelled **STALE**, never LIVE. Fixture data is always **DEMO**.

### MongoDB collections (replaces the Postgres schema)
All instants stored in UTC; airport IANA timezone stored separately.

| Collection | Key fields | Indexes |
|---|---|---|
| users, sessions, mfaMethods | email, passwordHash, roles[], airportScope[] | unique email |
| airports (terminals + gates embedded) | iata, icao, name, city, timezone, location (GeoJSON Point) | unique sparse iata / icao, `2dsphere` on location, text index on name+city |
| flightLegs | carrier, number, serviceDate, origin, destination, scheduledDep/Arr, estimated/actual times, status, terminal, gate, belt, source, fetchedAt, freshness | unique (carrier, number, serviceDate, origin); (origin, scheduledDep); (destination, scheduledArr) |
| statusSnapshots | flightLegId, capturedAt, status, times, source | (flightLegId, capturedAt desc), append-only |
| aircraftStates | **time-series collection**: timeField `observedAt`, metaField `{icao24, callsign}`, location, baroAltitude, velocity, heading, onGround | `2dsphere` on location, `expireAfterSeconds` per provider terms |
| flightMatches | icao24, flightLegId, matchConfidence, matchEvidence | (icao24, createdAt desc) |
| fareSearches, fareOffers (segments embedded, ordered) | providerRef, totalPrice, currency, origPrice, fxRate, fxAt, expiresAt, baggage, fareRules | unique (searchId, providerRef), TTL on expiresAt |
| farePriceChecks | offerId, oldPrice, newPrice, checkedAt | |
| alertRules, alertDeliveries, trips | owner, type, entityKey, threshold, enabled, dedupeKey, quietHours, channels | unique dedupeKey |
| disruptionCases (notes embedded), turnaroundMilestones | airportId, status, assignee, openedAt, resolvedAt | (airportId, status) |
| providerConfigs, providerRuns, quotaEvents | latencyMs, success, errorCode, quotaRemaining | |
| auditEvents, dataExports | actor, action, reason, before, after, createdAt | (actor, createdAt) |
| jobs | type, payload, attempts, runAt, status | (status, runAt) |

### API (`/api/v1`, RFC 7807 problem+json errors with `code`, `detail`, `requestId`)
`GET /airports?query=` · `GET /airports/:iata` · `GET /airports/:iata/board?type=arrival|departure` · `GET /flights/:flightKey` · `GET /flights?origin=&destination=&date=` · `GET /tracking/states?bbox=` · `GET /tracking/aircraft/:icao24` · `GET /tracking/aircraft/:icao24/trail` · `POST /fares/search` · `POST /fares/:offerId/price-check` (throttled) · `GET|POST /alerts` · `GET|POST /trips` (user) · `GET /ops/airports/:iata/cases` · `POST /ops/cases` (ops) · `POST /ops/exports` (supervisor) · `GET /admin/providers/health` (admin) · `GET /healthz` `/readyz`.

Cursor pagination capped at 100. `x-request-id` on every request and log line. Validate every input with shared zod schemas (airport codes, dates, passenger counts, bbox size, sort keys, socket subscriptions). Helmet, strict CORS, CSRF protection for cookie auth, rate limiting per IP and per user. **No API key ever reaches the browser.**

### Realtime (`/rt`)
Events: `flight.status.updated`, `aircraft.position.updated`, `airport.board.snapshot`, `fare.search.completed`, `alert.triggered`, `provider.health.changed`, `disruption.case.updated`. Every event carries `eventId, eventTime, source, schemaVersion, correlationId`. Rooms per airport and per map tile. Clients reconnect with exponential backoff and request a fresh snapshot before applying deltas.

### Domain rules (non-negotiable)
- **Freshness states:** LIVE (inside provider window), RECENT (older, within stale window, show age), STALE (cache fallback, show age in words), DEMO (fixtures, page banner), UNAVAILABLE (explain, never fabricate). Thresholds from env.
- **Flight matching:** exact ICAO24/registration first; otherwise score callsign 0.40 + schedule window 0.30 + route corridor 0.20 + airport proximity 0.10; attach only at ≥ `MATCH_CONFIDENCE_MIN` (0.80), show the confidence and evidence; if ambiguous show the aircraft without origin/destination. Unit-test the thresholds.
- **Board:** status set = scheduled, boarding, departed, en route, landed, arrived, delayed, cancelled, diverted, unknown. Scheduled time always preserved; scheduled and estimated/actual shown separately in the airport's local timezone (DST-safe, unit-tested).
- **Fares:** compare total itinerary price for same pax/cabin/currency; keep original price, converted price, FX rate and timestamp; dedupe by segments+dates+cabin+fare family+provider but keep offers with different baggage/refund rules; sorts: lowest total, shortest, fewest stops, or disclosed weighted score (0.55 price + 0.30 duration + 0.15 stops). "Baggage not specified" is never shown as "included". Copy says "indicative until checkout". Never say "cheapest on the internet".
- **Alerts:** delay, cancellation/diversion, gate/terminal change, price drop, flight watch, airport disruption; dedupe keys per blueprint; quiet hours; channels email/in-app; retry with backoff; failures visible to admin.
- **Ops:** staff annotate a separate disruption case, never edit provider status. Every manual action audited with actor, timestamp, reason, before/after. Staff only see their assigned airports. Exports field-limited and audited.

### Roles
| Capability | Public | User | Ops analyst | Supervisor | Admin |
|---|---|---|---|---|---|
| Search flights, map, boards | ✓ | ✓ | ✓ | ✓ | ✓ |
| Own trips, alerts, profile | | ✓ | ✓ | ✓ | ✓ |
| Assigned-airport dashboard, create cases/notes | | | ✓ | ✓ | ✓ |
| Assign/close cases, milestones, audited export | | | | ✓ | ✓ |
| Provider config, airport master, users, roles, audit, retention | | | | | ✓ |

---

## 5. Frontend routes

| Route | Purpose |
|---|---|
| `/` | The tool itself, not a marketing page: route/airport search, a live departures strip for a chosen airport, provider status strip |
| `/flights`, `/flight/:flightKey` | Search by number/route; detail with timeline, mini-map, source tag, watch/alert button |
| `/live-map` | Aircraft map, filters (altitude, speed, callsign, airborne/ground), detail drawer, trail slider where licensed, **keyboard-operable list view alternative** |
| `/airports/:iata` | Arrivals/departures tabs, filters (airline, status, terminal, time window), pin, export |
| `/compare` | Fare search + offer cards + filters + sort + price-check modal + supplier link |
| `/login`, `/saved-trips`, `/alerts`, `/profile` | Account |
| `/ops/{dashboard,airport-board,turnarounds,disruption-desk,reports}` | Ops console |
| `/admin/{providers,users-roles,airports,audit}` | Admin |

Shared components: `FreshnessBadge`, `SourceTag`, `StatusBadge`, `TimePair` (scheduled vs estimated), `EmptyState`, `Skeleton`, `DemoBanner`. Empty and error states must say whether data is missing, delayed or the provider is down. No fake placeholders.

Performance budget: LCP < 2.5 s on 4G, map at 60 fps with 1,500 markers (clustering + WebGL layers, no DOM markers), route-level code splitting, map bundle lazy-loaded.

---

## 6. Design direction: light, glassmorphic, and NOT AI-generated-looking

### 6.1 Use my installed skills, in this order
1. **`hallmark`**: run first for greenfield design direction and anti-AI-slop rules. Produce a one-page design brief (mood, type, colour, layout grid, signature element) and get my approval before building pages.
2. **`ui-ux-pro-max:design-system`** and **`ui-ux-pro-max:ui-ux-pro-max`**: turn the brief into tokens (`apps/web/src/design/tokens.css`): colour, type scale, spacing, radius, shadow, glass tiers, z-index, motion durations.
3. **`frontend-design:frontend-design`**: build each page against the brief.
4. **`ui-ux-pro-max:ui-styling`** + **`vercel:shadcn`**: install Radix-based primitives, then restyle every one to the tokens. Nothing may ship with default shadcn styling.
5. **`motion-framer`**: all motion (section 6.5).
6. **`dataviz`**: every chart, KPI tile, sparkline and the disruption heatmap in ops/analytics.
7. **`vercel:react-best-practices`**: performance pass on rendering, memoisation, bundle size.
8. **`impeccable`**: after each page group, run its critique → polish → harden → adapt (responsive) → animate passes, plus an accessibility audit.
9. **`hallmark` audit mode**: final anti-slop audit of every page with screenshots.
10. **`run`** + **`anthropic-skills:chrome-browser`**: launch the app and screenshot each page at 375, 768 and 1440 px widths for review.
11. **`code-review`**, **`security-review`**, **`simplify`**: before declaring each phase done.

Optional: `figma:figma-generate-design` if I ask for Figma mockups first; `vercel:deploy` for hosting the web app.

### 6.2 Visual concept: "Clear-sky terminal"
Morning light through a terminal's glass wall. Calm, precise, aviation-grade. Think airport wayfinding signage and a well-made airline app, not a crypto dashboard.

- **Light theme only.** No dark mode, no dark sections, no dark hero.
- **Background (the glass needs something to blur):** pale sky base `#EEF3F8` with a very soft dawn wash (cool sky blue top-left fading to a warm haze `#F6EEE4` bottom-right), plus two brand motifs drawn as faint 1px line art: **concentric radar rings** (taken from the blueprint cover) and **dashed runway centrelines**. Optional low-opacity blurred aerial photo on `/` only (licensed, e.g. Unsplash, credited).
- **Brand palette (starting point, hallmark may refine with reasons):** ink `#0E1B2C`, slate `#4A5A6E`, sky `#2F6FDB` (primary action), runway amber `#E39B2D` (highlights, selected state, pinned flights), signal green `#1F9D6B`, alert red `#D2453B`. Tint shadows with navy, never pure black.
- **Typography:** IBM Plex Sans for UI, **IBM Plex Mono with tabular numerals** for times, flight numbers, IATA codes, prices and coordinates, Instrument Serif only for a few large page titles. IATA codes in mono caps with slight letter-spacing (`DEL → CCU`). No Inter.
- **Icons:** one set only (Phosphor or Lucide), one stroke weight. No emoji anywhere in the UI.

### 6.3 Glass system (three tiers, used deliberately)
| Tier | Use | Fill | Blur |
|---|---|---|---|
| `glass-float` | top nav, map toolbars, floating filters, drawer | `rgba(255,255,255,0.55)` | `blur(20px) saturate(160%)` |
| `glass-card` | cards, stat tiles, offer cards | `rgba(255,255,255,0.70)` | `blur(16px) saturate(150%)` |
| `glass-dense` | tables, boards, forms, modals (text-heavy) | `rgba(255,255,255,0.88)` | `blur(12px)` |

Each tier: 1px border `rgba(255,255,255,0.75)`, outer hairline ring `rgba(14,27,44,0.08)`, inset top highlight `inset 0 1px 0 rgba(255,255,255,0.9)`, layered navy-tinted shadow. Rules:
- All text ≥ 4.5:1 contrast measured against the **worst-case** pixel behind the glass. Dense data always on `glass-dense`.
- Never put `backdrop-filter` on per-row or per-marker elements; max two stacked blurred layers on screen.
- `@supports not (backdrop-filter: blur(1px))` → solid `#FFFFFFF2`. `prefers-reduced-transparency` → opaque surfaces. `prefers-reduced-motion` → no non-essential motion.

### 6.4 Anti-AI-look rules (hard bans)
- No purple/indigo/pink gradients, no gradient text, no glowing blobs or orbs, no neon.
- No generic SaaS hero with a headline, subtext, two buttons and three icon-on-top feature cards. No "Revolutionize / Seamless / Unlock / Elevate / Effortless" copy. No fake stats ("10M+ travellers").
- Not everything centred and not everything `rounded-2xl`. Radius scale 6 / 10 / 16; tables and boards use the small radius.
- No identical card grids repeated down the page. Use an asymmetric 12-column grid with real information density: a board deserves width, a stat deserves a narrow column.
- No lorem ipsum. Copy is plain and specific, written like an ops person: "Updated 42 s ago · OpenSky", "Gate not published yet", "Fare indicative until checkout".
- No default component-library look, no default Tailwind blue `#3B82F6`, no default shadows.
- Every page needs at least one detail that proves a human designed it for *this* domain (see 6.5).

### 6.5 Signature details
- **Split-flap transition** on board cells when a status or time changes (short, per-character, mono font). Respect reduced motion.
- **FreshnessBadge** uses shape + colour + text, never colour alone: LIVE = filled dot with a slow pulse ring, RECENT = half-filled dot + age, STALE = hollow triangle + "4 min old", DEMO = diagonal-striped tag + page-level banner, UNAVAILABLE = crossed circle + reason.
- **TimePair:** scheduled time struck through or muted when estimated differs, delay delta in amber (`+38m`), local timezone abbreviation shown.
- **Boarding-pass style offer cards** in `/compare`: perforation divider between route and price, mono segments, baggage row that explicitly says "Not specified by supplier" when unknown.
- **Live map:** light basemap, aircraft as rotated heading glyphs coloured by altitude band (with a legend), radar-ring pulse on the selected aircraft, glass drawer with match confidence shown as a labelled bar plus evidence list.
- **Motion:** 150-250 ms, ease-out, purposeful only: drawer slides, list reorders with layout animation, number tickers on stat tiles. No bouncing, no parallax for its own sake, no scroll-jacking.

### 6.6 Responsive and accessible
Mobile first. At 375 px the board becomes stacked flight rows, the map gets a bottom-sheet drawer, the compare filters move into a sheet. WCAG 2.2 AA, visible focus rings matching the brand, full keyboard operation of boards, map list view and compare page, `aria-live` for status changes, 44 px touch targets.

---

## 7. Environment (`.env.example`, every variable documented, no secrets committed)
`MONGODB_URI`, `JWT_SECRET`, `REFRESH_SECRET`, `COOKIE_DOMAIN`, `OPENSKY_CLIENT_ID`/`OPENSKY_CLIENT_SECRET` (optional, anonymous works with lower limits), `FLIGHT_STATUS_API_KEY`, `AMADEUS_CLIENT_ID`/`AMADEUS_CLIENT_SECRET`, `FX_API_KEY`, `PROVIDER_MODE=live|demo`, `FRESHNESS_LIVE_SEC`, `FRESHNESS_STALE_SEC`, `MATCH_CONFIDENCE_MIN=0.80`, `SMTP_URL`. Only `VITE_`-prefixed, non-secret values (e.g. a public map style URL) may reach the browser.

`docker-compose.yml`: `mongo` (single-node replica set, port 27017), `mailpit` (8025). One command dev: `pnpm dev` runs web (5173) and server (4000) together.

---

## 8. Testing and done criteria
- Unit: status mapping, timezone/DST, fare ranking + dedupe, FX, freshness state, match scoring.
- Contract: each provider mapper against fixtures with missing fields, malformed payloads, 429s, empty results.
- Integration: Mongo repositories (mongodb-memory-server), adapters, retry, circuit breaker.
- E2E (Playwright, fixtures only): airport → board → flight detail → fare compare → create alert; ops case lifecycle; role denial.
- a11y: axe on every route.
- **CI never calls live APIs.** Seed and fixture data are labelled DEMO.

Definition of done per feature: typed, linted, tests green; source + freshness shown wherever data appears; unknown renders as unknown; authorisation checked server-side; inputs validated; no secrets in logs or bundle; screenshots at 3 widths reviewed against section 6.

---

## 9. Phases (stop and report after each)
- **P0 Design:** `hallmark` brief → tokens via `ui-ux-pro-max` → glass utilities → a static style-guide page (`/__styleguide`) showing type, colours, glass tiers, badges, buttons, inputs, table, offer card. **Wait for my approval.**
- **P1 Foundation:** monorepo, docker-compose, Express app, Mongo connection, request IDs, error format, auth + MFA + RBAC skeleton, health endpoints, app shell + nav.
- **P2 Airports:** seed Indian + major international airports (DEMO), search API + UI, local-time display.
- **P3 Board:** flight-status adapter (demo + live), board API/page, status history, FreshnessBadge, STALE fallback, flight detail timeline.
- **P4 Live map:** OpenSky adapter + cron poller, time-series collection, bbox API, MapLibre page with clustering, drawer, Socket.IO stream, confidence-scored matching, list view.
- **P5 Fares → MVP:** fare adapter, normaliser, dedupe, ranking, FX, compare page, price-check, supplier link. **MVP checkpoint: full e2e demo.**
- **P6 Alerts & trips:** rules, evaluator job, dedupe, email/in-app delivery, quiet hours, saved trips, read-only share link, multi-airport watchboard.
- **P7 Ops console:** airport-scoped roles, disruption desk, case notes/assignment, turnaround milestones, audited exports.
- **P8 Analytics:** delay and fare trends, disruption heatmap (via `dataviz`), retention purge job.
- **P9 Hardening:** `impeccable` + `hallmark` audits on every page, `security-review`, load check on bbox/board/fare endpoints, PWA offline view with STALE labels, README with setup and architecture.

Start with P0 now.
