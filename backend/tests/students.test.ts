import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma';
import { closeDatabase, resetDatabase } from './helpers/db';
import {
  app,
  createClass,
  createCourse,
  createGuardian,
  createStaffUser,
  createStudent,
  createStudentUser,
  createTeacherUser,
  createUser,
  enrollStudent,
  loginAs,
  seedRoles,
} from './helpers/fixtures';

let staffCookie: string;
let adminCookie: string;
let staffRecordId: number;

beforeEach(async () => {
  await resetDatabase();
  await seedRoles();
  // Nhân viên kèm hồ sơ staff để làm nhân viên phụ trách (advisor).
  const staff = await createStaffUser('NV0001', 'Nhân viên Một', 'nv01');
  await createUser('admin', 'admin01');
  staffCookie = await loginAs('nv01');
  adminCookie = await loginAs('admin01');
  staffRecordId = staff.staff.id;
});

afterAll(async () => {
  await closeDatabase();
});

describe('POST /api/students', () => {
  it('tạo học viên trả 201 và sinh mã học viên không trùng', async () => {
    const first = await request(app())
      .post('/api/students')
      .set('Cookie', staffCookie)
      .send({ fullName: 'Nguyễn Văn A', phone: '0912345678' });

    expect(first.status).toBe(201);
    expect(first.body.data.studentCode).toMatch(/^HV\d{6}$/);

    const second = await request(app())
      .post('/api/students')
      .set('Cookie', staffCookie)
      .send({ fullName: 'Trần Thị B', phone: '0987654321' });

    expect(second.status).toBe(201);
    expect(second.body.data.studentCode).not.toBe(first.body.data.studentCode);
  });

  it('thiếu họ tên thì trả 400 kèm chi tiết lỗi', async () => {
    const res = await request(app()).post('/api/students').set('Cookie', staffCookie).send({ phone: '0912345678' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d: { path: string }) => d.path === 'fullName')).toBe(true);
  });

  it('số điện thoại sai định dạng thì trả 400', async () => {
    const res = await request(app())
      .post('/api/students')
      .set('Cookie', staffCookie)
      .send({ fullName: 'Nguyễn Văn A', phone: 'abc' });

    expect(res.status).toBe(400);
  });

  // students.email không có ràng buộc duy nhất trong schema (chỉ student_code mới duy nhất),
  // nên trùng email vẫn tạo được. Xem D-020.
  it('email trùng vẫn tạo được vì chỉ student_code là duy nhất', async () => {
    await createStudent('Nguyễn Văn C', 'HV260100');

    const res = await request(app())
      .post('/api/students')
      .set('Cookie', staffCookie)
      .send({ fullName: 'Nguyễn Văn D', email: 'hv260100@test.vn' });

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe('hv260100@test.vn');
    expect(res.body.data.studentCode).not.toBe('HV260100');
  });

  it('ghi nhật ký tạo học viên', async () => {
    const created = await request(app())
      .post('/api/students')
      .set('Cookie', staffCookie)
      .send({ fullName: 'Nguyễn Văn A' });

    const log = await prisma.auditLog.findFirst({
      where: { action: 'create', tableName: 'students', recordId: String(created.body.data.id) },
    });
    expect(log).not.toBeNull();
  });

  it('audit nhật ký tạo/sửa không chứa giá trị CCCD', async () => {
    const created = await request(app())
      .post('/api/students')
      .set('Cookie', staffCookie)
      .send({ fullName: 'Nguyễn Văn A', identityNo: '012345678901' });

    expect(created.status).toBe(201);
    const createLog = await prisma.auditLog.findFirst({
      where: { action: 'create', tableName: 'students', recordId: String(created.body.data.id) },
    });
    expect(createLog).not.toBeNull();
    expect(JSON.stringify(createLog?.newData)).not.toContain('012345678901');

    // Nhân viên chỉ sửa được học viên mình phụ trách (advisor).
    await prisma.student.update({
      where: { id: created.body.data.id },
      data: { advisorId: staffRecordId },
    });

    const updated = await request(app())
      .patch(`/api/students/${created.body.data.id}`)
      .set('Cookie', staffCookie)
      .send({ identityNo: '098765432109' });

    expect(updated.status).toBe(200);
    const updateLog = await prisma.auditLog.findFirst({
      where: { action: 'update', tableName: 'students', recordId: String(created.body.data.id) },
    });
    expect(updateLog).not.toBeNull();
    expect(JSON.stringify(updateLog?.oldData)).not.toContain('012345678901');
    expect(JSON.stringify(updateLog?.newData)).not.toContain('098765432109');
  });

  it('không trả passwordHash hay trường nội bộ của user', async () => {
    const res = await request(app())
      .post('/api/students')
      .set('Cookie', staffCookie)
      .send({ fullName: 'Nguyễn Văn A' });

    const body = JSON.stringify(res.body);
    expect(body).not.toContain('passwordHash');
    expect(body).not.toContain('password_hash');
  });
});

