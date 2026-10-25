import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth';
import * as controller from './courses.controller';

export const coursesRoutes = Router();
export const publicCoursesRoutes = Router();

// Quản lý khóa học: admin viết, staff đọc.
coursesRoutes.use(authenticate);
coursesRoutes.get('/', requireRole('admin', 'staff'), controller.list);
coursesRoutes.get('/:id', requireRole('admin', 'staff'), controller.get);
coursesRoutes.post('/', requireRole('admin'), controller.create);
coursesRoutes.patch('/:id', requireRole('admin'), controller.update);
coursesRoutes.patch('/:id/status', requireRole('admin'), controller.setStatus);
coursesRoutes.delete('/:id', requireRole('admin'), controller.remove);

// Landing trang công khai: không cần đăng nhập.
publicCoursesRoutes.get('/', controller.listPublic);
publicCoursesRoutes.get('/:id', controller.getPublic);
