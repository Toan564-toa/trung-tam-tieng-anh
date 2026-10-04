# Ghi chú phát triển – Trung tâm Ngoại ngữ

Tài liệu này dùng để bàn giao trạng thái giữa các phiên làm việc.
**Cập nhật file này ở cuối mỗi phiên** và đọc lại nó ở đầu phiên sau.

---

## 1. Kiến trúc tổng thể

Một dự án duy nhất chứa ba khu vực, phân tách bằng layout:

| Khu vực | Layout | Prefix route |
| --- | --- | --- |
| Website công khai | `PublicLayout` | `/` |
| Client app (học viên / giáo viên / nhân viên) | `ClientLayout` → `AppShell variant="client"` | `/hoc-vien`, `/giao-vien`, `/nhan-vien` |
| Admin app | `AdminLayout` → `AppShell variant="admin"` | `/admin` |

Luồng: `app/router.tsx` (`createBrowserRouter`) → `RootLayout` → layout theo khu vực → page.

### Bảo vệ route

`app/require-role.tsx` — `RequireRole` hỗ trợ hai cách dùng:

```tsx
// 1) Bọc trực tiếp một page
{ path: "nhan-vien", element: <RequireRole roles={["staff"]}><RoleHomePage role="staff" /></RequireRole> }

// 2) Dùng như layout route (children lồng nhau), component tự render <Outlet />
{ element: <RequireRole roles={["student"]} />, children: [ ... ] }
```

Logic: chưa đăng nhập → về trang login tương ứng · `mustChangePassword` → `/doi-mat-khau` · sai vai trò → `ROLE_META[role].home`.

---

## 2. Design system (không được phá vỡ)

- **Tailwind v4, CSS-first.** KHÔNG có `tailwind.config.js`. Toàn bộ token nằm trong `src/index.css`:
  - `@theme inline` map sang `--color-brand`, `--color-ink`, `--color-cream`, `--color-sky-accent`, `--color-surface`, `--color-success/warning/danger`, `--shadow-soft/lift/glow`, `--radius-*`
  - Biến gốc trong `:root`
  - Class dùng lại: `.container-page`, `.section`
- **Font:** `--font-heading` = Be Vietnam Pro (tiêu đề), `--font-sans` = Inter Variable (nội dung).
- **Quy tắc màu nút vàng:** nền `#FBBF24` luôn đi kèm chữ tối (`text-ink`), tuyệt đối không dùng chữ trắng.
- **Class tiện ích:** `cn` import từ package `cn` (không phải `@/lib/utils`).

### Component UI có sẵn (`src/components/ui/`)

`Button` (variant: primary/secondary/outline/ghost/dark/danger/link; size: sm/md/lg/icon; hỗ trợ `render={<Link/>}`),
`Card` (+Header/Title/Description/Content/Footer), `Badge` (brand/info/success/warning/danger/neutral/dark),
`Input` (+ export `fieldBase`), `Textarea`, `Label`, `FormField`, `Dialog`, `Modal`, `Toast` (re-export `sonner`), `SectionTitle`,
`Progress` (mới).

---

## 3. AppShell — khung chung client/admin

File: `src/components/layout/app-shell.tsx`

- Sidebar desktop **thu gọn/mở rộng được** (264px ↔ 84px), trạng thái lưu ở `localStorage` key `ttnn.shell.collapsed`.
- Active item nền vàng `bg-brand` + thanh nhấn vàng bên trái (chỉ bản light).
- Mobile: **drawer** (mở bằng nút hamburger) + **thanh tab dưới cùng** tối đa 4 mục đánh dấu `primary`, phần dư gộp vào nút "Thêm" mở drawer.
- Drawer tự đóng khi điều hướng bằng cách so `drawerPath` với `location.pathname` (không dùng `useEffect` setState).
- Topbar: tên trang hiện tại + `NotificationBell` (Base UI `Popover`) + `UserMenu` (Base UI `Menu`).
  - Menu người dùng: Thông tin cá nhân (theo `ROLE_NAV_PATHS`), Đổi mật khẩu (`/doi-mat-khau`), Đăng xuất.
