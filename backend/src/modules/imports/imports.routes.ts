import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth';
import { importLimiter } from '../../middlewares/rateLimit';
import { uploadSingle } from '../../middlewares/upload';
import * as controller from './imports.controller';

export const importsRoutes = Router();

// Toàn bộ module chỉ dành cho admin, có giới hạn tốc độ riêng (thao tác nặng:
// đọc file, tạo nhiều bản ghi trong một transaction).
importsRoutes.use(authenticate, requireRole('admin'), importLimiter);

// Khai báo trước /:id để "templates" không bị route param nuốt.
importsRoutes.get('/templates/:type', controller.getTemplate);
importsRoutes.post('/', uploadSingle('file'), controller.createImport);
importsRoutes.get('/:id', controller.getPreview);
importsRoutes.post('/:id/confirm', controller.confirm);
importsRoutes.post('/:id/credentials', controller.downloadCredentials);
