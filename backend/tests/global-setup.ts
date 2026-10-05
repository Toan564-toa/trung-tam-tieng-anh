import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

// Chuẩn bị database riêng cho test: xoá sạch rồi tạo lại, áp toàn bộ migration.
// Chạy một lần duy nhất trước khi mọi test file bắt đầu.
const rawTestUrl = process.env.TEST_DATABASE_URL;
if (!rawTestUrl) throw new Error('Thiếu TEST_DATABASE_URL trong .env');
const testUrl: string = rawTestUrl;

const testDbName = new URL(testUrl).pathname.replace(/^\//, '');
if (!testDbName) throw new Error('TEST_DATABASE_URL không có tên database');

// Chỉ nhận tên database đơn giản để tránh chèn SQL tùy ý.
if (!/^[a-zA-Z0-9_]+$/.test(testDbName)) throw new Error(`Tên database test không hợp lệ: ${testDbName}`);

/**
 * Database dùng để tạo/xoá database test.
 * PostgreSQL thường có database `postgres`; dịch vụ cloud (Aiven, Neon…) có thể
 * không có, nên thử lần lượt các ứng viên cho tới khi kết nối được.
 */
async function dropAndCreateTestDatabase(): Promise<void> {
  const devDbName = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).pathname.replace(/^\//, '') : '';

  const candidates = [...new Set(['postgres', devDbName, 'template1'].filter(Boolean))] as string[];

  let lastError: unknown;
  for (const candidate of candidates) {
    const adminUrl = new URL(testUrl);
    adminUrl.pathname = `/${candidate}`;

    const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
    try {
      await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${testDbName}" WITH (FORCE)`);
      await admin.$executeRawUnsafe(`CREATE DATABASE "${testDbName}"`);
      console.log(`Đã tạo lại database test "${testDbName}" (qua database "${candidate}").`);
      return;
    } catch (error) {
      lastError = error;
    } finally {
      await admin.$disconnect();
    }
  }

  throw new Error(
    `Không tạo được database test "${testDbName}". Đã thử các database quản trị: ${candidates.join(', ')}. ` +
      `Lỗi cuối: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

export default async function globalSetup() {
  await dropAndCreateTestDatabase();

  // Gọi Prisma CLI qua chính file JS của gói cài đặt thay vì `npx`.
  // Node 24 trên Windows không chạy được file .cmd khi spawn không bật shell
  // (lỗi EINVAL), nên phải chạy node với đường dẫn entry point của Prisma.
  const prismaCli = require.resolve('prisma/build/index.js');
  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: 'inherit',
  });
}
