import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma';
import { closeDatabase, resetDatabase } from './helpers/db';
import {
  app,
  createClass,
  createSession,
  createStaffUser,
  createStudent,
  createTeacherUser,
  createUser,
  enrollStudent,
  loginAs,
  seedRoles,
} from './helpers/fixtures';

let classAId: number;
let classBId: number;
let studentAId: number;
let studentBId: number;

let teacherCookie: string;
let otherTeacherCookie: string;
let staffCookie: string;
let adminCookie: string;

beforeEach(async () => {
  await resetDatabase();
  await seedRoles();

  // Mỗi giáo viên có cặp tài khoản - hồ sơ riêng để kiểm tra quyền theo dữ liệu.
  const { teacher: teacherA } = await createTeacherUser('GV0001', 'Giáo viên A', 'gv01');
  const { teacher: teacherB } = await createTeacherUser('GV0002', 'Giáo viên B', 'gv02');

  classAId = (await createClass(teacherA.id, 'LOP0001')).id;
  classBId = (await createClass(teacherB.id, 'LOP0002')).id;

  studentAId = (await createStudent('Nguyễn Văn A', 'HV260001')).id;
  studentBId = (await createStudent('Trần Thị B', 'HV260002')).id;
  await enrollStudent(studentAId, classAId);
  await enrollStudent(studentBId, classBId);

  await createStaffUser('NV0001', 'Nhân viên Một', 'nv01');
  await createUser('admin', 'admin01');

  teacherCookie = await loginAs('gv01');
  otherTeacherCookie = await loginAs('gv02');
  staffCookie = await loginAs('nv01');
  adminCookie = await loginAs('admin01');
});

afterAll(async () => {
  await closeDatabase();
});

