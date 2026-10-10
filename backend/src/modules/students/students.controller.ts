import type { Request, Response } from 'express';
import { parseId } from '../../utils/params';
import { HttpError } from '../../utils/httpError';
import { buildExcelBuffer, excelResponseHeaders } from '../../utils/excel';
import { writeAudit } from '../../utils/audit';
import { uploadFileSchema } from '../files/files.schema';
import * as filesService from '../files/files.service';
import {
  assignmentIdSchema,
  assignmentSchema,
  closeAssignmentSchema,
  createStudentSchema,
  guardianIdSchema,
  guardianSchema,
  listStudentsQuery,
  studentIdSchema,
  studentStatusSchema,
  updateGuardianSchema,
  updateStudentSchema,
} from './students.schema';
import * as service from './students.service';

export async function list(req: Request, res: Response) {
  res.json({
    data: await service.listStudents(listStudentsQuery.parse(req.query), req.user!),
  });
}

export async function get(req: Request, res: Response) {
  res.json({ data: await service.getStudent(parseId(req.params.id), req.user!) });
}

export async function create(req: Request, res: Response) {
  const input = createStudentSchema.parse(req.body);
  const student = await service.createStudent(input, req.user!.id, req.ip);
  res.status(201).json({ data: student });
}

export async function update(req: Request, res: Response) {
  const { id } = studentIdSchema.parse(req.params);
  const input = updateStudentSchema.parse(req.body);
  res.json({ data: await service.updateStudent(id, input, req.user!.id, req.ip) });
}

export async function setStatus(req: Request, res: Response) {
  const { id } = studentIdSchema.parse(req.params);
  const input = studentStatusSchema.parse(req.body);
  res.json({ data: await service.setStudentStatus(id, input, req.user!.id, req.ip) });
}

export async function remove(req: Request, res: Response) {
  const { id } = studentIdSchema.parse(req.params);
  await service.softDeleteStudent(id, req.user!.id, req.ip);
  res.status(204).send();
}

export async function restore(req: Request, res: Response) {
  const { id } = studentIdSchema.parse(req.params);
  res.json({ data: await service.restoreStudent(id, req.user!.id, req.ip) });
}

export async function resetPassword(req: Request, res: Response) {
  const { id } = studentIdSchema.parse(req.params);
  const result = await service.resetStudentPassword(id, req.user!.id, req.ip);
  res.json({ data: { mustChangePassword: true }, temporaryPassword: result.temporaryPassword });
}

export async function updatePhoto(req: Request, res: Response) {
  const { id } = studentIdSchema.parse(req.params);
  const uploaded = req.file;
  if (!uploaded) throw HttpError.badRequest('Chưa có tệp nào được tải lên', 'FILE_MISSING');
  // Upload tệp (kiểm tra loại theo nội dung) rồi gắn vào hồ sơ học viên.
  const input = uploadFileSchema.parse({
    originalName: uploaded.originalname,
    declaredMimeType: uploaded.mimetype,
    ownerType: 'student',
    ownerId: id,
  });
  const file = await filesService.uploadFile({ buffer: uploaded.buffer, ...input }, req.user!);
  res.json({ data: await service.updateStudentPhoto(id, file.id, req.user!.id, req.ip) });
}

// ---------- Người giám hộ ----------

export async function listGuardians(req: Request, res: Response) {
  const { id } = studentIdSchema.parse(req.params);
  res.json({ data: await service.listGuardians(id, req.user!) });
}

export async function addGuardian(req: Request, res: Response) {
  const { id } = studentIdSchema.parse(req.params);
  const input = guardianSchema.parse(req.body);
  const guardian = await service.addGuardian(id, input, req.user!.id, req.ip);
  res.status(201).json({ data: guardian });
}

export async function updateGuardian(req: Request, res: Response) {
  const { id, guardianId } = { ...studentIdSchema.parse(req.params), ...guardianIdSchema.parse(req.params) };
  const input = updateGuardianSchema.parse(req.body);
  res.json({ data: await service.updateGuardian(id, guardianId, input, req.user!.id, req.ip) });
}

export async function removeGuardian(req: Request, res: Response) {
  const { id, guardianId } = { ...studentIdSchema.parse(req.params), ...guardianIdSchema.parse(req.params) };
  await service.removeGuardian(id, guardianId, req.user!.id, req.ip);
  res.status(204).send();
}

// ---------- Lịch sử nhân viên phụ trách ----------

export async function listAssignments(req: Request, res: Response) {
  const { id } = studentIdSchema.parse(req.params);
  res.json({ data: await service.listAssignments(id, req.user!) });
}

export async function addAssignment(req: Request, res: Response) {
  const { id } = studentIdSchema.parse(req.params);
  const input = assignmentSchema.parse(req.body);
  const assignment = await service.addAssignment(id, input, req.user!.id, req.ip);
  res.status(201).json({ data: assignment });
}

export async function closeAssignment(req: Request, res: Response) {
  const { id, assignmentId } = {
    ...studentIdSchema.parse(req.params),
    ...assignmentIdSchema.parse(req.params),
  };
  const input = closeAssignmentSchema.parse(req.body);
  res.json({ data: await service.closeAssignment(id, assignmentId, input, req.user!.id, req.ip) });
}

// ---------- Xuất Excel ----------

export async function exportExcel(req: Request, res: Response) {
  const query = listStudentsQuery.parse(req.query);
  const { columns, rows } = await service.exportStudents(query);
  const buffer = await buildExcelBuffer('Hoc vien', columns, rows);
  await writeAudit({
    userId: req.user!.id,
    action: 'export',
    tableName: 'students',
    recordId: null,
    newData: { filter: query, rows: rows.length },
    ip: req.ip,
  });
  for (const [key, value] of Object.entries(excelResponseHeaders('Danh-sach-hoc-vien.xlsx'))) {
    res.setHeader(key, value);
  }
  res.send(buffer);
}
