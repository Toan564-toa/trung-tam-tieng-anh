import 'dotenv/config';
import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ROLES = [
  { code: 'admin', name: 'Quản trị viên' },
  { code: 'staff', name: 'Nhân viên' },
  { code: 'teacher', name: 'Giáo viên' },
  { code: 'student', name: 'Học viên' },
  { code: 'guardian', name: 'Phụ huynh' },
];

async function main() {
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
      name: 'Khóa giao tiếp lộ trình 64 buổi',
      level: 'Cơ bản',
      totalSessions: 64,
      sessionsPerWeek: 2,
      durationMonths: 8,
      listPrice: 0,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
