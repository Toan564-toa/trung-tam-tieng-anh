import { z } from 'zod';

export const createEnrollmentSchema = z.object({
  studentId: z.number().int().positive(),
  classId: z.number().int().positive(),
  startDate: z.coerce.date().optional().nullable(),
  expectedEndDate: z.coerce.date().optional().nullable(),
  tuitionAmount: z.number().int().positive().optional(),
  discountAmount: z.number().int().min(0).default(0),
  note: z.string().trim().max(500).optional().nullable(),
});

export const updateEnrollmentSchema = z.object({
  startDate: z.coerce.date().optional().nullable(),
  expectedEndDate: z.coerce.date().optional().nullable(),
  tuitionAmount: z.number().int().positive().optional(),
  pauseReason: z.string().trim().max(500).optional().nullable(),
});

export const enrollmentStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'FROZEN', 'DROPPED', 'COMPLETED', 'TRANSFERRED']),
});

export const transferClassSchema = z.object({
  newClassId: z.number().int().positive(),
  transferDate: z.coerce.date(),
  reason: z.string().trim().max(500).optional().nullable(),
});

export const freezeEnrollmentSchema = z.object({
  fromDate: z.coerce.date(),
  expectedToDate: z.coerce.date().optional().nullable(),
  reason: z.string().trim().max(500),
});

export const unfreezeEnrollmentSchema = z.object({
  toDate: z.coerce.date().optional().nullable(),
  reason: z.string().trim().max(500).optional().nullable(),
});

export const makeupSessionSchema = z.object({
  originalSessionId: z.number().int().positive(),
  makeupDate: z.coerce.date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  timeSlotId: z.number().int().positive().optional(),
  roomId: z.number().int().positive().optional().nullable(),
  teacherId: z.number().int().positive().optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
}).refine((v) => {
  if (v.timeSlotId) return true;
  return v.startTime != null && v.endTime != null && v.endTime > v.startTime;
}, {
  message: 'Cần timeSlotId HOẶC (startTime + endTime)',
  path: ['startTime'],
});

export const listEnrollmentsQuery = z.object({
  studentId: z.coerce.number().int().positive().optional(),
  classId: z.coerce.number().int().positive().optional(),
  status: z.enum(['ACTIVE', 'FROZEN', 'DROPPED', 'COMPLETED', 'TRANSFERRED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const enrollmentIdSchema = z.object({ enrollmentId: z.coerce.number().int().positive() });

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
export type UpdateEnrollmentInput = z.infer<typeof updateEnrollmentSchema>;
export type EnrollmentStatusInput = z.infer<typeof enrollmentStatusSchema>;
export type TransferClassInput = z.infer<typeof transferClassSchema>;
export type FreezeEnrollmentInput = z.infer<typeof freezeEnrollmentSchema>;
export type UnfreezeEnrollmentInput = z.infer<typeof unfreezeEnrollmentSchema>;
export type MakeupSessionInput = z.infer<typeof makeupSessionSchema>;
export type ListEnrollmentsQuery = z.infer<typeof listEnrollmentsQuery>;