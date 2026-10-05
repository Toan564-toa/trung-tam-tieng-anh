import type { Request, Response } from 'express';
import { parseId } from '../../utils/params';
import { createStudentSchema, listStudentsQuery, updateStudentSchema } from './students.schema';
import * as service from './students.service';

export async function list(req: Request, res: Response) {
  const query = listStudentsQuery.parse(req.query);
  res.json({ data: await service.listStudents(query) });
}

export async function get(req: Request, res: Response) {
  res.json({ data: await service.getStudent(parseId(req.params.id)) });
}

export async function create(req: Request, res: Response) {
  const input = createStudentSchema.parse(req.body);
  const student = await service.createStudent(input, req.user!.id, req.ip);
  res.status(201).json({ data: student });
}

export async function update(req: Request, res: Response) {
  const input = updateStudentSchema.parse(req.body);
  const student = await service.updateStudent(parseId(req.params.id), input, req.user!.id, req.ip);
  res.json({ data: student });
}

export async function remove(req: Request, res: Response) {
  await service.softDeleteStudent(parseId(req.params.id), req.user!.id, req.ip);
  res.status(204).send();
}
