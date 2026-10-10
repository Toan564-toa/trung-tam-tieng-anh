import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { HttpError } from '../../utils/httpError';
import { writeAudit } from '../../utils/audit';
import type { z } from 'zod';
import type {
  accountStatusSchema,
  createAccountSchema,
  listAccountsSchema,
  updateAccountSchema,
} from './accounts.schema';

type AccountListInput = z.infer<typeof listAccountsSchema>;
type AccountCreateInput = z.infer<typeof createAccountSchema>;
type AccountUpdateInput = z.infer<typeof updateAccountSchema>;
type AccountStatusInput = z.infer<typeof accountStatusSchema>;

const accountSelect = {
  id: true,
  username: true,
  fullName: true,
  email: true,
  phone: true,
  status: true,
  mustChangePassword: true,
  lastLoginAt: true,
  createdAt: true,
  deletedAt: true,
  roles: { select: { role: { select: { code: true } } } },
} satisfies Prisma.UserSelect;

type AccountRecord = Prisma.UserGetPayload<{ select: typeof accountSelect }>;

function toAccountDto(user: AccountRecord) {
  const roleCodes = user.roles.map(({ role }) => role.code);
  const status = user.deletedAt ? 'archived' : user.status === 'DISABLED' ? 'archived' : user.status.toLowerCase();
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName ?? user.username,
    email: user.email,
    phone: user.phone,
    role: roleCodes[0] ?? 'student',
    roles: roleCodes,
    status,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    deletedAt: user.deletedAt,
    mustChangePassword: user.mustChangePassword,
  };
}

function makeTemporaryPassword() {
  return `Tt7@${randomBytes(18).toString('base64url')}`;
}

async function resolveRoleIds(codes: string[]) {
  const roles = await prisma.role.findMany({ where: { code: { in: codes } }, select: { id: true, code: true } });
  if (roles.length !== new Set(codes).size) throw HttpError.badRequest('Vai trò không hợp lệ');
  return roles;
}

export async function listAccounts(input: AccountListInput) {
  const predicates: Prisma.Sql[] = [
    input.onlyDeleted === 'true' ? Prisma.sql`u.deleted_at IS NOT NULL` : Prisma.sql`u.deleted_at IS NULL`,
  ];
  if (input.role)
    predicates.push(Prisma.sql`EXISTS (
    SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = u.id AND r.code = ${input.role}
  )`);
  if (input.status === 'active') predicates.push(Prisma.sql`u.status::text = 'ACTIVE'`);
  if (input.status === 'locked') predicates.push(Prisma.sql`u.status::text = 'LOCKED'`);
  if (input.status === 'pending') predicates.push(Prisma.sql`u.status::text = 'PENDING'`);
  if (input.status === 'archived') predicates.push(Prisma.sql`u.status::text IN ('DISABLED', 'ARCHIVED')`);
  if (input.query)
    predicates.push(Prisma.sql`ttnn_unaccent(lower(concat_ws(' ', u.username, u.full_name, u.email, u.phone)))
    LIKE '%' || ttnn_unaccent(lower(${input.query})) || '%'`);
  const where = Prisma.join(predicates, ' AND ');
  const [ids, countRows] = await prisma.$transaction([
    prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`SELECT u.id FROM users u WHERE ${where}
      ORDER BY u.created_at DESC, u.id DESC LIMIT ${input.pageSize} OFFSET ${(input.page - 1) * input.pageSize}`),
    prisma.$queryRaw<Array<{ total: bigint }>>(
      Prisma.sql`SELECT count(*)::bigint AS total FROM users u WHERE ${where}`,
    ),
  ]);
  const users = ids.length
    ? await prisma.user.findMany({ where: { id: { in: ids.map(({ id }) => id) } }, select: accountSelect })
    : [];
  const byId = new Map(users.map((user) => [user.id, user]));
  const rows = ids.map(({ id }) => byId.get(id)).filter((user): user is AccountRecord => !!user);
  const total = Number(countRows[0]?.total ?? 0n);
  return {
    items: rows.map(toAccountDto),
    page: input.page,
    pageSize: input.pageSize,
    total,
    totalPages: Math.ceil(total / input.pageSize),
  };
}

export async function createAccount(actorId: number, input: AccountCreateInput, ip?: string) {
  const username = input.username.toLowerCase();
  const duplicate = await prisma.user.findFirst({
    where: { username: { equals: username, mode: 'insensitive' } },
    select: { id: true },
  });
  if (duplicate) throw HttpError.conflict('Tên đăng nhập đã được sử dụng');
  const roles = await resolveRoleIds(input.roles);
  const temporaryPassword = makeTemporaryPassword();
  const passwordHash = await argon2.hash(temporaryPassword);
  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username,
        fullName: input.fullName,
        email: input.email ?? null,
        phone: input.phone ?? null,
        passwordHash,
        status: 'ACTIVE',
        mustChangePassword: true,
        roles: { create: roles.map(({ id }) => ({ roleId: id, grantedBy: actorId })) },
      },
      select: accountSelect,
    });
    await writeAudit(
      { userId: actorId, action: 'create', tableName: 'users', recordId: user.id, newData: toAccountDto(user), ip },
      tx,
    );
    return user;
  });
  return { ...toAccountDto(created), temporaryPassword };
}

