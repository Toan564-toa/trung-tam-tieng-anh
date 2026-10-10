import argon2 from 'argon2';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { logger } from '../../config/logger';
import { writeAudit } from '../../utils/audit';
import { HttpError } from '../../utils/httpError';
import { hashRefreshToken, signAccessToken, signRefreshToken, verifyRefreshTokenHash } from '../../utils/tokens';
import { sendPasswordResetEmail } from '../../utils/mail';

interface RequestMeta {
  ip?: string | null;
  userAgent?: string | null;
}
type Portal = 'client' | 'admin';

async function recordLogin(username: string, userId: number | null, success: boolean, meta: RequestMeta) {
  await prisma.loginHistory.create({
    data: { username, userId, success, ip: meta.ip ?? null, userAgent: meta.userAgent ?? null },
  });
}

function refreshExpiry() {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_SECONDS * 1000);
}

async function createRefreshSession(
  userId: number,
  tokenVersion: number,
  roles: string[],
  meta: RequestMeta,
  parentId?: number,
) {
  const tokenId = randomUUID();
  const token = signRefreshToken(userId, tokenId);
  const tokenHash = await hashRefreshToken(token);
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenId,
      tokenHash,
      expiresAt: refreshExpiry(),
      parentRefreshTokenId: parentId ?? null,
      ip: meta.ip ?? null,
      userAgent: meta.userAgent?.slice(0, 300) ?? null,
    },
  });
  return { refreshToken: token, accessToken: signAccessToken(userId, roles, tokenVersion) };
}

export async function login(username: string, password: string, portal: Portal, meta: RequestMeta) {
  const user = await prisma.user.findFirst({
    where: { username: { equals: username, mode: 'insensitive' } },
    include: { roles: { include: { role: true } } },
  });
  if (!user || user.deletedAt) {
    await recordLogin(username, null, false, meta);
    throw HttpError.unauthorized('Sai tên đăng nhập hoặc mật khẩu');
  }
  if (user.status !== 'ACTIVE') {
    await recordLogin(username, user.id, false, meta);
    throw user.status === 'LOCKED'
      ? HttpError.locked('Tài khoản đang bị khóa, vui lòng liên hệ quản trị')
      : HttpError.forbidden('Tài khoản không hoạt động');
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await recordLogin(username, user.id, false, meta);
    throw HttpError.locked('Tài khoản tạm khóa do nhập sai nhiều lần, vui lòng thử lại sau');
  }

  const passwordMatches = await argon2.verify(user.passwordHash, password);
  if (!passwordMatches) {
    const failedCount = user.failedLoginCount + 1;
    const shouldLock = failedCount >= env.MAX_FAILED_LOGINS;
    if (shouldLock) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginCount: 0,
            lockedUntil: new Date(Date.now() + env.LOCK_MINUTES * 60 * 1000),
            tokenVersion: { increment: 1 },
          },
        }),
        prisma.refreshToken.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      ]);
    } else {
      await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: failedCount } });
    }
    await recordLogin(username, user.id, false, meta);
    if (shouldLock) throw HttpError.locked('Tài khoản tạm khóa do nhập sai nhiều lần, vui lòng thử lại sau');
    throw HttpError.unauthorized('Sai tên đăng nhập hoặc mật khẩu');
  }

  const roles = user.roles.map(({ role }) => role.code);
  if (portal === 'admin' && !roles.includes('admin')) {
    await recordLogin(username, user.id, false, meta);
    throw HttpError.forbidden('Tài khoản không có quyền quản trị');
  }
  if (portal === 'client' && roles.includes('admin') && !roles.some((role) => role !== 'admin')) {
    await recordLogin(username, user.id, false, meta);
    throw HttpError.forbidden('Vui lòng đăng nhập tài khoản quản trị tại cổng admin');
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  await recordLogin(username, user.id, true, meta);
  const tokens = await createRefreshSession(user.id, user.tokenVersion, roles, meta);
  return {
    user: {
      id: String(user.id),
      username: user.username,
      name: user.fullName ?? user.username,
      email: user.email ?? '',
      phone: user.phone,
      status: user.status.toLowerCase(),
      role: portal === 'admin' ? 'admin' : (roles.find((role) => role !== 'admin') ?? roles[0]),
      roles,
      mustChangePassword: user.mustChangePassword,
    },
    ...tokens,
  };
}

