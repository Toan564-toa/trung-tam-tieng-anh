import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma';
import { closeDatabase, resetDatabase } from './helpers/db';
import { app, createUser, loginAs, seedRoles } from './helpers/fixtures';

let adminCookie: string;

beforeEach(async () => {
  await resetDatabase();
  await seedRoles();
  await createUser('admin', 'admin01');
  adminCookie = await loginAs('admin01');
});

afterAll(async () => {
  await closeDatabase();
});

describe('GET /api/staff', () => {
  beforeEach(async () => {
    await prisma.staff.create({
      data: { staffCode: 'NV260001', fullName: 'Nhân viên Một', position: 'Tư vấn', department: 'Tuyển sinh' },
    });
    await prisma.staff.create({
      data: { staffCode: 'NV260002', fullName: 'Nhân viên Hai', position: 'Kế toán', status: 'INACTIVE' },
    });
  });

  it('phân trang đúng cấu trúc và đếm số học viên phụ trách', async () => {
    const staff = await prisma.staff.findFirstOrThrow({ where: { staffCode: 'NV260001' } });
    await prisma.student.create({
      data: { fullName: 'Học viên A', studentCode: 'HV260001', advisorId: staff.id },
    });

    const res = await request(app()).get('/api/staff?page=1&pageSize=10').set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
    const row = res.body.data.items.find((item: { staffCode: string }) => item.staffCode === 'NV260001');
    expect(row.studentCount).toBe(1);
    expect(row.position).toBe('Tư vấn');
  });

  it('tìm theo tên/mã và lọc trạng thái', async () => {
    const res = await request(app()).get('/api/staff?query=nhan').set('Cookie', adminCookie);
    expect(res.body.data.total).toBe(2);

    const inactive = await request(app()).get('/api/staff?status=INACTIVE').set('Cookie', adminCookie);
    expect(inactive.body.data.total).toBe(1);
    expect(inactive.body.data.items[0].staffCode).toBe('NV260002');
  });

  it('không trả passwordHash hay trường nội bộ', async () => {
    const res = await request(app()).get('/api/staff').set('Cookie', adminCookie);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('passwordHash');
  });

  it('nhân viên thường không được xem danh sách nhân viên (admin only)', async () => {
    const staff = await createUser('staff', 'nv01');
    const cookie = await loginAs('nv01');

    const res = await request(app()).get('/api/staff').set('Cookie', cookie);

    expect(res.status).toBe(403);
    void staff;
  });
});

describe('POST /api/staff', () => {
  it('tạo nhân viên không kèm tài khoản', async () => {
    const res = await request(app())
      .post('/api/staff')
      .set('Cookie', adminCookie)
      .send({ fullName: 'Nhân viên Ba', position: 'Tư vấn', department: 'Tuyển sinh' });

    expect(res.status).toBe(201);
    expect(res.body.data.staffCode).toMatch(/^NV\d{6}$/);
    expect(res.body.data.hasAccount).toBe(false);
  });

  it('tạo nhân viên kèm tài khoản', async () => {
    const res = await request(app())
      .post('/api/staff')
      .set('Cookie', adminCookie)
      .send({ fullName: 'Nhân viên Bốn', account: { username: 'nvbon' } });

    expect(res.status).toBe(201);
    expect(res.body.data.hasAccount).toBe(true);
    expect(res.body.temporaryPassword).toBeTruthy();

    const user = await prisma.user.findFirst({
      where: { username: 'nvbon' },
      select: { roles: { select: { role: { select: { code: true } } } } },
    });
    expect(user?.roles.map(({ role }) => role.code)).toContain('staff');
  });

  it('ghi nhật ký tạo nhân viên', async () => {
    const res = await request(app())
      .post('/api/staff')
      .set('Cookie', adminCookie)
      .send({ fullName: 'Nhân viên Năm' });

    const log = await prisma.auditLog.findFirst({
      where: { action: 'create', tableName: 'staff', recordId: String(res.body.data.id) },
    });
    expect(log).not.toBeNull();
  });
});

describe('PATCH /api/staff/:id', () => {
  it('sửa thông tin và ghi nhật ký', async () => {
    const staff = await prisma.staff.create({
      data: { staffCode: 'NV260001', fullName: 'Nhân viên Một' },
    });

    const res = await request(app())
      .patch(`/api/staff/${staff.id}`)
      .set('Cookie', adminCookie)
      .send({ position: 'Quản lý', department: 'Hành chính' });

    expect(res.status).toBe(200);
    expect(res.body.data.position).toBe('Quản lý');

    const log = await prisma.auditLog.findFirst({
      where: { action: 'update', tableName: 'staff', recordId: String(staff.id) },
    });
    expect(log?.oldData).toBeTruthy();
    expect(log?.newData).toBeTruthy();
  });
});

describe('DELETE /api/staff/:id (xóa mềm)', () => {
  it('xoá mềm ẩn khỏi danh sách và khôi phục được', async () => {
    const staff = await prisma.staff.create({
      data: { staffCode: 'NV260001', fullName: 'Nhân viên Một' },
    });

    const res = await request(app()).delete(`/api/staff/${staff.id}`).set('Cookie', adminCookie);
    expect(res.status).toBe(204);

    const list = await request(app()).get('/api/staff').set('Cookie', adminCookie);
    expect(list.body.data.total).toBe(0);

    const restored = await request(app())
      .patch(`/api/staff/${staff.id}/restore`)
      .set('Cookie', adminCookie);
    expect(restored.status).toBe(200);
    expect(restored.body.data.staffCode).toBe('NV260001');
  });
});

describe('GET /api/staff/export', () => {
  it('xuất Excel danh sách nhân viên', async () => {
    await prisma.staff.create({
      data: { staffCode: 'NV260001', fullName: 'Nhân viên Một', startDate: new Date('2026-01-05') },
    });

    const res = await request(app())
      .get('/api/staff/export')
      .set('Cookie', adminCookie)
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
    expect(res.body[0]).toBe(0x50);
    expect(res.body[1]).toBe(0x4b);
  });
});
