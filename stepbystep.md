# Step-by-step backend + LoRa plan (based on your current frontend)

Date: 2026-04-14

## 0) What the current frontend is doing (important)

Your Next.js app (`frontend/`) is mostly a wrapper around **legacy HTML pages** rendered inside an `<iframe>` via `LegacyFrame`.

Those legacy pages currently store the “backend data” in **browser `localStorage`** using keys like:

- `legacy-sensors` (sensor inventory + current status)
- `legacy-history-events` (event log)
- `legacy-floors` (floor configuration)
- `legacy-floor-maps` (floor map URLs / imported maps)
- `legacy-api-keys` (API keys)
- `legacy-profile` (profile fields)
- `legacy-pending-trap` (pending trap deployment / location picked on the map)

That means: today, the “platform” works as a **front-only demo**. The backend you build should replace these `localStorage` stores with real persistence + real device ingestion.

## 1) Screens you already have → what backend must support

This is derived from the routes in `frontend/src/app/(app)` and the legacy pages in `frontend/public/legacy`.

### 1.1 Auth: Login + Register

Legacy pages:

- `index.html` (login UI)
- `inscription.html` (register UI)

Backend must support:

- Register new user
- Login (issue session/JWT)
- Logout (invalidate refresh token, if you use refresh)
- Password reset (optional, but login page has “forgot password” link)

### 1.2 Dashboard (overview)

The dashboard shows:

- Counts: `armed`, `triggered`, `low_battery`, `offline`
- “Live Activity” feed (latest events)
- 7‑day activity bar chart
- Floor map preview (selected map + triggered count)

Backend must support:

- Fast “summary” endpoint(s) to compute counts
- Recent events endpoint
- Time-series aggregation endpoint (events per day)
- Floor map resolution (which map belongs to which floor)

### 1.3 Sensors (inventory)

Legacy page: `capteurs.html`

A sensor has (from the legacy data model):

- `id` (Trap ID like `TRP-0922-A`)
- `floor` (label)
- `zone` (room/zone)
- `status` (`armed`, `triggered`, `low_battery`, `offline`)
- `lastActivity` (ISO timestamp)
- `battery` (0–100 or null)
- `signal` (0–4)

UI features visible in legacy:

- Search by Trap ID or Zone
- Filter by Floor, Status
- Pagination
- Add sensor
- Actions: “Reset Triggered”, “Export PDF”, “Advanced filters”

Backend must support:

- CRUD for sensors
- List sensors with query params for search/filter/pagination
- “Reset triggered sensors” action
- Export inventory report to PDF

### 1.4 Map (floor plan + markers)

Legacy page: `plan.html`

Features visible:

- Floor selector (`floor1`, `floor2`, `floor3`, `basement`)
- “Import floor maps” (image upload)
- Render markers from sensors on the map
- “Deploy New Trap” flow: pick location on map (X/Y % per floor) or manual coordinates (lat/lng)

Backend must support:

- Floor definitions (IDs + labels)
- Map upload / storage per floor
- Store sensor location:
  - `type=map` with `{floorId, xPct, yPct}`
  - OR `type=coordinates` with `{lat,lng}`
- Serve map assets + signed URLs (if stored in object storage)

### 1.5 History (event log)

Legacy page: `history.html`

Event model visible in legacy code:

- `id`
- `timestamp` (ISO)
- `type` (e.g. `triggered`, `sensor`, `deploy`)
- `severity` (`critical`, `warning`, `info`)
- `title`
- `detail` (optional)

Backend must support:

- Append events when sensor state changes or deployment occurs
- Query events by time range, sensor, severity/type
- Provide aggregates (today count, triggered count, low battery count, deployments)

### 1.6 Notifications

Legacy page: `notifications.html`

It derives “active alerts” from sensors:

- Triggered (status=triggered)
- Offline (status=offline)
- Low battery (status=low_battery or battery<=20)

Backend must support:

- Endpoint for current active alerts (derived view)
- Optional: push notifications (email/SMS/WhatsApp) later

### 1.7 Security: API keys + Change password

