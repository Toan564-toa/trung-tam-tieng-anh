# Hướng dẫn dựng backend: Express + TypeScript + Prisma + PostgreSQL

> **Tình trạng của khung dự án này:** mã nguồn đã được viết và kiểm tra cú pháp bằng TypeScript, nhưng **chưa được cài thư viện, biên dịch đầy đủ hay chạy thử** (môi trường mình làm việc không tải được thư viện npm). Vì vậy bước đầu tiên của bạn là chạy `npm run typecheck`; nếu có lỗi nhỏ do khác phiên bản thư viện, hãy gửi lại cho mình để sửa.

---

## 1. Chuẩn bị

| Cần có | Ghi chú |
|---|---|
| **Node.js 20 LTS trở lên** (khuyên dùng 22) | Kiểm tra: `node -v` |
| **PostgreSQL 14 trở lên** | Cài trực tiếp, hoặc dùng Docker (xem mục 3) |
| **Git** | Quản lý mã nguồn |
| **Postman / Thunder Client / Bruno** | Gọi thử API |
| Trình soạn thảo | VS Code |

---

## 2. Cài đặt từng bước

### 2.1. Giải nén và vào thư mục dự án

```bash
cd trung-tam-backend
```

(Nếu muốn tạo dự án từ đầu thay vì dùng khung có sẵn: `mkdir trung-tam-backend && cd trung-tam-backend && npm init -y`, sau đó chép các thư mục `src`, `prisma` và các file cấu hình vào.)

### 2.2. Cài thư viện chạy chính (dependencies)

```bash
npm install express@5 cookie-parser cors helmet express-rate-limit dotenv zod argon2 jsonwebtoken @prisma/client@6 pino pino-http
```

| Thư viện | Dùng để |
|---|---|
| `express@5` | Khung server (bản 5 tự chuyển lỗi async vào bộ xử lý lỗi) |
| `cookie-parser` | Đọc cookie chứa token |
| `cors` | Cho phép web React gọi API |
| `helmet` | Thêm header bảo mật |
| `express-rate-limit` | Giới hạn số lần gọi, chống dò mật khẩu và spam |
| `dotenv` | Đọc file `.env` |
| `zod` | Kiểm tra dữ liệu gửi lên |
| `argon2` | Băm mật khẩu |
| `jsonwebtoken` | Tạo và xác minh token đăng nhập |
| `@prisma/client@6` | Truy vấn database |
| `pino`, `pino-http` | Ghi log |

### 2.3. Cài thư viện phục vụ phát triển (devDependencies)

```bash
npm install -D typescript tsx prisma@6 @types/node @types/express @types/cookie-parser @types/cors @types/jsonwebtoken pino-pretty
```

| Thư viện | Dùng để |
|---|---|
| `typescript` | Ngôn ngữ và trình biên dịch |
| `tsx` | Chạy TypeScript trực tiếp, tự khởi động lại khi sửa code |
| `prisma@6` | Công cụ migration, sinh client |
| `@types/*` | Khai báo kiểu cho các thư viện |
| `pino-pretty` | In log dễ đọc khi phát triển |

> **Vì sao ghim Prisma bản 6?** Khung dự án viết theo cách cấu hình của Prisma 6 (`generator client`, `new PrismaClient()`). Các bản mới hơn có thể đổi cách cấu hình (ví dụ file `prisma.config.ts`, driver adapter). Nếu bạn muốn dùng bản mới nhất, hãy đọc tài liệu Prisma hiện hành và nhờ mình chuyển đổi.

### 2.4. Thư viện thêm khi tới tính năng tương ứng

Chưa cần cài ngay. Cài khi bắt đầu làm tính năng đó.

```bash
# Import / xuất Excel + nhận tệp upload
npm install multer exceljs
npm install -D @types/multer

# Gửi email (quên mật khẩu, gửi tài khoản)
npm install nodemailer
npm install -D @types/nodemailer

# Tác vụ định kỳ (nhắc học phí, khóa kỳ điểm danh)
npm install node-cron
npm install -D @types/node-cron

# Xử lý ngày giờ
npm install date-fns

# Biên lai PDF
npm install pdfkit
npm install -D @types/pdfkit

# Tài liệu API (Swagger)
npm install swagger-ui-express
npm install -D @types/swagger-ui-express

# Kiểm thử
npm install -D vitest supertest @types/supertest

# Chất lượng code
npm install -D eslint prettier
```

