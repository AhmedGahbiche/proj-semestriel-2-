-- CreateEnum
CREATE TYPE "ApiKeyScope" AS ENUM ('ADMIN', 'INGEST');

-- CreateEnum
CREATE TYPE "SensorStatus" AS ENUM ('ARMED', 'TRIGGERED', 'LOW_BATTERY', 'OFFLINE');

-- CreateEnum
CREATE TYPE "EventSeverity" AS ENUM ('INFO', 'WARN', 'CRITICAL');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('INGEST', 'ARMED', 'TRIGGERED', 'LOW_BATTERY', 'OFFLINE', 'ONLINE');

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "scope" "ApiKeyScope" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sensor" (
    "id" TEXT NOT NULL,
    "trapId" TEXT NOT NULL,
    "floorLabel" TEXT,
    "zone" TEXT,
    "status" "SensorStatus" NOT NULL,
    "lastActivityAt" TIMESTAMP(3),
    "batteryPct" INTEGER,
    "signalLevel" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sensor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "EventType" NOT NULL,
    "severity" "EventSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "sensorId" TEXT,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelemetryUplink" (
    "id" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "gatewayId" TEXT,
    "deviceId" TEXT,
    "trapId" TEXT,
    "rssi" DOUBLE PRECISION,
    "snr" DOUBLE PRECISION,
    "payloadB64" TEXT,
    "decoded" JSONB,
    "sensorId" TEXT,

    CONSTRAINT "TelemetryUplink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_hash_key" ON "ApiKey"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "Sensor_trapId_key" ON "Sensor"("trapId");

-- CreateIndex
CREATE INDEX "Event_createdAt_idx" ON "Event"("createdAt");

-- CreateIndex
CREATE INDEX "Event_sensorId_idx" ON "Event"("sensorId");

-- CreateIndex
CREATE INDEX "TelemetryUplink_receivedAt_idx" ON "TelemetryUplink"("receivedAt");

-- CreateIndex
CREATE INDEX "TelemetryUplink_trapId_idx" ON "TelemetryUplink"("trapId");

-- CreateIndex
CREATE INDEX "TelemetryUplink_sensorId_idx" ON "TelemetryUplink"("sensorId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "Sensor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelemetryUplink" ADD CONSTRAINT "TelemetryUplink_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "Sensor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
