import type { Request, Response } from 'express';
import { env } from '../../config/env';
import { HttpError } from '../../utils/httpError';
import { ACCESS_COOKIE, REFRESH_COOKIE, cookieOptions, verifyRefreshToken } from '../../utils/tokens';
import { changePasswordSchema, forgotPasswordSchema, loginSchema, resetPasswordSchema } from './auth.schema';
import * as authService from './auth.service';

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(env.ACCESS_TOKEN_TTL_SECONDS));
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(env.REFRESH_TOKEN_TTL_SECONDS));
}

export async function login(req: Request, res: Response) {
  const { username, password, portal } = loginSchema.parse(req.body);
  const result = await authService.login(username, password, portal, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  setAuthCookies(res, result.accessToken, result.refreshToken);
  res.json({ data: { user: result.user } });
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!token) throw HttpError.unauthorized();

  let userId: number;
  try {
    userId = Number(verifyRefreshToken(token).sub);
  } catch {
    throw HttpError.unauthorized();
  }

  const payload = verifyRefreshToken(token);
  const tokens = await authService.refreshSession(userId, payload.jti, token, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  res.json({ data: { ok: true } });
}

export async function logout(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await authService.revokeRefreshSession(Number(payload.sub), payload.jti, token);
    } catch {
      /* Logout vẫn phải xóa cookie dù phiên đã hỏng/hết hạn. */
    }
  }
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
  res.json({ data: { ok: true } });
}

export async function me(req: Request, res: Response) {
  const profile = await authService.getProfile(req.user!.id);
  res.json({ data: profile });
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  const tokens = await authService.changePassword(req.user!.id, currentPassword, newPassword, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  // Đổi mật khẩu làm vô hiệu token cũ (tokenVersion đổi, refresh thu hồi) —
  // đặt cookie phiên mới để người dùng tiếp tục dùng hệ thống luôn.
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  res.json({ data: { ok: true } });
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = forgotPasswordSchema.parse(req.body);
  await authService.requestPasswordReset(email);
  res.json({ data: { message: 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi.' } });
}

export async function resetPassword(req: Request, res: Response) {
  const { token, newPassword } = resetPasswordSchema.parse(req.body);
  const tokens = await authService.resetPassword(token, newPassword, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  res.json({ data: { ok: true } });
}