- `variant="admin"` dùng nền `#0F172A`, không có thanh tab dưới cùng.

### Menu theo vai trò

`src/layouts/client-layout.tsx` → `NAV_BY_ROLE`. Item có `primary: true` để ưu tiên trên tab bar mobile (tối đa 4 mục), `soon: true` để hiện pill "Sắp có" và không active.

Giáo viên có 9 mục (5 `primary`), nhân viên vẫn là placeholder `soon`. Route chi tiết (`lop-hoc/:classId`, `hoc-vien/:studentId`) không có item riêng — topbar lấy nhãn theo `startsWith` nên vẫn hiện đúng mục cha.

---

## 4. Dữ liệu mẫu

| File | Nội dung |
| --- | --- |
| `src/data/landing.ts` | Landing page (khóa học, giáo viên, tin tức…) |
| `src/data/student.ts` | Toàn bộ dữ liệu khu vực học viên |
| `src/data/teacher.ts` | Toàn bộ dữ liệu khu vực giáo viên |
| `src/data/staff.ts` | Toàn bộ dữ liệu khu vực nhân viên (lớp toàn trung tâm, học viên, học phí, tư vấn, lịch, lương) |
| `src/data/posts.ts` | Bài đăng dùng chung giữa khu vực nhân viên và landing page |
| `src/data/notifications.ts` | Thông báo theo vai trò cho menu chuông |

### `src/data/student.ts` — mô hình dữ liệu học viên

Học viên mẫu: **Nguyễn Gia Huy** (`HV2026-0147`), lớp **A2 Buổi Tối 01**, giáo viên **Cô Nguyễn Minh Anh**.

- `ENROLLMENT` — lớp, khóa, lịch học, `totalLessons: 64`, `attendedLessons: 24`, `startDate: 06/07/2026`, `estimatedCompletion: 24/02/2027`.
- `LESSONS` — **sinh tự động** 64 buổi (Thứ 2 & Thứ 6 từ `startDate`, bỏ qua `SKIP_DATES`). Chủ đề lấy từ `UNITS` (8 unit × 8 buổi). Điểm danh `present` cho buổi đã qua, `upcoming` cho buổi chưa tới, và ghi đè thủ công qua `overrides`.
- `ATTENDANCE_STATS` — tự tính từ `LESSONS`.
- `CALENDAR_EVENTS` — ghép `LESSONS` + `EXTRA_EVENTS` (kỳ thi, nghỉ lễ, sự kiện trung tâm). Lịch tháng điều hướng được vẽ lại từ mảng này.
- `SCORES` / `SCORE_KIND_META` — điểm định kỳ, giữa khóa (thang 10, 4 kỹ năng + nhận xét giáo viên).
- `ASSIGNMENTS` / `ASSIGNMENT_META` — trạng thái `submitted | due | late | overdue`.
- `ANNOUNCEMENTS`, `PAYMENTS`, `TUITION`, `TUITION_METHOD_META`.
- `STUDENT_PROFILE`, `GUARDIAN`.

> **Ngày "hôm nay" của demo được hard-code `new Date(2026, 9, 1)`** trong từng page (biến `TODAY`) và trong `LESSONS`, để dữ liệu mẫu luôn nhất quán. Khi nối API thì thay bằng `new Date()`.

### `src/data/teacher.ts` — mô hình dữ liệu giáo viên

Giáo viên mẫu: **Nguyễn Minh Anh** (`GV0012`), phụ trách **3 lớp / 44 học viên**. `TODAY = new Date(2026, 9, 2)` (thứ Sáu, 02/10/2026).

