import 'dotenv/config';

import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';

import { prisma } from './db/prisma';
import { startOfflineDetectionJob } from './jobs/offline-detection';
import { registerAlertsRoutes } from './modules/alerts/alerts.routes';
import { registerApiKeysRoutes } from './modules/api-keys/api-keys.routes';
import { registerEventsRoutes } from './modules/events/events.routes';
import { registerHealthRoutes } from './modules/health/health.routes';
import { registerIngestRoutes } from './modules/ingest/ingest.routes';
import { registerSensorsRoutes } from './modules/sensors/sensors.routes';
import { registerAuthPlugin } from './plugins/auth';

export async function buildApp(options?: { startJobs?: boolean }): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000';

  await app.register(cors, {
    origin: corsOrigin,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
  });

  app.decorate('prisma', prisma);
  registerAuthPlugin(app);

  registerHealthRoutes(app);
  registerApiKeysRoutes(app);
  registerSensorsRoutes(app);
  registerEventsRoutes(app);
  registerAlertsRoutes(app);
  registerIngestRoutes(app);

  if (options?.startJobs !== false) {
    startOfflineDetectionJob(app);
  }

  return app;
}
