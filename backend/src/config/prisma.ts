import { PrismaClient } from '@prisma/client';

// Chỉ tạo MỘT PrismaClient cho cả ứng dụng.
export const prisma = new PrismaClient();
