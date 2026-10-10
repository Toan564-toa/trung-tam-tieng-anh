import { rm } from 'node:fs/promises';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma';
import { env } from '../src/config/env';
import { closeDatabase, resetDatabase } from './helpers/db';
import {
  app,
  createClass,
  createStudentUser,
  createTeacherUser,
  createUser,
  enrollStudent,
  loginAs,
  seedRoles,
} from './helpers/fixtures';

// Ảnh PNG tối thiểu: chỉ cần magic bytes để service nhận dạng nội dung.
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const TEXT = Buffer.from('day la file text thu', 'utf8');

let adminCookie: string;

beforeEach(async () => {
  await resetDatabase();
  await seedRoles();
  await createUser('admin', 'admin01');
  adminCookie = await loginAs('admin01');
});

afterAll(async () => {
  // Dọn tệp test ghi ra đĩa (storage/ đã có trong .gitignore).
  await rm(env.FILE_STORAGE_DIR, { recursive: true, force: true });
  await closeDatabase();
});

describe('POST /api/files/upload', () => {
  it('admin upload tệp chung (không gắn đối tượng) thành công', async () => {
    const res = await request(app())
      .post('/api/files/upload')
      .set('Cookie', adminCookie)
      .attach('file', PNG, 'avatar.png');

    expect(res.status).toBe(201);
    expect(res.body.data.mimeType).toBe('image/png');
    expect(res.body.data.url).toBe(`/api/files/${res.body.data.id}`);
    expect(res.body.data.originalName).toBe('avatar.png');
    expect(res.body.data.size).toBe(PNG.length);
    expect(res.body.data.checksum).toBeTruthy();
  });

  it('học viên upload ảnh của chính mình', async () => {
    const { student } = await createStudentUser('HV260001', 'Nguyễn Văn A', 'stu01');
    const cookie = await loginAs('stu01');

    const res = await request(app())
      .post('/api/files/upload')
      .set('Cookie', cookie)
      .field('ownerType', 'student')
      .field('ownerId', String(student.id))
      .attach('file', PNG, 'hoc-vien.png');

    expect(res.status).toBe(201);
    expect(res.body.data.ownerType).toBe('student');
    expect(res.body.data.ownerId).toBe(student.id);
  });

  it('giáo viên upload ảnh hồ sơ của chính mình', async () => {
    const { teacher } = await createTeacherUser('GV0001', 'Giáo viên Một', 'gv01');
    const cookie = await loginAs('gv01');

    const res = await request(app())
      .post('/api/files/upload')
      .set('Cookie', cookie)
      .field('ownerType', 'teacher')
      .field('ownerId', String(teacher.id))
      .attach('file', JPEG, 'gia-vien.jpg');

    expect(res.status).toBe(201);
    expect(res.body.data.mimeType).toBe('image/jpeg');
    expect(res.body.data.ownerId).toBe(teacher.id);
  });

  // IDOR: không tin ownerId từ client — học viên không upload được ảnh của người khác.
  it('học viên upload ảnh cho học viên khác bị từ chối 403', async () => {
    const a = await createStudentUser('HV260001', 'Nguyễn Văn A', 'stu01');
    const b = await createStudentUser('HV260002', 'Trần Thị B', 'stu02');
    const cookieA = await loginAs('stu01');

    const res = await request(app())
      .post('/api/files/upload')
      .set('Cookie', cookieA)
      .field('ownerType', 'student')
      .field('ownerId', String(b.student.id))
      .attach('file', PNG, 'hack.png');

    expect(res.status).toBe(403);
    void a;
  });

  it('giáo viên upload ảnh cho giáo viên khác bị từ chối 403', async () => {
    const a = await createTeacherUser('GV0001', 'Giáo viên Một', 'gv01');
    const b = await createTeacherUser('GV0002', 'Giáo viên Hai', 'gv02');
    const cookieA = await loginAs('gv01');

    const res = await request(app())
      .post('/api/files/upload')
      .set('Cookie', cookieA)
      .field('ownerType', 'teacher')
      .field('ownerId', String(b.teacher.id))
      .attach('file', PNG, 'hack.png');

    expect(res.status).toBe(403);
    void a;
  });

  it('nhân viên không upload được ảnh giáo viên (chỉ admin)', async () => {
    await createUser('staff', 'nv01');
    const teacher = await createTeacherUser('GV0001', 'Giáo viên Một', 'gv01');
    const cookie = await loginAs('nv01');

    const res = await request(app())
      .post('/api/files/upload')
      .set('Cookie', cookie)
      .field('ownerType', 'teacher')
      .field('ownerId', String(teacher.teacher.id))
      .attach('file', PNG, 'nv-upload.png');

    expect(res.status).toBe(403);
  });

  it('nội dung không khớp loại khai báo thì trả 400 FILE_TYPE_MISMATCH', async () => {
    // Nội dung PNG nhưng khai báo (và đuôi tên) là JPEG.
    const res = await request(app())
      .post('/api/files/upload')
      .set('Cookie', adminCookie)
      .attach('file', PNG, 'avatar.jpg');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_TYPE_MISMATCH');
  });

  it('loại tệp không được phép (text) thì trả 400', async () => {
    const res = await request(app())
      .post('/api/files/upload')
      .set('Cookie', adminCookie)
      .attach('file', TEXT, 'notes.txt');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_TYPE_NOT_ALLOWED');
  });

  it('đổi đuôi .png cho file text vẫn bị chặn (kiểm tra theo nội dung)', async () => {
    const res = await request(app())
      .post('/api/files/upload')
      .set('Cookie', adminCookie)
      .attach('file', TEXT, 'fake.png');

    expect(res.status).toBe(400);
  });

  it('tệp vượt quá dung lượng cho phép thì trả 413', async () => {
    const big = Buffer.alloc(env.FILE_MAX_SIZE_MB * 1024 * 1024 + 1);

    const res = await request(app())
      .post('/api/files/upload')
      .set('Cookie', adminCookie)
      .attach('file', big, 'big.png');

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('không có tệp thì trả 400 FILE_MISSING', async () => {
    const res = await request(app()).post('/api/files/upload').set('Cookie', adminCookie).send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_MISSING');
  });

  it('chưa đăng nhập thì trả 401', async () => {
    const res = await request(app()).post('/api/files/upload').attach('file', PNG, 'a.png');

    expect(res.status).toBe(401);
  });

  it('ownerType không hợp lệ thì trả 400', async () => {
    const res = await request(app())
      .post('/api/files/upload')
      .set('Cookie', adminCookie)
      .field('ownerType', 'class')
      .field('ownerId', '1')
      .attach('file', PNG, 'a.png');

    expect(res.status).toBe(400);
  });

  it('ghi nhật ký upload', async () => {
    const res = await request(app())
      .post('/api/files/upload')
      .set('Cookie', adminCookie)
      .attach('file', PNG, 'avatar.png');

    const log = await prisma.auditLog.findFirst({
      where: { action: 'upload', tableName: 'files', recordId: String(res.body.data.id) },
    });
    expect(log).not.toBeNull();
  });
});

describe('GET /api/files/:id (tệp nội bộ, cần đăng nhập)', () => {
  it('trả đúng nội dung và Content-Type đã upload', async () => {
    const res = await request(app())
      .post('/api/files/upload')
      .set('Cookie', adminCookie)
      .attach('file', PNG, 'avatar.png');

    const get = await request(app()).get(`/api/files/${res.body.data.id}`).set('Cookie', adminCookie);

    expect(get.status).toBe(200);
    expect(get.headers['content-type']).toBe('image/png');
    expect(get.headers['cache-control']).toBe('no-store');
    // So sánh nội dung theo hex để tránh lỗi so sánh Buffer của vitest.
    expect(get.body.toString('hex')).toBe(PNG.toString('hex'));
  });

  it('học viên xem được ảnh của mình, xem ảnh người khác bị 403', async () => {
    const a = await createStudentUser('HV260001', 'Nguyễn Văn A', 'stu01');
    await createStudentUser('HV260002', 'Trần Thị B', 'stu02');

    const upload = await request(app())
      .post('/api/files/upload')
      .set('Cookie', await loginAs('stu01'))
      .field('ownerType', 'student')
      .field('ownerId', String(a.student.id))
      .attach('file', PNG, 'a.png');
    const fileId = upload.body.data.id;

    const own = await request(app()).get(`/api/files/${fileId}`).set('Cookie', await loginAs('stu01'));
    expect(own.status).toBe(200);

    const other = await request(app()).get(`/api/files/${fileId}`).set('Cookie', await loginAs('stu02'));
    expect(other.status).toBe(403);
  });

  it('giáo viên dạy lớp có học viên đó thì xem được ảnh học viên', async () => {
    const { teacher } = await createTeacherUser('GV0001', 'Giáo viên Một', 'gv01');
    const { student } = await createStudentUser('HV260001', 'Nguyễn Văn A', 'stu01');
    const classRow = await createClass(teacher.id, 'LOP0001');
    await enrollStudent(student.id, classRow.id);

    const upload = await request(app())
      .post('/api/files/upload')
      .set('Cookie', adminCookie)
      .field('ownerType', 'student')
      .field('ownerId', String(student.id))
      .attach('file', PNG, 'hv.png');

    const res = await request(app())
      .get(`/api/files/${upload.body.data.id}`)
      .set('Cookie', await loginAs('gv01'));

    expect(res.status).toBe(200);
  });

  it('giáo viên không dạy học viên đó thì bị 403', async () => {
    // gv01 là giáo viên gọi request nhưng không dạy lớp của học viên.
    await createTeacherUser('GV0001', 'Giáo viên Một', 'gv01');
    const otherTeacher = await createTeacherUser('GV0002', 'Giáo viên Hai', 'gv02');
    const { student } = await createStudentUser('HV260001', 'Nguyễn Văn A', 'stu01');
    const classRow = await createClass(otherTeacher.teacher.id, 'LOP0002');
    await enrollStudent(student.id, classRow.id);

    const upload = await request(app())
      .post('/api/files/upload')
      .set('Cookie', adminCookie)
      .field('ownerType', 'student')
      .field('ownerId', String(student.id))
      .attach('file', PNG, 'hv.png');

    const res = await request(app())
      .get(`/api/files/${upload.body.data.id}`)
      .set('Cookie', await loginAs('gv01'));

    expect(res.status).toBe(403);
  });

  it('tệp không tồn tại thì trả 404', async () => {
    const res = await request(app()).get('/api/files/999999').set('Cookie', adminCookie);

    expect(res.status).toBe(404);
  });
});

describe('GET /api/public/files/:id (công khai, chỉ ảnh giáo viên bật showOnWebsite)', () => {
  it('ảnh giáo viên bật hiển thị website xem được không cần đăng nhập', async () => {
    const { teacher } = await createTeacherUser('GV0001', 'Giáo viên Một', 'gv01');

    const upload = await request(app())
      .post('/api/files/upload')
      .set('Cookie', adminCookie)
      .field('ownerType', 'teacher')
      .field('ownerId', String(teacher.id))
      .attach('file', PNG, 'gv.png');

    // Giáo viên chỉ hiển thị ảnh trên website khi ảnh đã được gắn làm ảnh hồ sơ.
    await prisma.teacher.update({
      where: { id: teacher.id },
      data: { photoFileId: upload.body.data.id, showOnWebsite: true },
    });

    const res = await request(app()).get(`/api/public/files/${upload.body.data.id}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.headers['cache-control']).toBe('public, max-age=3600');
  });

  it('ảnh giáo viên không bật showOnWebsite thì trả 404', async () => {
    const { teacher } = await createTeacherUser('GV0001', 'Giáo viên Một', 'gv01');

    const upload = await request(app())
      .post('/api/files/upload')
      .set('Cookie', adminCookie)
      .field('ownerType', 'teacher')
      .field('ownerId', String(teacher.id))
      .attach('file', PNG, 'gv.png');

    const res = await request(app()).get(`/api/public/files/${upload.body.data.id}`);

    expect(res.status).toBe(404);
  });

  it('ảnh học viên không bao giờ công khai (trả 404 để không lộ sự tồn tại)', async () => {
    const { student } = await createStudentUser('HV260001', 'Nguyễn Văn A', 'stu01');

    const upload = await request(app())
      .post('/api/files/upload')
      .set('Cookie', adminCookie)
      .field('ownerType', 'student')
      .field('ownerId', String(student.id))
      .attach('file', PNG, 'hv.png');

    const res = await request(app()).get(`/api/public/files/${upload.body.data.id}`);

    expect(res.status).toBe(404);
  });

  it('tệp không tồn tại thì trả 404', async () => {
    const res = await request(app()).get('/api/public/files/999999');

    expect(res.status).toBe(404);
  });
});

describe('POST /api/me/photo (ảnh đại diện tài khoản)', () => {
  it('đổi ảnh đại diện và trả URL', async () => {
    await createStudentUser('HV260001', 'Nguyễn Văn A', 'stu01');
    const login = await loginAs('stu01');

    const res = await request(app()).post('/api/me/photo').set('Cookie', login).attach('file', PNG, 'me.png');

    expect(res.status).toBe(200);
    expect(res.body.data.avatarUrl).toMatch(/^\/api\/files\/\d+$/);

    const profile = await request(app()).get('/api/me/profile').set('Cookie', login);
    expect(profile.body.data.profile.avatarUrl).toBe(res.body.data.avatarUrl);
  });

  it('không có tệp thì trả 400', async () => {
    await createStudentUser('HV260001', 'Nguyễn Văn A', 'stu01');
    const login = await loginAs('stu01');

    const res = await request(app()).post('/api/me/photo').set('Cookie', login).send({});

    expect(res.status).toBe(400);
  });
});
