# API — hợp đồng endpoint

> Khung tài liệu (P0), cập nhật P1. Mỗi endpoint thêm vào **trong cùng commit** với code (AGENTS.md mục 6).
> Mỗi module backend có file ví dụ gọi thử `backend/requests/<module>.http` (REST Client của VS Code).
>
> **P1:** danh sách endpoint theo từng màn hình (hơn 120 endpoint) nằm ở
> `docs/FRONTEND-CONTRACT.md` phần C — đó là nguồn chính xác. Mục 1 bên dưới chỉ là khung rút gọn.
> Quy ước đặt tên: xem **D-013** (tài nguyên theo đường dẫn, dữ liệu của mình dùng `/api/me`).

## 0. Quy ước chung

| Mục | Quy ước |
| --- | --- |
| Tiền tố | `/api`; site công khai dùng thêm `/api/public` |
| Tên tài nguyên | Số nhiều, kebab-case: `/api/students`, `/api/class-schedules`, `/api/payroll` |
| Không nhúng vai trò | Không có `/admin`, `/teacher`, `/staff` trong path — kiểm bằng `requireRole` (D-013) |
| Dữ liệu của mình | Tiền tố `/api/me`: `/api/me/tuition`, `/api/me/scores`, `/api/me/payroll` |
| Danh sách theo phạm vi | Dùng bộ lọc truy vấn: `/api/students?classId=…`, `/api/leads?stage=new` |
| Thành công (một đối tượng) | `{ "data": { ... } }` |
| Thành công (danh sách) | `{ "data": { "items": [], "page": 1, "pageSize": 20, "total": 0, "totalPages": 0 } }` |
| Lỗi | `{ "error": { "code": "...", "message": "...", "details": [] } }` |
| Mã lỗi HTTP | 400 `VALIDATION_ERROR`, 401 `UNAUTHENTICATED`, 403 `FORBIDDEN`, 404 `NOT_FOUND`, 409 `CONFLICT` / `OVERPAYMENT`, 423 `LOCKED`, 429 `RATE_LIMITED`, 500 `INTERNAL_ERROR` |
| Phân trang | `?page=1&pageSize=20` (mặc định 20, tối đa 100), luôn sắp xếp ổn định (frontend đang dùng 10/trang) |
| Sắp xếp | `?sort=createdAt:desc` |
| Lọc/tìm kiếm | `?query=` + tham số riêng, đúng như `docs/FRONTEND-CONTRACT.md` phần C ghi cho màn hình đó |
| Xác thực | Cookie JWT `httpOnly`, `credentials: "include"` |
| Tiền | Số nguyên VND |
| Thời gian | ISO 8601 UTC (`2026-10-02T03:00:00Z`); frontend hiển thị Asia/Ho_Chi_Minh (D-011) |
| Đặt tên trường JSON | camelCase, **giữ nguyên** tên biến trong `frontend/src/data` (D-009) |
| Trạng thái | Trả **mã tiếng Anh** (`cash`, `published`, `present`); nhãn tiếng Việt ở frontend (D-010) |

## 1. Danh sách endpoint (điền theo từng module)

