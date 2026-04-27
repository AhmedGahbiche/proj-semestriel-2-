-- Add deviceId to Sensor to map hardware -> trap
ALTER TABLE "Sensor" ADD COLUMN "deviceId" TEXT;

-- Unique per hardware device; multiple NULLs allowed
CREATE UNIQUE INDEX "Sensor_deviceId_key" ON "Sensor"("deviceId");
