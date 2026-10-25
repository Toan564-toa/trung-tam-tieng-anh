import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
config({ path: resolve(__dirname, '..', '.env') });
console.log('Loaded .env from:', resolve(__dirname, '..', '.env'));
console.log('SEED_ADMIN_PASSWORD:', process.env.SEED_ADMIN_PASSWORD ? 'SET' : 'NOT SET');

import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';
import { seedDemo } from './demo-seed';

const prisma = new PrismaClient();

const ROLES = [
  { code: 'admin', name: 'Quản trị viên' },
  { code: 'staff', name: 'Nhân viên' },
  { code: 'teacher', name: 'Giáo viên' },
  { code: 'student', name: 'Học viên' },
  { code: 'guardian', name: 'Phụ huynh' },
];

const isDemo = process.argv.includes('--demo');

async function seedBase() {
  // 1. Vai trò
  for (const r of ROLES) {
    await prisma.role.upsert({ where: { code: r.code }, update: { name: r.name }, create: r });
  }

  // 2. Tài khoản admin đầu tiên (đọc từ .env, bắt đổi mật khẩu ở lần đăng nhập đầu)
  const username = process.env.SEED_ADMIN_USERNAME ?? 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) throw new Error('Thiếu SEED_ADMIN_PASSWORD trong .env');

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: 'admin' } });
  const existing = await prisma.user.findUnique({ where: { username } });

  if (!existing) {
    const passwordHash = await argon2.hash(password);
    await prisma.user.create({
      data: {
        username,
        passwordHash,
        mustChangePassword: true,
        roles: { create: [{ roleId: adminRole.id }] },
      },
    });
    console.log(`Đã tạo tài khoản admin "${username}". Hãy đăng nhập và đổi mật khẩu ngay.`);
  } else {
    console.log(`Tài khoản "${username}" đã tồn tại, bỏ qua.`);
  }

  // 3. Một khóa học mẫu theo lộ trình 64 buổi / 8 tháng
  await prisma.course.upsert({
    where: { code: 'GT-64' },
    update: {},
    create: {
      code: 'GT-64',
      slug: 'giao-tiep-64-buoi',
      name: 'Khóa giao tiếp lộ trình 64 buổi',
      level: 'Cơ bản',
      totalSessions: 64,
      sessionsPerWeek: 2,
      durationMonths: 8,
      listPrice: 0,
    },
  });
}

function printDemoAccounts(accounts: Array<{ username: string; password: string; role: string }>) {
  console.log('\n=== TÀI KHOẢN DEMO (mật khẩu sinh ngẫu nhiên, chỉ hiện một lần) ===');
  for (const account of accounts) {
    console.log(`  ${account.role.padEnd(8)} | ${account.username.padEnd(12)} | ${account.password}`);
  }
  console.log('  Lưu lại mật khẩu ngay. Chạy lại seed sẽ sinh mật khẩu mới.');
  console.log('  Tất cả tài khoản demo đều bắt buộc đổi mật khẩu ở lần đăng nhập đầu.\n');
}

async function main() {
  if (isDemo) {
    // Seed demo chỉ chạy trên database trống và không bao giờ chạy ở production.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Từ chối chạy seed --demo ở môi trường production.');
    }
    const accounts = await seedDemo(prisma);
    console.log('Đã tạo dữ liệu demo (toàn bộ là dữ liệu giả lấy từ mock của frontend).');
    printDemoAccounts(accounts);
    return;
  }

  await seedBase();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
