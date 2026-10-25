import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { HttpError } from '../../utils/httpError';
import { writeAudit } from '../../utils/audit';
import type {
  CourseStatusInput,
  CreateCourseInput,
  ListCoursesQuery,
  UpdateCourseInput,
} from './courses.schema';

const courseSelect = {
  id: true,
  code: true,
  slug: true,
  name: true,
  level: true,
  language: true,
  description: true,
  totalSessions: true,
  sessionsPerWeek: true,
  durationMonths: true,
  listPrice: true,
  minAge: true,
  maxAge: true,
  targetStudents: true,
  audience: true,
  schedule: true,
  highlights: true,
  featured: true,
  levelTone: true,
  imageFileId: true,
  isPublic: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.CourseSelect;

type CourseRecord = Prisma.CourseGetPayload<{ select: typeof courseSelect }>;

function toDto(course: CourseRecord) {
  return { ...course, deleted: course.deletedAt !== null };
}

export async function listCourses(input: ListCoursesQuery) {
  const predicates: Prisma.Sql[] = [
    input.onlyDeleted === 'true'
      ? Prisma.sql`c.deleted_at IS NOT NULL`
      : Prisma.sql`c.deleted_at IS NULL`,
  ];
  if (input.level) predicates.push(Prisma.sql`c.level = ${input.level}`);
  if (input.status) predicates.push(Prisma.sql`c.status = ${input.status}::course_status`);
  if (input.query)
    predicates.push(Prisma.sql`ttnn_unaccent(lower(concat_ws(' ', c.name, c.code)))
      LIKE '%' || ttnn_unaccent(lower(${input.query})) || '%'`);
  const where = Prisma.join(predicates, ' AND ');
  const [ids, countRows] = await prisma.$transaction([
    prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`SELECT c.id FROM courses c WHERE ${where}
      ORDER BY c.created_at DESC, c.id DESC LIMIT ${input.pageSize} OFFSET ${(input.page - 1) * input.pageSize}`),
    prisma.$queryRaw<Array<{ total: bigint }>>(
      Prisma.sql`SELECT count(*)::bigint AS total FROM courses c WHERE ${where}`,
    ),
  ]);
  const courses = ids.length
    ? await prisma.course.findMany({
        where: { id: { in: ids.map(({ id }) => id) } },
        select: courseSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      })
    : [];
  const byId = new Map(courses.map((course) => [course.id, course]));
  const rows = ids.map(({ id }) => byId.get(id)).filter((course): course is CourseRecord => !!course);
  const total = Number(countRows[0]?.total ?? 0n);
  return {
    items: rows.map(toDto),
    page: input.page,
    pageSize: input.pageSize,
    total,
    totalPages: Math.ceil(total / input.pageSize),
  };
}

export async function getCourse(id: number) {
  const course = await prisma.course.findUnique({ where: { id }, select: courseSelect });
  if (!course || course.deletedAt) throw HttpError.notFound('Không tìm thấy khóa học');
  return toDto(course);
}

// Lịch sử giá: mỗi lần giá niêm yết đổi, đóng bản cũ và mở bản mới
// (hiệu lực từ hôm nay) — hồ sơ ghi danh đã chụp giá cũ không đổi.
async function recordPriceHistory(tx: Prisma.TransactionClient, courseId: number, price: number) {
  const today = new Date();
  await tx.coursePriceHistory.updateMany({
    where: { courseId, effectiveTo: null },
    data: { effectiveTo: today },
  });
  await tx.coursePriceHistory.create({
    data: { courseId, price, effectiveFrom: today },
  });
}

export async function createCourse(actorId: number, input: CreateCourseInput, ip?: string) {
  const created = await prisma.$transaction(async (tx) => {
    const course = await tx.course.create({ data: input, select: courseSelect });
    await recordPriceHistory(tx, course.id, course.listPrice);
    await writeAudit(
      { userId: actorId, action: 'create', tableName: 'courses', recordId: course.id, newData: toDto(course), ip },
      tx,
    );
    return course;
  });
  return toDto(created);
}

export async function updateCourse(actorId: number, courseId: number, input: UpdateCourseInput, ip?: string) {
  const old = await prisma.course.findUnique({ where: { id: courseId }, select: courseSelect });
  if (!old || old.deletedAt) throw HttpError.notFound('Không tìm thấy khóa học');
  const updated = await prisma.$transaction(async (tx) => {
    const course = await tx.course.update({ where: { id: courseId }, data: input, select: courseSelect });
    if (input.listPrice !== undefined && input.listPrice !== old.listPrice) {
      await recordPriceHistory(tx, courseId, course.listPrice);
    }
    await writeAudit(
      {
        userId: actorId,
        action: 'update',
        tableName: 'courses',
        recordId: courseId,
        oldData: toDto(old),
        newData: toDto(course),
        ip,
      },
      tx,
    );
    return course;
  });
  return toDto(updated);
}

export async function setCourseStatus(actorId: number, courseId: number, input: CourseStatusInput, ip?: string) {
  const old = await prisma.course.findUnique({ where: { id: courseId }, select: courseSelect });
  if (!old || old.deletedAt) throw HttpError.notFound('Không tìm thấy khóa học');
  const updated = await prisma.$transaction(async (tx) => {
    const course = await tx.course.update({
      where: { id: courseId },
      data: { status: input.status },
      select: courseSelect,
    });
    await writeAudit(
      {
        userId: actorId,
        action: 'update_status',
        tableName: 'courses',
        recordId: courseId,
        oldData: { status: old.status },
        newData: { status: course.status },
        ip,
      },
      tx,
    );
    return course;
  });
  return toDto(updated);
}

export async function deleteCourse(actorId: number, courseId: number, ip?: string) {
  const old = await prisma.course.findUnique({ where: { id: courseId }, select: courseSelect });
  if (!old || old.deletedAt) throw HttpError.notFound('Không tìm thấy khóa học');
  await prisma.$transaction(async (tx) => {
    await tx.course.update({
      where: { id: courseId },
      data: { deletedAt: new Date() },
      select: courseSelect,
    });
    await writeAudit(
      { userId: actorId, action: 'delete', tableName: 'courses', recordId: courseId, oldData: toDto(old), ip },
      tx,
    );
  });
}

// Landing trang công khai: chỉ khóa đã xuất bản, còn hiển thị, chưa xoá.
export async function listPublicCourses() {
  return prisma.course.findMany({
    where: { isPublic: true, status: 'PUBLISHED', deletedAt: null },
    select: courseSelect,
    orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function getPublicCourse(id: number) {
  const course = await prisma.course.findFirst({
    where: { id, isPublic: true, status: 'PUBLISHED', deletedAt: null },
    select: courseSelect,
  });
  if (!course) throw HttpError.notFound('Không tìm thấy khóa học');
  return course;
}