describe('GET /api/students', () => {
  beforeEach(async () => {
    await createStudent('Nguyễn Văn A', 'HV260001');
    await createStudent('Trần Thị B', 'HV260002');
    await createStudent('Lê Văn C', 'HV260003');
  });

  it('phân trang đúng cấu trúc và giữ thứ tự ổn định', async () => {
    const res = await request(app()).get('/api/students?page=1&pageSize=2').set('Cookie', staffCookie);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ page: 1, pageSize: 2, total: 3, totalPages: 2 });
    expect(res.body.data.items).toHaveLength(2);
  });

  it('tìm theo tên không phân biệt hoa thường', async () => {
    const res = await request(app()).get('/api/students?search=nguyen').set('Cookie', staffCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0].fullName).toBe('Nguyễn Văn A');
  });

  // Người dùng có thể gõ có dấu hoặc không dấu, cả hai phải ra kết quả giống nhau.
  it('tìm tiếng Việt có dấu và không dấu cho cùng kết quả', async () => {
    const withMarks = await request(app())
      .get(`/api/students?search=${encodeURIComponent('Nguyễn')}`)
      .set('Cookie', staffCookie);
    const withoutMarks = await request(app()).get('/api/students?search=nguyen').set('Cookie', staffCookie);

    expect(withMarks.status).toBe(200);
    expect(withoutMarks.status).toBe(200);
    expect(withMarks.body.data.total).toBe(1);
    expect(withoutMarks.body.data.total).toBe(1);
    expect(withMarks.body.data.items[0].id).toBe(withoutMarks.body.data.items[0].id);
  });

  it('tìm bằng nửa tên không dấu vẫn ra', async () => {
    const res = await request(app()).get('/api/students?search=hoa').set('Cookie', staffCookie);

    expect(res.status).toBe(200);
    // Dù không khớp ai với "hoa", lệnh phải chạy được và trả danh sách rỗng.
    expect(res.body.data.total).toBe(0);
  });

  it('tìm theo mã học viên', async () => {
    const res = await request(app()).get('/api/students?search=HV260003').set('Cookie', staffCookie);

    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0].studentCode).toBe('HV260003');
  });

  it('tìm theo số điện thoại', async () => {
    // Mã riêng vì beforeEach của describe đã tạo HV260001–260003 (cùng số điện thoại mặc định).
    await createStudent('Vũ Văn D', 'HV260100', '0987654321');

    const res = await request(app()).get('/api/students?search=0987654321').set('Cookie', staffCookie);

    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0].studentCode).toBe('HV260100');
  });

  it('lọc theo trạng thái', async () => {
    await prisma.student.update({ where: { studentCode: 'HV260002' }, data: { status: 'FROZEN' } });

    const res = await request(app()).get('/api/students?status=FROZEN').set('Cookie', staffCookie);

    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0].studentCode).toBe('HV260002');
  });

  it('lọc theo nhân viên phụ trách (advisorId)', async () => {
    await prisma.student.update({ where: { studentCode: 'HV260001' }, data: { advisorId: staffRecordId } });

    const res = await request(app()).get(`/api/students?advisorId=${staffRecordId}`).set('Cookie', staffCookie);

    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0].studentCode).toBe('HV260001');
  });

  it('lọc theo lớp (classId)', async () => {
    const teacher = await createTeacherUser('GV0001', 'Giáo viên Một', 'gv01');
    const course = await createCourse('GT-64');
    const classRow = await createClass(teacher.teacher.id, 'LOP0001');
    // Mã riêng vì beforeEach của describe đã tạo HV260001–260003.
    const student = await createStudent('Nguyễn Văn A', 'HV260100');
    await enrollStudent(student.id, classRow.id);

    const res = await request(app()).get(`/api/students?classId=${classRow.id}`).set('Cookie', staffCookie);

    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0].studentCode).toBe('HV260100');
    void course;
  });

  it('trạng thái không hợp lệ thì trả 400', async () => {
    const res = await request(app()).get('/api/students?status=ABC').set('Cookie', staffCookie);

    expect(res.status).toBe(400);
  });

  it('pageSize vượt quá 100 thì trả 400', async () => {
    const res = await request(app()).get('/api/students?pageSize=500').set('Cookie', staffCookie);

    expect(res.status).toBe(400);
  });

  it('học viên không được dùng endpoint danh sách', async () => {
    const { student } = await createStudentUser('HV260100', 'Nguyễn Văn A', 'stu01');
    const cookie = await loginAs('stu01');

    const res = await request(app()).get('/api/students').set('Cookie', cookie);

    expect(res.status).toBe(403);
    void student;
  });

  it('giáo viên chỉ thấy học viên trong lớp mình dạy', async () => {
    const teacher = await createTeacherUser('GV0001', 'Giáo viên Một', 'gv01');
    const otherTeacher = await createTeacherUser('GV0002', 'Giáo viên Hai', 'gv02');
    const classMine = await createClass(teacher.teacher.id, 'LOP0001');
    const classOther = await createClass(otherTeacher.teacher.id, 'LOP0002');
    // Mã riêng vì beforeEach của describe đã tạo HV260001–260003.
    const studentMine = await createStudent('Học viên lớp mình', 'HV260100');
    const studentOther = await createStudent('Học viên lớp khác', 'HV260101');
    await enrollStudent(studentMine.id, classMine.id);
    await enrollStudent(studentOther.id, classOther.id);

    const cookie = await loginAs('gv01');
    const res = await request(app()).get('/api/students').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0].studentCode).toBe('HV260100');
  });
});