| # | Method + Path | Quyền | Màn hình dùng | Module | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 1 | `POST /api/auth/login`, `/refresh`, `/logout` | công khai | Đăng nhập (4 vai trò) | auth | **đã có (P4)** |
| 2 | `POST /api/auth/change-password`, `/forgot-password`, `/reset-password` | mọi vai trò / công khai | Đổi/quên mật khẩu | auth | **đã có (P4)** |
| 3 | `GET /api/auth/me` | mọi vai trò | Hồ sơ cá nhân | auth | **đã có (P4)** |
| 4 | `GET/POST /api/users` | admin | Tài khoản & phân quyền | accounts | **đã có (P4)** |
| 5 | `PATCH /api/users/:id`, `PATCH /api/users/:id/status` | admin | Sửa, gán/gỡ vai trò, khóa/mở | accounts | **đã có (P4)** |
| 6 | `POST /api/users/:id/reset-password`, `GET /api/users/:id/login-history` | admin | Đặt lại mật khẩu, lịch sử đăng nhập | accounts | **đã có (P4)** |
| 7 | `DELETE /api/users/:id`, `PATCH /api/users/:id/restore` | admin | Xóa mềm/khôi phục tài khoản | accounts | **đã có (P4)** |
| 8 | `POST /api/users/import` | admin | Nhập Excel tài khoản | users | chưa có |
| 9 | `GET/POST /api/students` | staff, admin | Quản lý học viên | students | **đã có (P2)** |
| 10 | `GET /api/students/:id` | student(đúng người), staff, admin | Hồ sơ học viên | students | **đã có (P2, staff+admin)** |
| 11 | `GET/POST /api/teachers` | admin | Quản lý giáo viên | teachers | chưa có |
| 12 | `GET/POST /api/staff` | admin | Quản lý nhân viên | staff | chưa có |
| 13 | `GET/POST /api/courses` | admin | Khóa học | courses | chưa có |
| 14 | `GET/POST /api/classes` | staff, admin | Lớp học | classes | chưa có |
| 15 | `GET/POST /api/rooms` | admin | Phòng học | rooms | chưa có |
| 16 | `GET/POST /api/timetable` | staff, admin | Thời khóa biểu (kiểm tra trùng phòng/GV) | timetable | chưa có |
| 17 | `GET/POST /api/class-sessions` | teacher, admin | Buổi học, điểm danh | sessions | chưa có |
| 18 | `POST /api/attendances` | teacher, admin | Điểm danh | sessions | **đã có (P2, khác path — xem 1c)** |
| 19 | `GET/POST /api/invoices` | staff, admin | Khoản phải thu, công nợ | tuition | chưa có |
| 20 | `POST /api/payments` | staff, admin | Thu học phí | tuition | chưa có |
| 21 | `POST /api/receipts/close-of-day` | staff, admin | Đối soát cuối ngày | tuition | chưa có |
| 22 | `POST /api/discount-requests/:id/approve` | admin | Duyệt giảm giá/hoàn phí | tuition | chưa có |
| 23 | `GET/POST /api/pay-rolls` | admin | Bảng lương + chốt lương | payroll | chưa có |
| 24 | `GET/POST /api/events` | staff, admin | Lịch trình | events | chưa có |
| 25 | `GET/POST /api/tests`, `/api/scores` | teacher, admin | Nhập điểm | grades | chưa có |
| 26 | `GET/POST /api/assignments` | teacher, admin | Giao bài tập | assignments | chưa có |
| 27 | `GET/POST /api/posts` | staff, admin | Nội dung website | content | chưa có |
| 28 | `GET/POST /api/leads` | staff | Khách tiềm năng | leads | **đã có (P2, xem 1c)** |
| 29 | `GET /api/dashboard`, `/api/reports/*` | admin | Dashboard, báo cáo | reports | chưa có |
| 30 | `GET /api/audit-logs` | admin | Nhật ký thao tác | audit | chưa có |
| 31 | `GET/PATCH /api/settings` | admin | Cài đặt | settings | chưa có |

## 1b. Nhóm bổ sung sinh ra ở P1 (xem FRONTEND-CONTRACT.md phần C để có đầy đủ tham số)

