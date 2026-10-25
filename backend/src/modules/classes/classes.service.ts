import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { HttpError } from '../../utils/httpError';
import { writeAudit } from '../../utils/audit';
import type { Caller } from '../../utils/caller';
import type {
  AddSessionInput,
  ClassStatusInput,
  ConflictsQuery,
  CreateClassInput,
  GenerateSessionsInput,
  ListClassesQuery,
  ScheduleCreateInput,
  ScheduleUpdateInput,
  TeacherChangeInput,
  TimetableQuery,
  UpdateClassInput,
  UpdateSessionInput,
} from './classes.schema';

const classSelect = {
  id: true,
  branchId: true,
  courseId: true,
  classCode: true,
  name: true,
  teacherId: true,
  roomId: true,
  advisorId: true,
  startDate: true,
  expectedEndDate: true,
  maxStudents: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  course: { select: { code: true, name: true, level: true } },
  teacher: { select: { id: true, teacherCode: true, fullName: true } },
  room: { select: { id: true, name: true, capacity: true } },
} satisfies Prisma.ClassSelect;

type ClassRecord = Prisma.ClassGetPayload<{ select: typeof classSelect }>;

function toDto(classRecord: ClassRecord) {
  return {
    ...classRecord,
    deleted: classRecord.deletedAt !== null,
    courseName: classRecord.course?.name ?? null,
    courseCode: classRecord.course?.code ?? null,
    level: classRecord.course?.level ?? null,
    teacherName: classRecord.teacher?.fullName ?? null,
    teacherCode: classRecord.teacher?.teacherCode ?? null,
    roomName: classRecord.room?.name ?? null,
    advisorName: null,
  };
}

function canManageAll(caller: Caller) {
  return caller.roles.some((role) => role === 'admin' || role === 'staff');
}

// Lấy teacher profile ID từ caller (user ID).
async function getTeacherId(caller: Caller): Promise<number | null> {
  if (!caller.roles.includes('teacher')) return null;
  const teacher = await prisma.teacher.findFirst({
    where: { userId: caller.id, deletedAt: null },
    select: { id: true },
  });
  return teacher?.id ?? null;
}

// Giáo viên chỉ thấy lớp mình phụ trách (chính); admin/nhân viên thấy tất cả.
async function scopePredicate(caller: Caller): Promise<Prisma.Sql> {
  if (canManageAll(caller)) return Prisma.empty;
  const teacherId = await getTeacherId(caller);
  if (!teacherId) return Prisma.sql`1=0`; // Không phải giáo viên -> không thấy gì
  return Prisma.sql`c.teacher_id = ${teacherId}`;
}

export async function listClasses(input: ListClassesQuery, caller: Caller) {
  const predicates: Prisma.Sql[] = [
    input.onlyDeleted === 'true'
      ? Prisma.sql`c.deleted_at IS NOT NULL`
      : Prisma.sql`c.deleted_at IS NULL`,
    await scopePredicate(caller),
  ];
  if (input.status) predicates.push(Prisma.sql`c.status = ${input.status}::class_status`);
  if (input.courseId) predicates.push(Prisma.sql`c.course_id = ${input.courseId}`);
  if (input.teacherId) predicates.push(Prisma.sql`c.teacher_id = ${input.teacherId}`);
  if (input.level) predicates.push(Prisma.sql`co.level = ${input.level}`);
  if (input.query)
    predicates.push(Prisma.sql`ttnn_unaccent(lower(concat_ws(' ', c.name, c.class_code)))
      LIKE '%' || ttnn_unaccent(lower(${input.query})) || '%'`);
  const where = Prisma.join(predicates, ' AND ');
  const [ids, countRows] = await prisma.$transaction([
    prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`SELECT c.id FROM classes c
      JOIN courses co ON co.id = c.course_id
      WHERE ${where}
      ORDER BY c.start_date DESC, c.id DESC LIMIT ${input.pageSize} OFFSET ${(input.page - 1) * input.pageSize}`),
    prisma.$queryRaw<Array<{ total: bigint }>>(
      Prisma.sql`SELECT count(*)::bigint AS total FROM classes c
        JOIN courses co ON co.id = c.course_id WHERE ${where}`,
    ),
  ]);
  const classes = ids.length
    ? await prisma.class.findMany({
        where: { id: { in: ids.map(({ id }) => id) } },
        select: classSelect,
        orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
      })
    : [];
  const byId = new Map(classes.map((classRecord) => [classRecord.id, classRecord]));
  const rows = ids.map(({ id }) => byId.get(id)).filter((c): c is ClassRecord => !!c);
  const total = Number(countRows[0]?.total ?? 0n);
  return {
    items: rows.map(toDto),
    page: input.page,
    pageSize: input.pageSize,
    total,
    totalPages: Math.ceil(total / input.pageSize),
  };
}

