import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/prisma';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`API đang chạy tại http://localhost:${env.PORT}`);
});

// Tắt êm: ngừng nhận yêu cầu mới, đóng kết nối database rồi thoát
async function shutdown(signal: string) {
  logger.info(`Nhận tín hiệu ${signal}, đang tắt...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
