import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma';
import { closeDatabase, resetDatabase } from './helpers/db';
import {
  app,
  createStaffUser,
  createStudentUser,
  createTeacherUser,
  createUser,
  loginAs,
  seedRoles,
} from './helpers/fixtures';

let staffCookie: string;

beforeEach(async () => {
  await resetDatabase();
  await seedRoles();
  await createUser('admin', 'admin01');
  await createStaffUser('NV0001', 'Nhân viên Một', 'nv01');
  staffCookie = await loginAs('nv01');
});

afterAll(async () => {
  await closeDatabase();
});

describe('GET /api/me/profile', () => {
  it('học viên nhận role student và hồ sơ học viên', async () => {
    await createStudentUser('HV260001', 'Nguyễn Văn A', 'stu01');
    const cookie = await loginAs('stu01');

    const res = await request(app()).get('/api/me/profile').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('student');
    expect(res.body.data.profile.studentCode).toBe('HV260001');
    expect(res.body.data.profile.fullName).toBe('Nguyễn Văn A');
  });

  it('giáo viên nhận role teacher, nhân viên nhận role staff', async () => {
    await createTeacherUser('GV0001', 'Giáo viên Một', 'gv01');
    const teacherCookie = await loginAs('gv01');
    const teacherRes = await request(app()).get('/api/me/profile').set('Cookie', teacherCookie);
    expect(teacherRes.body.data.role).toBe('teacher');
    expect(teacherRes.body.data.profile.teacherCode).toBe('GV0001');

    const staffRes = await request(app()).get('/api/me/profile').set('Cookie', staffCookie);
    expect(staffRes.body.data.role).toBe('staff');
    expect(staffRes.body.data.profile.staffCode).toBe('NV0001');
  });

  it('tài khoản không có hồ sơ vai trò thì trả profile cấp account', async () => {
    await createUser('admin', 'admin02');
    const cookie = await loginAs('admin02');

    const res = await request(app()).get('/api/me/profile').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('account');
    expect(res.body.data.profile.username).toBe('admin02');
  });

  it('chưa đăng nhập thì trả 401', async () => {
    const res = await request(app()).get('/api/me/profile');

    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/me/profile', () => {
  it('học viên sửa trực tiếp phone/email/address/occupation', async () => {
    await createStudentUser('HV260001', 'Nguyễn Văn A', 'stu01');
    const cookie = await loginAs('stu01');

    const res = await request(app())
      .patch('/api/me/profile')
      .set('Cookie', cookie)
      .send({ phone: '0900000099', address: 'Hà Nội', occupation: 'Sinh viên' });

    expect(res.status).toBe(200);
    expect(res.body.data.appliedFields).toEqual(
      expect.arrayContaining(['phone', 'address', 'occupation']),
    );
    expect(res.body.data.pendingRequests).toEqual([]);
    expect(res.body.data.profile.phone).toBe('0900000099');
    expect(res.body.data.profile.address).toBe('Hà Nội');
  });

  it('học viên sửa fullName không áp dụng ngay mà tạo yêu cầu duyệt', async () => {
    await createStudentUser('HV260001', 'Nguyễn Văn A', 'stu01');
    const cookie = await loginAs('stu01');

    const res = await request(app())
      .patch('/api/me/profile')
      .set('Cookie', cookie)
      .send({ fullName: 'Nguyễn Văn B' });

    expect(res.status).toBe(200);
    expect(res.body.data.appliedFields).toEqual([]);
    expect(res.body.data.pendingRequests).toHaveLength(1);
    expect(res.body.data.pendingRequests[0].fieldName).toBe('fullName');
    expect(res.body.data.pendingRequests[0].status).toBe('PENDING');
    // Hồ sơ vẫn giữ tên cũ cho đến khi duyệt.
    expect(res.body.data.profile.fullName).toBe('Nguyễn Văn A');
  });

  it('giáo viên sửa bio trực tiếp, certificate phải qua duyệt', async () => {
    await createTeacherUser('GV0001', 'Giáo viên Một', 'gv01');
    const cookie = await loginAs('gv01');

    const res = await request(app())
      .patch('/api/me/profile')
      .set('Cookie', cookie)
      .send({ bio: 'Dạy tiếng Anh 5 năm', certificate: 'IELTS 8.5' });

    expect(res.status).toBe(200);
    expect(res.body.data.appliedFields).toEqual(['bio']);
    expect(res.body.data.pendingRequests.map((r: { fieldName: string }) => r.fieldName)).toEqual([
      'certificate',
    ]);
    expect(res.body.data.profile.bio).toBe('Dạy tiếng Anh 5 năm');
  });

  it('nhân viên sửa position/department phải qua duyệt (quyết định của admin)', async () => {
    const res = await request(app())
      .patch('/api/me/profile')
      .set('Cookie', staffCookie)
      .send({ position: 'Quản lý' });

    expect(res.status).toBe(200);
    expect(res.body.data.appliedFields).toEqual([]);
    expect(res.body.data.pendingRequests[0].fieldName).toBe('position');
  });

  it('trường có trong schema nhưng không thuộc danh sách vai trò thì trả 400 FIELD_NOT_EDITABLE', async () => {
    await createStudentUser('HV260001', 'Nguyễn Văn A', 'stu01');
    const cookie = await loginAs('stu01');

    // bio là trường của giáo viên/nhân viên, học viên không được sửa.
    const res = await request(app())
      .patch('/api/me/profile')
      .set('Cookie', cookie)
      .send({ bio: 'Không được phép' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FIELD_NOT_EDITABLE');
  });

  it('body rỗng thì trả 400', async () => {
    const res = await request(app()).patch('/api/me/profile').set('Cookie', staffCookie).send({});

    expect(res.status).toBe(400);
  });

  it('tài khoản không có hồ sơ vai trò thì trả 400', async () => {
    await createUser('admin', 'admin02');
    const cookie = await loginAs('admin02');

    const res = await request(app())
      .patch('/api/me/profile')
      .set('Cookie', cookie)
      .send({ phone: '0900000099' });

    expect(res.status).toBe(400);
  });

  it('sai định dạng phone thì trả 400 VALIDATION_ERROR', async () => {
    await createStudentUser('HV260001', 'Nguyễn Văn A', 'stu01');
    const cookie = await loginAs('stu01');

    const res = await request(app())
      .patch('/api/me/profile')
      .set('Cookie', cookie)
      .send({ phone: 'abc' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('Yêu cầu đổi hồ sơ (profile_change_requests)', () => {
  let studentId: number;
  let requestId: number;
  let identityRequestId: number;

  beforeEach(async () => {
    const { student } = await createStudentUser('HV260001', 'Nguyễn Văn A', 'stu01');
    studentId = student.id;
    const cookie = await loginAs('stu01');

    const res = await request(app())
      .patch('/api/me/profile')
      .set('Cookie', cookie)
      .send({ fullName: 'Nguyễn Văn B', identityNo: '012345678901' });

    requestId = res.body.data.pendingRequests[0].id;
    identityRequestId = res.body.data.pendingRequests[1].id;
  });

  it('chủ sở hữu thấy danh sách yêu cầu của mình', async () => {
    const cookie = await loginAs('stu01');

    const res = await request(app())
      .get('/api/me/profile-change-requests')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.items.every((item: { userId: number }) => item.userId !== undefined)).toBe(
      true,
    );
  });

  it('nhân viên/admin thấy danh sách chung kèm thông tin người dùng', async () => {
    const res = await request(app()).get('/api/profile-change-requests').set('Cookie', staffCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.items[0].user).toBeTruthy();
    expect(res.body.data.items[0].user.username).toBe('stu01');
  });

  it('lọc theo trạng thái PENDING', async () => {
    const res = await request(app())
      .get('/api/profile-change-requests?status=PENDING')
      .set('Cookie', staffCookie);

    expect(res.body.data.total).toBe(2);
  });

  it('học viên không được duyệt yêu cầu (chỉ admin/staff)', async () => {
    const cookie = await loginAs('stu01');

    const res = await request(app())
      .patch(`/api/profile-change-requests/${requestId}`)
      .set('Cookie', cookie)
      .send({ action: 'approve' });

    expect(res.status).toBe(403);
  });

  it('duyệt duyệt: áp dụng giá trị mới và ghi audit', async () => {
    const res = await request(app())
      .patch(`/api/profile-change-requests/${requestId}`)
      .set('Cookie', staffCookie)
      .send({ action: 'approve' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('APPROVED');
    expect(res.body.data.reviewedBy).toBeTruthy();

    const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId } });
    expect(student.fullName).toBe('Nguyễn Văn B');

    const log = await prisma.auditLog.findFirst({
      where: { action: 'approve', tableName: 'students', recordId: String(studentId) },
    });
    expect(log).not.toBeNull();
  });

  it('duyệt yêu cầu đổi CCCD: audit ghi tên trường, không ghi giá trị CCCD', async () => {
    const res = await request(app())
      .patch(`/api/profile-change-requests/${identityRequestId}`)
      .set('Cookie', staffCookie)
      .send({ action: 'approve' });

    expect(res.status).toBe(200);

    const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId } });
    expect(student.identityNo).toBe('012345678901');

    const log = await prisma.auditLog.findFirst({
      where: { action: 'approve', tableName: 'students', recordId: String(studentId) },
    });
    expect(log).not.toBeNull();
    expect(log?.newData).toEqual({ fieldName: 'identityNo' });
    expect(JSON.stringify(log?.newData)).not.toContain('012345678901');
  });

  it('từ chối: giữ nguyên giá trị cũ và ghi audit', async () => {
    const res = await request(app())
      .patch(`/api/profile-change-requests/${requestId}`)
      .set('Cookie', staffCookie)
      .send({ action: 'reject' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('REJECTED');

    const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId } });
    expect(student.fullName).toBe('Nguyễn Văn A');

    const log = await prisma.auditLog.findFirst({
      where: { action: 'reject', tableName: 'students', recordId: String(studentId) },
    });
    expect(log).not.toBeNull();
  });

  it('duyệt yêu cầu đã xử lý thì trả 409', async () => {
    await request(app())
      .patch(`/api/profile-change-requests/${requestId}`)
      .set('Cookie', staffCookie)
      .send({ action: 'approve' });

    const again = await request(app())
      .patch(`/api/profile-change-requests/${requestId}`)
      .set('Cookie', staffCookie)
      .send({ action: 'reject' });

    expect(again.status).toBe(409);
  });

  it('yêu cầu không tồn tại thì trả 404', async () => {
    const res = await request(app())
      .patch('/api/profile-change-requests/999999')
      .set('Cookie', staffCookie)
      .send({ action: 'approve' });

    expect(res.status).toBe(404);
  });

  it('action không hợp lệ thì trả 400', async () => {
    const res = await request(app())
      .patch(`/api/profile-change-requests/${requestId}`)
      .set('Cookie', staffCookie)
      .send({ action: 'delete' });

    expect(res.status).toBe(400);
  });
});
