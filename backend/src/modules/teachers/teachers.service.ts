import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { HttpError } from '../../utils/httpError';
import { writeAudit } from '../../utils/audit';
import type {
  CreateTeacherInput,
  ListTeachersQuery,
  TeacherStatusInput,
  UpdateTeacherInput,
} from './teachers.schema';

const teacherSelect = {
  id: true,
  userId: true,
  teacherCode: true,
  fullName: true,
  phone: true,
  email: true,
  specialty: true,
  certificate: true,
  experience: true,
  education: true,
  bio: true,
  startDate: true,
  photoFileId: true,
  showOnWebsite: true,
  status: true,
  branchId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.TeacherSelect;

type TeacherRecord = Prisma.TeacherGetPayload<{ select: typeof teacherSelect }>;

interface TeacherDto extends TeacherRecord {
  hasAccount: boolean;
  photoUrl: string | null;
  classCount: number;
  studentCount: number;
}

function toDto(teacher: TeacherRecord, counts: { classCount: number; studentCount: number } = { classCount: 0, studentCount: 0 }): TeacherDto {
  return {
    ...teacher,
    hasAccount: teacher.userId !== null,
    photoUrl: teacher.photoFileId ? `/api/files/${teacher.photoFileId}` : null,
    classCount: counts.classCount,
    studentCount: counts.studentCount,
  };
}

function makeTemporaryPassword() {
  return `GV${randomBytes(18).toString('base64url')}`;
}

// Sinh mã giáo viên theo năm (GV260001...), không trùng khi nhiều người thao tác cùng lúc.
async function nextTeacherCode(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await tx.sequence.upsert({
    where: { name: `teacher-${year}` },
    update: { lastValue: { increment: 1 } },
    create: { name: `teacher-${year}`, year, lastValue: 1 },
  });
  return `GV${String(year).slice(-2)}${String(seq.lastValue).padStart(4, '0')}`;
}

// Số lớp phụ trách và sĩ số học viên của từng giáo viên (truy vấn gom một lần cho cả trang).
async function countClassesAndStudents(
  tx: Prisma.TransactionClient | typeof prisma,
  teacherIds: number[],
): Promise<Map<number, { classCount: number; studentCount: number }>> {
  if (teacherIds.length === 0) return new Map();
  const rows = await tx.$queryRaw<
    Array<{ id: number; classCount: bigint; studentCount: bigint }>
  >`
    SELECT t.id,
           count(DISTINCT c.id)::bigint AS "classCount",
           count(DISTINCT e.student_id)::bigint AS "studentCount"
    FROM teachers t
    LEFT JOIN classes c ON c.teacher_id = t.id AND c.deleted_at IS NULL
    LEFT JOIN enrollments e ON e.class_id = c.id
    WHERE t.id IN (${Prisma.join(teacherIds)})
    GROUP BY t.id
  `;
  return new Map(
    rows.map((r) => [r.id, { classCount: Number(r.classCount), studentCount: Number(r.studentCount) }]),
  );
}

export async function listTeachers(q: ListTeachersQuery) {
  const predicates: Prisma.Sql[] = [
    q.onlyDeleted === 'true' ? Prisma.sql`t.deleted_at IS NOT NULL` : Prisma.sql`t.deleted_at IS NULL`,
  ];
  if (q.status) predicates.push(Prisma.sql`t.status = ${q.status}::"PersonStatus"`);
  if (q.showOnWebsite) predicates.push(Prisma.sql`t.show_on_website = ${q.showOnWebsite === 'true'}`);
  if (q.query)
    predicates.push(Prisma.sql`ttnn_unaccent(lower(concat_ws(' ', t.teacher_code, t.full_name, t.email, t.phone)))
      LIKE '%' || ttnn_unaccent(lower(${q.query})) || '%'`);
  const where = Prisma.join(predicates, ' AND ');

  const [ids, countRows] = await prisma.$transaction([
    prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`SELECT t.id FROM teachers t WHERE ${where}
      ORDER BY t.created_at DESC, t.id DESC LIMIT ${q.pageSize} OFFSET ${(q.page - 1) * q.pageSize}`),
    prisma.$queryRaw<Array<{ total: bigint }>>(
      Prisma.sql`SELECT count(*)::bigint AS total FROM teachers t WHERE ${where}`,
    ),
  ]);
  const teacherIds = ids.map(({ id }) => id);
  const teachers = teacherIds.length
    ? await prisma.teacher.findMany({
        where: { id: { in: teacherIds } },
        select: teacherSelect,
      })
    : [];
  const counts = await countClassesAndStudents(prisma, teacherIds);
  const byId = new Map(teachers.map((t) => [t.id, t]));
  const rows = teacherIds
    .map((id) => byId.get(id))
    .filter((t): t is TeacherRecord => !!t)
    .map((t) => toDto(t, counts.get(t.id)));
  const total = Number(countRows[0]?.total ?? 0n);
  return { items: rows, page: q.page, pageSize: q.pageSize, total, totalPages: Math.ceil(total / q.pageSize) };
}

