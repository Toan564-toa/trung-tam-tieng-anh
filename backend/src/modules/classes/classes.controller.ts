import type { Request, Response } from 'express';
import { parseId } from '../../utils/params';
import * as service from './classes.service';
import {
  addSessionSchema,
  classStatusSchema,
  conflictsQuery,
  createClassSchema,
  generateSessionsSchema,
  listClassesQuery,
  scheduleCreateSchema,
  scheduleUpdateSchema,
  timetableQuery,
  updateClassSchema,
  updateSessionSchema,
} from './classes.schema';

export async function list(req: Request, res: Response) {
  res.json({ data: await service.listClasses(listClassesQuery.parse(req.query), req.user!) });
}

export async function get(req: Request, res: Response) {
  const id = parseId(req.params.id, 'classId');
  res.json({ data: await service.getClass(id, req.user!) });
}

export async function create(req: Request, res: Response) {
  const classData = await service.createClass(req.user!.id, createClassSchema.parse(req.body), req.ip);
  res.status(201).json({ data: classData });
}

export async function update(req: Request, res: Response) {
  const id = parseId(req.params.id, 'classId');
  const classData = await service.updateClass(req.user!.id, id, updateClassSchema.parse(req.body), req.ip);
  res.json({ data: classData });
}

export async function setStatus(req: Request, res: Response) {
  const id = parseId(req.params.id, 'classId');
  const classData = await service.setClassStatus(req.user!.id, id, classStatusSchema.parse(req.body), req.ip);
  res.json({ data: classData });
}

export async function remove(req: Request, res: Response) {
  const id = parseId(req.params.id, 'classId');
  await service.deleteClass(req.user!.id, id, req.ip);
  res.status(204).send();
}

export async function changeTeacher(req: Request, res: Response) {
  const id = parseId(req.params.id, 'classId');
  const classData = await service.changeTeacher(req.user!.id, id, req.body, req.ip);
  res.json({ data: classData });
}

export async function listStudents(req: Request, res: Response) {
  const id = parseId(req.params.id, 'classId');
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  res.json({ data: await service.listStudents(id, req.user!, page, pageSize) });
}

export async function listSessions(req: Request, res: Response) {
  const id = parseId(req.params.id, 'classId');
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  res.json({ data: await service.listSessions(id, req.user!, page, pageSize) });
}

export async function addSession(req: Request, res: Response) {
  const id = parseId(req.params.id, 'classId');
  const session = await service.addSession(req.user!.id, id, addSessionSchema.parse(req.body), req.ip);
  res.status(201).json({ data: session });
}

export async function updateSession(req: Request, res: Response) {
  const id = parseId(req.params.id, 'classId');
  const sessionId = parseId(req.params.sessionId, 'sessionId');
  const session = await service.updateSession(req.user!.id, id, sessionId, updateSessionSchema.parse(req.body), req.ip);
  res.json({ data: session });
}

export async function generateSessions(req: Request, res: Response) {
  const id = parseId(req.params.id, 'classId');
  const result = await service.generateSessionsForClass(req.user!.id, id, generateSessionsSchema.parse(req.body), req.ip);
  res.json({ data: result });
}

export async function addSchedule(req: Request, res: Response) {
  const id = parseId(req.params.id, 'classId');
  const schedule = await service.addSchedule(req.user!.id, id, scheduleCreateSchema.parse(req.body), req.ip);
  res.status(201).json({ data: schedule });
}

export async function updateSchedule(req: Request, res: Response) {
  const scheduleId = parseId(req.params.id, 'scheduleId');
  const schedule = await service.updateSchedule(req.user!.id, scheduleId, scheduleUpdateSchema.parse(req.body), req.ip);
  res.json({ data: schedule });
}

export async function deleteSchedule(req: Request, res: Response) {
  await service.deleteSchedule(req.user!.id, parseId(req.params.id, 'scheduleId'), req.ip);
  res.status(204).send();
}

// Lấy danh sách lịch học của một lớp (GET /api/classes/:id/schedules)
export async function listSchedules(req: Request, res: Response) {
  const id = parseId(req.params.id, 'classId');
  res.json({ data: await service.listSchedules(id, req.user!) });
}

export async function checkConflicts(req: Request, res: Response) {
  const result = await service.checkConflicts(conflictsQuery.parse(req.query));
  res.json({ data: result });
}

export async function listTimetable(req: Request, res: Response) {
  res.json({ data: await service.listTimetable(timetableQuery.parse(req.query), req.user!) });
}

export async function listToday(req: Request, res: Response) {
  res.json({ data: await service.listToday(req.user!) });
}

export async function listTeacherClasses(req: Request, res: Response) {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  res.json({ data: await service.listTeacherClasses(req.user!, page, pageSize) });
}

export async function listTeacherClassStudents(req: Request, res: Response) {
  const id = parseId(req.params.id, 'classId');
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  res.json({ data: await service.listTeacherClassStudents(req.user!, id, page, pageSize) });
}