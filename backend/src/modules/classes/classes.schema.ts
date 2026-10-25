import { z } from 'zod';

export const listClassesQuery = z.object({
  status: z.enum(['PLANNED', 'ACTIVE', 'FINISHED', 'CANCELLED']).optional(),
  courseId: z.coerce.number().int().positive().optional(),
  teacherId: z.coerce.number().int().positive().optional(),
  level: z.string().trim().max(100).optional(),
  query: z.string().trim().max(100).optional(),
  onlyDeleted: z.enum(['true', 'false']).default('false'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const scheduleInput = z.object({
  weekday: z.number().int().min(0).max(6), // 0 = Chủ Nhật ... 6 = Thứ Bảy
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ bắt đầu phải dạng HH:mm').optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ kết thúc phải dạng HH:mm').optional(),
  roomId: z.number().int().positive().optional().nullable(),
  timeSlotId: z.number().int().positive().optional().nullable(),
}).refine((v) => {
  if (v.timeSlotId) return true;
  return v.startTime != null && v.endTime != null && v.endTime > v.startTime;
}, {
  message: 'Cần timeSlotId HOẶC (startTime + endTime)',
  path: ['startTime'],
});

export const createClassSchema = z.object({
  courseId: z.number().int().positive(),
  classCode: z.string().trim().min(1, 'Vui lòng nhập mã lớp').max(50),
  name: z.string().trim().min(1, 'Vui lòng nhập tên lớp').max(200),
  teacherId: z.number().int().positive(),
  roomId: z.number().int().positive().optional().nullable(),
  advisorId: z.number().int().positive().optional().nullable(),
  startDate: z.coerce.date(),
  expectedEndDate: z.coerce.date().optional().nullable(),
  maxStudents: z.number().int().min(1).max(200).default(20),
  status: z.enum(['PLANNED', 'ACTIVE', 'FINISHED', 'CANCELLED']).default('PLANNED'),
  schedules: z.array(scheduleInput).min(1, 'Cần ít nhất một buổi trong tuần'),
});

export const updateClassSchema = createClassSchema.omit({ schedules: true }).partial();

export const classStatusSchema = z.object({
  status: z.enum(['PLANNED', 'ACTIVE', 'FINISHED', 'CANCELLED']),
});

export const teacherChangeSchema = z.object({
  teacherId: z.number().int().positive(),
  fromDate: z.coerce.date(),
});

export const addSessionSchema = z.object({
  lessonNo: z.number().int().min(1),
  date: z.coerce.date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ bắt đầu phải dạng HH:mm').optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ kết thúc phải dạng HH:mm').optional(),
  timeSlotId: z.number().int().positive().optional(),
  roomId: z.number().int().positive().optional().nullable(),
  teacherId: z.number().int().positive().optional().nullable(),
  topic: z.string().trim().max(300).optional().nullable(),
  unit: z.string().trim().max(150).optional().nullable(),
  note: z.string().trim().max(2000).optional().nullable(),
}).refine((v) => {
  if (v.timeSlotId) return true;
  return v.startTime != null && v.endTime != null && v.endTime > v.startTime;
}, {
  message: 'Cần timeSlotId HOẶC (startTime + endTime)',
  path: ['startTime'],
});

export const updateSessionSchema = z.object({
  date: z.coerce.date().optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  timeSlotId: z.number().int().positive().optional(),
  roomId: z.number().int().positive().optional().nullable(),
  teacherId: z.number().int().positive().optional().nullable(),
  topic: z.string().trim().max(300).optional().nullable(),
  unit: z.string().trim().max(150).optional().nullable(),
  note: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(['SCHEDULED', 'HELD', 'CANCELLED', 'MAKEUP']).optional(),
  cancelReason: z.string().trim().max(300).optional().nullable(),
}).refine((v) => {
  if (v.timeSlotId) return true;
  return !v.startTime || !v.endTime || v.endTime > v.startTime;
}, {
  message: 'Giờ kết thúc phải sau giờ bắt đầu',
  path: ['endTime'],
});

export const sessionIdSchema = z.object({ sessionId: z.coerce.number().int().positive() });
export const classIdSchema = z.object({ classId: z.coerce.number().int().positive() });

export const scheduleCreateSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ bắt đầu phải dạng HH:mm'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ kết thúc phải dạng HH:mm'),
  roomId: z.number().int().positive().optional().nullable(),
  timeSlotId: z.number().int().positive().optional().nullable(),
  effectiveFrom: z.coerce.date().optional().nullable(),
  effectiveTo: z.coerce.date().optional().nullable(),
}).refine((v) => v.endTime > v.startTime, {
  message: 'Giờ kết thúc phải sau giờ bắt đầu',
  path: ['endTime'],
});

export const scheduleUpdateSchema = z.object({
  weekday: z.number().int().min(0).max(6).optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ bắt đầu phải dạng HH:mm').optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ kết thúc phải dạng HH:mm').optional(),
  roomId: z.number().int().positive().optional().nullable(),
  timeSlotId: z.number().int().positive().optional().nullable(),
  effectiveFrom: z.coerce.date().optional().nullable(),
  effectiveTo: z.coerce.date().optional().nullable(),
}).refine((v) => !v.endTime || !v.startTime || v.endTime > v.startTime, {
  message: 'Giờ kết thúc phải sau giờ bắt đầu',
  path: ['endTime'],
});

export const conflictsQuery = z.object({
  weekday: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  timeSlotId: z.coerce.number().int().positive().optional(),
  roomId: z.coerce.number().int().positive().optional(),
  teacherId: z.coerce.number().int().positive().optional(),
  excludeClassId: z.coerce.number().int().positive().optional(),
}).refine((v) => {
  // Nếu có timeSlotId thì không bắt buộc startTime/endTime
  if (v.timeSlotId) return true;
  // Nếu không có timeSlotId thì bắt buộc có startTime/endTime
  return v.startTime != null && v.endTime != null && v.endTime > v.startTime;
}, {
  message: 'Cần timeSlotId HOẶC (startTime + endTime)',
  path: ['startTime'],
});

// Phase 8: Generate sessions, enrollments, timetable
export const generateSessionsSchema = z.object({
  startDate: z.coerce.date(),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1, 'Cần ít nhất một thứ'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  timeSlotId: z.number().int().positive().optional(),
  roomId: z.number().int().positive().optional().nullable(),
  skipHolidays: z.array(z.coerce.date()).optional().default([]),
}).refine((v) => {
  // Nếu có timeSlotId thì không bắt buộc startTime/endTime
  if (v.timeSlotId) return true;
  // Nếu không có timeSlotId thì bắt buộc có startTime/endTime
  return v.startTime != null && v.endTime != null && v.endTime > v.startTime;
}, {
  message: 'Cần timeSlotId HOẶC (startTime + endTime)',
  path: ['startTime'],
});

export const timetableQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  roomId: z.coerce.number().int().positive().optional(),
  teacherId: z.coerce.number().int().positive().optional(),
  classId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListClassesQuery = z.infer<typeof listClassesQuery>;
export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
export type ClassStatusInput = z.infer<typeof classStatusSchema>;
export type TeacherChangeInput = z.infer<typeof teacherChangeSchema>;
export type AddSessionInput = z.infer<typeof addSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type ScheduleCreateInput = z.infer<typeof scheduleCreateSchema>;
export type ScheduleUpdateInput = z.infer<typeof scheduleUpdateSchema>;
export type ConflictsQuery = z.infer<typeof conflictsQuery>;
export type GenerateSessionsInput = z.infer<typeof generateSessionsSchema>;
export type TimetableQuery = z.infer<typeof timetableQuery>;