export async function getTeacher(id: number) {
  const teacher = await prisma.teacher.findUnique({
    where: { id },
    select: teacherSelect,
  });
  if (!teacher || teacher.deletedAt) throw HttpError.notFound('Không tìm thấy giáo viên');
  const counts = await countClassesAndStudents(prisma, [id]);
  return toDto(teacher, counts.get(id));
}

export async function createTeacher(input: CreateTeacherInput, actorId: number, ip?: string) {
  return prisma.$transaction(async (tx) => {
    const teacherCode = await nextTeacherCode(tx);
    let userId: number | null = null;
    let temporaryPassword: string | null = null;

    if (input.account) {
      const username = input.account.username.toLowerCase();
      const duplicate = await tx.user.findFirst({
        where: { username: { equals: username, mode: 'insensitive' } },
        select: { id: true },
      });
      if (duplicate) throw HttpError.conflict('Tên đăng nhập đã được sử dụng');
      const role = await tx.role.findUnique({ where: { code: 'teacher' }, select: { id: true } });
      if (!role) throw HttpError.badRequest('Vai trò giáo viên chưa được tạo. Chạy lệnh seed trước.');
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

    const teacher = await tx.teacher.create({
      data: {
        userId,
        teacherCode,
        fullName: input.fullName,
        phone: input.phone ?? null,
        email: input.email ?? null,
        specialty: input.specialty ?? null,
        certificate: input.certificate ?? null,
        experience: input.experience ?? null,
        education: input.education ?? null,
        bio: input.bio ?? null,
        startDate: input.startDate ?? null,
        showOnWebsite: input.showOnWebsite ?? false,
        branchId: input.branchId ?? null,
      },
      select: teacherSelect,
    });
    await writeAudit(
      { userId: actorId, action: 'create', tableName: 'teachers', recordId: teacher.id, newData: toDto(teacher), ip },
      tx,
    );
    return { teacher: toDto(teacher), temporaryPassword };
  });
}

export async function updateTeacher(id: number, input: UpdateTeacherInput, actorId: number, ip?: string) {
  return prisma.$transaction(async (tx) => {
    const old = await tx.teacher.findUnique({ where: { id }, select: teacherSelect });
    if (!old || old.deletedAt) throw HttpError.notFound('Không tìm thấy giáo viên');

    const updated = await tx.teacher.update({
      where: { id },
      data: {
        fullName: input.fullName,
        phone: input.phone,
        email: input.email,
        specialty: input.specialty,
        certificate: input.certificate,
        experience: input.experience,
        education: input.education,
        bio: input.bio,
        startDate: input.startDate,
        showOnWebsite: input.showOnWebsite,
        branchId: input.branchId,
      },
      select: teacherSelect,
    });
    await writeAudit(
      { userId: actorId, action: 'update', tableName: 'teachers', recordId: id, oldData: toDto(old), newData: toDto(updated), ip },
      tx,
    );
    return toDto(updated);
  });
}

export async function setTeacherStatus(id: number, input: TeacherStatusInput, actorId: number, ip?: string) {
  return prisma.$transaction(async (tx) => {
    const old = await tx.teacher.findUnique({ where: { id }, select: teacherSelect });
    if (!old || old.deletedAt) throw HttpError.notFound('Không tìm thấy giáo viên');
    const updated = await tx.teacher.update({ where: { id }, data: { status: input.status }, select: teacherSelect });
    await writeAudit(
      { userId: actorId, action: 'update_status', tableName: 'teachers', recordId: id, oldData: { status: old.status }, newData: { status: updated.status }, ip },
      tx,
    );
    return toDto(updated);
  });
}

// Xóa mềm giáo viên: ẩn hồ sơ và vô hiệu tài khoản liên kết (nếu có) trong cùng transaction.
export async function softDeleteTeacher(id: number, actorId: number, ip?: string) {
  return prisma.$transaction(async (tx) => {
    const old = await tx.teacher.findUnique({ where: { id }, select: teacherSelect });
    if (!old || old.deletedAt) throw HttpError.notFound('Không tìm thấy giáo viên');

    const updated = await tx.teacher.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: teacherSelect,
    });
    if (old.userId) {
      await tx.user.update({
        where: { id: old.userId },
        data: { deletedAt: new Date(), status: 'DISABLED', tokenVersion: { increment: 1 } },
      });
      await tx.refreshToken.updateMany({ where: { userId: old.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    await writeAudit(
      { userId: actorId, action: 'delete', tableName: 'teachers', recordId: id, oldData: toDto(old), ip },
      tx,
    );
    return toDto(updated);
  });
}

export async function restoreTeacher(id: number, actorId: number, ip?: string) {
  return prisma.$transaction(async (tx) => {
    const old = await tx.teacher.findUnique({ where: { id }, select: teacherSelect });
    if (!old || !old.deletedAt) throw HttpError.notFound('Không tìm thấy giáo viên đã xóa');

    const updated = await tx.teacher.update({ where: { id }, data: { deletedAt: null }, select: teacherSelect });
    if (old.userId) {
      await tx.user.update({ where: { id: old.userId }, data: { deletedAt: null, status: 'ACTIVE' } });
    }
    await writeAudit(
      { userId: actorId, action: 'restore', tableName: 'teachers', recordId: id, newData: toDto(updated), ip },
      tx,
    );
    return toDto(updated);
  });
}

// Đặt lại mật khẩu tài khoản liên kết. Mật khẩu tạm chỉ trả về một lần, không lưu dạng rõ.
export async function resetTeacherPassword(id: number, actorId: number, ip?: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { id },
    select: { id: true, userId: true, deletedAt: true },
  });
  if (!teacher || teacher.deletedAt) throw HttpError.notFound('Không tìm thấy giáo viên');
  if (!teacher.userId) throw HttpError.badRequest('Giáo viên chưa có tài khoản đăng nhập');

  const temporaryPassword = makeTemporaryPassword();
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: teacher.userId! },
      data: { passwordHash: await argon2.hash(temporaryPassword), mustChangePassword: true, tokenVersion: { increment: 1 } },
    });
    await tx.refreshToken.updateMany({ where: { userId: teacher.userId!, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.passwordResetToken.updateMany({ where: { userId: teacher.userId!, usedAt: null }, data: { usedAt: new Date() } });
    await writeAudit(
      { userId: actorId, action: 'reset_password', tableName: 'teachers', recordId: id, newData: { mustChangePassword: true }, ip },
      tx,
    );
  });
  return { temporaryPassword };
}