### 2.5. Cấu hình môi trường

```bash
cp .env.example .env
```

Mở `.env` và sửa:

1. `DATABASE_URL`: địa chỉ database của bạn.
2. `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`: hai chuỗi ngẫu nhiên khác nhau, dài từ 32 ký tự. Tạo nhanh:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
3. `SEED_ADMIN_PASSWORD`: mật khẩu tạm của admin đầu tiên.
4. `CORS_ORIGINS`: địa chỉ web React (mặc định `http://localhost:5173`).

> Không đưa file `.env` lên Git (đã có trong `.gitignore`).

---

## 3. Tạo database

**Cách 1: Docker (nhanh nhất)**

```bash
docker compose up -d
```

Lệnh này dùng file `docker-compose.yml` có sẵn, tạo PostgreSQL với user `postgres`, mật khẩu `postgres`, database `trung_tam`, khớp với `.env.example`. Chỉ dùng cho máy phát triển.

**Cách 2: Cài PostgreSQL trực tiếp**, rồi tạo database:

```bash
createdb trung_tam
```

và sửa `DATABASE_URL` cho đúng.

---

## 4. Tạo bảng và dữ liệu đầu tiên

```bash
npx prisma migrate dev --name init   # tạo file migration và bảng trong database
npm run db:seed                       # tạo vai trò, tài khoản admin, một khóa học mẫu
```

Lệnh `prisma migrate dev` cũng sinh Prisma Client. Nếu sau này chỉ sửa `schema.prisma`, lặp lại lệnh với tên mới, ví dụ `--name add_payments`.

Xem dữ liệu bằng giao diện: `npm run prisma:studio`.

> **Ràng buộc cần viết SQL tay:** Prisma không mô tả được `CHECK`, chỉ mục duy nhất có điều kiện, trigger, view công nợ. Cách làm: chạy `npx prisma migrate dev --create-only --name add_constraints`, mở file `.sql` vừa sinh, thêm SQL thủ công rồi chạy lại `npx prisma migrate dev`.

---

## 5. Chạy và kiểm tra

```bash
npm run typecheck   # kiểm tra kiểu dữ liệu, chạy bước này TRƯỚC
npm run dev         # chạy server, tự khởi động lại khi sửa code
```

Mở `http://localhost:4000/health`, nếu thấy `{"status":"ok",...}` là server và database đã thông.

### Gọi thử bằng curl

```bash
# Đăng nhập (lưu cookie vào file cookies.txt)
curl -i -c cookies.txt -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"MẬT_KHẨU_TRONG_.env"}'

# Xem thông tin tài khoản đang đăng nhập
curl -b cookies.txt http://localhost:4000/api/auth/me

# Đổi mật khẩu (lần đầu bắt buộc)
curl -b cookies.txt -X POST http://localhost:4000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"MẬT_KHẨU_CŨ","newPassword":"MatKhauMoi123"}'

# Tạo học viên
curl -b cookies.txt -X POST http://localhost:4000/api/students \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Nguyễn Văn A","phone":"0912345678"}'

# Danh sách học viên có tìm kiếm và phân trang
curl -b cookies.txt "http://localhost:4000/api/students?search=Nguyen&page=1&pageSize=20"

# Form đăng ký tư vấn (công khai, không cần đăng nhập)
curl -X POST http://localhost:4000/api/public/leads \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Trần Thị B","phone":"0987654321","interestedCourse":"Khóa giao tiếp"}'
```

Định dạng trả về: thành công `{ "data": ... }`, lỗi `{ "error": { "code", "message", "details?" } }`.

---

## 6. Cấu trúc thư mục