| # | Method + Path | Quyền | Màn hình dùng | Module |
| --- | --- | --- | --- | --- |
| 31 | `POST /api/auth/request-unlock`, `POST /api/auth/forgot-password` | công khai | Đăng nhập (quên mật khẩu) | auth |
| 32 | `PATCH /api/users/:id/status`, `POST /api/users/:id/reset-password`, `PATCH /api/users/:id/restore` | admin | Tài khoản & phân quyền | users |
| 33 | `GET /api/users/export` | admin | Xuất Excel tài khoản | users |
| 34 | `POST /api/imports/preview`, `POST /api/imports/:id/commit`, `POST /api/imports/:id/credentials`, `GET /api/imports/template` | admin | Nhập Excel | imports |
| 35 | `GET /api/me`, `PATCH /api/me` | mọi vai trò | Thông tin cá nhân (3 khu vực) | profile |
| 36 | `GET /api/me/summary`, `/api/me/progress`, `/api/me/lessons`, `/api/me/attendance`, `/api/me/attendance-summary`, `/api/me/scores`, `/api/me/scores/summary`, `/api/me/assignments`, `/api/me/tuition`, `/api/me/payments`, `/api/me/calendar`, `/api/me/announcements` | học viên | 7 màn khu học viên | student-self |
| 37 | `GET /api/me/classes`, `/api/me/students`, `/api/me/schedule`, `/api/me/assessments`, `/api/me/payroll`, `/api/me/overview` | giáo viên | 11 màn khu giáo viên | teacher-self |
| 38 | `GET /api/me/students?tuition=`, `/api/me/leads`, `/api/me/leads/conversion`, `/api/me/payments/summary`, `/api/me/timetable`, `/api/me/events`, `/api/me/posts`, `/api/me/payroll`, `/api/me/tasks` | nhân viên | 10 màn khu nhân viên | staff-self |
| 39 | `GET /api/students/:id/notes`, `POST /api/students/:id/notes` | staff, admin | Ghi chú chăm sóc | students |
| 40 | `POST /api/students`, `PATCH /api/students/:id` | staff, admin | Ghi danh, hồ sơ học viên | students |
| 41 | `POST /api/enrollments`, `GET /api/classes/:id/students` | staff, admin | Ghi danh vào lớp | enrollments |
| 42 | `GET /api/classes/today` | staff, admin | Lịch trình, dashboard | classes |
| 43 | `GET/PUT /api/classes/:classId/sessions/:sessionId/attendance`, `PATCH /api/classes/:classId/sessions/:sessionId` | teacher, admin | Điểm danh | sessions |
| 44 | `POST /api/classes/:classId/attendance/unlock` | **admin** | Mở khoá điểm danh | sessions |
| 45 | `GET /api/attendance/today` | staff, admin | Điểm danh hôm nay | sessions |
| 46 | `POST /api/classes/:classId/schedules`, `PATCH/DELETE /api/class-schedules/:id`, `POST /api/timetable/check` | admin | Thời khóa biểu | timetable |
| 47 | `POST /api/assessments`, `GET/PUT /api/assessments/:id/scores` | teacher, admin | Nhập điểm | grades |
| 48 | `GET /api/me/payroll/:id/pdf`, `GET /api/payroll/:id/pdf` | giáo viên, nhân viên, admin | Phiếu lương | payroll |
| 49 | `POST /api/payroll/periods`, `POST /api/payroll/items`, `POST /api/payroll/periods/:id/approve`, `POST /api/payroll/periods/:id/lock` | admin | Bảng lương admin | payroll |
| 50 | `GET /api/payments/:id/receipt` | student(đúng người), staff, admin | Phiếu thu | tuition |
| 51 | `POST /api/cash-closings`, `POST /api/cash-closings/:id/close` | staff, admin | Đối soát tiền mặt | tuition |
| 52 | `POST /api/discounts/:id/approve`, `POST /api/refunds/:id/approve` | admin | Duyệt giảm giá / hoàn phí | tuition |
| 53 | `POST /api/posts/:id/publish`, `POST /api/posts/:id/approve`, `POST /api/posts/:id/unpublish` | staff, admin | Bài đăng | content |
| 54 | `PATCH /api/teachers/:id/website-visibility`, `GET/POST/PATCH /api/banners` | admin | Nội dung website | content |
| 55 | `POST /api/leads/:id/activities`, `PATCH /api/leads/:id/stage`, `POST /api/leads/:id/convert` | staff, admin | Khách tiềm năng | leads |
| 56 | `GET /api/reports/{revenue,enrollment,class-size,lead-source,funnel,debt-total,debt-aging,attendance}`, `GET /api/reports/export` | admin | Báo cáo | reports |
| 57 | `GET /api/notifications` | mọi vai trò | Chuông thông báo | notifications |

## 1c. Endpoint đã hiện thực ở P2/P4 (xác minh bằng test)

Đây là phần **đã chạy thật** trên PostgreSQL. Ví dụ gọi tay nằm trong `backend/requests/`.

