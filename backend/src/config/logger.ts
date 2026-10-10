import pino from 'pino';
import { isProd, isTest } from './env';

export const logger = pino({
  // Test chỉ cần biết lỗi, không in từng request để output dễ đọc.
  level: isProd ? 'info' : isTest ? 'warn' : 'debug',
  // Không ghi mật khẩu/token vào log
  redact: [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.body.password',
    'req.body.currentPassword',
    'req.body.newPassword',
    'req.body.token',
    'req.body.email',
    'req.body.temporaryPassword',
  ],
  transport: isProd ? undefined : { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } },
});