- `TEACHER_PROFILE` — hồ sơ, chuyên môn, chứng chỉ.
- `CLASSES` / `CLASS_META` / `CLASS_PROGRESS_TONE` — lớp phụ trách. `CLASS_PROGRESS_TONE` ánh xạ màu badge sang màu hợp lệ của `<Progress>` (badge có `info`, progress có `sky`).
- `TEACHER_STUDENTS` — **sinh tự động** từ seed từng lớp (`buildStudents`), tự gán avatar, tỷ lệ điểm danh, điểm TB. `studentsOfClass`, `getStudent`.
- `CLASS_LESSONS` / `lessonsOfClass` / `todayLessonOfClass` — lịch học đã qua + buổi hôm nay, kèm `marks`, `note`, `lockedAt`. `ATTENDANCE_LOCK_DAYS = 7` → quá hạn thì khoá, không sửa được.
- `TESTS` / `TEST_KIND_META` / `testsOfClass` / `scoresOfTest` — bài kiểm tra và điểm từng học viên.
- `TEACHER_ASSIGNMENTS`, `OWN_EVENTS` / `CENTER_EVENTS` / `TEACHER_EVENT_META` / `audienceLabel` — bài tập đã giao và sự kiện lịch tháng (sự kiện trung tâm `editable: false` → chỉ xem).
- `PAYROLL` / `PAYROLL_STATUS_META` / `payrollTotals` — 5 kỳ lương, trạng thái `draft | pending | approved`.
- `MARK_META`, `scheduleText`, `weekdayLabel`, `weeklySchedule` — nhãn trạng thái điểm danh và lịch dạy trong tuần.

### `src/data/staff.ts` — mô hình dữ liệu nhân viên

Nhân viên mẫu: **Nguyễn Thị Bích Ngọc** (`NV0007`), phòng Tư vấn – Đào tạo. `STAFF_TODAY = new Date(2026, 9, 2)`.

- `STAFF_PROFILE` / `STAFF_TEAM` / `getStaffMember` — hồ sơ nhân viên và 5 thành viên trong phòng.
- `CENTER_CLASSES` — lớp **toàn trung tâm**: 3 lớp tái sử dụng từ `data/teacher.ts` (`SHARED_CLASS_STAFF` gán nhân viên phụ trách) + `EXTRA_CLASSES`. `CLASS_STATUS_META` cho trạng thái `active | finishing | closed`.
- `STAFF_STUDENTS` — **sinh tự động** từ seed theo lớp (`buildExtraStudents`), dùng lại tên/avatar của `TEACHER_STUDENTS` để hai khu vực không lệch nhau. `filterStudents`, `studentsOfStaff`, `overdueStudents`, `tuitionProgress`, `STUDENT_STATUS_META`, `TUITION_STATUS_META`.
- `CENTER_PAYMENTS` / `PAYMENT_METHOD_META` / `paymentsToday` / `collectedToday` / `nextReceiptNo` — sổ thu; `nextReceiptNo` tăng seq nên mỗi lần bấm sinh mã phiếu mới.
- `LEADS` / `LEAD_STAGES` — khách tiềm năng dùng cho kanban tư vấn.
- `STAFF_TASKS` / `TASK_TYPE_META` — việc cần làm trong ngày.
- `STAFF_EVENTS` / `CENTER_EVENT_META` / `CENTER_EVENT_SCOPE_META` / `eventAudienceText` — lịch trình trung tâm; `scope: all | teachers | staff | classes`, `classes` kèm `classIds`.
- `STAFF_PAYROLL` / `STAFF_PAYROLL_STATUS_META` — lương nhân viên, chỉ hiển thị kỳ `approved`.
- `STAFF_TODAY`, `TODAY_DATE_LABEL` — mốc "hôm nay" dùng chung cho cả khu vực.

### `src/data/posts.ts`

Store bài đăng dùng `useSyncExternalStore` để trang biên tập của nhân viên và section tin tức landing page cập nhật trong cùng một phiên trình duyệt.

### `src/data/admin.ts` — mô hình dữ liệu quản trị

`ADMIN_TODAY = new Date(2026, 9, 2)`. Mọi dữ liệu khu vực quản trị đều **tái sử dụng** `data/staff.ts`, `data/teacher.ts`, `data/landing.ts` nên không lệch với các khu vực khác.

