import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import type { PrismaClient } from '@prisma/client';
import {
  AVERAGE_SCORES,
  ASSESSMENT_KINDS,
  BRANCH,
  CLASSES,
  COURSES,
  DEMO_TODAY,
  EVENT_TYPES,
  LEADS,
  LEAD_SOURCES,
  PAYMENT_METHODS,
  POSTS,
  POST_CATEGORIES,
  ROOMS,
  SETTINGS,
  SITE_BANNERS,
  STAFF,
  TEACHERS,
  TESTIMONIALS,
  TIME_SLOTS,
  buildDemoStudents,
  makeRandom,
} from './demo-data';

// Nội dung seed demo. Dữ liệu lấy từ mock của frontend (frontend/src/data/*.ts),
// tất cả đều là dữ liệu giả.

const PERMISSIONS = [
  { code: 'student.view', name: 'Xem học viên', description: 'Xem danh sách và hồ sơ học viên' },
  { code: 'student.edit', name: 'Sửa học viên', description: 'Tạo, sửa, xoá mềm hồ sơ học viên' },
  { code: 'payment.create', name: 'Ghi thu tiền', description: 'Thêm dòng thu vào payments' },
  { code: 'payment.refund', name: 'Duyệt hoàn phí', description: 'Duyệt yêu cầu hoàn phí' },
  { code: 'class.edit', name: 'Quản lý lớp', description: 'Tạo và sửa lớp học' },
  { code: 'attendance.mark', name: 'Điểm danh', description: 'Ghi và sửa điểm danh' },
  { code: 'post.publish', name: 'Đăng bài', description: 'Đăng bài lên website' },
  { code: 'settings.edit', name: 'Sửa cài đặt', description: 'Sửa cấu hình trung tâm' },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: PERMISSIONS.map((p) => p.code),
  staff: ['student.view', 'student.edit', 'payment.create', 'class.edit', 'attendance.mark'],
  teacher: ['student.view', 'attendance.mark'],
  student: [],
  guardian: [],
};