Legacy pages:

- `api-keys.html`
- `change-password.html`

Backend must support:

- API key lifecycle (create/list/revoke)
- Use API keys to authorize:
  - gateway uplinks
  - external integrations
- Change password securely

### 1.8 Profile

Legacy page: `profile.html`

Fields:

- `name`, `role`, `email`, `employeeId`, `phone`

Backend must support:

- Get/update profile

### 1.9 Deploy new trap

Legacy page: `deploy-trap.html` + `deploy-modal.js`

Backend must support:

- Device provisioning workflow:
  - Create sensor record
  - Set location
  - Assign hardware identity (deviceId / DevEUI / serial)
- Keep an audit/event when deployed

### 1.10 Missing/placeholder routes

Your Next dashboard quick link points to `/settings` but there is no Next.js page for it yet.
Backend can still have settings endpoints, but you can postpone UI until you add the route.

## 2) Backend architecture you should implement (recommended MVP)

### 2.1 Minimal but solid components

- **API server**: Node.js + TypeScript (fits your repo), e.g. Express or Fastify
- **Database**: PostgreSQL (recommended) or SQLite for early dev
- **ORM**: Prisma (nice for TypeScript + migrations)
- **Realtime**: Server‑Sent Events (SSE) for dashboard live activity (simple) or WebSocket later
- **File storage** (floor maps):
  - MVP: store on disk + serve static
  - Production: S3-compatible bucket (or equivalent) + signed URLs

### 2.2 Core domains (tables/collections)

You can implement these as SQL tables.

**User / Auth**

- `users`: id, name, email, passwordHash, role, employeeId, phone, createdAt
- `sessions` (optional): refresh tokens / device sessions

**Organizations (optional but recommended if this is multi-hotel)**

- `organizations`: id, name
- `memberships`: userId, organizationId, role

**Building model**

- `floors`: id, organizationId, floorId (e.g. `floor2`), label
- `floor_maps`: id, floorId, storageKey/url, uploadedAt

**Sensors/devices**

- `sensors`: id, organizationId, trapId (unique), floorId, zone, status, lastActivity, batteryPct, signalLevel
- `sensor_locations` (or inline JSON):
  - `type` = `map` or `coordinates`
  - if map: floorId, xPct, yPct
  - if coordinates: lat, lng

**Telemetry + events**

- `telemetry`: id, sensorId, receivedAt, batteryPct, rssi, snr, payloadRaw, decodedJson
- `events`: id, organizationId, sensorId (nullable), timestamp, type, severity, title, detail

**Alerts** (can be derived, or stored)

- derived from sensors OR table `alerts` if you want acknowledgements

**API keys**

- `api_keys`: id, organizationId, name, keyHash, createdAt, revokedAt

**Support tickets** (optional)

- `support_tickets`: id, organizationId, userId, subject, body, status

## 3) API endpoints your backend should expose (aligned to your UI)

Below is a pragmatic REST API spec. You can implement under `/api`.

### 3.1 Auth

- `POST /api/auth/register`
  - body: `{ name, email, password, organizationName? }`
- `POST /api/auth/login`
  - body: `{ email, password }` → `{ accessToken, refreshToken? }`
- `POST /api/auth/logout`
- `POST /api/auth/change-password`
  - body: `{ currentPassword, nextPassword }`

### 3.2 Profile

- `GET /api/me`
- `PATCH /api/me`
  - body: `{ name, role, phone, employeeId }`

### 3.3 Floors + maps

- `GET /api/floors`
- `POST /api/floors`
- `PUT /api/floors/:floorId`
- `POST /api/floors/:floorId/map`
  - multipart upload (image/svg)
- `GET /api/floors/:floorId/map`
  - returns `{ url }`

### 3.4 Sensors

- `GET /api/sensors`
  - query: `q`, `floorId`, `status`, `page`, `pageSize`
- `POST /api/sensors`
  - body: `{ trapId, floorId?, zone?, location?, hardwareId? }`
- `GET /api/sensors/:id`
- `PATCH /api/sensors/:id`
- `POST /api/sensors/reset-triggered`
  - sets status from `triggered` → `armed` (or a policy you define)
