import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { HttpError } from '../utils/httpError';
import { ACCESS_COOKIE, verifyAccessToken } from '../utils/tokens';

function extractToken(req: Request): string | null {
  const fromCookie = req.cookies?.[ACCESS_COOKIE] as string | undefined;
  if (fromCookie) return fromCookie;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

// Bắt buộc đăng nhập. Kiểm tra lại trạng thái tài khoản trong DB để khóa/vô hiệu có hiệu lực ngay.
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) throw HttpError.unauthorized();

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw HttpError.unauthorized();
  }

  const userId = Number(payload.sub);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      status: true,
      deletedAt: true,
      tokenVersion: true,
      mustChangePassword: true,
      roles: { select: { role: { select: { code: true } } } },
    },
  });

  if (!user || user.deletedAt || user.status !== 'ACTIVE') throw HttpError.unauthorized();
  if (payload.ver !== user.tokenVersion) throw HttpError.unauthorized('Phiên đăng nhập đã hết hiệu lực');
  const originalPath = req.originalUrl.split('?')[0];
  const passwordChangeAllowed =
    originalPath === '/api/auth/me' ||
    originalPath === '/api/auth/change-password' ||
    originalPath === '/api/auth/logout';
  if (user.mustChangePassword && !passwordChangeAllowed) throw HttpError.passwordChangeRequired();

  // Lấy vai trò từ DB (không tin hoàn toàn vào token)
  req.user = { id: user.id, roles: user.roles.map((r) => r.role.code) };
  next();
}

// Chỉ cho các vai trò được liệt kê đi tiếp. Dùng SAU authenticate.
export function requireRole(...allowed: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw HttpError.unauthorized();
    const ok = req.user.roles.some((r) => allowed.includes(r));
    if (!ok) throw HttpError.forbidden();
    next();
  };
}

export const isAdmin = (req: Request) => !!req.user?.roles.includes('admin');
