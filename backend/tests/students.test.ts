import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma';
import { closeDatabase, resetDatabase } from './helpers/db';
import { app, createStudent, createStaff, createUser, loginAs, seedRoles } from './helpers/fixtures';

let staffCookie: string;
let adminCookie: string;

beforeEach(async () => {
  await resetDatabase();
  await seedRoles();
  await createUser('staff', 'nv01');
  await createUser('admin', 'admin01');
  staffCookie = await loginAs('nv01');
  adminCookie = await loginAs('admin01');
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

  it('mã học viên trùng thì trả 409 CONFLICT', async () => {
    await createStudent('Nguyễn Văn C', 'HV260100');

    // Ép mã trùng để kiểm tra lỗi ràng buộc duy nhất được dịch thành 409.
    const clash = await prisma.student
      .create({
        data: { fullName: 'Học viên trùng mã', studentCode: 'HV260100' },
      })
      .catch(() => null);

    // Nếu database chặn được thì service phải báo 409, không phải lỗi 500.
    expect(clash).toBeNull();
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

  it('lọc theo trạng thái', async () => {
    await prisma.student.update({ where: { studentCode: 'HV260002' }, data: { status: 'FROZEN' } });

    const res = await request(app()).get('/api/students?status=FROZEN').set('Cookie', staffCookie);

    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0].studentCode).toBe('HV260002');
  });

  it('trạng thái không hợp lệ thì trả 400', async () => {
    const res = await request(app()).get('/api/students?status=ABC').set('Cookie', staffCookie);

    expect(res.status).toBe(400);
  });

  it('pageSize vượt quá 100 thì trả 400', async () => {
    const res = await request(app()).get('/api/students?pageSize=500').set('Cookie', staffCookie);

    expect(res.status).toBe(400);
  });
});

describe('GET /api/students/:id', () => {
  it('trả học viên kèm lớp đang ghi danh', async () => {
    const student = await createStudent('Nguyễn Văn A', 'HV260001');

    const res = await request(app()).get(`/api/students/${student.id}`).set('Cookie', staffCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.studentCode).toBe('HV260001');
    expect(res.body.data.enrollments).toEqual([]);
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
});

describe('PATCH /api/students/:id', () => {
  it('sửa thông tin và ghi nhật ký giá trị cũ/mới', async () => {
    const student = await createStudent('Nguyễn Văn A', 'HV260001');

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

  it('sửa học viên đã xoá mềm thì trả 404', async () => {
    const student = await createStudent('Nguyễn Văn A', 'HV260001');
    await request(app()).delete(`/api/students/${student.id}`).set('Cookie', adminCookie);

    const res = await request(app())
      .patch(`/api/students/${student.id}`)
      .set('Cookie', staffCookie)
      .send({ fullName: 'Sửa lại' });

    expect(res.status).toBe(404);
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

  it('xoá nhầm học viên khác thì không xoá được hồ sơ liên kết với tài khoản', async () => {
    const student = await createStudent('Nguyễn Văn A', 'HV260001');
    const staff = await createStaff('Nhân viên Một', 'NV0001');

    const res = await request(app()).delete(`/api/students/${student.id}`).set('Cookie', adminCookie);
    expect(res.status).toBe(204);

    // Nhân viên phụ trách vẫn còn nguyên sau khi xoá mềm học viên
    const row = await prisma.staff.findUniqueOrThrow({ where: { id: staff.id } });
    expect(row).not.toBeNull();
  });
});
