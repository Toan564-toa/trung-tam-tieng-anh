import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma';
import { closeDatabase, resetDatabase } from './helpers/db';
import { createStaff, createStudent, createTeacher, createUser, loginAs, seedRoles } from './helpers/fixtures';

let _staffCookie: string;
let _adminCookie: string;

beforeAll(async () => {
  await resetDatabase();
  await seedRoles();
  await createUser('staff', 'nv01');
  await createUser('admin', 'admin01');
  _staffCookie = await loginAs('nv01');
  _adminCookie = await loginAs('admin01');
});

afterAll(async () => {
  await closeDatabase();
});

describe('Ràng buộc SQL — payments, CHECK, UNIQUE có điều kiện, VIEW', () => {
  let studentId: number;
  let classId: number;
  let invoiceId: number;
  let paymentId: number;
  let teacherId: number;
  let _assessmentId: number;
  let scoreId: number;

  beforeEach(async () => {
    await resetDatabase();
    await seedRoles();
    const student = await createStudent('HV Test', 'HV260999');
    studentId = student.id;

    const teacher = await createTeacher('GV Test', 'GV9999');
    teacherId = teacher.id;

    const course = await prisma.course.create({
      data: { code: 'TEST-01', slug: 'test-01', name: 'Khóa test', totalSessions: 64, sessionsPerWeek: 2, listPrice: 10_000_000 },
    });
    const classRow = await prisma.class.create({
      data: { courseId: course.id, teacherId: teacher.id, classCode: 'TEST01', name: 'Lớp test', startDate: new Date('2026-01-05'), maxStudents: 20, status: 'ACTIVE' },
    });
    classId = classRow.id;

    await prisma.enrollment.create({
      data: { studentId, classId, totalSessions: 64, tuitionAmount: 10_000_000, status: 'ACTIVE' },
    });

    const invoice = await prisma.invoice.create({
      data: { invoiceNo: 'INV-TEST-001', enrollmentId: (await prisma.enrollment.findFirst())!.id, subtotalAmount: 10_000_000, discountAmount: 0, totalAmount: 10_000_000 },
    });
    invoiceId = invoice.id;

    const payment = await prisma.payment.create({
      data: { receiptNo: 'PT-TEST-001', invoiceId: invoice.id, amount: 10_000_000, paidAt: new Date(), method: 'CASH', collectedBy: (await createStaff('NV Test', 'NV9999')).id },
    });
    paymentId = payment.id;

    const assessment = await prisma.assessment.create({
      data: { classId: classId, name: 'Kiểm tra test', kind: 'UNIT', date: new Date('2026-01-10'), maxScore: 10 },
    });
    _assessmentId = assessment.id;

    const score = await prisma.score.create({
      data: { assessmentId: assessment.id, studentId, score: 8.5, enteredBy: teacherId },
    });
    scoreId = score.id;
  });

  it('payments không cho phép UPDATE — trả lỗi ràng buộc', async () => {
    await expect(
      prisma.payment.update({ where: { id: paymentId }, data: { amount: 1 } }),
    ).rejects.toThrow();

    await expect(
      prisma.payment.delete({ where: { id: paymentId } }),
    ).rejects.toThrow();
  });

  it('payments không cho phép DELETE — trả lỗi ràng buộc', async () => {
    await expect(
      prisma.payment.delete({ where: { id: paymentId } }),
    ).rejects.toThrow();
  });

  it('không thu số tiền <= 0 — trả lỗi CHECK', async () => {
    await expect(
      prisma.payment.create({
        data: { receiptNo: 'PT-TEST-002', invoiceId, amount: 0, paidAt: new Date(), method: 'CASH' },
      }),
    ).rejects.toThrow();

    await expect(
      prisma.payment.create({
        data: { receiptNo: 'PT-TEST-003', invoiceId, amount: -1000, paidAt: new Date(), method: 'CASH' },
      }),
    ).rejects.toThrow();
  });

  it('scores cũng không cho phép UPDATE/DELETE — dùng score_changes', async () => {
    await expect(
      prisma.score.update({ where: { id: scoreId }, data: { score: 9 } }),
    ).rejects.toThrow();

    await expect(
      prisma.score.delete({ where: { id: scoreId } }),
    ).rejects.toThrow();

    // Nhưng vẫn có thể thêm score_changes
    await prisma.scoreChange.create({
      data: { scoreId, oldScore: 8.5, newScore: 9, changedBy: teacherId, reason: 'Sửa điểm' },
    });
  });

  it('enrollment ACTIVE trùng (student_id, class_id) bị chặn bởi UNIQUE CÓ ĐIỀU KIỆN', async () => {
    await expect(
      prisma.enrollment.create({
        data: { studentId, classId, totalSessions: 64, tuitionAmount: 10_000_000, status: 'ACTIVE' },
      }),
    ).rejects.toThrow();
  });

  it('v_invoice_balance hiển thị đúng công nợ', async () => {
    const balance = await prisma.$queryRaw<
      { invoice_id: number; invoice_no: string; total_amount: bigint; paid_amount: bigint; remaining_amount: bigint }[]
    >`
      SELECT invoice_id, invoice_no, total_amount, paid_amount, remaining_amount
      FROM v_invoice_balance
      WHERE invoice_id = ${invoiceId}
    `;

    expect(balance).toHaveLength(1);
    expect(Number(balance[0].total_amount)).toBe(10_000_000);
    expect(Number(balance[0].paid_amount)).toBe(10_000_000);
    expect(Number(balance[0].remaining_amount)).toBe(0);
  });

  it('v_enrollment_progress tính đúng tiến độ', async () => {
    const progress = await prisma.$queryRaw<
      { enrollment_id: number; total_sessions: bigint; sessions_held: bigint; progress_percent: number | null }[]
    >`
      SELECT enrollment_id, total_sessions, sessions_held, progress_percent
      FROM v_enrollment_progress
      WHERE student_id = ${studentId}
    `;

    expect(progress).toHaveLength(1);
    expect(Number(progress[0].total_sessions)).toBe(64);
    expect(Number(progress[0].sessions_held)).toBe(0);
    expect(Number(progress[0].progress_percent)).toBe(0);
  });
});
