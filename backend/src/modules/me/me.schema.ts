import { z } from 'zod';

const phone = z.string().trim().regex(/^[0-9+\s.-]{8,15}$/, 'Số điện thoại không hợp lệ');
const email = z.string().trim().email('Email không hợp lệ').max(200).optional().nullable();

// Trường mỗi vai trò được sửa trực tiếp và trường phải qua duyệt
// được khai báo trong service (theo FRONTEND-CONTRACT.md C.2.7/C.3.11/C.4.10).
export const updateProfileSchema = z
  .object({
    phone: phone.optional().nullable(),
    email,
    address: z.string().trim().max(300).optional().nullable(),
    occupation: z.string().trim().max(150).optional().nullable(),
    bio: z.string().trim().max(2000).optional().nullable(),
    fullName: z.string().trim().min(1).max(150).optional(),
    birthDate: z.coerce.date().optional().nullable(),
    identityNo: z.string().trim().max(50).optional().nullable(),
    certificate: z.string().trim().max(300).optional().nullable(),
    specialty: z.string().trim().max(200).optional().nullable(),
    position: z.string().trim().max(150).optional().nullable(),
    department: z.string().trim().max(150).optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Cần có ít nhất một trường để cập nhật');

export const reviewChangeSchema = z.object({
  action: z.enum(['approve', 'reject']),
});

export const changeRequestIdSchema = z.object({ id: z.coerce.number().int().positive() });

export const listChangeRequestsQuery = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ReviewChangeInput = z.infer<typeof reviewChangeSchema>;
export type ListChangeRequestsQuery = z.infer<typeof listChangeRequestsQuery>;
