import jwt from 'jsonwebtoken';
import type { CookieOptions } from 'express';
import { env, isProd } from '../config/env';

export interface TokenPayload {
  sub: string; // user id (dạng chuỗi theo chuẩn JWT)
  roles: string[];
}

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

export function signAccessToken(userId: number, roles: string[]): string {
  return jwt.sign({ roles }, env.JWT_ACCESS_SECRET, {
    subject: String(userId),
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
  });
}

export function signRefreshToken(userId: number): string {
  return jwt.sign({}, env.JWT_REFRESH_SECRET, {
    subject: String(userId),
    expiresIn: env.REFRESH_TOKEN_TTL_SECONDS,
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
  return { sub: String(decoded.sub), roles: (decoded.roles as string[]) ?? [] };
}

export function verifyRefreshToken(token: string): { sub: string } {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;
  return { sub: String(decoded.sub) };
}

// Cookie httpOnly: JavaScript phía trình duyệt không đọc được, giảm rủi ro bị đánh cắp token qua XSS.
// Nếu frontend và backend khác domain (khác site), cần sameSite: 'none' + secure + chống CSRF.
export function cookieOptions(maxAgeSeconds: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: maxAgeSeconds * 1000,
    path: '/',
  };
}
