import { HttpError } from './httpError';

// Chuyển tham số đường dẫn (chuỗi) thành số nguyên dương, sai thì báo lỗi 400.
export function parseId(value: unknown, name = 'id'): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw HttpError.badRequest(`${name} không hợp lệ`);
  return n;
}
