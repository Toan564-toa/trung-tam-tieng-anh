import { z } from 'zod';

const phone = z
  .string()
  .trim()
  .regex(/^[0-9+\s.-]{8,15}$/, 'Số điện thoại không hợp lệ');

export const listStudentsQuery = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['STUDYING', 'FROZEN', 'DROPPED', 'GRADUATED']).optional(),
  classId: z.coerce.number().int().positive().optional(),
  advisorId: z.coerce.number().int().positive().optional(),
  onlyDeleted: z.enum(['true', 'false']).default('false'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const createStudentSchema = z.object({
  fullName: z.string().trim().min(1, 'Vui lòng nhập họ tên').max(150),
  birthDate: z.coerce.date().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
  phone: phone.optional().nullable(),
  email: z.string().trim().email('Email không hợp lệ').max(200).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  identityNo: z.string().trim().max(50).optional().nullable(),
  occupation: z.string().trim().max(150).optional().nullable(),
  level: z.string().trim().max(100).optional().nullable(),
  school: z.string().trim().max(200).optional().nullable(),
  note: z.string().trim().max(1000).optional().nullable(),
  advisorId: z.number().int().positive().optional().nullable(),
  sourceId: z.number().int().positive().optional().nullable(),
  branchId: z.number().int().positive().optional().nullable(),
});

export const updateStudentSchema = createStudentSchema.partial().extend({
  status: z.enum(['STUDYING', 'FROZEN', 'DROPPED', 'GRADUATED']).optional(),
});

export const studentStatusSchema = z.object({
  status: z.enum(['STUDYING', 'FROZEN', 'DROPPED', 'GRADUATED']),
});

export const studentIdSchema = z.object({ id: z.coerce.number().int().positive() });
export const guardianIdSchema = z.object({ guardianId: z.coerce.number().int().positive() });
export const assignmentIdSchema = z.object({ assignmentId: z.coerce.number().int().positive() });

// Người giám hộ (phụ huynh). Liên kết với học viên qua student_guardians.
export const guardianSchema = z.object({
  fullName: z.string().trim().min(1, 'Vui lòng nhập họ tên phụ huynh').max(150),
  phone: phone,
  email: z.string().trim().email('Email không hợp lệ').max(200).optional().nullable(),
  occupation: z.string().trim().max(150).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  relation: z.string().trim().min(1).max(50), // Bố | Mẹ | Ông | Bà | Anh chị
  isPrimary: z.boolean().optional(),
  receivesNotification: z.boolean().optional(),
  receivesInvoice: z.boolean().optional(),
});

export const updateGuardianSchema = guardianSchema.partial().extend({
  relation: z.string().trim().min(1).max(50).optional(),
});

// Lịch sử nhân viên phụ trách hồ sơ học viên.
export const assignmentSchema = z.object({
  staffId: z.number().int().positive(),
  fromDate: z.coerce.date(),
  toDate: z.coerce.date().optional().nullable(),
  reason: z.string().trim().max(300).optional().nullable(),
});

export const closeAssignmentSchema = z.object({
  toDate: z.coerce.date(),
  reason: z.string().trim().max(300).optional().nullable(),
});

export type ListStudentsQuery = z.infer<typeof listStudentsQuery>;
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type StudentStatusInput = z.infer<typeof studentStatusSchema>;
export type GuardianInput = z.infer<typeof guardianSchema>;
export type UpdateGuardianInput = z.infer<typeof updateGuardianSchema>;
export type AssignmentInput = z.infer<typeof assignmentSchema>;
export type CloseAssignmentInput = z.infer<typeof closeAssignmentSchema>;