- `GET /api/sensors/export.pdf`
  - returns a PDF (or `POST` to create a job)

### 3.5 Events / history

- `GET /api/events`
  - query: `from`, `to`, `sensorId`, `severity`, `type`, `limit`, `cursor`
- `GET /api/events/summary`
  - returns `{ todayCount, triggeredCount, lowBatteryCount, deploymentsCount }`
- `GET /api/events/timeseries`
  - query: `days=7` → `[{label, count}]`

### 3.6 Notifications / alerts

- `GET /api/alerts/active`
  - returns alerts derived from current sensor statuses
- `POST /api/alerts/:id/ack` (only if you persist alerts)

### 3.7 API keys

- `GET /api/api-keys`
- `POST /api/api-keys`
- `DELETE /api/api-keys/:id` (revoke)

### 3.8 Device/gateway ingestion (LoRa)

You will need one ingress endpoint that the gateway/network server can call.

Option A (LoRaWAN via TTN/ChirpStack webhook):

- `POST /api/ingest/lorawan`
  - validates a gateway API key
  - parses payload from TTN/ChirpStack format

Option B (raw LoRa custom gateway):

- `POST /api/ingest/lora`
  - body: `{ gatewayId, deviceId, receivedAt, rssi, snr, payloadB64, signature }`

## 4) LoRa + Arduino (no Wi‑Fi): best practical architecture

You said you want Arduino + LoRa to avoid Wi‑Fi. LoRa solves **device → gateway**.
But you still need **gateway → server** using _something_: cellular, ethernet, or occasional USB sync.

### 4.1 Choose one of these two paths

#### Path 1 (recommended): LoRaWAN

**Pros**: standard, scalable, better tooling, security built-in
**Cons**: needs a LoRaWAN gateway + network server

You need:

- Sensor node: Arduino + LoRaWAN-capable radio (e.g. SX1276 based) + LoRaWAN stack
- Gateway: LoRaWAN gateway with **Ethernet or 4G/LTE backhaul** (no Wi‑Fi required)
- Network server: The Things Network (TTN) _if you have internet_ OR self-hosted ChirpStack
- Backend: receives uplinks via HTTP integration/webhook → your `/api/ingest/lorawan`

#### Path 2: Raw LoRa + custom protocol

**Pros**: simplest code on Arduino, no LoRaWAN complexity
**Cons**: you must implement security, retries, dedup, device join/provisioning

You need:

- Sensor node: Arduino + LoRa module
- Gateway node: Arduino (or Raspberry Pi) + LoRa module + **cellular modem** (SIM7600/4G) OR ethernet
- Backend: gateway posts HTTP to `/api/ingest/lora`

### 4.2 If there is truly “no internet” at the site

If there is no Wi‑Fi **and** no cellular/ethernet, you can still run:

- Backend locally on a laptop/Raspberry Pi on-site
- Sync data later (manual export) — but then it’s not a cloud dashboard.

Most projects solve this by giving the gateway a **4G SIM**.

## 5) Device data you should send over LoRa

Your UI needs these fields (minimum):

- `deviceId` / `trapId`
- `status` (armed/triggered/offline/low_battery)
- `batteryPct` (0–100)
- `lastActivity` timestamp
- signal quality (you can compute from RSSI/SNR at gateway)

### 5.1 Suggested message types

- `HEARTBEAT` (every N minutes): battery + health
- `ALERT_TRIGGERED` (instant): triggered event
- `STATUS_UPDATE` (on changes)

### 5.2 Payload format (MVP)

For Arduino simplicity, use a compact binary payload:

- 1 byte: protocolVersion
- 4 bytes: deviceId (uint32) OR use 8 bytes for DevEUI-like
- 1 byte: msgType
- 1 byte: status
- 1 byte: batteryPct
- 4 bytes: uptimeSeconds (optional)
- 2 bytes: counter (for replay protection)

Encode to Base64 at the gateway when sending HTTP.

## 6) Backend ingestion logic (what your backend must do)

