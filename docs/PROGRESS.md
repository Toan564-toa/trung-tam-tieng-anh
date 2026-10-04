# Tiến độ dự án

## Trạng thái hiện tại
- Phase đang làm: **P1 — Kiểm kê frontend, lập hợp đồng dữ liệu** (xong, chờ trả lời câu hỏi ở mục "Câu hỏi cần người dùng trả lời")
- Phase tiếp theo: **P2 — Kiểm chứng khung backend** (cần đặt mã nguồn backend vào `backend/`)
- Lệnh chạy dự án: `npm run dev:fe` (frontend, `http://localhost:5173`) · `npm run dev:be` (backend, **chưa có mã nguồn**)
- Cập nhật lần cuối: 2026-10-04, phiên 2 (P1)

## Danh sách phase
### Chuẩn bị
- [x] P0 Khởi tạo repo và tài liệu
- [x] P1 Kiểm kê frontend, lập hợp đồng dữ liệu
- [ ] P2 Kiểm chứng khung backend
- [ ] P3 Schema đầy đủ và dữ liệu mẫu
### Mốc 1: Đăng nhập, tài khoản, hồ sơ, import
- [ ] P4 Đăng nhập và quản lý tài khoản (BE)
- [ ] P5 Hồ sơ người dùng và tệp (BE)
- [ ] P6 Import Excel (BE)
- [ ] P7 NỐI #1: đăng nhập, tài khoản, hồ sơ, import
### Mốc 2: Lớp học và điểm danh
- [ ] P8 Khóa học, lớp, buổi học, ghi danh (BE)
- [ ] P9 Điểm danh (BE)
- [ ] P10 NỐI #2: lớp, thời khóa biểu, điểm danh
### Mốc 3: Tiền
- [ ] P11 Học phí (BE)
- [ ] P12 Lương (BE)
- [ ] P13 NỐI #3: học phí, lương
### Mốc 4: Nội dung và học tập
- [ ] P14 Lịch trình (BE)
- [ ] P15 Điểm số, bài tập, thông báo (BE)
- [ ] P16 Nội dung website và khách tiềm năng (BE)
- [ ] P17 NỐI #4: lịch trình, điểm số, landing page
### Mốc 5: Quản trị và hoàn thiện
- [ ] P18 Dashboard, báo cáo, nhật ký, cài đặt (BE)
- [ ] P19 NỐI #5: dashboard, báo cáo, cài đặt
- [ ] P20 Rà soát toàn hệ thống
- [ ] P21 Triển khai

## Ưu tiên làm backend (đề xuất cho P3–P18, theo thứ tự)
Thứ tự này xuất ra từ ma trận quyền (`docs/PERMISSIONS.md`) và hợp đồng dữ liệu (`docs/FRONTEND-CONTRACT.md`), ưu tiên những phần **chặn nhiều màn hình** và **sai tiền** trước.

| Ưu tiên | Phần backend | Vì sao lên trước |
|---|---|---|
| 1 | Xác thực + phân quyền + `requireRole` theo dữ liệu (P4) | Mọi endpoint sau đều phụ thuộc; hiện UI còn `localStorage` + vai trò giả |
| 2 | Schema `users, roles, user_roles, students, teachers, staff, guardians, branches, departments` (P3) | Nền cho mọi màn hồ sơ và phân quyền |
| 3 | `courses, classes, class_schedules, class_sessions, time_slots, rooms, enrollments` (P8) | Chặn 11 màn giáo viên + 10 màn nhân viên + 6 màn admin |
| 4 | `attendance` + khoá theo `settings.attendance_lock_days` (P9) | Dữ liệu điểm danh là đầu vào của điểm số và thống kê |
| 5 | `payments, invoices, invoice_items, discounts, refunds, daily_cash_closings` (P11) | **Tiền** — chỉ thêm không sửa, chụp snapshot, phải làm sớm và làm cẩn thận |
| 6 | `pay_rates, payroll_periods, payroll_items` (P12) | Tiền, phụ thuộc `attendance` |
| 7 | `assessments, scores, assignments, announcements` (P15) | Màn điểm của học viên đang hiện 4 kỹ năng — cần chốt Q8 trước |
| 8 | `events, event_types, event_audiences, timetable` (P14) | Lịch trình của cả 3 vai trò |
| 9 | `leads, lead_sources, lead_activities, posts, post_categories, site_banners, site_contents` (P16) | Nội dung và tuyển sinh |
| 10 | `notifications, audit_logs, settings, sequences, files` + view báo cáo (P18) | Dashboard, báo cáo, cài đặt; `audit_logs` bắt buộc từ Mốc 1 |

