import { z } from 'zod';

export const listRoomsQuery = z.object({
  status: z.enum(['AVAILABLE', 'MAINTENANCE']).optional(),
  query: z.string().trim().max(100).optional(),
  branchId: z.coerce.number().int().positive().optional(),
  onlyDeleted: z.enum(['true', 'false']).default('false'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const createRoomSchema = z.object({
  branchId: z.number().int().positive(),
  name: z.string().trim().min(1, 'Vui lòng nhập tên phòng').max(100),
  capacity: z.number().int().positive('Sức chứa phải là số nguyên dương'),
  floor: z.number().int().optional().nullable(),
  equipment: z.array(z.string().trim().max(100)).max(20).default([]),
  status: z.enum(['AVAILABLE', 'MAINTENANCE']).default('AVAILABLE'),
});

export const updateRoomSchema = createRoomSchema.partial();

export const roomIdSchema = z.object({ id: z.coerce.number().int().positive() });

export type ListRoomsQuery = z.infer<typeof listRoomsQuery>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
