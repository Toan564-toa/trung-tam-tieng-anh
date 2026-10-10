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
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.enum(['true', 'false']).default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().default('no-reply@trungtam.local'),
  PASSWORD_RESET_URL: z.string().url().default('http://localhost:5173/dat-lai-mat-khau'),
  // Upload tệp: giới hạn dung lượng (MB) và thư mục lưu mặc định (đĩa cục bộ).
  // Lớp storage trừu tượng ở modules/files cho phép đổi sang S3 mà không sửa controller.
  FILE_MAX_SIZE_MB: z.coerce.number().min(1).max(50).default(5),
  FILE_STORAGE_DIR: z.string().min(1).default('storage/uploads'),
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