// Gắn ảnh đại diện đã upload (upload qua module files trước).
export async function updateTeacherPhoto(id: number, fileId: number, actorId: number, ip?: string) {
  return prisma.$transaction(async (tx) => {
    const old = await tx.teacher.findUnique({ where: { id }, select: teacherSelect });
    if (!old || old.deletedAt) throw HttpError.notFound('Không tìm thấy giáo viên');
    const file = await tx.file.findUnique({ where: { id: fileId }, select: { id: true, ownerType: true, ownerId: true } });
    if (!file || file.ownerType !== 'teacher' || file.ownerId !== id) {
      throw HttpError.badRequest('Tệp không thuộc giáo viên này');
    }
    const updated = await tx.teacher.update({ where: { id }, data: { photoFileId: fileId }, select: teacherSelect });
    await writeAudit(
      { userId: actorId, action: 'update', tableName: 'teachers', recordId: id, oldData: { photoFileId: old.photoFileId }, newData: { photoFileId: fileId }, ip },
      tx,
    );
    return toDto(updated);
  });
}

// Xuất Excel danh sách giáo viên (admin). Cột bám theo nút "Xuất Excel" của giao diện.
// Lấy toàn bộ bản ghi khớp bộ lọc (không phân trang) vì file Excel là xuất đầy đủ.
export async function exportTeachers(q: ListTeachersQuery) {
  const predicates: Prisma.Sql[] = [
    q.onlyDeleted === 'true' ? Prisma.sql`t.deleted_at IS NOT NULL` : Prisma.sql`t.deleted_at IS NULL`,
  ];
  if (q.status) predicates.push(Prisma.sql`t.status = ${q.status}::"PersonStatus"`);
  if (q.showOnWebsite) predicates.push(Prisma.sql`t.show_on_website = ${q.showOnWebsite === 'true'}`);
  if (q.query)
    predicates.push(Prisma.sql`ttnn_unaccent(lower(concat_ws(' ', t.teacher_code, t.full_name, t.email, t.phone)))
      LIKE '%' || ttnn_unaccent(lower(${q.query})) || '%'`);
  const where = Prisma.join(predicates, ' AND ');
  const teachers = await prisma.$queryRaw<
    Array<{
      id: number;
      teacherCode: string;
      fullName: string;
      email: string | null;
      phone: string | null;
      startDate: Date | null;
      status: string;
      deletedAt: Date | null;
      classCount: bigint;
    }>
  >(Prisma.sql`
    SELECT t.id, t.teacher_code AS "teacherCode", t.full_name AS "fullName", t.email, t.phone,
           t.start_date AS "startDate", t.status::text AS "status", t.deleted_at AS "deletedAt",
           count(DISTINCT c.id)::bigint AS "classCount"
    FROM teachers t
    LEFT JOIN classes c ON c.teacher_id = t.id AND c.deleted_at IS NULL
    WHERE ${where}
    GROUP BY t.id
    ORDER BY t.created_at DESC, t.id DESC
  `);
  const counts = await countClassesAndStudents(
    prisma,
    teachers.map((t) => t.id),
  );
  const rows = teachers.map((t) => {
    const c = counts.get(t.id) ?? { classCount: 0, studentCount: 0 };
    return [
      t.teacherCode,
      t.fullName,
      t.email ?? '',
      t.phone ?? '',
      c.classCount > 0 ? `${c.classCount} lớp` : 'Chưa xếp lớp',
      t.startDate ? t.startDate.toISOString().slice(0, 10) : '',
      t.deletedAt ? 'Đã xoá' : t.status === 'ACTIVE' ? 'Đang hoạt động' : 'Ngừng hoạt động',
    ];
  });
  return {
    columns: ['Mã giáo viên', 'Họ và tên', 'Email', 'Số điện thoại', 'Lớp phụ trách', 'Ngày vào', 'Trạng thái'],
    rows,
  };
}
