import argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { CookieOptions } from 'express';
import { env, isProd } from '../config/env';

export interface TokenPayload {
  sub: string; // user id (dạng chuỗi theo chuẩn JWT)
  roles: string[];
  ver: number;
}

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

export function signAccessToken(userId: number, roles: string[], tokenVersion = 0): string {
  return jwt.sign({ roles, ver: tokenVersion }, env.JWT_ACCESS_SECRET, {
    subject: String(userId),
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
  });
}

export function signRefreshToken(userId: number, tokenId = randomUUID()): string {
  return jwt.sign({}, env.JWT_REFRESH_SECRET, {
    subject: String(userId),
    jwtid: tokenId,
    expiresIn: env.REFRESH_TOKEN_TTL_SECONDS,
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
  return { sub: String(decoded.sub), roles: (decoded.roles as string[]) ?? [], ver: Number(decoded.ver ?? 0) };
}

export function verifyRefreshToken(token: string): { sub: string; jti: string } {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;
  if (typeof decoded.jti !== 'string') throw new Error('Thiếu mã refresh token');
  return { sub: String(decoded.sub), jti: decoded.jti };
}

// Băm refresh token trước khi lưu — bảng không bao giờ chứa token thô.
export async function hashRefreshToken(token: string): Promise<string> {
  return argon2.hash(token, { type: argon2.argon2id, timeCost: 2 });
}

export async function verifyRefreshTokenHash(token: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, token);
  } catch {
    return false;
  }
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
