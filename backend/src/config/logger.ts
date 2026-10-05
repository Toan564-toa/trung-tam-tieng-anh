import pino from 'pino';
import { isProd } from './env';

export const logger = pino({
  level: isProd ? 'info' : 'debug',
  // Không ghi mật khẩu/token vào log
  redact: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password'],
  transport: isProd ? undefined : { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } },
});
