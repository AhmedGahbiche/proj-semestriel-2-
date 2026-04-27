// ESP32-WROVER-F + SIM800L -> Send data to backend ingest endpoint
//
// What you must edit (4 fields):
// 1) APN
// 2) BACKEND_HOST (public domain or public IP, optionally with :port)
// 3) DEVICE_ID
// 4) INGEST_KEY
//
// Libraries (install from Arduino Library Manager):
// - TinyGSM
// - ArduinoHttpClient
//
// Notes:
// - SIM800L is 2G only.
// - Backend must be public. Do NOT use localhost.
// - Power for SIM800L must handle ~2A peaks (separate supply recommended).

#define TINY_GSM_MODEM_SIM800

#include <TinyGsmClient.h>
#include <ArduinoHttpClient.h>

// --------- EDIT THESE 4 VALUES ---------
// APN (Tunisie Telecom starting point): try "internet" first.
// If it fails, try: "ttnet" then "internet.tn".
const char APN[] = "internet";
// You can paste either:
// - host:port                 (example: "1.2.3.4:4000")
// - full URL incl. path        (example: "http://1.2.3.4:4000/api/ingest/lora")
// - ngrok forwarding URL       (example: "http://xxxx.ngrok-free.app:80")
const char *BACKEND_HOST = "a8563d28cad1bc.lhr.life:80";
const char *DEVICE_ID = "ESP32-TRP-0001"; // must match what you entered in Deploy New Trap
const char *INGEST_KEY = "FHdIqthg1Gs0KRKmSzj_ViVR_08qWf7FlVUjlnuhiyo";
// ---------------------------------------

// Backend settings
const int BACKEND_PORT_DEFAULT = 4000;
const char *INGEST_PATH = "/api/ingest/lora";

// UART wiring (change if needed)
static const int MODEM_RX = 16; // ESP32 RX  <- SIM800L TX
static const int MODEM_TX = 17; // ESP32 TX  -> SIM800L RX
// If your board exposes SIM800L PWRKEY, set its ESP32 pin here.
// Keep -1 if not connected.
static const int MODEM_PWRKEY = -1;

// SIM800L default baud is often 9600
static const uint32_t MODEM_BAUD = 9600;
static const uint32_t MODEM_BAUD_CANDIDATES[] = {9600, 19200, 38400, 57600, 115200};

HardwareSerial SerialAT(1);
TinyGsm modem(SerialAT);
TinyGsmClient gsmClient(modem);
static char backendHostOnly[128] = {0};
static int backendPort = BACKEND_PORT_DEFAULT;
HttpClient *http = nullptr;

static void parseBackendHost(const char *hostWithOptionalPort)
{
    String backend = String(hostWithOptionalPort);
    backend.trim();

    // Allow users to paste full URLs (common beginner mistake).
    if (backend.startsWith("http://"))
        backend = backend.substring(7);
    if (backend.startsWith("https://"))
        backend = backend.substring(8);

    // Strip path/query if present.
    int slashIndex = backend.indexOf('/');
    if (slashIndex >= 0)
        backend = backend.substring(0, slashIndex);

    int colonIndex = backend.indexOf(':');
    String hostPart = (colonIndex >= 0) ? backend.substring(0, colonIndex) : backend;
    String portPart = (colonIndex >= 0) ? backend.substring(colonIndex + 1) : String(BACKEND_PORT_DEFAULT);

    hostPart.trim();
    portPart.trim();

    if (hostPart.length() == 0)
    {
        return;
    }

    hostPart.toCharArray(backendHostOnly, sizeof(backendHostOnly));

    long parsedPort = portPart.toInt();
    if (parsedPort > 0 && parsedPort <= 65535)
    {
        backendPort = (int)parsedPort;
    }
}

static void failForever(const char *msg)
{
    Serial.println(msg);
    while (true)
    {
        delay(1000);
    }
}

static bool ensureConnected()
{
    if (!modem.isNetworkConnected())
    {
        if (!modem.waitForNetwork(60000L))
        {
            Serial.println("No network (2G coverage?)");
            return false;
        }
    }

    if (!modem.isGprsConnected())
    {
        if (!modem.gprsConnect(APN, "", ""))
        {
            Serial.println("GPRS attach failed (APN?)");
            return false;
        }
    }

    return true;
}

