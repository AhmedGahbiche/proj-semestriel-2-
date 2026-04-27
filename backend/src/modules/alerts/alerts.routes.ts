import type { FastifyInstance } from 'fastify';

export function registerAlertsRoutes(app: FastifyInstance) {
  app.get(
    '/api/alerts/active',
    { preHandler: app.auth.requireApiKey('ADMIN') },
    async () => {
      const sensors = await app.prisma.sensor.findMany({
        where: {
          OR: [
            { status: 'TRIGGERED' },
            { status: 'OFFLINE' },
            { status: 'LOW_BATTERY' },
            { batteryPct: { lte: 20 } },
          ],
        },
        orderBy: { updatedAt: 'desc' },
      });

      const triggered = sensors.filter((s) => s.status === 'TRIGGERED');
      const offline = sensors.filter((s) => s.status === 'OFFLINE');
      const lowBattery = sensors.filter((s) => s.status === 'LOW_BATTERY' || (s.batteryPct !== null && s.batteryPct <= 20));

      return {
        triggered,
        offline,
        lowBattery,
      };
    },
  );
}
