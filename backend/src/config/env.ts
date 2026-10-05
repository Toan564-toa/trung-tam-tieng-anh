import 'dotenv/config';
import { z } from 'zod';

// Kiểm tra biến môi trường ngay khi khởi động: thiếu hoặc sai thì dừng và báo rõ.
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  // Chỉ bật 'true' khi chạy sau reverse proxy (Nginx, Cloudflare...) để lấy đúng IP người dùng
  TRUST_PROXY: z.enum(['true', 'false']).default('false'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().default(900),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().default(604800),
  MAX_FAILED_LOGINS: z.coerce.number().default(5),
  LOCK_MINUTES: z.coerce.number().default(15),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Biến môi trường không hợp lệ:');
  for (const issue of parsed.error.issues) {
    console.error(`- ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((s) => s.trim())
  .filter(Boolean);
