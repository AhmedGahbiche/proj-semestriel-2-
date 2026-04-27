"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startOfflineDetectionJob = startOfflineDetectionJob;
function envNumber(name, fallback) {
    const raw = process.env[name];
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : fallback;
}
function startOfflineDetectionJob(app) {
    const thresholdMinutes = envNumber('OFFLINE_THRESHOLD_MINUTES', 10);
    const intervalSeconds = envNumber('OFFLINE_JOB_INTERVAL_SECONDS', 60);
    const intervalMs = Math.max(5_000, intervalSeconds * 1000);
    app.log.info({ thresholdMinutes, intervalSeconds }, 'offline-detection job scheduled');
    setInterval(async () => {
        try {
            const thresholdDate = new Date(Date.now() - thresholdMinutes * 60_000);
            const toOffline = await app.prisma.sensor.findMany({
                where: {
                    status: { not: 'OFFLINE' },
                    lastActivityAt: { not: null, lte: thresholdDate },
                },
                select: { id: true, trapId: true },
            });
            const toOnline = await app.prisma.sensor.findMany({
                where: {
                    status: 'OFFLINE',
                    lastActivityAt: { not: null, gt: thresholdDate },
                },
                select: { id: true, trapId: true, batteryPct: true },
            });
            await app.prisma.$transaction(async (tx) => {
                for (const sensor of toOffline) {
                    await tx.sensor.update({
                        where: { id: sensor.id },
                        data: { status: 'OFFLINE' },
                    });
                    await tx.event.create({
                        data: {
                            sensorId: sensor.id,
                            type: 'OFFLINE',
                            severity: 'WARN',
                            title: `Sensor ${sensor.trapId} is offline`,
                        },
                    });
                }
                for (const sensor of toOnline) {
                    const derived = sensor.batteryPct !== null && sensor.batteryPct <= 20 ? 'LOW_BATTERY' : 'ARMED';
                    await tx.sensor.update({
                        where: { id: sensor.id },
                        data: { status: derived },
                    });
                    await tx.event.create({
                        data: {
                            sensorId: sensor.id,
                            type: 'ONLINE',
                            severity: 'INFO',
                            title: `Sensor ${sensor.trapId} is back online`,
                        },
                    });
                }
            });
        }
        catch (err) {
            app.log.error({ err }, 'offline-detection job failed');
        }
    }, intervalMs);
}