async function findClassOrThrow(id: number, caller: Caller) {
  const classRecord = await prisma.class.findUnique({ where: { id }, select: classSelect });
  if (!classRecord || classRecord.deletedAt) throw HttpError.notFound('Không tìm thấy lớp học');
  if (!canManageAll(caller)) {
    const teacherId = await getTeacherId(caller);
    if (!teacherId || classRecord.teacherId !== teacherId) {
      throw HttpError.forbidden('Chỉ xem được lớp mình phụ trách');
    }
  }
  return classRecord;
}

export async function getClass(id: number, caller: Caller) {
  return toDto(await findClassOrThrow(id, caller));
}

async function assertExists(id: number, table: 'teacher' | 'room' | 'staff' | 'timeSlot', label: string) {
  let record: { id: number } | null = null;
  if (table === 'teacher') {
    record = await prisma.teacher.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  } else if (table === 'room') {
    record = await prisma.room.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  } else if (table === 'staff') {
    record = await prisma.staff.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  } else if (table === 'timeSlot') {
    record = await prisma.timeSlot.findFirst({ where: { id }, select: { id: true } });
  }
  if (!record) throw HttpError.badRequest(`${label} không tồn tại`);
}

// Kiểm tra trùng phòng / trùng giáo viên theo tuần (BR-02).
// Giờ "HH:mm" so sánh chuỗi được vì đủ 0 ở đầu.
// Hỗ trợ auto-fill từ timeSlotId (giống createClass).
export async function checkConflicts(input: ConflictsQuery) {
  if (!input.roomId && !input.teacherId) return { items: [] };

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

  const predicates: Prisma.Sql[] = [
    Prisma.sql`cs.weekday = ${input.weekday}`,
    Prisma.sql`cs.start_time < ${endTime}`,
    Prisma.sql`cs.end_time > ${startTime}`,
    Prisma.sql`c.deleted_at IS NULL`,
  ];
  if (input.excludeClassId) predicates.push(Prisma.sql`c.id != ${input.excludeClassId}`);
  const overlap: Prisma.Sql[] = [];
  if (input.roomId) overlap.push(Prisma.sql`cs.room_id = ${input.roomId}`);
  if (input.teacherId) overlap.push(Prisma.sql`c.teacher_id = ${input.teacherId}`);
  // Bọc trong ngoặc để tránh lỗi ưu tiên toán tử AND/OR trong SQL
  predicates.push(Prisma.sql`(${Prisma.join(overlap, ' OR ')})`);
  const rows = await prisma.$queryRaw<
    Array<{ class_id: number; class_name: string; class_code: string; weekday: number; start_time: string; end_time: string }>
  >(Prisma.sql`SELECT c.id AS class_id, c.name AS class_name, c.class_code AS class_code,
      cs.weekday, cs.start_time, cs.end_time
    FROM class_schedules cs JOIN classes c ON c.id = cs.class_id
    WHERE ${Prisma.join(predicates, ' AND ')}`);
  return {
    items: rows.map((row) => ({
      classId: row.class_id,
      className: row.class_name,
      classCode: row.class_code,
      weekday: row.weekday,
      startTime: row.start_time,
      endTime: row.end_time,
    })),
  };
}

async function assertNoConflicts(input: ConflictsQuery) {
  const { items } = await checkConflicts(input);
  if (items.length > 0) {
    const detail = items
      .map((item) => `${item.className} (${item.classCode})`)
      .join(', ');
    throw HttpError.conflict(
      `Trùng lịch với lớp: ${detail}`,
      'SCHEDULE_CONFLICT',
    );
  }
}

// Sinh buổi học từ thời khóa biểu tuần: duyệt ngày từ startDate,
 // mỗi ngày trùng weekday của schedule tạo 1 buổi, dừng khi đủ totalSessions.
 // Bỏ qua các ngày trong skipHolidays (Set của chuỗi YYYY-MM-DD).
 async function generateSessions(
   tx: Prisma.TransactionClient,
   classId: number,
   startDate: Date,
   schedules: Array<{ weekday: number; startTime: string; endTime: string; roomId: number | null }>,
   totalSessions: number,
   skipHolidays?: Set<string>,
 ) {
   const sessions: Prisma.ClassSessionCreateManyInput[] = [];
   const cursor = new Date(startDate);
   const cap = new Date(startDate);
   cap.setMonth(cap.getMonth() + 24); // giới hạn duyệt 24 tháng
   let lessonNo = 1;
   while (lessonNo <= totalSessions && cursor <= cap) {
     const weekday = cursor.getDay(); // 0 = Chủ Nhật, đúng quy ước schema
     const dateKey = cursor.toISOString().split('T')[0];
     if (skipHolidays?.has(dateKey)) {
       cursor.setDate(cursor.getDate() + 1);
       continue;
     }
     for (const schedule of schedules) {
       if (schedule.weekday !== weekday || lessonNo > totalSessions) continue;
       sessions.push({
         classId,
         lessonNo,
         date: new Date(cursor), // clone to avoid mutation issues
         startTime: schedule.startTime,
         endTime: schedule.endTime,
         roomId: schedule.roomId,
       });
       lessonNo += 1;
     }
     cursor.setDate(cursor.getDate() + 1);
   }
   if (sessions.length > 0) await tx.classSession.createMany({ data: sessions });
 }