describe('Quyền theo dữ liệu trên /api/attendance', () => {
  it('không đăng nhập thì 401', async () => {
    const session = await createSession(classAId);
    const res = await request(app()).get(`/api/attendance/sessions/${session.id}`);

    expect(res.status).toBe(401);
  });

  it('học viên không được xem điểm danh thì 403', async () => {
    await createUser('student', 'hv01');
    const cookie = await loginAs('hv01');
    const session = await createSession(classAId);

    const res = await request(app()).get(`/api/attendance/sessions/${session.id}`).set('Cookie', cookie);

    expect(res.status).toBe(403);
  });

  it('giáo viên xem được điểm danh lớp mình phụ trách', async () => {
    const session = await createSession(classAId);

    const res = await request(app()).get(`/api/attendance/sessions/${session.id}`).set('Cookie', teacherCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.session.id).toBe(session.id);
    expect(res.body.data.session.class.classCode).toBe('LOP0001');
    expect(res.body.data.students).toHaveLength(1);
    expect(res.body.data.students[0].fullName).toBe('Nguyễn Văn A');
  });

  it('giáo viên xem điểm danh lớp người khác phụ trách thì 403', async () => {
    const session = await createSession(classBId);

    const res = await request(app()).get(`/api/attendance/sessions/${session.id}`).set('Cookie', teacherCookie);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('giáo viên khác lớp vẫn xem được lớp của chính mình', async () => {
    const session = await createSession(classBId);

    const res = await request(app()).get(`/api/attendance/sessions/${session.id}`).set('Cookie', otherTeacherCookie);

    expect(res.status).toBe(200);
  });

  it('nhân viên và admin xem được mọi lớp', async () => {
    const session = await createSession(classBId);

    const asStaff = await request(app()).get(`/api/attendance/sessions/${session.id}`).set('Cookie', staffCookie);
    const asAdmin = await request(app()).get(`/api/attendance/sessions/${session.id}`).set('Cookie', adminCookie);

    expect(asStaff.status).toBe(200);
    expect(asAdmin.status).toBe(200);
  });

  it('buổi học không tồn tại thì trả 404', async () => {
    const res = await request(app()).get('/api/attendance/sessions/999999').set('Cookie', staffCookie);

    expect(res.status).toBe(404);
  });

  it('sessionId không phải số thì trả 400', async () => {
    const res = await request(app()).get('/api/attendance/sessions/abc').set('Cookie', staffCookie);

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/attendance/sessions/:sessionId', () => {
  it('lưu điểm danh rồi đọc lại được', async () => {
    const session = await createSession(classAId);

    const res = await request(app())
      .put(`/api/attendance/sessions/${session.id}`)
      .set('Cookie', teacherCookie)
      .send({ records: [{ studentId: studentAId, status: 'PRESENT' }] });

    expect(res.status).toBe(200);
    expect(res.body.data.students[0].status).toBe('PRESENT');

    const row = await prisma.attendance.findFirstOrThrow({
      where: { classSessionId: session.id, studentId: studentAId },
    });
    expect(row.status).toBe('PRESENT');
    expect(row.markedById).not.toBeNull();
  });

  it('ghi lại điểm danh thay vì tạo bản ghi trùng', async () => {
    const session = await createSession(classAId);

    await request(app())
      .put(`/api/attendance/sessions/${session.id}`)
      .set('Cookie', teacherCookie)
      .send({ records: [{ studentId: studentAId, status: 'PRESENT' }] });
    await request(app())
      .put(`/api/attendance/sessions/${session.id}`)
      .set('Cookie', teacherCookie)
      .send({ records: [{ studentId: studentAId, status: 'ABSENT' }] });

    const rows = await prisma.attendance.findMany({ where: { classSessionId: session.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe('ABSENT');
  });

  it('chuyển buổi học từ SCHEDULED sang HELD sau khi điểm danh', async () => {
    const session = await createSession(classAId);

    await request(app())
      .put(`/api/attendance/sessions/${session.id}`)
      .set('Cookie', teacherCookie)
      .send({ records: [{ studentId: studentAId, status: 'LATE', note: 'Đến muộn 10 phút' }] });

    const after = await prisma.classSession.findUniqueOrThrow({ where: { id: session.id } });
    expect(after.status).toBe('HELD');

    const row = await prisma.attendance.findFirstOrThrow({ where: { classSessionId: session.id } });
    expect(row.note).toBe('Đến muộn 10 phút');
  });

  it('giáo viên điểm danh lớp người khác thì 403', async () => {
    const session = await createSession(classBId);

    const res = await request(app())
      .put(`/api/attendance/sessions/${session.id}`)
      .set('Cookie', teacherCookie)
      .send({ records: [{ studentId: studentBId, status: 'PRESENT' }] });

    expect(res.status).toBe(403);
  });

  it('học viên không thuộc lớp thì trả 400', async () => {
    const session = await createSession(classAId);

    const res = await request(app())
      .put(`/api/attendance/sessions/${session.id}`)
      .set('Cookie', teacherCookie)
      .send({ records: [{ studentId: studentBId, status: 'PRESENT' }] });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('không thuộc lớp này');
  });

  it('một học viên xuất hiện hai lần thì trả 400', async () => {
    const session = await createSession(classAId);

    const res = await request(app())
      .put(`/api/attendance/sessions/${session.id}`)
      .set('Cookie', teacherCookie)
      .send({
        records: [
          { studentId: studentAId, status: 'PRESENT' },
          { studentId: studentAId, status: 'ABSENT' },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('danh sách rỗng thì trả 400', async () => {
    const session = await createSession(classAId);

    const res = await request(app())
      .put(`/api/attendance/sessions/${session.id}`)
      .set('Cookie', teacherCookie)
      .send({ records: [] });

    expect(res.status).toBe(400);
  });

  it('trạng thái điểm danh không hợp lệ thì trả 400', async () => {
    const session = await createSession(classAId);

    const res = await request(app())
      .put(`/api/attendance/sessions/${session.id}`)
      .set('Cookie', teacherCookie)
      .send({ records: [{ studentId: studentAId, status: 'KHONG_CO' }] });

    expect(res.status).toBe(400);
  });

  it('buổi đã huỷ thì không điểm danh được', async () => {
    const session = await createSession(classAId, { status: 'CANCELLED' });

    const res = await request(app())
      .put(`/api/attendance/sessions/${session.id}`)
      .set('Cookie', teacherCookie)
      .send({ records: [{ studentId: studentAId, status: 'PRESENT' }] });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('đã bị hủy');
  });

  it('ghi nhật ký thao tác điểm danh', async () => {
    const session = await createSession(classAId);

    await request(app())
      .put(`/api/attendance/sessions/${session.id}`)
      .set('Cookie', teacherCookie)
      .send({ records: [{ studentId: studentAId, status: 'PRESENT' }] });

    const log = await prisma.auditLog.findFirst({ where: { action: 'mark_attendance' } });
    expect(log).not.toBeNull();
  });
});

describe('Buổi học đã khóa', () => {
  it('trả trạng thái locked khi đọc', async () => {
    const session = await createSession(classAId, { lockedAt: new Date() });

    const res = await request(app()).get(`/api/attendance/sessions/${session.id}`).set('Cookie', teacherCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.session.locked).toBe(true);
  });

  it('sửa điểm danh của buổi đã khóa thì trả 423 LOCKED', async () => {
    const session = await createSession(classAId, { lockedAt: new Date() });

    const res = await request(app())
      .put(`/api/attendance/sessions/${session.id}`)
      .set('Cookie', teacherCookie)
      .send({ records: [{ studentId: studentAId, status: 'PRESENT' }] });

    expect(res.status).toBe(423);
    expect(res.body.error.code).toBe('LOCKED');
  });

  it('nhân viên cũng không sửa được buổi đã khóa, chỉ admin', async () => {
    const session = await createSession(classAId, { lockedAt: new Date() });

    const res = await request(app())
      .put(`/api/attendance/sessions/${session.id}`)
      .set('Cookie', staffCookie)
      .send({ records: [{ studentId: studentAId, status: 'PRESENT' }] });

    expect(res.status).toBe(423);
  });

  it('admin vẫn sửa được buổi đã khóa', async () => {
    const session = await createSession(classAId, { lockedAt: new Date() });

    const res = await request(app())
      .put(`/api/attendance/sessions/${session.id}`)
      .set('Cookie', adminCookie)
      .send({ records: [{ studentId: studentAId, status: 'EXCUSED', note: 'Có giấy xin phép' }] });

    expect(res.status).toBe(200);

    const row = await prisma.attendance.findFirstOrThrow({
      where: { classSessionId: session.id, studentId: studentAId },
    });
    expect(row.status).toBe('EXCUSED');
  });
});
