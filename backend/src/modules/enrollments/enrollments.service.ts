import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { HttpError } from '../../utils/httpError';
import { writeAudit } from '../../utils/audit';
import type { Caller } from '../../utils/caller';
import type {
  CreateEnrollmentInput,
  EnrollmentStatusInput,
  FreezeEnrollmentInput,
  ListEnrollmentsQuery,
  MakeupSessionInput,
  TransferClassInput,
  UnfreezeEnrollmentInput,
  UpdateEnrollmentInput,
} from './enrollments.schema';

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
  transferredFromEnrollmentId: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  student: { select: { id: true, studentCode: true, fullName: true, phone: true, email: true } },
  class: { select: { id: true, classCode: true, name: true, courseId: true } },
} satisfies Prisma.EnrollmentSelect;

type EnrollmentRecord = Prisma.EnrollmentGetPayload<{ select: typeof enrollmentSelect }>;

function toDto(enrollment: EnrollmentRecord) {
  return {
    ...enrollment,
    studentName: enrollment.student?.fullName ?? null,
    studentCode: enrollment.student?.studentCode ?? null,
    className: enrollment.class?.name ?? null,
    classCode: enrollment.class?.classCode ?? null,
  };
}

function canManageAll(caller: Caller) {
  return caller.roles.some((role) => role === 'admin' || role === 'staff');
}

async function assertStudentExists(studentId: number) {
  const student = await prisma.student.findFirst({ where: { id: studentId, deletedAt: null }, select: { id: true } });
  if (!student) throw HttpError.badRequest('Học viên không tồn tại');
}

async function assertClassExists(classId: number) {
  const classRecord = await prisma.class.findFirst({ where: { id: classId, deletedAt: null }, select: { id: true, maxStudents: true, courseId: true } });
  if (!classRecord) throw HttpError.badRequest('Lớp học không tồn tại');
  return classRecord;
}

async function getActiveEnrollmentCount(classId: number) {
  const count = await prisma.enrollment.count({ where: { classId, status: 'ACTIVE' } });
  return count;
}

