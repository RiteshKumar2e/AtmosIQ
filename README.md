# AtmosIQ

### Hyperlocal Air Pollution Intelligence & Climate Early-Warning Platform

> **See pollution before it becomes a crisis.**

AtmosIQ combines citizen observations, environmental signals, AI-powered analysis and
predictive intelligence to detect hyperlocal pollution risks before they escalate — and to
put a ranked, explainable early warning on a responding authority's desk.

Built for the **BRICS Clean Air & Climate Resilience** challenge.

---

## Problem

Air quality management rests on a network of reference-grade monitoring stations. They are
precise, calibrated and legally defensible — and there are rarely more than a few dozen
across a metropolitan area holding tens of millions of people.

That design tracks regional trends well. It is structurally unable to catch a landfill fire
at its perimeter, an uncontrolled stack in an industrial cluster, or a construction site
working without dust suppression. Those events are hyperlocal, intermittent and
consequential — and they are exactly what a sparse fixed network averages away.

```
Fixed Monitoring Stations
        ↓
Coverage Gaps
        ↓
Hidden Local Pollution
        ↓
Delayed Detection
        ↓
Delayed Response
```

## Solution

AtmosIQ treats the gap as an information problem rather than a hardware problem. Instead of
waiting for denser instrumentation, it makes the observations people already make rigorous
enough to act on.

```
Citizen Signals  →  AI Analysis  →  Environmental Data  →  Risk Intelligence  →  Early Warning
```

Every stage adds **independent evidence** rather than amplifying the previous one, and every
score is decomposed into the weighted factors that produced it.

---

## Features

| # | Capability | What it does |
|---|---|---|
| 1 | **Citizen Intelligence** | Structured intake for observations: photograph, description, geolocation, optional handheld sensor values |
| 2 | **AI Image Analysis** | Google Gemini multimodal classification of citizen photographs into event type, visible indicators and likely source |
| 3 | **Pollution Hotspot Detection** | Spatial clustering of corroborating signals into a hotspot with centroid, radius, probability and signal count |
| 4 | **Environmental Data Fusion** | Visual assessment combined with station readings, live meteorology and historical baselines |
| 5 | **Risk Scoring** | Transparent weighted 0-100 score with risk band, hotspot probability, confidence and per-factor contributions |
| 6 | **Forecasting** | Near-term risk projection with an explicit confidence band that widens with lead time |
| 7 | **Early Warning** | Ranked alerts with severity, location, driving score and a concrete recommended action |
| 8 | **Analytics** | Trends, source composition, hotspot frequency, citizen participation and monitoring coverage |
| 9 | **BRICS Intelligence** | Federated node model with a shared, versioned data schema |
| 10 | **Responsible AI** | Provenance labels on every value; AI framed as decision support, never as measurement |

---

## Architecture

```
atmosiq/
├── frontend/     Next.js 15 · React 19 · TypeScript · App Router
├── backend/      FastAPI · SQLAlchemy · SQLite
├── .gitignore
└── README.md
```

### Detection pipeline

```
01 — Citizen Signal            multipart submission, image travels with the report
        ↓
02 — AI Analysis               Gemini multimodal → structured, validated JSON
        ↓
03 — Environmental Fusion      station readings + meteorology + historical baseline
        ↓
04 — Risk Engine               weighted fusion → score, band, probability, confidence
        ↓
05 — Hotspot Detection         spatial clustering, radius scaled to severity
        ↓
06 — Forecast                  persistence + diurnal cycle + wind dispersion
        ↓
07 — Authority Alert           ranked, with acknowledge / assign / resolve lifecycle
        ↓
08 — Recommended Action        concrete operational next step for the responding unit
```

### Request path

```
Citizen → FastAPI (POST /api/reports) → Gemini → Risk Engine → Hotspot → Alert
```

---

## Technology Stack

**Frontend**

- Next.js 15 (App Router) · React 19 · TypeScript
- Tailwind CSS for layout utilities; all page styling in `frontend/styles/*.css`
- shadcn/ui-pattern primitives built on Radix UI
- TanStack Query (server state) · React Hook Form + Zod (forms)
- MapLibre GL JS (intelligence map) · Recharts (trends and forecast) · Lucide React (icons)

