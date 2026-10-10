import { z } from 'zod';

const phone = z.string().trim().regex(/^[0-9+\s.-]{8,15}$/, 'Số điện thoại không hợp lệ');
const email = z.string().trim().email('Email không hợp lệ').max(200).optional().nullable();

export const listTeachersQuery = z.object({
  query: z.string().trim().max(100).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  showOnWebsite: z.enum(['true', 'false']).optional(),
  onlyDeleted: z.enum(['true', 'false']).default('false'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// Tùy chọn tạo kèm tài khoản đăng nhập (chỉ cần username; mật khẩu tạm sinh ngẫu nhiên).
export const createTeacherSchema = z.object({
  fullName: z.string().trim().min(1, 'Vui lòng nhập họ tên').max(150),
  phone: phone.optional().nullable(),
  email,
  specialty: z.string().trim().max(200).optional().nullable(),
  certificate: z.string().trim().max(300).optional().nullable(),
  experience: z.string().trim().max(200).optional().nullable(),
  education: z.string().trim().max(300).optional().nullable(),
  bio: z.string().trim().max(2000).optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  showOnWebsite: z.boolean().optional(),
  branchId: z.number().int().positive().optional().nullable(),
  account: z.object({ username: z.string().trim().min(3).max(100) }).optional(),
});

export const updateTeacherSchema = createTeacherSchema
  .omit({ account: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Cần có ít nhất một trường để cập nhật');

export const teacherStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export const teacherIdSchema = z.object({ id: z.coerce.number().int().positive() });

export type ListTeachersQuery = z.infer<typeof listTeachersQuery>;
export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;
export type TeacherStatusInput = z.infer<typeof teacherStatusSchema>;
