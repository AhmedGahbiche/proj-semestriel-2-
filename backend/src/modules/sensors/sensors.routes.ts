import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const statusEnum = z.enum(['ARMED', 'TRIGGERED', 'LOW_BATTERY', 'OFFLINE']);

const mapLocationBody = z
  .object({
    mapFloorId: z.string().max(32).optional().nullable(),
    mapX: z.number().min(0).max(100).optional().nullable(),
    mapY: z.number().min(0).max(100).optional().nullable(),
  })
  .refine(
    (v) => {
      const hasAny = v.mapFloorId != null || v.mapX != null || v.mapY != null;
      if (!hasAny) return true;
      return v.mapFloorId != null && v.mapX != null && v.mapY != null;
    },
    { message: "mapFloorId, mapX and mapY must be provided together" },
  );

const createSensorBody = z
  .object({
    trapId: z.string().min(1).max(64),
    deviceId: z.string().max(120).optional().nullable(),
    floorLabel: z.string().max(120).optional().nullable(),
    zone: z.string().max(120).optional().nullable(),
    batteryPct: z.number().int().min(0).max(100).optional().nullable(),
  })
  .and(mapLocationBody);

const patchSensorBody = z
  .object({
    deviceId: z.string().max(120).optional().nullable(),
    floorLabel: z.string().max(120).optional().nullable(),
    zone: z.string().max(120).optional().nullable(),
    batteryPct: z.number().int().min(0).max(100).optional().nullable(),
    status: statusEnum.optional(),
  })
  .and(mapLocationBody);

const resetTriggeredBody = z.object({
  sensorIds: z.array(z.string()).optional(),
});

export function registerSensorsRoutes(app: FastifyInstance) {
  app.get(
    '/api/sensors',
    { preHandler: app.auth.requireApiKey('ADMIN') },
    async (request) => {
      const q = typeof (request.query as any).q === 'string' ? (request.query as any).q : undefined;
      const status = typeof (request.query as any).status === 'string' ? (request.query as any).status : undefined;
      const floorLabel = typeof (request.query as any).floorLabel === 'string' ? (request.query as any).floorLabel : undefined;
      const zone = typeof (request.query as any).zone === 'string' ? (request.query as any).zone : undefined;

      const page = Math.max(1, Number((request.query as any).page ?? 1));
      const pageSize = Math.min(100, Math.max(1, Number((request.query as any).pageSize ?? 25)));
      const skip = (page - 1) * pageSize;

      const where: any = {};
      if (statusEnum.safeParse(status).success) where.status = status;
      if (floorLabel) where.floorLabel = { equals: floorLabel };
      if (zone) where.zone = { equals: zone };
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
    },
  );

  app.post(
    '/api/sensors',
    { preHandler: app.auth.requireApiKey('ADMIN') },
    async (request, reply) => {
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
          mapFloorId: parsed.data.mapFloorId ?? undefined,
          mapX: parsed.data.mapX ?? undefined,
          mapY: parsed.data.mapY ?? undefined,
        },
        create: {
          trapId: parsed.data.trapId,
          deviceId: parsed.data.deviceId ?? null,
          floorLabel: parsed.data.floorLabel ?? null,
          zone: parsed.data.zone ?? null,
          batteryPct: parsed.data.batteryPct ?? null,
          mapFloorId: parsed.data.mapFloorId ?? null,
          mapX: parsed.data.mapX ?? null,
          mapY: parsed.data.mapY ?? null,
          status: 'ARMED',
        },
      });

      return sensor;
    },
  );

  app.get(
    '/api/sensors/:id',
    { preHandler: app.auth.requireApiKey('ADMIN') },
    async (request, reply) => {
      const id = (request.params as any).id as string;
      const sensor = await app.prisma.sensor.findUnique({ where: { id } });
      if (!sensor) return reply.code(404).send({ error: 'Not found' });
      return sensor;
    },
  );

  app.patch(
    '/api/sensors/:id',
    { preHandler: app.auth.requireApiKey('ADMIN') },
    async (request, reply) => {
      const id = (request.params as any).id as string;
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
          mapFloorId: parsed.data.mapFloorId ?? undefined,
          mapX: parsed.data.mapX ?? undefined,
          mapY: parsed.data.mapY ?? undefined,
        },
      });

      return sensor;
    },
  );

  app.post(
    '/api/sensors/reset-triggered',
    { preHandler: app.auth.requireApiKey('ADMIN') },
    async (request, reply) => {
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
    },
  );
}