static void pulsePwrKeyIfConfigured()
{
    if (MODEM_PWRKEY < 0)
    {
        return;
    }

    pinMode(MODEM_PWRKEY, OUTPUT);
    // SIM800L usually needs a low pulse on PWRKEY to power on.
    digitalWrite(MODEM_PWRKEY, HIGH);
    delay(100);
    digitalWrite(MODEM_PWRKEY, LOW);
    delay(1200);
    digitalWrite(MODEM_PWRKEY, HIGH);
    delay(2500);
}

static bool rawAtCheck(unsigned long timeoutMs)
{
    while (SerialAT.available())
    {
        SerialAT.read();
    }

    SerialAT.print("AT\r\n");

    String reply;
    unsigned long start = millis();
    while (millis() - start < timeoutMs)
    {
        while (SerialAT.available())
        {
            char c = (char)SerialAT.read();
            reply += c;
        }
        if (reply.indexOf("OK") >= 0)
        {
            return true;
        }
    }

    return false;
}

static bool probeModemAtBaud(uint32_t baud)
{
    SerialAT.begin(baud, SERIAL_8N1, MODEM_RX, MODEM_TX);
    delay(700);

    if (rawAtCheck(1000L))
    {
        Serial.print("Raw AT check passed at baud ");
        Serial.println(baud);
        return true;
    }

    for (int attempt = 0; attempt < 3; ++attempt)
    {
        if (modem.testAT(1000L))
        {
            Serial.print("Modem answered at baud ");
            Serial.println(baud);
            return true;
        }
        delay(200);
    }

    return false;
}

static bool initializeModem()
{
    Serial.println("Starting modem...");

    pulsePwrKeyIfConfigured();

    bool atOk = false;
    for (size_t i = 0; i < (sizeof(MODEM_BAUD_CANDIDATES) / sizeof(MODEM_BAUD_CANDIDATES[0])); ++i)
    {
        uint32_t baud = MODEM_BAUD_CANDIDATES[i];
        Serial.print("Trying baud ");
        Serial.println(baud);

        if (probeModemAtBaud(baud))
        {
            atOk = true;
            break;
        }
    }

    if (!atOk)
    {
        return false;
    }

    // restart() is preferred, then init() fallback.
    if (modem.restart())
    {
        return true;
    }

    Serial.println("restart() failed, trying init()...");
    if (modem.init())
    {
        return true;
    }

    // Some modules still answer AT even when init/restart fails.
    return modem.testAT(1000L);
}

void setup()
{
    Serial.begin(115200);
    delay(200);

    // Start with default baud, then probe if needed.
    SerialAT.begin(MODEM_BAUD, SERIAL_8N1, MODEM_RX, MODEM_TX);
    delay(600);

    if (!initializeModem())
    {
        failForever("Modem init failed. Check: power (4V/2A peak), TX/RX wiring, GND common, SIM inserted, and baud.");
    }

    modem.sendAT("+CMEE=2");
    modem.waitResponse();

    if (!ensureConnected())
    {
        Serial.println("Connect failed. Check power, SIM, antenna, APN.");
    }
    else
    {
        Serial.println("Connected.");
    }

    parseBackendHost(BACKEND_HOST);
    if (backendHostOnly[0] == '\0')
    {
        failForever("BACKEND_HOST is empty");
    }

    Serial.print("Backend: ");
    Serial.print(backendHostOnly);
    Serial.print(":");
    Serial.println(backendPort);

    http = new HttpClient(gsmClient, backendHostOnly, backendPort);
}

void loop()
{
    if (!ensureConnected())
    {
        delay(5000);
        return;
    }

    if (http == nullptr)
    {
        delay(5000);
        return;
    }

    // Minimal payload the backend accepts (deviceId required)
    String payload = String("{\"deviceId\":\"") + DEVICE_ID +
                     "\",\"decoded\":{\"temperature\":26.4,\"humidity\":55,\"triggered\":false}}";

    Serial.println("Sending to ingest...");

    http->beginRequest();
    http->post(INGEST_PATH);
    http->sendHeader("Content-Type", "application/json");
    http->sendHeader("X-API-Key", INGEST_KEY);
    http->sendHeader("Content-Length", payload.length());
    http->beginBody();
    http->print(payload);
    http->endRequest();

    int statusCode = http->responseStatusCode();
    String response = http->responseBody();

    Serial.print("HTTP status: ");
    Serial.println(statusCode);
    Serial.println("Response:");
    Serial.println(response);

    delay(15000);
}
