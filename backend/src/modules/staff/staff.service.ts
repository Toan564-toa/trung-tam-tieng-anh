import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { HttpError } from '../../utils/httpError';
import { writeAudit } from '../../utils/audit';
import type {
  CreateStaffInput,
  ListStaffQuery,
  StaffStatusInput,
  UpdateStaffInput,
} from './staff.schema';

const staffSelect = {
  id: true,
  userId: true,
  staffCode: true,
  fullName: true,
  phone: true,
  email: true,
  position: true,
  department: true,
  education: true,
  bio: true,
  startDate: true,
  photoFileId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.StaffSelect;

type StaffRecord = Prisma.StaffGetPayload<{ select: typeof staffSelect }>;

interface StaffDto extends StaffRecord {
  hasAccount: boolean;
  photoUrl: string | null;
  studentCount: number;
}

function toDto(staff: StaffRecord, studentCount = 0): StaffDto {
  return {
    ...staff,
    hasAccount: staff.userId !== null,
    photoUrl: staff.photoFileId ? `/api/files/${staff.photoFileId}` : null,
    studentCount,
  };
}

function makeTemporaryPassword() {
  return `NV${randomBytes(18).toString('base64url')}`;
}

// Sinh mã nhân viên theo năm (NV260001...), không trùng khi nhiều người thao tác cùng lúc.
async function nextStaffCode(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await tx.sequence.upsert({
    where: { name: `staff-${year}` },
    update: { lastValue: { increment: 1 } },
    create: { name: `staff-${year}`, year, lastValue: 1 },
  });
  return `NV${String(year).slice(-2)}${String(seq.lastValue).padStart(4, '0')}`;
}

// Số học viên đang phụ trách của từng nhân viên.
async function countAdvisedStudents(
  tx: Prisma.TransactionClient | typeof prisma,
  staffIds: number[],
): Promise<Map<number, number>> {
  if (staffIds.length === 0) return new Map();
  const rows = await tx.$queryRaw<Array<{ id: number; studentCount: bigint }>>`
    SELECT s.id, count(st.id)::bigint AS "studentCount"
    FROM staff s
    LEFT JOIN students st ON st.advisor_id = s.id AND st.deleted_at IS NULL
    WHERE s.id IN (${Prisma.join(staffIds)})
    GROUP BY s.id
  `;
  return new Map(rows.map((r) => [r.id, Number(r.studentCount)]));
}

export async function listStaff(q: ListStaffQuery) {
  const predicates: Prisma.Sql[] = [
    q.onlyDeleted === 'true' ? Prisma.sql`s.deleted_at IS NOT NULL` : Prisma.sql`s.deleted_at IS NULL`,
  ];
  if (q.status) predicates.push(Prisma.sql`s.status = ${q.status}::"PersonStatus"`);
  if (q.query)
    predicates.push(Prisma.sql`ttnn_unaccent(lower(concat_ws(' ', s.staff_code, s.full_name, s.email, s.phone)))
      LIKE '%' || ttnn_unaccent(lower(${q.query})) || '%'`);
  const where = Prisma.join(predicates, ' AND ');

  const [ids, countRows] = await prisma.$transaction([
    prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`SELECT s.id FROM staff s WHERE ${where}
      ORDER BY s.created_at DESC, s.id DESC LIMIT ${q.pageSize} OFFSET ${(q.page - 1) * q.pageSize}`),
    prisma.$queryRaw<Array<{ total: bigint }>>(
      Prisma.sql`SELECT count(*)::bigint AS total FROM staff s WHERE ${where}`,
    ),
  ]);
  const staffIds = ids.map(({ id }) => id);
  const staff = staffIds.length
    ? await prisma.staff.findMany({ where: { id: { in: staffIds } }, select: staffSelect })
    : [];
  const counts = await countAdvisedStudents(prisma, staffIds);
  const byId = new Map(staff.map((s) => [s.id, s]));
  const rows = staffIds
    .map((id) => byId.get(id))
    .filter((s): s is StaffRecord => !!s)
    .map((s) => toDto(s, counts.get(s.id) ?? 0));
  const total = Number(countRows[0]?.total ?? 0n);
  return { items: rows, page: q.page, pageSize: q.pageSize, total, totalPages: Math.ceil(total / q.pageSize) };
}

export async function getStaff(id: number) {
  const staff = await prisma.staff.findUnique({ where: { id }, select: staffSelect });
  if (!staff || staff.deletedAt) throw HttpError.notFound('Không tìm thấy nhân viên');
  const counts = await countAdvisedStudents(prisma, [id]);
  return toDto(staff, counts.get(id) ?? 0);
}

