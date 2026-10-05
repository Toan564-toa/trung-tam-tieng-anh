import argon2 from 'argon2';
import type { Express } from 'express';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';

export const PASSWORD = 'MatKhauTest@123';

let cachedApp: Express | null = null;

// Một instance app cho cả bộ test (tạo lại sẽ tạo thêm middleware rate limit không cần thiết).
export function app(): Express {
  cachedApp ??= createApp();
  return cachedApp;
}

const ROLE_DEFS = [
  { code: 'admin', name: 'Quản trị viên' },
  { code: 'staff', name: 'Nhân viên' },
  { code: 'teacher', name: 'Giáo viên' },
  { code: 'student', name: 'Học viên' },
];

export async function seedRoles() {
  for (const role of ROLE_DEFS) {
    await prisma.role.upsert({ where: { code: role.code }, update: {}, create: role });
  }
}

export async function createUser(roleCode: string, username = `${roleCode}01`) {
  const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
  const passwordHash = await argon2.hash(PASSWORD);
  return prisma.user.create({
    data: {
      username,
      passwordHash,
      mustChangePassword: false,
      status: 'ACTIVE',
      roles: { create: [{ roleId: role.id }] },
    },
  });
}

export async function createTeacher(fullName = 'Giáo viên Một', teacherCode = 'GV0001') {
  const user = await createUser('teacher', `gv${teacherCode.toLowerCase()}`);
  return prisma.teacher.create({ data: { userId: user.id, teacherCode, fullName } });
}

// Tạo giáo viên kèm luôn tài khoản đăng nhập đã liên kết (đúng quan hệ userId mà service kiểm tra).
export async function createTeacherUser(teacherCode: string, fullName: string, username: string) {
  const user = await createUser('teacher', username);
  const teacher = await prisma.teacher.create({ data: { userId: user.id, teacherCode, fullName } });
  return { user, teacher };
}

// Tạo nhân viên kèm luôn tài khoản đăng nhập đã liên kết.
export async function createStaffUser(staffCode: string, fullName: string, username: string) {
  const user = await createUser('staff', username);
  const staff = await prisma.staff.create({ data: { userId: user.id, staffCode, fullName, position: 'Tư vấn' } });
  return { user, staff };
}

export async function createStaff(fullName = 'Nhân viên Một', staffCode = 'NV0001') {
  const user = await createUser('staff', `nv${staffCode.toLowerCase()}`);
  return prisma.staff.create({ data: { userId: user.id, staffCode, fullName, position: 'Tư vấn' } });
}

export async function createCourse(code = 'GT-64') {
  return prisma.course.create({
    data: { code, name: `Khóa ${code}`, level: 'Cơ bản', totalSessions: 64, sessionsPerWeek: 2 },
  });
}

export async function createClass(teacherId: number, classCode = 'LOP0001') {
  // Lớp bắt buộc thuộc một khóa học; tự tạo khóa mặc định nếu test chưa tạo.
  const course = (await prisma.course.findFirst()) ?? (await createCourse());
  return prisma.class.create({
    data: {
      courseId: course.id,
      teacherId,
      classCode,
      name: `Lớp ${classCode}`,
      startDate: new Date('2026-01-05'),
      maxStudents: 20,
      status: 'ACTIVE',
    },
  });
}

export async function createSession(
  classId: number,
  opts: {
    lessonNo?: number;
    date?: Date;
    lockedAt?: Date | null;
    status?: 'SCHEDULED' | 'HELD' | 'CANCELLED' | 'MAKEUP';
  } = {},
) {
  return prisma.classSession.create({
    data: {
      classId,
      lessonNo: opts.lessonNo ?? 1,
      date: opts.date ?? new Date('2026-01-05'),
      startTime: '18:00',
      endTime: '19:30',
      status: opts.status ?? 'SCHEDULED',
      lockedAt: opts.lockedAt ?? null,
    },
  });
}

export async function createStudent(fullName = 'Nguyễn Văn A', studentCode = 'HV260001') {
  return prisma.student.create({
    data: { fullName, studentCode, phone: '0912345678', email: `${studentCode.toLowerCase()}@test.vn` },
  });
}

export async function enrollStudent(studentId: number, classId: number, tuitionAmount = 15_200_000) {
  return prisma.enrollment.create({
    data: { studentId, classId, totalSessions: 64, tuitionAmount, status: 'ACTIVE' },
  });
}

// supertest không khai báo kiểu cho getSetCookie của Node, nên đọc qua kiểu riêng.
function setCookies(res: request.Response): string[] {
  const headers = res.headers as unknown as { getSetCookie?: () => string[] };
  return headers.getSetCookie?.() ?? [];
}

// Lấy chuỗi cookie phiên đăng nhập để dùng cho các request sau.
export async function loginAs(username: string, password = PASSWORD): Promise<string> {
  const res = await request(app()).post('/api/auth/login').send({ username, password });
  if (res.status !== 200) throw new Error(`Đăng nhập ${username} thất bại: HTTP ${res.status}`);

  const pair = setCookies(res)
    .map((c) => c.split(';')[0] ?? '')
    .filter(Boolean)
    .join('; ');
  if (!pair) throw new Error('Không nhận được cookie đăng nhập');
  return pair;
}

// Danh sách cookie Set-Cookie của một response (kiểm tra thuộc tính HttpOnly, SameSite).
export function cookiesOf(res: request.Response): string[] {
  return setCookies(res);
}
