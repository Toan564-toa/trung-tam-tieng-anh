import { Router } from 'express';
import { accountsRoutes } from './modules/accounts/accounts.routes';
import { attendanceRoutes } from './modules/attendance/attendance.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { classesRoutes } from './modules/classes/classes.routes';
import { coursesRoutes, publicCoursesRoutes } from './modules/courses/courses.routes';
import { enrollmentsRoutes } from './modules/enrollments/enrollments.routes';
import { filesRoutes, publicFilesRoutes } from './modules/files/files.routes';
import { importsRoutes } from './modules/imports/imports.routes';
import { leadsRoutes, publicLeadsRoutes } from './modules/leads/leads.routes';
import { meRoutes, profileChangeRoutes } from './modules/me/me.routes';
import { roomsRoutes } from './modules/rooms/rooms.routes';
import { staffRoutes } from './modules/staff/staff.routes';
import { studentsRoutes } from './modules/students/students.routes';
import { teachersRoutes } from './modules/teachers/teachers.routes';
import { timeSlotsRoutes } from './modules/time-slots/time-slots.routes';

// Mọi route của ứng dụng được gom ở đây và gắn dưới tiền tố /api
export const apiRoutes = Router();

apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/users', accountsRoutes);
apiRoutes.use('/me', meRoutes);
apiRoutes.use('/profile-change-requests', profileChangeRoutes);
apiRoutes.use('/files', filesRoutes);
apiRoutes.use('/public/files', publicFilesRoutes);
apiRoutes.use('/public/leads', publicLeadsRoutes);
apiRoutes.use('/students', studentsRoutes);
apiRoutes.use('/teachers', teachersRoutes);
apiRoutes.use('/staff', staffRoutes);
apiRoutes.use('/attendance', attendanceRoutes);
apiRoutes.use('/leads', leadsRoutes);
apiRoutes.use('/imports', importsRoutes);
apiRoutes.use('/classes', classesRoutes);
apiRoutes.use('/courses', coursesRoutes);
apiRoutes.use('/rooms', roomsRoutes);
apiRoutes.use('/time-slots', timeSlotsRoutes);
apiRoutes.use('/enrollments', enrollmentsRoutes);
apiRoutes.use('/public/courses', publicCoursesRoutes);

// Các module tiếp theo (thêm dần):
// apiRoutes.use('/events', eventsRoutes);
// apiRoutes.use('/payments', paymentsRoutes);
// apiRoutes.use('/payroll', payrollRoutes);
// apiRoutes.use('/posts', postsRoutes);