**Backend**

- FastAPI · Uvicorn
- SQLAlchemy 2.0 ORM over SQLite
- PyJWT authentication · bcrypt password hashing
- httpx for outbound providers
- Google Gemini for multimodal analysis

---

## Google Gemini Integration

Gemini performs four non-decorative jobs:

1. **Image analysis** — classifies a citizen photograph into an event type with visible
   indicators, a visual severity band and a candidate source.
2. **Report classification** — interprets the citizen's free-text description alongside the
   image.
3. **Environmental explanation** — explains why an area scores as it does, referencing the
   strongest weighted contributors.
4. **Intervention recommendation** — generates a concise, operational recommendation for the
   responding authority.

**Guardrails**

- The model is explicitly instructed that a photograph **cannot** establish an AQI, PM2.5 or
  PM10 value, and must keep visual evidence separate from instrument measurements.
- Output is requested as structured JSON against a fixed schema, then **re-validated and
  clamped server-side** before it is trusted.
- The API key is read from the backend environment only and is **never** exposed to the
  frontend.

**Fallback.** With no `GOOGLE_GEMINI_API_KEY` configured, the platform runs in
`DEMO_MODE` using a deterministic local analyser that returns the same schema. Every
response reports which engine produced it, and the UI badges it. **The application remains
fully functional without an API key.**

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Runs at <http://localhost:3000>.

## Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Runs at <http://localhost:8000>. The database is created and seeded automatically on first
start.

> No virtual environment is created or committed by this project. Manage your Python
> environment however you prefer.

---

## Environment Variables

Copy each `.env.example` to `.env` and fill in as needed. Both files ship with safe defaults —
the platform runs with no changes at all.

**`frontend/.env.example`**

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_MAP_STYLE_URL=
```

Leaving `NEXT_PUBLIC_MAP_STYLE_URL` blank uses a built-in OpenStreetMap raster style that
needs no API key.

**`backend/.env.example`**

```env
APP_ENV=development
SECRET_KEY=change-this-secret
DATABASE_URL=sqlite:///./atmosiq.db

GOOGLE_GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

WEATHER_API_KEY=

DEFAULT_COUNTRY_CODE=IN
DEFAULT_REGION_CODE=IN-DL
```

Never commit a real `.env`. `WEATHER_API_KEY` is optional — meteorology defaults to
Open-Meteo, which needs no key.

---

## API Documentation

Interactive Swagger UI: **<http://localhost:8000/docs>** (ReDoc at `/redoc`).

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/demo-login
POST   /api/auth/forgot-password
GET    /api/auth/me
POST   /api/auth/logout

GET    /api/reports
GET    /api/reports/types
GET    /api/reports/{id}
POST   /api/reports                  multipart: report + image, runs the full pipeline
POST   /api/reports/{id}/analyze

GET    /api/hotspots
GET    /api/hotspots/map             every map layer in one request
GET    /api/hotspots/{id}
GET    /api/hotspots/{id}/signals

GET    /api/forecast

GET    /api/alerts
GET    /api/alerts/summary
GET    /api/alerts/{id}
PATCH  /api/alerts/{id}

GET    /api/analytics/overview
GET    /api/analytics/trends
GET    /api/analytics/responsible-ai

GET    /api/brics/overview
GET    /api/brics/nodes/{country_code}

GET    /api/demo/scenario
POST   /api/demo/scenario/run
POST   /api/demo/reset

POST   /api/contact
GET    /api/health
```

Errors use a consistent envelope:

```json
{ "error": { "status": 422, "message": "Request validation failed", "fields": [] } }
```

---

## Authentication

- JWT bearer tokens issued by the backend, held client-side and attached by `lib/api.ts`
- bcrypt password hashing; login returns a uniform error so accounts cannot be enumerated
- Role-based access: `citizen`, `analyst`, `authority`, `admin`
- Elevated roles cannot be self-granted through public registration
- Unauthenticated visitors hitting `/dashboard/*` are redirected to `/login?redirect=…` and
  returned to their destination after signing in