export async function createStaff(input: CreateStaffInput, actorId: number, ip?: string) {
  return prisma.$transaction(async (tx) => {
    const staffCode = await nextStaffCode(tx);
    let userId: number | null = null;
    let temporaryPassword: string | null = null;

    if (input.account) {
      const username = input.account.username.toLowerCase();
      const duplicate = await tx.user.findFirst({
        where: { username: { equals: username, mode: 'insensitive' } },
        select: { id: true },
      });
      if (duplicate) throw HttpError.conflict('Tên đăng nhập đã được sử dụng');
      const role = await tx.role.findUnique({ where: { code: 'staff' }, select: { id: true } });
      if (!role) throw HttpError.badRequest('Vai trò nhân viên chưa được tạo. Chạy lệnh seed trước.');
      temporaryPassword = makeTemporaryPassword();
      const user = await tx.user.create({
        data: {
          username,
          fullName: input.fullName,
          email: input.email ?? null,
          phone: input.phone ?? null,
          passwordHash: await argon2.hash(temporaryPassword),
          status: 'ACTIVE',
          mustChangePassword: true,
          roles: { create: [{ roleId: role.id, grantedBy: actorId }] },
        },
        select: { id: true },
      });
      userId = user.id;
    }

    const staff = await tx.staff.create({
      data: {
        userId,
        staffCode,
        fullName: input.fullName,
        phone: input.phone ?? null,
        email: input.email ?? null,
        position: input.position ?? null,
        department: input.department ?? null,
        education: input.education ?? null,
        bio: input.bio ?? null,
        startDate: input.startDate ?? null,
      },
      select: staffSelect,
    });
    await writeAudit(
      { userId: actorId, action: 'create', tableName: 'staff', recordId: staff.id, newData: toDto(staff), ip },
      tx,
    );
    return { staff: toDto(staff), temporaryPassword };
  });
}

export async function updateStaff(id: number, input: UpdateStaffInput, actorId: number, ip?: string) {
  return prisma.$transaction(async (tx) => {
    const old = await tx.staff.findUnique({ where: { id }, select: staffSelect });
    if (!old || old.deletedAt) throw HttpError.notFound('Không tìm thấy nhân viên');

    const updated = await tx.staff.update({
      where: { id },
      data: {
        fullName: input.fullName,
        phone: input.phone,
        email: input.email,
        position: input.position,
        department: input.department,
        education: input.education,
        bio: input.bio,
        startDate: input.startDate,
      },
      select: staffSelect,
    });
    await writeAudit(
      { userId: actorId, action: 'update', tableName: 'staff', recordId: id, oldData: toDto(old), newData: toDto(updated), ip },
      tx,
    );
    return toDto(updated);
  });
}

export async function setStaffStatus(id: number, input: StaffStatusInput, actorId: number, ip?: string) {
  return prisma.$transaction(async (tx) => {
    const old = await tx.staff.findUnique({ where: { id }, select: staffSelect });
    if (!old || old.deletedAt) throw HttpError.notFound('Không tìm thấy nhân viên');
    const updated = await tx.staff.update({ where: { id }, data: { status: input.status }, select: staffSelect });
    await writeAudit(
      { userId: actorId, action: 'update_status', tableName: 'staff', recordId: id, oldData: { status: old.status }, newData: { status: updated.status }, ip },
      tx,
    );
    return toDto(updated);
  });
}

