import request from 'supertest';
import ExcelJS from 'exceljs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma';
import { closeDatabase, resetDatabase } from './helpers/db';
import {
  app,
  createStaffUser,
  createStudent,
  createUser,
  loginAs,
  seedRoles,
} from './helpers/fixtures';

const STUDENT_HEADERS = [
  'Mã học viên',
  'Họ tên',
  'Ngày sinh',
  'Giới tính',
  'Số điện thoại',
  'Email',
  'Địa chỉ',
  'Trường',
  'Trình độ',
];

// exceljs khai báo Buffer riêng (extends ArrayBuffer) không tương thích với
// Node Buffer — cast qua tham số đầu tiên của xlsx.load như service.
type ExcelLoadBuffer = Parameters<ExcelJS.Workbook['xlsx']['load']>[0];

async function buildXlsx(headers: string[], rows: string[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');
  ws.addRow(headers);
  for (const r of rows) ws.addRow(r);
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

async function readXlsx(buffer: Buffer): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ExcelLoadBuffer);
  const ws = wb.worksheets[0];
  const out: string[][] = [];
  ws.eachRow((row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => cells.push(String(cell.value ?? '')));
    out.push(cells);
  });
  return out;
}

function collectBuffer(res: request.Response, cb: (err: Error | null, body?: Buffer) => void) {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
}

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

