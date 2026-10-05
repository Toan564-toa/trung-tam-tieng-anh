import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth';
import * as controller from './attendance.controller';

export const attendanceRoutes = Router();

attendanceRoutes.use(authenticate, requireRole('admin', 'staff', 'teacher'));

// Xem và lưu điểm danh của một buổi học (giáo viên chỉ với lớp mình, kiểm tra trong service)
attendanceRoutes.get('/sessions/:sessionId', controller.getBySession);
attendanceRoutes.put('/sessions/:sessionId', controller.mark);

// TODO: GET /sessions/:sessionId/export  -> xuất Excel bằng exceljs
// TODO: POST /sessions/:sessionId/unlock -> admin mở khóa
