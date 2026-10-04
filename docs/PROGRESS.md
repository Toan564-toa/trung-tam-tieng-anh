# Tiến độ dự án

## Trạng thái hiện tại
- Phase đang làm: **P0 — Khởi tạo repo và tài liệu** (xong, chờ commit đầu)
- Lệnh chạy dự án: `npm run dev:fe` (frontend, `http://localhost:5173`) · `npm run dev:be` (backend, chưa có mã nguồn)
- Cập nhật lần cuối: 2026-10-04, phiên 1 (P0)

## Danh sách phase
### Chuẩn bị
- [x] P0 Khởi tạo repo và tài liệu
- [ ] P1 Kiểm kê frontend, lập hợp đồng dữ liệu
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

## Nhật ký bàn giao (mới nhất ở trên)
### Phiên 1: 2026-10-04 (P0)
- Đã làm:
  - Cấu trúc thư mục: `backend/` (khung + README), `frontend/` (có sẵn), `docs/` (PROGRESS, DECISIONS, API,
    FRONTEND-CONTRACT, PERMISSIONS, BUSINESS-RULES, `docs/spec/`), `scripts/check.mjs`, `.gitignore` gốc, `CLAUDE.md`.
  - `package.json` gốc: `check`, `dev:be`, `dev:fe`, `install:all`, `db:migrate`, `db:seed`.
  - `frontend/package.json`: thêm `typecheck` (`tsc -b`) và `test` (in cảnh báo chưa cấu hình).
  - `docs/PERMISSIONS.md` và `docs/BUSINESS-RULES.md` soạn từ `AGENTS.md` bản 2 + mã nguồn `frontend/`.
- Còn dở (và vì sao):
  - **`backend/` TRỐNG** — người dùng báo đã giải nén `trung-tam-backend.zip` vào đây nhưng không có file nào
    (đã tìm trong `E:\new-project`, `C:\Users\toanp\Downloads`, `Desktop`, không thấy file zip đặc tả).
  - **`docs/spec/` TRỐNG** — chưa có `quan-ly-trung-tam-ngoai-ngu.md`, nên ma trận phân quyền và quy tắc nghiệp vụ
    chỉ suy ra từ `AGENTS.md` + mã nguồn frontend; các mục nghi ngờ đã gắn `[CẦN XÁC NHẬN]`.
  - Vì vậy **P2 (kiểm chứng khung backend) chưa thể bắt đầu** cho tới khi khung backend được đặt vào.
- Việc tiếp theo (cụ thể, theo thứ tự):
  1. Người dùng đặt mã nguồn backend vào `backend/` và đặc tả vào `docs/spec/`.
  2. Chạy `npm run install:all` rồi `npm run check` để xác nhận script gốc hoạt động với khung thật.
  3. Đối chiếu `docs/PERMISSIONS.md` + `docs/BUSINESS-RULES.md` với đặc tả; bỏ nhãn `[CẦN XÁC NHẬN]` hoặc ghi
     quyết định mới vào `docs/DECISIONS.md`.
  4. Bắt đầu **P1**: đọc `frontend/src/` và điền `docs/FRONTEND-CONTRACT.md` (mục B, C) — không sửa mã frontend.
- Quyết định mới (xem DECISIONS.md): D-001…D-006 (monorepo, cookie httpOnly, Prisma 6, snake_case, backend trước,
  5 mốc nối, script `check` báo rõ bước chưa cấu hình).
- Lệnh cần chạy để tiếp tục: `npm run check`, `npm run dev:fe`, `npm run dev:be`.

## Lệch hợp đồng (frontend và backend chưa khớp, xử lý ở phase NỐI)
- Chưa lập được danh sách ở P0 vì chưa có mã nguồn backend để so. Sẽ điền sau P2.
- (màn hình / trường / mô tả / hướng xử lý)

## Vấn đề đã biết
- `npm run check` hiện in bước "chưa cấu hình" cho backend (không có `backend/package.json`) và cho `test` của frontend.
  Đây là **cảnh báo**, không phải kết quả xanh — xem `docs/PROGRESS.md` mục "Vấn đề đã biết" và `scripts/check.mjs`.
- Frontend dùng `oxlint`; chưa có test runner ở cả hai phía (sẽ thêm ở P2/P3 cho backend).
- Repo đã có sẵn 1 commit cũ (`add: initial interface`) chỉ chứa file trong `.kilo/worktrees/…`; các file đó đã bị
  gỡ khỏi git qua `.gitignore` (không xoá trên đĩa).
- Đặc tả gốc chưa có trong `docs/spec/`; mọi nội dung suy ra đều gắn nhãn `[CẦN XÁC NHẬN]`.

## Việc phát sinh (ngoài phạm vi, chờ quyết định)
- Người dùng có thể muốn dùng **npm workspaces** thay vì `npm --prefix` khi khung backend có sẵn (xem D-001).
- Chưa quyết định công cụ test cho backend (Node built-in test hay Vitest) — sẽ chốt ở P2.