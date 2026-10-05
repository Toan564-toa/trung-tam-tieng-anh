import { prisma } from '../../src/config/prisma';

// Xoá sạch dữ liệu trong mọi bảng, đặt lại bộ đếm, giữ nguyên cấu trúc.
// Dùng TRUNCATE ... CASCADE để không phải liệt kê thứ tự khoá ngoại.
export async function resetDatabase() {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%'
  `;

  if (tables.length === 0) return;

  const list = tables.map((t) => `"${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

export async function closeDatabase() {
  await prisma.$disconnect();
}
