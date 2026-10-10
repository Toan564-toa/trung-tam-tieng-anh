import nodemailer from 'nodemailer';
import { env, isProd } from '../config/env';
import { logger } from '../config/logger';

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${env.PASSWORD_RESET_URL}?token=${encodeURIComponent(token)}`;
  const text = `Để đặt lại mật khẩu, mở liên kết sau (có hiệu lực 20 phút): ${resetUrl}`;

  if (!env.SMTP_HOST && !isProd) {
    const safeUrl = `${env.PASSWORD_RESET_URL}?token=[đã ẩn]`;
    logger.info(
      {
        to: '[đã ẩn]',
        subject: 'Đặt lại mật khẩu',
        text: `Để đặt lại mật khẩu, mở liên kết sau (có hiệu lực 20 phút): ${safeUrl}`,
      },
      'Email development (đã ẩn địa chỉ và token)',
    );
    return;
  }
  if (!env.SMTP_HOST) throw new Error('Chưa cấu hình SMTP_HOST');

  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE === 'true',
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  });
  await transport.sendMail({ from: env.MAIL_FROM, to: email, subject: 'Đặt lại mật khẩu', text });
}
