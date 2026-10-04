# [TÊN TRUNG TÂM] – Frontend

Frontend cho trung tâm ngoại ngữ (dữ liệu mẫu, chưa có backend).

**Stack:** React + Vite + TypeScript · Tailwind CSS v4 · shadcn/ui (Base UI) · lucide-react · Framer Motion · React Router · Swiper · Sonner · Recharts (biểu đồ khu vực quản trị) · SheetJS `xlsx` (xuất/nhập Excel)

## Chạy dự án

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build
npm run lint     # oxlint
```

## Cấu trúc

```
src/
  app/          router, providers, RequireRole guard
  layouts/      root / public / client / admin layouts
  pages/        public · auth · client (student · teacher · staff) · admin
  features/     landing (sections, header, footer), auth (form, demo picker…)
  components/   ui (Button, Card, Badge, Input, Modal, Toast, Progress…), charts, motion, common, layout, admin (DataTable toolbar, charts Recharts, global search, confirm dialog)
  data/         landing · student · teacher · staff · admin · posts · notifications
  lib/          auth (mock), date, format, images, excel (SheetJS), admin-excel (template/nhập/xuất)
  config/       thông tin trung tâm (tên, địa chỉ, hotline, mạng xã hội)
docs/           tài liệu bàn giao giữa các phiên làm việc
```

## Routes

| Route | Mô tả |
| --- | --- |
| `/` | Landing page (11 section) |
| `/dang-nhap` | Đăng nhập Học viên / Giáo viên / Nhân viên (+ chế độ demo) |
| `/admin/dang-nhap` | Đăng nhập quản trị |
| `/doi-mat-khau` | Đổi mật khẩu (bắt buộc lần đầu / tự do trong menu người dùng) |
| `/hoc-vien` | Học viên – Tổng quan |
| `/hoc-vien/lich-trinh` | Học viên – Lịch trình (lịch tháng + chi tiết sự kiện) |
| `/hoc-vien/bang-diem` | Học viên – Bảng điểm (+ biểu đồ tiến bộ) |
| `/hoc-vien/bai-tap` | Học viên – Bài tập & thông báo |
| `/hoc-vien/hoc-phi` | Học viên – Học phí |
| `/hoc-vien/thoi-gian-hoc` | Học viên – Thời gian học (64 buổi theo tháng) |
| `/hoc-vien/thong-tin-ca-nhan` | Học viên – Hồ sơ + người bảo hộ |
| `/giao-vien` | Giáo viên – Tổng quan (lớp hôm nay, điểm danh cần làm, tháng lương) |
| `/giao-vien/lop-hoc` | Giáo viên – Lớp của tôi |
| `/giao-vien/lop-hoc/:classId` | Giáo viên – Chi tiết lớp (học viên, lịch học, điểm danh, điểm số) |
| `/giao-vien/hoc-vien` | Giáo viên – Danh sách học viên (tìm kiếm, lọc, sắp xếp) |
| `/giao-vien/hoc-vien/:studentId` | Giáo viên – Hồ sơ học viên (điểm danh, điểm số, liên hệ phụ huynh) |
| `/giao-vien/diem-danh` | Giáo viên – Điểm danh nhanh theo lớp/buổi (tối ưu mobile) |
| `/giao-vien/nhap-diem` | Giáo viên – Nhập điểm theo bài kiểm tra |
| `/giao-vien/lich-trinh` | Giáo viên – Lịch tháng (thêm/sửa/xoá sự kiện của bạn) |
| `/giao-vien/bai-tap` | Giáo viên – Giao bài tập cho lớp |
| `/giao-vien/bang-luong` | Giáo viên – Bảng lương theo tháng |
| `/giao-vien/thong-tin-ca-nhan` | Giáo viên – Hồ sơ + lịch dạy trong tuần |
| `/nhan-vien` | Nhân viên – Tổng quan (việc hôm nay, khách mới, học phí quá hạn) |
| `/nhan-vien/hoc-vien` | Nhân viên – Danh sách học viên (tìm kiếm, lọc, sắp xếp, xuất Excel, thêm/sửa) |
| `/nhan-vien/hoc-vien/:studentId` | Nhân viên – Hồ sơ học viên (thông tin, phụ huynh, lớp, điểm danh, học phí, ghi chú) |
| `/nhan-vien/ghi-danh` | Nhân viên – Ghi danh học viên (wizard 5 bước, tính học phí và in phiếu thu) |
| `/nhan-vien/hoc-phi` | Nhân viên – Thu học phí (sổ thu, phiếu thu, xuất Excel) |
| `/nhan-vien/khach-tiem-nang` | Nhân viên – Khách tiềm năng (kanban, ghi chú gọi, chuyển sang ghi danh) |
| `/nhan-vien/lich-trinh` | Nhân viên – Lịch trình trung tâm (thêm/sửa/xoá, chọn đối tượng nhận) |
| `/nhan-vien/bai-dang` | Nhân viên – Bài đăng (soạn thảo, xuất bản, đồng bộ landing page) |
| `/nhan-vien/bang-luong` | Nhân viên – Bảng lương đã chốt (chỉ xem) |
| `/nhan-vien/thong-tin-ca-nhan` | Nhân viên – Hồ sơ cá nhân + lớp phụ trách |
| `/admin` | Quản trị – Bảng điều khiển (sĩ số, doanh thu, công nợ, điểm danh) |
| `/admin/bao-cao` | Quản trị – Báo cáo (doanh thu, công nợ, sĩ số, chuyên cần, tuyển sinh) |
| `/admin/nhat-ky` | Quản trị – Nhật ký thao tác |
| `/admin/tai-khoan` | Quản trị – Tài khoản và phân quyền (khoá, đặt lại mật khẩu) |
| `/admin/hoc-vien` · `/admin/giao-vien` · `/admin/nhan-vien` | Quản trị – Quản lý học viên / giáo viên / nhân viên |
| `/admin/import` | Quản trị – Nhập tài khoản hàng loạt từ Excel (wizard 4 bước) |
| `/admin/khoa-hoc` · `/admin/lop-hoc` · `/admin/phong-hoc` | Quản trị – Khóa học / lớp học / phòng học |
| `/admin/thoi-khoa-bieu` | Quản trị – Thời khóa biểu tuần (cảnh báo trùng phòng, trùng giáo viên) |
| `/admin/diem-danh` | Quản trị – Điểm danh toàn trung tâm (mở khoá sửa, xuất Excel) |
| `/admin/lich-trinh` | Quản trị – Lịch trình và sự kiện trung tâm |
| `/admin/hoc-phi` | Quản trị – Học phí, công nợ, đối soát cuối ngày, duyệt giảm giá |
| `/admin/bang-luong` | Quản trị – Bảng lương giáo viên và nhân viên (chốt lương) |
| `/admin/noi-dung` | Quản trị – Bài đăng, banner và giáo viên hiển thị trên website |
| `/admin/cai-dat` | Quản trị – Thông tin trung tâm, năm học, mẫu biên lai, khoá điểm danh |

## Tài khoản mẫu

| Vai trò | Tài khoản | Mật khẩu |
| --- | --- | --- |
| Học viên | `hocvien` | `123456` |
| Giáo viên | `giaovien` | `123456` |
| Nhân viên | `nhanvien` | `123456` |
| Học viên (lần đầu → đổi mật khẩu) | `hocvienmoi` | `123456` |
| Admin | `admin` | `admin123` |

Đổi tên trung tâm và thông tin liên hệ tại `src/config/site.ts`.
Xem `docs/DEV_NOTES.md` để nắm trạng thái triển khai và việc còn lại.