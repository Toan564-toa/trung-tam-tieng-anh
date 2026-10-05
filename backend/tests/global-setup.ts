import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

// Chuẩn bị database riêng cho test: xoá sạch rồi tạo lại, áp toàn bộ migration.
// Chạy một lần duy nhất trước khi mọi test file bắt đầu.
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error('Thiếu TEST_DATABASE_URL trong .env');

const testDbName = new URL(testUrl).pathname.replace(/^\//, '');
if (!testDbName) throw new Error('TEST_DATABASE_URL không có tên database');

// Chỉ nhận tên database đơn giản để tránh chèn SQL tùy ý.
if (!/^[a-zA-Z0-9_]+$/.test(testDbName)) throw new Error(`Tên database test không hợp lệ: ${testDbName}`);

// Nối vào database hệ thống 'postgres' để tạo/xoá database test.
const adminUrl = new URL(testUrl);
adminUrl.pathname = '/postgres';

export default async function globalSetup() {
  const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
  try {
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${testDbName}" WITH (FORCE)`);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${testDbName}"`);
  } finally {
    await admin.$disconnect();
  }

  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  execFileSync(npx, ['prisma', 'migrate', 'deploy'], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: 'inherit',
  });
}
