import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma';
import { closeDatabase, resetDatabase } from './helpers/db';
import { app, createStaffUser, createUser, loginAs, seedRoles } from './helpers/fixtures';

beforeEach(async () => {
  await resetDatabase();
  await seedRoles();
});

afterAll(async () => {
  await closeDatabase();
});

describe('POST /api/public/leads (form tư vấn công khai)', () => {
  it('không cần đăng nhập, tạo lead với nguồn website', async () => {
    const res = await request(app())
      .post('/api/public/leads')
      .send({ fullName: 'Trần Thị B', phone: '0987654321', interestedCourse: 'Khóa giao tiếp' });

    expect(res.status).toBe(201);

    const lead = await prisma.lead.findFirstOrThrow();
    expect(lead.fullName).toBe('Trần Thị B');
    expect(lead.source).toBe('website');
    expect(lead.status).toBe('NEW');
  });

  it('thiếu số điện thoại thì trả 400', async () => {
    const res = await request(app()).post('/api/public/leads').send({ fullName: 'Trần Thị B' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('email sai định dạng thì trả 400', async () => {
    const res = await request(app())
      .post('/api/public/leads')
      .send({ fullName: 'Trần Thị B', phone: '0987654321', email: 'khong-phai-email' });

    expect(res.status).toBe(400);
  });

  it('bot điền ô ẩn thì không tạo bản ghi nhưng vẫn trả 201', async () => {
    const res = await request(app())
      .post('/api/public/leads')
      .send({ fullName: 'Bot', phone: '0900000000', website: 'http://spam.example' });

    expect(res.status).toBe(201);
    expect(await prisma.lead.count()).toBe(0);
  });
});

describe('GET /api/leads', () => {
  it('không đăng nhập thì 401', async () => {
    const res = await request(app()).get('/api/leads');

    expect(res.status).toBe(401);
  });

  it('giáo viên không có quyền xem khách tiềm năng thì 403', async () => {
    await createUser('teacher', 'gv01');
    const cookie = await loginAs('gv01');

    const res = await request(app()).get('/api/leads').set('Cookie', cookie);

    expect(res.status).toBe(403);
  });

  it('nhân viên xem được danh sách có phân trang', async () => {
    await createStaffUser('NV0001', 'Nhân viên Một', 'nv01');
    const cookie = await loginAs('nv01');

    for (const name of ['A', 'B', 'C']) {
      await request(app())
        .post('/api/public/leads')
        .send({ fullName: `Khách ${name}`, phone: '0987654321' });
    }

    const res = await request(app()).get('/api/leads?page=1&pageSize=2').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ page: 1, pageSize: 2, total: 3, totalPages: 2 });
    expect(res.body.data.items).toHaveLength(2);
  });

  it('lọc theo trạng thái', async () => {
    await createStaffUser('NV0001', 'Nhân viên Một', 'nv01');
    const cookie = await loginAs('nv01');
    await request(app()).post('/api/public/leads').send({ fullName: 'Khách A', phone: '0987654321' });

    const res = await request(app()).get('/api/leads?status=WON').set('Cookie', cookie);

    expect(res.body.data.total).toBe(0);
  });
});

describe('PATCH /api/leads/:id', () => {
  it('nhân viên đổi được trạng thái và được ghi nhật ký', async () => {
    await createStaffUser('NV0001', 'Nhân viên Một', 'nv01');
    const cookie = await loginAs('nv01');
    await request(app()).post('/api/public/leads').send({ fullName: 'Khách A', phone: '0987654321' });
    const lead = await prisma.lead.findFirstOrThrow();

    const res = await request(app())
      .patch(`/api/leads/${lead.id}`)
      .set('Cookie', cookie)
      .send({ status: 'CONTACTED', note: 'Đã gọi lần 1' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CONTACTED');

    const log = await prisma.auditLog.findFirst({ where: { tableName: 'leads', action: 'update' } });
    expect(log).not.toBeNull();
  });

  it('trạng thái không hợp lệ thì trả 400', async () => {
    await createStaffUser('NV0001', 'Nhân viên Một', 'nv01');
    const cookie = await loginAs('nv01');
    await request(app()).post('/api/public/leads').send({ fullName: 'Khách A', phone: '0987654321' });
    const lead = await prisma.lead.findFirstOrThrow();

    const res = await request(app()).patch(`/api/leads/${lead.id}`).set('Cookie', cookie).send({ status: 'ABC' });

    expect(res.status).toBe(400);
  });
});
