import { prisma } from '../../config/prisma';
import { writeAudit } from '../../utils/audit';
import { HttpError } from '../../utils/httpError';
import type { MarkAttendanceInput } from './attendance.schema';

interface Actor {
  id: number;
  roles: string[];
}

// Mẫu kiểm tra quyền THEO DỮ LIỆU: admin/nhân viên được truy cập mọi buổi,
// giáo viên chỉ được truy cập buổi thuộc lớp mình phụ trách.
async function loadSessionForActor(sessionId: number, actor: Actor) {
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: { class: { select: { id: true, name: true, classCode: true, teacherId: true } } },
  });
  if (!session) throw HttpError.notFound('Không tìm thấy buổi học');

  const privileged = actor.roles.includes('admin') || actor.roles.includes('staff');
  if (!privileged) {
    const teacher = await prisma.teacher.findUnique({ where: { userId: actor.id }, select: { id: true } });
    if (!teacher || teacher.id !== session.class.teacherId) {
      throw HttpError.forbidden('Bạn không phụ trách lớp này');
    }
  }
  return session;
}

export async function getSessionAttendance(sessionId: number, actor: Actor) {
  const session = await loadSessionForActor(sessionId, actor);

  const [enrollments, marks] = await Promise.all([
    prisma.enrollment.findMany({
      where: { classId: session.classId, status: 'ACTIVE' },
      select: { student: { select: { id: true, studentCode: true, fullName: true } } },
      orderBy: { student: { fullName: 'asc' } },
    }),
    prisma.attendance.findMany({ where: { classSessionId: sessionId } }),
  ]);

  const markByStudent = new Map(marks.map((m) => [m.studentId, m]));

  return {
    session: {
      id: session.id,
      lessonNo: session.lessonNo,
      date: session.date,
      status: session.status,
      locked: !!session.lockedAt,
      class: session.class,
    },
    students: enrollments.map((e) => {
      const m = markByStudent.get(e.student.id);
      return { ...e.student, status: m?.status ?? null, note: m?.note ?? null, markedAt: m?.markedAt ?? null };
    }),
  };
}

export async function markAttendance(sessionId: number, input: MarkAttendanceInput, actor: Actor, ip?: string) {
  const session = await loadSessionForActor(sessionId, actor);

  if (session.status === 'CANCELLED') throw HttpError.badRequest('Buổi học đã bị hủy');
  // Đã khóa thì chỉ admin được sửa
  if (session.lockedAt && !actor.roles.includes('admin')) {
    throw HttpError.locked('Buổi học đã khóa điểm danh, vui lòng nhờ quản trị viên mở khóa');
  }

  // Chỉ được điểm danh học viên đang học ở lớp này
  const enrolled = await prisma.enrollment.findMany({
    where: { classId: session.classId, status: 'ACTIVE' },
    select: { studentId: true },
  });
  const enrolledIds = new Set(enrolled.map((e) => e.studentId));
  const invalid = input.records.filter((r) => !enrolledIds.has(r.studentId));
  if (invalid.length > 0) {
    throw HttpError.badRequest(`Có học viên không thuộc lớp này: ${invalid.map((r) => r.studentId).join(', ')}`);
  }

  await prisma.$transaction(async (tx) => {
    for (const r of input.records) {
      await tx.attendance.upsert({
        where: { classSessionId_studentId: { classSessionId: sessionId, studentId: r.studentId } },
        create: {
          classSessionId: sessionId,
          studentId: r.studentId,
          status: r.status,
          note: r.note,
          method: 'MANUAL',
          markedById: actor.id,
        },
        update: {
          status: r.status,
          note: r.note ?? null,
          method: 'MANUAL',
          markedById: actor.id,
          markedAt: new Date(),
        },
      });
    }

    if (session.status === 'SCHEDULED') {
      await tx.classSession.update({ where: { id: sessionId }, data: { status: 'HELD' } });
    }

    await writeAudit(
      {
        userId: actor.id,
        action: 'mark_attendance',
        tableName: 'attendance',
        recordId: sessionId,
        newData: input.records,
        ip,
      },
      tx,
    );
  });

  return getSessionAttendance(sessionId, actor);
}
