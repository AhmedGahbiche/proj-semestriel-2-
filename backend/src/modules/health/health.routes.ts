import type { FastifyInstance } from 'fastify';

export function registerHealthRoutes(app: FastifyInstance) {
  app.get('/api/health', async () => {
    return { ok: true, time: new Date().toISOString() };
  });
}