export async function listEnrollments(input: ListEnrollmentsQuery, caller: Caller) {
  const predicates: Prisma.Sql[] = [];

  if (input.studentId) predicates.push(Prisma.sql`e.student_id = ${input.studentId}`);
  if (input.classId) predicates.push(Prisma.sql`e.class_id = ${input.classId}`);
  if (input.status) predicates.push(Prisma.sql`e.status = ${input.status}::"EnrollmentStatus"`);

  // Phân quyền: giáo viên chỉ thấy ghi danh lớp mình
  if (!canManageAll(caller)) {
    if (caller.roles.includes('teacher')) {
      predicates.push(Prisma.sql`c.teacher_id = ${caller.id}`);
    } else if (caller.roles.includes('student')) {
      const user = await prisma.user.findUnique({ where: { id: caller.id }, select: { student: { select: { id: true } } } });
      const studentId = user?.student?.id;
      if (!studentId) return { items: [], page: 1, pageSize: input.pageSize, total: 0, totalPages: 0 };
      predicates.push(Prisma.sql`e.student_id = ${studentId}`);
    } else {
      return { items: [], page: 1, pageSize: input.pageSize, total: 0, totalPages: 0 };
    }
  }

  const where = Prisma.join(predicates, ' AND ');
  const [ids, countRows] = await prisma.$transaction([
    prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`SELECT e.id FROM enrollments e
      JOIN classes c ON c.id = e.class_id
      WHERE ${where}
      ORDER BY e.enrolled_at DESC, e.id DESC LIMIT ${input.pageSize} OFFSET ${(input.page - 1) * input.pageSize}`),
    prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT count(*)::bigint AS total FROM enrollments e
      JOIN classes c ON c.id = e.class_id WHERE ${where}`),
  ]);

  const enrollments = ids.length
    ? await prisma.enrollment.findMany({
        where: { id: { in: ids.map(({ id }) => id) } },
        select: enrollmentSelect,
        orderBy: [{ enrolledAt: 'desc' }, { id: 'desc' }],
      })
    : [];

  const byId = new Map(enrollments.map((e) => [e.id, e]));
  const rows = ids.map(({ id }) => byId.get(id)).filter((e): e is EnrollmentRecord => !!e);
  const total = Number(countRows[0]?.total ?? 0n);

  return {
    items: rows.map(toDto),
    page: input.page,
    pageSize: input.pageSize,
    total,
    totalPages: Math.ceil(total / input.pageSize),
  };
}

export async function getEnrollment(id: number, caller: Caller) {
  const enrollment = await prisma.enrollment.findFirst({ where: { id }, select: enrollmentSelect });
  if (!enrollment) throw HttpError.notFound('Không tìm thấy ghi danh');

  if (!canManageAll(caller)) {
    if (caller.roles.includes('teacher')) {
      const classRecord = await prisma.class.findFirst({ where: { id: enrollment.classId, teacherId: caller.id }, select: { id: true } });
      if (!classRecord) throw HttpError.forbidden('Chỉ xem được ghi danh lớp mình phụ trách');
    } else if (caller.roles.includes('student')) {
      if (enrollment.studentId !== caller.id) throw HttpError.forbidden('Chỉ xem được ghi danh của chính mình');
    } else {
      throw HttpError.forbidden('Không có quyền xem ghi danh');
    }
  }

  return toDto(enrollment);
}

export async function createEnrollment(actorId: number, input: CreateEnrollmentInput, ip?: string) {
  await assertStudentExists(input.studentId);
  const classRecord = await assertClassExists(input.classId);

  // Kiểm tra sĩ số an toàn (race condition safe)
  const activeCount = await getActiveEnrollmentCount(input.classId);
  if (activeCount >= classRecord.maxStudents) {
    throw HttpError.conflict('Lớp đã đủ sĩ số', 'CLASS_FULL');
  }

  // Kiểm tra trùng ghi danh ACTIVE cùng lớp
  const existing = await prisma.enrollment.findFirst({
    where: { studentId: input.studentId, classId: input.classId, status: 'ACTIVE' },
    select: { id: true },
  });
  if (existing) throw HttpError.conflict('Học viên đã ghi danh vào lớp này', 'DUPLICATE_ENROLLMENT');

  // Lấy tổng buổi từ khóa học
  const course = await prisma.course.findUnique({ where: { id: classRecord.courseId }, select: { totalSessions: true } });
  if (!course) throw HttpError.badRequest('Khóa học không tồn tại');

  const created = await prisma.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.create({
      data: {
        studentId: input.studentId,
        classId: input.classId,
        startDate: input.startDate ?? null,
        expectedEndDate: input.expectedEndDate ?? null,
        totalSessions: course.totalSessions,
        tuitionAmount: input.tuitionAmount ?? 0,
        status: 'ACTIVE',
        createdById: actorId,
      },
      select: enrollmentSelect,
    });

    // Tạo invoice nếu có học phí
    if (enrollment.tuitionAmount > 0) {
      const year = new Date().getFullYear();
      const seqName = `invoice-${year}`;
      const seq = await tx.sequence.upsert({
        where: { name: seqName },
        update: { lastValue: { increment: 1 } },
        create: { name: seqName, year, lastValue: 1 },
      });
      const invoiceNo = `PT${String(year).slice(-2)}${String(seq.lastValue).padStart(5, '0')}`;

      await tx.invoice.create({
        data: {
          invoiceNo,
          enrollmentId: enrollment.id,
          subtotalAmount: enrollment.tuitionAmount,
          discountAmount: input.discountAmount ?? 0,
          totalAmount: enrollment.tuitionAmount - (input.discountAmount ?? 0),
          dueDate: enrollment.startDate ?? new Date(),
          status: 'UNPAID',
          createdBy: actorId,
        },
      });
    }

    await writeAudit(
      { userId: actorId, action: 'create', tableName: 'enrollments', recordId: enrollment.id, newData: toDto(enrollment), ip },
      tx,
    );

    return enrollment;
  });

  return toDto(created);
}

export async function updateEnrollment(enrollmentId: number, input: UpdateEnrollmentInput, actorId: number, ip?: string) {
  const old = await prisma.enrollment.findFirst({ where: { id: enrollmentId }, select: enrollmentSelect });
  if (!old) throw HttpError.notFound('Không tìm thấy ghi danh');

  if (!canManageAll({ id: actorId, roles: ['admin'] })) {
    throw HttpError.forbidden('Chỉ admin/nhân viên được sửa ghi danh');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.update({
      where: { id: enrollmentId },
      data: input,
      select: enrollmentSelect,
    });
    await writeAudit(
      { userId: actorId, action: 'update', tableName: 'enrollments', recordId: enrollmentId, oldData: toDto(old), newData: toDto(enrollment), ip },
      tx,
    );
    return enrollment;
  });

  return toDto(updated);
}

export async function setEnrollmentStatus(enrollmentId: number, input: EnrollmentStatusInput, actorId: number, ip?: string) {
  const old = await prisma.enrollment.findFirst({ where: { id: enrollmentId }, select: { id: true, status: true } });
  if (!old) throw HttpError.notFound('Không tìm thấy ghi danh');

  if (!canManageAll({ id: actorId, roles: ['admin'] })) {
    throw HttpError.forbidden('Chỉ admin/nhân viên được đổi trạng thái ghi danh');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.update({ where: { id: enrollmentId }, data: { status: input.status } });
    await writeAudit(
      { userId: actorId, action: 'update_status', tableName: 'enrollments', recordId: enrollmentId, oldData: { status: old.status }, newData: { status: input.status }, ip },
      tx,
    );
    return enrollment;
  });

  return { id: updated.id, status: updated.status };
}

export async function transferClass(enrollmentId: number, input: TransferClassInput, actorId: number, ip?: string) {
  const old = await prisma.enrollment.findFirst({ where: { id: enrollmentId }, select: enrollmentSelect });
  if (!old) throw HttpError.notFound('Không tìm thấy ghi danh');

  if (!canManageAll({ id: actorId, roles: ['admin'] })) {
    throw HttpError.forbidden('Chỉ admin/nhân viên được chuyển lớp');
  }

  const newClass = await assertClassExists(input.newClassId);
  const activeCount = await getActiveEnrollmentCount(input.newClassId);
  if (activeCount >= newClass.maxStudents) {
    throw HttpError.conflict('Lớp mới đã đủ sĩ số', 'CLASS_FULL');
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Đóng ghi danh cũ
    const closed = await tx.enrollment.update({
      where: { id: enrollmentId },
      data: { status: 'TRANSFERRED', expectedEndDate: input.transferDate },
      select: enrollmentSelect,
    });

    // Tạo ghi danh mới
    const course = await prisma.course.findUnique({ where: { id: newClass.courseId }, select: { totalSessions: true } });
    if (!course) throw HttpError.badRequest('Khóa học không tồn tại');

    const newEnrollment = await tx.enrollment.create({
      data: {
        studentId: old.studentId,
        classId: input.newClassId,
        startDate: input.transferDate,
        expectedEndDate: null,
        totalSessions: course.totalSessions,
        tuitionAmount: old.tuitionAmount,
        status: 'ACTIVE',
        createdById: actorId,
        transferredFromEnrollmentId: enrollmentId,
      },
      select: enrollmentSelect,
    });

    await writeAudit(
      { userId: actorId, action: 'transfer', tableName: 'enrollments', recordId: enrollmentId, oldData: toDto(old), newData: { newClassId: input.newClassId, newEnrollmentId: newEnrollment.id }, ip },
      tx,
    );

    return { closed: toDto(closed), new: toDto(newEnrollment) };
  });

  return updated;
}

export async function freezeEnrollment(enrollmentId: number, input: FreezeEnrollmentInput, actorId: number, ip?: string) {
  const old = await prisma.enrollment.findFirst({ where: { id: enrollmentId }, select: enrollmentSelect });
  if (!old) throw HttpError.notFound('Không tìm thấy ghi danh');
  if (old.status === 'FROZEN') throw HttpError.conflict('Ghi danh đã bị bảo lưu');

  if (!canManageAll({ id: actorId, roles: ['admin'] })) {
    throw HttpError.forbidden('Chỉ admin/nhân viên được bảo lưu ghi danh');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.update({
      where: { id: enrollmentId },
      data: { status: 'FROZEN', pauseReason: input.reason },
      select: enrollmentSelect,
    });

    await tx.enrollmentFreeze.create({
      data: {
        enrollmentId,
        fromDate: input.fromDate,
        expectedToDate: input.expectedToDate ?? null,
        reason: input.reason,
        approvedBy: actorId,
      },
    });

    await writeAudit(
      { userId: actorId, action: 'freeze', tableName: 'enrollments', recordId: enrollmentId, oldData: { status: old.status }, newData: { status: 'FROZEN', fromDate: input.fromDate, expectedToDate: input.expectedToDate }, ip },
      tx,
    );

    return enrollment;
  });

  return toDto(updated);
}

export async function unfreezeEnrollment(enrollmentId: number, input: UnfreezeEnrollmentInput, actorId: number, ip?: string) {
  const old = await prisma.enrollment.findFirst({ where: { id: enrollmentId }, select: enrollmentSelect });
  if (!old) throw HttpError.notFound('Không tìm thấy ghi danh');
  if (old.status !== 'FROZEN') throw HttpError.conflict('Ghi danh không đang bảo lưu');

  if (!canManageAll({ id: actorId, roles: ['admin'] })) {
    throw HttpError.forbidden('Chỉ admin/nhân viên được kết thúc bảo lưu');
  }

  // Check if unfreezing would violate unique constraint (student already has ACTIVE enrollment in same class)
  const activeConflict = await prisma.enrollment.findFirst({
    where: {
      studentId: old.studentId,
      classId: old.classId,
      status: 'ACTIVE',
      id: { not: enrollmentId },
    },
    select: { id: true },
  });
  if (activeConflict) {
    throw HttpError.conflict('Học viên đã có ghi danh ACTIVE khác trong lớp này. Hãy kết thúc ghi danh đó trước khi mở bảo lưu.', 'ACTIVE_ENROLLMENT_EXISTS');
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.enrollmentFreeze.updateMany({
      where: { enrollmentId, expectedToDate: null },
      data: { expectedToDate: input.toDate ?? new Date() },
    });

    const enrollment = await tx.enrollment.update({
      where: { id: enrollmentId },
      data: { status: 'ACTIVE', pauseReason: input.reason ?? null },
      select: enrollmentSelect,
    });

    await writeAudit(
      { userId: actorId, action: 'unfreeze', tableName: 'enrollments', recordId: enrollmentId, oldData: { status: 'FROZEN' }, newData: { status: 'ACTIVE', toDate: input.toDate }, ip },
      tx,
    );

    return enrollment;
  });

  return toDto(updated);
}

export async function createMakeupSession(enrollmentId: number, input: MakeupSessionInput, actorId: number, ip?: string) {
  const enrollment = await prisma.enrollment.findFirst({ where: { id: enrollmentId }, select: { id: true, studentId: true, classId: true } });
  if (!enrollment) throw HttpError.notFound('Không tìm thấy ghi danh');

  if (!canManageAll({ id: actorId, roles: ['admin'] })) {
    throw HttpError.forbidden('Chỉ admin/nhân viên được tạo buổi học bù');
  }

  const originalSession = await prisma.classSession.findUnique({
    where: { id: input.originalSessionId },
    select: { id: true, classId: true, lessonNo: true },
  });
  if (!originalSession) throw HttpError.notFound('Không tìm thấy buổi học gốc');
  if (originalSession.classId !== enrollment.classId) throw HttpError.badRequest('Buổi học không thuộc lớp của ghi danh này');

  let startTime = input.startTime;
  let endTime = input.endTime;

  // Auto-fill từ timeSlotId nếu có
  if (input.timeSlotId && (!startTime || !endTime)) {
    const slot = await prisma.timeSlot.findUnique({
      where: { id: input.timeSlotId },
      select: { startTime: true, endTime: true },
    });
    if (!slot) throw HttpError.badRequest('Ca học không tồn tại');
    startTime = slot.startTime;
    endTime = slot.endTime;
  }

  if (!startTime || !endTime) {
    throw HttpError.badRequest('Thiếu giờ học: cần timeSlotId HOẶC (startTime + endTime)');
  }

  const makeup = await prisma.$transaction(async (tx) => {
    const makeupSession = await tx.classSession.create({
      data: {
        classId: enrollment.classId,
        lessonNo: 9999, // Buổi bù: dùng lessonNo lớn để thỏa CHECK (lesson_no > 0)
        date: input.makeupDate,
        startTime,
        endTime,
        roomId: input.roomId ?? null,
        teacherId: input.teacherId ?? null,
        note: input.note ?? 'Buổi học bù',
        status: 'SCHEDULED',
      },
      select: { id: true },
    });

    await tx.makeupSession.create({
      data: {
        studentId: enrollment.studentId,
        originalSessionId: input.originalSessionId,
        makeupSessionId: makeupSession.id,
        status: 'SCHEDULED',
        note: input.note ?? null,
      },
    });

    await writeAudit(
      { userId: actorId, action: 'create_makeup', tableName: 'makeup_sessions', recordId: `${enrollmentId}:${makeupSession.id}`, newData: { enrollmentId, originalSessionId: input.originalSessionId, makeupSessionId: makeupSession.id }, ip },
      tx,
    );

    return makeupSession;
  });

  return makeup;
}