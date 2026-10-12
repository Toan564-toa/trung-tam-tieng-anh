import type { Request, Response } from 'express';
import type { ImportKind } from '@prisma/client';
import {
  confirmImportBody,
  credentialsBody,
  importIdParam,
  importKindInput,
  importPreviewQuery,
  importTypeParam,
} from './imports.schema';
import * as importsService from './imports.service';
import { HttpError } from '../../utils/httpError';
import { excelResponseHeaders } from '../../utils/excel';

const TYPE_TO_KIND: Record<string, ImportKind> = {
  students: 'STUDENT',
  teachers: 'TEACHER',
  staff: 'STAFF',
};

const KIND_INPUT_TO_KIND: Record<string, ImportKind> = {
  student: 'STUDENT',
  teacher: 'TEACHER',
  staff: 'STAFF',
};

// xlsx là file zip (bắt đầu bằng "PK"). Kiểm tra sớm, không tin header Content-Type.
function isZip(buffer: Buffer): boolean {
  return buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

// GET /api/imports/templates/:type — tải Excel mẫu (tiêu đề tiếng Việt + ví dụ).
export async function getTemplate(req: Request, res: Response) {
  const { type } = importTypeParam.parse(req.params);
  const buffer = await importsService.buildTemplate(TYPE_TO_KIND[type]);
  res.set(excelResponseHeaders(`mau-nhap-${type}.xlsx`)).send(buffer);
}

// POST /api/imports (multipart) — đọc file, chuẩn hóa, kiểm tra từng dòng,
// phát hiện trùng; lưu import_batches/import_rows. Chưa tạo tài khoản.
export async function createImport(req: Request, res: Response) {
  const { kind } = importKindInput.parse({ kind: req.body?.kind ?? req.query.kind });
  const file = req.file;
  if (!file) throw HttpError.badRequest('Chưa có file', 'NO_FILE');
  if (!isZip(file.buffer)) throw HttpError.badRequest('Chỉ chấp nhận file .xlsx', 'INVALID_FILE_TYPE');
  const result = await importsService.createImport(req.user!.id, KIND_INPUT_TO_KIND[kind], file.buffer);
  res.status(201).json({ data: result });
}

// GET /api/imports/:id — bản xem trước có phân trang, tổng hợp lệ/lỗi.
export async function getPreview(req: Request, res: Response) {
  const { id } = importIdParam.parse(req.params);
  const query = importPreviewQuery.parse(req.query);
  const result = await importsService.getPreview(id, query);
  res.json({ data: result });
}

// POST /api/imports/:id/confirm — tạo user + hồ sơ + vai trò trong một transaction.
export async function confirm(req: Request, res: Response) {
  const { id } = importIdParam.parse(req.params);
  const body = confirmImportBody.parse(req.body);
  const result = await importsService.confirmImport(id, req.user!.id, body.skipErrors, req.ip ?? null);
  res.json({ data: result });
}

// POST /api/imports/:id/credentials — tải danh sách tài khoản + mật khẩu tạm
// (một lần, qua token hết hạn 15 phút).
export async function downloadCredentials(req: Request, res: Response) {
  const { id } = importIdParam.parse(req.params);
  const body = credentialsBody.parse(req.body);
  const buffer = await importsService.downloadCredentials(id, body.token);
  res.set(excelResponseHeaders(`tai-khoan-nhap-${id}.xlsx`)).send(buffer);
}
