import { z } from 'zod';

export const listTimeSlotsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(100),
});

export const createTimeSlotSchema = z.object({
  code: z.string().trim().min(1, 'Vui lòng nhập mã ca').max(20),
  label: z.string().trim().min(1, 'Vui lòng nhập tên ca').max(100),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ bắt đầu phải dạng HH:mm'),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ kết thúc phải dạng HH:mm'),
  sortOrder: z.number().int().min(0).default(0),
}).refine((v) => v.endTime > v.startTime, {
  message: 'Giờ kết thúc phải sau giờ bắt đầu',
  path: ['endTime'],
});

export const updateTimeSlotSchema = z.object({
  code: z.string().trim().min(1, 'Vui lòng nhập mã ca').max(20).optional(),
  label: z.string().trim().min(1, 'Vui lòng nhập tên ca').max(100).optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ bắt đầu phải dạng HH:mm').optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ kết thúc phải dạng HH:mm').optional(),
  sortOrder: z.number().int().min(0).optional(),
}).refine((v) => !v.endTime || !v.startTime || v.endTime > v.startTime, {
  message: 'Giờ kết thúc phải sau giờ bắt đầu',
  path: ['endTime'],
});

export const timeSlotIdSchema = z.object({ id: z.coerce.number().int().positive() });

export type ListTimeSlotsQuery = z.infer<typeof listTimeSlotsQuery>;
export type CreateTimeSlotInput = z.infer<typeof createTimeSlotSchema>;
export type UpdateTimeSlotInput = z.infer<typeof updateTimeSlotSchema>;