```
trung-tam-backend/
├─ prisma/
│  ├─ schema.prisma          # định nghĩa bảng (nguồn sự thật của database)
│  ├─ seed.ts                # vai trò, admin đầu tiên, khóa học mẫu
│  └─ migrations/            # sinh ra khi chạy migrate, PHẢI đưa lên Git
├─ src/
│  ├─ server.ts              # khởi chạy, tắt êm (graceful shutdown)
│  ├─ app.ts                 # lắp ráp Express: helmet, cors, log, route, lỗi
│  ├─ routes.ts              # gom route của mọi module dưới /api
│  ├─ config/
│  │  ├─ env.ts              # đọc và kiểm tra biến môi trường bằng zod
│  │  ├─ prisma.ts           # một PrismaClient dùng chung
│  │  └─ logger.ts           # pino, tự che mật khẩu/token trong log
│  ├─ middlewares/
│  │  ├─ auth.ts             # authenticate, requireRole
│  │  ├─ errorHandler.ts     # lỗi zod, lỗi nghiệp vụ, lỗi Prisma, lỗi lạ
│  │  └─ rateLimit.ts        # giới hạn chung, đăng nhập, form công khai
│  ├─ modules/               # mỗi chức năng một thư mục
│  │  ├─ auth/               # đăng nhập, làm mới, đăng xuất, me, đổi mật khẩu
│  │  ├─ students/           # CRUD học viên, xóa mềm, sinh mã học viên
│  │  ├─ attendance/         # điểm danh (mẫu phân quyền theo dữ liệu)
│  │  └─ leads/              # form tư vấn công khai + quản lý khách tiềm năng
│  ├─ utils/
│  │  ├─ httpError.ts        # lỗi có mã HTTP
│  │  ├─ tokens.ts           # tạo/xác minh JWT, cấu hình cookie
│  │  ├─ audit.ts            # ghi nhật ký thao tác
│  │  └─ params.ts           # đọc id từ đường dẫn
│  └─ types/express.d.ts     # khai báo req.user
├─ .env.example
├─ docker-compose.yml        # PostgreSQL cho máy phát triển
├─ tsconfig.json
└─ package.json
```

### Mỗi module gồm 4 file

| File | Vai trò |
|---|---|
| `*.routes.ts` | Khai báo đường dẫn, gắn middleware đăng nhập/phân quyền |
| `*.controller.ts` | Nhận yêu cầu, kiểm tra dữ liệu bằng zod, gọi service, trả kết quả |
| `*.service.ts` | Logic nghiệp vụ, truy vấn database, transaction, nhật ký |
| `*.schema.ts` | Quy tắc kiểm tra dữ liệu (zod) |

### Luồng xử lý một yêu cầu

```
Yêu cầu → helmet/cors/log → body & cookie → rate limit
        → route → authenticate (token + trạng thái tài khoản trong DB)
        → requireRole (vai trò) → controller (zod parse)
        → service (quyền theo dữ liệu + transaction + audit)
        → trả { data }   |   lỗi → errorHandler → { error }
```

---

## 7. Cách thêm một module mới

Ví dụ thêm `events` (lịch trình):

1. Thêm model `Event`, `EventType`, `EventAudience` vào `prisma/schema.prisma`, rồi `npx prisma migrate dev --name add_events`.
2. Tạo `src/modules/events/` với 4 file `events.routes.ts`, `.controller.ts`, `.service.ts`, `.schema.ts` (sao chép từ `students` làm mẫu).
3. Trong `routes.ts` thêm: `apiRoutes.use('/events', eventsRoutes);`
4. Trong routes, quy định ai được xem/sửa bằng `requireRole(...)`; quyền theo dữ liệu (ví dụ giáo viên chỉ sửa sự kiện lớp mình) kiểm tra trong service như `attendance.service.ts`.

Thứ tự module nên làm tiếp: **classes** (lớp, buổi học, ghi danh) → **payments** (khoản thu, thu tiền) → **events** → **posts** → **imports** (Excel) → **payroll** → **scores/assignments**.

---

## 8. Các nguyên tắc đã được áp dụng trong khung

