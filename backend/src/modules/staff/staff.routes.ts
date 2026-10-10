import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth';
import { uploadSingle } from '../../middlewares/upload';
import * as controller from './staff.controller';

export const staffRoutes = Router();

staffRoutes.use(authenticate, requireRole('admin'));

staffRoutes.get('/', controller.list);
// Phải khai báo trước /:id để không bị route param nuốt mất.
staffRoutes.get('/export', controller.exportExcel);
staffRoutes.get('/:id', controller.get);
staffRoutes.post('/', controller.create);
staffRoutes.patch('/:id', controller.update);
staffRoutes.patch('/:id/status', controller.setStatus);
staffRoutes.patch('/:id/restore', controller.restore);
staffRoutes.post('/:id/reset-password', controller.resetPassword);
// Ảnh đại diện: upload tệp trước (module files), rồi gắn fileId vào hồ sơ.
staffRoutes.post('/:id/photo', uploadSingle('file'), controller.updatePhoto);
staffRoutes.delete('/:id', controller.remove);
