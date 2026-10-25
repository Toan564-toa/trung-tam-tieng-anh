import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth';
import * as controller from './accounts.controller';

export const accountsRoutes = Router();
accountsRoutes.use(authenticate, requireRole('admin'));
accountsRoutes.get('/', controller.list);
accountsRoutes.post('/', controller.create);
accountsRoutes.patch('/:id', controller.update);
accountsRoutes.patch('/:id/status', controller.setStatus);
accountsRoutes.post('/:id/unlock-temp', controller.unlockTemp);
accountsRoutes.post('/:id/reset-password', controller.resetPassword);
accountsRoutes.get('/:id/login-history', controller.loginHistory);
accountsRoutes.delete('/:id', controller.remove);
accountsRoutes.patch('/:id/restore', controller.restore);
