import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { writeAudit } from '../../utils/audit';
import { HttpError } from '../../utils/httpError';
import type { CreateStudentInput, ListStudentsQuery, UpdateStudentInput } from './students.schema';

const listSelect = {
  id: true,
  studentCode: true,
  fullName: true,
  dob: true,
  gender: true,
  phone: true,
  email: true,
  status: true,
  advisor: { select: { id: true, fullName: true } },
  createdAt: true,
} satisfies Prisma.StudentSelect;

export async function listStudents(q: ListStudentsQuery) {
  const where: Prisma.StudentWhereInput = {
    deletedAt: null, // xóa mềm: luôn loại bản ghi đã xóa
    ...(q.status ? { status: q.status } : {}),
    ...(q.search
      ? {
          OR: [
            { fullName: { contains: q.search, mode: 'insensitive' } },
            { studentCode: { contains: q.search, mode: 'insensitive' } },
            { phone: { contains: q.search } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.student.findMany({
      where,
      select: listSelect,
      orderBy: { id: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.student.count({ where }),
  ]);

  return { items, page: q.page, pageSize: q.pageSize, total, totalPages: Math.ceil(total / q.pageSize) };
}

export async function getStudent(id: number) {
  const student = await prisma.student.findFirst({
    where: { id, deletedAt: null },
    include: {
      advisor: { select: { id: true, fullName: true } },
      enrollments: {
        select: {
          id: true,
          status: true,
          totalSessions: true,
          tuitionAmount: true,
          class: { select: { id: true, classCode: true, name: true } },
        },
      },
    },
  });
  if (!student) throw HttpError.notFound('Không tìm thấy học viên');
  return student;
}

export async function createStudent(input: CreateStudentInput, actorId: number, ip?: string) {
  return prisma.$transaction(async (tx) => {
    // Sinh mã học viên theo năm, không trùng kể cả khi nhiều người thao tác cùng lúc
    const year = new Date().getFullYear();
    const key = `student-${year}`;
    const seq = await tx.sequence.upsert({
      where: { key },
      update: { lastValue: { increment: 1 } },
      create: { key, lastValue: 1 },
    });
    const studentCode = `HV${String(year).slice(-2)}${String(seq.lastValue).padStart(4, '0')}`;

    const student = await tx.student.create({ data: { ...input, studentCode } });
    await writeAudit(
      { userId: actorId, action: 'create', tableName: 'students', recordId: student.id, newData: student, ip },
      tx,
    );
    return student;
  });
}

export async function updateStudent(id: number, input: UpdateStudentInput, actorId: number, ip?: string) {
  return prisma.$transaction(async (tx) => {
    const old = await tx.student.findFirst({ where: { id, deletedAt: null } });
    if (!old) throw HttpError.notFound('Không tìm thấy học viên');

    const updated = await tx.student.update({ where: { id }, data: input });
    await writeAudit(
      { userId: actorId, action: 'update', tableName: 'students', recordId: id, oldData: old, newData: updated, ip },
      tx,
    );
    return updated;
  });
}

// Xóa mềm: giữ lại dữ liệu để đối chiếu điểm danh, học phí
export async function softDeleteStudent(id: number, actorId: number, ip?: string) {
  await prisma.$transaction(async (tx) => {
    const old = await tx.student.findFirst({ where: { id, deletedAt: null } });
    if (!old) throw HttpError.notFound('Không tìm thấy học viên');

    await tx.student.update({ where: { id }, data: { deletedAt: new Date() } });
    await writeAudit({ userId: actorId, action: 'delete', tableName: 'students', recordId: id, oldData: old, ip }, tx);
  });
}
