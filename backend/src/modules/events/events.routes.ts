import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const severityEnum = z.enum(['INFO', 'WARN', 'CRITICAL']);

export function registerEventsRoutes(app: FastifyInstance) {
  app.get(
    '/api/events',
    { preHandler: app.auth.requireApiKey('ADMIN') },
    async (request) => {
      const query = request.query as any;

      const from = typeof query.from === 'string' ? new Date(query.from) : undefined;
      const to = typeof query.to === 'string' ? new Date(query.to) : undefined;
      const sensorId = typeof query.sensorId === 'string' ? query.sensorId : undefined;
      const severity = typeof query.severity === 'string' ? query.severity : undefined;
      const type = typeof query.type === 'string' ? query.type : undefined;
      const limit = Math.min(200, Math.max(1, Number(query.limit ?? 50)));
      const cursor = typeof query.cursor === 'string' ? query.cursor : undefined;

      const where: any = {};
      if (from && !Number.isNaN(from.valueOf())) where.createdAt = { ...(where.createdAt ?? {}), gte: from };
      if (to && !Number.isNaN(to.valueOf())) where.createdAt = { ...(where.createdAt ?? {}), lte: to };
      if (sensorId) where.sensorId = sensorId;
      if (severityEnum.safeParse(severity).success) where.severity = severity;
      if (type) where.type = type;

      const items = await app.prisma.event.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      const hasMore = items.length > limit;
      const sliced = hasMore ? items.slice(0, limit) : items;
      const nextCursor = hasMore ? sliced[sliced.length - 1]?.id : null;

      return { items: sliced, nextCursor };
    },
  );

  app.get(
    '/api/events/summary',
    { preHandler: app.auth.requireApiKey('ADMIN') },
    async () => {
      const now = new Date();
      const startOfDayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

      const [todayCount, triggeredCount, lowBatteryCount, offlineCount] = await Promise.all([
        app.prisma.event.count({ where: { createdAt: { gte: startOfDayUtc } } }),
        app.prisma.sensor.count({ where: { status: 'TRIGGERED' } }),
        app.prisma.sensor.count({
          where: {
            OR: [{ status: 'LOW_BATTERY' }, { batteryPct: { lte: 20 } }],
          },
        }),
        app.prisma.sensor.count({ where: { status: 'OFFLINE' } }),
      ]);

      return { todayCount, triggeredCount, lowBatteryCount, offlineCount };
    },
  );

  app.get(
    '/api/events/timeseries',
    { preHandler: app.auth.requireApiKey('ADMIN') },
    async (request) => {
      const days = Math.min(90, Math.max(1, Number((request.query as any).days ?? 7)));
      const since = new Date();
      since.setUTCDate(since.getUTCDate() - (days - 1));
      since.setUTCHours(0, 0, 0, 0);

      const rows = await app.prisma.$queryRaw<Array<{ date: string; count: number }>>`
        SELECT
          to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS date,
          count(*)::int AS count
        FROM "Event"
        WHERE "createdAt" >= ${since}
        GROUP BY 1
        ORDER BY 1 ASC;
      `;

      return { days, items: rows };
    },
  );
}
