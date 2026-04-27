"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSensorsRoutes = registerSensorsRoutes;
const zod_1 = require("zod");
const statusEnum = zod_1.z.enum(['ARMED', 'TRIGGERED', 'LOW_BATTERY', 'OFFLINE']);
const createSensorBody = zod_1.z.object({
    trapId: zod_1.z.string().min(1).max(64),
    deviceId: zod_1.z.string().max(120).optional().nullable(),
    floorLabel: zod_1.z.string().max(120).optional().nullable(),
    zone: zod_1.z.string().max(120).optional().nullable(),
    batteryPct: zod_1.z.number().int().min(0).max(100).optional().nullable(),
});
const patchSensorBody = zod_1.z.object({
    deviceId: zod_1.z.string().max(120).optional().nullable(),
    floorLabel: zod_1.z.string().max(120).optional().nullable(),
    zone: zod_1.z.string().max(120).optional().nullable(),
    batteryPct: zod_1.z.number().int().min(0).max(100).optional().nullable(),
    status: statusEnum.optional(),
});
const resetTriggeredBody = zod_1.z.object({
    sensorIds: zod_1.z.array(zod_1.z.string()).optional(),
});
function registerSensorsRoutes(app) {
    app.get('/api/sensors', { preHandler: app.auth.requireApiKey('ADMIN') }, async (request) => {
        const q = typeof request.query.q === 'string' ? request.query.q : undefined;
        const status = typeof request.query.status === 'string' ? request.query.status : undefined;
        const floorLabel = typeof request.query.floorLabel === 'string' ? request.query.floorLabel : undefined;
        const zone = typeof request.query.zone === 'string' ? request.query.zone : undefined;
        const page = Math.max(1, Number(request.query.page ?? 1));
        const pageSize = Math.min(100, Math.max(1, Number(request.query.pageSize ?? 25)));
        const skip = (page - 1) * pageSize;
        const where = {};
        if (statusEnum.safeParse(status).success)
            where.status = status;
        if (floorLabel)
            where.floorLabel = { equals: floorLabel };
        if (zone)
            where.zone = { equals: zone };
        if (q) {
            where.OR = [
                { trapId: { contains: q, mode: 'insensitive' } },
                { floorLabel: { contains: q, mode: 'insensitive' } },
                { zone: { contains: q, mode: 'insensitive' } },
            ];
        }
        const [total, items] = await Promise.all([
            app.prisma.sensor.count({ where }),
            app.prisma.sensor.findMany({
                where,
                orderBy: { updatedAt: 'desc' },
                skip,
                take: pageSize,
            }),
        ]);
        return { page, pageSize, total, items };
    });
    app.post('/api/sensors', { preHandler: app.auth.requireApiKey('ADMIN') }, async (request, reply) => {
        const parsed = createSensorBody.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
        }
        const sensor = await app.prisma.sensor.upsert({
            where: { trapId: parsed.data.trapId },
            update: {
                deviceId: parsed.data.deviceId ?? undefined,
                floorLabel: parsed.data.floorLabel ?? undefined,
                zone: parsed.data.zone ?? undefined,
                batteryPct: parsed.data.batteryPct ?? undefined,
            },
            create: {
                trapId: parsed.data.trapId,
                deviceId: parsed.data.deviceId ?? null,
                floorLabel: parsed.data.floorLabel ?? null,
                zone: parsed.data.zone ?? null,
                batteryPct: parsed.data.batteryPct ?? null,
                status: 'ARMED',
            },
        });
        return sensor;
    });
    app.get('/api/sensors/:id', { preHandler: app.auth.requireApiKey('ADMIN') }, async (request, reply) => {
        const id = request.params.id;
        const sensor = await app.prisma.sensor.findUnique({ where: { id } });
        if (!sensor)
            return reply.code(404).send({ error: 'Not found' });
        return sensor;
    });
    app.patch('/api/sensors/:id', { preHandler: app.auth.requireApiKey('ADMIN') }, async (request, reply) => {
        const id = request.params.id;
        const parsed = patchSensorBody.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
        }
        const sensor = await app.prisma.sensor.update({
            where: { id },
            data: {
                deviceId: parsed.data.deviceId ?? undefined,
                floorLabel: parsed.data.floorLabel ?? undefined,
                zone: parsed.data.zone ?? undefined,
                batteryPct: parsed.data.batteryPct ?? undefined,
                status: parsed.data.status ?? undefined,
            },
        });
        return sensor;
    });
    app.post('/api/sensors/reset-triggered', { preHandler: app.auth.requireApiKey('ADMIN') }, async (request, reply) => {
        const parsed = resetTriggeredBody.safeParse(request.body ?? {});
        if (!parsed.success) {
            return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
        }
        const sensorIds = parsed.data.sensorIds;
        const sensorsToReset = await app.prisma.sensor.findMany({
            where: {
                status: 'TRIGGERED',
                ...(sensorIds?.length ? { id: { in: sensorIds } } : {}),
            },
            select: { id: true, trapId: true },
        });
        await app.prisma.$transaction(async (tx) => {
            for (const sensor of sensorsToReset) {
                await tx.sensor.update({
                    where: { id: sensor.id },
                    data: { status: 'ARMED' },
                });
                await tx.event.create({
                    data: {
                        sensorId: sensor.id,
                        type: 'ARMED',
                        severity: 'INFO',
                        title: `Sensor ${sensor.trapId} re-armed`,
                    },
                });
            }
        });
        return { resetCount: sensorsToReset.length };
    });
}
