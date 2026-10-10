import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth';
import { uploadSingle } from '../../middlewares/upload';
import * as controller from './teachers.controller';

export const teachersRoutes = Router();

teachersRoutes.use(authenticate, requireRole('admin'));

teachersRoutes.get('/', controller.list);
// Phải khai báo trước /:id để không bị route param nuốt mất.
teachersRoutes.get('/export', controller.exportExcel);
teachersRoutes.get('/:id', controller.get);
teachersRoutes.post('/', controller.create);
teachersRoutes.patch('/:id', controller.update);
teachersRoutes.patch('/:id/status', controller.setStatus);
teachersRoutes.patch('/:id/restore', controller.restore);
teachersRoutes.post('/:id/reset-password', controller.resetPassword);
// Ảnh đại diện: upload tệp trước (module files), rồi gắn fileId vào hồ sơ.
teachersRoutes.post('/:id/photo', uploadSingle('file'), controller.updatePhoto);
teachersRoutes.delete('/:id', controller.remove);
