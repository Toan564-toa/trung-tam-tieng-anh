import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { HttpError } from '../../utils/httpError';
import { writeAudit } from '../../utils/audit';
import {
  studentProfileDto,
  studentProfileSelect,
} from '../students/students.service';
import type {
  ListChangeRequestsQuery,
  ReviewChangeInput,
  UpdateProfileInput,
} from './me.schema';

export interface Caller {
  id: number;
  roles: string[];
}

// Database dev/test là PostgreSQL từ xa (~0,5–1s mỗi query). Transaction
// nhiều query dễ vượt timeout mặc định 5s của Prisma, nên đặt 15s.
function runInTx<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn, { timeout: 15_000 });
}

// Trường nhạy cảm: giá trị không bao giờ ghi vào audit_logs (BR-12).
const SENSITIVE_AUDIT_FIELDS = new Set(['identityNo']);

// ---------- DTO ----------

// DTO hồ sơ học viên tái dùng từ module students (không duplicate).

async function avatarUrlOf(userId: number | null): Promise<string | null> {
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarFileId: true },
  });
  return user?.avatarFileId ? `/api/files/${user.avatarFileId}` : null;
}

const teacherProfileSelect = {
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
  showOnWebsite: true,
  status: true,
  photoFileId: true,
  branch: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TeacherSelect;

type TeacherProfile = Prisma.TeacherGetPayload<{ select: typeof teacherProfileSelect }>;

function teacherProfileDto(profile: TeacherProfile, avatarUrl: string | null) {
  return {
    id: profile.id,
    teacherCode: profile.teacherCode,
    fullName: profile.fullName,
    phone: profile.phone,
    email: profile.email,
    specialty: profile.specialty,
    certificate: profile.certificate,
    experience: profile.experience,
    education: profile.education,
    bio: profile.bio,
    startDate: profile.startDate,
    showOnWebsite: profile.showOnWebsite,
    status: profile.status,
    photoUrl: profile.photoFileId ? `/api/files/${profile.photoFileId}` : null,
    avatarUrl,
    branch: profile.branch,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

const staffProfileSelect = {
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
  status: true,
  photoFileId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.StaffSelect;

type StaffProfile = Prisma.StaffGetPayload<{ select: typeof staffProfileSelect }>;

function staffProfileDto(profile: StaffProfile, avatarUrl: string | null) {
  return {
    id: profile.id,
    staffCode: profile.staffCode,
    fullName: profile.fullName,
    phone: profile.phone,
    email: profile.email,
    position: profile.position,
    department: profile.department,
    education: profile.education,
    bio: profile.bio,
    startDate: profile.startDate,
    status: profile.status,
    photoUrl: profile.photoFileId ? `/api/files/${profile.photoFileId}` : null,
    avatarUrl,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

// ---------- GET /api/me/profile ----------

// Ưu tiên hồ sơ theo vai trò: học viên > giáo viên > nhân viên > tài khoản.
export async function getMyProfile(caller: Caller) {
  if (caller.roles.includes('student')) {
    const student = await prisma.student.findFirst({
      where: { userId: caller.id, deletedAt: null },
      select: studentProfileSelect,
    });
    if (student) {
      return {
        role: 'student' as const,
        profile: studentProfileDto(student, await avatarUrlOf(caller.id)),
      };
    }
  }
  if (caller.roles.includes('teacher')) {
    const teacher = await prisma.teacher.findFirst({
      where: { userId: caller.id, deletedAt: null },
      select: teacherProfileSelect,
    });
    if (teacher) {
      return {
        role: 'teacher' as const,
        profile: teacherProfileDto(teacher, await avatarUrlOf(caller.id)),
      };
    }
  }
  if (caller.roles.includes('staff')) {
    const staff = await prisma.staff.findFirst({
      where: { userId: caller.id, deletedAt: null },
      select: staffProfileSelect,
    });
    if (staff) {
      return {
        role: 'staff' as const,
        profile: staffProfileDto(staff, await avatarUrlOf(caller.id)),
      };
    }
  }
  const user = await prisma.user.findUnique({
    where: { id: caller.id },
    select: { id: true, username: true, fullName: true, email: true, phone: true, avatarFileId: true },
  });
  if (!user) throw HttpError.notFound('Không tìm thấy tài khoản');
  return {
    role: 'account' as const,
    profile: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarFileId ? `/api/files/${user.avatarFileId}` : null,
    },
  };
}

// ---------- PATCH /api/me/profile ----------

// Trường sửa trực tiếp và trường phải qua duyệt, theo từng vai trò
// (bám FRONTEND-CONTRACT.md C.2.7, C.3.11, C.4.10).
const DIRECT_FIELDS: Record<string, string[]> = {
  student: ['phone', 'email', 'address', 'occupation'],
  teacher: ['phone', 'email', 'bio'],
  staff: ['phone', 'email', 'bio'],
};

const SENSITIVE_FIELDS: Record<string, string[]> = {
  student: ['fullName', 'birthDate', 'identityNo'],
  teacher: ['certificate', 'specialty'],
  staff: ['position', 'department'],
};

function findProfileRecord(
  tx: Prisma.TransactionClient,
  role: string,
  userId: number,
): Promise<{ id: number } | null> {
  switch (role) {
    case 'student':
      return tx.student.findFirst({ where: { userId, deletedAt: null }, select: { id: true } });
    case 'teacher':
      return tx.teacher.findFirst({ where: { userId, deletedAt: null }, select: { id: true } });
    case 'staff':
      return tx.staff.findFirst({ where: { userId, deletedAt: null }, select: { id: true } });
    default:
      return Promise.resolve(null);
  }
}

export async function updateMyProfile(caller: Caller, input: UpdateProfileInput) {
  const role = ['student', 'teacher', 'staff'].find((r) => caller.roles.includes(r));
  if (!role) throw HttpError.badRequest('Tài khoản này không có hồ sơ để sửa');

  const direct = DIRECT_FIELDS[role];
  const sensitive = SENSITIVE_FIELDS[role];
  const applied: Record<string, unknown> = {};
  const requested: Array<{ fieldName: string; oldValue: string | null; newValue: string | null }> = [];

  for (const [field, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (direct.includes(field)) {
      applied[field] = value ?? null;
    } else if (sensitive.includes(field)) {
      if (value === null) {
        // Cho phép xoá giá trị nhạy cảm ngay (ví dụ xoá CCCD) — vẫn qua duyệt.
        requested.push({ fieldName: field, oldValue: null, newValue: null });
      } else {
        requested.push({
          fieldName: field,
          oldValue: null,
          newValue: value instanceof Date ? value.toISOString() : String(value),
        });
      }
    } else {
      throw HttpError.badRequest(
        `Trường "${field}" không được phép sửa qua đây. Trường nhạy cảm phải gửi yêu cầu duyệt`,
        'FIELD_NOT_EDITABLE',
      );
    }
  }

  const changeRequests = await runInTx(async (tx) => {
    const profile = await findProfileRecord(tx, role, caller.id);
    if (!profile) throw HttpError.notFound('Không tìm thấy hồ sơ của bạn');

    // Lấy giá trị cũ của các trường nhạy cảm để lưu vào yêu cầu duyệt.
    const current = await readProfileFields(tx, role, profile.id, requested.map((r) => r.fieldName));
    for (const item of requested) {
      item.oldValue = current[item.fieldName] ?? null;
    }

    if (Object.keys(applied).length > 0) {
      await applyDirectFields(tx, role, profile.id, applied);
      await writeAudit(
        { userId: caller.id, action: 'update', tableName: role === 'student' ? 'students' : role === 'teacher' ? 'teachers' : 'staff', recordId: profile.id, newData: applied },
        tx,
      );
    }

    const changeRequests = [];
    for (const item of requested) {
      const request = await tx.profileChangeRequest.create({
        data: {
          userId: caller.id,
          tableName: role === 'student' ? 'students' : role === 'teacher' ? 'teachers' : 'staff',
          fieldName: item.fieldName,
          oldValue: item.oldValue,
          newValue: item.newValue,
          status: 'PENDING',
        },
      });
      changeRequests.push(request);
    }
    return changeRequests;
  });

  // Đọc lại hồ sơ ngoài transaction: giảm số query trong tx, tránh vượt
  // timeout trên database từ xa (~0,5–1s mỗi query).
  return {
    profile: await readMyProfile(role, caller.id),
    appliedFields: Object.keys(applied),
    pendingRequests: changeRequests,
  };
}

// Đọc giá trị hiện tại của các trường nhạy cảm (chuỗi hoá để so sánh/ghi log).
async function readProfileFields(
  tx: Prisma.TransactionClient,
  role: string,
  profileId: number,
  fields: string[],
): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  if (fields.length === 0) return result;
  const select = Object.fromEntries(fields.map((f) => [f, true]));
  const row =
    role === 'student'
      ? ((await tx.student.findUnique({ where: { id: profileId }, select })) as unknown as Record<
          string,
          unknown
        > | null)
      : role === 'teacher'
        ? ((await tx.teacher.findUnique({ where: { id: profileId }, select })) as unknown as Record<
            string,
            unknown
          > | null)
        : ((await tx.staff.findUnique({ where: { id: profileId }, select })) as unknown as Record<
            string,
            unknown
          > | null);
  for (const field of fields) {
    const value = row?.[field];
    result[field] = value instanceof Date ? value.toISOString() : value != null ? String(value) : null;
  }
  return result;
}

// Áp dụng trường sửa trực tiếp. Tách theo từng bảng để giữ an toàn kiểu Prisma.
async function applyDirectFields(
  tx: Prisma.TransactionClient,
  role: string,
  profileId: number,
  applied: Record<string, unknown>,
): Promise<{ id: number }> {
  if (role === 'student') {
    const data: Prisma.StudentUpdateInput = {};
    if (applied.phone !== undefined) data.phone = (applied.phone as string) ?? null;
    if (applied.email !== undefined) data.email = (applied.email as string) ?? null;
    if (applied.address !== undefined) data.address = (applied.address as string) ?? null;
    if (applied.occupation !== undefined) data.occupation = (applied.occupation as string) ?? null;
    return tx.student.update({ where: { id: profileId }, data, select: { id: true } });
  }
  if (role === 'teacher') {
    const data: Prisma.TeacherUpdateInput = {};
    if (applied.phone !== undefined) data.phone = (applied.phone as string) ?? null;
    if (applied.email !== undefined) data.email = (applied.email as string) ?? null;
    if (applied.bio !== undefined) data.bio = (applied.bio as string) ?? null;
    return tx.teacher.update({ where: { id: profileId }, data, select: { id: true } });
  }
  const data: Prisma.StaffUpdateInput = {};
  if (applied.phone !== undefined) data.phone = (applied.phone as string) ?? null;
  if (applied.email !== undefined) data.email = (applied.email as string) ?? null;
  if (applied.bio !== undefined) data.bio = (applied.bio as string) ?? null;
  return tx.staff.update({ where: { id: profileId }, data, select: { id: true } });
}

async function readMyProfile(role: string, userId: number) {
  if (role === 'student') {
    const student = await prisma.student.findFirst({
      where: { userId, deletedAt: null },
      select: studentProfileSelect,
    });
    if (!student) throw HttpError.notFound('Không tìm thấy hồ sơ học viên');
    return studentProfileDto(student, await avatarUrlOf(userId));
  }
  if (role === 'teacher') {
    const teacher = await prisma.teacher.findFirst({
      where: { userId, deletedAt: null },
      select: teacherProfileSelect,
    });
    if (!teacher) throw HttpError.notFound('Không tìm thấy hồ sơ giáo viên');
    return teacherProfileDto(teacher, await avatarUrlOf(userId));
  }
  const staff = await prisma.staff.findFirst({
    where: { userId, deletedAt: null },
    select: staffProfileSelect,
  });
  if (!staff) throw HttpError.notFound('Không tìm thấy hồ sơ nhân viên');
  return staffProfileDto(staff, await avatarUrlOf(userId));
}

// ---------- Ảnh đại diện tài khoản ----------

export async function updateMyAvatar(caller: Caller, fileId: number) {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    select: { id: true, ownerType: true, ownerId: true },
  });
  if (!file || file.ownerType !== 'user' || file.ownerId !== caller.id) {
    throw HttpError.badRequest('Tệp không phải ảnh đại diện của bạn');
  }
  const updated = await prisma.user.update({
    where: { id: caller.id },
    data: { avatarFileId: file.id },
    select: { id: true, avatarFileId: true },
  });
  await writeAudit({
    userId: caller.id,
    action: 'update',
    tableName: 'users',
    recordId: caller.id,
    newData: { avatarFileId: file.id },
  });
  return { avatarUrl: `/api/files/${updated.avatarFileId}` };
}

// ---------- Profile change requests ----------

export async function listMyChangeRequests(caller: Caller, q: ListChangeRequestsQuery) {
  const where = { userId: caller.id, ...(q.status ? { status: q.status } : {}) };
  const [items, total] = await prisma.$transaction([
    prisma.profileChangeRequest.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.profileChangeRequest.count({ where }),
  ]);
  return { items, page: q.page, pageSize: q.pageSize, total, totalPages: Math.ceil(total / q.pageSize) };
}

export async function listChangeRequests(q: ListChangeRequestsQuery) {
  const where = q.status ? { status: q.status } : {};
  const [items, total] = await prisma.$transaction([
    prisma.profileChangeRequest.findMany({
      where,
      include: { user: { select: { username: true, fullName: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.profileChangeRequest.count({ where }),
  ]);
  return { items, page: q.page, pageSize: q.pageSize, total, totalPages: Math.ceil(total / q.pageSize) };
}

// Áp dụng trường đã duyệt. Tách theo bảng để giữ an toàn kiểu Prisma.
async function applyApprovedChange(
  tx: Prisma.TransactionClient,
  request: { userId: number; tableName: string; fieldName: string; newValue: string | null },
): Promise<void> {
  const { fieldName, newValue } = request;
  const value = fieldName === 'birthDate' && newValue ? new Date(newValue) : newValue;
  if (request.tableName === 'students') {
    const student = await tx.student.findFirst({
      where: { userId: request.userId, deletedAt: null },
      select: { id: true },
    });
    if (!student) throw HttpError.notFound('Hồ sơ học viên không còn tồn tại');
    const data: Prisma.StudentUpdateInput = {};
    if (fieldName === 'fullName') data.fullName = value as string;
    else if (fieldName === 'birthDate') data.birthDate = (value as Date) ?? null;
    else if (fieldName === 'identityNo') data.identityNo = (value as string) ?? null;
    else throw HttpError.badRequest('Trường không hỗ trợ duyệt');
    await tx.student.update({ where: { id: student.id }, data });
    return;
  }
  if (request.tableName === 'teachers') {
    const teacher = await tx.teacher.findFirst({
      where: { userId: request.userId, deletedAt: null },
      select: { id: true },
    });
    if (!teacher) throw HttpError.notFound('Hồ sơ giáo viên không còn tồn tại');
    const data: Prisma.TeacherUpdateInput = {};
    if (fieldName === 'certificate') data.certificate = (value as string) ?? null;
    else if (fieldName === 'specialty') data.specialty = (value as string) ?? null;
    else throw HttpError.badRequest('Trường không hỗ trợ duyệt');
    await tx.teacher.update({ where: { id: teacher.id }, data });
    return;
  }
  if (request.tableName === 'staff') {
    const staff = await tx.staff.findFirst({
      where: { userId: request.userId, deletedAt: null },
      select: { id: true },
    });
    if (!staff) throw HttpError.notFound('Hồ sơ nhân viên không còn tồn tại');
    const data: Prisma.StaffUpdateInput = {};
    if (fieldName === 'position') data.position = (value as string) ?? null;
    else if (fieldName === 'department') data.department = (value as string) ?? null;
    else throw HttpError.badRequest('Trường không hỗ trợ duyệt');
    await tx.staff.update({ where: { id: staff.id }, data });
    return;
  }
  throw HttpError.badRequest('Bảng không hỗ trợ duyệt yêu cầu');
}

// Định danh bản ghi hồ sơ theo bảng và user id — để audit ghi
// recordId là id bản ghi hồ sơ, nhất quán với thao tác sửa trực tiếp.
async function profileRecordId(
  tx: Prisma.TransactionClient,
  tableName: string,
  userId: number,
): Promise<number | null> {
  const where = { userId, deletedAt: null };
  if (tableName === 'students') {
    return (await tx.student.findFirst({ where, select: { id: true } }))?.id ?? null;
  }
  if (tableName === 'teachers') {
    return (await tx.teacher.findFirst({ where, select: { id: true } }))?.id ?? null;
  }
  if (tableName === 'staff') {
    return (await tx.staff.findFirst({ where, select: { id: true } }))?.id ?? null;
  }
  return null;
}

export async function reviewChangeRequest(
  requestId: number,
  input: ReviewChangeInput,
  reviewer: Caller,
  ip?: string,
) {
  return runInTx(async (tx) => {
    const request = await tx.profileChangeRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw HttpError.notFound('Không tìm thấy yêu cầu đổi hồ sơ');
    if (request.status !== 'PENDING') throw HttpError.conflict('Yêu cầu đã được xử lý');

    const recordId = (await profileRecordId(tx, request.tableName, request.userId)) ?? request.userId;

    const updated = await tx.profileChangeRequest.update({
      where: { id: requestId },
      data: {
        status: input.action === 'approve' ? 'APPROVED' : 'REJECTED',
        reviewedBy: reviewer.id,
        reviewedAt: new Date(),
      },
    });

    if (input.action === 'approve') {
      await applyApprovedChange(tx, request);
      // Trường nhạy cảm (identityNo): chỉ ghi tên trường, KHÔNG ghi giá trị
      // vào audit_logs — dữ liệu cá nhân nhạy cảm không ghi log/audit (BR-12).
      const newData: Record<string, unknown> = { fieldName: request.fieldName };
      if (!SENSITIVE_AUDIT_FIELDS.has(request.fieldName)) {
        newData.newValue = request.newValue;
      }
      await writeAudit(
        {
          userId: reviewer.id,
          action: 'approve',
          tableName: request.tableName,
          recordId,
          newData,
          ip,
        },
        tx,
      );
    } else {
      await writeAudit(
        {
          userId: reviewer.id,
          action: 'reject',
          tableName: request.tableName,
          recordId,
          newData: { fieldName: request.fieldName },
          ip,
        },
        tx,
      );
    }
    return updated;
  });
}

// Phase 8: Học viên - Danh sách ghi danh của mình (GET /api/me/enrollments)
export async function listMyEnrollments(caller: Caller, page = 1, pageSize = 20) {
  if (!caller.roles.includes('student')) {
    throw HttpError.forbidden('Chỉ học viên mới truy cập được');
  }
  const student = await prisma.student.findFirst({
    where: { userId: caller.id, deletedAt: null },
    select: { id: true },
  });
  if (!student) throw HttpError.notFound('Không tìm thấy hồ sơ học viên');

  const [items, total] = await prisma.$transaction([
    prisma.enrollment.findMany({
      where: { studentId: student.id },
      select: enrollmentSelect,
      orderBy: [{ enrolledAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.enrollment.count({ where: { studentId: student.id } }),
  ]);

  return {
    items: items.map(toDto),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

const enrollmentSelect = {
  id: true,
  studentId: true,
  classId: true,
  enrolledAt: true,
  startDate: true,
  expectedEndDate: true,
  totalSessions: true,
  tuitionAmount: true,
  status: true,
  pauseReason: true,
  class: { select: { id: true, classCode: true, name: true, courseId: true, course: { select: { id: true, name: true, level: true } } } },
} satisfies Prisma.EnrollmentSelect;

type EnrollmentRecord = Prisma.EnrollmentGetPayload<{ select: typeof enrollmentSelect }>;

function toDto(enrollment: EnrollmentRecord) {
  return {
    ...enrollment,
    className: enrollment.class?.name ?? null,
    classCode: enrollment.class?.classCode ?? null,
    courseName: enrollment.class?.course?.name ?? null,
    courseLevel: enrollment.class?.course?.level ?? null,
  };
}

// Phase 8: Học viên - Danh sách 64 buổi học kèm trạng thái điểm danh (GET /api/me/lessons)
export async function listMyLessons(caller: Caller, page = 1, pageSize = 100, from?: Date, to?: Date) {
  if (!caller.roles.includes('student')) {
    throw HttpError.forbidden('Chỉ học viên mới truy cập được');
  }
  const student = await prisma.student.findFirst({
    where: { userId: caller.id, deletedAt: null },
    select: { id: true },
  });
  if (!student) throw HttpError.notFound('Không tìm thấy hồ sơ học viên');

  // Lấy enrollment ACTIVE
  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId: student.id, status: 'ACTIVE' },
    select: { id: true, classId: true, totalSessions: true },
  });
  if (!enrollment) return { items: [], page: 1, pageSize, total: 0, totalPages: 0 };

  const predicates: Prisma.Sql[] = [
    Prisma.sql`cs.class_id = ${enrollment.classId}`,
    Prisma.sql`c.deleted_at IS NULL`,
  ];
  if (from) predicates.push(Prisma.sql`cs.date >= ${from}`);
  if (to) predicates.push(Prisma.sql`cs.date <= ${to}`);

  const where = Prisma.join(predicates, ' AND ');
  const [ids, countRows] = await prisma.$transaction([
    prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`SELECT cs.id FROM class_sessions cs
      JOIN classes c ON c.id = cs.class_id
      WHERE ${where}
      ORDER BY cs.date ASC, cs.lesson_no ASC, cs.id ASC
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`),
    prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT count(*)::bigint AS total FROM class_sessions cs
      JOIN classes c ON c.id = cs.class_id WHERE ${where}`),
  ]);

  const sessions = ids.length
    ? await prisma.classSession.findMany({
        where: { id: { in: ids.map(({ id }) => id) } },
        select: sessionSelect,
        orderBy: [{ date: 'asc' }, { lessonNo: 'asc' }, { id: 'asc' }],
      })
    : [];

  type SessionRecord = typeof sessions[0];
  const byId = new Map(sessions.map((s) => [s.id, s]));
  const rows = ids.map(({ id }) => byId.get(id)).filter((s): s is SessionRecord => !!s);

  // Lấy điểm danh của học viên này cho các buổi
  const sessionIds = rows.map((s) => s.id);
  const attendanceMap = new Map<number, { status: string | null; note: string | null; markedAt: Date | null }>();
  if (sessionIds.length > 0) {
    const marks = await prisma.attendance.findMany({
      where: { classSessionId: { in: sessionIds }, studentId: student.id },
      select: { classSessionId: true, status: true, note: true, markedAt: true },
    });
    for (const m of marks) {
      attendanceMap.set(m.classSessionId, { status: m.status, note: m.note, markedAt: m.markedAt });
    }
  }

  const total = Number(countRows[0]?.total ?? 0n);

  return {
    items: rows.map((row) => {
      const attendance = attendanceMap.get(row.id);
      return {
        sessionId: row.id,
        lessonNo: row.lessonNo,
        date: row.date,
        startTime: row.startTime,
        endTime: row.endTime,
        topic: row.topic,
        unit: row.unit,
        status: row.status,
        lockedAt: row.lockedAt,
        attendanceStatus: attendance?.status ?? null,
        attendanceNote: attendance?.note ?? null,
        attendanceMarkedAt: attendance?.markedAt ?? null,
      };
    }),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

const sessionSelect = {
  id: true,
  classId: true,
  lessonNo: true,
  date: true,
  startTime: true,
  endTime: true,
  roomId: true,
  teacherId: true,
  topic: true,
  unit: true,
  note: true,
  status: true,
  cancelReason: true,
  lockedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ClassSessionSelect;