- `ADMIN_ACCOUNTS` / `ACCOUNT_ROLE_META` / `ACCOUNT_STATUS_META` — 56 tài khoản sinh tự động (`buildAccounts`), có `deletedAt` cho xoá mềm; SĐT sinh theo đầu số hợp lệ để khớp regex của form.
- `managedStudents()` / `managedTeachers()` / `managedStaff()` → `ManagedPerson[]` — nguồn chung cho 3 trang quản lý người dùng.
- `ADMIN_COURSES`, `ADMIN_ROOMS`, `ROOM_STATUS_META` — khóa học và phòng học (phòng gồm cả các phòng mà `CENTER_CLASSES` đang dùng).
- `TIMETABLE` / `TIMETABLE_SLOTS` / `TIMETABLE_WEEKDAYS` / `findConflicts` — thời khóa biểu tuần. **Lưu ý quy ước**: `TeacherClass.weekdays` dùng `0 = Chủ Nhật … 6 = Thứ Bảy`, nên `TIMETABLE_WEEKDAYS` hiển thị theo thứ Hai → Chủ Nhật nhưng `value` giữ nguyên quy ước đó.
- `ADMIN_INVOICES` / `INVOICE_STATUS_META` / `invoiceRemaining` / `DEBT_AGING` / `CASH_CLOSES` / `DISCOUNT_REQUESTS` — học phí và công nợ.
- `ATTENDANCE_SUMMARIES` / `attendanceRate` / `classAttendanceRows` / `unlockClassAttendance` — điểm danh toàn trung tâm (`unlockClassAttendance` cập nhật trực tiếp mảng module).
- `ADMIN_PAYROLL` / `ADMIN_PAYROLL_STATUS_META` / `adminPayrollTotal` — lương giáo viên + nhân viên, khoá khi `approved`.
- `LANDING_BANNERS` / `LANDING_TEACHERS` / `PUBLISH_STATUS_META` — nội dung hiển thị trên website (bài đăng dùng store `data/posts.ts`).
- `AUDIT_LOGS` / `AUDIT_ACTION_META`, `ADMIN_SETTINGS`, `REVENUE_SERIES`, `ENROLLMENT_SERIES`, `SOURCE_SERIES`, `FUNNEL_SERIES`, `RECRUIT_SUMMARY`, `TODAY_LESSONS`, `NEW_LEADS` — nhật ký, cài đặt và số liệu báo cáo.

### Xuất Excel

`src/lib/excel.ts` — 7 hàm `async`: `exportAttendanceSheet`, `exportAttendanceSummary`, `exportScoreSheet`, `exportPayroll`, `exportStudentsSheet`, `exportPaymentsSheet`, `exportLeadsSheet`; đồng thời export `getXlsx()` và `downloadWorkbook()` cho khu vực quản trị.
SheetJS (`xlsx@0.20.3`, nguồn `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`) được **dynamic import** và cache lại, nên Vite tách riêng thành chunk `xlsx-*.js` (~492 kB) chỉ nạp khi bấm nút xuất.

`src/lib/admin-excel.ts` — `exportAdminTable` (xuất bảng tuỳ ý), `downloadImportTemplate`, `parseImportFile` (validate từng dòng: thiếu cột, sai định dạng SĐT/email/ngày, trùng SĐT trong file và trong hệ thống), `generateCredentials` (sinh username + mật khẩu tạm), `exportCredentialsSheet`. Tên cột được so khớp không dấu/khoảng trắng nên file mẫu tiếng Việt vẫn parse được.

---

## 5. Tiện ích mới

