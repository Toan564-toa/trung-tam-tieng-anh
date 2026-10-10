import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth';
import { uploadSingle } from '../../middlewares/upload';
import * as controller from './students.controller';

export const studentsRoutes = Router();

// Toàn bộ nhóm này yêu cầu đăng nhập
studentsRoutes.use(authenticate);

// Admin và nhân viên quản lý học viên. Giáo viên chỉ thấy học viên lớp mình
// (kiểm tra phạm vi trong service, không dựa vào việc ẩn menu).
studentsRoutes.get('/', requireRole('admin', 'staff', 'teacher'), controller.list);
// Phải khai báo trước /:id để không bị route param nuốt mất.
studentsRoutes.get('/export', requireRole('admin'), controller.exportExcel);
studentsRoutes.get('/:id', requireRole('admin', 'staff', 'teacher', 'student'), controller.get);
studentsRoutes.post('/', requireRole('admin', 'staff'), controller.create);
studentsRoutes.patch('/:id', requireRole('admin', 'staff'), controller.update);
studentsRoutes.patch('/:id/status', requireRole('admin', 'staff'), controller.setStatus);
studentsRoutes.patch('/:id/restore', requireRole('admin'), controller.restore);
studentsRoutes.post('/:id/reset-password', requireRole('admin'), controller.resetPassword);
studentsRoutes.post('/:id/photo', requireRole('admin', 'staff'), uploadSingle('file'), controller.updatePhoto);
// Xóa cần admin (theo bảng phân quyền)
studentsRoutes.delete('/:id', requireRole('admin'), controller.remove);

// Người giám hộ (phụ huynh) của học viên
studentsRoutes.get('/:id/guardians', requireRole('admin', 'staff', 'teacher'), controller.listGuardians);
studentsRoutes.post('/:id/guardians', requireRole('admin', 'staff'), controller.addGuardian);
studentsRoutes.patch('/:id/guardians/:guardianId', requireRole('admin', 'staff'), controller.updateGuardian);
studentsRoutes.delete('/:id/guardians/:guardianId', requireRole('admin', 'staff'), controller.removeGuardian);

// Lịch sử nhân viên phụ trách hồ sơ học viên
studentsRoutes.get('/:id/assignments', requireRole('admin', 'staff'), controller.listAssignments);
studentsRoutes.post('/:id/assignments', requireRole('admin', 'staff'), controller.addAssignment);
studentsRoutes.patch('/:id/assignments/:assignmentId/close', requireRole('admin', 'staff'), controller.closeAssignment);
