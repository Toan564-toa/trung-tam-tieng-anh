import { z } from 'zod';

// Loại import theo URL: số nhiều (students/teachers/staff) → ImportKind (STUDENT/TEACHER/STAFF).
export const importTypeParam = z.object({
  type: z.enum(['students', 'teachers', 'staff']),
});

// `kind` có thể gửi bằng form field (multipart) hoặc query string.
export const importKindInput = z.object({
  kind: z.enum(['student', 'teacher', 'staff']),
});

export const importIdParam = z.object({
  id: z.coerce.number().int().positive(),
});

export const importPreviewQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'VALID', 'ERROR', 'CREATED']).optional(),
});

// Xác nhận nhập: bỏ qua dòng lỗi (true) hoặc dừng toàn bộ khi còn dòng lỗi (false, mặc định).
export const confirmImportBody = z.object({
  skipErrors: z.coerce.boolean().default(false),
});

// Token một lần để tải danh sách tài khoản + mật khẩu tạm.
export const credentialsBody = z.object({
  token: z.string().trim().min(1, 'Thiếu token'),
});

export type ImportTypeParam = z.infer<typeof importTypeParam>;
export type ImportKindInput = z.infer<typeof importKindInput>;
export type ImportIdParam = z.infer<typeof importIdParam>;
export type ImportPreviewQuery = z.infer<typeof importPreviewQuery>;
export type ConfirmImportBody = z.infer<typeof confirmImportBody>;
export type CredentialsBody = z.infer<typeof credentialsBody>;
