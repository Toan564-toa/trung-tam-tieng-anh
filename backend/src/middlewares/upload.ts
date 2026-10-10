import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { env } from '../config/env';

const maxBytes = env.FILE_MAX_SIZE_MB * 1024 * 1024;

// Nhận tệp vào bộ nhớ rồi kiểm tra nội dung trong service — không ghi đĩa
// trước khi xác minh loại tệp. Giới hạn dung lượng ở đây để chặn file lớn sớm.
export function uploadSingle(field: string) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1 },
  }).single(field) as (req: Request, res: Response, next: NextFunction) => void;
}
