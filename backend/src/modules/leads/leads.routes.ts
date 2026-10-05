import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth';
import { publicFormLimiter } from '../../middlewares/rateLimit';
import * as controller from './leads.controller';

// Công khai (không cần đăng nhập): gắn ở /api/public/leads
export const publicLeadsRoutes = Router();
publicLeadsRoutes.post('/', publicFormLimiter, controller.createPublic);

// Nội bộ: gắn ở /api/leads
export const leadsRoutes = Router();
leadsRoutes.use(authenticate, requireRole('admin', 'staff'));
leadsRoutes.get('/', controller.list);
leadsRoutes.patch('/:id', controller.update);
