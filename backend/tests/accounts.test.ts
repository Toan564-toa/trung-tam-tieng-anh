import { createHash } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app, cookiesOf, createUser, loginAs, PASSWORD, seedRoles } from './helpers/fixtures';
import { closeDatabase, resetDatabase } from './helpers/db';
import { prisma } from '../src/config/prisma';

beforeEach(async () => {
  await resetDatabase();
  await seedRoles();
});
afterAll(async () => {
  await closeDatabase();
});

describe('POST /api/auth/login portal', () => {
  it('từ chối tài khoản thường khi vào portal admin', async () => {
    await createUser('staff', 'staff01');
    const res = await request(app())
      .post('/api/auth/login')
      .send({ username: 'staff01', password: PASSWORD, portal: 'admin' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('chấp nhận admin trên portal admin', async () => {
    await createUser('admin', 'admin01');
    const res = await request(app())
      .post('/api/auth/login')
      .send({ username: 'admin01', password: PASSWORD, portal: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('admin');
  });

  it('từ chối tài khoản admin thuần khi vào portal client', async () => {
    await createUser('admin', 'admin01');
    const res = await request(app())
      .post('/api/auth/login')
      .send({ username: 'admin01', password: PASSWORD, portal: 'client' });
    expect(res.status).toBe(403);
  });
});

describe('refresh token lifecycle', () => {
  it('xoay token, phát hiện reuse và thu hồi cả họ token', async () => {
    await createUser('admin', 'admin01');
    const login = await request(app())
      .post('/api/auth/login')
      .send({ username: 'admin01', password: PASSWORD, portal: 'admin' });
    const oldCookie = cookiesOf(login)
      .map((cookie) => cookie.split(';')[0])
      .join('; ');
    const rotated = await request(app()).post('/api/auth/refresh').set('Cookie', oldCookie);
    expect(rotated.status).toBe(200);
    const newCookie = cookiesOf(rotated)
      .map((cookie) => cookie.split(';')[0])
      .join('; ');
    const reuse = await request(app()).post('/api/auth/refresh').set('Cookie', oldCookie);
    expect(reuse.status).toBe(401);
    const rows = await prisma.refreshToken.findMany();
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.revokedAt !== null)).toBe(true);
    expect(rows.every((row) => !newCookie.includes(row.tokenHash))).toBe(true);
  });

  it('thu hồi refresh token khi đăng xuất và đổi mật khẩu, cấp phiên mới khi đổi mật khẩu', async () => {
    await createUser('admin', 'admin01');
    const cookie = await loginAs('admin01');
    const logout = await request(app()).post('/api/auth/logout').set('Cookie', cookie);
    expect(logout.status).toBe(200);
    expect((await prisma.refreshToken.findFirstOrThrow()).revokedAt).not.toBeNull();

    const cookieAfterLogin = await loginAs('admin01');
    const changed = await request(app())
      .post('/api/auth/change-password')
      .set('Cookie', cookieAfterLogin)
      .send({ currentPassword: PASSWORD, newPassword: 'MatKhauMoi@456' });
    expect(changed.status).toBe(200);
    // Phiên cũ bị thu hồi, nhưng trình duyệt vừa đổi mật khẩu được cấp phiên mới.
    const rows = await prisma.refreshToken.findMany();
    expect(rows.filter((row) => row.revokedAt === null)).toHaveLength(1);
    const newPair = cookiesOf(changed)
      .map((cookie: string) => cookie.split(';')[0])
      .join('; ');
    expect(newPair).toMatch(/refresh_token=/);
    // Cookie cũ hết hiệu lực (tokenVersion đổi), cookie phiên mới vẫn dùng được.
    expect((await request(app()).get('/api/auth/me').set('Cookie', cookieAfterLogin)).status).toBe(401);
    expect((await request(app()).get('/api/auth/me').set('Cookie', newPair)).status).toBe(200);
  });
});

describe('password reset and must-change guard', () => {
  it('trả thông báo quên mật khẩu giống nhau và token dùng một lần', async () => {
    const user = await createUser('student', 'student01');
    await prisma.user.update({ where: { id: user.id }, data: { email: 'student01@test.vn' } });
    const exists = await request(app()).post('/api/auth/forgot-password').send({ email: 'student01@test.vn' });
    const missing = await request(app()).post('/api/auth/forgot-password').send({ email: 'missing@test.vn' });
    expect(exists.body).toEqual(missing.body);
    expect(exists.status).toBe(200);

    const token = 'a'.repeat(48);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60_000) },
    });
    const first = await request(app()).post('/api/auth/reset-password').send({ token, newPassword: 'MatKhauMoi@456' });
    const second = await request(app()).post('/api/auth/reset-password').send({ token, newPassword: 'MatKhauMoi@789' });
    expect(first.status).toBe(200);
    expect(second.status).toBe(400);
    const expiredToken = 'b'.repeat(48);
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: createHash('sha256').update(expiredToken).digest('hex'),
        expiresAt: new Date(Date.now() - 1_000),
      },
    });
    const expired = await request(app())
      .post('/api/auth/reset-password')
      .send({ token: expiredToken, newPassword: 'MatKhauMoi@789' });
    expect(expired.status).toBe(400);
  });

  it('đặt lại mật khẩu trả cookie phiên mới và /api/auth/me hoạt động ngay', async () => {
    const user = await createUser('student', 'student01');
    await prisma.user.update({ where: { id: user.id }, data: { email: 'student01@test.vn' } });
    const token = 'c'.repeat(48);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60_000) },
    });
    const res = await request(app()).post('/api/auth/reset-password').send({ token, newPassword: 'MatKhauMoi@456' });
    expect(res.status).toBe(200);
    const pair = cookiesOf(res)
      .map((c: string) => c.split(';')[0] ?? '')
      .filter(Boolean)
      .join('; ');
    expect(pair).toMatch(/access_token=/);
    const me = await request(app()).get('/api/auth/me').set('Cookie', pair);
    expect(me.status).toBe(200);
    expect(me.body.data.username).toBe('student01');
  });

  it('chặn API khác với PASSWORD_CHANGE_REQUIRED nhưng cho phép /me và đổi mật khẩu', async () => {
    const user = await createUser('admin', 'admin01');
    await prisma.user.update({ where: { id: user.id }, data: { mustChangePassword: true } });
    const cookie = await loginAs('admin01');
    const blocked = await request(app()).get('/api/leads').set('Cookie', cookie);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
    expect((await request(app()).get('/api/auth/me').set('Cookie', cookie)).status).toBe(200);
    expect(
      (
        await request(app())
          .post('/api/auth/change-password')
          .set('Cookie', cookie)
          .send({ currentPassword: PASSWORD, newPassword: 'MatKhauMoi@456' })
      ).status,
    ).toBe(200);
  });
});