### POST /api/auth/login
- Quyền: công khai (có `loginLimiter` 20 lần / 15 phút).
- Body: `{ "username": string, "password": string, "portal": "client" | "admin" }` (`portal` mặc định `client`).
- Thành công 200: `{ "data": { "user": { "id": string, "username", "name", "email", "phone", "status", "role", "roles", "mustChangePassword" } } }`.
- Không trả token hoặc `passwordHash` trong body; token nằm trong cookie `httpOnly`.
- Portal `admin` chỉ nhận tài khoản có vai trò admin; portal `client` từ chối tài khoản chỉ có vai trò admin.
- Cookie: `access_token` (15 phút) + `refresh_token` (7 ngày), `sameSite: "lax"`, `secure` khi `NODE_ENV=production`.
- Lỗi: 400 `VALIDATION_ERROR`, 401 `UNAUTHORIZED`, 403 `FORBIDDEN`, 423 `LOCKED`, 429 `TOO_MANY_REQUESTS`.
- Sai mật khẩu lần thứ 5 khóa tạm tài khoản và vô hiệu hóa phiên hiện tại.
- File: `backend/requests/auth.http`

Ví dụ request:

```http
POST /api/auth/login
Content-Type: application/json

{"username":"admin","password":"<mật khẩu>","portal":"admin"}
```

Ví dụ response 200 (token chỉ có trong `Set-Cookie` httpOnly):

```json
{"data":{"user":{"id":"1","username":"admin","name":"admin","email":"","phone":null,"status":"active","role":"admin","roles":["admin"],"mustChangePassword":true}}}
```

### POST /api/auth/refresh
- Quyền: công khai (đọc cookie `refresh_token`); thành công 200 phát lại hai cookie.
- Refresh token có `jti`; database lưu Argon2id hash, `tokenId`, thời hạn và liên kết cha. Mỗi lần refresh, server xác minh hash, thu hồi token cũ và tạo token con trong một transaction.
- Dùng lại token đã thu hồi sẽ thu hồi cả họ token rồi trả 401. Token hết hạn, không tồn tại hoặc hash không khớp cũng trả 401.
- File: `backend/requests/auth.http`

### POST /api/auth/logout
- Quyền: công khai; nếu cookie refresh hợp lệ thì thu hồi refresh token đó. Thành công 200 `{ "data": { "ok": true } }`; luôn xóa hai cookie.

### GET /api/auth/me
- Quyền: mọi vai trò (`authenticate`)
- Thành công 200:
  `{ "data": { "id": string, "username", "name", "email", "phone", "status", "role", "roles", "branchId", "mustChangePassword", "lastLoginAt", "teacher", "staff", "student" } }`.
  `name` lấy từ hồ sơ liên kết hoặc tên tài khoản; không trả `passwordHash`, cookie hay token.
- Lỗi: 401 `UNAUTHENTICATED`.

### POST /api/auth/change-password
- Quyền: mọi vai trò · Body: `{ "currentPassword", "newPassword" }`
- Thành công 200: `{ "data": { "ok": true } }` + ghi `audit_logs` (`change_password`).
- Lỗi: 400 `VALIDATION_ERROR` hoặc `BAD_REQUEST`, 401 `UNAUTHORIZED`.
- Quy tắc: tự xoá cờ `mustChangePassword`, tăng `tokenVersion` và thu hồi mọi refresh token. Các access token cũ bị từ chối.
- Khi `mustChangePassword=true`, API cần đăng nhập khác ngoài `/api/auth/me`, `/api/auth/change-password`, `/api/auth/logout` trả 403 `PASSWORD_CHANGE_REQUIRED`.

### POST /api/auth/forgot-password · POST /api/auth/reset-password
- `forgot-password`: body `{ "email": string }`; luôn trả 200 `{ "data": { "message": "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi." } }`, kể cả email không có trong hệ thống. Giới hạn 5 lần/giờ.
- Nếu tài khoản tồn tại, gửi liên kết reset qua SMTP; token ngẫu nhiên chỉ lưu SHA-256 hash, dùng một lần và hết hạn sau 20 phút. Development ghi thông báo email với token đã ẩn.
- `reset-password`: body `{ "token": string, "newPassword": string }`; 200 `{ "data": { "ok": true } }`; token sai/hết hạn/đã dùng trả 400. Thu hồi mọi refresh token và access token cũ, ghi audit.

Ví dụ quên mật khẩu:

```http
POST /api/auth/forgot-password
Content-Type: application/json

{"email":"nguoi-dung@example.test"}
```

```json
{"data":{"message":"Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi."}}
```

