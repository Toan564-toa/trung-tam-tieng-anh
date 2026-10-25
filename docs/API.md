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
| 11 | `GET/POST /api/teachers` | admin | Quản lý giáo viên | teachers | **đã có (P5)** |
| 12 | `GET/POST /api/staff` | admin | Quản lý nhân viên | staff | **đã có (P5)** |
| 13 | `GET/POST /api/courses` | admin | Khóa học | courses | **đã có (P8)** |
| 14 | `GET/POST /api/classes` | staff, admin | Lớp học | classes | **đã có (P8)** |
| 15 | `GET/POST /api/rooms` | admin | Phòng học | rooms | **đã có (P8)** |
| 16 | `GET /api/timetable` | staff, admin, teacher | Thời khóa biểu | timetable | **đã có (P8)** |
| 17 | `GET/POST/PATCH /api/classes/:id/sessions` | teacher, admin | Buổi học | class-sessions | **đã có (P8)** |
| 18 | `POST /api/classes/:id/generate-sessions` | admin, staff | Sinh buổi học 64 buổi | classes | **đã có (P8)** |
| 19 | `GET/POST /api/enrollments` | staff, admin | Ghi danh | enrollments | **đã có (P8)** |
| 20 | `POST /api/enrollments/:id/transfer` | staff, admin | Chuyển lớp | enrollments | **đã có (P8)** |
| 21 | `POST /api/enrollments/:id/freeze` | staff, admin | Bảo lưu ghi danh | enrollments | **đã có (P8)** |
| 22 | `POST /api/enrollments/:id/unfreeze` | staff, admin | Kết thúc bảo lưu | enrollments | **đã có (P8)** |
| 23 | `POST /api/enrollments/:id/makeup` | staff, admin | Tạo buổi học bù | enrollments | **đã có (P8)** |
| 24 | `GET /api/classes/teacher/classes` | teacher | Lớp của giáo viên | classes | **đã có (P8)** |
| 25 | `GET /api/classes/teacher/classes/:id/students` | teacher | Học viên lớp mình | classes | **đã có (P8)** |
| 26 | `GET /api/me/enrollments` | student | Ghi danh của mình | student-self | **đã có (P8)** |
| 27 | `GET /api/me/lessons` | student | 64 buổi học + điểm danh | student-self | **đã có (P8)** |

## 1b. Nhóm bổ sung sinh ra ở P1 (xem FRONTEND-CONTRACT.md phần C để có đầy đủ tham số)

| # | Method + Path | Quyền | Màn hình dùng | Module |
| --- | --- | --- | --- | --- |
| 31 | `POST /api/auth/request-unlock`, `POST /api/auth/forgot-password` | công khai | Đăng nhập (quên mật khẩu) | auth |
| 32 | `PATCH /api/users/:id/status`, `POST /api/users/:id/reset-password`, `PATCH /api/users/:id/restore` | admin | Tài khoản & phân quyền | users |
| 33 | `GET /api/users/export` | admin | Xuất Excel tài khoản | users |
| 34 | `GET /api/imports/templates/:type`, `POST /api/imports`, `GET /api/imports/:id`, `POST /api/imports/:id/confirm`, `POST /api/imports/:id/credentials` | admin | Nhập Excel | imports | **đã có (P6)** |
| 35 | `GET /api/courses`, `POST /api/courses`, `GET /api/courses/:id`, `PATCH /api/courses/:id`, `PATCH /api/courses/:id/status`, `DELETE /api/courses/:id`, `GET /api/public/courses`, `GET /api/public/courses/:id` | admin, công khai | Khóa học, landing | courses | **đã có (P8)** |
| 36 | `GET /api/rooms`, `POST /api/rooms`, `PATCH /api/rooms/:id`, `DELETE /api/rooms/:id` | admin | Phòng học | rooms | **đã có (P8)** |
| 37 | `GET /api/time-slots`, `POST /api/time-slots`, `PATCH /api/time-slots/:id`, `DELETE /api/time-slots/:id` | admin, mọi vai trò (đọc) | Ca học | time-slots | **đã có (P8)** |
| 38 | `GET /api/classes`, `POST /api/classes`, `GET /api/classes/:id`, `PATCH /api/classes/:id`, `PATCH /api/classes/:id/status`, `DELETE /api/classes/:id`, `PATCH /api/classes/:id/teacher` | admin, staff | Lớp học | classes | **đã có (P8)** |
| 39 | `GET /api/classes/:id/sessions`, `POST /api/classes/:id/sessions`, `PATCH /api/classes/:id/sessions/:sessionId` | teacher, admin | Buổi học | classes | **đã có (P8)** |
| 40 | `POST /api/classes/:id/generate-sessions` | admin, staff | Sinh 64 buổi từ thời khóa biểu | classes | **đã có (P8)** |
| 41 | `GET /api/classes/today` | staff, admin | Buổi học hôm nay | classes | **đã có (P8)** |
| 42 | `GET /api/classes/timetable` | staff, admin, teacher | Thời khóa biểu tổng hợp | classes | **đã có (P8)** |
| 43 | `GET /api/classes/teacher/classes` | teacher | Lớp của mình | classes | **đã có (P8)** |
| 44 | `GET /api/classes/teacher/classes/:id/students` | teacher | Học viên lớp mình | classes | **đã có (P8)** |
| 45 | `GET /api/classes/:id/schedules`, `POST /api/classes/:id/schedules`, `PATCH /api/schedules/:id`, `DELETE /api/schedules/:id`, `GET /api/classes/conflicts` | admin | Lịch lặp hằng tuần | classes | **đã có (P8)** |
| 46 | `GET /api/enrollments`, `POST /api/enrollments`, `GET /api/enrollments/:id`, `PATCH /api/enrollments/:id`, `PATCH /api/enrollments/:id/status` | staff, admin | Ghi danh | enrollments | **đã có (P8)** |
| 47 | `POST /api/enrollments/:id/transfer` | staff, admin | Chuyển lớp | enrollments | **đã có (P8)** |
| 48 | `POST /api/enrollments/:id/freeze` | staff, admin | Bảo lưu ghi danh | enrollments | **đã có (P8)** |
| 49 | `POST /api/enrollments/:id/unfreeze` | staff, admin | Kết thúc bảo lưu | enrollments | **đã có (P8)** |
| 50 | `POST /api/enrollments/:id/makeup` | staff, admin | Tạo buổi học bù | enrollments | **đã có (P8)** |
| 51 | `GET /api/me/enrollments` | student | Ghi danh của mình | student-self | **đã có (P8)** |
| 52 | `GET /api/me/lessons` | student | 64 buổi học + điểm danh | student-self | **đã có (P8)** |
| 53 | `GET /api/me`, `PATCH /api/me` | mọi vai trò | Thông tin cá nhân (3 khu vực) | profile |