export async function createClass(actorId: number, input: CreateClassInput, ip?: string) {
  const course = await prisma.course.findFirst({
    where: { id: input.courseId, deletedAt: null },
    select: { id: true, totalSessions: true },
  });
  if (!course) throw HttpError.badRequest('Khóa học không tồn tại');
  await assertExists(input.teacherId, 'teacher', 'Giáo viên');
  if (input.roomId) await assertExists(input.roomId, 'room', 'Phòng học');
  if (input.advisorId) await assertExists(input.advisorId, 'staff', 'Nhân viên tư vấn');

  // Validate timeSlotId trong schedules + check trùng lịch
  // Build array of normalized schedules with filled startTime/endTime
  const normalizedSchedules: Array<{
    weekday: number;
    startTime: string;
    endTime: string;
    roomId: number | null;
    timeSlotId: number | null;
  }> = await Promise.all(
    input.schedules.map(async (schedule) => {
      let startTime = schedule.startTime;
      let endTime = schedule.endTime;

      if (schedule.timeSlotId && (!startTime || !endTime)) {
        const slot = await prisma.timeSlot.findUnique({
          where: { id: schedule.timeSlotId },
          select: { startTime: true, endTime: true },
        });
        if (!slot) throw HttpError.badRequest('Ca học không tồn tại');
        startTime = slot.startTime;
        endTime = slot.endTime;
      }

      if (!startTime || !endTime) {
        throw HttpError.badRequest('Thiếu giờ học: cần timeSlotId HOẶC (startTime + endTime)');
      }

      if (schedule.timeSlotId) await assertExists(schedule.timeSlotId, 'timeSlot', 'Ca học');
      if (schedule.roomId) await assertExists(schedule.roomId, 'room', 'Phòng học');
      await assertNoConflicts({
        weekday: schedule.weekday,
        startTime,
        endTime,
        roomId: schedule.roomId ?? undefined,
        teacherId: input.teacherId,
      });

      return {
        weekday: schedule.weekday,
        startTime: startTime!,
        endTime: endTime!,
        roomId: schedule.roomId ?? null,
        timeSlotId: schedule.timeSlotId ?? null,
      };
    })
  );

  const created = await prisma.$transaction(async (tx) => {
    const classRecord = await tx.class.create({
      data: {
        courseId: input.courseId,
        classCode: input.classCode,
        name: input.name,
        teacherId: input.teacherId,
        roomId: input.roomId ?? null,
        advisorId: input.advisorId ?? null,
        startDate: input.startDate,
        expectedEndDate: input.expectedEndDate ?? null,
        maxStudents: input.maxStudents,
        status: input.status,
      },
      select: classSelect,
    });
    // Lịch sử giáo viên: giáo viên chính từ ngày khai giảng.
    await tx.classTeacher.create({
      data: {
        classId: classRecord.id,
        teacherId: input.teacherId,
        role: 'MAIN',
        fromDate: input.startDate,
      },
    });
    const schedules = await Promise.all(
      normalizedSchedules.map((schedule) =>
        tx.classSchedule.create({
          data: {
            classId: classRecord.id,
            weekday: schedule.weekday,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            roomId: schedule.roomId,
            timeSlotId: schedule.timeSlotId,
          },
          select: { id: true },
        }),
      ),
    );
    await generateSessions(
      tx,
      classRecord.id,
      input.startDate,
      normalizedSchedules.map((schedule) => ({
        weekday: schedule.weekday,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        roomId: schedule.roomId,
      })),
      course.totalSessions,
    );
    await writeAudit(
      {
        userId: actorId,
        action: 'create',
        tableName: 'classes',
        recordId: classRecord.id,
        newData: { ...toDto(classRecord), schedules: schedules.length },
        ip,
      },
      tx,
    );
    return classRecord;
  });
  return toDto(created);
}

export async function updateClass(actorId: number, classId: number, input: UpdateClassInput, ip?: string) {
  const old = await findClassOrThrow(classId, { id: actorId, roles: ['admin'] });
  if (input.teacherId) await assertExists(input.teacherId, 'teacher', 'Giáo viên');
  if (input.roomId) await assertExists(input.roomId, 'room', 'Phòng học');
  if (input.advisorId) await assertExists(input.advisorId, 'staff', 'Nhân viên tư vấn');
  const updated = await prisma.$transaction(async (tx) => {
    const classRecord = await tx.class.update({
      where: { id: classId },
      data: input,
      select: classSelect,
    });
    await writeAudit(
      {
        userId: actorId,
        action: 'update',
        tableName: 'classes',
        recordId: classId,
        oldData: toDto(old),
        newData: toDto(classRecord),
        ip,
      },
      tx,
    );
    return classRecord;
  });
  return toDto(updated);
}

