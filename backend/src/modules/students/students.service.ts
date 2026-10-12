import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { HttpError } from '../../utils/httpError';
import { writeAudit } from '../../utils/audit';
import type {
  AssignmentInput,
  CloseAssignmentInput,
  CreateStudentInput,
  GuardianInput,
  ListStudentsQuery,
  StudentStatusInput,
  UpdateGuardianInput,
  UpdateStudentInput,
} from './students.schema';

export interface Caller {
  id: number;
  roles: string[];
}

// Database dev/test là PostgreSQL từ xa (~0,5–1s mỗi query). Transaction
// nhiều query dễ vượt timeout mặc định 5s của Prisma, nên đặt 15s.
function runInTx<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn, { timeout: 15_000 });
}

// ---------- DTO hồ sơ học viên (dùng chung cho /api/students/:id và /api/me/profile) ----------

export const studentProfileSelect = {
  id: true,
  userId: true,
  studentCode: true,
  fullName: true,
  birthDate: true,
  gender: true,
  phone: true,
  email: true,
  address: true,
  identityNo: true,
  occupation: true,
  level: true,
  school: true,
  note: true,
  status: true,
  photoFileId: true,
  advisor: { select: { id: true, fullName: true } },
  branch: { select: { id: true, name: true } },
  guardians: {
    select: {
      guardian: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          occupation: true,
          address: true,
        },
      },
      relation: true,
      isPrimary: true,
      receivesNotification: true,
      receivesInvoice: true,
    },
  },
  enrollments: {
    select: {
      id: true,
      status: true,
      totalSessions: true,
      tuitionAmount: true,
      class: { select: { id: true, classCode: true, name: true } },
    },
    orderBy: { id: 'desc' },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.StudentSelect;

export type StudentProfile = Prisma.StudentGetPayload<{ select: typeof studentProfileSelect }>;

async function avatarUrlOf(userId: number | null): Promise<string | null> {
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarFileId: true },
  });
  return user?.avatarFileId ? `/api/files/${user.avatarFileId}` : null;
}