### Tài khoản quản trị `/api/users`
- Mọi endpoint yêu cầu cookie đăng nhập và vai trò `admin`; vai trò khác nhận 403.
- `GET /api/users?role=&status=&query=&onlyDeleted=false&page=1&pageSize=20`: lọc vai trò, trạng thái (`active|locked|pending|archived`), tìm username/tên/email/điện thoại và phân trang ổn định. DTO gồm `id, username, fullName, email, phone, role, roles, status, lastLoginAt, createdAt, deletedAt, mustChangePassword`.
- `POST /api/users`: body `{ "username", "fullName", "email"?, "phone"?, "roles": string[] }`; trả 201 DTO và `temporaryPassword` đúng một lần. Database chỉ lưu Argon2 hash; audit không lưu mật khẩu.
- `PATCH /api/users/:id`: cập nhật `fullName/email/phone/roles`; gửi `roles` thay thế toàn bộ tập vai trò. Ghi audit. Admin không thể tự gỡ vai trò admin.
- `PATCH /api/users/:id/status`: body `{ "status": "active" | "locked" }`; khóa thu hồi refresh token và vô hiệu hóa access token. Admin không thể tự khóa.
- `POST /api/users/:id/reset-password`: trả `{ "data": { "temporaryPassword": string } }` một lần, đặt `mustChangePassword=true`, thu hồi phiên và ghi audit.
- `GET /api/users/:id/login-history?page=1&pageSize=20`: danh sách đăng nhập phân trang.
- `DELETE /api/users/:id`: xóa mềm, thu hồi phiên và ghi audit; admin không thể tự xóa. `PATCH /api/users/:id/restore` khôi phục và ghi audit.
- File gọi thử: `backend/requests/accounts.http`.

Ví dụ tạo tài khoản:

```http
POST /api/users
Content-Type: application/json

{"username":"hv001","fullName":"Nguyễn An","email":"an@example.test","roles":["student"]}
```

```json
{"data":{"id":2,"username":"hv001","fullName":"Nguyễn An","email":"an@example.test","phone":null,"role":"student","roles":["student"],"status":"active","mustChangePassword":true,"temporaryPassword":"<chỉ hiển thị một lần>"}}
```

### GET /api/students · POST /api/students
- Quyền: `requireRole('admin','staff')`
- Lọc: `?search=&status=STUDYING|FROZEN|DROPPED|GRADUATED&page=&pageSize=` (mặc định 20, tối đa 100)
- **`search` không phân biệt dấu**: gõ `nguyen` hay `nguyễn` đều ra `Nguyễn Văn A` (dùng hàm `ttnn_unaccent`).
- Body tạo mới: `{ "fullName", "dob"?, "gender"?, "phone"?, "email"?, "address"?, "note"? }` — mã học viên **sinh tự động**.
- Thành công: 200 `{ "data": { "items", "page", "pageSize", "total", "totalPages" } }` / 201 `{ "data": {...} }`
- Lỗi: 400 `VALIDATION_ERROR` (kèm `details`), 403 `FORBIDDEN`.
- Quy tắc: mỗi lần tạo/sửa đều ghi `audit_logs`; số điện thoại phải khớp `0\d{9}`;
  **định danh tin cậy là `student_code`** — `email` cố ý **không** duy nhất vì phụ huynh có thể
  dùng chung email, nên email trùng vẫn tạo được (D-021).
- File: `backend/requests/students.http`

### GET/PATCH/DELETE /api/students/:id
- Quyền: `staff`, `admin`; **`DELETE` chỉ `admin`**.
- Quy tắc: xoá là **xoá mềm** (`deleted_at`); đọc bản ghi đã xoá trả 404; danh sách mặc định không trả bản ghi đã xoá.

### GET/PUT /api/attendance/sessions/:sessionId
- Quyền: `teacher`, `staff`, `admin`. Giáo viên chỉ được chạm lớp **mình phụ trách** (kiểm tra ở service, không chỉ `requireRole`).
- Body `PUT`: `{ "records": [{ "studentId", "status": "PRESENT|LATE|ABSENT|EXCUSED", "note"? }] }`
- Thành công: 200 `{ "data": { "sessionId", "records": [...] } }`
- Lỗi: 400 `VALIDATION_ERROR` (học viên không thuộc lớp, lặp `studentId`, `records` rỗng, `status` sai),
  403 `FORBIDDEN` (lớp của người khác), 404 `NOT_FOUND`, 423 `LOCKED` (buổi đã khoá; chỉ `admin` sửa được).