## 1c. Endpoint đã hiện thực ở P2/P4 (xác minh bằng test)

Đây là phần **đã chạy thật** trên PostgreSQL. Ví dụ gọi tay nằm trong `backend/requests/`.

### POST /api/auth/login
- Quyền: công khai (có `loginLimiter` 20 lần / 15 phút).
- Body: `{ "username": string, "password": string, "portal": "client" | "admin" }` (`portal` mặc định `client`).
- **`username` chấp nhận tên đăng nhập HOẶC email** (form UI ghi "Tên đăng nhập hoặc email" — fix 2026-10-13, xem D-049).
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
- Thành công 200: `{ "data": { "ok": true } }` + **đặt lại cookie `access_token`/`refresh_token` (phiên mới)** + ghi `audit_logs` (`change_password`).
- Lỗi: 400 `VALIDATION_ERROR` hoặc `BAD_REQUEST`, 401 `UNAUTHORIZED`.
- Quy tắc: tự xoá cờ `mustChangePassword`, tăng `tokenVersion` và thu hồi mọi refresh token cũ. Các access token cũ bị từ chối — nhưng response cấp phiên mới nên trình duyệt đang đổi mật khẩu không bị đẩy ra khỏi hệ thống (fix bug "Phiên đăng nhập đã hết hạn" sau đổi mật khẩu, 2026-10-13).
- Khi `mustChangePassword=true`, API cần đăng nhập khác ngoài `/api/auth/me`, `/api/auth/change-password`, `/api/auth/logout` trả 403 `PASSWORD_CHANGE_REQUIRED`.

### POST /api/auth/forgot-password · POST /api/auth/reset-password
- `forgot-password`: body `{ "email": string }`; luôn trả 200 `{ "data": { "message": "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi." } }`, kể cả email không có trong hệ thống. Giới hạn 5 lần/giờ.
- Nếu tài khoản tồn tại, gửi liên kết reset qua SMTP; token ngẫu nhiên chỉ lưu SHA-256 hash, dùng một lần và hết hạn sau 20 phút. Development ghi thông báo email với token đã ẩn.
- `reset-password`: body `{ "token": string, "newPassword": string }`; 200 `{ "data": { "ok": true } }` + **đặt cookie phiên mới (trình duyệt dùng link được đăng nhập luôn)**; token sai/hết hạn/đã dùng trả 400. Thu hồi mọi refresh token và access token cũ, ghi audit.

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

### Hồ sơ cá nhân `/api/me` (P5)
- Quyền: mọi vai trò đăng nhập (`authenticate`).
- `GET /api/me/profile`: trả `{ "data": { "role", "profile" } }`; `role` là `student` | `teacher` | `staff`
  (có hồ sơ vai trò) hoặc `account` (chỉ có tài khoản); `profile` là DTO hồ sơ tương ứng kèm `avatarUrl`.