## Nhật ký bàn giao (mới nhất ở trên)
### Phiên 2: 2026-10-04 (P1 — kiểm kê và hợp đồng dữ liệu)
- Đã làm:
  - **Tìm thấy và chép 3 đặc tả gốc** từ `E:\tải\` vào repo:
    `docs/spec/quan-ly-trung-tam-ngoai-ngu.md`, `docs/spec/thiet-ke-database-day-du.md`,
    `backend/docs/spec/HUONG-DAN-BACKEND.md`. Tìm thấy cả `trung-tam-backend.zip` ở `E:\tải\`
    (**chưa giải nén** — nằm ngoài phạm vi P1).
  - `docs/FRONTEND-CONTRACT.md` viết lại từ đầu: phần A (nguyên tắc), B (38 thực thể ↔ bảng DB, 14 nhóm cột
    UI cần nhưng DB chưa có, 12 nhóm cột DB có nhưng UI chưa dùng), C (46 màn + landing, mỗi màn có route,
    vai trò, file, trường + kiểu + bắt buộc + định dạng, bộ lọc/sắp xếp/phân trang, từng hành động kèm endpoint,
    nguồn mock theo tên export/hàm), D (20 chức năng có trong đặc tả chưa có trên UI), E (20 chức năng có trên UI
    chưa nói trong đặc tả), F (17 rủi ro khi nối), G (12 câu hỏi).
  - `docs/PERMISSIONS.md` viết lại: thêm mục 0 (menu → route → quyền, 40 dòng) và cập nhật 8 nhóm chức năng theo đặc tả.
  - `docs/DECISIONS.md` thêm D-008…D-012 (D-008 thay thế D-007 vì nay đã có đặc tả).
  - Kiểm tra frontend không bị sửa: `git status --short -- frontend` và `git diff --stat HEAD -- frontend` đều **rỗng**.
  - `npm ls --depth=0` (frontend): không thiếu gói. `npm run build` (frontend): **thành công**, `✓ built in 1.43s`,
    chỉ có cảnh báo kích thước chunk.
- Còn dở:
  - **`backend/` vẫn TRỐNG** — chưa có `package.json`/mã nguồn, nên **P2 chưa thể bắt đầu**. File
    `trung-tam-backend.zip` đã tìm thấy ở `E:\tải\`, chờ người dùng cho phép giải nén vào `backend/`.
  - **12 câu hỏi nghiệp vụ chưa có trả lời** (xem cuối tài liệu này). Riêng Q4 (duyệt bài đăng) và Q8 (điểm 1 tổng
    hay 4 kỹ năng) ảnh hưởng tới schema nên cần trả lời **trước P3**.
  - Chưa chạy `npm install`/`npm ci` cho frontend (mới kiểm dependency bằng `npm ls` để không đụng `package-lock.json`).
- Quyết định mới: D-008…D-012 (xem `docs/DECISIONS.md`).
- Lệnh cần chạy để tiếp tục: `npm run check`, `npm run dev:fe`.

### Phiên 1: 2026-10-04 (P0)
- Đã làm:
  - Cấu trúc thư mục: `backend/` (khung + README), `frontend/` (có sẵn), `docs/`, `scripts/check.mjs`, `.gitignore` gốc, `CLAUDE.md`.
  - `package.json` gốc: `check`, `dev:be`, `dev:fe`, `install:all`, `db:migrate`, `db:seed`.
  - `frontend/package.json`: thêm `typecheck` (`tsc -b`) và `test` (in cảnh báo chưa cấu hình).
- Commit: `ad7036e chore(repo): initialize monorepo structure and P0 documentation`,
  `4dbc5d7 docs(progress): record P0 commit, remote mismatch and missing artifacts` (nhánh `phase-00-repo-docs`).
- Quyết định: D-001…D-007.

## Câu hỏi cần người dùng trả lời
Bản đầy đủ ở `docs/FRONTEND-CONTRACT.md` phần G. **Càng trả lời sớm càng tốt vì Q4 và Q8 quyết định schema ở P3.**

| # | Câu hỏi | Chặn phase nào |
|---|---|---|
| Q1 | Quản lý HV/GV/NV: một endpoint hợp nhất hay ba endpoint riêng? | P4/P8 |
| Q2 | Phụ huynh có tài khoản đăng nhập riêng trong lần này không? Có nhiều vai trò cho một tài khoản không? | P3 (vai trò) |
| Q3 | `active/paused/finished/dropped` là trạng thái của **học viên** hay của **lần ghi danh**? | P3 (schema) |
| Q4 | Nhân viên soạn bài rồi **admin duyệt**, hay **nhân viên tự đăng**? | **P3 (schema `posts.status`)** |
| Q5 | Có cần màn tạo lớp học ở khu vực quản trị không? | P8 |
| Q6 | Ca 7 (19:00–20:30) và Ca 8 (19:45–21:15) **chồng nhau** — dùng khung giờ nào thật? | P3 (`time_slots`) |
| Q7 | Có giữ cơ chế khoá bản ghi chống sửa chéo (`row_version`) không? | P8 |
| Q8 | Điểm lưu **một điểm tổng** hay **4 kỹ năng + nhận xét**? | **P3 (schema `scores`)** |
| Q9 | Tập trạng thái tài khoản chính thức: `active/locked/pending/archived` hay tập khác? | P4 |
| Q10 | Có lưu CCCD (`identityNo`) trong hồ sơ không? Cần mã hoá hay giới hạn quyền đọc? | P3 |
| Q11 | Có **hoàn phí / công nợ âm** không, ai duyệt? | P11 |
| Q12 | Có khoá sửa điểm/điểm danh sau thời hạn không, ai được mở khoá? | P9 |

## Lệch hợp đồng (frontend và backend chưa khớp, xử lý ở phase NỐI)
Chi tiết đầy đủ ở `docs/FRONTEND-CONTRACT.md` phần D, E, F. Các lệch **chắc chắn phải sửa ở frontend**:
- Chuông thông báo trỏ `/hoc-vien/lich-hoc`, route thật là `/hoc-vien/lich-trinh` → 404 (F11).
- `DemoRolePicker` + `localStorage["ttnn.auth.user"]` phải bỏ hoàn toàn (F1).
- Trạng thái lưu bằng chuỗi tiếng Việt trong `PAYMENT_METHOD_META`, `POST_CATEGORIES`, `LEAD_SOURCE_META` (F2).
- Ngày "hôm nay" cứng ở ba nơi khác nhau; `formatDate()` theo múi giờ máy (F3).
- Phân trang/lọc/xuất Excel chạy ở client, phải chuyển sang server (F5, F6).
- `TEMPLATE_COLUMNS` trong `lib/admin-excel.ts` không được export, bước 1 của màn Nhập Excel không hiện được danh sách cột (F6).
- Ảnh là URL Unsplash, cần upload thật qua `files` (F7).
- `role-home-page.tsx` không được route nhưng còn chuỗi cứng trong một số màn (F10).

## Vấn đề đã biết
- `npm run check` in bước "CHƯA CẤU HÌNH" cho backend (chưa có `backend/package.json`) và cho `test` của frontend.
  Đây là **cảnh báo**, không phải kết quả xanh — xem `scripts/check.mjs`.
- Frontend dùng `oxlint`; lint có cảnh báo `only-export-components` ở một số file nhưng **không có lỗi**.
- Chưa có test runner ở cả hai phía (sẽ thêm ở P2/P3 cho backend).
- Repo trước đó chỉ có commit `006fe9b add: initial interface` chứa 40 file trong `.kilo/worktrees/raspy-xenon/` và một
  **gitlink hỏng** cho `frontend`. P0 đã gỡ `.kilo` khỏi tracking và đưa mã nguồn `frontend/` vào tracking như file thường.
- Remote `origin` đang trỏ tới `https://github.com/Toan564-toa/trung-tam-tieng-anh.git` (khác tên thư mục
  `trung-tam-ngoai-ngu`) — **cần xác nhận trước khi push**, chưa push gì.
- `backend/docs/spec/HUONG-DAN-BACKEND.md` nói "mã nguồn đã được viết" nhưng thư mục `backend/` không có file nào
  → phải đặt mã nguồn vào trước khi P2 kiểm chứng được.

## Việc phát sinh (ngoài phạm vi, chờ quyết định)
- Có thể chuyển sang **npm workspaces** thay vì `npm --prefix` khi khung backend có sẵn (xem D-001).
- Chưa chốt công cụ test cho backend (Node built-in test hay Vitest) — chốt ở P2.
- `trung-tam-backend.zip` chờ người dùng cho phép giải nén vào `backend/`.