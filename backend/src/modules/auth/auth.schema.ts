import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Vui lòng nhập tên đăng nhập'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
  portal: z.enum(['client', 'admin']).default('client'),
});

export const forgotPasswordSchema = z.object({ email: z.string().trim().email().max(200) });
export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(200),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Za-z]/)
    .regex(/[0-9]/),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z
      .string()
      .min(8, 'Mật khẩu mới tối thiểu 8 ký tự')
      .regex(/[A-Za-z]/, 'Mật khẩu mới phải có chữ cái')
      .regex(/[0-9]/, 'Mật khẩu mới phải có chữ số'),
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
    path: ['newPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
