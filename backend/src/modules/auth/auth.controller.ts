import type { Request, Response } from 'express';
import { env } from '../../config/env';
import { HttpError } from '../../utils/httpError';
import { ACCESS_COOKIE, REFRESH_COOKIE, cookieOptions, verifyRefreshToken } from '../../utils/tokens';
import { changePasswordSchema, loginSchema } from './auth.schema';
import * as authService from './auth.service';

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(env.ACCESS_TOKEN_TTL_SECONDS));
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(env.REFRESH_TOKEN_TTL_SECONDS));
}

export async function login(req: Request, res: Response) {
  const { username, password } = loginSchema.parse(req.body);
  const result = await authService.login(username, password, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  setAuthCookies(res, result.accessToken, result.refreshToken);
  res.json({ data: result.user });
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

  const tokens = await authService.refreshSession(userId);
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  res.json({ data: { ok: true } });
}

export async function logout(_req: Request, res: Response) {
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
  await authService.changePassword(req.user!.id, currentPassword, newPassword, req.ip);
  res.json({ data: { ok: true } });
}
