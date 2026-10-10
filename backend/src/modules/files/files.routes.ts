import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { uploadSingle } from '../../middlewares/upload';
import * as controller from './files.controller';

export const filesRoutes = Router();

// Upload và xem tệp nội bộ đều yêu cầu đăng nhập; quyền cụ thể kiểm tra trong service.
filesRoutes.use(authenticate);
filesRoutes.post('/upload', uploadSingle('file'), controller.upload);
filesRoutes.get('/:id', controller.download);

// Tuyến công khai: chỉ ảnh giáo viên bật showOnWebsite mới xem được.
export const publicFilesRoutes = Router();
publicFilesRoutes.get('/:id', controller.downloadPublic);
