import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app, cookiesOf, createTeacherUser, createUser, loginAs, PASSWORD, seedRoles } from './helpers/fixtures';
import { closeDatabase, resetDatabase } from './helpers/db';
import { prisma } from '../src/config/prisma';
import { env } from '../src/config/env';

beforeEach(async () => {
  await resetDatabase();
  await seedRoles();
});

afterAll(async () => {
  await closeDatabase();
});

describe('POST /api/auth/login', () => {
  it('đăng nhập đúng trả 200, đặt cookie httpOnly và vai trò', async () => {
    await createUser('admin', 'admin01');

    const res = await request(app())
      .post('/api/auth/login')
      .send({ username: 'admin01', password: PASSWORD, portal: 'admin' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe('admin01');
    expect(res.body.data.user.roles).toContain('admin');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    expect(res.body.data.user).not.toHaveProperty('accessToken');

    const cookies = cookiesOf(res);
    const access = cookies.find((c: string) => c.startsWith('access_token='));
    expect(access).toBeDefined();
    expect(access).toMatch(/HttpOnly/i);
    expect(access).toMatch(/SameSite=Lax/i);
  });

  it('sai mật khẩu trả 401', async () => {
    await createUser('admin', 'admin01');

    const res = await request(app()).post('/api/auth/login').send({ username: 'admin01', password: 'SaiMatKhau' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('tài khoản không tồn tại trả 401 với cùng thông báo (không lộ tài khoản nào tồn tại)', async () => {
    const res = await request(app()).post('/api/auth/login').send({ username: 'khongco', password: PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Sai tên đăng nhập hoặc mật khẩu');
  });

  it('đăng nhập bằng email (form UI ghi "Tên đăng nhập hoặc email")', async () => {
    const user = await createUser('student', 'student01');
    await prisma.user.update({ where: { id: user.id }, data: { email: 'student01@test.vn' } });

    const res = await request(app())
      .post('/api/auth/login')
      .send({ username: 'student01@test.vn', password: PASSWORD, portal: 'client' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe('student01');
    expect(res.body.data.user.roles).toContain('student');
  });

  it('thiếu trường bắt buộc trả 400 VALIDATION_ERROR', async () => {
    const res = await request(app()).post('/api/auth/login').send({ username: 'admin01' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('sai 5 lần thì khoá tạm: lần sau dùng đúng mật khẩu vẫn trả 423', async () => {
    await createUser('admin', 'admin01');

    for (let i = 1; i <= env.MAX_FAILED_LOGINS; i++) {
      const wrong = await request(app()).post('/api/auth/login').send({ username: 'admin01', password: 'SaiMatKhau' });
      expect(wrong.status).toBe(i === env.MAX_FAILED_LOGINS ? 423 : 401);
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { username: 'admin01' } });
    expect(user.lockedUntil).not.toBeNull();

    const correct = await request(app()).post('/api/auth/login').send({ username: 'admin01', password: PASSWORD });
    expect(correct.status).toBe(423);
    expect(correct.body.error.code).toBe('LOCKED');
  });

  it('tài khoản bị khoá trong DB không đăng nhập được', async () => {
    const user = await createUser('admin', 'admin01');
    await prisma.user.update({ where: { id: user.id }, data: { status: 'LOCKED' } });

    const res = await request(app()).post('/api/auth/login').send({ username: 'admin01', password: PASSWORD });

    expect(res.status).toBe(423);
    expect(res.body.error.code).toBe('LOCKED');
  });

  it('ghi lịch sử đăng nhập thành công và thất bại', async () => {
    await createUser('admin', 'admin01');

    await request(app()).post('/api/auth/login').send({ username: 'admin01', password: 'SaiMatKhau' });
    await request(app()).post('/api/auth/login').send({ username: 'admin01', password: PASSWORD, portal: 'admin' });

    const history = await prisma.loginHistory.findMany({ orderBy: { id: 'asc' } });
    expect(history).toHaveLength(2);
    expect(history[0]?.success).toBe(false);
    expect(history[1]?.success).toBe(true);
  });
});

describe('GET /api/auth/me', () => {
  it('trả 401 khi chưa đăng nhập', async () => {
    const res = await request(app()).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('trả 401 khi token sai chữ ký', async () => {
    const res = await request(app()).get('/api/auth/me').set('Cookie', 'access_token=khong.phai.token');

    expect(res.status).toBe(401);
  });

  it('trả thông tin tài khoản khi có cookie hợp lệ', async () => {
    // createTeacherUser tạo cả hồ sơ giáo viên, /me phải trả kèm hồ sơ theo vai trò.
    await createTeacherUser('GV0001', 'Giáo viên A', 'gv01');
    const cookie = await loginAs('gv01');

    const res = await request(app()).get('/api/auth/me').set('Cookie', cookie);

    expect(res.status).toBe(200);
    const me = await request(app()).get('/api/auth/me').set('Cookie', cookie);
    expect(me.body.data.username).toBe('gv01');
    expect(me.body.data.roles).toEqual(['teacher']);
    expect(me.body.data.teacher).not.toBeNull();
    expect(me.body.data).toMatchObject({ id: expect.any(String), name: 'Giáo viên A', role: 'teacher' });
    expect(me.body.data).not.toHaveProperty('passwordHash');
    expect(me.body.data).not.toHaveProperty('accessToken');
  });

  it('tài khoản bị khoá sau khi đã có cookie thì /me cũng bị chặn ngay', async () => {
    await createUser('admin', 'admin01');
    const cookie = await loginAs('admin01');

    const before = await request(app()).get('/api/auth/me').set('Cookie', cookie);
    expect(before.status).toBe(200);

    await prisma.user.update({ where: { username: 'admin01' }, data: { status: 'DISABLED' } });

    const after = await request(app()).get('/api/auth/me').set('Cookie', cookie);
    expect(after.status).toBe(401);
  });
});

describe('POST /api/auth/change-password', () => {
  it('yêu cầu đăng nhập', async () => {
    const res = await request(app())
      .post('/api/auth/change-password')
      .send({ currentPassword: PASSWORD, newPassword: 'MatKhauMoi@456' });

    expect(res.status).toBe(401);
  });

  it('sai mật khẩu hiện tại trả 400 và không đổi mật khẩu', async () => {
    await createUser('admin', 'admin01');
    const cookie = await loginAs('admin01');

    const res = await request(app())
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({ currentPassword: 'SaiMatKhau', newPassword: 'MatKhauMoi@456' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('mật khẩu mới quá ngắn trả 400', async () => {
    await createUser('admin', 'admin01');
    const cookie = await loginAs('admin01');

    const res = await request(app())
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({ currentPassword: PASSWORD, newPassword: 'Ngan' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('đổi mật khẩu thành công thì đăng nhập được bằng mật khẩu mới', async () => {
    await createUser('admin', 'admin01');
    const cookie = await loginAs('admin01');

    const res = await request(app())
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({ currentPassword: PASSWORD, newPassword: 'MatKhauMoi@456' });

    expect(res.status).toBe(200);

    const login = await request(app())
      .post('/api/auth/login')
      .send({ username: 'admin01', password: 'MatKhauMoi@456', portal: 'admin' });
    expect(login.status).toBe(200);
  });

  it('ghi audit khi đổi mật khẩu, không ghi mật khẩu vào log', async () => {
    await createUser('admin', 'admin01');
    const cookie = await loginAs('admin01');

    await request(app())
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({ currentPassword: PASSWORD, newPassword: 'MatKhauMoi@456' });

    const log = await prisma.auditLog.findFirst({ where: { action: 'change_password' } });
    expect(log).not.toBeNull();
    expect(JSON.stringify(log?.newData ?? null)).not.toContain('MatKhauMoi');
  });

  it('đổi mật khẩu thành công trả cookie phiên mới và /api/auth/me vẫn hoạt động', async () => {
    await createUser('admin', 'admin01');
    const cookie = await loginAs('admin01');

    const res = await request(app())
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({ currentPassword: PASSWORD, newPassword: 'MatKhauMoi@456' });

    expect(res.status).toBe(200);
    const pair = cookiesOf(res)
      .map((c: string) => c.split(';')[0] ?? '')
      .filter(Boolean)
      .join('; ');
    expect(pair).toMatch(/access_token=/);
    expect(pair).toMatch(/refresh_token=/);

    // Cookie phiên mới dùng được ngay — người dùng không bị đẩy ra khỏi hệ thống.
    const me = await request(app()).get('/api/auth/me').set('Cookie', pair);
    expect(me.status).toBe(200);
    expect(me.body.data.username).toBe('admin01');
  });
});

describe('POST /api/auth/logout', () => {
  it('xoá cookie', async () => {
    const res = await request(app()).post('/api/auth/logout');

    expect(res.status).toBe(200);
    const cookies = cookiesOf(res);
    expect(cookies.some((c: string) => /access_token=;/.test(c))).toBe(true);
  });
});