- `src/lib/date.ts` — định dạng tiếng Việt: `formatDate`, `formatDateLong`, `formatMonthYear`, `formatMonthName`, `formatWeekdayShort`, `toDateKey`, `isSameDay`, `weekdayIndex`, `addDays`, `addMonths`, `daysBetween`, `describeDeadline`, `buildMonthGrid` (lưới 6×7 bắt đầu từ thứ Hai), `CALENDAR_WEEKDAYS`.
- `src/components/ui/progress.tsx` — `<Progress value max tone size label valueLabel />`, dùng `motion.div` cho thanh.
- `src/components/charts/line-chart.tsx` — biểu đồ đường SVG thuần (không thêm thư viện). `viewBox 620×H`, tự co giãn, có animation `pathLength` + vẽ điểm/labels.
- `src/components/layout/page-header.tsx` — header chuẩn cho các page trong app (`eyebrow`, `title`, `description`, `actions`).
- `src/lib/auth/role-nav.ts` — `ROLE_NAV_PATHS` ánh xạ role → route hồ sơ cá nhân.

### Khu vực giáo viên (`/giao-vien`)

11 route, dùng chung `ClientLayout`/`AppShell`. Ba trang có state phụ thuộc tham số chọn lớp/buổi/bài kiểm tra (`diem-danh`, `nhap-diem`, tab điểm danh trong chi tiết lớp): **không dùng `useEffect` setState**, mà tách phần nhập liệu ra component con và đặt `key` theo lớp/buổi, để React mount lại và nạp đúng dữ liệu.

- `teacher-attendance-page.tsx` — chọn lớp → chọn buổi → `QuickMarkList` (mục tiêu dễ chạm: vùng bấm lớn, `min-h-11`, thanh đếm nhanh `sticky`, nút "Tất cả có mặt", thanh lưu dính đáy). Sửa trong `ATTENDANCE_LOCK_DAYS`.
- `teacher-scores-page.tsx` — nhập điểm, cảnh báo điểm ngoài thang, thống kê TB / cao / thấp.
- `teacher-schedule-page.tsx` — lịch tháng, thêm / sửa / xoá sự kiện của bạn (dữ liệu cục bộ), sự kiện trung tâm chỉ xem.
- `teacher-assignments-page.tsx` — form có validate + danh sách bài tập đã giao, badge quá hạn.
- `teacher-payroll-page.tsx` — bảng lương theo tháng, trạng thái duyệt, xuất Excel.
- `teacher-profile-page.tsx` — hồ sơ (sửa được SĐT/email/chuyên môn/giới thiệu), lịch dạy trong tuần, tóm tắt thu nhập.
- `features/teacher/quick-mark-list.tsx` — dùng chung cho cả trang điểm danh và tab điểm danh; hỗ trợ `readOnly`.

### Khu vực nhân viên (`/nhan-vien`)

10 route, dùng chung `ClientLayout`/`AppShell` và bộ dữ liệu `data/staff.ts` (3 lớp dùng chung với khu vực giáo viên).

- `staff-overview-page.tsx` — việc hôm nay, khách mới, học phí quá hạn, khoản thu hôm nay, quick actions.
- `staff-students-page.tsx` — bảng học viên: tìm kiếm, lọc trạng thái/lớp/nhân viên/học phí, sắp xếp, phân trang, xuất Excel, modal thêm/sửa có validate.
- `staff-student-detail-page.tsx` — 6 tab: thông tin, phụ huynh, lớp, điểm danh, học phí, ghi chú chăm sóc.
- `staff-enroll-page.tsx` — wizard 5 bước (chọn hồ sơ có sẵn qua `filterStudents` hoặc tạo mới → chọn lớp còn chỗ → giảm giá → khoản phải thu → thu tiền), sinh phiếu bằng `nextReceiptNo()` và mở modal in phiếu.
- `staff-tuition-page.tsx` — tìm học viên, tổng hợp nợ, nhập tiền, sổ thu, xuất Excel, phiếu thu in được.
- `staff-leads-page.tsx` — kanban 5 cột, kéo thả HTML5 (có `<select>` fallback cho mobile), ghi chú gọi, nút "Ghi danh" sang `/nhan-vien/ghi-danh?lead=...`.
- `staff-schedule-page.tsx` — lịch tháng toàn trung tâm, lọc theo đối tượng nhận, CRUD sự kiện, chọn nhiều lớp khi `scope = classes`.
- `staff-posts-page.tsx` — soạn / xuất bản / xoá bài đăng, đồng bộ với landing page.
- `staff-payroll-page.tsx` — chỉ xem kỳ đã chốt + xuất Excel.
- `staff-profile-page.tsx` — hồ sơ, lớp phụ trách, thống kê tư vấn.
- `features/staff/receipt-view.tsx` — phiếu thu A5, in bằng CSS `@media print` (ẩn mọi thứ ngoài `[data-receipt]`).

