import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth';
import * as controller from './time-slots.controller';

export const timeSlotsRoutes = Router();

timeSlotsRoutes.use(authenticate);

// Danh sách ca học: mọi vai trò đều cần xem khi dựng/lập thời khóa biểu.
timeSlotsRoutes.get('/', requireRole('admin', 'staff', 'teacher', 'student'), controller.list);
// Thay đổi ca học: chỉ admin.
timeSlotsRoutes.post('/', requireRole('admin'), controller.create);
timeSlotsRoutes.patch('/:id', requireRole('admin'), controller.update);
timeSlotsRoutes.delete('/:id', requireRole('admin'), controller.remove);
