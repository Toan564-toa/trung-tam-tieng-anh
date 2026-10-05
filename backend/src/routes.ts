import { Router } from 'express';
import { attendanceRoutes } from './modules/attendance/attendance.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { leadsRoutes, publicLeadsRoutes } from './modules/leads/leads.routes';
import { studentsRoutes } from './modules/students/students.routes';

// Mọi route của ứng dụng được gom ở đây và gắn dưới tiền tố /api
export const apiRoutes = Router();

apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/public/leads', publicLeadsRoutes);
apiRoutes.use('/students', studentsRoutes);
apiRoutes.use('/attendance', attendanceRoutes);
apiRoutes.use('/leads', leadsRoutes);

// Các module tiếp theo (thêm dần):
// apiRoutes.use('/classes', classesRoutes);
// apiRoutes.use('/events', eventsRoutes);
// apiRoutes.use('/payments', paymentsRoutes);
// apiRoutes.use('/payroll', payrollRoutes);
// apiRoutes.use('/posts', postsRoutes);
// apiRoutes.use('/imports', importsRoutes);