- Quy tắc: ghi đè bản ghi đã có, không tạo bản ghi trùng; chạy trong một transaction; ghi `audit_logs`.
- File: `backend/requests/attendance.http`

### POST /api/public/leads
- Quyền: công khai, có `publicFormLimiter` (10 lần / giờ).
- Body: `{ "fullName", "phone", "email"?, "interestedCourse"?, "message"?, "website"? }`
- Thành công 201: `{ "data": { "ok": true } }`
- Lỗi: 400 `VALIDATION_ERROR`, 429 `RATE_LIMITED`.
- Quy tắc: trường ẩn `website` có giá trị (bot) vẫn trả 201 nhưng **không** ghi bản ghi.
- File: `backend/requests/leads.http`

### GET /api/leads · PATCH /api/leads/:id
- Quyền: `staff`, `admin`.
- Lọc: `?status=NEW|CONTACTED|TRIAL|WON|LOST&page=&pageSize=`
- Body `PATCH`: `{ "status"?, "note"? }`
- Lỗi: 400 `VALIDATION_ERROR`, 403 `FORBIDDEN`, 404 `NOT_FOUND`.

### Điểm lệch với hợp đồng P1 (giữ nguyên hiện thực P2, xử lý ở P8/P9/P16)
- Điểm danh: P1 dự kiến `PUT /api/classes/:classId/sessions/:sessionId/attendance`, P2 dùng
  `PUT /api/attendance/sessions/:sessionId`. Sẽ chốt lại khi có module `classes` (P8).
- Khách tiềm năng: P1 dự kiến `PATCH /api/leads/:id/stage` và `POST /api/leads`; P2 dùng `PATCH /api/leads/:id`
  với `status`, và **không** có `POST /api/leads` (tạo chỉ qua form công khai). Sẽ chốt ở P16.
- `GET /api/students/:id` hiện chỉ cho `staff`/`admin`; P1 còn cho học viên xem hồ sơ của chính mình — sẽ bổ sung ở P5/P7.

## 2. Mẫu mô tả endpoint

```md
## POST /api/payments
- Quyền: staff, admin (giáo viên: 403)
- Dùng cho màn hình: Nhân viên > Thu học phí; Admin > Học phí & công nợ
- Body: { invoiceId: string, amount: number (>0, VND), method: "CASH" | "TRANSFER" | "CARD" | "EWALLET", note?: string }
- Thành công 201: { "data": { "id", "receiptNo", "amount", "remaining", "collectorName", "createdAt" } }
- Lỗi: 400 VALIDATION_ERROR, 401 UNAUTHENTICATED, 403 FORBIDDEN, 404 NOT_FOUND, 409 OVERPAYMENT
- Quy tắc: không vượt công nợ; chụp snapshot học phí/đơn giá tại thời điểm thu; ghi audit; chạy trong một transaction
- Ví dụ gọi tay: backend/requests/tuition.http
```

## 3. Xác thực và phân quyền
- Mọi endpoint (trừ `POST /api/auth/login`) đều kiểm tra cookie JWT và `requireRole` **ở backend**.
- Phân quyền theo dữ liệu: giáo viên chỉ thấy lớp mình phụ trách, học viên chỉ thấy dữ liệu của mình
  (xem `docs/PERMISSIONS.md`).
- Endpoint trả `403` khi đúng vai trò nhưng không thuộc phạm vi dữ liệu; trả `404` khi bản ghi không tồn tại **hoặc**
  bị xoá mềm và người gọi không có quyền xem.

## 4. Lịch sử thay đổi
| Ngày | Endpoint | Thay đổi | Phase |
| --- | --- | --- | --- |
| 2026-10-04 | — | Tạo khung tài liệu | P0 |
| 2026-10-04 | toàn bộ | Bổ sung nhóm 31–57 theo kiểm kê màn hình; chốt quy ước `/api/me` và mã trạng thái (D-009, D-010, D-013) | P1 |
| 2026-10-05 | auth, students, attendance, leads | Thêm mục **1c**: 14 endpoint đã hiện thực kèm body, mã lỗi và quy tắc; ghi nhận 3 điểm lệch với P1 | P2 |
