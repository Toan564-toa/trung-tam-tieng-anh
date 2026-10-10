import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma';
import { closeDatabase, resetDatabase } from './helpers/db';
import { app, createUser, loginAs, seedRoles } from './helpers/fixtures';

let adminCookie: string;
let staffCookie: string;

beforeEach(async () => {
  await resetDatabase();
  await seedRoles();
  await createUser('admin', 'admin01');
  await createUser('staff', 'nv01');
  adminCookie = await loginAs('admin01');
  staffCookie = await loginAs('nv01');
});

afterAll(async () => {
  await closeDatabase();
});

describe('GET /api/teachers', () => {
  beforeEach(async () => {
    await prisma.teacher.create({
      data: { teacherCode: 'GV260001', fullName: 'Giáo viên Một', phone: '0912345678', status: 'ACTIVE' },
    });
    await prisma.teacher.create({
      data: { teacherCode: 'GV260002', fullName: 'Giáo viên Hai', phone: '0987654321', status: 'INACTIVE' },
    });
  });

  it('phân trang đúng cấu trúc', async () => {
    const res = await request(app()).get('/api/teachers?page=1&pageSize=1').set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ page: 1, pageSize: 1, total: 2, totalPages: 2 });
    expect(res.body.data.items).toHaveLength(1);
  });

  it('tìm theo tên/mã không phân biệt dấu', async () => {
    const res = await request(app()).get('/api/teachers?query=giao').set('Cookie', adminCookie);
    expect(res.body.data.total).toBe(2);

    const byCode = await request(app()).get('/api/teachers?query=GV260002').set('Cookie', adminCookie);
    expect(byCode.body.data.total).toBe(1);
    expect(byCode.body.data.items[0].teacherCode).toBe('GV260002');
  });

  it('lọc theo trạng thái và showOnWebsite', async () => {
    await prisma.teacher.update({
      where: { teacherCode: 'GV260001' },
      data: { showOnWebsite: true },
    });

    const inactive = await request(app()).get('/api/teachers?status=INACTIVE').set('Cookie', adminCookie);
    expect(inactive.body.data.total).toBe(1);

    const onWeb = await request(app()).get('/api/teachers?showOnWebsite=true').set('Cookie', adminCookie);
    expect(onWeb.body.data.total).toBe(1);
    expect(onWeb.body.data.items[0].showOnWebsite).toBe(true);
  });

  it('không trả passwordHash hay trường nội bộ', async () => {
    const res = await request(app()).get('/api/teachers').set('Cookie', adminCookie);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('passwordHash');
    expect(body).not.toContain('password_hash');
  });

  it('nhân viên và giáo viên không được xem danh sách giáo viên', async () => {
    const staff = await request(app()).get('/api/teachers').set('Cookie', staffCookie);
    expect(staff.status).toBe(403);
  });
});

