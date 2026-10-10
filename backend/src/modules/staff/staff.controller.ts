import type { Request, Response } from 'express';
import { parseId } from '../../utils/params';
import { HttpError } from '../../utils/httpError';
import { buildExcelBuffer, excelResponseHeaders } from '../../utils/excel';
import { writeAudit } from '../../utils/audit';
import { uploadFileSchema } from '../files/files.schema';
import * as filesService from '../files/files.service';
import {
  listStaffQuery,
  staffIdSchema,
  staffStatusSchema,
  createStaffSchema,
  updateStaffSchema,
} from './staff.schema';
import * as service from './staff.service';

export async function list(req: Request, res: Response) {
  res.json({ data: await service.listStaff(listStaffQuery.parse(req.query)) });
}

export async function get(req: Request, res: Response) {
  res.json({ data: await service.getStaff(parseId(req.params.id)) });
}

export async function create(req: Request, res: Response) {
  const input = createStaffSchema.parse(req.body);
  const result = await service.createStaff(input, req.user!.id, req.ip);
  // Mật khẩu tạm chỉ trả về duy nhất lần này, không lưu dạng rõ ở DB.
  res.status(201).json({ data: result.staff, temporaryPassword: result.temporaryPassword });
}

export async function update(req: Request, res: Response) {
  const { id } = staffIdSchema.parse(req.params);
  const input = updateStaffSchema.parse(req.body);
  res.json({ data: await service.updateStaff(id, input, req.user!.id, req.ip) });
}

export async function setStatus(req: Request, res: Response) {
  const { id } = staffIdSchema.parse(req.params);
  const input = staffStatusSchema.parse(req.body);
  res.json({ data: await service.setStaffStatus(id, input, req.user!.id, req.ip) });
}

export async function remove(req: Request, res: Response) {
  const { id } = staffIdSchema.parse(req.params);
  await service.softDeleteStaff(id, req.user!.id, req.ip);
  res.status(204).send();
}

export async function restore(req: Request, res: Response) {
  const { id } = staffIdSchema.parse(req.params);
  res.json({ data: await service.restoreStaff(id, req.user!.id, req.ip) });
}

export async function resetPassword(req: Request, res: Response) {
  const { id } = staffIdSchema.parse(req.params);
  const result = await service.resetStaffPassword(id, req.user!.id, req.ip);
  res.json({ data: { mustChangePassword: true }, temporaryPassword: result.temporaryPassword });
}

export async function updatePhoto(req: Request, res: Response) {
  const { id } = staffIdSchema.parse(req.params);
  const uploaded = req.file;
  if (!uploaded) throw HttpError.badRequest('Chưa có tệp nào được tải lên', 'FILE_MISSING');
  // Upload tệp (kiểm tra loại theo nội dung) rồi gắn vào hồ sơ nhân viên.
  const input = uploadFileSchema.parse({
    originalName: uploaded.originalname,
    declaredMimeType: uploaded.mimetype,
    ownerType: 'staff',
    ownerId: id,
  });
  const file = await filesService.uploadFile({ buffer: uploaded.buffer, ...input }, req.user!);
  res.json({ data: await service.updateStaffPhoto(id, file.id, req.user!.id, req.ip) });
}

export async function exportExcel(req: Request, res: Response) {
  const query = listStaffQuery.parse(req.query);
  const { columns, rows } = await service.exportStaff(query);
  const buffer = await buildExcelBuffer('Nhan vien', columns, rows);
  await writeAudit({
    userId: req.user!.id,
    action: 'export',
    tableName: 'staff',
    recordId: null,
    newData: { filter: query, rows: rows.length },
    ip: req.ip,
  });
  for (const [key, value] of Object.entries(excelResponseHeaders('Danh-sach-nhan-vien.xlsx'))) {
    res.setHeader(key, value);
  }
  res.send(buffer);
}