When the backend receives an uplink:

1. Authenticate the sender (gateway API key or LoRaWAN integration secret)
2. Validate payload + counter (replay protection)
3. Decode payload → normalize to your sensor model
4. Upsert sensor current state:
   - update `status`, `batteryPct`, `lastActivity`, `signalLevel`
5. Write telemetry row (raw + decoded)
6. Create an event row when:
   - status changes (armed→triggered, etc.)
   - battery crosses threshold (e.g. <=20)
   - device hasn’t been seen for X minutes (offline)
7. Update “active alerts” view/table
8. Publish realtime update (SSE/WebSocket) so dashboard updates instantly

### 6.1 How to mark sensors as OFFLINE

LoRa nodes won’t send “I’m offline”. Backend should infer it:

- If `now - lastActivity > OFFLINE_THRESHOLD` (e.g. 30–60 min), mark offline
- Run a scheduled job every minute (cron) to update offline statuses

## 7) Step-by-step implementation plan (do this in order)

### Step 1 — Lock the MVP scope

MVP features that match your current UI:

- Auth (register/login)
- Sensor CRUD + list filters
- Event log
- Active alerts
- Floor maps upload
- LoRa ingestion endpoint

### Step 2 — Create backend project skeleton

Create a `/backend` folder (recommended) and initialize:

- TypeScript + ESLint
- REST framework (Fastify or Express)
- Prisma + Postgres

### Step 3 — Implement database schema + migrations

Implement tables:

- users, api_keys
- floors, floor_maps
- sensors
- telemetry, events

### Step 4 — Implement auth + API keys

- Hash passwords (bcrypt/argon2)
- JWT access tokens
- API key generation: store only hash

### Step 5 — Implement core APIs (without LoRa yet)

- `GET/POST/PATCH /api/sensors`
- `GET /api/events` + summaries
- `GET/POST /api/floors` + map upload
- `GET /api/alerts/active`

### Step 6 — Implement ingestion endpoint

Pick your path:

- LoRaWAN webhook: `/api/ingest/lorawan`
- Custom gateway: `/api/ingest/lora`

Implement decode + upsert + event creation.

### Step 7 — Add the offline scheduler

- Background job checks sensors and sets `offline` when stale
- Emit an event when a sensor becomes offline/online again

### Step 8 — Hook frontend to backend (replace localStorage)

Do this gradually:

1. Sensors page: fetch `/api/sensors`
2. History page: fetch `/api/events`
3. Notifications: fetch `/api/alerts/active`
4. Dashboard: fetch summary + SSE stream

### Step 9 — Arduino node firmware

Node firmware tasks:

- Read trap sensors (your physical trigger)
- Measure battery (ADC)
- Send LoRa payload:
  - heartbeat every 5–15 minutes
  - immediate alert on trigger
- Use a counter + basic integrity (CRC)

### Step 10 — Gateway build (no Wi‑Fi)

Pick one:

- **4G gateway**: gateway MCU + LoRa + LTE modem → HTTP POST to backend
- **Ethernet gateway**: if you can use wired network

Gateway tasks:

- Receive LoRa packets
- Attach RSSI/SNR
- Deduplicate packets
- Buffer when no connectivity; retry later

### Step 11 — Security hardening (before demo)

- Rate limit ingest endpoints
- Validate payload sizes
- Store API keys hashed
- Add audit logs for: deployments, API key actions

### Step 12 — Demo checklist

- Deploy a sensor in UI, assign location
- Trigger sensor physically → event appears in history + notification
- Battery low simulation → alert
- Turn off node → backend marks offline after threshold

## 8) What to build first (if you want the fastest working demo)

1. Backend: sensors + events + ingest endpoint
2. Gateway (cellular) sending uplinks
3. Frontend: just show sensors + notifications from backend

PDF export and advanced filters can come after the ingestion pipeline works.

---

If you tell me which exact hardware you have (Arduino model + LoRa module model + whether you can use 4G SIM at the site), I can refine the LoRa path and write a concrete payload + wiring + library choices for that board.
