import { z } from 'zod';

export const listCoursesQuery = z.object({
  level: z.string().trim().max(100).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  query: z.string().trim().max(100).optional(),
  onlyDeleted: z.enum(['true', 'false']).default('false'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const nonNegativeInt = z.number().int().min(0);

export const createCourseSchema = z.object({
  code: z.string().trim().min(1, 'Vui lòng nhập mã khóa').max(50),
  slug: z.string().trim().min(1, 'Vui lòng nhập slug').max(150),
  name: z.string().trim().min(1, 'Vui lòng nhập tên khóa').max(200),
  level: z.string().trim().max(100).optional().nullable(),
  language: z.string().trim().max(100).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  totalSessions: nonNegativeInt.default(64),
  sessionsPerWeek: nonNegativeInt.default(2),
  durationMonths: nonNegativeInt.default(8),
  listPrice: nonNegativeInt.default(0),
  minAge: z.number().int().min(0).optional().nullable(),
  maxAge: z.number().int().min(0).optional().nullable(),
  targetStudents: z.number().int().min(0).optional().nullable(),
  audience: z.string().trim().max(200).optional().nullable(),
  schedule: z.array(z.string().trim().max(100)).max(20).default([]),
  highlights: z.array(z.string().trim().max(300)).max(20).default([]),
  featured: z.boolean().default(false),
  levelTone: z.string().trim().max(50).optional().nullable(),
  imageFileId: z.number().int().positive().optional().nullable(),
  isPublic: z.boolean().default(true),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
});

export const updateCourseSchema = createCourseSchema.partial();

export const courseStatusSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
});

export const courseIdSchema = z.object({ id: z.coerce.number().int().positive() });

export type ListCoursesQuery = z.infer<typeof listCoursesQuery>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type CourseStatusInput = z.infer<typeof courseStatusSchema>;
