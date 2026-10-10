import type { Request, Response } from 'express';
import { parseId } from '../../utils/params';
import { HttpError } from '../../utils/httpError';
import { uploadFileSchema } from './files.schema';
import * as service from './files.service';

export async function upload(req: Request, res: Response) {
  const uploaded = req.file;
  if (!uploaded) throw HttpError.badRequest('Chưa có tệp nào được tải lên', 'FILE_MISSING');
  const input = uploadFileSchema.parse({
    originalName: uploaded.originalname,
    declaredMimeType: uploaded.mimetype,
    ownerType: req.body?.ownerType,
    ownerId: req.body?.ownerId,
  });
  const created = await service.uploadFile({ buffer: uploaded.buffer, ...input }, req.user!);
  res.status(201).json({ data: created });
}

export async function download(req: Request, res: Response) {
  const { file, data } = await service.getFile(parseId(req.params.id), req.user!);
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${encodeURIComponent(file.originalName)}"`,
  );
  res.setHeader('Cache-Control', 'no-store');
  res.send(data);
}

// Ảnh giáo viên hiển thị trên landing page — không cần đăng nhập.
export async function downloadPublic(req: Request, res: Response) {
  const { file, data } = await service.getPublicFile(parseId(req.params.id));
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${encodeURIComponent(file.originalName)}"`,
  );
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(data);
}
