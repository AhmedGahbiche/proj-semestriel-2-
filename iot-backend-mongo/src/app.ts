import express from 'express';
import cors from 'cors';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { dataRoutes } from './routes/dataRoutes';

export function buildApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '256kb' }));
  app.use(requestLogger);

  app.use('/api', dataRoutes);

  app.use(errorHandler);

  return app;
}
