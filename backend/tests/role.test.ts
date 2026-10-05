import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma';
import { app, createStudent, createUser, loginAs, seedRoles } from './helpers/fixtures';
import { closeDatabase, resetDatabase } from './helpers/db';

beforeEach(async () => {
  await resetDatabase();
  await seedRoles();
});

afterAll(async () => {
  await closeDatabase();
});

describe('requireRole trên /api/students', () => {
  it('không đăng nhập thì 401', async () => {
    const res = await request(app()).get('/api/students');

    expect(res.status).toBe(401);
  });

  it('học viên đăng nhập nhưng không có quyền quản lý học viên thì 403', async () => {
    await createUser('student', 'hv01');
    const cookie = await loginAs('hv01');

    const res = await request(app()).get('/api/students').set('Cookie', cookie);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('giáo viên không được quản lý học viên thì 403', async () => {
    await createUser('teacher', 'gv01');
    const cookie = await loginAs('gv01');

    const res = await request(app()).post('/api/students').set('Cookie', cookie).send({ fullName: 'Test' });

    expect(res.status).toBe(403);
  });

  it('nhân viên được xem danh sách học viên', async () => {
    await createUser('staff', 'nv01');
    await createStudent('Nguyễn Văn A');
    const cookie = await loginAs('nv01');

    const res = await request(app()).get('/api/students').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
  });

  it('nhân viên tạo được học viên nhưng không xoá được (chỉ admin)', async () => {
    await createUser('staff', 'nv01');
    const cookie = await loginAs('nv01');

    const created = await request(app())
      .post('/api/students')
      .set('Cookie', cookie)
      .send({ fullName: 'Nguyễn Văn B', phone: '0900000001' });
    expect(created.status).toBe(201);

    const removed = await request(app()).delete(`/api/students/${created.body.data.id}`).set('Cookie', cookie);
    expect(removed.status).toBe(403);
  });

  it('quyền lấy từ vai trò trong database, không phải từ nội dung token', async () => {
    await createUser('student', 'hv01');
    const cookie = await loginAs('hv01');

    const allowed = await request(app()).get('/api/students').set('Cookie', cookie);
    expect(allowed.status).toBe(403);

    // Nâng quyền ngay trong database: request kế tiếp phải thấy quyền mới.
    const role = await prisma.role.findUniqueOrThrow({ where: { code: 'staff' } });
    const user = await prisma.user.findUniqueOrThrow({ where: { username: 'hv01' } });
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });

    const after = await request(app()).get('/api/students').set('Cookie', cookie);
    expect(after.status).toBe(200);
  });
});