describe('GET /api/imports/templates/:type', () => {
  it('tải mẫu nhập học viên (Excel, tiêu đề tiếng Việt + ví dụ)', async () => {
    const res = await request(app())
      .get('/api/imports/templates/students')
      .set('Cookie', adminCookie)
      .buffer(true)
      .parse(collectBuffer);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
    expect(res.headers['content-disposition']).toContain('mau-nhap-students');
    expect(res.body[0]).toBe(0x50);
    expect(res.body[1]).toBe(0x4b);

    const rows = await readXlsx(res.body);
    expect(rows[0]).toEqual(STUDENT_HEADERS);
    expect(rows[1][0]).toBe('HV260001');
    expect(rows[1][1]).toBe('Nguyễn Văn A');
  });

  it('tải mẫu giáo viên và nhân viên', async () => {
    const teacherRes = await request(app())
      .get('/api/imports/templates/teachers')
      .set('Cookie', adminCookie)
      .buffer(true)
      .parse(collectBuffer);
    expect(teacherRes.status).toBe(200);
    const teacherRows = await readXlsx(teacherRes.body);
    expect(teacherRows[0]).toContain('Chuyên môn');

    const staffRes = await request(app())
      .get('/api/imports/templates/staff')
      .set('Cookie', adminCookie)
      .buffer(true)
      .parse(collectBuffer);
    expect(staffRes.status).toBe(200);
    const staffRows = await readXlsx(staffRes.body);
    expect(staffRows[0]).toContain('Chức vụ');
    expect(staffRows[0]).toContain('Phòng ban');
  });

  it('type không hợp lệ -> 400', async () => {
    const res = await request(app())
      .get('/api/imports/templates/leads')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('chưa đăng nhập -> 401', async () => {
    const res = await request(app()).get('/api/imports/templates/students');
    expect(res.status).toBe(401);
  });

  it('nhân viên không phải admin -> 403', async () => {
    await createStaffUser('NV0001', 'Nhân viên Một', 'nv01');
    const cookie = await loginAs('nv01');

    const res = await request(app())
      .get('/api/imports/templates/students')
      .set('Cookie', cookie);

    expect(res.status).toBe(403);
  });
});

describe('POST /api/imports', () => {
  it('tạo lô nhập từ file hợp lệ (kind qua query)', async () => {
    const file = await buildXlsx(STUDENT_HEADERS, [
      ['HV260001', 'Nguyễn Văn A', '05/01/2010', 'Nam', '0912345678', 'van.a@example.vn', 'Hà Nội', 'THCS A', 'Cơ bản'],
      ['HV260002', 'Trần Thị B', '', 'Nữ', '0912345679', '', '', '', ''],
    ]);

    const res = await request(app())
      .post('/api/imports?kind=student')
      .set('Cookie', adminCookie)
      .attach('file', file, 'danh-sach.xlsx');

    expect(res.status).toBe(201);
    expect(res.body.data.totalRows).toBe(2);
    expect(res.body.data.validRows).toBe(2);
    expect(res.body.data.errorRows).toBe(0);

    const batch = await prisma.importBatch.findUniqueOrThrow({
      where: { id: res.body.data.batchId },
    });
    expect(batch.kind).toBe('STUDENT');
    expect(batch.status).toBe('UPLOADED');
    expect(batch.totalRows).toBe(2);
  });

  it('kind qua form field (multipart)', async () => {
    const file = await buildXlsx(
      ['Mã giáo viên', 'Họ tên', 'Số điện thoại', 'Email', 'Chuyên môn', 'Ngày vào', 'Hiện website'],
      [['GV260001', 'Lê Văn C', '0912345680', 'c@example.vn', 'Tiếng Anh', '05/01/2026', 'true']],
    );

    const res = await request(app())
      .post('/api/imports')
      .set('Cookie', adminCookie)
      .field('kind', 'teacher')
      .attach('file', file, 'gv.xlsx');

    expect(res.status).toBe(201);
    expect(res.body.data.validRows).toBe(1);
    const batch = await prisma.importBatch.findUniqueOrThrow({
      where: { id: res.body.data.batchId },
    });
    expect(batch.kind).toBe('TEACHER');
  });

  it('dòng lỗi: thiếu họ tên, sđt/email/ngày sinh/giới tính sai', async () => {
    const file = await buildXlsx(STUDENT_HEADERS, [
      ['HV260001', '', '05/01/2010', 'Nam', '0912345678', 'a@example.vn', '', '', ''],
      ['HV260002', 'Nguyễn B', '', '', 'abc', 'b@example.vn', '', '', ''],
      ['HV260003', 'Nguyễn C', '', '', '0912345681', 'khong-phai-email', '', '', ''],
      ['HV260004', 'Nguyễn D', 'khong-phai-ngay', '', '0912345682', 'd@example.vn', '', '', ''],
      ['HV260005', 'Nguyễn E', '', 'M', '0912345683', 'e@example.vn', '', '', ''],
    ]);

    const res = await request(app())
      .post('/api/imports?kind=student')
      .set('Cookie', adminCookie)
      .attach('file', file, 'loi.xlsx');

    expect(res.status).toBe(201);
    expect(res.body.data.errorRows).toBe(5);
    expect(res.body.data.validRows).toBe(0);

    const preview = await request(app())
      .get(`/api/imports/${res.body.data.batchId}`)
      .set('Cookie', adminCookie);
    const items = preview.body.data.items;
    expect(items[0].errorMessage).toContain('Họ tên');
    expect(items[1].errorMessage).toContain('Số điện thoại');
    expect(items[2].errorMessage).toContain('Email');
    expect(items[3].errorMessage).toContain('Ngày sinh');
    expect(items[4].errorMessage).toContain('Giới tính');
  });

  it('trùng mã và trùng sđt trong file', async () => {
    const file = await buildXlsx(STUDENT_HEADERS, [
      ['HV260001', 'Nguyễn Văn A', '', '', '0912345678', 'a@example.vn', '', '', ''],
      ['HV260001', 'Nguyễn Trùng', '', '', '0912345679', 'b@example.vn', '', '', ''],
      ['HV260002', 'Nguyễn Trùng Sđt', '', '', '0912345678', 'c@example.vn', '', '', ''],
    ]);

    const res = await request(app())
      .post('/api/imports?kind=student')
      .set('Cookie', adminCookie)
      .attach('file', file, 'trung.xlsx');

    expect(res.status).toBe(201);
    expect(res.body.data.errorRows).toBe(2);

    const preview = await request(app())
      .get(`/api/imports/${res.body.data.batchId}`)
      .set('Cookie', adminCookie);
    const items = preview.body.data.items;
    expect(items[1].errorMessage).toContain('Trùng mã trong file');
    expect(items[2].errorMessage).toContain('Trùng số điện thoại trong file');
  });

  it('mã và sđt đã tồn tại trong hệ thống', async () => {
    await createStudent('Nguyễn Văn A', 'HV260001');

    const file = await buildXlsx(STUDENT_HEADERS, [
      ['HV260001', 'Nguyễn Mã Cũ', '', '', '0999888777', 'a@example.vn', '', '', ''],
      ['HV260002', 'Nguyễn Sđt Cũ', '', '', '0912345678', 'b@example.vn', '', '', ''],
    ]);

    const res = await request(app())
      .post('/api/imports?kind=student')
      .set('Cookie', adminCookie)
      .attach('file', file, 'ton tai.xlsx');

    expect(res.status).toBe(201);
    expect(res.body.data.errorRows).toBe(2);

    const preview = await request(app())
      .get(`/api/imports/${res.body.data.batchId}`)
      .set('Cookie', adminCookie);
    const items = preview.body.data.items;
    expect(items[0].errorMessage).toContain('Mã đã tồn tại trong hệ thống');
    expect(items[1].errorMessage).toContain('Số điện thoại đã tồn tại trong hệ thống');
  });

  it('chuẩn hóa sđt (khoảng trắng, dấu +) và ngày dd/mm/yyyy', async () => {
    const file = await buildXlsx(STUDENT_HEADERS, [
      ['HV260001', 'Nguyễn Văn A', '12/06/2011', 'Nam', '+84 912 345 678', 'a@example.vn', '', '', ''],
    ]);

    const res = await request(app())
      .post('/api/imports?kind=student')
      .set('Cookie', adminCookie)
      .attach('file', file, 'chuan.xlsx');

    expect(res.status).toBe(201);
    expect(res.body.data.validRows).toBe(1);

    const preview = await request(app())
      .get(`/api/imports/${res.body.data.batchId}`)
      .set('Cookie', adminCookie);
    // rawData giữ nguyên dữ liệu thô từ file; chuẩn hóa chỉ để validate.
    expect(preview.body.data.items[0].status).toBe('VALID');
    expect(preview.body.data.items[0].rawData.phone).toBe('+84 912 345 678');
  });

  it('thiếu file -> 400', async () => {
    const res = await request(app())
      .post('/api/imports?kind=student')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NO_FILE');
  });

  it('file không phải Excel -> 400 INVALID_FILE_TYPE', async () => {
    const text = Buffer.from('day la file text', 'utf8');

    const res = await request(app())
      .post('/api/imports?kind=student')
      .set('Cookie', adminCookie)
      .attach('file', text, 'file.txt');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  it('file xlsx hỏng -> 400 INVALID_EXCEL', async () => {
    const fakeZip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]);

    const res = await request(app())
      .post('/api/imports?kind=student')
      .set('Cookie', adminCookie)
      .attach('file', fakeZip, 'hong.xlsx');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_EXCEL');
  });

  it('thiếu cột bắt buộc -> 400 MISSING_COLUMNS', async () => {
    const file = await buildXlsx(['Họ tên', 'Số điện thoại'], [['Nguyễn Văn A', '0912345678']]);

    const res = await request(app())
      .post('/api/imports?kind=student')
      .set('Cookie', adminCookie)
      .attach('file', file, 'thieu-cot.xlsx');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_COLUMNS');
    expect(res.body.error.message).toContain('Mã học viên');
  });

  it('quá 1000 dòng dữ liệu -> 400 TOO_MANY_ROWS', async () => {
    const rows: string[][] = [];
    for (let i = 1; i <= 1001; i++) {
      rows.push([`HV${String(260000 + i)}`, `Nguyễn ${i}`, '', '', `09${String(10000000 + i)}`, '', '', '', '']);
    }
    const file = await buildXlsx(STUDENT_HEADERS, rows);

    const res = await request(app())
      .post('/api/imports?kind=student')
      .set('Cookie', adminCookie)
      .attach('file', file, 'lon.xlsx');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('TOO_MANY_ROWS');
  });

  it('thiếu kind -> 400', async () => {
    const file = await buildXlsx(STUDENT_HEADERS, [
      ['HV260001', 'Nguyễn Văn A', '', '', '0912345678', 'a@example.vn', '', '', ''],
    ]);

    const res = await request(app())
      .post('/api/imports')
      .set('Cookie', adminCookie)
      .attach('file', file, 'khong-kind.xlsx');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('nhân viên không phải admin -> 403', async () => {
    await createStaffUser('NV0001', 'Nhân viên Một', 'nv01');
    const cookie = await loginAs('nv01');
    const file = await buildXlsx(STUDENT_HEADERS, [
      ['HV260001', 'Nguyễn Văn A', '', '', '0912345678', 'a@example.vn', '', '', ''],
    ]);

    const res = await request(app())
      .post('/api/imports?kind=student')
      .set('Cookie', cookie)
      .attach('file', file, 'nv.xlsx');

    expect(res.status).toBe(403);
  });
});

describe('GET /api/imports/:id', () => {
  it('xem trước có phân trang và lọc trạng thái', async () => {
    const file = await buildXlsx(STUDENT_HEADERS, [
      ['HV260001', 'Nguyễn Văn A', '', '', '0912345678', 'a@example.vn', '', '', ''],
      ['HV260002', '', '', '', '0912345679', 'b@example.vn', '', '', ''],
      ['HV260003', 'Nguyễn C', '', '', '0912345681', 'c@example.vn', '', '', ''],
    ]);
    const created = await request(app())
      .post('/api/imports?kind=student')
      .set('Cookie', adminCookie)
      .attach('file', file, 'preview.xlsx');
    const batchId = created.body.data.batchId;

    const all = await request(app())
      .get(`/api/imports/${batchId}`)
      .set('Cookie', adminCookie);
    expect(all.status).toBe(200);
    expect(all.body.data.totalRows).toBe(3);
    expect(all.body.data.validRows).toBe(2);
    expect(all.body.data.errorRows).toBe(1);
    expect(all.body.data.total).toBe(3);

    const errors = await request(app())
      .get(`/api/imports/${batchId}?status=ERROR`)
      .set('Cookie', adminCookie);
    expect(errors.body.data.total).toBe(1);
    expect(errors.body.data.items[0].status).toBe('ERROR');

    const valid = await request(app())
      .get(`/api/imports/${batchId}?status=VALID`)
      .set('Cookie', adminCookie);
    expect(valid.body.data.total).toBe(2);
    expect(valid.body.data.items.every((i: { status: string }) => i.status === 'VALID')).toBe(true);
  });

  it('lô không tồn tại -> 404', async () => {
    const res = await request(app())
      .get('/api/imports/999999')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('POST /api/imports/:id/confirm', () => {
  async function uploadValidBatch(): Promise<number> {
    const file = await buildXlsx(STUDENT_HEADERS, [
      ['HV260001', 'Nguyễn Văn A', '05/01/2010', 'Nam', '0912345678', 'van.a@example.vn', 'Hà Nội', 'THCS A', 'Cơ bản'],
      ['HV260002', 'Trần Thị B', '', 'Nữ', '0912345679', 'thi.b@example.vn', '', '', ''],
    ]);
    const res = await request(app())
      .post('/api/imports?kind=student')
      .set('Cookie', adminCookie)
      .attach('file', file, 'confirm.xlsx');
    return res.body.data.batchId;
  }

  it('tạo user + hồ sơ + vai trò, ghi audit, trả token credentials', async () => {
    const batchId = await uploadValidBatch();

    const res = await request(app())
      .post(`/api/imports/${batchId}/confirm`)
      .set('Cookie', adminCookie)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.created).toBe(2);
    expect(res.body.data.skipped).toBe(0);
    expect(res.body.data.credentialsToken).toBeTruthy();
    expect(res.body.data.credentialsExpiresAt).toBeTruthy();

    // User được tạo, bắt đổi mật khẩu lần đầu
    const user = await prisma.user.findFirst({ where: { username: 'nguyen.van.a' } });
    expect(user).not.toBeNull();
    expect(user!.mustChangePassword).toBe(true);
    expect(user!.status).toBe('ACTIVE');
    expect(user!.passwordHash).not.toContain('password');

    // Hồ sơ học viên gắn với user
    const student = await prisma.student.findFirst({ where: { studentCode: 'HV260001' } });
    expect(student).not.toBeNull();
    expect(student!.userId).toBe(user!.id);
    expect(student!.fullName).toBe('Nguyễn Văn A');
    expect(student!.birthDate).toEqual(new Date(Date.UTC(2010, 0, 5)));

    // Vai trò student được gán
    const role = await prisma.role.findUniqueOrThrow({ where: { code: 'student' } });
    const userRole = await prisma.userRole.findFirst({
      where: { userId: user!.id, roleId: role.id },
    });
    expect(userRole).not.toBeNull();

    // Dòng nhập chuyển CREATED kèm recordId
    const rows = await prisma.importRow.findMany({ where: { batchId }, orderBy: { rowNumber: 'asc' } });
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.status === 'CREATED')).toBe(true);
    expect(rows[0].recordId).toBe(student!.id);

    // Lô nhập COMPLETED
    const batch = await prisma.importBatch.findUniqueOrThrow({ where: { id: batchId } });
    expect(batch.status).toBe('COMPLETED');

    // Audit
    const log = await prisma.auditLog.findFirst({
      where: { action: 'import', tableName: 'students' },
    });
    expect(log).not.toBeNull();
    expect(log?.newData).toEqual({ created: 2, skipped: 0 });
  });

  it('tên đăng nhập trùng nhau được suffix tự động', async () => {
    const file = await buildXlsx(STUDENT_HEADERS, [
      ['HV260001', 'Nguyễn Văn A', '', '', '0912345678', 'a@example.vn', '', '', ''],
      ['HV260002', 'Nguyễn Văn A', '', '', '0912345679', 'b@example.vn', '', '', ''],
    ]);
    const created = await request(app())
      .post('/api/imports?kind=student')
      .set('Cookie', adminCookie)
      .attach('file', file, 'trung-ten.xlsx');
    const batchId = created.body.data.batchId;

    const res = await request(app())
      .post(`/api/imports/${batchId}/confirm`)
      .set('Cookie', adminCookie)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.created).toBe(2);

    const users = await prisma.user.findMany({
      where: { username: { startsWith: 'nguyen.van.a' } },
      select: { username: true },
    });
    expect(users.map((u) => u.username).sort()).toEqual(['nguyen.van.a', 'nguyen.van.a2']);
  });

  it('còn dòng lỗi -> 409 HAS_ERROR_ROWS; skipErrors=true bỏ qua dòng lỗi', async () => {
    const file = await buildXlsx(STUDENT_HEADERS, [
      ['HV260001', 'Nguyễn Văn A', '', '', '0912345678', 'a@example.vn', '', '', ''],
      ['HV260002', '', '', '', '0912345679', 'b@example.vn', '', '', ''],
    ]);
    const created = await request(app())
      .post('/api/imports?kind=student')
      .set('Cookie', adminCookie)
      .attach('file', file, 'co-loi.xlsx');
    const batchId = created.body.data.batchId;

    const blocked = await request(app())
      .post(`/api/imports/${batchId}/confirm`)
      .set('Cookie', adminCookie)
      .send({});
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('HAS_ERROR_ROWS');

    const res = await request(app())
      .post(`/api/imports/${batchId}/confirm`)
      .set('Cookie', adminCookie)
      .send({ skipErrors: true });
    expect(res.status).toBe(200);
    expect(res.body.data.created).toBe(1);
    expect(res.body.data.skipped).toBe(1);

    const student = await prisma.student.findFirst({ where: { studentCode: 'HV260001' } });
    expect(student).not.toBeNull();
    const skipped = await prisma.student.findFirst({ where: { studentCode: 'HV260002' } });
    expect(skipped).toBeNull();
  });

  it('xác nhận 2 lần -> 409 ALREADY_CONFIRMED', async () => {
    const batchId = await uploadValidBatch();

    const first = await request(app())
      .post(`/api/imports/${batchId}/confirm`)
      .set('Cookie', adminCookie)
      .send({});
    expect(first.status).toBe(200);

    const second = await request(app())
      .post(`/api/imports/${batchId}/confirm`)
      .set('Cookie', adminCookie)
      .send({});
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('ALREADY_CONFIRMED');
  });

  it('lô không tồn tại -> 404', async () => {
    const res = await request(app())
      .post('/api/imports/999999/confirm')
      .set('Cookie', adminCookie)
      .send({});

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('nhân viên không phải admin -> 403', async () => {
    await createStaffUser('NV0001', 'Nhân viên Một', 'nv01');
    const cookie = await loginAs('nv01');

    const res = await request(app())
      .post('/api/imports/1/confirm')
      .set('Cookie', cookie)
      .send({});

    expect(res.status).toBe(403);
  });
});

describe('POST /api/imports/:id/credentials', () => {
  it('tải tài khoản + mật khẩu tạm một lần (lần 2 bị từ chối)', async () => {
    const file = await buildXlsx(STUDENT_HEADERS, [
      ['HV260001', 'Nguyễn Văn A', '', '', '0912345678', 'van.a@example.vn', '', '', ''],
    ]);
    const created = await request(app())
      .post('/api/imports?kind=student')
      .set('Cookie', adminCookie)
      .attach('file', file, 'cred.xlsx');
    const batchId = created.body.data.batchId;

    const confirmed = await request(app())
      .post(`/api/imports/${batchId}/confirm`)
      .set('Cookie', adminCookie)
      .send({});
    const token = confirmed.body.data.credentialsToken;

    const res = await request(app())
      .post(`/api/imports/${batchId}/credentials`)
      .set('Cookie', adminCookie)
      .send({ token })
      .buffer(true)
      .parse(collectBuffer);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
    expect(res.body[0]).toBe(0x50);

    const rows = await readXlsx(res.body);
    expect(rows[0]).toEqual(['Tên đăng nhập', 'Họ tên', 'Mật khẩu tạm']);
    expect(rows[1][0]).toBe('nguyen.van.a');
    expect(rows[1][1]).toBe('Nguyễn Văn A');
    expect(rows[1][2].length).toBeGreaterThanOrEqual(12);

    // Token chỉ dùng một lần
    const again = await request(app())
      .post(`/api/imports/${batchId}/credentials`)
      .set('Cookie', adminCookie)
      .send({ token });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('TOKEN_USED');
  });

  it('token sai -> 404', async () => {
    const res = await request(app())
      .post('/api/imports/1/credentials')
      .set('Cookie', adminCookie)
      .send({ token: 'sai-token' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('thiếu token -> 400', async () => {
    const res = await request(app())
      .post('/api/imports/1/credentials')
      .set('Cookie', adminCookie)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
