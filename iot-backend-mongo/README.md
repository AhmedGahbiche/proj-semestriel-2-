# IoT Backend (MongoDB + API Keys + SMS + Socket.IO)

This is a standalone Node.js backend for an IoT device fleet (ESP32 + GSM/4G module).

## Features

- REST API
  - `POST /api/data` (ingest)
  - `GET /api/data` (list)
  - `GET /api/data/:deviceId` (by device)
- MongoDB storage (Mongoose)
- API key auth (per-device keys + optional admin key)
- SMS alerts (Twilio) when thresholds are exceeded
- Real-time dashboard updates via Socket.IO

## Requirements

- Node.js 20+
- MongoDB (local or managed)

## Quick start

```bash
cd iot-backend-mongo
npm install
cp .env.example .env
# Edit .env: set MONGODB_URI (and Twilio vars if you want SMS)
npm run dev
```

If you want a quick local MongoDB (Docker):

```bash
docker run --name iot-mongo -p 27017:27017 -d mongo:7
```

## Auth

Send the API key in the `X-API-Key` header.

- Devices: use their own `apiKey` stored in MongoDB (`Device` collection)
- Dashboard/admin (optional): can use `ADMIN_API_KEY` from `.env`

## Create a device (seed script)

```bash
npm run seed:device -- --deviceId TRP-0001 --apiKey my-secret-key --phone +216XXXXXXXX
```

## ESP32 example request

```bash
curl -X POST http://localhost:4100/api/data \
  -H "X-API-Key: my-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "TRP-0001",
    "temperature": 36.2,
    "humidity": 55,
    "timestamp": "2026-04-24T12:00:00.000Z"
  }'
```

Arduino (ESP32) minimal example (WiFiClientSecure also works for HTTPS):

```cpp
#include <HTTPClient.h>

void sendData() {
  HTTPClient http;
  http.begin("http://YOUR_SERVER_IP:4100/api/data");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", "my-secret-key");

  String body = String("{") +
    "\"deviceId\":\"TRP-0001\"," +
    "\"temperature\":36.2," +
    "\"humidity\":55," +
    "\"timestamp\":\"2026-04-24T12:00:00.000Z\"" +
  "}";

  int code = http.POST(body);
  String resp = http.getString();
  http.end();
}
```

Dashboard example (list latest data using admin key):

```bash
curl "http://localhost:4100/api/data?limit=50" -H "X-API-Key: dev-admin-key"
```

## Socket.IO

The server emits:

- `sensorData` (broadcast)
- `sensorData:device` (room `device:<deviceId>`)

Clients can join a device room:

```js
socket.emit("subscribe", { deviceId: "TRP-0001" });
```