export async function setClassStatus(actorId: number, classId: number, input: ClassStatusInput, ip?: string) {
  const old = await findClassOrThrow(classId, { id: actorId, roles: ['admin'] });
  const updated = await prisma.$transaction(async (tx) => {
    const classRecord = await tx.class.update({
      where: { id: classId },
      data: { status: input.status },
      select: classSelect,
    });
    await writeAudit(
      {
        userId: actorId,
        action: 'update_status',
        tableName: 'classes',
        recordId: classId,
        oldData: { status: old.status },
        newData: { status: classRecord.status },
        ip,
      },
      tx,
    );
    return classRecord;
  });
  return toDto(updated);
}

export async function deleteClass(actorId: number, classId: number, ip?: string) {
  const old = await findClassOrThrow(classId, { id: actorId, roles: ['admin'] });
  await prisma.$transaction(async (tx) => {
    await tx.class.update({
      where: { id: classId },
      data: { deletedAt: new Date() },
      select: classSelect,
    });
    await writeAudit(
      { userId: actorId, action: 'delete', tableName: 'classes', recordId: classId, oldData: toDto(old), ip },
      tx,
    );
  });
}

export async function changeTeacher(actorId: number, classId: number, input: TeacherChangeInput, ip?: string) {
  await findClassOrThrow(classId, { id: actorId, roles: ['admin'] });
  await assertExists(input.teacherId, 'teacher', 'Giáo viên');
  const updated = await prisma.$transaction(async (tx) => {
    // Đóng lịch sử giáo viên cũ (chưa có ngày kết thúc), mở bản mới.
    await tx.classTeacher.updateMany({
      where: { classId, toDate: null },
      data: { toDate: input.fromDate },
    });
    await tx.classTeacher.create({
      data: { classId, teacherId: input.teacherId, role: 'MAIN', fromDate: input.fromDate },
    });
    const classRecord = await tx.class.update({
      where: { id: classId },
      data: { teacherId: input.teacherId },
      select: classSelect,
    });
    await writeAudit(
      {
        userId: actorId,
        action: 'change_teacher',
        tableName: 'classes',
        recordId: classId,
        oldData: { teacherId: oldTeacherId(classId) },
        newData: { teacherId: input.teacherId, fromDate: input.fromDate },
        ip,
      },
      tx,
    );
    return classRecord;
  });
  return toDto(updated);
}

// Helper đồng bộ để lấy giáo viên cũ trước khi đổi (ghi audit).
async function oldTeacherId(classId: number) {
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
    select: { teacherId: true },
  });
  return classRecord?.teacherId ?? null;
}

