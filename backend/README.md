# Backend (Fastify + Prisma + Postgres)

This backend provides API-key protected endpoints for sensors, events, alerts, and LoRa ingestion.

## Requirements

- Node.js 20+
- PostgreSQL (managed service recommended) or Docker/local for Postgres

## Quick start

1. Start Postgres:

Recommended (non-local DB): use a managed Postgres provider (Neon / Supabase / etc.)

- Create a database and get the connection string
- Put it into `.env` as `DATABASE_URL=...` (usually with `sslmode=require`)

- With Docker: `docker compose up -d`
- With local Postgres: ensure it’s running and `DATABASE_URL` is correct

2. Create env file:

- `cp .env.example .env`

3. Install deps:

- `npm install`

4. Generate Prisma client + run migrations:

- `npm run prisma:generate`
- Managed/non-local Postgres (recommended): `npm run prisma:deploy`
- Local/dev database: `npm run prisma:migrate`

Note: `prisma migrate dev` uses a “shadow database”. The DB user in `DATABASE_URL` typically needs `CREATEDB` locally.

5. Run dev server:

- `npm run dev`

Server listens on `http://localhost:4000`.

## Docker (deploy-style)

If you want to run the backend + Postgres with Docker (good for a VPS):

```bash
cd backend
docker compose -f docker-compose.app.yml up -d --build
```

This will:

- Start Postgres
- Build the backend image
- Run `prisma migrate deploy`
- Start the API on port `4000`

Important: change `ADMIN_BOOTSTRAP_KEY` in `docker-compose.app.yml` before exposing it publicly.

## Auth

- Send API keys via `X-API-Key` header.
- Keys are stored hashed (sha256) in DB; plaintext key is only returned once at creation.
- For local development you can set `ADMIN_BOOTSTRAP_KEY` in `.env` and use that value as an admin key.

## Curl examples

Health:

- `curl http://localhost:4000/api/health`

Create an INGEST key (requires admin):

- `curl -X POST http://localhost:4000/api/api-keys \
-H "X-API-Key: $ADMIN_BOOTSTRAP_KEY" \
-H "Content-Type: application/json" \
-d '{"name":"gateway-1","scope":"INGEST"}'`

Ingest uplink:

- `curl -X POST http://localhost:4000/api/ingest/lora \
-H "X-API-Key: <INGEST_KEY>" \
-H "Content-Type: application/json" \
-d '{"gatewayId":"gw-1","trapId":"TRP-0001","rssi":-82,"decoded":{"triggered":false,"batteryPct":88}}'`

List sensors:

- `curl "http://localhost:4000/api/sensors?page=1&pageSize=25" -H "X-API-Key: $ADMIN_BOOTSTRAP_KEY"`

Events summary:

- `curl http://localhost:4000/api/events/summary -H "X-API-Key: $ADMIN_BOOTSTRAP_KEY"`

## Scripts

- `npm run dev` - dev server
- `npm run build` - TypeScript build to `dist/`
- `npm run start` - run built server
- `npm run lint` - eslint
- `npm run smoke` - minimal request smoke test
- `npm run prisma:deploy` - apply existing migrations (recommended for managed/non-local DB)
