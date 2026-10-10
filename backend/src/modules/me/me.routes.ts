import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth';
import { uploadSingle } from '../../middlewares/upload';
import * as controller from './me.controller';

export const meRoutes = Router();

// Hồ sơ và yêu cầu đổi hồ sơ của chính mình: mọi vai trò đăng nhập đều dùng được.
meRoutes.use(authenticate);
meRoutes.get('/profile', controller.getProfile);
meRoutes.patch('/profile', controller.updateProfile);
meRoutes.post('/photo', uploadSingle('file'), controller.updateAvatar);
meRoutes.get('/profile-change-requests', controller.listMyChangeRequests);

// Duyệt yêu cầu đổi hồ sơ: nhân viên và admin.
export const profileChangeRoutes = Router();
profileChangeRoutes.use(authenticate, requireRole('admin', 'staff'));
profileChangeRoutes.get('/', controller.listChangeRequests);
profileChangeRoutes.patch('/:id', controller.reviewChangeRequest);
