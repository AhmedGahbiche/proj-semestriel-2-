# Step-by-step 2 — Link ESP32 + SIM800L to your backend (end-to-end)

This guide connects **your physical device** (ESP32-WROVER-F + SIM800L) to **your backend ingest API**.

What “linked” means in this project:

- The ESP32 sends an **HTTP POST** to your backend: `POST /api/ingest/lora`
- The request must include the header: `X-API-Key: <INGEST_KEY>`
- The JSON body must include at least `deviceId` (or `trapId`) plus optional `decoded` fields.

---

## 0) Before you start (2 important facts)

1. **Cellular cannot reach `localhost`**

- Your SIM800L is on the mobile network.
- It cannot access `http://localhost:4000`.
- Your backend must be reachable from the internet via a **public host**.

2. **SIM800L is 2G only + needs strong power**

- If your area has weak/no 2G coverage, it won’t connect.
- Power must be stable **3.7–4.2V** with **~2A peaks** (separate supply is strongly recommended).

---

## 1) Run the backend locally (database + API)

From the repo root (the folder containing `backend/` and `frontend/`):

### 1.1 Start Postgres (Docker)

```bash
docker compose -f backend/docker-compose.yml up -d
```

### 1.2 Create backend env file

```bash
cp backend/.env.example backend/.env
```

Optional but recommended: open `backend/.env` and set a known admin key:

```env
ADMIN_BOOTSTRAP_KEY=dev-admin-key-change-me
```

### 1.3 Install backend deps + migrate

```bash
npm --prefix backend install
npm --prefix backend run prisma:generate
npm --prefix backend run prisma:migrate
```

### 1.4 Start backend dev server

```bash
npm --prefix backend run dev
```

### 1.5 Verify backend is alive

In a new terminal:

```bash
curl http://localhost:4000/api/health
```

You should get a JSON response (anything like `{... "ok": true ...}` is fine).

---

## 2) Run the frontend (so you can create Device ID + keys)

### 2.1 Install frontend deps

```bash
npm --prefix frontend install
```

### 2.2 (Recommended) Create frontend env file

```bash
cp frontend/.env.example frontend/.env.local
```

Edit `frontend/.env.local` to point to your backend:

```env
BACKEND_URL=http://localhost:4000
BACKEND_ADMIN_API_KEY=dev-admin-key-change-me
```

### 2.3 Start the frontend

```bash
npm --prefix frontend run dev
```

Open:

- `http://localhost:3000`

---

## 3) Provision a sensor in the UI (creates the record the backend expects)

1. Open `http://localhost:3000`
2. Go to **Deploy New Trap**
3. Fill:
   - **Trap ID**: example `TRP-0001`
   - **Device ID**: example `ESP32-TRP-0001`
4. Click **Deploy Trap**
5. Open “Next steps”: `http://localhost:3000/deploy-trap/next-steps`
6. Copy these 2 things somewhere safe:
   - **INGEST Key** (this is the key you paste into the Arduino sketch)
   - **Ingest URL** (this tells you where your device must POST)

Why this matters:

- Your backend will reject unknown `deviceId` values.
- Provisioning makes sure the device you send matches a real sensor.

---

## 4) Make your backend public (required for SIM800L)

### 4.0 The cellular “golden rule” (do this before flashing)

Before you touch Arduino:

1. Turn **Wi‑Fi OFF** on your phone (use only 4G/5G)
2. Open this URL in your phone browser:
   - `http://YOUR_PUBLIC_HOST:PORT/api/health`

If this does not load from your phone **over mobile data**, the SIM800L will also fail.

Notes:

- Many mobile networks are friendlier to **port 80** than random ports.
- With this SIM800L firmware approach, prefer **plain `http://`** (not only `https://`).

Pick ONE option:

### Option A (best): run backend on a VPS/public server

You need a public URL like:

- `http://YOUR_PUBLIC_HOST:4000/api/ingest/lora`

Make sure the port is reachable from the internet (firewall/security group).

#### Recommended for cellular reliability: expose it on port 80 (HTTP)

Some SIM/mobile networks block or degrade non-standard ports. Easiest fix: expose your backend on **port 80**.

Two simple ways:

1. **Docker port mapping (no reverse proxy)**

If you’re running the backend in Docker on the VPS, map host port 80 to container port 4000.

- In your VPS compose, use a mapping like: `"80:4000"`

2. **Reverse proxy (Nginx/Caddy)**