> Dữ liệu chưa có backend: bài đăng dùng store `useSyncExternalStore` nên đồng bộ thật giữa các route, còn ghi danh / thu tiền / sự kiện giữ state cục bộ theo trang.

### Khu vực quản trị (`/admin`)

18 route, `AdminLayout` dùng chung `AppShell` với `variant="admin"`: sidebar **xanh navy (#0F172A)**, mục đang chọn nền **vàng brand**, có nhóm menu (`ShellNavItem.group`) và ô **tìm kiếm toàn cục** trên topbar (`GlobalSearch`: học viên, giáo viên, lớp, khóa học, phòng, tài khoản; mũi tên + Enter để chọn).

- Tất cả page quản trị **lazy-load** (`React.lazy` + `Suspense` trong `app/router.tsx`) nên Recharts nằm ở chunk riêng (`charts-*.js` ~421 kB) chỉ nạp khi vào khu vực quản trị.
- `components/admin/table-toolbar.tsx` — `TableToolbar`, `ToolbarSelect`, `TablePagination`, `TableEmpty` dùng chung cho mọi bảng.
- `components/admin/confirm-dialog.tsx` — xác nhận xoá mềm / khoá / chốt lương.
- `components/admin/charts.tsx` — wrapper Recharts: `ChartFrame`, `RevenueChart`, `ClassSizeChart`, `AttendanceRateChart`, `EnrollmentChart`, `FunnelChart`, `SharePieChart`.
- `components/admin/global-search.tsx` — tìm kiếm toàn cục (kẹp chỉ số kết quả khi render thay vì `useEffect` setState).

| Nhóm | Route | Nội dung |
| --- | --- | --- |
| Tổng quan | `/admin` | 4 stat card, doanh thu 7 tháng, sĩ số lớp, tỷ lệ điểm danh, cơ cấu công nợ, buổi học hôm nay, công nợ và khách mới |
| | `/admin/bao-cao` | 5 loại báo cáo (doanh thu, công nợ, sĩ số, chuyên cần, tuyển sinh) + lọc khoảng ngày + xuất Excel |
| | `/admin/nhat-ky` | Nhật ký thao tác, lọc theo vai trò/hành động/ngày |
| Người dùng | `/admin/tai-khoan` | Khoá, mở khoá, đặt lại mật khẩu, đổi vai trò, xoá mền |
| | `/admin/hoc-vien` `/admin/giao-vien` `/admin/nhan-vien` | CRUD + xoá mền + xuất Excel (nguồn `managedStudents/Teachers/Staff`) |
| | `/admin/import` | Wizard 4 bước: tải mẫu → upload → preview + validate từng dòng → tạo tài khoản, xuất danh sách mật khẩu tạm |
| Đào tạo | `/admin/khoa-hoc` `/admin/lop-hoc` `/admin/phong-hoc` | CRUD khóa học, lớp học (khoá/mở khoá điểm danh), phòng học |
| | `/admin/thoi-khoa-bieu` | Lưới tuần theo phòng/giáo viên, **chặn lưu khi trùng phòng hoặc trùng giáo viên** |
| | `/admin/diem-danh` | Tổng hợp + chi tiết từng lớp, mở khoá sửa, xuất Excel |
| | `/admin/lich-trinh` | Quản lý sự kiện toàn trung tâm theo tháng |
| Tài chính | `/admin/hoc-phi` | Khoản phải thu, công nợ, đối soát cuối ngày theo nhân viên, duyệt giảm giá/hoàn phí |
| | `/admin/bang-luong` | Sửa khi `draft`, gửi duyệt, **Chốt lương** (khoá + nhân viên thấy), xuất Excel |
| Hệ thống | `/admin/noi-dung` | Bài đăng (store thật), banner, giáo viên nổi bật, duyệt/ẩn |
| | `/admin/cai-dat` | Thông tin trung tâm, năm học, mẫu biên lai, số ngày khoá điểm danh |

> Mọi thao tác trong khu vực quản trị giữ **state cục bộ theo trang** (chưa có backend), trừ bài đăng dùng store chung với landing page.

---

## 6. Trạng thái triển khai

### Đã xong ✅

- [x] Setup Vite + React 19 + TS + Tailwind v4 + shadcn/ui (Base UI)
- [x] Design system + component UI dùng chung
- [x] Landing page 11 section + animation Framer Motion
- [x] Trang đăng nhập client / admin + đổi mật khẩu + demo role picker
- [x] `AppShell` nâng cấp: sidebar thu gọn, drawer + tab bar mobile, chuông thông báo, menu người dùng
- [x] **Khu vực học viên (7 trang)** dưới `/hoc-vien`
- [x] **Khu vực giáo viên (11 trang)** dưới `/giao-vien`, gồm điểm danh tối ưu mobile và xuất Excel
- [x] **Khu vực nhân viên (10 trang)** dưới `/nhan-vien`: tổng quan, học viên, hồ sơ, ghi danh, thu học phí, tư vấn, lịch trình, bài đăng, lương, hồ sơ cá nhân
- [x] **Khu vực quản trị (18 trang)** dưới `/admin`: bảng điều khiển Recharts, tài khoản & phân quyền, nhập Excel, quản lý học viên/giáo viên/nhân viên, khóa học/lớp/phòng/thời khóa biểu, học phí & công nợ, điểm danh, lịch trình, bảng lương, nội dung website, báo cáo, nhật ký thao tác, cài đặt

### Còn lại ❌

- [ ] Backend + thay mock data bằng API (khu vực quản trị giữ state cục bộ theo trang)
- [ ] Thay `"[TÊN TRUNG TÂM]"` trong `src/config/site.ts`, `index.html`, `README.md`
- [ ] Nhúng Google Maps thật ở section liên hệ (hiện là placeholder CSS)
- [ ] Test (chưa có test runner)

---

## 7. Quy ước cho phiên sau

1. Đọc `docs/DEV_NOTES.md` này và `README.md` trước khi code.
2. Route mới: khai báo trong `src/app/router.tsx`, thêm item vào `NAV_BY_ROLE` trong `src/layouts/client-layout.tsx` và **bỏ cờ `soon`**.
3. Trang mới trong app nên dùng `PageHeader` + `StatCard` + `Reveal`/`Stagger` để đồng nhất với khu vực học viên.
4. Dữ liệu mẫu tách riêng vào `src/data/*.ts`, không nhúng thẳng vào component.
5. Chạy `npm run lint` và `npm run build` trước khi kết thúc phiên (typecheck nhanh: `npx tsc -b`).
6. **Không dùng PowerShell `Set-Content` để sửa file có tiếng Việt** — lệnh này làm hỏng encoding UTF-8 (đã xảy ra 1 lần với `app-shell.tsx`, phải viết lại file). Dùng công cụ Edit/Write.
7. Component có state phụ thuộc tham số route (lớp/buổi/bài kiểm tra): tách component con + `key`, **không** dùng `useEffect` setState và cũng không setState trực tiếp trong render.
8. Thêm trang mới cần cập nhật cả `README.md` (bảng route) và mục trạng thái trong file này.
9. Route quản trị dùng `React.lazy` + `Suspense` trong `app/router.tsx`; thêm route mới thì khai báo lazy theo mẫu và thêm item vào `ADMIN_NAV` (`src/layouts/admin-layout.tsx`) kèm `group`.
10. Bảng trong khu vực quản trị dùng `TableToolbar` / `ToolbarSelect` / `TablePagination` / `TableEmpty` và hộp thoại phá huỷ dùng `ConfirmDialog`; xuất Excel dùng `exportAdminTable`.