import type { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { logger } from '../config/logger';
import { isProd } from '../config/env';
import { HttpError } from '../utils/httpError';

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy đường dẫn' } });
}

// Express 5 tự chuyển lỗi từ hàm async vào đây, không cần try/catch ở từng controller.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu gửi lên không hợp lệ',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
  }

  // Lỗi upload tệp (multer): quá dung lượng hoặc lỗi multipart.
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'Tệp vượt quá dung lượng cho phép',
        },
      });
    }
    return res.status(400).json({
      error: { code: 'FILE_UPLOAD_ERROR', message: 'Tải tệp lên không thành công' },
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }

  // Lỗi của Prisma: nhận biết qua mã lỗi, không cần import kiểu lỗi
  const code = (err as { code?: string } | null)?.code;
  if (code === 'P2002') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'Dữ liệu bị trùng với bản ghi đã có' } });
  }
  if (code === 'P2025') {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy dữ liệu' } });
  }
  if (code === 'P2003') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'Dữ liệu đang được liên kết nơi khác' } });
  }

  // Lỗi không lường trước: ghi log chi tiết, trả về thông báo chung (không lộ thông tin nội bộ)
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: isProd ? 'Lỗi hệ thống, vui lòng thử lại sau' : String((err as Error)?.message ?? err),
    },
  });
}
