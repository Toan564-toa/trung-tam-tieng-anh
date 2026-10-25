import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth';
import * as controller from './enrollments.controller';

export const enrollmentsRoutes = Router();

enrollmentsRoutes.use(authenticate);

// Quản lý ghi danh: admin, staff
enrollmentsRoutes.get('/', requireRole('admin', 'staff'), controller.list);
enrollmentsRoutes.post('/', requireRole('admin', 'staff'), controller.create);
enrollmentsRoutes.get('/:enrollmentId', requireRole('admin', 'staff', 'teacher', 'student'), controller.get);
enrollmentsRoutes.patch('/:enrollmentId', requireRole('admin', 'staff'), controller.update);
enrollmentsRoutes.patch('/:enrollmentId/status', requireRole('admin', 'staff'), controller.setStatus);

// Chuyển lớp
enrollmentsRoutes.post('/:enrollmentId/transfer', requireRole('admin', 'staff'), controller.transfer);

// Bảo lưu / kết thúc bảo lưu
enrollmentsRoutes.post('/:enrollmentId/freeze', requireRole('admin', 'staff'), controller.freeze);
enrollmentsRoutes.post('/:enrollmentId/unfreeze', requireRole('admin', 'staff'), controller.unfreeze);

// Buổi học bù
enrollmentsRoutes.post('/:enrollmentId/makeup', requireRole('admin', 'staff'), controller.createMakeup);