export async function listStudents(classId: number, caller: Caller, page = 1, pageSize = 20) {
  await findClassOrThrow(classId, caller);
  const [rows, countRows] = await prisma.$transaction([
    prisma.$queryRaw<
      Array<{
        enrollment_id: number;
        enrollment_status: string;
        enrolled_at: Date;
        student_id: number;
        full_name: string | null;
        student_code: string;
        phone: string | null;
        student_status: string;
      }>
    >(Prisma.sql`SELECT e.id AS enrollment_id, e.status AS enrollment_status, e.enrolled_at,
      s.id AS student_id, s.full_name, s.student_code, s.phone, s.status AS student_status
    FROM enrollments e JOIN students s ON s.id = e.student_id
    WHERE e.class_id = ${classId}
    ORDER BY s.full_name ASC, e.id ASC
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`),
    prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT count(*)::bigint AS total
      FROM enrollments e JOIN students s ON s.id = e.student_id WHERE e.class_id = ${classId}`),
  ]);
  const total = Number(countRows[0]?.total ?? 0n);
  return {
    items: rows.map((row) => ({
      enrollmentId: row.enrollment_id,
      enrollmentStatus: row.enrollment_status,
      enrolledAt: row.enrolled_at,
      studentId: row.student_id,
      fullName: row.full_name,
      studentCode: row.student_code,
      phone: row.phone,
      studentStatus: row.student_status,
    })),
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

export async function listSessions(classId: number, caller: Caller, page: number, pageSize: number) {
  await findClassOrThrow(classId, caller);
  const [items, countRows] = await prisma.$transaction([
    prisma.classSession.findMany({
      where: { classId },
      select: sessionSelect,
      orderBy: [{ date: 'asc' }, { lessonNo: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.classSession.count({ where: { classId } }),
  ]);
  return {
    items,
    page,
    pageSize,
    total: countRows,
    totalPages: Math.ceil(countRows / pageSize),
  };
}

export async function addSession(actorId: number, classId: number, input: AddSessionInput, ip?: string) {
  await findClassOrThrow(classId, callerOf(actorId));

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

  const created = await prisma.$transaction(async (tx) => {
    const { timeSlotId: _timeSlotId, ...sessionData } = input;
    const session = await tx.classSession.create({
      data: { classId, ...sessionData, startTime, endTime },
      select: sessionSelect,
    });
    await writeAudit(
      { userId: actorId, action: 'create', tableName: 'class_sessions', recordId: session.id, newData: session, ip },
      tx,
    );
    return session;
  });
  return created;
}

export async function updateSession(
  actorId: number,
  classId: number,
  sessionId: number,
  input: UpdateSessionInput,
  ip?: string,
) {
  await findClassOrThrow(classId, callerOf(actorId));
  const old = await prisma.classSession.findUnique({
    where: { id: sessionId, classId },
    select: sessionSelect,
  });
  if (!old) throw HttpError.notFound('Không tìm thấy buổi học');
  if (old.lockedAt) throw HttpError.locked('Buổi học đã khóa, không thể sửa');

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

  if (startTime && endTime && endTime <= startTime) {
    throw HttpError.badRequest('Giờ kết thúc phải sau giờ bắt đầu');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const { timeSlotId: _timeSlotId, ...sessionData } = input;
    const session = await tx.classSession.update({
      where: { id: sessionId },
      data: { ...sessionData, startTime, endTime },
      select: sessionSelect,
    });
    await writeAudit(
      {
        userId: actorId,
        action: 'update',
        tableName: 'class_sessions',
        recordId: sessionId,
        oldData: old,
        newData: session,
        ip,
      },
      tx,
    );
    return session;
  });
  return updated;
}

export async function addSchedule(actorId: number, classId: number, input: ScheduleCreateInput, ip?: string) {
  const classRecord = await findClassOrThrow(classId, callerOf(actorId));
  await assertNoConflicts({
    weekday: input.weekday,
    startTime: input.startTime,
    endTime: input.endTime,
    roomId: input.roomId ?? undefined,
    teacherId: classRecord.teacherId,
    excludeClassId: classId,
  });
  const created = await prisma.$transaction(async (tx) => {
    const schedule = await tx.classSchedule.create({
      data: {
        classId,
        weekday: input.weekday,
        startTime: input.startTime,
        endTime: input.endTime,
        roomId: input.roomId ?? null,
        timeSlotId: input.timeSlotId ?? null,
        effectiveFrom: input.effectiveFrom ?? null,
        effectiveTo: input.effectiveTo ?? null,
      },
      select: { id: true },
    });
    await writeAudit(
      { userId: actorId, action: 'create', tableName: 'class_schedules', recordId: schedule.id, newData: { classId, ...input }, ip },
      tx,
    );
    return schedule;
  });
  return created;
}

export async function updateSchedule(actorId: number, scheduleId: number, input: ScheduleUpdateInput, ip?: string) {
  const old = await prisma.classSchedule.findUnique({
    where: { id: scheduleId },
    select: { id: true, classId: true, weekday: true, startTime: true, endTime: true, roomId: true },
  });
  if (!old) throw HttpError.notFound('Không tìm thấy lịch học');
  const classRecord = await findClassOrThrow(old.classId, callerOf(actorId));
  const weekday = input.weekday ?? old.weekday;
  const startTime = input.startTime ?? old.startTime;
  const endTime = input.endTime ?? old.endTime;
  const roomId = input.roomId !== undefined ? input.roomId : old.roomId;
  await assertNoConflicts({
    weekday,
    startTime,
    endTime,
    roomId: roomId ?? undefined,
    teacherId: classRecord.teacherId,
    excludeClassId: old.classId,
  });
  const updated = await prisma.$transaction(async (tx) => {
    const schedule = await tx.classSchedule.update({
      where: { id: scheduleId },
      data: {
        weekday,
        startTime,
        endTime,
        roomId: roomId ?? null,
        timeSlotId: input.timeSlotId ?? undefined,
        effectiveFrom: input.effectiveFrom ?? undefined,
        effectiveTo: input.effectiveTo ?? undefined,
      },
      select: { id: true },
    });
    await writeAudit(
      { userId: actorId, action: 'update', tableName: 'class_schedules', recordId: scheduleId, oldData: old, newData: { classId: old.classId, weekday, startTime, endTime, roomId }, ip },
      tx,
    );
    return schedule;
  });
  return updated;
}

export async function deleteSchedule(actorId: number, scheduleId: number, ip?: string) {
  const old = await prisma.classSchedule.findUnique({
    where: { id: scheduleId },
    select: { id: true, classId: true, weekday: true, startTime: true, endTime: true },
  });
  if (!old) throw HttpError.notFound('Không tìm thấy lịch học');
  await findClassOrThrow(old.classId, callerOf(actorId));
  await prisma.$transaction(async (tx) => {
    await tx.classSchedule.delete({ where: { id: scheduleId } });
    await writeAudit(
      { userId: actorId, action: 'delete', tableName: 'class_schedules', recordId: scheduleId, oldData: old, ip },
      tx,
    );
  });
}

// Lấy danh sách lịch học của một lớp (GET /api/classes/:id/schedules)
export async function listSchedules(classId: number, caller: Caller) {
  await findClassOrThrow(classId, caller);
  const schedules = await prisma.classSchedule.findMany({
    where: { classId, effectiveTo: null },
    select: {
      id: true,
      classId: true,
      weekday: true,
      startTime: true,
      endTime: true,
      roomId: true,
      timeSlotId: true,
      effectiveFrom: true,
      effectiveTo: true,
      createdAt: true,
      updatedAt: true,
      room: { select: { id: true, name: true } },
      timeSlot: { select: { id: true, code: true, label: true, startTime: true, endTime: true } },
    },
    orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
  });
  return schedules.map((s) => ({
    id: s.id,
    classId: s.classId,
    weekday: s.weekday,
    startTime: s.startTime,
    endTime: s.endTime,
    roomId: s.roomId,
    roomName: s.room?.name ?? null,
    timeSlotId: s.timeSlotId,
    timeSlotCode: s.timeSlot?.code ?? null,
    timeSlotLabel: s.timeSlot?.label ?? null,
    effectiveFrom: s.effectiveFrom,
    effectiveTo: s.effectiveTo,
  }));
}

// Buổi học hôm nay: admin/nhân viên thấy tất cả, giáo viên thấy lớp mình,
// học viên thấy lớp mình đang ghi danh.
export async function listToday(caller: Caller) {
  const today = new Date();
  const predicates: Prisma.Sql[] = [
    Prisma.sql`cs.date = ${today}`,
    Prisma.sql`c.deleted_at IS NULL`,
  ];
  if (!canManageAll(caller)) {
    if (caller.roles.includes('teacher')) {
      predicates.push(Prisma.sql`c.teacher_id = ${caller.id}`);
    } else if (caller.roles.includes('student')) {
      const user = await prisma.user.findUnique({
        where: { id: caller.id },
        select: { student: { select: { id: true } } },
      });
      const studentId = user?.student?.id;
      if (!studentId) return { items: [] };
      predicates.push(Prisma.sql`c.id IN (SELECT e.class_id FROM enrollments e WHERE e.student_id = ${studentId} AND e.status = 'ACTIVE')`);
    } else {
      return { items: [] };
    }
  }
  const rows = await prisma.$queryRaw<
    Array<{
      session_id: number;
      class_id: number;
      class_name: string;
      class_code: string;
      lesson_no: number;
      date: Date;
      start_time: string | null;
      end_time: string | null;
      room_name: string | null;
      teacher_name: string | null;
      status: string;
      locked_at: Date | null;
    }>
  >(Prisma.sql`SELECT cs.id AS session_id, c.id AS class_id, c.name AS class_name, c.class_code,
      cs.lesson_no, cs.date, cs.start_time, cs.end_time, r.name AS room_name,
      t.full_name AS teacher_name, cs.status, cs.locked_at
    FROM class_sessions cs
    JOIN classes c ON c.id = cs.class_id
    LEFT JOIN rooms r ON r.id = cs.room_id
    LEFT JOIN teachers t ON t.id = cs.teacher_id
    WHERE ${Prisma.join(predicates, ' AND ')}
    ORDER BY cs.start_time ASC, c.id ASC`);
  return {
    items: rows.map((row) => ({
      sessionId: row.session_id,
      classId: row.class_id,
      className: row.class_name,
      classCode: row.class_code,
      lessonNo: row.lesson_no,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      roomName: row.room_name,
      teacherName: row.teacher_name,
      status: row.status,
      lockedAt: row.locked_at,
    })),
  };
}

// Phase 8: Sinh lại buổi học cho lớp (POST /api/classes/:id/generate-sessions)
export async function generateSessionsForClass(
  actorId: number,
  classId: number,
  input: GenerateSessionsInput,
  ip?: string,
) {
  const classRecord = await findClassOrThrow(classId, callerOf(actorId));
  const course = await prisma.course.findUnique({
    where: { id: classRecord.courseId },
    select: { totalSessions: true },
  });
  if (!course) throw HttpError.badRequest('Khóa học không tồn tại');

  // Lấy lịch học hiện tại của lớp
  const schedules = await prisma.classSchedule.findMany({
    where: { classId, effectiveTo: null },
    select: { weekday: true, startTime: true, endTime: true, roomId: true },
  });
  if (schedules.length === 0) throw HttpError.badRequest('Lớp chưa có thời khóa biểu');

  // Lọc lịch theo các thứ được truyền vào
  const filteredSchedules = schedules.filter((s) => input.weekdays.includes(s.weekday));
  if (filteredSchedules.length === 0) throw HttpError.badRequest('Không có lịch học cho các thứ đã chọn');

  // Nếu có timeSlotId: override giờ cho tất cả các thứ được chọn
  let overrideStartTime: string | null = null;
  let overrideEndTime: string | null = null;
  if (input.timeSlotId) {
    const slot = await prisma.timeSlot.findUnique({
      where: { id: input.timeSlotId },
      select: { startTime: true, endTime: true },
    });
    if (!slot) throw HttpError.badRequest('Ca học không tồn tại');
    overrideStartTime = slot.startTime;
    overrideEndTime = slot.endTime;
  }

  // Kiểm tra trùng phòng/giáo viên cho các buổi mới
  const holidayDates = new Set(input.skipHolidays.map((d) => d.toISOString().split('T')[0]));

  // Build sessions to check conflicts
  const sessionsToCheck = filteredSchedules.map((s) => ({
    weekday: s.weekday,
    startTime: overrideStartTime ?? s.startTime,
    endTime: overrideEndTime ?? s.endTime,
    roomId: input.roomId ?? s.roomId,
    teacherId: classRecord.teacherId,
  }));

  // Check conflicts for each session (exclude current class)
  for (const sess of sessionsToCheck) {
    await assertNoConflicts({
      weekday: sess.weekday,
      startTime: sess.startTime,
      endTime: sess.endTime,
      roomId: sess.roomId ?? undefined,
      teacherId: sess.teacherId,
      excludeClassId: classId,
    });
  }

  // Xóa các buổi học tương lai chưa điểm danh (SCHEDULED) để sinh lại
  await prisma.$transaction(async (tx) => {
    // Xóa buổi SCHEDULED trong tương lai
    await tx.classSession.deleteMany({
      where: {
        classId,
        date: { gte: input.startDate },
        status: 'SCHEDULED',
      },
    });

    // Sinh lại buổi học
    await generateSessions(
      tx,
      classId,
      input.startDate,
      filteredSchedules.map((s) => ({
        weekday: s.weekday,
        startTime: overrideStartTime ?? s.startTime,
        endTime: overrideEndTime ?? s.endTime,
        roomId: input.roomId ?? s.roomId,
      })),
      course.totalSessions,
      holidayDates,
    );
  });

  await writeAudit(
    {
      userId: actorId,
      action: 'generate_sessions',
      tableName: 'class_sessions',
      recordId: classId,
      newData: { startDate: input.startDate, weekdays: input.weekdays, skipHolidays: input.skipHolidays },
      ip,
    },
    prisma,
  );

  // Trả về danh sách buổi học đã sinh
  return listSessions(classId, callerOf(actorId), 1, 100);
}

// Phase 8: Thời khóa biểu (GET /api/timetable)
export async function listTimetable(input: TimetableQuery, caller: Caller) {
  const predicates: Prisma.Sql[] = [
    Prisma.sql`c.deleted_at IS NULL`,
  ];

  if (input.from) predicates.push(Prisma.sql`cs.date >= ${input.from}`);
  if (input.to) predicates.push(Prisma.sql`cs.date <= ${input.to}`);
  if (input.roomId) predicates.push(Prisma.sql`cs.room_id = ${input.roomId}`);
  if (input.classId) predicates.push(Prisma.sql`cs.class_id = ${input.classId}`);

  // Phân quyền: giáo viên chỉ thấy lớp mình
  if (!canManageAll(caller)) {
    if (caller.roles.includes('teacher')) {
      predicates.push(Prisma.sql`c.teacher_id = ${caller.id}`);
    } else if (caller.roles.includes('student')) {
      const user = await prisma.user.findUnique({
        where: { id: caller.id },
        select: { student: { select: { id: true } } },
      });
      const studentId = user?.student?.id;
      if (!studentId) return { items: [], page: 1, pageSize: input.pageSize, total: 0, totalPages: 0 };
      predicates.push(Prisma.sql`c.id IN (SELECT e.class_id FROM enrollments e WHERE e.student_id = ${studentId} AND e.status = 'ACTIVE')`);
    } else {
      return { items: [], page: 1, pageSize: input.pageSize, total: 0, totalPages: 0 };
    }
  }

  // Nếu có teacherId filter và không phải admin/staff, kiểm tra quyền
  if (input.teacherId && !canManageAll(caller)) {
    if (caller.roles.includes('teacher') && caller.id !== input.teacherId) {
      throw HttpError.forbidden('Chỉ xem được thời khóa biểu của chính mình');
    }
  }
  if (input.teacherId) predicates.push(Prisma.sql`c.teacher_id = ${input.teacherId}`);

  const where = Prisma.join(predicates, ' AND ');
  const [ids, countRows] = await prisma.$transaction([
    prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`SELECT cs.id FROM class_sessions cs
      JOIN classes c ON c.id = cs.class_id
      WHERE ${where}
      ORDER BY cs.date ASC, cs.start_time ASC, cs.id ASC
      LIMIT ${input.pageSize} OFFSET ${(input.page - 1) * input.pageSize}`),
    prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT count(*)::bigint AS total FROM class_sessions cs
      JOIN classes c ON c.id = cs.class_id WHERE ${where}`),
  ]);

  const sessions = ids.length
    ? await prisma.classSession.findMany({
        where: { id: { in: ids.map(({ id }) => id) } },
        select: sessionSelect,
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { id: 'asc' }],
      })
    : [];

  type SessionRecord = typeof sessions[0];
  const byId = new Map(sessions.map((s) => [s.id, s]));
  const rows = ids.map(({ id }) => byId.get(id)).filter((s): s is SessionRecord => !!s);

  const total = Number(countRows[0]?.total ?? 0n);

  // Join thêm thông tin lớp, phòng, giáo viên
  const classIds = [...new Set(rows.map((r) => r.classId))];
  const classes = await prisma.class.findMany({
    where: { id: { in: classIds } },
    select: { id: true, name: true, classCode: true, teacherId: true, roomId: true },
  });
  const classMap = new Map(classes.map((c) => [c.id, c]));

  const roomIds = [...new Set(rows.map((r) => r.roomId).filter((id): id is number => id !== null))];
  const rooms = await prisma.room.findMany({
    where: { id: { in: roomIds } },
    select: { id: true, name: true },
  });
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  const teacherIds = [...new Set([...rows.map((r) => r.teacherId), ...classes.map((c) => c.teacherId)].filter((id): id is number => id !== null))];
  const teachers = await prisma.teacher.findMany({
    where: { id: { in: teacherIds } },
    select: { id: true, fullName: true },
  });
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));

  return {
    items: rows.map((row) => {
      const classInfo = classMap.get(row.classId);
      const roomInfo = row.roomId ? roomMap.get(row.roomId) : null;
      const teacherInfo = row.teacherId ? teacherMap.get(row.teacherId) : (classInfo?.teacherId ? teacherMap.get(classInfo.teacherId) : null);
      return {
        sessionId: row.id,
        classId: row.classId,
        className: classInfo?.name ?? null,
        classCode: classInfo?.classCode ?? null,
        lessonNo: row.lessonNo,
        date: row.date,
        startTime: row.startTime,
        endTime: row.endTime,
        roomName: roomInfo?.name ?? null,
        teacherName: teacherInfo?.fullName ?? null,
        status: row.status,
        lockedAt: row.lockedAt,
      };
    }),
    page: input.page,
    pageSize: input.pageSize,
    total,
    totalPages: Math.ceil(total / input.pageSize),
  };
}

