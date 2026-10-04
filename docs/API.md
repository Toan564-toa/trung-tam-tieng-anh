# API — hợp đồng endpoint

> Khung tài liệu (P0). Mỗi endpoint thêm vào **trong cùng commit** với code (AGENTS.md mục 6).
> Mỗi module backend có file ví dụ gọi thử `backend/requests/<module>.http` (REST Client của VS Code).

## 0. Quy ước chung

| Mục | Quy ước |
| --- | --- |
| Tiền tố | `/api` |
| Tên tài nguyên | Số nhiều, kebab-case: `/api/students`, `/api/class-sessions`, `/api/pay-rolls` |
| Thành công (một đối tượng) | `{ "data": { ... } }` |
| Thành công (danh sách) | `{ "data": { "items": [], "page": 1, "pageSize": 20, "total": 0, "totalPages": 0 } }` |
| Lỗi | `{ "error": { "code": "...", "message": "...", "details": [] } }` |
| Mã lỗi HTTP | 400 `VALIDATION_ERROR`, 401 `UNAUTHENTICATED`, 403 `FORBIDDEN`, 404 `NOT_FOUND`, 409 `CONFLICT` / `OVERPAYMENT`, 423 `LOCKED`, 429 `RATE_LIMITED`, 500 `INTERNAL_ERROR` |
| Phân trang | `?page=1&pageSize=20` (mặc định 20, tối đa 100), luôn sắp xếp ổn định |
| Sắp xếp | `?sort=createdAt:desc` |
| Lọc/tìm kiếm | `?query=` + tham số riêng, đúng như `docs/FRONTEND-CONTRACT.md` mục C ghi cho màn hình đó |
| Xác thực | Cookie JWT `httpOnly`, `credentials: "include"` |
| Tiền | Số nguyên VND |
| Thời gian | ISO 8601 UTC (`2026-10-02T03:00:00Z`); frontend hiển thị Asia/Ho_Chi_Minh |
| Đặt tên trường JSON | camelCase, bám `docs/FRONTEND-CONTRACT.md` |

## 1. Danh sách endpoint (điền theo từng module)

| # | Method + Path | Quyền | Màn hình dùng | Module | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 1 | `POST /api/auth/login` | công khai | Đăng nhập (4 vai trò) | auth | chưa có |
| 2 | `POST /api/auth/logout` | mọi vai trò | Menu người dùng | auth | chưa có |
| 3 | `POST /api/auth/change-password` | mọi vai trò | Đổi mật khẩu | auth | chưa có |
| 4 | `GET /api/auth/me` | mọi vai trò | Hồ sơ cá nhân | auth | chưa có |
| 5 | `GET/POST /api/users` | admin | Tài khoản & phân quyền | users | chưa có |
| 6 | `PATCH/DELETE /api/users/:id` | admin | Khoá, đổi vai trò, xoá mềm | users | chưa có |
| 7 | `POST /api/users/import` | admin | Nhập Excel tài khoản | users | chưa có |
| 8 | `GET/POST /api/students` | staff, admin | Quản lý học viên | students | chưa có |
| 9 | `GET /api/students/:id` | student(đúng người), staff, admin | Hồ sơ học viên | students | chưa có |
| 10 | `GET/POST /api/teachers` | admin | Quản lý giáo viên | teachers | chưa có |
| 11 | `GET/POST /api/staff` | admin | Quản lý nhân viên | staff | chưa có |
| 12 | `GET/POST /api/courses` | admin | Khóa học | courses | chưa có |
| 13 | `GET/POST /api/classes` | staff, admin | Lớp học | classes | chưa có |
| 14 | `GET/POST /api/rooms` | admin | Phòng học | rooms | chưa có |
| 15 | `GET/POST /api/timetable` | staff, admin | Thời khóa biểu (kiểm tra trùng phòng/GV) | timetable | chưa có |
| 16 | `GET/POST /api/class-sessions` | teacher, admin | Buổi học, điểm danh | sessions | chưa có |
| 17 | `POST /api/attendances` | teacher, admin | Điểm danh | sessions | chưa có |
| 18 | `GET/POST /api/invoices` | staff, admin | Khoản phải thu, công nợ | tuition | chưa có |
| 19 | `POST /api/payments` | staff, admin | Thu học phí | tuition | chưa có |
| 20 | `POST /api/receipts/close-of-day` | staff, admin | Đối soát cuối ngày | tuition | chưa có |
| 21 | `POST /api/discount-requests/:id/approve` | admin | Duyệt giảm giá/hoàn phí | tuition | chưa có |
| 22 | `GET/POST /api/pay-rolls` | admin | Bảng lương + chốt lương | payroll | chưa có |
| 23 | `GET/POST /api/events` | staff, admin | Lịch trình | events | chưa có |
| 24 | `GET/POST /api/tests`, `/api/scores` | teacher, admin | Nhập điểm | grades | chưa có |
| 25 | `GET/POST /api/assignments` | teacher, admin | Giao bài tập | assignments | chưa có |
| 26 | `GET/POST /api/posts` | staff, admin | Nội dung website | content | chưa có |
| 27 | `GET/POST /api/leads` | staff | Khách tiềm năng | leads | chưa có |
| 28 | `GET /api/dashboard`, `/api/reports/*` | admin | Dashboard, báo cáo | reports | chưa có |
| 29 | `GET /api/audit-logs` | admin | Nhật ký thao tác | audit | chưa có |
| 30 | `GET/PATCH /api/settings` | admin | Cài đặt | settings | chưa có |

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