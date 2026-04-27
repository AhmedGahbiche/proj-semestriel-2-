# Connect ESP32-WROVER-F + SIM800L after “Deploy New Trap” (beginner-friendly)

This is the simplest, least-error way to “connect” your board to the dashboard.

Important idea (no coding knowledge needed):

- The board does **NOT** connect by USB.
- The board “connects” by sending an **HTTP POST** to your backend.
- The **INGEST key** is like a password sent in an HTTP header: `X-API-Key: ...`

---

## What you need (checklist)

- ESP32-WROVER-F + SIM800L + SIM card inserted + GSM antenna connected
- Stable power for SIM800L: **3.7–4.2V** supply that can do **~2A peaks** (very important)
- Your backend running and reachable from the internet (public)
- A laptop with Arduino IDE (or PlatformIO)

SIM800L note: it’s **2G only**. If there is no/weak 2G coverage, it won’t work.

---

## Step A — Get the two values from the dashboard

1. Open: `http://localhost:3000`
2. Click **Deploy New Trap**
3. Fill:
   - **Trap ID**: example `TRP-0001`
   - **Device ID**: type something simple and stable, example: `ESP32-TRP-0001`
4. Click **Deploy Trap**
5. Open the “Next steps” page: `http://localhost:3000/deploy-trap/next-steps`
6. Copy and save:
   - **INGEST Key** (you will paste it into the sketch)
   - **Ingest URL** (you will use its host/port)

---

## Step B — Make your backend public (required for cellular)

Your SIM800L cannot reach `localhost`.

You need a public address like:

- `http://YOUR_PUBLIC_HOST:4000/api/ingest/lora`

Because SIM800L is usually **HTTP-only** in simple firmware, try to keep the public URL as `http://...` (not only `https://...`).

### Option 1 (best) — Use a public server/VPS

- Run the backend on a VPS (public IP/domain)
- Make sure the backend port is reachable from the internet (example port `4000`)

### Option 2 (quick test) — Use ngrok (gives an http:// URL)

1. Install ngrok (once)
2. On the computer running the backend, run:

```bash
ngrok http 4000
```

3. ngrok will show you two links. Copy the one starting with **`http://`**
4. In the sketch:

- Set `BACKEND_HOST` to `xxxx.ngrok-free.app:80`

---

## Step C — Flash the ready-to-use firmware (only copy/paste)

Use the ready sketch in this repo:

- `esp32/esp32_sim800l_ingest/esp32_sim800l_ingest.ino`

### 1) Install Arduino libraries (one time)

In Arduino IDE → Library Manager, install:

- `TinyGSM`
- `ArduinoHttpClient`

### 2) Open the sketch and edit 4 lines

In the sketch, find the “EDIT THESE 4 VALUES” section and fill:

1. `APN` (from your operator)
2. `BACKEND_HOST` (your public domain or public IP)
3. `DEVICE_ID` (exactly the same as what you typed in Deploy New Trap)
4. `INGEST_KEY` (from /deploy-trap/next-steps)

That’s it.

Tunisie Telecom (starting points): if you don’t know your APN, try in this order:

- `internet`
- `ttnet`
- `internet.tn`

If none work, ask Tunisie Telecom support for the APN for your SIM plan.

Tip: you can include the port in `BACKEND_HOST`:

- VPS example: `1.2.3.4:4000`
- ngrok example: `xxxx.ngrok-free.app:80`

### 3) Upload + check it works

1. Upload the sketch
2. Open Serial Monitor (115200)
3. You should see `HTTP status: 200` (or another 2xx)

---

## Verify on the dashboard

- Open your dashboard sensors/events pages and confirm new events appear for your `deviceId`.

---

## Troubleshooting (quick fixes)

- **HTTP status 401**: wrong `INGEST_KEY` or missing `X-API-Key` header (copy again from next-steps)
- **Unknown deviceId**: `DEVICE_ID` in sketch != Device ID you deployed (they must match exactly)
- **No network / GPRS attach failed**: APN wrong, SIM has no data, or no 2G coverage (Tunisie Telecom: try `internet`, then `ttnet`, then `internet.tn`)
- **Random resets / unstable**: power issue (SIM800L needs strong 3.7–4.2V supply + big capacitor)