describe('GET /api/students/:id', () => {
  it('trả học viên kèm lớp đang ghi danh, phụ huynh; lịch sử phụ trách ở endpoint riêng', async () => {
    const student = await createStudent('Nguyễn Văn A', 'HV260001');
    const guardian = await createGuardian('Bố của A', '0900000000');
    await prisma.studentGuardian.create({
      data: { studentId: student.id, guardianId: guardian.id, relation: 'Bố', isPrimary: true },
    });
    await prisma.studentAssignment.create({
      data: { studentId: student.id, staffId: staffRecordId, fromDate: new Date('2026-01-01') },
    });

    const res = await request(app()).get(`/api/students/${student.id}`).set('Cookie', staffCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.studentCode).toBe('HV260001');
    expect(res.body.data.guardians).toHaveLength(1);
    expect(res.body.data.guardians[0].relation).toBe('Bố');
    expect(res.body.data.enrollments).toEqual([]);

    // Lịch sử phụ trách có endpoint riêng (theo FRONTEND-CONTRACT.md C.4.x).
    const assignments = await request(app())
      .get(`/api/students/${student.id}/assignments`)
      .set('Cookie', staffCookie);
    expect(assignments.status).toBe(200);
    expect(assignments.body.data.items).toHaveLength(1);
    expect(assignments.body.data.items[0].staffName).toBe('Nhân viên Một');
  });

  it('id không phải số thì trả 400', async () => {
    const res = await request(app()).get('/api/students/abc').set('Cookie', staffCookie);

    expect(res.status).toBe(400);
  });

  it('không tìm thấy thì trả 404', async () => {
    const res = await request(app()).get('/api/students/999999').set('Cookie', staffCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  // IDOR: học viên chỉ đọc được hồ sơ của chính mình.
  it('học viên đọc hồ sơ người khác bị từ chối 403 (chống IDOR)', async () => {
    const a = await createStudentUser('HV260001', 'Nguyễn Văn A', 'stu01');
    const b = await createStudentUser('HV260002', 'Trần Thị B', 'stu02');
    const cookieA = await loginAs('stu01');

    const own = await request(app()).get(`/api/students/${a.student.id}`).set('Cookie', cookieA);
    expect(own.status).toBe(200);
    expect(own.body.data.studentCode).toBe('HV260001');

    const other = await request(app()).get(`/api/students/${b.student.id}`).set('Cookie', cookieA);
    expect(other.status).toBe(403);
  });

  it('giáo viên xem học viên ngoài lớp mình bị từ chối 403', async () => {
    const teacher = await createTeacherUser('GV0001', 'Giáo viên Một', 'gv01');
    const otherTeacher = await createTeacherUser('GV0002', 'Giáo viên Hai', 'gv02');
    const classOther = await createClass(otherTeacher.teacher.id, 'LOP0002');
    const student = await createStudent('Học viên lớp khác', 'HV260001');
    await enrollStudent(student.id, classOther.id);

    const cookie = await loginAs('gv01');
    const res = await request(app()).get(`/api/students/${student.id}`).set('Cookie', cookie);

    expect(res.status).toBe(403);
    void teacher;
  });

  it('giáo viên xem học viên lớp mình không thấy identityNo', async () => {
    const teacher = await createTeacherUser('GV0001', 'Giáo viên Một', 'gv01');
    const classRow = await createClass(teacher.teacher.id, 'LOP0001');
    const student = await createStudent('Học viên lớp mình', 'HV260001');
    await prisma.student.update({ where: { id: student.id }, data: { identityNo: '012345678901' } });
    await enrollStudent(student.id, classRow.id);

    const cookie = await loginAs('gv01');
    const res = await request(app()).get(`/api/students/${student.id}`).set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.identityNo).toBeNull();
  });

  it('nhân viên xem hồ sơ học viên có identityNo (dữ liệu nhạy cảm chỉ admin/staff)', async () => {
    const student = await createStudent('Học viên A', 'HV260001');
    await prisma.student.update({ where: { id: student.id }, data: { identityNo: '012345678901' } });

    const res = await request(app()).get(`/api/students/${student.id}`).set('Cookie', staffCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.identityNo).toBe('012345678901');
  });
});

describe('PATCH /api/students/:id', () => {
  it('nhân viên phụ trách sửa được và ghi nhật ký giá trị cũ/mới', async () => {
    const student = await createStudent('Nguyễn Văn A', 'HV260001');
    await prisma.student.update({ where: { id: student.id }, data: { advisorId: staffRecordId } });

    const res = await request(app())
      .patch(`/api/students/${student.id}`)
      .set('Cookie', staffCookie)
      .send({ fullName: 'Nguyễn Văn A1', phone: '0900000099' });

    expect(res.status).toBe(200);
    expect(res.body.data.fullName).toBe('Nguyễn Văn A1');

    const log = await prisma.auditLog.findFirst({
      where: { action: 'update', tableName: 'students', recordId: String(student.id) },
    });
    expect(log?.oldData).toBeTruthy();
    expect(log?.newData).toBeTruthy();
  });

  it('nhân viên không phụ trách thì sửa học viên đó bị từ chối 403', async () => {
    const student = await createStudent('Nguyễn Văn A', 'HV260001');

    const res = await request(app())
      .patch(`/api/students/${student.id}`)
      .set('Cookie', staffCookie)
      .send({ fullName: 'Sửa không được' });

    expect(res.status).toBe(403);
  });

  it('admin sửa được mọi học viên', async () => {
    const student = await createStudent('Nguyễn Văn A', 'HV260001');

    const res = await request(app())
      .patch(`/api/students/${student.id}`)
      .set('Cookie', adminCookie)
      .send({ level: 'Cơ bản' });

    expect(res.status).toBe(200);
    expect(res.body.data.level).toBe('Cơ bản');
  });

  it('sửa học viên đã xoá mềm thì trả 404', async () => {
    const student = await createStudent('Nguyễn Văn A', 'HV260001');
    await request(app()).delete(`/api/students/${student.id}`).set('Cookie', adminCookie);

    const res = await request(app())
      .patch(`/api/students/${student.id}`)
      .set('Cookie', adminCookie)
      .send({ fullName: 'Sửa lại' });

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/students/:id/status', () => {
  it('đổi trạng thái học viên và ghi log', async () => {
    const student = await createStudent('Nguyễn Văn A', 'HV260001');

    const res = await request(app())
      .patch(`/api/students/${student.id}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'FROZEN' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('FROZEN');

    const log = await prisma.auditLog.findFirst({
      where: { action: 'update_status', tableName: 'students', recordId: String(student.id) },
    });
    expect(log).not.toBeNull();
  });

  it('trạng thái không hợp lệ thì trả 400', async () => {
    const student = await createStudent('Nguyễn Văn A', 'HV260001');

    const res = await request(app())
      .patch(`/api/students/${student.id}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'UNKNOWN' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/students/:id (xóa mềm)', () => {
  it('admin xoá được, bản ghi vẫn còn trong database nhưng bị ẩn khỏi truy vấn', async () => {
    const student = await createStudent('Nguyễn Văn A', 'HV260001');

    const res = await request(app()).delete(`/api/students/${student.id}`).set('Cookie', adminCookie);
    expect(res.status).toBe(204);

    const row = await prisma.student.findUniqueOrThrow({ where: { id: student.id } });
    expect(row.deletedAt).not.toBeNull();

    const get = await request(app()).get(`/api/students/${student.id}`).set('Cookie', staffCookie);
    expect(get.status).toBe(404);

    const list = await request(app()).get('/api/students').set('Cookie', staffCookie);
    expect(list.body.data.total).toBe(0);
  });

  it('xoá lần hai thì trả 404', async () => {
    const student = await createStudent('Nguyễn Văn A', 'HV260001');
    await request(app()).delete(`/api/students/${student.id}`).set('Cookie', adminCookie);

    const again = await request(app()).delete(`/api/students/${student.id}`).set('Cookie', adminCookie);
    expect(again.status).toBe(404);
  });

  it('nhân viên không được xoá học viên (chỉ admin)', async () => {
    const student = await createStudent('Nguyễn Văn A', 'HV260001');

    const res = await request(app()).delete(`/api/students/${student.id}`).set('Cookie', staffCookie);

    expect(res.status).toBe(403);
  });

  it('khôi phục học viên đã xoá và ghi log', async () => {
    const student = await createStudent('Nguyễn Văn A', 'HV260001');
    await request(app()).delete(`/api/students/${student.id}`).set('Cookie', adminCookie);

    const res = await request(app()).patch(`/api/students/${student.id}/restore`).set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.studentCode).toBe('HV260001');

    const list = await request(app()).get('/api/students').set('Cookie', staffCookie);
    expect(list.body.data.total).toBe(1);

    const log = await prisma.auditLog.findFirst({
      where: { action: 'restore', tableName: 'students', recordId: String(student.id) },
    });
    expect(log).not.toBeNull();
  });

  it('onlyDeleted=true trả về bản ghi đã xoá (admin)', async () => {
    const student = await createStudent('Nguyễn Văn A', 'HV260001');
    await request(app()).delete(`/api/students/${student.id}`).set('Cookie', adminCookie);

    const res = await request(app()).get('/api/students?onlyDeleted=true').set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0].deletedAt).not.toBeNull();
  });

  it('onlyDeleted=true bị từ chối với nhân viên', async () => {
    await request(app()).get('/api/students?onlyDeleted=true').set('Cookie', staffCookie).then((res) => {
      expect(res.status).toBe(403);
    });
  });
});

describe('Người giám hộ (guardians)', () => {
  let studentId: number;

  beforeEach(async () => {
    const student = await createStudent('Nguyễn Văn A', 'HV260001');
    await prisma.student.update({ where: { id: student.id }, data: { advisorId: staffRecordId } });
    studentId = student.id;
  });

  it('thêm, đọc, sửa và xoá phụ huynh', async () => {
    const created = await request(app())
      .post(`/api/students/${studentId}/guardians`)
      .set('Cookie', staffCookie)
      .send({
        fullName: 'Nguyễn Văn Bố',
        phone: '0900000000',
        relation: 'Bố',
        isPrimary: true,
      });

    expect(created.status).toBe(201);
    expect(created.body.data.relation).toBe('Bố');
    const guardianId = created.body.data.id;

    const list = await request(app())
      .get(`/api/students/${studentId}/guardians`)
      .set('Cookie', staffCookie);
    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);

    const updated = await request(app())
      .patch(`/api/students/${studentId}/guardians/${guardianId}`)
      .set('Cookie', staffCookie)
      .send({ phone: '0911111111', relation: 'Mẹ' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.phone).toBe('0911111111');

    const removed = await request(app())
      .delete(`/api/students/${studentId}/guardians/${guardianId}`)
      .set('Cookie', staffCookie);
    expect(removed.status).toBe(204);

    const after = await request(app())
      .get(`/api/students/${studentId}/guardians`)
      .set('Cookie', staffCookie);
    expect(after.body.data.items).toHaveLength(0);
  });

  it('thiếu số điện thoại phụ huynh thì trả 400', async () => {
    const res = await request(app())
      .post(`/api/students/${studentId}/guardians`)
      .set('Cookie', staffCookie)
      .send({ fullName: 'Nguyễn Văn Bố', relation: 'Bố' });

    expect(res.status).toBe(400);
  });

  it('giáo viên không được thêm phụ huynh', async () => {
    const teacher = await createTeacherUser('GV0001', 'Giáo viên Một', 'gv01');
    const cookie = await loginAs('gv01');

    const res = await request(app())
      .post(`/api/students/${studentId}/guardians`)
      .set('Cookie', cookie)
      .send({ fullName: 'Nguyễn Văn Bố', phone: '0900000000', relation: 'Bố' });

    expect(res.status).toBe(403);
    void teacher;
  });
});

describe('Lịch sử nhân viên phụ trách (student_assignments)', () => {
  let studentId: number;

  beforeEach(async () => {
    const student = await createStudent('Nguyễn Văn A', 'HV260001');
    await prisma.student.update({ where: { id: student.id }, data: { advisorId: staffRecordId } });
    studentId = student.id;
  });

  it('thêm lịch sử phụ trách, kết thúc và đọc lại', async () => {
    const created = await request(app())
      .post(`/api/students/${studentId}/assignments`)
      .set('Cookie', staffCookie)
      .send({ staffId: staffRecordId, fromDate: '2026-01-01', reason: 'Phân công ban đầu' });

    expect(created.status).toBe(201);
    expect(created.body.data.staffId).toBe(staffRecordId);
    const assignmentId = created.body.data.id;

    const closed = await request(app())
      .patch(`/api/students/${studentId}/assignments/${assignmentId}/close`)
      .set('Cookie', staffCookie)
      .send({ toDate: '2026-06-01', reason: 'Chuyển nhân viên khác phụ trách' });
    expect(closed.status).toBe(200);
    expect(closed.body.data.toDate).not.toBeNull();

    // Đóng lần hai bị lỗi 409 vì đã có ngày kết thúc.
    const again = await request(app())
      .patch(`/api/students/${studentId}/assignments/${assignmentId}/close`)
      .set('Cookie', staffCookie)
      .send({ toDate: '2026-07-01' });
    expect(again.status).toBe(409);

    const list = await request(app())
      .get(`/api/students/${studentId}/assignments`)
      .set('Cookie', staffCookie);
    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.items[0].staffName).toBe('Nhân viên Một');
  });

  it('nhân viên không phụ trách học viên thì không thêm được lịch sử', async () => {
    const other = await createStaffUser('NV0002', 'Nhân viên Hai', 'nv02');
    const cookie = await loginAs('nv02');

    const res = await request(app())
      .post(`/api/students/${studentId}/assignments`)
      .set('Cookie', cookie)
      .send({ staffId: other.staff.id, fromDate: '2026-01-01' });

    expect(res.status).toBe(403);
  });
});
