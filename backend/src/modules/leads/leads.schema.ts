import { z } from 'zod';

export const createLeadSchema = z.object({
  fullName: z.string().trim().min(1, 'Vui lòng nhập họ tên').max(150),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\s.-]{8,15}$/, 'Số điện thoại không hợp lệ'),
  // Cho phép bỏ trống (chuỗi rỗng) hoặc email hợp lệ
  email: z
    .union([z.literal(''), z.string().trim().email('Email không hợp lệ')])
    .optional()
    .transform((v) => v || undefined),
  interestedCourse: z.string().trim().max(150).optional(),
  message: z.string().trim().max(1000).optional(),
  // Ô ẩn chống bot: người thật không thấy nên không điền. Có giá trị => bỏ qua.
  website: z.string().optional(),
});

export const listLeadsQuery = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'TRIAL', 'WON', 'LOST']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateLeadSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'TRIAL', 'WON', 'LOST']).optional(),
  assignedToId: z.number().int().positive().nullable().optional(),
  note: z.string().trim().max(1000).optional(),
});
