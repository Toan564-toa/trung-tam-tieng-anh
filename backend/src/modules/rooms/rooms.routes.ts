import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth';
import * as controller from './rooms.controller';

export const roomsRoutes = Router();

roomsRoutes.use(authenticate);

// Quản lý phòng học: chỉ admin (theo bảng phân quyền).
roomsRoutes.get('/', requireRole('admin'), controller.list);
roomsRoutes.post('/', requireRole('admin'), controller.create);
roomsRoutes.patch('/:id', requireRole('admin'), controller.update);
roomsRoutes.delete('/:id', requireRole('admin'), controller.remove);
