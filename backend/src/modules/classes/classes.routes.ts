import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth';
import * as controller from './classes.controller';

export const classesRoutes = Router();

classesRoutes.use(authenticate);

// Static routes (phải đặt TRƯỚC /:id)
classesRoutes.get('/today', requireRole('admin', 'staff'), controller.listToday);
classesRoutes.get('/conflicts', requireRole('admin', 'staff'), controller.checkConflicts);
classesRoutes.get('/timetable', requireRole('admin', 'staff', 'teacher'), controller.listTimetable);
classesRoutes.get('/teacher/classes', requireRole('teacher'), controller.listTeacherClasses);

// Quản lý lớp học: admin, staff
classesRoutes.get('/', requireRole('admin', 'staff'), controller.list);
classesRoutes.post('/', requireRole('admin'), controller.create);

// Parameterized routes (đặt SAU static routes)
classesRoutes.get('/:id', requireRole('admin', 'staff', 'teacher'), controller.get);
classesRoutes.patch('/:id', requireRole('admin'), controller.update);
classesRoutes.patch('/:id/status', requireRole('admin'), controller.setStatus);
classesRoutes.delete('/:id', requireRole('admin'), controller.remove);
classesRoutes.patch('/:id/teacher', requireRole('admin'), controller.changeTeacher);

// Sinh buổi học từ thời khóa biểu
classesRoutes.post('/:id/generate-sessions', requireRole('admin', 'staff'), controller.generateSessions);

// Học viên trong lớp
classesRoutes.get('/:id/students', requireRole('admin', 'staff', 'teacher'), controller.listStudents);

// Buổi học (sessions)
classesRoutes.get('/:id/sessions', requireRole('admin', 'staff', 'teacher'), controller.listSessions);
classesRoutes.post('/:id/sessions', requireRole('admin', 'staff'), controller.addSession);
classesRoutes.patch('/:id/sessions/:sessionId', requireRole('admin', 'staff'), controller.updateSession);

// Lịch học (schedules)
classesRoutes.get('/:id/schedules', requireRole('admin', 'staff', 'teacher'), controller.listSchedules);
classesRoutes.post('/:id/schedules', requireRole('admin'), controller.addSchedule);
classesRoutes.patch('/schedules/:id', requireRole('admin'), controller.updateSchedule);
classesRoutes.delete('/schedules/:id', requireRole('admin'), controller.deleteSchedule);

// Giáo viên: lớp của mình (phải đặt SAU /:id để không bị bắt)
classesRoutes.get('/teacher/classes/:id/students', requireRole('teacher'), controller.listTeacherClassStudents);