- `PATCH /api/me/profile`: trường trực tiếp áp dụng ngay (`phone/email/address/occupation` của học viên;
  `bio` của giáo viên/nhân viên); trường nhạy cảm (`fullName`, `identityNo`, `certificate`, `position`,
  `department`...) **không áp dụng ngay** mà tạo bản ghi `profile_change_requests` status `PENDING`.
  Thành công 200: `{ "data": { "profile", "appliedFields": [...], "pendingRequests": [...] } }`.
- `POST /api/me/photo`: upload ảnh đại diện (multipart field `file`), gắn vào `users.avatar_file_id`.
- `GET /api/me/profile-change-requests`: danh sách yêu cầu của chính mình.
- Lỗi: 400 `VALIDATION_ERROR` / `FIELD_NOT_EDITABLE`, 401 `UNAUTHENTICATED`, 404 `NOT_FOUND`.
- File gọi thử: `backend/requests/me.http`.

### Yêu cầu đổi hồ sơ `/api/profile-change-requests` (P5)
- Quyền: `admin`, `staff` (vai trò khác -> 403).
- `GET /api/profile-change-requests?status=PENDING|APPROVED|REJECTED&page=&pageSize=`: danh sách chung
  kèm thông tin người dùng (`user.username`).
- `PATCH /api/profile-change-requests/:id`: body `{ "action": "approve" | "reject" }`.
  Duyệt `approve` áp dụng giá trị mới vào hồ sơ; `reject` giữ nguyên. Yêu cầu đã xử lý -> 409.
- Quy tắc: mọi duyệt/từ chối đều ghi `audit_logs`; **giá trị trường nhạy cảm (CCCD) không bao giờ
  ghi vào audit** — chỉ ghi tên trường (BR-12).
- File gọi thử: `backend/requests/me.http`.

### Tệp `/api/files` (P5)
- Quyền: đăng nhập (`authenticate`); quyền cụ thể kiểm tra trong service theo dữ liệu.
- `POST /api/files/upload` (multipart field `file`, tuỳ chọn `ownerType`/`ownerId`):
  kiểm tra loại tệp **theo nội dung** (magic bytes — không tin header/phần mở rộng từ client),
  chỉ nhận PNG/JPEG/GIF/WEBP/PDF; giới hạn dung lượng `FILE_MAX_SIZE_MB` (mặc định 5MB);
  đổi tên ngẫu nhiên (`storageKey`) khi lưu; lưu checksum SHA-256. Lớp storage trừu tượng
  (mặc định đĩa cục bộ `FILE_STORAGE_DIR`) — có thể đổi sang S3 mà không sửa controller.
  Thành công 201: `{ "data": { "id", "url", "originalName", "mimeType", "size", "checksum", "ownerType", "ownerId", "createdAt" } }`.
- `GET /api/files/:id`: tải tệp về; kiểm tra quyền sở hữu (học viên chỉ xem tệp của mình,
  giáo viên xem tệp học viên lớp mình, admin/staff xem tất cả).
- `GET /api/public/files/:id`: **công khai**, chỉ ảnh giáo viên `showOnWebsite=true` (landing page).
- Lỗi: 400 `VALID_FILE_TYPE` / `FILE_TOO_LARGE` / `FILE_MISSING`, 401 `UNAUTHENTICATED`, 403 `FORBIDDEN`, 404 `NOT_FOUND`.
- File gọi thử: `backend/requests/files.http`.

### Giáo viên `/api/teachers` (P5)
- Quyền: `admin` (vai trò khác -> 403).
- `GET /api/teachers?query=&status=ACTIVE|INACTIVE&showOnWebsite=true|false&specialty=&onlyDeleted=false&page=&pageSize=`:
  tìm không phân biệt dấu (mã/tên/email/điện thoại), lọc chuyên môn, đếm số lớp và sĩ số học viên.
- `POST /api/teachers`: tạo giáo viên, tuỳ chọn `account: { username }` để tạo kèm tài khoản
  (mật khẩu tạm sinh ngẫu nhiên, **chỉ trả về một lần** trong `temporaryPassword`, DB chỉ lưu Argon2 hash).
- `PATCH /api/teachers/:id`, `PATCH /api/teachers/:id/status`, `PATCH /api/teachers/:id/restore`,
  `POST /api/teachers/:id/reset-password` (trả mật khẩu tạm một lần), `POST /api/teachers/:id/photo`
  (upload ảnh qua module files rồi gắn fileId), `DELETE /api/teachers/:id` (xoá mềm, vô hiệu tài khoản liên kết).
- `GET /api/teachers/export`: xuất Excel (exceljs).
- Mọi tạo/sửa/xoá/đổi trạng thái/đặt lại mật khẩu đều ghi `audit_logs`.
- File gọi thử: `backend/requests/teachers.http`.

