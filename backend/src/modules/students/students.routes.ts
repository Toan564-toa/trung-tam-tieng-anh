import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth';
import * as controller from './students.controller';

export const studentsRoutes = Router();

// Toàn bộ nhóm này yêu cầu đăng nhập
studentsRoutes.use(authenticate);

// Admin và nhân viên quản lý học viên. Giáo viên chỉ xem học viên lớp mình qua module lớp học (làm sau).
studentsRoutes.get('/', requireRole('admin', 'staff'), controller.list);
studentsRoutes.get('/:id', requireRole('admin', 'staff'), controller.get);
studentsRoutes.post('/', requireRole('admin', 'staff'), controller.create);
studentsRoutes.patch('/:id', requireRole('admin', 'staff'), controller.update);
// Xóa cần admin (theo bảng phân quyền)
studentsRoutes.delete('/:id', requireRole('admin'), controller.remove);