- Proxy `http://YOUR_DOMAIN/` → `http://127.0.0.1:4000/`

Minimum checks on the VPS:

- Backend listens on `0.0.0.0` (your code already does)
- Cloud firewall / security group allows inbound `80` (and/or `4000`)

### Option B (quick test): ngrok (recommended for testing)

On the machine running your backend:

1. Install ngrok
2. Run:

```bash
ngrok http 4000
```

3. ngrok will show forwarding URLs.
   - Use the one starting with **`http://`** (not https).

Example you might get:

- `http://abcd-12-34-56-78.ngrok-free.app`

In that case your ingest URL becomes:

- `http://abcd-12-34-56-78.ngrok-free.app/api/ingest/lora`

Important note about HTTPS:

- The simple SIM800L + TinyGSM + ArduinoHttpClient setup typically does **plain HTTP**.
- If you only have an `https://` endpoint, the sketch will fail.

If your tunnel tool only gives **HTTPS**, use Option A (VPS) or expose an **HTTP** endpoint.

---

## 5) Flash the ESP32 firmware (Arduino IDE)

### 5.1 Wiring (ESP32 ↔ SIM800L)

Default pins in the sketch:

- ESP32 GPIO16 (RX) ← SIM800L TX
- ESP32 GPIO17 (TX) → SIM800L RX

If your wiring is different, change these in the sketch:

```cpp
static const int MODEM_RX = 16;
static const int MODEM_TX = 17;
```

### 5.2 Install Arduino libraries

In Arduino IDE → Library Manager:

- Install `TinyGSM`
- Install `ArduinoHttpClient`

### 5.3 Open the sketch

Open:

- `esp32/esp32_sim800l_ingest/esp32_sim800l_ingest.ino`

### 5.4 Edit only 4 lines

Find the section:

```cpp
// --------- EDIT THESE 4 VALUES ---------
```

Set:

1. `APN`

- Example for Tunisie Telecom to try (in order): `internet`, then `ttnet`, then `internet.tn`

2. `BACKEND_HOST`

- You can paste either:
  - `YOUR_PUBLIC_HOST:4000`
  - OR the full ingest URL: `http://YOUR_PUBLIC_HOST:4000/api/ingest/lora`
  - OR the ngrok URL: `http://xxxx.ngrok-free.app:80`

3. `DEVICE_ID`

- Must match **exactly** what you deployed in step 3.

4. `INGEST_KEY`

- Paste the key from `http://localhost:3000/deploy-trap/next-steps`

### 5.5 Upload + verify logs

1. Upload to ESP32
2. Open Serial Monitor at `115200`
3. You should see:
   - `Connected.`
   - then repeated sends every 15s
   - `HTTP status: 200`
   - response like `{ "ok": true, ... }`

---

## 6) Verify it reached your backend

### 6.1 Quick API check

If your backend is public, you can check health from any machine:

```bash
curl http://YOUR_PUBLIC_HOST:4000/api/health
```

Best test (matches real conditions): do the same from your phone on mobile data.

### 6.2 Check UI pages

Open your dashboard pages and look for:

- Sensor status updated (`lastActivityAt` changes)
- New events created (first uplink / status transitions)

---

## 7) Troubleshooting (fast)

### A) Power / resets / random disconnects

- Most common cause: SIM800L power supply too weak.
- Use a separate 3.7–4.2V supply capable of ~2A peaks.

### B) `No network (2G coverage?)`

- No 2G coverage where you are.
- SIM not inserted / antenna not connected.

### C) `GPRS attach failed (APN?)`

- APN is wrong, or SIM plan has no data.
- Try the APN list again, or ask your operator for the correct APN.

### D) HTTP status `401`

- Wrong/missing `INGEST_KEY`.
- Re-copy the key from `/deploy-trap/next-steps`.

### E) Backend responds `Unknown deviceId ...`

- Your `DEVICE_ID` in the sketch does not match what you provisioned.
- Go back to **Deploy New Trap** and confirm the exact string.

### F) It works on WiFi/local but not on SIM800L

- Usually because you’re still targeting `localhost`.
- Make sure `BACKEND_HOST` is a **public** URL/host.

### G) Backend is public but cellular still can’t reach it

Common causes:

- Port is blocked by firewall/security group (open `80` or `4000`)
- Mobile network blocks non-standard ports (use port **80**)
- You’re using `https://` only (this firmware expects **http://**)