async function revokeFamily(userId: number, tokenRecordId: number) {
  const tokens = await prisma.refreshToken.findMany({
    where: { userId },
    select: { id: true, parentRefreshTokenId: true },
  });
  const byId = new Map(tokens.map((token) => [token.id, token]));
  let rootId = tokenRecordId;
  while (byId.get(rootId)?.parentRefreshTokenId) rootId = byId.get(rootId)!.parentRefreshTokenId!;
  const family = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const token of tokens) {
      if (token.parentRefreshTokenId && family.has(token.parentRefreshTokenId) && !family.has(token.id)) {
        family.add(token.id);
        changed = true;
      }
    }
  }
  await prisma.refreshToken.updateMany({
    where: { userId, id: { in: [...family] }, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function refreshSession(userId: number, tokenId: string, token: string, meta: RequestMeta) {
  const stored = await prisma.refreshToken.findUnique({ where: { tokenId } });
  if (!stored || stored.userId !== userId || !(await verifyRefreshTokenHash(token, stored.tokenHash)))
    throw HttpError.unauthorized();
  if (stored.revokedAt) {
    await revokeFamily(userId, stored.id);
    throw HttpError.unauthorized('Refresh token đã được sử dụng');
  }
  if (stored.expiresAt <= new Date()) {
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    throw HttpError.unauthorized();
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { roles: { include: { role: true } } } });
  if (!user || user.deletedAt || user.status !== 'ACTIVE') throw HttpError.unauthorized();
  const roles = user.roles.map(({ role }) => role.code);
  const tokenVersion = user.tokenVersion;
  const tokenIdNew = randomUUID();
  const refreshToken = signRefreshToken(userId, tokenIdNew);
  const tokenHash = await hashRefreshToken(refreshToken);
  const now = new Date();
  await prisma
    .$transaction(async (tx) => {
      const consumed = await tx.refreshToken.updateMany({
        where: { id: stored.id, revokedAt: null, expiresAt: { gt: now } },
        data: { revokedAt: now },
      });
      if (consumed.count !== 1) throw HttpError.unauthorized('Refresh token đã được sử dụng');
      await tx.refreshToken.create({
        data: {
          userId,
          tokenId: tokenIdNew,
          tokenHash,
          expiresAt: refreshExpiry(),
          parentRefreshTokenId: stored.id,
          ip: meta.ip ?? null,
          userAgent: meta.userAgent?.slice(0, 300) ?? null,
        },
      });
    })
    .catch(async (error: unknown) => {
      if (error instanceof HttpError && error.message.includes('đã được sử dụng'))
        await revokeFamily(userId, stored.id);
      throw error;
    });
  return { accessToken: signAccessToken(userId, roles, tokenVersion), refreshToken };
}

export async function revokeRefreshSession(userId: number, tokenId: string, token: string) {
  const stored = await prisma.refreshToken.findUnique({ where: { tokenId } });
  if (!stored || stored.userId !== userId || !(await verifyRefreshTokenHash(token, stored.tokenHash))) return;
  await prisma.refreshToken.updateMany({ where: { id: stored.id, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function getProfile(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      phone: true,
      status: true,
      mustChangePassword: true,
      lastLoginAt: true,
      roles: { select: { role: { select: { code: true } } } },
      teacher: { select: { id: true, teacherCode: true, fullName: true, branchId: true } },
      staff: { select: { id: true, staffCode: true, fullName: true } },
      student: { select: { id: true, studentCode: true, fullName: true } },
    },
  });
  if (!user) throw HttpError.notFound('Không tìm thấy tài khoản');
  const roles = user.roles.map(({ role }) => role.code);
  const profile =
    user.teacher?.fullName ?? user.staff?.fullName ?? user.student?.fullName ?? user.fullName ?? user.username;
  return {
    id: String(user.id),
    username: user.username,
    name: profile,
    email: user.email ?? '',
    phone: user.phone,
    status: user.status.toLowerCase(),
    role: roles[0],
    roles,
    branchId: user.teacher?.branchId ?? null,
    mustChangePassword: user.mustChangePassword,
    lastLoginAt: user.lastLoginAt,
    teacher: user.teacher,
    staff: user.staff,
    student: user.student,
  };
}

export async function changePassword(userId: number, currentPassword: string, newPassword: string, ip?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw HttpError.notFound('Không tìm thấy tài khoản');
  if (!(await argon2.verify(user.passwordHash, currentPassword)))
    throw HttpError.badRequest('Mật khẩu hiện tại không đúng');
  const passwordHash = await argon2.hash(newPassword);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false, tokenVersion: { increment: 1 } },
    });
    await tx.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
    await writeAudit({ userId, action: 'change_password', tableName: 'users', recordId: userId, ip }, tx);
  });
}

function hashResetToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' }, status: 'ACTIVE', deletedAt: null },
    select: { id: true, email: true },
  });
  if (!user?.email) return;
  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashResetToken(token);
  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
    await tx.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 20 * 60 * 1000) },
    });
  });
  try {
    await sendPasswordResetEmail(user.email, token);
  } catch {
    logger.error('Không gửi được email đặt lại mật khẩu');
  }
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = hashResetToken(token);
  const reset = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
      user: { select: { status: true, deletedAt: true } },
    },
  });
  if (!reset || reset.usedAt || reset.expiresAt <= new Date() || reset.user.deletedAt || reset.user.status !== 'ACTIVE')
    throw HttpError.badRequest('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
  const passwordHash = await argon2.hash(newPassword);
  await prisma.$transaction(async (tx) => {
    const consumed = await tx.passwordResetToken.updateMany({
      where: { id: reset.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (consumed.count !== 1) throw HttpError.badRequest('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
    await tx.user.update({
      where: { id: reset.userId },
      data: { passwordHash, mustChangePassword: false, tokenVersion: { increment: 1 } },
    });
    await tx.refreshToken.updateMany({
      where: { userId: reset.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.passwordResetToken.updateMany({
      where: { userId: reset.userId, id: { not: reset.id }, usedAt: null },
      data: { usedAt: new Date() },
    });
    await writeAudit(
      { userId: reset.userId, action: 'reset_password', tableName: 'users', recordId: reset.userId },
      tx,
    );
  });
}
