import { z } from 'zod';

const phone = z.string().trim().regex(/^[0-9+\s.-]{8,15}$/, 'Số điện thoại không hợp lệ');
const email = z.string().trim().email('Email không hợp lệ').max(200).optional().nullable();

export const listStaffQuery = z.object({
  query: z.string().trim().max(100).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  onlyDeleted: z.enum(['true', 'false']).default('false'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// Tùy chọn tạo kèm tài khoản đăng nhập (chỉ cần username; mật khẩu tạm sinh ngẫu nhiên).
export const createStaffSchema = z.object({
  fullName: z.string().trim().min(1, 'Vui lòng nhập họ tên').max(150),
  phone: phone.optional().nullable(),
  email,
  position: z.string().trim().max(150).optional().nullable(),
  department: z.string().trim().max(150).optional().nullable(),
  education: z.string().trim().max(300).optional().nullable(),
  bio: z.string().trim().max(2000).optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  branchId: z.number().int().positive().optional().nullable(),
  account: z.object({ username: z.string().trim().min(3).max(100) }).optional(),
});

export const updateStaffSchema = createStaffSchema
  .omit({ account: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Cần có ít nhất một trường để cập nhật');

export const staffStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export const staffIdSchema = z.object({ id: z.coerce.number().int().positive() });

export type ListStaffQuery = z.infer<typeof listStaffQuery>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type StaffStatusInput = z.infer<typeof staffStatusSchema>;