**Demo access.** The login page offers **Continue with Demo Account**, which calls
`POST /api/auth/demo-login` and starts a pre-populated analyst session with no registration.

### Prototype limitations

- **Forgot password** does not send email. A scoped reset token is written to the backend log
  instead. The response is identical whether or not the address is registered.
- **Contact form** submissions are persisted and logged, not emailed.
- **Notification preferences** are honoured by the interface but no notifications are
  dispatched.

---

## Demo Mode

**Run Pollution Event Simulation** (button on the dashboard Overview) executes the complete
pipeline against the live backend:

```
Citizen report received → Image analysed → Risk calculated → Hotspot detected
   → Forecast updated → Authority alert generated → Recommended action
```

The synthetic event is placed deliberately away from any monitoring station — in the coverage
gap the platform exists to close. Every dashboard surface refreshes with the new data.

If Gemini is unavailable, the simulation runs in **`DEMO_MODE`** with the deterministic
analyser. The demonstration never breaks.

---

## Database

SQLite via SQLAlchemy, created and seeded automatically on first start.

**Tables:** `users`, `regions`, `monitoring_stations`, `citizen_reports`, `ai_assessments`,
`sensor_readings`, `hotspots`, `alerts`, `pollution_records`, `contact_messages`

Seed data is deterministic (fixed RNG seed), so every developer and every judge sees an
identical database: 20+ citizen reports, 10+ hotspots, alerts, sensor readings, historical
records and BRICS node metadata. The generated `.db` file is gitignored.

Point `DATABASE_URL` at PostgreSQL instead and no code changes are required.

---

## Deployment

**Frontend** — deploys to any Node host or Vercel:

```bash
cd frontend && npm run build && npm start
```

Set `NEXT_PUBLIC_API_URL` to the deployed backend origin.

**Backend** — any ASGI host:

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Before exposing publicly: set a strong `SECRET_KEY`, restrict `CORS_ORIGINS` to your frontend
origin, and point `DATABASE_URL` at a managed database.

---

## Responsible AI

> AI-generated environmental assessments are decision-support signals and should not replace
> certified air-quality measurements or official environmental monitoring.

This notice appears on every dashboard page that displays a model output.

**Provenance labels.** Every value the API returns carries a data mode, surfaced as a badge
in the interface:

| Label | Meaning |
|---|---|
| `LIVE` | Measured in real time by an external provider |
| `SIMULATED` | Synthetic demonstration data — deterministic and reproducible |
| `MODELLED` | Derived by the AtmosIQ risk or forecast engine |
| `AI ASSESSMENT` | Produced by multimodal AI analysis of a citizen submission |

**Commitments**

- No synthetic figure is ever presented as a certified measurement.
- The AI is prohibited from inferring numeric AQI values from imagery; any such claim that
  appears anyway is stripped server-side before it reaches the interface.
- Risk scores ship with their weighted contributions, so no output is a black box to the
  officer acting on it.
- The forecast is labelled a statistical projection, not a validated chemical transport model.
- The platform never issues an autonomous enforcement or policy decision — it assists a human
  decision-maker.

---

## Hackathon Alignment

**Clean air.** Closes the detection gap between fixed monitoring stations, where most
population exposure actually occurs, and shortens the interval between an emission starting
and an authority knowing about it.

**Climate resilience.** Builds institutional response capacity: a ranked, justified queue
instead of an undifferentiated complaint inbox, and a source-composition evidence base for
policy rather than for a single incident.

**BRICS cooperation.** No country-specific logic exists in the codebase. Regions,
coordinates, languages and node identity are configuration. A partner nation deploys the same
artefact, keeps citizen data entirely in-country, and exchanges only aggregate intelligence
through a shared, versioned schema.

> This prototype demonstrates the interoperability contract with one active node and four
> configured partner nodes. It does not perform live cross-border data exchange — that is the
> deployment path the architecture is designed to support.

**Working prototype.** Public site, authentication, protected dashboard, live map,
end-to-end AI pipeline, forecasting and alert lifecycle all run today, with or without a
Gemini API key.