| Nguyên tắc | Nằm ở đâu |
|---|---|
| Mật khẩu băm bằng argon2, không lưu thô | `auth.service.ts` |
| Khóa tạm sau nhiều lần đăng nhập sai, ghi lịch sử đăng nhập | `auth.service.ts`, bảng `login_history` |
| Bắt đổi mật khẩu lần đầu (`mustChangePassword`) | `User`, `/auth/change-password` |
| Token trong cookie `httpOnly`, token ngắn hạn | `utils/tokens.ts` |
| Mỗi yêu cầu kiểm tra lại trạng thái tài khoản trong DB (khóa có hiệu lực ngay) | `middlewares/auth.ts` |
| Quyền theo vai trò **và** theo dữ liệu (giáo viên chỉ lớp mình) | `requireRole`, `attendance.service.ts` |
| Dữ liệu vào luôn qua zod, không tin frontend | các `*.schema.ts` |
| Transaction cho thao tác nhiều bước | `students.service.ts`, `attendance.service.ts` |
| Xóa mềm, nhật ký thao tác (audit) | `students.service.ts`, `utils/audit.ts` |
| Mã học viên sinh từ bộ đếm, không trùng | bảng `sequences`, `createStudent` |
| Điểm danh không trùng, khóa buổi đã chốt | `@@unique`, `lockedAt` |
| Tiền lưu số nguyên VND | `Int` trong schema |
| Giới hạn tốc độ, chống bot ở form công khai | `rateLimit.ts`, ô ẩn `website` |
| Lỗi hệ thống không lộ chi tiết ở môi trường thật | `errorHandler.ts` |
| Log tự che mật khẩu, token | `config/logger.ts` |

---

## 9. Việc còn thiếu, cần làm trước khi chạy thật

1. **Chạy `npm run typecheck`** và sửa lỗi nếu có (khung chưa được biên dịch đầy đủ).
2. **Thu hồi refresh token:** hiện đăng xuất chỉ xóa cookie, token cũ vẫn dùng được đến khi hết hạn. Nên thêm bảng `refresh_tokens` (lưu bản băm, cho thu hồi, xoay vòng token).
3. **Chống CSRF:** cookie `sameSite: 'lax'` ổn khi web và API cùng site. Nếu khác domain, cần `sameSite: 'none'` kèm `secure` và cơ chế CSRF token.
4. **Quên mật khẩu qua email** (bảng `password_reset_tokens`, `nodemailer`).
5. **Phân quyền chi tiết** hơn nếu cần (`permissions`, `role_permissions`).
6. **Viết kiểm thử** cho các phần quan trọng: đăng nhập, phân quyền, điểm danh, tiền.
7. **Sao lưu database tự động** và thử khôi phục.
8. **Triển khai:** đặt `NODE_ENV=production`, bật HTTPS, `TRUST_PROXY=true` nếu sau Nginx/Cloudflare, dùng `npx prisma migrate deploy` thay cho `migrate dev`.
9. **Schema chỉ là phần khởi đầu:** chưa có học phí, lịch trình, bài đăng, điểm số, lương, import. Mở rộng theo file `thiet-ke-database-day-du.md`.
10. **Tên cột:** Prisma đang dùng camelCase trong DB. Nếu muốn snake_case như tài liệu thiết kế, thêm `@map("ten_cot")` cho từng trường (nên quyết định trước khi có dữ liệu thật).

---

## 10. Lệnh thường dùng

| Lệnh | Tác dụng |
|---|---|
| `npm run dev` | Chạy server khi phát triển |
| `npm run typecheck` | Kiểm tra kiểu dữ liệu |
| `npm run build` rồi `npm start` | Biên dịch và chạy bản thật |
| `npx prisma migrate dev --name ten` | Tạo migration mới và áp vào DB phát triển |
| `npx prisma migrate deploy` | Áp migration lên DB thật |
| `npx prisma generate` | Sinh lại Prisma Client |
| `npm run db:seed` | Tạo dữ liệu đầu tiên |
| `npm run prisma:studio` | Xem/sửa dữ liệu bằng giao diện |
| `npx prisma migrate reset` | Xóa sạch và dựng lại DB phát triển (**không dùng trên DB thật**) |