### Nhân viên `/api/staff` (P5)
- Quyền: `admin` (vai trò khác -> 403).
- `GET /api/staff?query=&status=ACTIVE|INACTIVE&position=&department=&onlyDeleted=false&page=&pageSize=`:
  tìm không phân biệt dấu, lọc vị trí/phòng ban, đếm số học viên phụ trách (advisor).
- `POST /api/staff`, `PATCH /api/staff/:id`, `PATCH /api/staff/:id/status`, `PATCH /api/staff/:id/restore`,
  `POST /api/staff/:id/reset-password`, `POST /api/staff/:id/photo`, `DELETE /api/staff/:id` (xoá mềm):
  tương tự giáo viên. Model `staff` **không có** `branchId` (khác teacher).
- `GET /api/staff/export`: xuất Excel (exceljs).
- File gọi thử: `backend/requests/staff.http`.

### Nhập Excel `/api/imports` (P6)
- Quyền: `admin` (vai trò khác -> 403); giới hạn riêng 10 lần/giờ (`importLimiter`).
- `GET /api/imports/templates/:type` (`:type` = `students|teachers|staff`): tải Excel mẫu — tiêu đề tiếng Việt + 2 dòng ví dụ.
- `POST /api/imports` (multipart field `file`, `kind` = `student|teacher|staff` qua query hoặc form field): đọc file `.xlsx` (kiểm tra magic bytes `PK`, không tin `Content-Type`), ánh xạ cột tiếng Việt, chuẩn hóa (sđt bỏ khoảng trắng/dấu `+`, ngày `dd/mm/yyyy` hoặc `yyyy-mm-dd`, giới tính Nam/Nữ/Khác), validate từng dòng bằng zod, phát hiện trùng mã/sđt trong file và trong hệ thống. Lưu `import_batches` + `import_rows` (rawData, status `VALID`/`ERROR`, errorMessage). **Chưa tạo tài khoản**. Tối đa 1000 dòng.
  - Thành công 201: `{ "data": { "batchId", "totalRows", "validRows", "errorRows" } }`.
  - Lỗi: 400 `NO_FILE`, `INVALID_FILE_TYPE`, `INVALID_EXCEL`, `MISSING_COLUMNS`, `TOO_MANY_ROWS`, `VALIDATION_ERROR`.
- `GET /api/imports/:id?status=&page=&pageSize=`: bản xem trước phân trang kèm tổng hợp (`validRows`, `errorRows`, `createdRows`). Lô không tồn tại -> 404.
- `POST /api/imports/:id/confirm` body `{ "skipErrors": false }`: tạo **User + hồ sơ (Student/Teacher/Staff) + vai trò** trong **một transaction** (timeout tỉ lệ số dòng). Tên đăng nhập sinh từ họ tên (bỏ dấu, thường), trùng thì tự suffix `2`, `3`... Mật khẩu tạm sinh ngẫu nhiên, đặt `mustChangePassword=true`, **chỉ lưu Argon2 hash**. Dòng lỗi: `skipErrors=false` -> 409 `HAS_ERROR_ROWS`; `skipErrors=true` bỏ qua. Xác nhận 2 lần -> 409 `ALREADY_CONFIRMED`. Ghi `audit_logs` (`action: 'import'`, `newData: { created, skipped }` — không chứa mật khẩu).
  - Thành công 200: `{ "data": { "batchId", "created", "skipped", "credentialsToken", "credentialsExpiresAt" } }`.
- `POST /api/imports/:id/credentials` body `{ "token" }`: tải Excel danh sách **tên đăng nhập + mật khẩu tạm**. Token ngẫu nhiên 256-bit, **dùng một lần**, hết hạn 15 phút, lưu **trong bộ nhớ** (không vào DB/log/audit). Sai token -> 404 `INVALID_TOKEN`; đã dùng -> 409 `TOKEN_USED`; hết hạn -> 410 `TOKEN_EXPIRED`.
- Quy tắc: mật khẩu tạm không bao giờ ghi DB dạng rõ, log hay audit (BR-12, D-034).
- File gọi thử: `backend/requests/imports.http`.

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
| 2026-10-10 | me, profile-change-requests, files, teachers, staff | Thêm mục **1c** P5: hồ sơ cá nhân, yêu cầu đổi hồ sơ, upload/tệp, CRUD giáo viên/nhân viên; cập nhật hàng 11/12 bảng mục 1; thêm `backend/requests/{me,files,teachers,staff}.http` | P5 |
| 2026-10-12 | imports | Thêm mục **1c** P6: nhập Excel (template, upload+validate, preview, confirm, credentials một lần); cập nhật hàng 34 bảng mục 1b; thêm `backend/requests/imports.http` | P6 |
