import { Prisma, PrismaClient } from '@prisma/client';

// Chỉ tạo MỘT PrismaClient cho cả ứng dụng.
// Cấu hình connection pool cho Neon serverless Postgres.
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export { Prisma };
