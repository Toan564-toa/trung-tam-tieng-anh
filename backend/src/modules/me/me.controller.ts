import type { Request, Response } from 'express';
import { HttpError } from '../../utils/httpError';
import { uploadFileSchema } from '../files/files.schema';
import * as filesService from '../files/files.service';
import {
  changeRequestIdSchema,
  listChangeRequestsQuery,
  reviewChangeSchema,
  updateProfileSchema,
} from './me.schema';
import * as service from './me.service';

export async function getProfile(req: Request, res: Response) {
  res.json({ data: await service.getMyProfile(req.user!) });
}

export async function updateProfile(req: Request, res: Response) {
  const input = updateProfileSchema.parse(req.body);
  res.json({ data: await service.updateMyProfile(req.user!, input) });
}

// Upload ảnh đại diện cho tài khoản (users.avatar_file_id).
export async function updateAvatar(req: Request, res: Response) {
  const uploaded = req.file;
  if (!uploaded) throw HttpError.badRequest('Chưa có tệp nào được tải lên', 'FILE_MISSING');
  const input = uploadFileSchema.parse({
    originalName: uploaded.originalname,
    declaredMimeType: uploaded.mimetype,
    ownerType: 'user',
    ownerId: req.user!.id,
  });
  const file = await filesService.uploadFile({ buffer: uploaded.buffer, ...input }, req.user!);
  res.json({ data: await service.updateMyAvatar(req.user!, file.id) });
}

export async function listMyChangeRequests(req: Request, res: Response) {
  res.json({
    data: await service.listMyChangeRequests(req.user!, listChangeRequestsQuery.parse(req.query)),
  });
}

// Nhân viên/admin duyệt yêu cầu đổi hồ sơ.
export async function listChangeRequests(req: Request, res: Response) {
  res.json({ data: await service.listChangeRequests(listChangeRequestsQuery.parse(req.query)) });
}

export async function reviewChangeRequest(req: Request, res: Response) {
  const { id } = changeRequestIdSchema.parse(req.params);
  const input = reviewChangeSchema.parse(req.body);
  res.json({ data: await service.reviewChangeRequest(id, input, req.user!, req.ip) });
}

// Phase 8: Học viên - Danh sách ghi danh của mình (GET /api/me/enrollments)
export async function listMyEnrollments(req: Request, res: Response) {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  res.json({ data: await service.listMyEnrollments(req.user!, page, pageSize) });
}

// Phase 8: Học viên - Danh sách 64 buổi học kèm trạng thái điểm danh (GET /api/me/lessons)
export async function listMyLessons(req: Request, res: Response) {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 100;
  const from = req.query.from ? new Date(req.query.from as string) : undefined;
  const to = req.query.to ? new Date(req.query.to as string) : undefined;
  res.json({ data: await service.listMyLessons(req.user!, page, pageSize, from, to) });
}
