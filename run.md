# How to run the app (Windows/macOS/Linux)

This repo contains:

- `frontend/` — Next.js (TypeScript)
- `backend/` — Fastify + Prisma + PostgreSQL (TypeScript)

The **frontend** runs on port `3000` by default.
The **backend** runs on port `4000` by default.

---

## Copy/paste commands (frontend + backend together)

These commands assume you are in the **repo root** (the folder that contains `frontend/` and `backend/`).

### Install dependencies

```bash
npm --prefix backend install
npm --prefix frontend install
```

### Create env file + run migrations

macOS/Linux:

```bash
cp backend/.env.example backend/.env
npm --prefix backend run prisma:generate
npm --prefix backend run prisma:migrate
```

Windows (PowerShell):

```powershell
Copy-Item backend\.env.example backend\.env
npm --prefix backend run prisma:generate
npm --prefix backend run prisma:migrate
```

### Best non-local database (recommended): managed PostgreSQL (Neon or Supabase)

This is the best “not local” setup for the database:

- Create a managed Postgres database (Neon or Supabase)
- Put its connection string in `backend/.env` as `DATABASE_URL=...`
- Apply migrations with `prisma migrate deploy` (works well on managed DBs)

Copy/paste flow (repo root):

```bash
# 1) Create backend env
cp backend/.env.example backend/.env

# 2) Edit backend/.env and set DATABASE_URL to your managed Postgres URL
#    Example (Neon/Supabase gives you this):
#    DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require

# 3) Generate Prisma client + apply existing migrations (no shadow DB needed)
npm --prefix backend run prisma:generate
npm --prefix backend run prisma:deploy
```

Frontend connection to backend (server-side, recommended):

```bash
# Create a frontend env file (server-only variables)
cp frontend/.env.example frontend/.env.local

# Edit frontend/.env.local:
# - BACKEND_URL=http://localhost:4000
# - BACKEND_ADMIN_API_KEY=<same value as backend ADMIN_BOOTSTRAP_KEY>
```

### Start both in development

Because both servers are long-running, you typically need **two terminals**.

Option A (recommended): two terminals

```bash
# Terminal 1 (backend)
npm --prefix backend run dev

# Terminal 2 (frontend)
npm --prefix frontend run dev
```

Option B: one terminal (macOS/Linux) — backend runs in background

```bash
npm --prefix backend run dev &
npm --prefix frontend run dev
```

Option C: Windows (PowerShell) — start backend in a new window, then run frontend here

```powershell
Start-Process powershell -ArgumentList '-NoExit', '-Command', 'npm --prefix backend run dev'
npm --prefix frontend run dev
```

## 1) Prerequisites

### Required

- **Node.js 20+**
- **npm** (comes with Node)

### Database (pick one)

You need **PostgreSQL** for the backend.

Option A (recommended, easiest cross-platform): **Docker**

- Windows/macOS: install **Docker Desktop**
- Linux: install Docker Engine + Compose

Option B: local PostgreSQL install

- Windows: install PostgreSQL from the official installer
- macOS: `brew install postgresql@14` (or newer)
- Linux: install via your package manager

---

## 2) Backend setup (Fastify + Prisma)

### 2.1 Create backend env file

From repo root:

```bash
cp backend/.env.example backend/.env
```

On Windows PowerShell:

```powershell
Copy-Item backend\.env.example backend\.env
```

Important variables (in `backend/.env`):

- `DATABASE_URL=postgresql://app:app@localhost:5432/app?schema=public`
- `ADMIN_BOOTSTRAP_KEY=...` (dev-only admin key)

### 2.2 Start PostgreSQL

#### Option A: Docker (recommended)

From repo root:

```bash
cd backend
docker compose up -d
```

If you prefer copy/paste from repo root without `cd`:

```bash
docker compose -f backend/docker-compose.yml up -d
```

#### Option B: Local PostgreSQL

Create a database + user to match the default `DATABASE_URL`.

**Windows (psql in Command Prompt / PowerShell):**

```sql
-- Run these in psql connected as a superuser (e.g. postgres)
CREATE ROLE app LOGIN PASSWORD 'app';
ALTER ROLE app CREATEDB;
CREATE DATABASE app OWNER app;
```

**macOS/Linux (if you have a local Postgres superuser):**

```bash
psql postgres -c "CREATE ROLE app LOGIN PASSWORD 'app';" || true
psql postgres -c "ALTER ROLE app CREATEDB;"
createdb app --owner=app || true
```

> Note: Prisma `migrate dev` uses a “shadow database”, so the DB user in `DATABASE_URL` typically needs `CREATEDB` in local development.