export function studentProfileDto(profile: StudentProfile, avatarUrl: string | null) {
  return {
    id: profile.id,
    studentCode: profile.studentCode,
    fullName: profile.fullName,
    birthDate: profile.birthDate,
    gender: profile.gender,
    phone: profile.phone,
    email: profile.email,
    address: profile.address,
    identityNo: profile.identityNo,
    occupation: profile.occupation,
    level: profile.level,
    school: profile.school,
    note: profile.note,
    status: profile.status,
    photoUrl: profile.photoFileId ? `/api/files/${profile.photoFileId}` : null,
    avatarUrl,
    advisor: profile.advisor,
    branch: profile.branch,
    guardians: profile.guardians.map((g) => ({
      id: g.guardian.id,
      fullName: g.guardian.fullName,
      relation: g.relation,
      phone: g.guardian.phone,
      email: g.guardian.email,
      occupation: g.guardian.occupation,
      address: g.guardian.address,
      isPrimary: g.isPrimary,
      receivesNotification: g.receivesNotification,
      receivesInvoice: g.receivesInvoice,
    })),
    enrollments: profile.enrollments,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

// DTO dùng để ghi audit_logs: bỏ `identityNo` — dữ liệu cá nhân nhạy cảm
// không được ghi vào log/audit (BR-12; comment trên cột students.identity_no).
function studentAuditDto(profile: StudentProfile) {
  const { identityNo: _identityNo, ...rest } = studentProfileDto(profile, null);
  return rest;
}

// DTO cho giáo viên: giống hồ sơ đầy đủ nhưng KHÔNG có identityNo (dữ liệu nhạy cảm).
export function studentClassViewDto(profile: StudentProfile, avatarUrl: string | null) {
  const dto = studentProfileDto(profile, avatarUrl);
  return { ...dto, identityNo: null as string | null };
}

// ---------- Phạm vi dữ liệu theo vai trò ----------

const listSelect = {
  id: true,
  userId: true,
  studentCode: true,
  fullName: true,
  birthDate: true,
  gender: true,
  phone: true,
  email: true,
  status: true,
  advisor: { select: { id: true, fullName: true } },
  createdAt: true,
  deletedAt: true,
} satisfies Prisma.StudentSelect;

type StudentListRecord = Prisma.StudentGetPayload<{ select: typeof listSelect }>;

// Giáo viên chỉ thấy học viên trong các lớp mình dạy (chính hoặc trợ giảng).
async function studentIdsOfTeacher(teacherId: number): Promise<number[]> {
  const rows = await prisma.$queryRaw<Array<{ id: number }>>`
    SELECT DISTINCT s.id
    FROM students s
    JOIN enrollments e ON e.student_id = s.id
    JOIN classes c ON c.id = e.class_id AND c.deleted_at IS NULL
    WHERE s.deleted_at IS NULL
      AND (c.teacher_id = ${teacherId}
           OR EXISTS (
             SELECT 1 FROM class_teachers ct
             WHERE ct.class_id = c.id AND ct.teacher_id = ${teacherId}
           ))
    ORDER BY s.id
  `;
  return rows.map((r) => r.id);
}

// Nhân viên chỉ sửa được học viên có advisor là chính mình.
// Một query duy nhất (thay vì tra staff rồi tra student riêng),
// chạy trong cùng transaction với thao tác sửa để đúng trạng thái.
async function isAdvisedStudent(
  tx: Prisma.TransactionClient,
  staffUserId: number,
  studentId: number,
): Promise<boolean> {
  const student = await tx.student.findUnique({
    where: { id: studentId },
    select: { advisor: { select: { userId: true } } },
  });
  return student?.advisor?.userId === staffUserId;
}

async function teacherRecordOf(user: Caller) {
  return prisma.teacher.findFirst({
    where: { userId: user.id, deletedAt: null },
    select: { id: true },
  });
}

// ---------- Tìm kiếm không dấu ----------

// Số học viên khớp từ khoá tìm kiếm. Truy vấn tham số hoá, giới hạn số lượng để truy vấn rẻ.
async function searchStudentIds(term: string): Promise<number[]> {
  const rows = await prisma.$queryRaw<Array<{ id: number }>>`
    SELECT id
    FROM students
    WHERE deleted_at IS NULL
      AND (
        -- Bỏ dấu cả cột lẫn từ khoá để tìm được dù gõ "nguyen" hay "nguyễn".
        ttnn_unaccent(lower(full_name)) ILIKE '%' || ttnn_unaccent(lower(${term})) || '%'
        OR ttnn_unaccent(lower(student_code)) ILIKE '%' || ttnn_unaccent(lower(${term})) || '%'
        OR ttnn_unaccent(lower(COALESCE(phone, ''))) ILIKE '%' || ttnn_unaccent(lower(${term})) || '%'
      )
    ORDER BY id DESC
    LIMIT 5000
  `;
  return rows.map((r) => r.id);
}

// ---------- Danh sách ----------

export async function listStudents(q: ListStudentsQuery, caller: Caller) {
  // Phạm vi theo vai trò (PERMISSIONS.md): admin/nhân viên thấy toàn trung tâm,
  // giáo viên chỉ thấy học viên lớp mình, học viên không dùng endpoint này.
  let scopeIds: number[] | null = null;
  if (caller.roles.includes('teacher') && !caller.roles.includes('admin') && !caller.roles.includes('staff')) {
    const teacher = await teacherRecordOf(caller);
    scopeIds = teacher ? await studentIdsOfTeacher(teacher.id) : [];
  } else if (caller.roles.includes('student') && !caller.roles.includes('admin') && !caller.roles.includes('staff') && !caller.roles.includes('teacher')) {
    throw HttpError.forbidden('Học viên chỉ xem hồ sơ của mình tại /api/me/profile');
  }
  if (q.onlyDeleted === 'true' && !caller.roles.includes('admin')) {
    throw HttpError.forbidden('Chỉ admin được xem bản ghi đã xoá');
  }

  const searchIds = q.search ? await searchStudentIds(q.search) : null;

  const where: Prisma.StudentWhereInput = {
    deletedAt: q.onlyDeleted === 'true' ? { not: null } : null,
    ...(q.status ? { status: q.status } : {}),
    ...(searchIds ? { id: { in: searchIds } } : {}),
    ...(scopeIds ? { id: { in: scopeIds } } : {}),
    ...(q.classId
      ? { enrollments: { some: { classId: q.classId } } }
      : {}),
    ...(q.advisorId ? { advisorId: q.advisorId } : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.student.findMany({
      where,
      select: listSelect,
      orderBy: [{ id: 'desc' }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.student.count({ where }),
  ]);
  return {
    items: items.map((s: StudentListRecord) => ({
      ...s,
      hasAccount: s.userId !== null,
    })),
    page: q.page,
    pageSize: q.pageSize,
    total,
    totalPages: Math.ceil(total / q.pageSize),
  };
}

// ---------- Chi tiết ----------

export async function getStudent(id: number, caller: Caller) {
  const student = await prisma.student.findFirst({
    where: { id, deletedAt: null },
    select: studentProfileSelect,
  });
  if (!student) throw HttpError.notFound('Không tìm thấy học viên');

  const isAdmin = caller.roles.includes('admin');
  const isStaff = caller.roles.includes('staff');
  const isTeacher = caller.roles.includes('teacher');
  const isStudent = caller.roles.includes('student');

  if (isAdmin || isStaff) {
    return studentProfileDto(student, await avatarUrlOf(student.userId));
  }
  if (isTeacher) {
    const teacher = await teacherRecordOf(caller);
    if (!teacher) throw HttpError.forbidden('Không tìm thấy hồ sơ giáo viên');
    const visible = await studentIdsOfTeacher(teacher.id);
    if (!visible.includes(id)) {
      throw HttpError.forbidden('Chỉ xem được học viên trong lớp mình dạy');
    }
    return studentClassViewDto(student, await avatarUrlOf(student.userId));
  }
  if (isStudent) {
    // Học viên chỉ đọc được hồ sơ của chính mình (chống IDOR).
    if (student.userId !== caller.id) {
      throw HttpError.forbidden('Chỉ xem được hồ sơ của chính mình');
    }
    return studentProfileDto(student, await avatarUrlOf(student.userId));
  }
  throw HttpError.forbidden('Không có quyền xem hồ sơ học viên');
}

// ---------- Tạo / sửa / xoá ----------

export async function createStudent(input: CreateStudentInput, actorId: number, ip?: string) {
  return runInTx(async (tx) => {
    // Sinh mã học viên theo năm, không trùng kể cả khi nhiều người thao tác cùng lúc
    const year = new Date().getFullYear();
    const name = `student-${year}`;
    const seq = await tx.sequence.upsert({
      where: { name },
      update: { lastValue: { increment: 1 } },
      create: { name, year, lastValue: 1 },
    });
    const studentCode = `HV${String(year).slice(-2)}${String(seq.lastValue).padStart(4, '0')}`;

    const student = await tx.student.create({
      data: { ...input, studentCode },
      select: studentProfileSelect,
    });
    await writeAudit(
      { userId: actorId, action: 'create', tableName: 'students', recordId: student.id, newData: studentAuditDto(student), ip },
      tx,
    );
    return studentProfileDto(student, null);
  });
}

export async function updateStudent(id: number, input: UpdateStudentInput, actorId: number, ip?: string) {
  return runInTx(async (tx) => {
    const old = await tx.student.findFirst({
      where: { id, deletedAt: null },
      select: studentProfileSelect,
    });
    if (!old) throw HttpError.notFound('Không tìm thấy học viên');

    // Nhân viên chỉ sửa được học viên mình phụ trách.
    if (!actorId || !(await isAdminOrAdvised(tx, actorId, id))) {
      throw HttpError.forbidden('Chỉ admin hoặc nhân viên phụ trách mới sửa được học viên này');
    }

    const updated = await tx.student.update({
      where: { id },
      data: input,
      select: studentProfileSelect,
    });
    await writeAudit(
      { userId: actorId, action: 'update', tableName: 'students', recordId: id, oldData: studentAuditDto(old), newData: studentAuditDto(updated), ip },
      tx,
    );
    return studentProfileDto(updated, null);
  });
}

// Admin được sửa mọi học viên; nhân viên chỉ sửa học viên mình phụ trách.
async function isAdminOrAdvised(tx: Prisma.TransactionClient, actorId: number, studentId: number) {
  const actor = await tx.user.findUnique({
    where: { id: actorId },
    select: { roles: { select: { role: { select: { code: true } } } } },
  });
  const codes = actor?.roles.map(({ role }) => role.code) ?? [];
  if (codes.includes('admin')) return true;
  if (!codes.includes('staff')) return false;
  return isAdvisedStudent(tx, actorId, studentId);
}

// Đổi trạng thái học viên (khoá/nghỉ/đã ra trường). Ghi log theo hợp đồng.
export async function setStudentStatus(id: number, input: StudentStatusInput, actorId: number, ip?: string) {
  return runInTx(async (tx) => {
    const old = await tx.student.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!old) throw HttpError.notFound('Không tìm thấy học viên');
    if (!(await isAdminOrAdvised(tx, actorId, id))) {
      throw HttpError.forbidden('Chỉ admin hoặc nhân viên phụ trách mới đổi trạng thái học viên này');
    }
    const updated = await tx.student.update({ where: { id }, data: { status: input.status } });
    await writeAudit(
      { userId: actorId, action: 'update_status', tableName: 'students', recordId: id, oldData: { status: old.status }, newData: { status: updated.status }, ip },
      tx,
    );
    return { id: updated.id, status: updated.status };
  });
}

// Xóa mềm: giữ lại dữ liệu để đối chiếu điểm danh, học phí
export async function softDeleteStudent(id: number, actorId: number, ip?: string) {
  await runInTx(async (tx) => {
    const old = await tx.student.findFirst({
      where: { id, deletedAt: null },
      select: studentProfileSelect,
    });
    if (!old) throw HttpError.notFound('Không tìm thấy học viên');

    await tx.student.update({ where: { id }, data: { deletedAt: new Date() } });
    await writeAudit({ userId: actorId, action: 'delete', tableName: 'students', recordId: id, oldData: studentAuditDto(old), ip }, tx);
  });
}

export async function restoreStudent(id: number, actorId: number, ip?: string) {
  return runInTx(async (tx) => {
    const old = await tx.student.findFirst({
      where: { id, deletedAt: { not: null } },
      select: studentProfileSelect,
    });
    if (!old) throw HttpError.notFound('Không tìm thấy học viên đã xoá');

    const updated = await tx.student.update({
      where: { id },
      data: { deletedAt: null },
      select: studentProfileSelect,
    });
    await writeAudit(
      { userId: actorId, action: 'restore', tableName: 'students', recordId: id, newData: studentAuditDto(updated), ip },
      tx,
    );
    return studentProfileDto(updated, null);
  });
}

// Đặt lại mật khẩu cho tài khoản liên kết (nếu có). Mật khẩu tạm chỉ trả về một lần.
export async function resetStudentPassword(id: number, actorId: number, ip?: string) {
  const student = await prisma.student.findUnique({
    where: { id },
    select: { id: true, userId: true, deletedAt: true },
  });
  if (!student || student.deletedAt) throw HttpError.notFound('Không tìm thấy học viên');
  if (!student.userId) throw HttpError.badRequest('Học viên chưa có tài khoản đăng nhập');

  const temporaryPassword = `HV${randomBytes(18).toString('base64url')}`;
  await runInTx(async (tx) => {
    await tx.user.update({
      where: { id: student.userId! },
      data: { passwordHash: await argon2.hash(temporaryPassword), mustChangePassword: true, tokenVersion: { increment: 1 } },
    });
    await tx.refreshToken.updateMany({ where: { userId: student.userId!, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.passwordResetToken.updateMany({ where: { userId: student.userId!, usedAt: null }, data: { usedAt: new Date() } });
    await writeAudit(
      { userId: actorId, action: 'reset_password', tableName: 'students', recordId: id, newData: { mustChangePassword: true }, ip },
      tx,
    );
  });
  return { temporaryPassword };
}

// Gắn ảnh đại diện đã upload (upload qua module files trước).
export async function updateStudentPhoto(id: number, fileId: number, actorId: number, ip?: string) {
  return runInTx(async (tx) => {
    const old = await tx.student.findUnique({ where: { id }, select: { id: true, photoFileId: true, deletedAt: true } });
    if (!old || old.deletedAt) throw HttpError.notFound('Không tìm thấy học viên');
    const file = await tx.file.findUnique({ where: { id: fileId }, select: { id: true, ownerType: true, ownerId: true } });
    if (!file || file.ownerType !== 'student' || file.ownerId !== id) {
      throw HttpError.badRequest('Tệp không thuộc học viên này');
    }
    await tx.student.update({ where: { id }, data: { photoFileId: fileId } });
    await writeAudit(
      { userId: actorId, action: 'update', tableName: 'students', recordId: id, oldData: { photoFileId: old.photoFileId }, newData: { photoFileId: fileId }, ip },
      tx,
    );
    return { id, photoUrl: `/api/files/${fileId}` };
  });
}

// ---------- Người giám hộ (phụ huynh) ----------

export async function listGuardians(studentId: number, caller: Caller) {
  await assertCanViewStudent(studentId, caller);
  const student = await prisma.student.findUniqueOrThrow({
    where: { id: studentId },
    select: {
      guardians: {
        select: {
          guardian: {
            select: { id: true, fullName: true, phone: true, email: true, occupation: true, address: true, deletedAt: true },
          },
          relation: true,
          isPrimary: true,
          receivesNotification: true,
          receivesInvoice: true,
        },
      },
    },
  });
  return {
    items: student.guardians
      .filter((g) => g.guardian.deletedAt === null)
      .map((g) => ({
        id: g.guardian.id,
        fullName: g.guardian.fullName,
        relation: g.relation,
        phone: g.guardian.phone,
        email: g.guardian.email,
        occupation: g.guardian.occupation,
        address: g.guardian.address,
        isPrimary: g.isPrimary,
        receivesNotification: g.receivesNotification,
        receivesInvoice: g.receivesInvoice,
      })),
  };
}

export async function addGuardian(studentId: number, input: GuardianInput, actorId: number, ip?: string) {
  return runInTx(async (tx) => {
    await assertCanEditStudentTx(tx, studentId, actorId);
    const student = await tx.student.findFirst({ where: { id: studentId, deletedAt: null }, select: { id: true } });
    if (!student) throw HttpError.notFound('Không tìm thấy học viên');

    const guardian = await tx.guardian.create({
      data: {
        fullName: input.fullName,
        phone: input.phone,
        email: input.email ?? null,
        occupation: input.occupation ?? null,
        address: input.address ?? null,
      },
    });
    await tx.studentGuardian.create({
      data: {
        studentId,
        guardianId: guardian.id,
        relation: input.relation,
        isPrimary: input.isPrimary ?? false,
        receivesNotification: input.receivesNotification ?? true,
        receivesInvoice: input.receivesInvoice ?? false,
      },
    });
    await writeAudit(
      { userId: actorId, action: 'create', tableName: 'student_guardians', recordId: `${studentId}:${guardian.id}`, newData: { guardianId: guardian.id, relation: input.relation }, ip },
      tx,
    );
    return {
      id: guardian.id,
      fullName: guardian.fullName,
      relation: input.relation,
      phone: guardian.phone,
      email: guardian.email,
      occupation: guardian.occupation,
      address: guardian.address,
      isPrimary: input.isPrimary ?? false,
      receivesNotification: input.receivesNotification ?? true,
      receivesInvoice: input.receivesInvoice ?? false,
    };
  });
}

export async function updateGuardian(
  studentId: number,
  guardianId: number,
  input: UpdateGuardianInput,
  actorId: number,
  ip?: string,
) {
  return runInTx(async (tx) => {
    await assertCanEditStudentTx(tx, studentId, actorId);
    const link = await tx.studentGuardian.findUnique({
      where: { studentId_guardianId: { studentId, guardianId } },
      select: { guardianId: true, relation: true },
    });
    if (!link) throw HttpError.notFound('Không tìm thấy phụ huynh của học viên này');

    const updated = await tx.guardian.update({
      where: { id: guardianId },
      data: {
        fullName: input.fullName,
        phone: input.phone,
        email: input.email,
        occupation: input.occupation,
        address: input.address,
      },
    });
    if (input.relation !== undefined || input.isPrimary !== undefined || input.receivesNotification !== undefined || input.receivesInvoice !== undefined) {
      await tx.studentGuardian.update({
        where: { studentId_guardianId: { studentId, guardianId } },
        data: {
          ...(input.relation !== undefined ? { relation: input.relation } : {}),
          ...(input.isPrimary !== undefined ? { isPrimary: input.isPrimary } : {}),
          ...(input.receivesNotification !== undefined ? { receivesNotification: input.receivesNotification } : {}),
          ...(input.receivesInvoice !== undefined ? { receivesInvoice: input.receivesInvoice } : {}),
        },
      });
    }
    await writeAudit(
      { userId: actorId, action: 'update', tableName: 'guardians', recordId: guardianId, newData: { ...updated, relation: input.relation }, ip },
      tx,
    );
    return {
      id: updated.id,
      fullName: updated.fullName,
      phone: updated.phone,
      email: updated.email,
      occupation: updated.occupation,
      address: updated.address,
    };
  });
}

// Xoá mềm phụ huynh và gỡ liên kết với học viên.
export async function removeGuardian(studentId: number, guardianId: number, actorId: number, ip?: string) {
  return runInTx(async (tx) => {
    await assertCanEditStudentTx(tx, studentId, actorId);
    const link = await tx.studentGuardian.findUnique({
      where: { studentId_guardianId: { studentId, guardianId } },
      select: { guardian: { select: { id: true, fullName: true } } },
    });
    if (!link) throw HttpError.notFound('Không tìm thấy phụ huynh của học viên này');

    await tx.studentGuardian.delete({ where: { studentId_guardianId: { studentId, guardianId } } });
    await tx.guardian.update({ where: { id: guardianId }, data: { deletedAt: new Date() } });
    await writeAudit(
      { userId: actorId, action: 'delete', tableName: 'guardians', recordId: guardianId, oldData: link.guardian, ip },
      tx,
    );
  });
}

// ---------- Lịch sử nhân viên phụ trách ----------

export async function listAssignments(studentId: number, caller: Caller) {
  await assertCanViewStudent(studentId, caller);
  const items = await prisma.studentAssignment.findMany({
    where: { studentId },
    include: { staff: { select: { id: true, fullName: true, position: true } } },
    orderBy: [{ fromDate: 'desc' }, { id: 'desc' }],
  });
  return {
    items: items.map((a) => ({
      id: a.id,
      staffId: a.staffId,
      staffName: a.staff.fullName,
      position: a.staff.position,
      fromDate: a.fromDate,
      toDate: a.toDate,
      reason: a.reason,
      createdAt: a.createdAt,
    })),
  };
}

export async function addAssignment(studentId: number, input: AssignmentInput, actorId: number, ip?: string) {
  return runInTx(async (tx) => {
    await assertCanEditStudentTx(tx, studentId, actorId);
    const student = await tx.student.findFirst({ where: { id: studentId, deletedAt: null }, select: { id: true } });
    if (!student) throw HttpError.notFound('Không tìm thấy học viên');
    const staff = await tx.staff.findFirst({ where: { id: input.staffId, deletedAt: null }, select: { id: true } });
    if (!staff) throw HttpError.badRequest('Không tìm thấy nhân viên này');

    const assignment = await tx.studentAssignment.create({
      data: {
        studentId,
        staffId: input.staffId,
        fromDate: input.fromDate,
        toDate: input.toDate ?? null,
        reason: input.reason ?? null,
        createdBy: actorId,
      },
    });
    await writeAudit(
      { userId: actorId, action: 'create', tableName: 'student_assignments', recordId: assignment.id, newData: { studentId, staffId: input.staffId, fromDate: input.fromDate }, ip },
      tx,
    );
    return assignment;
  });
}

// Kết thúc một lần phụ trách (đặt ngày kết thúc).
export async function closeAssignment(studentId: number, assignmentId: number, input: CloseAssignmentInput, actorId: number, ip?: string) {
  return runInTx(async (tx) => {
    await assertCanEditStudentTx(tx, studentId, actorId);
    const assignment = await tx.studentAssignment.findFirst({
      where: { id: assignmentId, studentId },
      select: { id: true, toDate: true },
    });
    if (!assignment) throw HttpError.notFound('Không tìm thấy lịch sử phụ trách này');
    if (assignment.toDate) throw HttpError.conflict('Lịch sử phụ trách này đã kết thúc');

    const updated = await tx.studentAssignment.update({
      where: { id: assignmentId },
      data: { toDate: input.toDate, reason: input.reason ?? null },
    });
    await writeAudit(
      { userId: actorId, action: 'update', tableName: 'student_assignments', recordId: assignmentId, oldData: { toDate: null }, newData: { toDate: input.toDate }, ip },
      tx,
    );
    return updated;
  });
}

// ---------- Kiểm tra quyền xem/sửa học viên ----------

async function assertCanViewStudent(studentId: number, caller: Caller) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, userId: true, deletedAt: true },
  });
  if (!student || student.deletedAt) throw HttpError.notFound('Không tìm thấy học viên');
  const isAdmin = caller.roles.includes('admin');
  const isStaff = caller.roles.includes('staff');
  if (isAdmin || isStaff) return;
  if (caller.roles.includes('teacher')) {
    const teacher = await teacherRecordOf(caller);
    if (!teacher) throw HttpError.forbidden('Không tìm thấy hồ sơ giáo viên');
    const visible = await studentIdsOfTeacher(teacher.id);
    if (!visible.includes(studentId)) throw HttpError.forbidden('Chỉ xem được học viên trong lớp mình dạy');
    return;
  }
  if (caller.roles.includes('student')) {
    if (student.userId !== caller.id) throw HttpError.forbidden('Chỉ xem được hồ sơ của chính mình');
    return;
  }
  throw HttpError.forbidden('Không có quyền xem học viên này');
}

async function assertCanEditStudentTx(tx: Prisma.TransactionClient, studentId: number, actorId: number) {
  const ok = await isAdminOrAdvised(tx, actorId, studentId);
  if (!ok) throw HttpError.forbidden('Chỉ admin hoặc nhân viên phụ trách mới sửa được học viên này');
}

// ---------- Xuất Excel ----------

// Xuất Excel danh sách học viên (admin). Cột bám theo nút "Xuất Excel" của giao diện.
// Cột "Học phí" lấy học phí snapshot của lần ghi danh gần nhất; trạng thái đóng/nợ
// sẽ tính từ payments khi module học phí (P11) xong — xem DECISIONS.md D-03x.
export async function exportStudents(q: ListStudentsQuery) {
  const searchIds = q.search ? await searchStudentIds(q.search) : null;
  const where: Prisma.StudentWhereInput = {
    deletedAt: q.onlyDeleted === 'true' ? { not: null } : null,
    ...(q.status ? { status: q.status } : {}),
    ...(searchIds ? { id: { in: searchIds } } : {}),
    ...(q.advisorId ? { advisorId: q.advisorId } : {}),
    ...(q.classId ? { enrollments: { some: { classId: q.classId } } } : {}),
  };
  const students = await prisma.student.findMany({
    where,
    select: {
      studentCode: true,
      fullName: true,
      phone: true,
      email: true,
      level: true,
      status: true,
      deletedAt: true,
      enrollments: {
        orderBy: { id: 'desc' },
        take: 1,
        select: { tuitionAmount: true, class: { select: { name: true } } },
      },
    },
    orderBy: [{ id: 'desc' }],
  });
  const rows = students.map((s) => [
    s.studentCode,
    s.fullName,
    s.email ?? '',
    s.phone ?? '',
    s.enrollments[0]?.class?.name ?? 'Chưa ghi danh',
    s.enrollments[0] ? `${s.enrollments[0].tuitionAmount.toLocaleString('vi-VN')} VND` : '—',
    s.deletedAt ? 'Đã xoá' : s.status === 'STUDYING' ? 'Đang học' : s.status === 'FROZEN' ? 'Tạm nghỉ' : s.status === 'DROPPED' ? 'Đã nghỉ' : 'Đã ra trường',
  ]);
  return {
    columns: ['Mã học viên', 'Họ và tên', 'Email', 'Số điện thoại', 'Lớp', 'Học phí', 'Trạng thái'],
    rows,
  };
}