// Phase 8: Danh sách lớp của giáo viên (GET /api/teacher/classes)
export async function listTeacherClasses(caller: Caller, page: number, pageSize: number) {
  if (!caller.roles.includes('teacher')) {
    throw HttpError.forbidden('Chỉ giáo viên mới truy cập được');
  }
  const teacher = await prisma.teacher.findFirst({
    where: { userId: caller.id, deletedAt: null },
    select: { id: true },
  });
  if (!teacher) throw HttpError.forbidden('Không tìm thấy hồ sơ giáo viên');

  return listClasses(
    { page, pageSize, teacherId: teacher.id, onlyDeleted: 'false' },
    { id: caller.id, roles: ['teacher'] },
  );
}

// Phase 8: Danh sách học viên trong lớp của giáo viên (GET /api/teacher/classes/:id/students)
export async function listTeacherClassStudents(caller: Caller, classId: number, page: number, pageSize: number) {
  if (!caller.roles.includes('teacher')) {
    throw HttpError.forbidden('Chỉ giáo viên mới truy cập được');
  }
  const teacher = await prisma.teacher.findFirst({
    where: { userId: caller.id, deletedAt: null },
    select: { id: true },
  });
  if (!teacher) throw HttpError.forbidden('Không tìm thấy hồ sơ giáo viên');

  const classRecord = await findClassOrThrow(classId, { id: caller.id, roles: ['teacher'] });
  if (classRecord.teacherId !== teacher.id) {
    throw HttpError.forbidden('Chỉ xem được học viên trong lớp mình phụ trách');
  }

  return listStudents(classId, { id: caller.id, roles: ['teacher'] }, page, pageSize);
}

// Xây Caller tạm cho các thao tác admin (write endpoints chỉ admin).
function callerOf(actorId: number): Caller {
  return { id: actorId, roles: ['admin'] };
}
