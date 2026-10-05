import rateLimit from 'express-rate-limit';

const message = {
  error: { code: 'TOO_MANY_REQUESTS', message: 'Bạn thao tác quá nhanh, vui lòng thử lại sau' },
};

// Khi chạy test, nới hạn mức: bộ test cố tình đăng nhập sai nhiều lần để kiểm tra khoá tài khoản,
// nếu giữ hạn thật thì test sẽ nhận 429 trước khi tới bước kiểm tra khoá.
const isTest = process.env.NODE_ENV === 'test';
const real = (limit: number, testLimit = 100_000) => (isTest ? testLimit : limit);

// Giới hạn chung cho toàn bộ API
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: real(600),
  standardHeaders: true,
  legacyHeaders: false,
  message,
});

// Đăng nhập: chặt hơn để chống dò mật khẩu
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: real(20),
  standardHeaders: true,
  legacyHeaders: false,
  message,
});

// Form đăng ký tư vấn công khai: chống spam
export const publicFormLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: real(10),
  standardHeaders: true,
  legacyHeaders: false,
  message,
});
