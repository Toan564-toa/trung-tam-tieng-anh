import type { Request, Response } from 'express';
import * as service from './courses.service';
import {
  courseIdSchema,
  courseStatusSchema,
  createCourseSchema,
  listCoursesQuery,
  updateCourseSchema,
} from './courses.schema';

export async function list(req: Request, res: Response) {
  res.json({ data: await service.listCourses(listCoursesQuery.parse(req.query)) });
}

export async function get(req: Request, res: Response) {
  const { id } = courseIdSchema.parse(req.params);
  res.json({ data: await service.getCourse(id) });
}

export async function create(req: Request, res: Response) {
  const course = await service.createCourse(req.user!.id, createCourseSchema.parse(req.body), req.ip);
  res.status(201).json({ data: course });
}

export async function update(req: Request, res: Response) {
  const { id } = courseIdSchema.parse(req.params);
  const course = await service.updateCourse(req.user!.id, id, updateCourseSchema.parse(req.body), req.ip);
  res.json({ data: course });
}

export async function setStatus(req: Request, res: Response) {
  const { id } = courseIdSchema.parse(req.params);
  const course = await service.setCourseStatus(req.user!.id, id, courseStatusSchema.parse(req.body), req.ip);
  res.json({ data: course });
}

export async function remove(req: Request, res: Response) {
  const { id } = courseIdSchema.parse(req.params);
  await service.deleteCourse(req.user!.id, id, req.ip);
  res.status(204).send();
}

// Landing công khai (không cần đăng nhập).
export async function listPublic(req: Request, res: Response) {
  res.json({ data: await service.listPublicCourses() });
}

export async function getPublic(req: Request, res: Response) {
  const { id } = courseIdSchema.parse(req.params);
  res.json({ data: await service.getPublicCourse(id) });
}