### 2.3 Install backend dependencies

```bash
npm --prefix backend install
```

### 2.4 Run Prisma migrations

```bash
npm --prefix backend run prisma:generate
npm --prefix backend run prisma:migrate
```

If you are using a managed/non-local Postgres, prefer:

```bash
npm --prefix backend run prisma:deploy
```

### 2.5 Start the backend

```bash
npm --prefix backend run dev
```

Backend should be available at:

- `http://localhost:4000/api/health`

---

## 3) Frontend setup (Next.js)

### 3.1 Install frontend dependencies

```bash
npm --prefix frontend install
```

### 3.2 Start the frontend

```bash
npm --prefix frontend run dev
```

Frontend should be available at:

- `http://localhost:3000`

If port `3000` is already used, pick another port:

```bash
npm --prefix frontend run dev -- --port 3001
```

---

## 4) Quick API smoke test (optional)

If backend is running, you can test basic flow.

### 4.1 Health

```bash
curl http://localhost:4000/api/health
```

### 4.2 Create an ingest key (admin)

Use the `ADMIN_BOOTSTRAP_KEY` from `backend/.env`:

```bash
curl -X POST http://localhost:4000/api/api-keys \
  -H "X-API-Key: dev-admin-bootstrap-key" \
  -H "Content-Type: application/json" \
  -d '{"name":"gateway-1","scope":"INGEST"}'
```

It returns a JSON object containing `key`. Save it — it’s shown only once.

### 4.3 Send an ingest payload

```bash
curl -X POST http://localhost:4000/api/ingest/lora \
  -H "X-API-Key: <INGEST_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"gatewayId":"gw-1","trapId":"TRP-0001","rssi":-82,"decoded":{"triggered":false}}'
```

If your gateway only knows the hardware identity (recommended once provisioned in `/deploy-trap`):

```bash
curl -X POST http://localhost:4000/api/ingest/lora \
  -H "X-API-Key: <INGEST_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"gatewayId":"gw-1","deviceId":"YOUR_DEVICE_ID","decoded":{"triggered":true}}'
```

Then verify:

```bash
curl "http://localhost:4000/api/sensors?page=1&pageSize=25" -H "X-API-Key: dev-admin-bootstrap-key"
curl "http://localhost:4000/api/events?limit=10" -H "X-API-Key: dev-admin-bootstrap-key"
```

### 4.4 Connect a real LoRa-E5 (TTN webhook)

If your board is sending uplinks through **The Things Network (TTN)**, you can connect it directly to this backend.

1. Provision the sensor in the UI

- Go to `http://localhost:3000/deploy-trap`
- Set **Device ID** to the TTN **DevEUI** (recommended)

2. Create an ingest key (same as above)

- You need an API key with scope `INGEST`.

3. Create a TTN webhook

- In the TTN Console: your application → **Integrations** → **Webhooks** → add webhook
- URL: `http://<YOUR_BACKEND_HOST>:4000/api/ingest/ttn`
- Headers: `X-API-Key: <INGEST_KEY>`

Notes:

- If your backend is running locally, you must expose it (e.g. via a tunnel) so TTN can reach it.
- The backend uses `end_device_ids.dev_eui` as `deviceId` and maps it to the provisioned sensor.
- In TTN payload formatter, include `decoded_payload.triggered` as `true/false` for alarm state.

---

## 5) Production build commands (optional)

### Backend + Frontend (commands next to each other)

```bash
# Backend
npm --prefix backend run lint
npm --prefix backend run build
npm --prefix backend run start

# Frontend
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix frontend run start
```

---

## Troubleshooting

### `npm run dev` says “Missing script: dev”

That means you ran `npm run dev` from the **repo root**.

Run it from the correct folder:

- Frontend: `cd frontend && npm run dev`
- Backend: `cd backend && npm run dev`

Or use prefix form:

- `npm --prefix frontend run dev`
- `npm --prefix backend run dev`

### Port already in use

- Frontend: run `npm run dev -- --port 3001`
- Backend: set `PORT=4001` in `backend/.env`

### Prisma shadow database error (P3014)

For local Postgres, give the DB user `CREATEDB`:

```sql
ALTER ROLE app CREATEDB;
```

### `docker compose` not found / Exit code 127

That means Docker/Compose isn’t installed or isn’t on your PATH.

- macOS/Windows: install **Docker Desktop**
- Or skip Docker entirely and use a **managed Postgres** (see “Best non-local database” above), then run `npm --prefix backend run prisma:deploy`

---