// Xóa mềm nhân viên: ẩn hồ sơ và vô hiệu tài khoản liên kết (nếu có) trong cùng transaction.
export async function softDeleteStaff(id: number, actorId: number, ip?: string) {
  return prisma.$transaction(async (tx) => {
    const old = await tx.staff.findUnique({ where: { id }, select: staffSelect });
    if (!old || old.deletedAt) throw HttpError.notFound('Không tìm thấy nhân viên');

    const updated = await tx.staff.update({ where: { id }, data: { deletedAt: new Date() }, select: staffSelect });
    if (old.userId) {
      await tx.user.update({
        where: { id: old.userId },
        data: { deletedAt: new Date(), status: 'DISABLED', tokenVersion: { increment: 1 } },
      });
      await tx.refreshToken.updateMany({ where: { userId: old.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    await writeAudit(
      { userId: actorId, action: 'delete', tableName: 'staff', recordId: id, oldData: toDto(old), ip },
      tx,
    );
    return toDto(updated);
  });
}

export async function restoreStaff(id: number, actorId: number, ip?: string) {
  return prisma.$transaction(async (tx) => {
    const old = await tx.staff.findUnique({ where: { id }, select: staffSelect });
    if (!old || !old.deletedAt) throw HttpError.notFound('Không tìm thấy nhân viên đã xóa');

    const updated = await tx.staff.update({ where: { id }, data: { deletedAt: null }, select: staffSelect });
    if (old.userId) {
      await tx.user.update({ where: { id: old.userId }, data: { deletedAt: null, status: 'ACTIVE' } });
    }
    await writeAudit(
      { userId: actorId, action: 'restore', tableName: 'staff', recordId: id, newData: toDto(updated), ip },
      tx,
    );
    return toDto(updated);
  });
}

// Đặt lại mật khẩu tài khoản liên kết. Mật khẩu tạm chỉ trả về một lần, không lưu dạng rõ.
export async function resetStaffPassword(id: number, actorId: number, ip?: string) {
  const staff = await prisma.staff.findUnique({
    where: { id },
    select: { id: true, userId: true, deletedAt: true },
  });
  if (!staff || staff.deletedAt) throw HttpError.notFound('Không tìm thấy nhân viên');
  if (!staff.userId) throw HttpError.badRequest('Nhân viên chưa có tài khoản đăng nhập');

  const temporaryPassword = makeTemporaryPassword();
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: staff.userId! },
      data: { passwordHash: await argon2.hash(temporaryPassword), mustChangePassword: true, tokenVersion: { increment: 1 } },
    });
    await tx.refreshToken.updateMany({ where: { userId: staff.userId!, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.passwordResetToken.updateMany({ where: { userId: staff.userId!, usedAt: null }, data: { usedAt: new Date() } });
    await writeAudit(
      { userId: actorId, action: 'reset_password', tableName: 'staff', recordId: id, newData: { mustChangePassword: true }, ip },
      tx,
    );
  });
  return { temporaryPassword };
}

// Gắn ảnh đại diện đã upload (upload qua module files trước).
export async function updateStaffPhoto(id: number, fileId: number, actorId: number, ip?: string) {
  return prisma.$transaction(async (tx) => {
    const old = await tx.staff.findUnique({ where: { id }, select: staffSelect });
    if (!old || old.deletedAt) throw HttpError.notFound('Không tìm thấy nhân viên');
    const file = await tx.file.findUnique({ where: { id: fileId }, select: { id: true, ownerType: true, ownerId: true } });
    if (!file || file.ownerType !== 'staff' || file.ownerId !== id) {
      throw HttpError.badRequest('Tệp không thuộc nhân viên này');
    }
    const updated = await tx.staff.update({ where: { id }, data: { photoFileId: fileId }, select: staffSelect });
    await writeAudit(
      { userId: actorId, action: 'update', tableName: 'staff', recordId: id, oldData: { photoFileId: old.photoFileId }, newData: { photoFileId: fileId }, ip },
      tx,
    );
    return toDto(updated);
  });
}

// Xuất Excel danh sách nhân viên (admin). Cột bám theo nút "Xuất Excel" của giao diện.
export async function exportStaff(q: ListStaffQuery) {
  const predicates: Prisma.Sql[] = [
    q.onlyDeleted === 'true' ? Prisma.sql`s.deleted_at IS NOT NULL` : Prisma.sql`s.deleted_at IS NULL`,
  ];
  if (q.status) predicates.push(Prisma.sql`s.status = ${q.status}::"PersonStatus"`);
  if (q.query)
    predicates.push(Prisma.sql`ttnn_unaccent(lower(concat_ws(' ', s.staff_code, s.full_name, s.email, s.phone)))
      LIKE '%' || ttnn_unaccent(lower(${q.query})) || '%'`);
  const where = Prisma.join(predicates, ' AND ');
  const staff = await prisma.$queryRaw<
    Array<{
      id: number;
      staffCode: string;
      fullName: string;
      email: string | null;
      phone: string | null;
      position: string | null;
      department: string | null;
      startDate: Date | null;
      status: string;
      deletedAt: Date | null;
      studentCount: bigint;
    }>
  >(Prisma.sql`
    SELECT s.id, s.staff_code AS "staffCode", s.full_name AS "fullName", s.email, s.phone,
           s.position, s.department, s.start_date AS "startDate", s.status::text AS "status",
           s.deleted_at AS "deletedAt", count(st.id)::bigint AS "studentCount"
    FROM staff s
    LEFT JOIN students st ON st.advisor_id = s.id AND st.deleted_at IS NULL
    WHERE ${where}
    GROUP BY s.id
    ORDER BY s.created_at DESC, s.id DESC
  `);
  const rows = staff.map((s) => [
    s.staffCode,
    s.fullName,
    s.email ?? '',
    s.phone ?? '',
    s.position ?? '',
    s.department ?? '',
    s.startDate ? s.startDate.toISOString().slice(0, 10) : '',
    s.studentCount > 0n ? `${s.studentCount} HV` : '—',
    s.deletedAt ? 'Đã xoá' : s.status === 'ACTIVE' ? 'Đang hoạt động' : 'Ngừng hoạt động',
  ]);
  return {
    columns: ['Mã nhân viên', 'Họ và tên', 'Email', 'Số điện thoại', 'Vị trí', 'Phòng ban', 'Ngày vào', 'HV phụ trách', 'Trạng thái'],
    rows,
  };
}
