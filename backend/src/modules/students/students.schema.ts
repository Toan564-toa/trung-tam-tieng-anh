import { z } from 'zod';

const phone = z
  .string()
  .trim()
  .regex(/^[0-9+\s.-]{8,15}$/, 'Số điện thoại không hợp lệ');

export const listStudentsQuery = z.object({
  search: z.string().trim().optional(),
  status: z.enum(['STUDYING', 'FROZEN', 'DROPPED', 'GRADUATED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const createStudentSchema = z.object({
  fullName: z.string().trim().min(1, 'Vui lòng nhập họ tên').max(150),
  dob: z.coerce.date().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  phone: phone.optional(),
  email: z.string().trim().email('Email không hợp lệ').optional(),
  address: z.string().trim().max(300).optional(),
  note: z.string().trim().max(1000).optional(),
  advisorId: z.number().int().positive().optional(),
});

export const updateStudentSchema = createStudentSchema.partial().extend({
  status: z.enum(['STUDYING', 'FROZEN', 'DROPPED', 'GRADUATED']).optional(),
});

export type ListStudentsQuery = z.infer<typeof listStudentsQuery>;
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
