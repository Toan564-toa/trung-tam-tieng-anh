import { z } from 'zod';

export const markAttendanceSchema = z
  .object({
    records: z
      .array(
        z.object({
          studentId: z.number().int().positive(),
          status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
          note: z.string().trim().max(500).optional(),
        }),
      )
      .min(1, 'Cần ít nhất một học viên')
      .max(200),
  })
  .refine((v) => new Set(v.records.map((r) => r.studentId)).size === v.records.length, {
    message: 'Một học viên không được xuất hiện hai lần',
    path: ['records'],
  });

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