describe('admin account API', () => {
  it('chặn người không phải admin', async () => {
    await createUser('staff', 'staff01');
    const cookie = await loginAs('staff01');
    const res = await request(app()).get('/api/users').set('Cookie', cookie);
    expect(res.status).toBe(403);
  });

  it('tạo tài khoản, chỉ trả mật khẩu tạm một lần và ghi audit', async () => {
    await createUser('admin', 'admin01');
    const cookie = await loginAs('admin01');
    const res = await request(app())
      .post('/api/users')
      .set('Cookie', cookie)
      .send({ username: 'new-student', fullName: 'Học viên Mới', email: 'new@test.vn', roles: ['student'] });
    expect(res.status).toBe(201);
    expect(res.body.data.temporaryPassword).toMatch(/^Tt7@/);
    expect(res.body.data).not.toHaveProperty('passwordHash');
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { action: 'create', tableName: 'users' } });
    expect(JSON.stringify(audit.newData)).not.toContain('temporaryPassword');
    expect(JSON.stringify(audit.newData)).not.toContain(res.body.data.temporaryPassword);
  });

  it('không cho admin tự khóa hoặc tự gỡ quyền admin', async () => {
    const admin = await createUser('admin', 'admin01');
    const cookie = await loginAs('admin01');
    const lock = await request(app())
      .patch(`/api/users/${admin.id}/status`)
      .set('Cookie', cookie)
      .send({ status: 'locked' });
    const removeRole = await request(app())
      .patch(`/api/users/${admin.id}`)
      .set('Cookie', cookie)
      .send({ roles: ['staff'] });
    expect(lock.status).toBe(403);
    expect(removeRole.status).toBe(403);
  });

  it('lọc tài khoản, khóa thu hồi phiên, reset mật khẩu và trả lịch sử đăng nhập', async () => {
    await createUser('admin', 'admin01');
    const target = await createUser('student', 'student01');
    await prisma.user.update({ where: { id: target.id }, data: { fullName: 'Học viên Một', email: 'one@test.vn' } });
    const staffRole = await prisma.role.findUniqueOrThrow({ where: { code: 'staff' } });
    await prisma.userRole.create({ data: { userId: target.id, roleId: staffRole.id } });
    const cookie = await loginAs('admin01');
    await loginAs('student01');

    const updated = await request(app())
      .patch(`/api/users/${target.id}`)
      .set('Cookie', cookie)
      .send({ fullName: 'Học viên Một', roles: ['student'] });
    expect(updated.status).toBe(200);
    expect(updated.body.data.roles).toEqual(['student']);

    const list = await request(app())
      .get('/api/users?role=student&status=active&query=Học%20viên&page=1&pageSize=10')
      .set('Cookie', cookie);
    expect(list.status).toBe(200);
    expect(list.body.data.items.map((row: { id: number }) => row.id)).toContain(target.id);
    const locked = await request(app())
      .patch(`/api/users/${target.id}/status`)
      .set('Cookie', cookie)
      .send({ status: 'locked' });
    expect(locked.status).toBe(200);
    expect(await prisma.refreshToken.count({ where: { userId: target.id, revokedAt: null } })).toBe(0);
    const unlocked = await request(app())
      .patch(`/api/users/${target.id}/status`)
      .set('Cookie', cookie)
      .send({ status: 'active' });
    expect(unlocked.status).toBe(200);
    const reset = await request(app()).post(`/api/users/${target.id}/reset-password`).set('Cookie', cookie);
    expect(reset.status).toBe(200);
    expect(reset.body.data.temporaryPassword).toMatch(/\d/);
    expect(await prisma.user.findUniqueOrThrow({ where: { id: target.id } })).toMatchObject({
      mustChangePassword: true,
    });
    const history = await request(app()).get(`/api/users/${target.id}/login-history`).set('Cookie', cookie);
    expect(history.status).toBe(200);
    expect(history.body.data.total).toBeGreaterThan(0);
    const deleted = await request(app()).delete(`/api/users/${target.id}`).set('Cookie', cookie);
    expect(deleted.status).toBe(204);
    const restored = await request(app()).patch(`/api/users/${target.id}/restore`).set('Cookie', cookie);
    expect(restored.status).toBe(200);
    expect(restored.body.data.deletedAt).toBeNull();
  }, 90_000);
});