export async function updateAccount(actorId: number, accountId: number, input: AccountUpdateInput, ip?: string) {
  const old = await prisma.user.findUnique({ where: { id: accountId }, select: accountSelect });
  if (!old || old.deletedAt) throw HttpError.notFound('Không tìm thấy tài khoản');
  const requestedRoles = input.roles ? await resolveRoleIds(input.roles) : undefined;
  if (actorId === accountId && requestedRoles && !input.roles?.includes('admin')) {
    throw HttpError.forbidden('Không thể tự gỡ quyền quản trị viên');
  }
  return prisma.$transaction(async (tx) => {
    if (requestedRoles) {
      await tx.userRole.deleteMany({ where: { userId: accountId } });
      await tx.userRole.createMany({
        data: requestedRoles.map(({ id }) => ({ userId: accountId, roleId: id, grantedBy: actorId })),
      });
    }
    const updated = await tx.user.update({
      where: { id: accountId },
      data: { fullName: input.fullName, email: input.email, phone: input.phone },
      select: accountSelect,
    });
    await writeAudit(
      {
        userId: actorId,
        action: 'update',
        tableName: 'users',
        recordId: accountId,
        oldData: toAccountDto(old),
        newData: toAccountDto(updated),
        ip,
      },
      tx,
    );
    return toAccountDto(updated);
  });
}

export async function setAccountStatus(actorId: number, accountId: number, input: AccountStatusInput, ip?: string) {
  if (actorId === accountId && input.status === 'locked') throw HttpError.forbidden('Không thể tự khóa tài khoản');
  const user = await prisma.user.findUnique({ where: { id: accountId }, select: accountSelect });
  if (!user || user.deletedAt) throw HttpError.notFound('Không tìm thấy tài khoản');
  const status = input.status === 'locked' ? 'LOCKED' : 'ACTIVE';
  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: accountId },
      data: { status, ...(status === 'LOCKED' ? { tokenVersion: { increment: 1 } } : {}) },
      select: accountSelect,
    });
    if (status === 'LOCKED') {
      await tx.refreshToken.updateMany({
        where: { userId: accountId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: accountId, usedAt: null },
        data: { usedAt: new Date() },
      });
    }
    await writeAudit(
      {
        userId: actorId,
        action: 'update_status',
        tableName: 'users',
        recordId: accountId,
        oldData: { status: user.status },
        newData: { status: updated.status },
        ip,
      },
      tx,
    );
    return toAccountDto(updated);
  });
}

export async function resetAccountPassword(actorId: number, accountId: number, ip?: string) {
  const old = await prisma.user.findUnique({
    where: { id: accountId },
    select: { id: true, username: true, mustChangePassword: true },
  });
  if (!old) throw HttpError.notFound('Không tìm thấy tài khoản');
  const temporaryPassword = makeTemporaryPassword();
  const passwordHash = await argon2.hash(temporaryPassword);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: accountId },
      data: { passwordHash, mustChangePassword: true, tokenVersion: { increment: 1 } },
    });
    await tx.refreshToken.updateMany({
      where: { userId: accountId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.passwordResetToken.updateMany({
      where: { userId: accountId, usedAt: null },
      data: { usedAt: new Date() },
    });
    await writeAudit(
      {
        userId: actorId,
        action: 'reset_password',
        tableName: 'users',
        recordId: accountId,
        newData: { mustChangePassword: true },
        ip,
      },
      tx,
    );
  });
  return { temporaryPassword };
}

export async function accountLoginHistory(accountId: number, page: number, pageSize: number) {
  const user = await prisma.user.findUnique({ where: { id: accountId }, select: { id: true } });
  if (!user) throw HttpError.notFound('Không tìm thấy tài khoản');
  const where = { userId: accountId };
  const [items, total] = await prisma.$transaction([
    prisma.loginHistory.findMany({
      where,
      select: { id: true, username: true, success: true, ip: true, userAgent: true, createdAt: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.loginHistory.count({ where }),
  ]);
  return { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

export async function deleteAccount(actorId: number, accountId: number, ip?: string) {
  if (actorId === accountId) throw HttpError.forbidden('Không thể tự xóa tài khoản');
  const user = await prisma.user.findUnique({ where: { id: accountId }, select: accountSelect });
  if (!user || user.deletedAt) throw HttpError.notFound('Không tìm thấy tài khoản');
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: accountId },
      data: { deletedAt: new Date(), status: 'DISABLED', tokenVersion: { increment: 1 } },
    });
    await tx.refreshToken.updateMany({
      where: { userId: accountId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.passwordResetToken.updateMany({
      where: { userId: accountId, usedAt: null },
      data: { usedAt: new Date() },
    });
    await writeAudit(
      { userId: actorId, action: 'delete', tableName: 'users', recordId: accountId, oldData: toAccountDto(user), ip },
      tx,
    );
  });
}

export async function restoreAccount(actorId: number, accountId: number, ip?: string) {
  const user = await prisma.user.findUnique({ where: { id: accountId }, select: accountSelect });
  if (!user || !user.deletedAt) throw HttpError.notFound('Không tìm thấy tài khoản đã xóa');
  const updated = await prisma.$transaction(async (tx) => {
    const restored = await tx.user.update({
      where: { id: accountId },
      data: { deletedAt: null, status: 'ACTIVE' },
      select: accountSelect,
    });
    await writeAudit(
      {
        userId: actorId,
        action: 'restore',
        tableName: 'users',
        recordId: accountId,
        newData: toAccountDto(restored),
        ip,
      },
      tx,
    );
    return restored;
  });
  return toAccountDto(updated);
}
