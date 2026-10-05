# backend

API cho hệ thống quản lý trung tâm ngoại ngữ. Node.js 20+, Express 5, TypeScript, Prisma 6, PostgreSQL.

> **Trạng thái P2 (2026-10-05): khung backend đã được cài, biên dịch và kiểm chứng.**
> `npm run typecheck`, `npm run lint`, `npm test` đều xanh. Xem `../docs/PROGRESS.md` và `../docs/DECISIONS.md`
> (D-014…D-019) để biết đã phải sửa gì.
> `HUONG-DAN-BACKEND.md` (gốc, do người viết khung cung cấp) vẫn nằm ở thư mục này làm tài liệu tham chiếu.

## 1. Cài đặt lần đầu

```bash
cd backend
npm install

# npm 11 chặn install script của Prisma và argon2, phải duyệt rồi mới sinh client
npm install-scripts approve @prisma/client @prisma/engines argon2 esbuild prisma
npx prisma generate

cp .env.example .env
```

Sửa `.env`: đặt hai khoá JWT ngẫu nhiên (≥ 32 ký tự) và mật khẩu admin seed.

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> Không bao giờ commit `.env`. Nếu copy từ máy khác có `.env.example` cũ chứa URL database thật, hãy dùng lại
> bản trong repo này (chỉ trỏ về PostgreSQL local) — xem D-015.

## 2. Database

Cần PostgreSQL 14+. Cách nhanh nhất là Docker:

```bash
docker compose up -d          # tạo container trung_tam_db, database trung_tam
npx prisma migrate dev --name init
npm run db:seed               # vai trò, tài khoản admin, một khóa học mẫu
```

Tài khoản admin đầu tiên lấy từ `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` trong `.env`.
Tài khoản này có `mustChangePassword = true`, phải đổi mật khẩu ở lần đăng nhập đầu.

Database test là `trung_tam_test` (xem `TEST_DATABASE_URL`); script test tự xoá và dựng lại, không cần tạo tay.

## 3. Chạy

```bash
npm run dev      # tsx watch, tự nạp lại khi sửa
npm run build && npm start
```

Kiểm tra: <http://localhost:4000/health> trả `{"status":"ok","time":"…"}`.

Gọi thử bằng tay: mở `requests/*.http` bằng extension **REST Client** của VS Code, bấm *Send Request* theo thứ tự.

| File | Phủ |
|---|---|
| `requests/auth.http` | health, đăng nhập đúng/sai, `/me`, refresh, đổi mật khẩu, đăng xuất |
| `requests/students.http` | danh sách, lọc, phân trang, tạo, sửa, xoá mềm |
| `requests/leads.http` | form tư vấn công khai (kèm ô chống bot, rate limit) và quản lý nội bộ |
| `requests/attendance.http` | quyền theo dữ liệu, điểm danh, buổi đã khoá |

## 4. Kiểm tra chất lượng

```bash
npm run typecheck    # tsc cho src, test và prisma
npm run lint         # ESLint (flat config)
npm run format       # Prettier — dùng khi chỉnh định dạng
npm test             # Vitest + supertest, cần PostgreSQL đang chạy
```

`npm test` xoá và dựng lại database `trung_tam_test` ở đầu mỗi lần chạy, xoá sạch dữ liệu trước mỗi test.

## 5. Cấu trúc

```
backend/
  prisma/
    schema.prisma        # 12 model, tên bảng ánh xạ snake_case (xem D-019 về tên cột)
    seed.ts              # vai trò, admin đầu tiên, khóa học mẫu
    migrations/          # sinh ra khi chạy migrate, ĐƯA LÊN GIT, không sửa bản đã áp dụng
  requests/              # ví dụ gọi thử (REST Client của VS Code)
  tests/                 # auth, phân quyền, học viên, điểm danh, khách tiềm năng
  src/
    server.ts            # khởi chạy, tắt êm
    app.ts               # lắp ráp Express, /health, rate limit, xử lý lỗi
    routes.ts            # gom route dưới /api
    config/              # env (zod), prisma client, logger (pino)
    middlewares/         # auth (authenticate, requireRole), errorHandler, rateLimit
    modules/<tên>/       # routes, controller, schema (+ service ở các module lớn)
    utils/               # httpError, tokens, audit, params
    types/express.d.ts   # khai báo req.user
```

Mỗi module có 4 file (`*.routes.ts`, `*.controller.ts`, `*.service.ts`, `*.schema.ts`).
Ngoại lệ hiện tại: module `leads` để logic truy vấn trong `leads.controller.ts` — sẽ tách `leads.service.ts`
khi làm tiếp module này (ghi trong `../docs/PROGRESS.md`).

Xem `../docs/PROGRESS.md` và `../AGENTS.md` trước khi code.