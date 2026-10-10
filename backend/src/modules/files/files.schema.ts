import { z } from 'zod';

// ownerType xác định đối tượng sở hữu tệp (ảnh đại diện/hồ sơ).
// Chỉ các giá trị này được phép gắn ownerId; tệp không thuộc ai thì để trống.
export const ownerTypes = ['student', 'teacher', 'staff', 'user'] as const;

export const uploadFileSchema = z.object({
  originalName: z.string().trim().min(1).max(255),
  declaredMimeType: z.string().trim().min(1).max(120),
  ownerType: z.enum(ownerTypes).optional(),
  ownerId: z.coerce.number().int().positive().optional(),
});

export const fileIdSchema = z.object({ id: z.coerce.number().int().positive() });

export type UploadFileInput = z.infer<typeof uploadFileSchema>;
