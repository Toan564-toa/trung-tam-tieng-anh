import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { loginLimiter } from '../../middlewares/rateLimit';
import * as controller from './auth.controller';

export const authRoutes = Router();

authRoutes.post('/login', loginLimiter, controller.login);
authRoutes.post('/refresh', controller.refresh);
authRoutes.post('/logout', controller.logout);
authRoutes.get('/me', authenticate, controller.me);
authRoutes.post('/change-password', authenticate, controller.changePassword);
