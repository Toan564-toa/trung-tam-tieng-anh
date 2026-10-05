import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { corsOrigins, env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/prisma';
import { errorHandler, notFound } from './middlewares/errorHandler';
import { apiLimiter } from './middlewares/rateLimit';
import { apiRoutes } from './routes';

export function createApp() {
  const app = express();

  // Chỉ tin header X-Forwarded-For khi thật sự chạy sau reverse proxy
  if (env.TRUST_PROXY === 'true') app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // Kiểm tra sống: dùng cho giám sát và triển khai
  app.get('/health', async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.use('/api', apiLimiter, apiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
