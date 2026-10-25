import { z } from 'zod';

const roleCodes = z
  .array(z.enum(['admin', 'staff', 'teacher', 'student', 'guardian']))
  .min(1)
  .max(5);
const email = z.string().trim().email().max(200).optional().nullable();

export const listAccountsSchema = z.object({
  role: z.enum(['admin', 'staff', 'teacher', 'student', 'guardian']).optional(),
  status: z.enum(['active', 'locked', 'pending', 'archived']).optional(),
  tempLocked: z.enum(['true', 'false']).optional(),
  query: z.string().trim().max(100).optional(),
  onlyDeleted: z.enum(['true', 'false']).default('false'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const createAccountSchema = z.object({
  username: z.string().trim().min(3).max(100),
  fullName: z.string().trim().min(1).max(150),
  email,
  phone: z.string().trim().max(20).optional().nullable(),
  roles: roleCodes,
});

export const updateAccountSchema = z
  .object({
    fullName: z.string().trim().min(1).max(150).optional(),
    email,
    phone: z.string().trim().max(20).optional().nullable(),
    roles: roleCodes.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Cần có ít nhất một trường để cập nhật');

export const accountStatusSchema = z.object({ status: z.enum(['active', 'locked']) });
export const accountIdSchema = z.object({ id: z.coerce.number().int().positive() });
export const loginHistorySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
