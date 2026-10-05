import argon2 from 'argon2';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { writeAudit } from '../../utils/audit';
import { HttpError } from '../../utils/httpError';
import { signAccessToken, signRefreshToken } from '../../utils/tokens';

interface RequestMeta {
  ip?: string | null;
  userAgent?: string | null;
}

async function recordLogin(username: string, userId: number | null, success: boolean, meta: RequestMeta) {
  await prisma.loginHistory.create({
    data: { username, userId, success, ip: meta.ip ?? null, userAgent: meta.userAgent ?? null },
  });
}

export async function login(username: string, password: string, meta: RequestMeta) {
  const user = await prisma.user.findUnique({
    where: { username },
    include: { roles: { include: { role: true } } },
  });

  // Cùng một thông báo cho "không có tài khoản" và "sai mật khẩu" để không lộ tài khoản nào tồn tại
  if (!user || user.deletedAt) {
    await recordLogin(username, null, false, meta);
    throw HttpError.unauthorized('Sai tên đăng nhập hoặc mật khẩu');
  }

  if (user.status !== 'ACTIVE') {
    await recordLogin(username, user.id, false, meta);
    throw HttpError.forbidden('Tài khoản đang bị khóa hoặc vô hiệu hóa, vui lòng liên hệ quản trị');
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await recordLogin(username, user.id, false, meta);
    throw HttpError.locked('Tài khoản tạm khóa do nhập sai nhiều lần, vui lòng thử lại sau');
  }

  const ok = await argon2.verify(user.passwordHash, password);

  if (!ok) {
    const failed = user.failedLoginCount + 1;
    const shouldLock = failed >= env.MAX_FAILED_LOGINS;
    await prisma.user.update({
      where: { id: user.id },
      data: shouldLock
        ? { failedLoginCount: 0, lockedUntil: new Date(Date.now() + env.LOCK_MINUTES * 60 * 1000) }
        : { failedLoginCount: failed },
    });
    await recordLogin(username, user.id, false, meta);
    throw HttpError.unauthorized('Sai tên đăng nhập hoặc mật khẩu');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  await recordLogin(username, user.id, true, meta);

  const roles = user.roles.map((r) => r.role.code);
  return {
    user: { id: user.id, username: user.username, roles, mustChangePassword: user.mustChangePassword },
    accessToken: signAccessToken(user.id, roles),
    refreshToken: signRefreshToken(user.id),
  };
}

// Cấp lại access token từ refresh token (đã được controller xác minh chữ ký)
export async function refreshSession(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });
  if (!user || user.deletedAt || user.status !== 'ACTIVE') throw HttpError.unauthorized();

  const roles = user.roles.map((r) => r.role.code);
  return { accessToken: signAccessToken(user.id, roles), refreshToken: signRefreshToken(user.id) };
}

export async function getProfile(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      phone: true,
      mustChangePassword: true,
      lastLoginAt: true,
      roles: { select: { role: { select: { code: true, name: true } } } },
      teacher: { select: { id: true, teacherCode: true, fullName: true } },
      staff: { select: { id: true, staffCode: true, fullName: true, position: true } },
      student: { select: { id: true, studentCode: true, fullName: true } },
    },
  });
  if (!user) throw HttpError.notFound('Không tìm thấy tài khoản');

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    mustChangePassword: user.mustChangePassword,
    lastLoginAt: user.lastLoginAt,
    roles: user.roles.map((r) => r.role.code),
    teacher: user.teacher,
    staff: user.staff,
    student: user.student,
  };
}

export async function changePassword(userId: number, currentPassword: string, newPassword: string, ip?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw HttpError.notFound('Không tìm thấy tài khoản');

  const ok = await argon2.verify(user.passwordHash, currentPassword);
  if (!ok) throw HttpError.badRequest('Mật khẩu hiện tại không đúng');

  const passwordHash = await argon2.hash(newPassword);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { passwordHash, mustChangePassword: false } });
    // Không ghi mật khẩu vào nhật ký
    await writeAudit({ userId, action: 'change_password', tableName: 'users', recordId: userId, ip }, tx);
  });
}