/** Ngày "dd/MM/yyyy" của mock -> Date (date thuần, giờ 00:00 UTC). */
function parseVnDate(value: string): Date {
  const [day, month, year] = value.split('/');
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

function randomPassword(): string {
  return `Demo-${randomBytes(9).toString('base64url')}`;
}

async function ensureDemoUser(
  prisma: PrismaClient,
  username: string,
  email: string | undefined,
  phone: string | undefined,
  roleCode: string,
): Promise<{ userId: number; password: string }> {
  const password = randomPassword();
  const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
  const user = await prisma.user.upsert({
    where: { username },
    update: { email, phone, passwordHash: await argon2.hash(password), status: 'ACTIVE', mustChangePassword: true },
    create: {
      username,
      email,
      phone,
      passwordHash: await argon2.hash(password),
      status: 'ACTIVE',
      mustChangePassword: true,
      roles: { create: [{ roleId: role.id }] },
    },
  });
  // Đảm bảo user có đúng vai trò (bỏ vai trò cũ nếu có).
  await prisma.userRole.deleteMany({ where: { userId: user.id } });
  await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
  return { userId: user.id, password };
}

export interface DemoAccount {
  username: string;
  password: string;
  role: string;
}

export async function seedDemo(prisma: PrismaClient): Promise<DemoAccount[]> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Từ chối chạy seed demo ở môi trường production.');
  }

  const existing = await prisma.student.count();
  if (existing > 0) {
    throw new Error(
      `Database đang có ${existing} học viên. Seed demo chỉ chạy trên database TRỐNG ` +
        `để không trộn dữ liệu. Hãy dựng lại database rồi chạy lại.`,
    );
  }

  const rand = makeRandom(20261002);
  const accounts: DemoAccount[] = [];

  // --- Vai trò, quyền, cấu hình -------------------------------------------
  for (const [code, names] of [
    ['admin', 'Quản trị viên'],
    ['staff', 'Nhân viên'],
    ['teacher', 'Giáo viên'],
    ['student', 'Học viên'],
    ['guardian', 'Phụ huynh'],
  ] as const) {
    await prisma.role.upsert({ where: { code }, update: { name: names }, create: { code, name: names } });
  }

  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: permission,
      create: permission,
    });
  }

  for (const role of await prisma.role.findMany()) {
    const codes = ROLE_PERMISSIONS[role.code] ?? [];
    const permissions = await prisma.permission.findMany({ where: { code: { in: codes } } });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (permissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
      });
    }
  }

  for (const setting of SETTINGS) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value as never, description: setting.description },
      create: { key: setting.key, value: setting.value as never, description: setting.description },
    });
  }

  await prisma.attendanceLockDays.upsert({
    where: { id: 1 },
    update: { days: 7, note: 'Mặc định toàn trung tâm' },
    create: { id: 1, days: 7, note: 'Mặc định toàn trung tâm' },
  });

  // --- Cơ sở, phòng, ca học ----------------------------------------------
  const branch = await prisma.branch.create({ data: BRANCH });

  const rooms = new Map<string, number>();
  for (const room of ROOMS) {
    const created = await prisma.room.create({ data: { ...room, branchId: branch.id } });
    rooms.set(created.name, created.id);
  }

  const slots = new Map<string, number>();
  for (const slot of TIME_SLOTS) {
    const created = await prisma.timeSlot.create({ data: slot });
    slots.set(created.code, created.id);
  }

  for (const source of LEAD_SOURCES) {
    await prisma.leadSource.upsert({ where: { name: source }, update: {}, create: { name: source } });
  }

  // --- Khoá học -----------------------------------------------------------
  const courses = new Map<string, number>();
  for (const course of COURSES) {
    const created = await prisma.course.create({
      data: {
        code: course.code,
        slug: course.slug,
        name: course.name,
        level: course.level,
        language: 'English',
        totalSessions: 64,
        sessionsPerWeek: 2,
        durationMonths: 8,
        listPrice: course.listPrice,
        minAge: course.minAge,
        maxAge: course.maxAge,
        targetStudents: course.targetStudents,
        audience: course.audience,
        schedule: course.schedule,
        highlights: course.highlights,
        featured: course.featured,
        levelTone: course.levelTone,
        isPublic: true,
        status: 'PUBLISHED',
      },
    });
    courses.set(course.code, created.id);
    await prisma.coursePriceHistory.create({
      data: {
        courseId: created.id,
        price: course.listPrice,
        effectiveFrom: new Date(Date.UTC(2026, 0, 1)),
      },
    });
  }

  // --- Giáo viên, nhân viên và tài khoản đăng nhập ------------------------
  const teachers = new Map<string, number>();
  for (const teacher of TEACHERS) {
    const username = teacher.code.toLowerCase();
    const { userId, password } = await ensureDemoUser(prisma, username, teacher.email, teacher.phone, 'teacher');
    const user = { id: userId } as { id: number };
    const created = await prisma.teacher.create({
      data: {
        userId: user.id,
        teacherCode: teacher.code,
        fullName: teacher.fullName,
        phone: teacher.phone,
        email: teacher.email,
        specialty: teacher.specialty,
        certificate: teacher.certificate,
        experience: teacher.experience,
        education: teacher.education,
        bio: teacher.bio,
        startDate: parseVnDate(teacher.startDate),
        showOnWebsite: teacher.showOnWebsite,
        branchId: branch.id,
      },
    });
    teachers.set(teacher.code, created.id);
    accounts.push({ username, password, role: 'teacher' });
  }

  const staff = new Map<string, { staffId: number; userId: number }>();
  for (const member of STAFF) {
    const username = member.code.toLowerCase();
    const { userId, password } = await ensureDemoUser(prisma, username, member.email, member.phone, 'staff');
    const user = { id: userId } as { id: number };
    const created = await prisma.staff.create({
      data: {
        userId: user.id,
        staffCode: member.code,
        fullName: member.fullName,
        phone: member.phone,
        email: member.email,
        position: member.position,
        department: member.department,
        education: member.education,
        bio: member.bio,
        startDate: parseVnDate(member.startDate),
      },
    });
    staff.set(member.code, { staffId: created.id, userId: user.id });
    accounts.push({ username, password, role: 'staff' });
  }

  // --- Tài khoản quản trị và học viên mẫu -------------------------------
  const adminPassword = randomPassword();
  const { userId: _adminUserId } = await ensureDemoUser(prisma, 'admin', 'admin@trungtam.edu.vn', '0909 123 456', 'admin');
  accounts.push({ username: 'admin', password: adminPassword, role: 'admin' });

  // --- Lớp học ------------------------------------------------------------
  const classRows = new Map<string, { id: number; doneLessons: number; startDate: Date; status: string }>();
  for (const cls of CLASSES) {
    const startDate = parseVnDate(cls.startDate);
    const created = await prisma.class.create({
      data: {
        branchId: branch.id,
        courseId: courses.get(cls.courseCode)!,
        classCode: cls.classCode,
        name: cls.name,
        teacherId: teachers.get(cls.teacherCode)!,
        roomId: rooms.get(cls.roomName)!,
        advisorId: staff.get(cls.staffCode)!.staffId,
        startDate,
        expectedEndDate: parseVnDate(cls.endDate),
        maxStudents: cls.maxStudents,
        status: cls.status,
      },
    });
    classRows.set(cls.classCode, { id: created.id, doneLessons: cls.doneLessons, startDate, status: cls.status });

    for (const weekday of cls.weekdays) {
      await prisma.classSchedule.create({
        data: {
          classId: created.id,
          weekday,
          startTime: cls.startTime,
          endTime: cls.endTime,
          roomId: rooms.get(cls.roomName)!,
          timeSlotId: slots.get(cls.timeSlotCode)!,
          effectiveFrom: startDate,
        },
      });
    }

    await prisma.classTeacher.create({
      data: {
        classId: created.id,
        teacherId: teachers.get(cls.teacherCode)!,
        role: 'MAIN',
        fromDate: startDate,
      },
    });
  }

  // --- Học viên, phụ huynh, ghi danh, hoá đơn, thu tiền --------------------
  const students = buildDemoStudents();
  let receiptSeq = 0;
  let invoiceSeq = 0;

  for (const [index, demo] of students.entries()) {
    const classInfo = classRows.get(demo.classCode)!;
    const cls = CLASSES.find((c) => c.classCode === demo.classCode)!;
    const course = COURSES.find((c) => c.code === cls.courseCode)!;
    const { staffId: advisorId, userId: advisorUserId } = staff.get(cls.staffCode)!;

    const guardian = await prisma.guardian.create({
      data: {
        fullName: demo.guardian.fullName,
        phone: demo.guardian.phone,
        email: demo.guardian.email,
        address: demo.address,
      },
    });

    // Chỉ tạo tài khoản đăng nhập cho học viên đầu tiên của mỗi lớp để dữ liệu demo
    // vừa đủ dùng vừa không tạo hàng chục mật khẩu in ra console.
    let studentId: number;
    if (index < CLASSES.filter((c) => c.studentCount > 0).length) {
      const username = `hv${String(index + 1).padStart(2, '0')}demo`;
      const { userId, password } = await ensureDemoUser(prisma, username, demo.email, demo.phone, 'student');
      const user = { id: userId } as { id: number };
      accounts.push({ username, password, role: 'student' });
      const created = await prisma.student.create({
        data: {
          userId: user.id,
          studentCode: demo.studentCode,
          fullName: demo.fullName,
          birthDate: parseVnDate(demo.birthDate),
          gender: demo.gender,
          phone: demo.phone,
          email: demo.email,
          address: demo.address,
          identityNo: demo.identityNo,
          occupation: demo.occupation,
          level: demo.level,
          status: 'STUDYING',
          advisorId,
          branchId: branch.id,
        },
      });
      studentId = created.id;
    } else {
      const created = await prisma.student.create({
        data: {
          studentCode: demo.studentCode,
          fullName: demo.fullName,
          birthDate: parseVnDate(demo.birthDate),
          gender: demo.gender,
          phone: demo.phone,
          email: demo.email,
          address: demo.address,
          identityNo: demo.identityNo,
          occupation: demo.occupation,
          level: demo.level,
          status: index % 11 === 0 ? 'FROZEN' : 'STUDYING',
          advisorId,
          branchId: branch.id,
        },
      });
      studentId = created.id;
    }

    await prisma.studentGuardian.create({
      data: {
        studentId,
        guardianId: guardian.id,
        relation: demo.guardian.relation,
        isPrimary: true,
        receivesNotification: true,
        receivesInvoice: index % 2 === 0,
      },
    });

    await prisma.studentAssignment.create({
      data: { studentId, staffId: advisorId, fromDate: classInfo.startDate },
    });

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId,
        classId: classInfo.id,
        startDate: classInfo.startDate,
        expectedEndDate: parseVnDate(cls.endDate),
        totalSessions: 64,
        tuitionAmount: course.listPrice,
        status: 'ACTIVE',
      },
    });

    if (index % 4 === 0) {
      await prisma.studentNote.create({
        data: {
          studentId,
          title: 'Gọi điện trao đổi với phụ huynh',
          body: 'Phụ huynh xác nhận em tiến bộ rõ rệt, đề xuất tăng bài tập về nhà.',
          tone: 'SUCCESS',
           authorId: advisorUserId,
          createdAt: new Date(DEMO_TODAY.getTime() - (index % 9) * 86_400_000),
        },
      });
    }

    // Hoá đơn: tổng phải đóng = tổng gốc (không giảm) ở dữ liệu demo.
    invoiceSeq += 1;
    const dueDate = new Date(DEMO_TODAY.getTime() + demo.dueOffsetDays * 86_400_000);
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo: `PT-${String(invoiceSeq).padStart(5, '0')}`,
        enrollmentId: enrollment.id,
        subtotalAmount: course.listPrice,
        discountAmount: 0,
        totalAmount: course.listPrice,
        dueDate,
        status: 'UNPAID',
        createdBy: advisorUserId,
      },
    });
    await prisma.invoiceItem.create({
      data: {
        invoiceId: invoice.id,
        description: `Học phí ${course.name}`,
        amount: course.listPrice,
        type: 'TUITION',
        createdBy: advisorUserId,
      },
    });

    if (demo.paidRatio > 0) {
      receiptSeq += 1;
      await prisma.payment.create({
        data: {
          receiptNo: `PT2610-${String(receiptSeq).padStart(5, '0')}`,
          invoiceId: invoice.id,
          amount: Math.round((course.listPrice * demo.paidRatio) / 10_000) * 10_000,
          paidAt: new Date(DEMO_TODAY.getTime() - (5 + (index % 20)) * 86_400_000),
          method: PAYMENT_METHODS[index % PAYMENT_METHODS.length]!,
          referenceCode: index % 2 === 0 ? `FT${100000 + index}` : null,
           collectedBy: advisorUserId,
        },
      });
    }
  }

  // --- Buổi học và điểm danh ---------------------------------------------
  const sessionRows = new Map<string, Array<{ id: number; held: boolean }>>();
  for (const cls of CLASSES) {
    const classInfo = classRows.get(cls.classCode)!;
    const rows: Array<{ id: number; held: boolean }> = [];
    for (let lessonNo = 1; lessonNo <= 64; lessonNo += 1) {
      const held = lessonNo <= classInfo.doneLessons;
      // Hai buổi/tuần nên cách nhau 3–4 ngày.
      const date = new Date(classInfo.startDate.getTime() + (lessonNo - 1) * 3.5 * 86_400_000);
      const created = await prisma.classSession.create({
        data: {
          classId: classInfo.id,
          lessonNo,
          date,
          startTime: cls.startTime,
          endTime: cls.endTime,
          roomId: rooms.get(cls.roomName)!,
          teacherId: teachers.get(cls.teacherCode)!,
          topic: `Buổi ${lessonNo}: ${['Warm-up & Review', 'Listening practice', 'Speaking in pairs', 'Grammar focus'][lessonNo % 4]}`,
          unit: `Unit ${Math.ceil(lessonNo / 4)}`,
          status: held ? 'HELD' : 'SCHEDULED',
          lockedAt: held && lessonNo <= classInfo.doneLessons - 1 ? date : null,
        },
      });
      rows.push({ id: created.id, held });
    }
    sessionRows.set(cls.classCode, rows);
  }

  for (const cls of CLASSES) {
    if (cls.studentCount === 0) continue;
    const classInfo = classRows.get(cls.classCode)!;
    const rows = sessionRows.get(cls.classCode)!;
    const enrollments = await prisma.enrollment.findMany({
      where: { classId: classInfo.id, status: 'ACTIVE' },
      orderBy: { id: 'asc' },
    });

    for (const [studentIndex, enrollment] of enrollments.entries()) {
      const _rate = AVERAGE_SCORES[studentIndex % AVERAGE_SCORES.length]!;
      let counter = 0;
      for (const row of rows) {
        if (!row.held) continue;
        counter += 1;
        const roll = (studentIndex * 7 + counter * 13) % 20;
        const status = roll < 15 ? 'PRESENT' : roll < 18 ? 'LATE' : roll < 19 ? 'EXCUSED' : 'ABSENT';
        await prisma.attendance.create({
          data: {
            classSessionId: row.id,
            studentId: enrollment.studentId,
            enrollmentId: enrollment.id,
            status,
            method: 'MANUAL',
            markedAt: new Date(DEMO_TODAY.getTime()),
          },
        });
      }
    }
  }

  // --- Điểm kiểm tra và điểm số ------------------------------------------
  for (const cls of CLASSES) {
    if (cls.studentCount === 0 || cls.doneLessons < 4) continue;
    const classInfo = classRows.get(cls.classCode)!;
    const enrollments = await prisma.enrollment.findMany({
      where: { classId: classInfo.id, status: 'ACTIVE' },
      orderBy: { id: 'asc' },
    });

    for (let test = 0; test < 3; test += 1) {
      const assessment = await prisma.assessment.create({
        data: {
          classId: classInfo.id,
          roomId: rooms.get(cls.roomName)!,
          name: `${['Unit test', 'Mid-term', 'Quiz'] [test]}`,
          kind: ASSESSMENT_KINDS[test]!,
          date: new Date(DEMO_TODAY.getTime() - (30 - test * 10) * 86_400_000),
          maxScore: 10,
          weight: 100,
        },
      });

      for (const [studentIndex, enrollment] of enrollments.entries()) {
        const base = AVERAGE_SCORES[studentIndex % AVERAGE_SCORES.length]!;
        const score = Math.min(10, Math.round((base + (rand() - 0.5) * 1.4) * 10) / 10);
        await prisma.score.create({
          data: {
            assessmentId: assessment.id,
            studentId: enrollment.studentId,
            score,
            listening: Math.min(10, Math.round((score + 0.2) * 10) / 10),
            reading: Math.min(10, Math.round((score - 0.1) * 10) / 10),
            writing: Math.min(10, Math.round((score - 0.3) * 10) / 10),
            speaking: Math.min(10, Math.round((score + 0.1) * 10) / 10),
            comment: score >= 8.5 ? 'Rất tốt, tiếp tục phát huy.' : score >= 7 ? 'Đạt yêu cầu.' : 'Cần ôn thêm.',
            enteredAt: new Date(DEMO_TODAY.getTime() - (29 - test * 10) * 86_400_000),
          },
        });
      }
    }
  }

  // --- Lương --------------------------------------------------------------
  for (let month = 8; month <= 9; month += 1) {
    const periodKey = `2026-${String(month).padStart(2, '0')}`;
    const status = month === 9 ? 'APPROVED' : 'DRAFT';
    const period = await prisma.payrollPeriod.create({
      data: {
        periodKey,
        year: 2026,
        month,
        status,
        lockedBy: status === 'APPROVED' ? null : null,
        lockedAt: status === 'APPROVED' ? new Date(DEMO_TODAY) : null,
      },
    });

    for (const [index, teacher] of TEACHERS.entries()) {
      const lessons = 18 + ((index * 5) % 14);
      const lessonRate = 180_000;
      await prisma.payrollItem.create({
        data: {
          payrollPeriodId: period.id,
          userId: (await prisma.teacher.findUniqueOrThrow({ where: { teacherCode: teacher.code } })).userId!,
          lessonsTaught: lessons,
          lessonRate,
          baseSalary: 0,
          bonus: (index % 3) * 200_000,
          deduction: 0,
          allowance: 0,
          total: lessons * lessonRate + (index % 3) * 200_000,
          status,
        },
      });
    }

    for (const [index, member] of STAFF.entries()) {
      const baseSalary = 9_000_000 + (index % 3) * 1_000_000;
      await prisma.payrollItem.create({
        data: {
          payrollPeriodId: period.id,
          userId: (await prisma.staff.findUniqueOrThrow({ where: { staffCode: member.code } })).userId!,
          lessonsTaught: 0,
          lessonRate: 0,
          baseSalary,
          bonus: index % 2 === 0 ? 500_000 : 0,
          deduction: 0,
          allowance: 0,
          total: baseSalary + (index % 2 === 0 ? 500_000 : 0),
          status,
        },
      });
    }
  }

  // --- Khách tiềm năng ----------------------------------------------------
  for (const [index, lead] of LEADS.entries()) {
    const source = await prisma.leadSource.findUniqueOrThrow({ where: { name: lead.source } });
    const created = await prisma.lead.create({
      data: {
        fullName: lead.fullName,
        phone: lead.phone,
        email: `lead${index + 1}@example.com`,
        age: lead.age,
        sourceId: source.id,
        source: 'website',
        courseId: courses.get(lead.courseCode)!,
        expectedFee: lead.expectedFee,
        status: lead.status,
        lostReason: lead.status === 'LOST' ? 'Chọn trung tâm khác gần nhà' : null,
        assignedToId: staff.get(index % 2 === 0 ? 'NV0007' : 'NV0003')!.staffId,
        nextFollowUp: new Date(DEMO_TODAY.getTime() + lead.nextFollowUpOffset * 86_400_000),
        note: 'Khách liên hệ từ form tư vấn trên landing page.',
        createdAt: new Date(DEMO_TODAY.getTime() - (index + 1) * 2 * 86_400_000),
      },
    });
    await prisma.leadActivity.create({
      data: {
        leadId: created.id,
        type: 'CALL',
        content: 'Gọi tư vấn khóa học và giải thích lộ trình 64 buổi.',
        result: index % 3 === 0 ? 'CALLBACK' : 'CONNECTED',
        staffId: created.assignedToId,
        createdAt: new Date(DEMO_TODAY.getTime() - index * 86_400_000),
      },
    });
  }

  // --- Sự kiện, loại sự kiện ---------------------------------------------
  const eventTypes = new Map<string, number>();
  for (const type of EVENT_TYPES) {
    const created = await prisma.eventType.create({ data: type });
    eventTypes.set(created.name, created.id);
  }

  const eventRows = [
    { title: 'Khai giảng khóa A2 buổi tối', type: 'Sự kiện', offset: 3, allDay: false, scope: 'ALL' as const, hours: 2 },
    { title: 'Kiểm tra giữa kỳ khóa B1', type: 'Kỳ thi', offset: 12, allDay: false, scope: 'CLASSES' as const, hours: 2 },
    { title: 'Nghỉ lễ Quốc khánh', type: 'Nghỉ lễ', offset: 24, allDay: true, scope: 'ALL' as const, hours: 0 },
    { title: 'Tập huấn sư phạm nội bộ', type: 'Tập huấn', offset: 9, allDay: false, scope: 'STAFF' as const, hours: 3 },
    { title: 'Buổi học bù lớp Y3 Sabato', type: 'Buổi học', offset: 6, allDay: false, scope: 'CLASSES' as const, hours: 2 },
  ];

  for (const event of eventRows) {
    const startsAt = new Date(DEMO_TODAY.getTime() + event.offset * 86_400_000 + 13 * 3_600_000);
    await prisma.event.create({
      data: {
        title: event.title,
        eventTypeId: eventTypes.get(event.type)!,
        startsAt,
        endsAt: event.hours > 0 ? new Date(startsAt.getTime() + event.hours * 3_600_000) : null,
        allDay: event.allDay,
        scope: event.scope,
        location: 'Trung tâm — 128 Lê Lợi, Q.1',
        description: 'Sự kiện trong dữ liệu demo.',
      },
    });
  }

  // --- Nội dung website ---------------------------------------------------
  const categories = new Map<string, number>();
  for (const category of POST_CATEGORIES) {
    const created = await prisma.postCategory.create({ data: category });
    categories.set(created.name, created.id);
  }

  const staffAuthor = staff.get('NV0007')!.staffId;
  for (const [index, post] of POSTS.entries()) {
    const author = await prisma.staff.findUniqueOrThrow({ where: { id: staffAuthor } });
    const created = await prisma.post.create({
      data: {
        title: post.title,
        slug: post.slug,
        summary: post.excerpt,
        content: post.content,
        categoryId: categories.get(post.category)!,
        status: post.status,
        facebookUrl: post.status === 'PUBLISHED' ? `https://facebook.com/trungtam/posts/${index + 1}` : null,
        publishedAt: post.status === 'PUBLISHED' ? new Date(DEMO_TODAY.getTime() + post.offsetDays * 86_400_000) : null,
        authorId: author.userId,
        approvedBy: post.status === 'PUBLISHED' ? null : null,
      },
    });
    void created;
  }

  for (const [index, banner] of SITE_BANNERS.entries()) {
    await prisma.siteBanner.create({
      data: {
        title: banner.title,
        subtitle: banner.subtitle,
        cta: banner.cta,
        imageUrl: `https://images.unsplash.com/photo-1523240795612-9a054b0db644?demo=${index}`,
        link: banner.link,
        sortOrder: index + 1,
        status: 'PUBLISHED',
        showFrom: new Date(DEMO_TODAY.getTime() - 20 * 86_400_000),
      },
    });
  }

  for (const [index, testimonial] of TESTIMONIALS.entries()) {
    await prisma.testimonial.create({
      data: {
        name: testimonial.name,
        role: testimonial.role,
        quote: testimonial.quote,
        rating: testimonial.rating,
        avatarUrl: `https://images.unsplash.com/photo-1494790108377-be9c29b29330?demo=${index}`,
        sortOrder: index + 1,
        isVisible: true,
      },
    });
  }

  await prisma.galleryItem.createMany({
    data: [
      { imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644', caption: 'Lớp học Tiếng Anh A2', album: 'Cơ sở vật chất', sortOrder: 1 },
      { imageUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655', caption: 'Buổi ôn tập cuối khóa', album: 'Hoạt động', sortOrder: 2 },
      { imageUrl: 'https://images.unsplash.com/photo-1513258496099-48168024aec0', caption: 'Khai giảng khóa mới', album: 'Sự kiện', sortOrder: 3 },
    ],
  });

  await prisma.siteContent.createMany({
    data: [
      {
        key: 'about',
        content: {
          title: 'Về Trung tâm',
          body: 'Trung tâm hoạt động từ 2017 với đội ngũ giáo viên bản ngữ, lớp nhỏ tối đa 20 học viên.',
        } as never,
      },
      {
        key: 'faq',
        content: {
          items: [
            { q: 'Lớp có bao nhiêu buổi?', a: 'Mỗi khóa 64 buổi, học 2 buổi mỗi tuần trong khoảng 8 tháng.' },
            { q: 'Có được học bù không?', a: 'Có. Học viên được học bù khi vắng có phép.' },
          ],
        } as never,
      },
    ],
  });

  // --- Thông báo trong hệ thống -------------------------------------------
  const demoStudent = await prisma.student.findFirstOrThrow({ where: { userId: { not: null } } });
  const studentUser = await prisma.user.findUniqueOrThrow({ where: { id: demoStudent.userId! } });
  const notifications = [
    { title: 'Buổi học tối nay', content: 'Lớp A2 Buổi Tối 01 bắt đầu lúc 19:00 tại Phòng 204.', tone: 'INFO' as const, link: '/hoc-vien/lich-trinh' },
    { title: 'Đã nhận được thanh toán', content: 'Cảm ơn bạn, chúng tôi đã ghi nhận khoản đóng học phí.', tone: 'SUCCESS' as const, link: '/hoc-vien/hoc-phi' },
    { title: 'Nhắc nộp bài tập', content: 'Bài tập Unit 3 sắp đến hạn. Vui lòng nộp trước hạn.', tone: 'WARNING' as const, link: '/hoc-vien/bai-tap' },
  ];
  for (const [index, notification] of notifications.entries()) {
    await prisma.notification.create({
      data: {
        userId: studentUser.id,
        title: notification.title,
        content: notification.content,
        tone: notification.tone,
        link: notification.link,
        readAt: index === 0 ? new Date(DEMO_TODAY) : null,
        createdAt: new Date(DEMO_TODAY.getTime() - index * 3_600_000),
      },
    });
  }

  // --- Đối soát tiền mặt --------------------------------------------------
  for (const member of STAFF.slice(0, 3)) {
    const collected = await prisma.payment.aggregate({
      where: { collectedBy: staff.get(member.code)!.userId, method: 'CASH' },
      _sum: { amount: true },
    });
    const total = collected._sum?.amount ?? 0;
    await prisma.dailyCashClosing.create({
      data: {
        staffId: staff.get(member.code)!.staffId,
        date: DEMO_TODAY,
        shift: 'Ca sáng',
        totalSystem: total,
        totalCollected: total,
        cashOnHand: total,
        bankTransfer: 0,
        difference: 0,
        status: 'BALANCED',
        note: 'Đối soát cuối ngày (dữ liệu demo).',
      },
    });
  }

  // --- Nhật ký hệ thống mẫu -----------------------------------------------
  const actions = [
    { action: 'create', tableName: 'students', recordId: String(demoStudent.id) },
    { action: 'update', tableName: 'classes', recordId: String(classRows.get('A2T01')!.id) },
    { action: 'create', tableName: 'payments', recordId: '1' },
    { action: 'export', tableName: 'students', recordId: null },
  ];
  for (const [index, log] of actions.entries()) {
    await prisma.auditLog.create({
      data: {
        userId: studentUser.id,
        action: log.action,
        tableName: log.tableName,
        recordId: log.recordId,
        ip: '127.0.0.1',
        createdAt: new Date(DEMO_TODAY.getTime() - index * 7_200_000),
      },
    });
  }

  return accounts;
}