describe('POST /api/teachers', () => {
  it('tạo giáo viên không kèm tài khoản', async () => {
    const res = await request(app())
      .post('/api/teachers')
      .set('Cookie', adminCookie)
      .send({ fullName: 'Giáo viên Ba', specialty: 'Tiếng Anh', startDate: '2026-01-05' });

    expect(res.status).toBe(201);
    expect(res.body.data.teacherCode).toMatch(/^GV\d{6}$/);
    expect(res.body.data.hasAccount).toBe(false);
    expect(res.body.temporaryPassword).toBeNull();
  });

  it('tạo giáo viên kèm tài khoản: trả mật khẩu tạm một lần và bắt đổi mật khẩu', async () => {
    const res = await request(app())
      .post('/api/teachers')
      .set('Cookie', adminCookie)
      .send({
        fullName: 'Giáo viên Bốn',
        account: { username: 'gvbốn' },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.hasAccount).toBe(true);
    expect(res.body.temporaryPassword).toBeTruthy();

    const user = await prisma.user.findFirst({
      where: { username: 'gvbốn' },
      select: { mustChangePassword: true, roles: { select: { role: { select: { code: true } } } } },
    });
    expect(user?.mustChangePassword).toBe(true);
    expect(user?.roles.map(({ role }) => role.code)).toContain('teacher');
  });

  it('tên đăng nhập trùng thì trả 409', async () => {
    await createUser('teacher', 'gvtrung');

    const res = await request(app())
      .post('/api/teachers')
      .set('Cookie', adminCookie)
      .send({ fullName: 'Giáo viên Năm', account: { username: 'GVTRUNG' } });

    expect(res.status).toBe(409);
  });

  it('ghi nhật ký tạo giáo viên', async () => {
    const res = await request(app())
      .post('/api/teachers')
      .set('Cookie', adminCookie)
      .send({ fullName: 'Giáo viên Sáu' });

    const log = await prisma.auditLog.findFirst({
      where: { action: 'create', tableName: 'teachers', recordId: String(res.body.data.id) },
    });
    expect(log).not.toBeNull();
  });
});

describe('PATCH /api/teachers/:id', () => {
  it('sửa thông tin và ghi nhật ký cũ/mới', async () => {
    const teacher = await prisma.teacher.create({
      data: { teacherCode: 'GV260001', fullName: 'Giáo viên Một' },
    });

    const res = await request(app())
      .patch(`/api/teachers/${teacher.id}`)
      .set('Cookie', adminCookie)
      .send({ specialty: 'Toán', showOnWebsite: true });

    expect(res.status).toBe(200);
    expect(res.body.data.specialty).toBe('Toán');
    expect(res.body.data.showOnWebsite).toBe(true);

    const log = await prisma.auditLog.findFirst({
      where: { action: 'update', tableName: 'teachers', recordId: String(teacher.id) },
    });
    expect(log?.oldData).toBeTruthy();
    expect(log?.newData).toBeTruthy();
  });

  it('đổi trạng thái giáo viên', async () => {
    const teacher = await prisma.teacher.create({
      data: { teacherCode: 'GV260001', fullName: 'Giáo viên Một' },
    });

    const res = await request(app())
      .patch(`/api/teachers/${teacher.id}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'INACTIVE' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('INACTIVE');
  });
});

describe('DELETE /api/teachers/:id (xóa mềm)', () => {
  it('xoá mềm ẩn khỏi danh sách, vô hiệu tài khoản liên kết, khôi phục được', async () => {
    const user = await createUser('teacher', 'gvcanxoa');
    const teacher = await prisma.teacher.create({
      data: { userId: user.id, teacherCode: 'GV260001', fullName: 'Giáo viên Một' },
    });

    const res = await request(app()).delete(`/api/teachers/${teacher.id}`).set('Cookie', adminCookie);
    expect(res.status).toBe(204);

    // Ẩn khỏi danh sách thường
    const list = await request(app()).get('/api/teachers').set('Cookie', adminCookie);
    expect(list.body.data.total).toBe(0);

    // Tài khoản liên kết bị vô hiệu
    const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(row.deletedAt).not.toBeNull();
    expect(row.status).toBe('DISABLED');

    // Khôi phục
    const restored = await request(app())
      .patch(`/api/teachers/${teacher.id}/restore`)
      .set('Cookie', adminCookie);
    expect(restored.status).toBe(200);
    expect(restored.body.data.deletedAt).toBeNull();

    const userAfter = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(userAfter.deletedAt).toBeNull();
    expect(userAfter.status).toBe('ACTIVE');
  });

  it('xoá lần hai trả 404', async () => {
    const teacher = await prisma.teacher.create({
      data: { teacherCode: 'GV260001', fullName: 'Giáo viên Một' },
    });
    await request(app()).delete(`/api/teachers/${teacher.id}`).set('Cookie', adminCookie);

    const again = await request(app()).delete(`/api/teachers/${teacher.id}`).set('Cookie', adminCookie);
    expect(again.status).toBe(404);
  });
});

describe('POST /api/teachers/:id/reset-password', () => {
  it('đặt lại mật khẩu cho giáo viên có tài khoản, trả mật khẩu tạm một lần', async () => {
    const user = await createUser('teacher', 'gvdatlai');
    const teacher = await prisma.teacher.create({
      data: { userId: user.id, teacherCode: 'GV260001', fullName: 'Giáo viên Một' },
    });

    const res = await request(app())
      .post(`/api/teachers/${teacher.id}/reset-password`)
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.temporaryPassword).toBeTruthy();

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.mustChangePassword).toBe(true);
  });

  it('giáo viên chưa có tài khoản thì trả 400', async () => {
    const teacher = await prisma.teacher.create({
      data: { teacherCode: 'GV260001', fullName: 'Giáo viên Một' },
    });

    const res = await request(app())
      .post(`/api/teachers/${teacher.id}/reset-password`)
      .set('Cookie', adminCookie);

    expect(res.status).toBe(400);
  });
});

describe('GET /api/teachers/export', () => {
  it('xuất Excel danh sách giáo viên', async () => {
    await prisma.teacher.create({
      data: { teacherCode: 'GV260001', fullName: 'Giáo viên Một', startDate: new Date('2026-01-05') },
    });

    const res = await request(app())
      .get('/api/teachers/export')
      .set('Cookie', adminCookie)
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
    expect(res.headers['content-disposition']).toContain('Danh-sach-giao-vien');
    // File Excel bắt đầu bằng PK (zip magic)
    expect(res.body[0]).toBe(0x50);
    expect(res.body[1]).toBe(0x4b);

    const log = await prisma.auditLog.findFirst({
      where: { action: 'export', tableName: 'teachers' },
    });
    expect(log).not.toBeNull();
  });
});
