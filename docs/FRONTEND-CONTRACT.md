# Hợp đồng dữ liệu frontend ↔ backend

> **Phase 1 — KIỂM KÊ.** Đọc toàn bộ `frontend/` và lập hợp đồng dữ liệu. Không sửa file nào trong `frontend/`.
> Nguồn: mã nguồn `frontend/src/` (route, menu, kiểu dữ liệu trong `src/data/`, hàm tính toán trong từng page) và
> đặc tả `docs/spec/quan-ly-trung-tam-ngoai-ngu.md` + `docs/spec/thiet-ke-database-day-du.md`.
> Cập nhật: 2026-10-04.

Cấu trúc tài liệu:

| Phần | Nội dung |
|---|---|
| **A** | Nguyên tắc chung khi nối API |
| **B** | Bảng thực thể: trường giao diện dùng ↔ bảng/cột trong DB, đánh dấu thiếu/thừa |
| **C** | Hợp đồng từng màn hình (46 màn + landing), theo 5 khu vực |
| **D** | Chức năng có trong đặc tả nhưng **chưa có** trên giao diện |
| **E** | Chức năng có trên giao diện nhưng đặc tả **chưa nói** rõ |
| **F** | Rủi ro cần dọn khi nối |

---

## A. Nguyên tắc

1. **Tên trường JSON phải giữ nguyên** như biến trong `frontend/src/data/*.ts` để phase NỐI gần như không phải ánh xạ
   (`fullName`, `studentCode`, `dueDate`, `receiptNo`…). Ngoại lệ: **trạng thái** và **ngày giờ** phải đổi sang mã
   tiếng Anh và ISO 8601 (xem D-009, D-010, D-011 và các rủi ro F2, F3).
2. **Tiền**: số nguyên VND (`number` trong TS ↔ `bigint`/`Int` trong DB). Frontend đã có `formatVnd` = `Intl.NumberFormat("vi-VN", {currency:"VND"})`
   nên API trả số thô, không trả chuỗi định dạng sẵn.
3. **Thời gian**: DB lưu `timestamptz` (UTC). API trả ISO 8601 (`2026-10-02T03:00:00Z`). Frontend đang nhận `Date` lẫn chuỗi
   `dd/MM/yyyy` tuỳ file dữ liệu → xem F3.
4. **Phân trang**: mọi danh sách trả `{ items, page, pageSize, total, totalPages }` (mặc định 20, tối đa 100), sắp xếp ổn định có tiebreaker.
   Frontend hiện phân trang **client-side** với `PAGE_SIZE = 10` ở các màn admin → chuyển sang server-side ở Mốc 2/3.
5. **Mọi số liệu tổng hợp giao diện đang tự tính** (công nợ, tiến độ 64 buổi, tỷ lệ điểm danh, điểm TB, tổng lương) →
   backend phải **tính và trả** (mục C.0 liệt kê đúng công thức), không bắt client tự tính lại từ danh sách thô.
6. **Trạng thái**: API trả **mã tiếng Anh** (`"present"`, `"paid"`, `"active"`); nhãn tiếng Việt và màu badge là việc của frontend
   qua bảng `*_META` đã có sẵn. Các trường mà giao diện đang hiển thị **nguyên văn chuỗi tiếng Việt** (xem F2) phải chuyển sang mã.
7. **Phân quyền**: kiểm tra ở backend cho cả vai trò lẫn phạm vi dữ liệu. Xem `docs/PERMISSIONS.md`.
8. Component không gọi `fetch` trực tiếp; tạo hook trong `src/api/<module>.ts` ở các phase NỐI.

---

## B. Bảng thực thể: giao diện dùng ↔ database

Ký hiệu mức ưu tiên trong cột "DB" lấy từ `thiet-ke-database-day-du.md` (`P1` = MVP, `P2` = giai đoạn 2, `P3` = tương lai).

### B1. Bảng thực thể và ánh xạ

| # | Thực thể giao diện | Nguồn giả | Bảng DB | Cột DB dùng | Trạng thái |
|---|---|---|---|---|---|
| 1 | `AuthUser` | `lib/auth/types.ts` | `users` + `roles`/`user_roles` | `id, username, email, phone, status, must_change_password, last_login_at, avatar_file_id` | Khớp (role qua `user_roles`) |
| 2 | `StudentProfile` | `data/student.ts` | `students` | `full_name, birth_date, gender, phone, email, address, student_code, identity_no?, occupation?, level?, status` | **Thiếu cột**: `identityNo`, `occupation` |
| 3 | `Guardian` / `GuardianInfo` | `data/student.ts`, `data/staff.ts` | `guardians` + `student_guardians` | `full_name, relation, phone, email, occupation, address, is_primary` | Khớp |
| 4 | `TeacherProfile` | `data/teacher.ts` | `teachers` | `full_name, phone, email, specialty, certificate, experience?, education?, bio, photo_file_id, start_date?, status` | **Thiếu cột**: `experience`, `education`, `start_date` |
| 5 | `StaffProfile` | `data/staff.ts` | `staff` | `full_name, phone, email, position, department?, education?, bio?, start_date, photo_file_id` | **Thiếu cột**: `department`, `education`, `bio` |
| 6 | `StaffMember` (đội nhân viên) | `data/staff.ts` | `staff` | `id, full_name, position (hiện là `role`), phone, photo_file_id` | Khớp (tên cột lệch) |
| 7 | `AdminAccount` | `data/admin.ts` | `users` | `id, username, full_name, email, phone, role, status, last_login_at, created_at, deleted_at` | Khớp |
| 8 | `ManagedPerson` (HV/GV/NV trong admin) | `data/admin.ts` | `students` / `teachers` / `staff` | `code (student_code/teacher_code/staff_code), full_name, email, phone, group (level/course/specialty), status, joined_at (start_date), deleted_at` | Khớp, cần view hợp nhất |
| 9 | `Course` (landing) | `data/landing.ts` | `courses` | `id→code, name, level, audience?, lessons→total_sessions, months→duration_months, perWeek→sessions_per_week, tuition→list_price, schedule?, highlights?, featured?, levelTone?` | **Thiếu cột**: `audience`, `highlights`, `schedule`, `featured`, `levelTone` (xem E1) |
| 10 | `AdminCourse` | `data/admin.ts` | `courses` | `id, name, level, lessons→total_sessions, tuition→list_price, enrolled (tính), target (chưa có cột), status, updated_at` | **Thiếu cột**: `target` (chỉ tiêu sĩ số) |
| 11 | `TeacherClass` / `CenterClass` | `data/teacher.ts`, `data/staff.ts` | `classes` | `id, name, class_code→code, course_id(+name), level, room_id(+name), teacher_id(+name), weekdays (qua `class_schedules`), time, max_students, start_date, expected_end_date→end_date, status, student_count (tính), done_lessons (tính), total_lessons (tính/copy), staff_id→advisor` | Khớp, `tone` là frontend tự tính |
| 12 | `ClassLesson` | `data/teacher.ts` | `class_sessions` | `id, class_id, lesson_no→no, date, time, topic/unit (chưa có cột), marked (tính), locked_at, note (chưa có cột), marks (qua `attendance`)` | **Thiếu cột**: `topic`, `unit`, `note` (xem E2) |
| 13 | `TeacherStudent` | `data/teacher.ts` | `students` + `enrollments` | `student_code, full_name, birth_date, gender, phone, email, address, guardian_*, enrolled_date→enrollments.start_date, attendance_rate (tính), average_score (tính)` | Khớp (2 số liệu tính ra) |
| 14 | `StaffStudent` | `data/staff.ts` | `students` + `enrollments` + view | như trên + `class_id, staff_id→advisor_id, tuition.*, attendance.*, notes[] (chưa có bảng)` | **Thiếu bảng**: ghi chú chăm sóc (xem E3) |
| 15 | `AttendanceSummary` | `data/admin.ts` | `class_sessions` + `attendance` (view) | `class_id, class_name, teacher_name, room, weekday, time, total, present, late, absent, excused, locked, last_lesson_no, date` | Cần **view** tổng hợp |
| 16 | `TeacherTest` | `data/teacher.ts` | `assessments` (P2) + `scores` (P2) | `class_id, name, kind (loại), date, max_score, scores{student_id→điểm}` | Khớp (P2) |
| 17 | `ScoreRow` | `data/student.ts` | `assessments` + `scores` + `settings` | `name, kind, date, listening/reading/writing/speaking, average (tính), comment` | **Thiếu cột**: 4 kỹ năng, `comment` (chỉ có `student_feedback`) (xem E4) |
| 18 | `Assignment` / `TeacherAssignment` | `data/student.ts`, `data/teacher.ts` | `assignments` (P2) | `class_id, title, description, deadline→due_at, created_at, created_by, status, submitted_at` | **Thiếu**: `status`/`submitted_at` (chỉ có `assignment_submissions` P3) |
| 19 | `Announcement` | `data/student.ts` | `announcements` (P2) | `title, body→content, date, author→created_by, tone` | **Thiếu cột**: `tone`; chưa có màn riêng (xem D) |
| 20 | `Payment` / `CenterPayment` | `data/student.ts`, `data/staff.ts` | `payments` | `student_id, paid_at→date, amount, method, receipt_no, note, collected_by→collectorId, invoice→forInvoice` | Khớp; `method` là chuỗi VN (F2) |
| 21 | `AdminInvoice` | `data/admin.ts` | `invoices` + `invoice_items` (P2) | `invoice_no→code, student_id, student_name, class_name, due_date, total, paid (tính), status, kind (loại khoản thu)` | Khớp; `kind` cần `invoice_items.type` |
| 22 | `CashClose` | `data/admin.ts` | `daily_cash_closings` (P2) | `staff_id, staff_name, date, shift (chưa có), total_collected, cash_on_hand, bank_transfer, status, note` | **Thiếu cột**: `shift`, `bank_transfer` |
| 23 | `DiscountRequest` | `data/admin.ts` | `discounts`/`invoice_discounts` (P2) + `refunds` (P2) | `student_name, class_name, kind (giảm giá/hoàn phí), reason, amount, requested_by, requested_at, status, approved_by` | Khớp qua 2 bảng |
| 24 | `PayrollRow` (GV) | `data/teacher.ts` | `payroll_periods` + `payroll_items` + `pay_rates` (P2) | `month, key(YYYY-MM), status, lesson_rate, bonus_per_lesson, breakdown[{class_id,class_name,lessons}], adjustments[{label,amount}], totals` | Khớp (P2) |
| 25 | `StaffPayrollRow` | `data/staff.ts` | `payroll_periods` + `payroll_items` | `month, key, status, base_salary, items[{label,amount,hint}]` | Khớp (P2) |
| 26 | `AdminPayrollRow` | `data/admin.ts` | `payroll_periods` + `payroll_items` | `month, staff_id, staff_name, role, base, bonus, deduction, status, locked, note` | Khớp (P2) |
| 27 | `TeacherEvent` / `CenterEvent` / `CalendarEvent` | `data/teacher.ts`, `data/staff.ts`, `data/student.ts` | `events` + `event_types` + `event_audiences` | `title, event_type_id, starts_at/ends_at, all_day, location, description, created_by, deleted_at`, đối tượng nhận | Khớp; `own` là cờ frontend |
| 28 | `TimetableEntry` / `TimetableConflict` | `data/admin.ts` | `class_schedules` (+ `slots` danh mục) | `class_id, room_id, teacher_id, weekday, slot (start/end)` | Khớp; cần `time_slots` |
| 29 | `AdminRoom` | `data/admin.ts` | `rooms` | `id, name, capacity, floor (chưa có), equipment (chưa có), status` | **Thiếu cột**: `floor`, `equipment` |
| 30 | `Lead` / `LeadNote` | `data/staff.ts` | `leads` + `lead_sources` + `lead_activities` (P2) | `full_name, phone, email, age (chưa có), source, course_id→interested_class_id, assigned_to→owner_id, created_at, expected_fee, status→stage, next_follow_up, notes[]` | **Thiếu cột**: `age`, `expected_fee`, `next_follow_up` |
| 31 | `Post` | `data/posts.ts` | `posts` + `post_categories` | `title, excerpt→summary, content, cover→cover_file_id, category, date→published_at, facebook_url, status, author→author_id` | Khớp; cần trạng thái "chờ duyệt" |
| 32 | `LandingBanner` / `LandingTeacher` | `data/admin.ts` | `site_banners` / `teachers.show_on_website` | `title, subtitle, cta, image, status, updated_at` | **Thiếu cột**: `subtitle`, `cta` |
| 33 | `CenterSettings` | `data/admin.ts` | `settings` (key/value jsonb) | 14 khoá: `name, address, phone, email, tax_code, academic_year, academic_start, academic_end, attendance_lock_days, receipt_header, receipt_footer, allow_self_enroll, require_password_change, notify_parent_on_payment` | Khớp (dạng key/value) |
| 34 | `AuditLog` | `data/admin.ts` | `audit_logs` | `id, time→created_at, actor→user_id, actor_role, action, module→table_name, detail, ip` | Khớp |
| 35 | `TodayLesson` | `data/admin.ts` | `class_sessions` (view) | `class_id, class_name, room, time, slot_id, teacher_name, student_count, status, attendance_done` | Cần view |
| 36 | `StaffTask` (việc cần làm) | `data/staff.ts` | **chưa có bảng** | — | Chỉ ghi chú cá nhân, không cần DB (E5) |
| 37 | `Testimonial`, `Feature`, `Stat`, `LEARNING_PATH`, `ABOUT_VALUES` | `data/landing.ts` | `testimonials` (P2), `site_contents` (P2) | `name, role, quote, rating, avatar` | P2; `Feature`/`Stat` xem E6 |
| 38 | `AppNotification` | `data/notifications.ts` | `notifications` (P2) | `title, description, time, tone, unread, href` | Có bảng P2, **chưa có màn** (xem D) |

### B2. Trường GIAO DIỆN CẦN nhưng DB CHƯA CÓ — đề xuất xử lý

| # | Trường cần | Màn hình dùng | Đề xuất | Ảnh hưởng nghiệp vụ |
|---|---|---|---|---|
| 1 | `students.identity_no` | Hồ sơ HV (cả 3 vai trò) | **Thêm cột** `identity_no` vào `students` | Có — dữ liệu cá nhân nhạy cảm, phải giới hạn quyền đọc và không ghi log |
| 2 | `students.occupation`, `students.notes` | Hồ sơ HV, form ghi danh | **Thêm cột** `occupation`, `notes` | Không |
| 3 | `teachers.experience`, `teachers.education`, `teachers.start_date` | Hồ sơ GV, landing | **Thêm cột**; `certificate` đã có | Không |
| 4 | `staff.department`, `staff.education`, `staff.bio` | Hồ sơ NV | **Thêm cột** | Không |
| 5 | `courses.target_students` (chỉ tiêu sĩ số) | Admin > Khóa học | **Thêm cột** `target_students` | Có — dùng cho báo cáo "tỷ lệ lấp đầy" |
| 6 | `rooms.floor`, `rooms.equipment` | Admin > Phòng học | **Thêm cột** `floor int`, `equipment text[]` hoặc bảng `room_equipment` | Không |
| 7 | `class_sessions.topic`, `.unit`, `.note` | GV > Lớp, GV > Điểm danh, GV > Hồ sơ HV | **Thêm cột** `lesson_no` đã có; `topic`/`unit` nên lấy từ `course_lessons` (P2) nếu giáo trình có thật, nếu không thì **thêm cột `topic`** | Có — quyết định có xây bảng `course_lessons` hay không |
| 8 | `attendance.note` theo buổi (ghi chú chung của buổi) | GV > Điểm danh (`textarea` "Ghi chú") | **Thêm cột** `note` vào `class_sessions` | Có — ghi chú được in ra bảng điểm danh và gửi phòng Hành chính |
| 9 | `leads.age`, `leads.expected_fee`, `leads.next_follow_up` | NV > Khách tiềm năng | **Thêm cột** (3 cột đều có trong giao diện) | Có — `next_follow_up` dùng cảnh báo quá hạn; `expected_fee` dùng thống kê giá trị |
| 10 | `daily_cash_closings.shift`, `.bank_transfer` | Admin > Học phí > Đối soát | **Thêm cột**; `total_collected`/`cash_on_hand` đã có | Có — ảnh hưởng công thức chênh lệch |
| 11 | Bảng ghi chú chăm sóc học viên (`CareNote`) | NV > Hồ sơ HV (tab "Ghi chú") | **Thêm bảng** `student_notes` (P2): `student_id, title, body, tone, author_id, created_at` | Có — nội dung chăm sóc cần lưu lâu dài và ghi ai viết |
| 12 | `settings.academic_year` dùng làm mặc định mọi màn | Mọi nơi chọn kỳ | Đã có trong `settings` | Không |
| 13 | Cột "còn nợ / tỷ lệ / tiến độ" | Học phí, lớp, điểm danh, hồ sơ | **Không lưu** — tính bằng `VIEW` (đúng nguyên tắc §8 của AGENTS.md và mục 3.6 của đặc tả) | Có — phải thống nhất công thức giữa backend và `BUSINESS-RULES.md` |
| 14 | Bảng `time_slots` (Ca 1..Ca 8) | Admin > Thời khóa biểu | **Thêm bảng** `time_slots` P1: `code, label, start_time, end_time, sort_order` | Có — Ca 7 và Ca 8 hiện **chồng nhau** (19:00–20:30 và 19:45–21:15), phải rà lại khi nhập liệu thật |

### B3. Cột DB có nhưng giao diện chưa dùng

| Bảng / cột | Giao diện chưa dùng ở đâu | Đề xuất |
|---|---|---|
| `users.failed_login_count`, `locked_until` | Không có màn hiển thị | Dùng ở **Admin > Tài khoản** (cột "đăng nhập sai N lần") hoặc bỏ dùng khỏi UI |
| `users.avatar_file_id` | Chỉ dùng ảnh Unsplash giả | Màn Hồ sơ (đã có `avatar` sẵn) |
| `audit_logs.old_data`, `new_data` | Màn Nhật ký chỉ hiện `detail` dạng chữ | Mở rộng modal chi tiết ở Mốc 5 (không bắt buộc) |
| `payments.reference_code` (mã giao dịch ngân hàng) | Form thu tiền không có ô này | Thêm vào form thu khi phương thức = chuyển khoản (Mốc 3) |
| `invoices.discount_amount` | Wizard ghi danh có ô giảm giá nhưng ghi thẳng vào tổng | Dùng `discount_amount` + `discounts`/`invoice_discounts` |
| `enrollments.status` (bảo lưu/nghỉ/chuyển lớp) | UI chỉ có trạng thái ở cấp **học viên** (`active/paused/finished/dropped`) | Cần chốt: trạng thái ghi danh và trạng thái học viên là hai thứ khác nhau (xem câu hỏi Q3) |
| `class_sessions.status` (đã lên lịch/đã dạy/hủy/dạy bù) | UI chỉ có `marked` boolean | Suy ra từ `attendance` + ngày; **hoặc** bổ sung trạng thái để hỗ trợ "hủy buổi" (chưa có màn) |
| `branches.*`, `branch_id` | Toàn hệ thống giả định **1 cơ sở** | Giữ cột nhưng tạo sẵn 1 dòng; UI chưa cần chọn cơ sở |
| `settings.*` 3 khoá `allowSelfEnroll`, `requirePasswordChange`, `notifyParentOnPayment` | Cài đặt có hiển thị nhưng **không có màn nào dùng** | Xem D (chức năng có trong UI nhưng chưa dùng) |
| `sequences` | Số biên lai, mã học viên đang sinh ở client (`PT-2610-NNNN`, `HV2026-MOI`) | Backend phải sinh (`sequences`), client không tự sinh |
| `files`, `checksum`, `mime_type` | Ảnh đang là URL Unsplash | Khi có upload thật: `files` + `avatar_file_id`/`cover_file_id` |
| `sensitive_access_logs` | Không có màn xem | Không cần UI; chỉ ghi log ở backend |
| `row_version` | Không dùng | Có thể bỏ ở giai đoạn đầu để đỡ phức tạp (Q7) |

---

## C. Hợp đồng từng màn hình

### C.0. Số liệu tổng hợp mà backend phải tính và trả

Giao diện đang tự tính trong `src/data/*.ts`. Backend phải trả sẵn để các màn không phải tính lại:

| Số liệu | Hàm giả hiện tại | Công thức / nguồn |
|---|---|---|
| Tổng học phí | `TUITION_TOTAL` | Tổng học phí đã chốt theo lớp (`invoices.total` hoặc hợp đồng ghi danh) |
| Đã đóng / còn nợ | `TUITION`, màn Học phí | `sum(payments.amount)` và `total − sum(payments.amount)` |
| Tiến độ học | `Lesson.progress` (dựng trong `buildLessons`) | `số buổi đã điểm danh / total_sessions` |
| Điểm danh | `ATTENDANCE_STATS` | đếm theo `attendance.status` (`present|late|absent|excused`), tỷ lệ = `(present+late)/tổng buổi đã diễn ra` |
| Điểm trung bình | `SCORE_AVERAGE` | trung bình `average` của các bài đã có điểm |
| Tỷ lệ điểm danh HV | `TeacherStudent.attendance_rate` | `(present+late)/số buổi đã diễn ra` |
| Còn nợ toàn trung tâm | `debtTotal()` | `sum(invoices.total) − sum(payments.amount)` theo học viên |
| Tuổi hóa công nợ | `DEBT_AGING` | nhóm theo `due_date`: `<0`, `1–30`, `31–60`, `>60` ngày |
| Tiến độ lớp | `TeacherClass.done_lessons` | đếm `class_sessions` đã đánh dấu |
| Tỷ lệ lấp đầy lớp | `tỷ lệ enrolled/max_students` | `count(enrollments active)/max_students` |
| Tổng lương GV/NV | `payrollTotals()`, `staffPayrollTotal()` | `base + Σ lessons×(lesson_rate+bonus) + adjustments` |
| Phễu khách tiềm năng | `FUNNEL_SERIES`, `leadConversionRate()` | nhóm `leads.stage` |
| Biểu đồ doanh thu / ghi danh / sĩ số / nguồn | `REVENUE_SERIES`, `ENROLLMENT_SERIES`, `CLASS_SIZE_SERIES`, `SOURCE_SERIES` | tổng hợp theo tháng từ `payments`, `enrollments`, `classes`, `leads` |

### C.1. Khu vực công khai và xác thực

#### C.1.1. `/` — Trang giới thiệu (landing)

| | |
|---|---|
| **Vai trò** | Công khai, không cần đăng nhập |
| **File** | `src/pages/public/landing-page.tsx` + `src/features/landing/sections/*.tsx` |
| **Bố cục** | `HeroSection` → `StatsSection` → `CoursesSection` → `LearningTimeline` → `TeachersSection` → `AboutSection` → `FeaturesSection` → `GallerySection` → `NewsSection` → `TestimonialsSection` → `ConsultationSection` → `ContactSection` → `SiteFooter`, `FloatingContact` |

**Dữ liệu hiển thị**

| Trường | Kiểu | Bắt buộc | Định dạng / nguồn |
|---|---|---|---|
| `SITE.name`, `SITE.tagline`, `SITE.phone`, `SITE.email`, `SITE.address`, `SITE.hours`, `SITE.mapEmbedUrl` | string | Có | `src/config/site.ts` → **Cấu hình tĩnh, không cần API** |
| `NAV_LINKS` | `{label, href}[]` | Có | `src/config/site.ts` |
| `HERO_IMAGE` | string (URL) | Có | `lib/images.ts: unsplash()` → `GET /api/public/site/banner` |
| `STATS[]` | `{label, value:number, suffix:string}` | Có | `data/landing.ts` → `GET /api/public/stats` |
| `COURSES[]` | `Course{id,name,level,audience,lessons,months,perWeek,tuition,schedule,highlights,featured,levelTone}` | Có | `data/landing.ts` → `GET /api/public/courses` |
| `LEARNING_PATH[]` | `{no,title,desc}` | Có | `data/landing.ts` → nội dung tĩnh `site_contents` (P2) |
| `TEACHERS[]` | `{name,specialty,certificate,experience,photo}` | Có | `data/landing.ts` → `GET /api/public/teachers` (`teachers.show_on_website = true`) |
| `FEATURES[]` | `{title,desc,icon,color}` | Có | `data/landing.ts` → nội dung tĩnh `site_contents` (P2) |
| `TESTIMONIALS[]` | `{name,role,quote,rating,avatar}` | Có | `data/landing.ts` → `GET /api/public/testimonials` (`testimonials`, P2) |
| `GALLERY[]` | URL ảnh | Có | `data/landing.ts` → `files`/`site_contents` (P2) |
| `ABOUT_VALUES[]` | `{title,desc}` | Có | `data/landing.ts` → `site_contents` (P2) |
| `ABOUT_PHOTOS[]` | URL ảnh | Có | `data/landing.ts` |
| `LANDING_FOOTER` / liên hệ | string | Có | `settings` + `SITE` |
| **Form tư vấn** | `{fullName, phone, email, courseId, note}` | `fullName`,`phone` bắt buộc | `consultation-section.tsx` |

**Lọc / sắp xếp / phân trang:** `CoursesSection` có bộ lọc theo `level` (client-side); không phân trang. `NewsSection` dùng `getPublishedPosts()`.

**Hành động → endpoint**

| Hành động | Endpoint đề xuất | Ghi chú |
|---|---|---|
| Gửi yêu cầu tư vấn | `POST /api/public/consultations` | Chống spam bằng rate limit; không yêu cầu đăng nhập |
| Nút "Đăng ký tư vấn" / "Học thử" | `navigate("/dang-nhap")` | Không có API |
| Xem khoá học | `GET /api/public/courses?level=` | Chỉ trả `status=published` |
| Đọc tin tức | `GET /api/public/posts?status=published` | `getPublishedPosts()` |
| Liên hệ/Zalo/FB/YT/TikTok | Link ngoài | Không API |

#### C.1.2. `/dang-nhap` — Đăng nhập khu vực học viên / giáo viên / nhân viên

| | |
|---|---|
| **Vai trò** | Công khai; sau khi đăng nhập vào `student` \| `teacher` \| `staff` |
| **File** | `src/pages/auth/login-page.tsx`, `src/features/auth/use-login-form.ts`, `demo-role-picker.tsx`, `password-input.tsx`, `forgot-password-modal.tsx` |
| **Mock** | `lib/auth/mock-accounts.ts: MOCK_ACCOUNTS`, `demoUserFor(role, firstLogin)` |

**Dữ liệu gửi lên**

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `username` | string | Có | Không phân biệt hoa thường |
| `password` | string | Có | |
| `audience` | `"client"` | Có (do trang đặt cứng) | Backend **không tin** giá trị này để cấp quyền |

**Phản hồi**

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `data.user` | `AuthUser{id,fullName,role,email,phone,avatar,mustChangePassword,branchId?}` | Có | `role` là **mã**, không phải nhãn tiếng Việt |
| `data.accessToken` | string | Có | Chỉ dùng nội bộ; gửi qua cookie `httpOnly` |
| HTTP | 401 khi sai, 423 khi khoá | | `error.code = INVALID_CREDENTIALS` / `ACCOUNT_LOCKED` |

**Hành động → endpoint**

| Hành động | Endpoint đề xuất |
|---|---|
| Đăng nhập | `POST /api/auth/login` → set cookie `access_token` + `refresh_token` |
| Chọn vai trò demo | Không có endpoint — **chỉ dùng ở mock**, xem F1 |
| Bấm link khoá tài khoản | `POST /api/auth/request-unlock` (rate limit, không tiết lộ tài khoản tồn tại) |
| Gửi lại mật khẩu | `POST /api/auth/forgot-password` (chỉ trả thông báo chung) |
| Sau đăng nhập, `mustChangePassword = true` | Chuyển `navigate("/doi-mat-khau")` |

**Lọc / sắp xếp / phân trang:** không có.

#### C.1.3. `/admin/dang-nhap` — Đăng nhập khu vực quản trị

Giống C.1.2 nhưng: **File** `src/pages/auth/admin-login-page.tsx`; giao diện tối, tách riêng; sau đăng nhập chỉ nhận `role = "admin"`, nếu không thì trả `403 FORBIDDEN`. Nên hợp nhất endpoint `POST /api/auth/login` với tham số `scope=client|admin` để backend tự kiểm tra.

#### C.1.4. `/doi-mat-khau` — Đổi mật khẩu

| | |
|---|---|
| **Vai trò** | Đã đăng nhập (bất kỳ vai trò nào) hoặc có `mustChangePassword` |
| **File** | `src/pages/auth/change-password-page.tsx` |

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `currentPassword` | string | Có | |
| `newPassword` | string | Có | ≥ 8 ký tự, có chữ + số |
| `confirmPassword` | string | Có | phải khớp `newPassword` |

**Hành động:** `POST /api/auth/change-password` → xoá `must_change_password`, thu hồi các phiên cũ, `audit_logs` (`action=update`, `module=users`).

#### C.1.5. `*` — Không tìm thấy trang

**File** `src/pages/public/not-found-page.tsx`. Tĩnh, không gọi API. Chỉ nên hiện cho người chưa đăng nhập; người đã đăng nhập nên được chuyển về trang chủ vai trò.

### C.2. Khu vực học viên — 7 màn

Tất cả dùng `ClientLayout` + `AppShell` (menu, tìm kiếm toàn cục, chuông thông báo `NOTIFICATIONS_BY_ROLE`). Đều là dữ liệu **của chính học viên đang đăng nhập** — backend lấy `userId` từ token, không nhận từ client.

#### C.2.1. `/hoc-vien` — Tổng quan

| | |
|---|---|
| **Vai trò** | `student` |
| **File** | `src/pages/client/student/student-overview-page.tsx` |
| **Nguồn giả** | `STUDENT_PROFILE`, `ENROLLMENT`, `UPCOMING_LESSONS`, `ATTENDANCE_STATS`, `SCORES`, `SCORE_AVERAGE`, `ASSIGNMENTS`, `ANNOUNCEMENTS`, `PAYMENTS`, `TUITION`, `CALENDAR_EVENTS` |

| Trường hiển thị | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| `fullName`, `studentCode`, `phone`, `email`, `address` | string | Có | `GET /api/me` |
| `avatar` | URL | Không | `users.avatar_file_id` |
| Tên lớp + `courseName` + `level` | string | Có | `GET /api/me/enrollments` |
| `startDate`, `expectedEndDate` | date | Có | `enrollments.start_date`, `classes.end_date` |
| Tiến độ `done/total` buổi | `{done:number,total:number,pct:number}` | Có | `GET /api/me/progress` |
| `attendance.rate`, `present`, `absent`, `late` | number | Có | `GET /api/me/attendance-summary` |
| 4 lớp buổi sắp tới (`UPCOMING_LESSONS`, giới hạn 4) | `Lesson[]` | Có | `GET /api/me/lessons?upcoming=true&pageSize=4` |
| Bài tập sắp đến hạn | `Assignment[]` | Có | `GET /api/me/assignments?status=due` |
| `SCORE_AVERAGE` | number (1 chữ số) | Có | `GET /api/me/scores/summary` |
| `TUITION_TOTAL`, `TUITION.paid`, `TUITION.remaining` | number (VND) | Có | `GET /api/me/tuition` |
| Thông báo mới (`ANNOUNCEMENTS`) | `Announcement[]` | Có | `GET /api/me/announcements` |
| Lịch sự kiện tháng này (`CALENDAR_EVENTS`) | `CalendarEvent[]` | Không | `GET /api/me/events` |

**Hành động:** `Xem tất cả bài tập` → `/hoc-vien/bai-tap`; `Xem học phí` → `/hoc-vien/hoc-phi`; `Nộp bài` → `POST /api/me/assignments/:id/submissions` (P3). Không có nút sửa dữ liệu.

**Lọc / sắp xếp / phân trang:** không có danh sách phân trang; danh sách giới hạn sẵn (`slice(0,4)`, `.slice(0,3)`).

#### C.2.2. `/hoc-vien/lich-trinh` — Lịch học

| | |
|---|---|
| **File** | `src/pages/client/student/student-schedule-page.tsx` |
| **Nguồn giả** | `LESSONS` (64 buổi, `buildLessons()`), `ENROLLMENT`, `EVENT_META`, `CALENDAR_EVENTS` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| `Lesson{no,date,time,topic,unit,status,progress}` | object | Có | `GET /api/me/lessons?page&pageSize&from&to` |
| `status` | `"present"\|"absent"\|"late"\|"excused"\|"upcoming"` | Có | `ATTENDANCE_META` |
| `progress` | string (`"Buổi 12/64"` hoặc `%`) | Có | tính ở backend |
| `topic`, `unit` | string | Có | `class_sessions.topic/unit` — xem B2 #7 |
| Sự kiện lẫn vào lịch | `CalendarEvent[]` | Không | `GET /api/me/events` |

**Lọc:** theo tháng/tuần và theo trạng thái (`Tất cả / Đã học / Sắp tới`). **Phân trang:** theo tháng, không phải trang. **Hành động:** `Đăng ký tham dự`/`Hủy` — hiện UI có nút nhưng **không có API và chưa có cột trong DB** → xem D/E.

#### C.2.3. `/hoc-vien/thoi-gian-hoc` — Thời gian học (điểm danh)

| | |
|---|---|
| **File** | `src/pages/client/student/student-attendance-page.tsx` |
| **Nguồn giả** | `ATTENDANCE_STATS`, `ATTENDANCE_META`, `LESSONS` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| 4 thẻ: tổng buổi, có mặt, vắng, trễ | number | Có | `GET /api/me/attendance-summary` |
| `rate` | number 0–100 | Có | tính ở backend |
| Bảng theo buổi: `no, date, status, topic` | object[] | Có | `GET /api/me/attendance?page&pageSize&status` |

**Lọc:** trạng thái, tháng. **Phân trang:** `PAGE_SIZE` nhỏ, có `TablePagination` dùng chung. **Hành động:** chỉ xem; có nút `Khiếu nại vắng` nếu tồn tại → `POST /api/me/attendance/:sessionId/appeal` (chưa có bảng, xem D).

#### C.2.4. `/hoc-vien/bang-diem` — Kết quả học tập

| | |
|---|---|
| **File** | `src/pages/client/student/student-grades-page.tsx` |
| **Nguồn giả** | `SCORES`, `SCORE_KIND_META`, `SCORE_AVERAGE` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| `ScoreRow{name,kind,date,listening,reading,writing,speaking,average,comment}` | object[] | Có | `GET /api/me/scores?kind&page` |
| `kind` | `"unit"\|"mid"\|"final"` | Có | `assessments.kind` |
| 4 cột kỹ năng | number \| null | Có (cột cần) | **DB chưa có 4 cột này** → B2/E4 |
| `average` | number 1 chữ số | Có | tính ở backend |
| `comment` | string | Không | **DB chưa có** → E4 |
| Điểm trung bình tổng | number | Có | `GET /api/me/scores/summary` |

**Lọc:** loại bài (`unit/mid/final`), khoảng thời gian. **Hành động:** không có nút ghi; giáo viên nhập điểm ở Mốc 4.

#### C.2.5. `/hoc-vien/bai-tap` — Bài tập

| | |
|---|---|
| **File** | `src/pages/client/student/student-assignments-page.tsx` |
| **Nguồn giả** | `ASSIGNMENTS`, `ASSIGNMENT_META` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| `Assignment{title,description,dueAt,status,className}` | object[] | Có | `GET /api/me/assignments?status&page` |
| `status` | `"submitted"\|"due"\|"late"\|"overdue"` | Có | `assignments` + `assignment_submissions` (P3) |
| `dueAt` | datetime | Có | `assignments.due_at` |

**Lọc:** trạng thái, lớp. **Hành động:** `Nộp bài` → `POST /api/me/assignments/:id/submissions` (P3); `Tải đề` → `GET /api/assignments/:id/files`. Hiện UI **chưa có** màn xem chi tiết/nộp thật → D.

#### C.2.6. `/hoc-vien/hoc-phi` — Học phí

| | |
|---|---|
| **File** | `src/pages/client/student/student-tuition-page.tsx` |
| **Nguồn giả** | `TUITION`, `TUITION_TOTAL`, `PAYMENTS`, `TUITION_METHOD_META`, `ENROLLMENT` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| `TUITION.total` | number VND | Có | `GET /api/me/tuition` |
| `TUITION.paid`, `TUITION.remaining` | number VND | Có | tính từ `payments` |
| `ENROLLMENT.courseName`, `className`, `lessons`, `perWeek` | string/number | Có | `enrollments` + `classes` |
| `Payment{date,amount,method,receiptNo,note}` | object[] | Có | `GET /api/me/payments?page` |
| `method` | `"Tiền mặt"\|"Chuyển khoản"\|"Thẻ ATM"\|"Ví điện tử"` | Có | `payments.method` — **đang là chuỗi tiếng Việt**, xem F2 |

**Lọc:** khoảng thời gian. **Hành động:** `Tải phiếu thu` → `GET /api/me/payments/:id/receipt` (PDF); `Thanh toán online` → `POST /api/payments/checkout` (**chưa có màn, xem D**).

#### C.2.7. `/hoc-vien/thong-tin-ca-nhan` — Thông tin cá nhân

| | |
|---|---|
| **File** | `src/pages/client/student/student-profile-page.tsx` |
| **Nguồn giả** | `STUDENT_PROFILE`, `GUARDIAN`, `ENROLLMENT` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| `fullName`, `birthDate`, `gender`, `phone`, `email`, `address` | string/date | Có (đọc) | `GET /api/me` |
| `studentCode` | string | Có, chỉ đọc | `students.student_code` |
| `identityNo` | string | Có (hiển thị) | **DB chưa có** → B2 #1 |
| `occupation`, `level` | string | Không | `students.occupation` chưa có |
| `GUARDIAN{fullName,relation,phone,email,occupation,address}` | object | Có | `guardians` + `student_guardians` |
| Lớp đang học | object | Có | `enrollments` |

**Hành động:** `Chỉnh sửa hồ sơ` → `PATCH /api/me` (chỉ cho sửa `phone,email,address,occupation`; **không cho tự sửa** `fullName, birthDate, identityNo` → phải qua `profile_change_requests` để nhân viên duyệt, xem D). `Đổi mật khẩu` → `/doi-mat-khau`.

---

### C.3. Khu vực giáo viên — 11 màn

Phạm vi dữ liệu: giáo viên chỉ thấy **lớp của mình** (`classes.teacher_id = user.teacher_id`) và học viên trong các lớp đó — kiểm tra ở backend, không dựa vào việc ẩn menu.

#### C.3.1. `/giao-vien` — Tổng quan

| | |
|---|---|
| **File** | `src/pages/client/teacher/teacher-overview-page.tsx` |
| **Nguồn giả** | `TODAY`, `TEACHER_PROFILE`, `CLASSES`, `CLASS_META`, `todayLessonOfClass()`, `CENTER_EVENTS`, `OWN_EVENTS`, `PAYROLL` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| `TEACHER_PROFILE{fullName,specialty,certificate,experience,education,phone,email,bio,photo,startDate}` | object | Có | `GET /api/me` (`experience/education/start_date` chưa có cột → B2 #3) |
| Số lớp đang phụ trách, tổng học viên | number | Có | `GET /api/me/summary` |
| Buổi dạy hôm nay (theo lớp) | `ClassLesson[]` | Có | `GET /api/me/today` |
| `done_lessons/total_lessons` mỗi lớp | number | Có | tính ở backend |
| Sự kiện sắp tới (`OWN_EVENTS`) | `TeacherEvent[]` | Có | `GET /api/me/events?audience=teachers` |
| Lương tháng gần nhất | `PayrollRow` | Có | `GET /api/me/payroll/latest` |

**Hành động:** `Điểm danh nhanh` → `/giao-vien/diem-danh`; `Nhập điểm` → `/giao-vien/nhap-diem`; `Xem lịch dạy` → `/giao-vien/lich-trinh`.

#### C.3.2. `/giao-vien/lop-hoc` — Danh sách lớp

| | |
|---|---|
| **File** | `src/pages/client/teacher/teacher-classes-page.tsx` |
| **Nguồn giả** | `CLASSES`, `CLASS_META`, `CLASS_PROGRESS_TONE` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| `TeacherClass{id,name,classCode,courseName,level,room,teacherName,weekdays,time,maxStudents,studentCount,doneLessons,totalLessons,startDate,expectedEndDate,status,tone}` | object[] | Có | `GET /api/classes?status&level&page&pageSize` |
| `status` | `"active"\|"finishing"\|"closed"` | Có | `classes.status` |
| `tone` | `"brand"\|"sky"\|"success"` | Có | **frontend tự suy ra từ `done/total`** → không lưu DB |
| Tỷ lệ lấp đầy | number % | Có | tính ở backend |

**Lọc:** trạng thái lớp, cấp độ. **Sắp xếp:** theo tên/ngày khai giảng. **Phân trang:** có `TablePagination` (10/mỗi trang). **Hành động:** `Xem chi tiết` → `/giao-vien/lop-hoc/:classId`.

#### C.3.3. `/giao-vien/lop-hoc/:classId` — Chi tiết lớp

| | |
|---|---|
| **File** | `src/pages/client/teacher/teacher-class-detail-page.tsx` |
| **Nguồn giả** | `getClass(classId)`, `studentsOfClass()`, `lessonsOfClass()`, `testsOfClass()`, `TEACHER_ASSIGNMENTS` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| Thông tin lớp (như C.3.2) | object | Có | `GET /api/classes/:classId` — phải kiểm tra `teacher_id` của người gọi |
| Danh sách học viên trong lớp | `TeacherStudent[]` | Có | `GET /api/classes/:classId/students` |
| Danh sách 64 buổi học | `ClassLesson[]` | Có | `GET /api/classes/:classId/sessions?page` |
| Kỳ thi/bài kiểm tra | `TeacherTest[]` | Có | `GET /api/classes/:classId/assessments` |
| Bài tập đã giao | `TeacherAssignment[]` | Có | `GET /api/classes/:classId/assignments` |

**Hành động:** `Điểm danh buổi này` → `POST /api/classes/:classId/sessions/:sessionId/attendance`; `Nhập điểm` → `POST /api/classes/:classId/assessments/:id/scores`; `Giao bài` → `POST /api/classes/:classId/assignments`; `Thêm buổi học` → `POST /api/classes/:classId/sessions`.

#### C.3.4. `/giao-vien/hoc-vien` — Danh sách học viên của tôi

| | |
|---|---|
| **File** | `src/pages/client/teacher/teacher-students-page.tsx` |
| **Nguồn giả** | `TEACHER_STUDENTS`, `CLASSES`, `buildStudents()` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| `TeacherStudent{studentCode,fullName,birthDate,gender,phone,email,address,guardianName,guardianPhone,enrolledDate,attendanceRate,averageScore,className}` | object[] | Có | `GET /api/students?classId&query&page` |
| `attendanceRate`, `averageScore` | number | Có | **tính ở backend** (join attendance + scores) |
| `guardianName`, `guardianPhone` | string | Có | `guardians` qua `student_guardians` |

**Lọc:** lớp, tìm theo tên/mã. **Phân trang:** 10/mỗi trang. **Hành động:** `Xem hồ sơ` → `/giao-vien/hoc-vien/:studentId`.

#### C.3.5. `/giao-vien/hoc-vien/:studentId` — Hồ sơ học viên (góc nhìn giáo viên)

| | |
|---|---|
| **File** | `src/pages/client/teacher/teacher-student-detail-page.tsx` |
| **Nguồn giả** | `getStudent(studentId)`, `markCountsOfStudent()`, `SCORES` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| Hồ sơ HV (tương tự C.2.7, **không có `identityNo`**) | object | Có | `GET /api/students/:studentId` |
| Đếm điểm danh theo trạng thái | number | Có | `GET /api/students/:studentId/attendance-summary` |
| Lịch sử điểm | `ScoreRow[]` | Có | `GET /api/students/:studentId/scores` |
| Bài tập đã nộp/chưa nộp | `Assignment[]` | Có | `GET /api/students/:studentId/assignments` |

**Hành động:** `Nhập điểm` → `PUT /api/students/:studentId/scores/:assessmentId`; `Ghi nhận nhận xét` → `PUT .../assessment/:id/comment` (cần cột `comment`, B2/E4). **Không** được xem thông tin nhạy cảm không liên quan (ví dụ công nợ).

#### C.3.6. `/giao-vien/diem-danh` — Điểm danh

| | |
|---|---|
| **File** | `src/pages/client/teacher/teacher-attendance-page.tsx`, `src/features/teacher/quick-mark-list.tsx` |
| **Nguồn giả** | `CLASSES`, `CLASS_LESSONS`, `MARK_META`, `ATTENDANCE_LOCK_DAYS` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| Chọn lớp + chọn buổi | `classId`, `sessionId` | Có | `GET /api/classes/:classId/sessions` |
| Danh sách HV: `fullName, studentCode, status` | object[] | Có | `GET /api/classes/:classId/sessions/:sessionId/attendance` |
| `status` | `"present"\|"absent"\|"late"\|"excused"` | Có | `attendance.status` |
| Ghi chú buổi (`textarea`) | string | Không | **DB chưa có** → B2 #8 |
| `lockedAt` (khoá sau 7 ngày) | datetime \| null | Có | `class_sessions.locked_at`, hằng `ATTENDANCE_LOCK_DAYS = 7` |
| Cờ khoá tự động theo `settings.attendance_lock_days` | boolean | Có | `settings` |

**Hành động**

| Hành động | Endpoint đề xuất |
|---|---|
| Lưu điểm danh | `PUT /api/classes/:classId/sessions/:sessionId/attendance` (ghi hàng loạt trong 1 transaction) |
| Đánh dấu nhanh cả lớp | `PUT .../attendance` với `{ defaultStatus: "present" }` |
| Lưu ghi chú buổi | `PATCH /api/classes/:classId/sessions/:sessionId` |
| Mở khoá buổi bị khoá | `POST /api/classes/:classId/sessions/:sessionId/unlock` → **chỉ admin** |

**Quy tắc:** giáo viên **không** tự mở khoá. Sửa điểm danh sau ngày khoá phải ghi `audit_logs`.

#### C.3.7. `/giao-vien/nhap-diem` — Kiểm tra và nhập điểm

| | |
|---|---|
| **File** | `src/pages/client/teacher/teacher-scores-page.tsx` |
| **Nguồn giả** | `TESTS`, `TEST_KIND_META`, `scoresOfTest(testId)`, `CLASSES` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| `TeacherTest{id,classId,name,kind,date,maxScore}` | object[] | Có | `GET /api/me/assessments?classId&kind` |
| `kind` | `"quiz"\|"mid"\|"final"\|"other"` | Có | `assessments.kind` |
| Bảng điểm: `{studentId, studentName, score}` | object[] | Có | `GET /api/assessments/:id/scores` |
| Nhập điểm trực tiếp trong ô | number 0–`maxScore` | Có | `PUT /api/assessments/:id/scores` (mảng, 1 transaction) |
| `comment` nhận xét | string | Không | cột chưa có → E4 |

**Lọc:** lớp, loại bài. **Hành động:** `Tạo bài kiểm tra` → `POST /api/classes/:classId/assessments`; `Lưu điểm` → như trên; `Xuất Excel` → `GET /api/classes/:classId/assessments/:id/export`.

#### C.3.8. `/giao-vien/lich-trinh` — Lịch dạy và sự kiện

| | |
|---|---|
| **File** | `src/pages/client/teacher/teacher-schedule-page.tsx` |
| **Nguồn giả** | `weeklySchedule()`, `scheduleText()`, `weekdayLabel()`, `CLASSES`, `CENTER_EVENTS`, `OWN_EVENTS`, `audienceLabel()` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| Lịch tuần theo `weekday × slot` | `{weekday, className, room, time}` | Có | `GET /api/me/timetable?week` |
| Sự kiện trung tâm liên quan | `TeacherEvent[]` | Có | `GET /api/me/events` |
| `TeacherEventType` | `"lesson"\|"exam"\|"class"\|"center"` | Có | `events.event_type_id` |

**Lọc:** tuần, loại sự kiện. **Hành động:** `Đăng ký tham dự` → `POST /api/events/:id/registrations` (chưa có bảng → D).

#### C.3.9. `/giao-vien/bai-tap` — Quản lý bài tập

| | |
|---|---|
| **File** | `src/pages/client/teacher/teacher-assignments-page.tsx` |
| **Nguồn giả** | `TEACHER_ASSIGNMENTS`, `CLASSES` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| `TeacherAssignment{id,title,description,dueAt,createdAt,className,classId,submissions,totalStudents}` | object[] | Có | `GET /api/me/assignments?classId&page` |
| `submissions` / `totalStudents` | number | Có | đếm từ `assignment_submissions` (P3) |

**Hành động:** `Tạo bài` → `POST /api/classes/:classId/assignments`; `Sửa` → `PATCH /api/assignments/:id`; `Xoá mềm` → `DELETE /api/assignments/:id`; `Chấm bài` → `GET /api/assignments/:id/submissions` (P3).

#### C.3.10. `/giao-vien/bang-luong` — Bảng lương

| | |
|---|---|
| **File** | `src/pages/client/teacher/teacher-payroll-page.tsx` |
| **Nguồn giả** | `PAYROLL`, `payrollTotals()`, `PAYROLL_STATUS_META` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| `PayrollRow{month, key:"YYYY-MM", status, lessonRate, bonusPerLesson, breakdown[{classId,className,lessons}], adjustments[{label,amount}], ...}` | object[] | Có | `GET /api/me/payroll?year` |
| `lessonRate`, `bonusPerLesson` | number VND | Có | `pay_rates` |
| `status` | `"draft"\|"pending"\|"approved"` | Có | `payroll_periods.status` |
| Tổng lương | number VND | Có | `payroll_items.total` |

**Hành động:** `Tải phiếu lương` → `GET /api/me/payroll/:id/pdf`; `Khiếu nại` → `POST /api/payroll/:id/appeals` (chưa có bảng → D). Giáo viên **không** sửa điểm số.

#### C.3.11. `/giao-vien/thong-tin-ca-nhan` — Thông tin cá nhân

| | |
|---|---|
| **File** | `src/pages/client/teacher/teacher-profile-page.tsx` |
| **Nguồn giả** | `TEACHER_PROFILE` |

Tương tự C.2.7. `experience`, `education`, `startDate` chưa có cột DB (B2 #3). Hành động: `PATCH /api/me` (chỉ `phone,email,bio,photo_file_id`; `certificate`,`specialty` cần admin duyệt).

---

### C.4. Khu vực nhân viên — 10 màn

Phạm vi dữ liệu: nhân viên thấy học viên **được giao phụ trách** (`students.advisor_id`), lớp của trung tâm, và **không** thấy dữ liệu lương của người khác.

#### C.4.1. `/nhan-vien` — Tổng quan

| | |
|---|---|
| **File** | `src/pages/client/staff/staff-overview-page.tsx` |
| **Nguồn giả** | `STAFF_TODAY`, `STAFF_PROFILE`, `CENTER_CLASSES`, `TODAY_TASKS`, `overdueStudents()`, `newLeads()`, `paymentsToday()`, `collectedToday()`, `STAFF_EVENTS` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| `STAFF_PROFILE{fullName,position,department,phone,email,photo,startDate,bio}` | object | Có | `GET /api/me` |
| Số lớp/HV phụ trách, tỷ lệ lấp đầy | number | Có | `GET /api/me/summary` |
| Việc cần làm hôm nay (`TODAY_TASKS`) | `StaffTask[]` | Có | **không cần DB** (E5) hoặc `GET /api/me/tasks` nếu muốn lưu |
| HV quá hạn (`overdueStudents()`) | `StaffStudent[]` | Có | `GET /api/students?tuition=overdue` |
| Khách mới (`newLeads()`) | `Lead[]` | Có | `GET /api/me/leads?stage=new` |
| Đã thu hôm nay (`collectedToday()`) | number VND | Có | `GET /api/me/payments?today=true` |

#### C.4.2. `/nhan-vien/hoc-vien` — Danh sách học viên

| | |
|---|---|
| **File** | `src/pages/client/staff/staff-students-page.tsx` |
| **Nguồn giả** | `STAFF_STUDENTS`, `filterStudents()`, `CENTER_CLASSES`, `STAFF_TEAM`, `STUDENT_STATUS_META`, `TUITION_STATUS_META`, `studentsOfStaff()` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| `StaffStudent{id,studentCode,fullName,birthDate,gender,phone,email,address,status,tuition:{total,paid,remaining,dueDate,status},attendance:{rate,present,absent,late},className,staffId,enrolledDate,guardian,notes[]}` | object[] | Có | `GET /api/students?query&status&classId&staffId&tuition&page&pageSize` |
| `status` | `"active"\|"paused"\|"finished"\|"dropped"` | Có | `students.status` |
| `tuition.status` | `"paid"\|"partial"\|"due-soon"\|"overdue"` | Có | **tính ở backend** |
| `attendance.rate` | number % | Có | tính ở backend |
| `notes[]` (`CareNote`) | object[] | Có | **chưa có bảng** → B2 #11 |

**Bộ lọc (đã có sẵn trong `filterStudents`)**: `query` (tên/mã/SĐT), `status`, `classId`, `staffId`, `tuition`. Phân trang 10/mỗi trang. **Hành động:** `Xem hồ sơ` → `/nhan-vien/hoc-vien/:studentId`; `Thu tiền` → `/nhan-vien/hoc-phi`.

#### C.4.3. `/nhan-vien/hoc-vien/:studentId` — Hồ sơ học viên (góc nhìn nhân viên)

| | |
|---|---|
| **File** | `src/pages/client/staff/staff-student-detail-page.tsx` |
| **Nguồn giả** | `getStaffStudent()`, `lessonsOfStudent()`, `markCountsOfStudent()`, `paymentsOfStudent()` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| Hồ sơ đầy đủ (kể cả `identityNo`) | object | Có | `GET /api/students/:studentId` |
| Lịch sử điểm danh theo buổi | object[] | Có | `GET /api/students/:studentId/attendance` |
| Lịch sử thanh toán | `CenterPayment[]` | Có | `GET /api/students/:studentId/payments` |
| Tab "Ghi chú" (`CareNote`) | object[] | Có | `GET /api/students/:studentId/notes` |

**Hành động:** `Ghi chú` → `POST /api/students/:studentId/notes`; `Thu tiền` → `POST /api/payments`; `Sửa thông tin` → `PATCH /api/students/:studentId`; `Khoá/nghỉ` → `PATCH .../status` (ghi log).

#### C.4.4. `/nhan-vien/ghi-danh` — Ghi danh học viên mới

| | |
|---|---|
| **File** | `src/pages/client/staff/staff-enroll-page.tsx` |
| **Nguồn giả** | `ADMIN_COURSES`, `CENTER_CLASSES`, `STAFF_TEAM`, `GUARDIAN` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| Bước 1 — thông tin HV: `fullName, birthDate, gender, phone, email, address, identityNo, occupation` | object | Tên, ngày sinh, SĐT | `POST /api/students` |
| Bước 2 — người giám hộ: `fullName, relation, phone` | object | Có | `POST /api/students/:id/guardians` |
| Bước 3 — chọn khoá/lớp, `courseId`, `classId`, `discountAmount` | object | Có | `POST /api/enrollments` |
| Bước 4 — xem trước số tiền phải đóng | number VND | Có | tính ở backend từ `courses.list_price` − `discounts` |

**Hành động:** `Hoàn tất ghi danh` → **một transaction**: tạo `users` + `students` + `guardians` + `enrollments` + `invoices` (+ `payments` nếu thu ngay); trả mật khẩu tạm **một lần**, không ghi log. `settings.allow_selfEnroll` quyết định có cho HV tự ghi danh online (chưa có màn → D).

#### C.4.5. `/nhan-vien/hoc-phi` — Học phí, công nợ, thu tiền

| | |
|---|---|
| **File** | `src/pages/client/staff/staff-tuition-page.tsx`, `src/features/staff/receipt-view.tsx` |
| **Nguồn giả** | `CENTER_PAYMENTS`, `STAFF_STUDENTS`, `PAYMENT_METHOD_META`, `PAYMENTS`, `nextReceiptNo()`, `paymentsToday()`, `collectedToday()`, `getStaffStudent()` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| Đã thu hôm nay, số phiếu hôm nay | number | Có | `GET /api/me/payments/summary?date` |
| Bảng khoản thu: `{studentName, studentCode, className, amount, method, date, receiptNo, note, collectedBy}` | object[] | Có | `GET /api/me/payments?from&to&method&student&page` |
| Form thu: `{studentId, amount, method, paidAt, note, referenceCode?}` | object | `studentId,amount,method` | `POST /api/payments` |
| `nextReceiptNo()` | string | Có | **phải do backend sinh** (`sequences`), client không tự sinh |
| Phiếu thu (`ReceiptData`) | object | Có | `GET /api/payments/:id/receipt` (PDF) |

**Quy tắc:** `payments` **chỉ thêm, không sửa, không xoá** (AGENTS.md §8). Sai thì tạo bút toán điều chỉnh. Mỗi lần thu ghi `audit_logs` và `collected_by` lấy từ token.

#### C.4.6. `/nhan-vien/khach-tiem-nang` — Khách tiềm năng

| | |
|---|---|
| **File** | `src/pages/client/staff/staff-leads-page.tsx` |
| **Nguồn giả** | `STAFF_LEADS`, `LEAD_STAGE_META`, `LEAD_SOURCE_META`, `LEAD_NOTE_RESULT_META`, `leadsOfStaff()`, `leadConversionRate()` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| `Lead{id,fullName,phone,email,age,source,courseId,assignedTo,createdAt,expectedFee,status,nextFollowUp,notes[]}` | object[] | Có | `GET /api/me/leads?stage&source&query&page` |
| `status` (`stage`) | `"new"\|"called"\|"trial"\|"won"\|"lost"` | Có | `leads.stage` |
| `source` | `"Facebook"\|"Website"\|"Zalo"\|"Giới thiệu"\|"Khách vãng lai"` | Có | `lead_sources.name` |
| `notes[]{date,result,content,nextFollowUp}` | object[] | Có | `lead_activities` (P2) |
| Tỷ lệ chuyển đổi | number % | Có | `GET /api/me/leads/conversion` |

**Hành động:** `Thêm` → `POST /api/leads`; `Đổi giai đoạn` → `PATCH /api/leads/:id/stage` (kéo-thả kanban); `Ghi chú` → `POST /api/leads/:id/activities`; `Chuyển thành học viên` → `POST /api/leads/:id/convert` (tạo HV + `enrollments` trong 1 transaction). `age`, `expectedFee`, `nextFollowUp` chưa có cột (B2 #9).

#### C.4.7. `/nhan-vien/lich-trinh` — Lịch trình trung tâm

| | |
|---|---|
| **File** | `src/pages/client/staff/staff-schedule-page.tsx` |
| **Nguồn giả** | `CENTER_CLASSES`, `STAFF_EVENTS`, `CENTER_EVENT_META`, `eventsVisibleTo()`, `eventAudienceText()` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| Lịch lớp theo tuần | `{weekday, className, room, time, teacherName}` | Có | `GET /api/me/timetable?week` |
| Sự kiện: `CenterEvent{id,title,type,scope,date,location,description,own}` | object[] | Có | `GET /api/me/events?scope&type&from&to` |
| `scope` | `"all"\|"teachers"\|"staff"\|"classes"` | Có | `event_audiences` |

**Hành động:** `Tạo sự kiện` → `POST /api/events` (nhân viên được tạo nhưng **cần admin duyệt công bố** — xem E7).

#### C.4.8. `/nhan-vien/bai-dang` — Bài đăng

| | |
|---|---|
| **File** | `src/pages/client/staff/staff-posts-page.tsx` |
| **Nguồn giả** | `data/posts.ts`: `getPosts()`, `getDraftPosts()`, `upsertPost()`, `removePost()`, `nextPostId()`, `subscribePosts()`, `useAllPosts()`, `POST_CATEGORIES`, `POST_STATUS_META` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| `Post{id,title,excerpt,content,cover,category,date,facebookUrl,status,author}` | object[] | Có | `GET /api/me/posts?status&category&page` |
| `status` | `"draft"\|"published"` | Có | `posts.status` |
| `category` | `"Sự kiện"\|"Hoạt động"\|"Thành tích"\|"Thông báo"\|"Khoá học"` | Có | `post_categories.name` |
| `author` | string | Có | `posts.author_id` → tên hiển thị |

**Hành động:** `Tạo bản nháp` → `POST /api/me/posts`; `Sửa` → `PATCH /api/me/posts/:id`; `Xuất bản` → `POST /api/me/posts/:id/publish`; `Xoá mềm` → `DELETE /api/me/posts/:id`. **Cần bổ sung trạng thái `pending`** nếu chọn phương án staff soạn – admin duyệt (E7).

#### C.4.9. `/nhan-vien/bang-luong` — Bảng lương

| | |
|---|---|
| **File** | `src/pages/client/staff/staff-payroll-page.tsx` |
| **Nguồn giả** | `STAFF_PAYROLL`, `staffPayrollTotal()`, `approvedPayroll()`, `STAFF_PAYROLL_STATUS_META` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| `StaffPayrollRow{month,key,status,baseSalary,items[{label,amount,hint}]}` | object[] | Có | `GET /api/me/payroll?year` |
| `status` | `"draft"\|"pending"\|"approved"` | Có | `payroll_periods.status` |
| Tổng | number VND | Có | `payroll_items.total` |

**Hành động:** `Tải phiếu lương` → `GET /api/me/payroll/:id/pdf`. Nhân viên **chỉ xem của mình**, không xem của nhau.

#### C.4.10. `/nhan-vien/thong-tin-ca-nhan` — Thông tin cá nhân

| | |
|---|---|
| **File** | `src/pages/client/staff/staff-profile-page.tsx` |
| **Nguồn giả** | `STAFF_PROFILE` |

Tương tự C.2.7. `department`, `education`, `bio` chưa có cột (B2 #4). `position` là do admin quyết định, không cho tự sửa.

---

### C.5. Khu vực quản trị — 18 màn

Tất cả nạp động (`lazy`) trong `Suspense`. Dùng bộ dụng cụ dùng chung: `TableToolbar`, `ToolbarSelect`, `TablePagination` (10/trang), `TableEmpty`, `ConfirmDialog`, `GlobalSearch`, và 6 loại biểu đồ trong `components/admin/charts.tsx`.

#### C.5.1. `/admin` — Tổng quan

| | |
|---|---|
| **File** | `src/pages/admin/admin-dashboard-page.tsx` |
| **Nguồn giả** | `ADMIN_TODAY` (`new Date(2026,9,2)`), `TODAY_LESSONS`, `NEW_LEADS`, `recentPayments()`, `REVENUE_SERIES`, `ENROLLMENT_SERIES`, `CLASS_SIZE_SERIES`, `FUNNEL_SERIES`, `RECRUIT_SUMMARY`, `debtTotal()` |

| Trường | Kiểu | Nguồn đề xuất |
|---|---|---|
| `ADMIN_TODAY` | date | server trả ngày hiện tại theo `Asia/Ho_Chi_Minh` |
| `TODAY_LESSONS[]{classId,className,room,time,slotId,teacherName,studentCount,status,attendanceDone}` | object[] | `GET /api/classes/today` |
| `NEW_LEADS[]` | `Lead[]` | `GET /api/leads?stage=new&pageSize=6` |
| `recentPayments(limit)` | `(CenterPayment & {studentName, method})[]` | `GET /api/payments/recent?limit=10` |
| Doanh thu 6 tháng `{month,revenue,target}` | series | `GET /api/reports/revenue?months=6` |
| Ghi danh/churn `{month,enrolled,churned}` | series | `GET /api/reports/enrollment` |
| Sĩ số lớp `{name,fullName,enrolled,capacity}` | series | `GET /api/reports/class-size` |
| Phễu `{step,value}` | series | `GET /api/reports/funnel` |
| Công nợ tổng | number VND | `GET /api/reports/debt-total` |

#### C.5.2. `/admin/tai-khoan` — Quản lý tài khoản

| | |
|---|---|
| **File** | `src/pages/admin/admin-accounts-page.tsx` |
| **Nguồn giả** | `ADMIN_ACCOUNTS`, `accountsByRole()`, `ACCOUNT_ROLE_META`, `ACCOUNT_STATUS_META` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| `AdminAccount{id,username,fullName,email,phone,role,status,lastLoginAt,createdAt,deletedAt,mustChangePassword}` | object[] | Có | `GET /api/users?role&status&query&onlyDeleted&page&pageSize` |
| `role` | `"student"\|"teacher"\|"staff"\|"admin"` | Có | `roles` qua `user_roles` |
| `status` | `"active"\|"locked"\|"pending"\|"archived"` | Có | `users.status` |

**Bộ lọc:** vai trò, trạng thái, tìm tên/username/email, cờ **chỉ hiện đã xoá** (soft delete). **Phân trang:** 10/trang. **Hành động**

| Hành động | Endpoint đề xuất |
|---|---|
| Tạo tài khoản | `POST /api/users` → trả mật khẩu tạm **một lần**, không ghi log |
| Sửa | `PATCH /api/users/:id` |
| Khoá / mở khoá | `PATCH /api/users/:id/status` (`locked`) |
| Đặt lại mật khẩu | `POST /api/users/:id/reset-password` → mật khẩu tạm hiển thị một lần |
| Xoá mềm / khôi phục | `DELETE` / `PATCH /api/users/:id/restore` |
| Xuất Excel | `GET /api/users/export` |

#### C.5.3–C.5.5. `/admin/hoc-vien`, `/admin/giao-vien`, `/admin/nhan-vien` — Quản lý học viên / giáo viên / nhân viên

| | |
|---|---|
| **File** | `admin-students-page.tsx`, `admin-teachers-page.tsx`, `admin-staff-page.tsx` |
| **Nguồn giả** | `managedStudents()`, `managedTeachers()`, `managedStaff()`, `STAFF_STUDENTS`, `CLASS_META`, `TUITION_STATUS_META` |

`ManagedPerson` dùng chung: `{id, code, fullName, email, phone, group, status, joinedAt, deletedAt}` — `code` = `student_code`/`teacher_code`/`staff_code`, `group` = `level` (HV) / khoá học (GV) / vị trí (NV), `joinedAt` = `start_date`.

| Màn | Bộ lọc | Trường riêng | Hành động → endpoint |
|---|---|---|---|
| **Học viên** | vai trò/trạng thái/tìm kiếm/đã xoá | Cột **Học phí** suy từ `STAFF_STUDENTS.tuition` | `GET /api/students?...`; `POST /api/students`; `PATCH /api/students/:id`; `DELETE`/`restore`; `POST /api/students/:id/reset-password` |
| **Giáo viên** | + cấp độ/chuyên môn | Số lớp phụ trách, sĩ số | `GET/POST/PATCH/DELETE /api/teachers[/:id]`; `POST /api/teachers/:id/reset-password` |
| **Nhân viên** | + vị trí/phòng ban | Số HV phụ trách | `GET/POST/PATCH/DELETE /api/staff[/:id]` |

**Vấn đề cần xử lý (Q1):** 3 màn dùng chung một kiểu `ManagedPerson` gộp 3 bảng → backend nên trả `items[]` đã chuẩn hoá về cùng hình dạng, hoặc tách 3 endpoint riêng. **Vấn đề phân quyền:** `GET /api/students` phải trả cả bản ghi đã xoá mềm khi `onlyDeleted=true`.

#### C.5.6. `/admin/import` — Nhập hàng loạt

| | |
|---|---|
| **File** | `src/pages/admin/admin-import-page.tsx`, `src/lib/admin-excel.ts` |
| **Nguồn giả** | `IMPORT_KIND_META`, `ImportRow`, `ParseResult`, `generateCredentials()`, `parseImportFile()` |

Wizard 4 bước: (1) chọn loại + tải mẫu → (2) chọn file → (3) xem trước + kiểm tra → (4) xác nhận + sinh tài khoản.

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| `kind` | `"student"\|"teacher"\|"staff"` | Có | `POST /api/imports` |
| File `.xlsx`/`.csv` | file | Có | `POST /api/imports/preview` (multipart) |
| `missingColumns[]` | string[] | — | trả từ backend, frontend hiện tự kiểm tra |
| Kết quả `{created, skipped, errors[]}` | object | — | `POST /api/imports/:id/commit` |

**Hành động:** `Tải mẫu` → `GET /api/imports/template?kind=`; `Sinh tài khoản` → `POST /api/imports/:id/credentials` → **mật khẩu tạm hiển thị một lần, không ghi log**. `TEMPLATE_COLUMNS` hiện **không được export** từ `lib/admin-excel.ts` → bước 1 chỉ hiện mô tả chung, cần sửa ở phase NỐI (F6).

#### C.5.7. `/admin/khoa-hoc` — Quản lý khoá học

| | |
|---|---|
| **File** | `src/pages/admin/admin-courses-page.tsx` |
| **Nguồn giả** | `ADMIN_COURSES` (dựng từ `COURSES`), `COURSE_STATUS_META`, `CENTER_CLASSES` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| `AdminCourse{id,name,level,lessons,tuition,enrolled,target,status,updatedAt}` | object[] | Có | `GET /api/courses?level&status&page` |
| `status` | `"published"\|"draft"\|"archived"` | Có | `courses.status` |
| `lessons` | number | Có | `courses.total_sessions` |
| `enrolled` | number | Có | đếm `enrollments` |
| `target` | number | Có (hiển thị) | **chưa có cột** → B2 #5 |

**Hành động:** `Tạo` → `POST /api/courses`; `Sửa` → `PATCH /api/courses/:id`; `Ẩn/hiện` → `PATCH .../status`; `Xoá mềm` → `DELETE /api/courses/:id`.

#### C.5.8. `/admin/lop-hoc` — Quản lý lớp học

| | |
|---|---|
| **File** | `src/pages/admin/admin-classes-page.tsx` |
| **Nguồn giả** | `CENTER_CLASSES`, `ADMIN_COURSES`, `LANDING_TEACHERS`, `ADMIN_ROOMS`, `getRoom()`, `CLASS_STATUS_META` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| Thông tin lớp (như C.3.2 + `advisor`, `enrolled`) | object[] | Có | `GET /api/classes?status&courseId&page` |
| `weekdays[]` | number[] | Có | `class_schedules.weekday` |
| `time` | string | Có | `time_slots` |
| `expectedEndDate` | date | Có | `classes.end_date` |
| `advisor` (NV phụ trách) | string | Có | `classes.staff_id` |
| Cột "Tài chính" (đã thu/còn nợ) | number VND | Có | tính ở backend |

**Hành động:** `Tạo lớp`/`Sửa`/`Xoá mềm` → `POST/PATCH/DELETE /api/classes[/:id]`; `Chuyển giáo viên` → `PATCH /api/classes/:classId/teacher`; `Xem danh sách` → `/admin/hoc-vien`. **Hiện UI chưa có nút tạo lớp** → xem D.

#### C.5.9. `/admin/phong-hoc` — Phòng học

| | |
|---|---|
| **File** | `src/pages/admin/admin-rooms-page.tsx` |
| **Nguồn giả** | `ADMIN_ROOMS`, `ROOM_STATUS_META`, `getRoom()`, `CENTER_CLASSES` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| `AdminRoom{id,name,capacity,floor,equipment,status}` | object[] | Có | `GET /api/rooms?status&query&page` |
| `status` | `"available"\|"occupied"` | Có | tính ở backend từ lịch dùng phòng |
| `floor`, `equipment` | number/string | Có (hiển thị) | **chưa có cột** → B2 #6 |

**Hành động:** `POST/PATCH/DELETE /api/rooms[/:id]`.

#### C.5.10. `/admin/thoi-khoa-bieu` — Thời khoá biểu

| | |
|---|---|
| **File** | `src/pages/admin/admin-timetable-page.tsx` |
| **Nguồn giả** | `TIMETABLE`, `TIMETABLE_WEEKDAYS`, `TIMETABLE_SLOTS`, `findConflicts()`, `CENTER_CLASSES`, `ADMIN_ROOMS`, `LANDING_TEACHERS` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| `TimetableEntry{id,classId,className,teacherName,room,weekday,slot,start,end}` | object[] | Có | `GET /api/timetable?week&roomId&teacherId` |
| `TimetableConflict[]` | object[] | Có | `POST /api/timetable/check` hoặc backend trả kèm |
| `TIMETABLE_SLOTS` (Ca 1..Ca 8) | object[] | Có | bảng `time_slots` |

**Hành động:** `Thêm` → `POST /api/classes/:classId/schedules`; `Sửa/Xoá` → `PATCH/DELETE /api/class-schedules/:id`. **Cần endpoint kiểm tra xung đột** phòng/GV theo tuần trước khi lưu (hiện `findConflicts()` chạy ở client). **Ca 7 và Ca 8 chồng nhau** → B2 #14.

#### C.5.11. `/admin/diem-danh` — Điểm danh toàn trung tâm

| | |
|---|---|
| **File** | `src/pages/admin/admin-attendance-page.tsx` |
| **Nguồn giả** | `ATTENDANCE_SUMMARIES`, `attendanceRate()`, `unlockClassAttendance()`, `ATTENDANCE_RATE_SERIES`, `classAttendanceRows()`, `MARK_LABELS`, `CENTER_CLASSES`, `TODAY_LESSONS` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| `AttendanceSummary{classId,className,teacherName,room,weekday,time,total,present,late,absent,excused,locked,lastLessonNo,date}` | object[] | Có | `GET /api/reports/attendance?classId&teacherId&from&to&page` |
| `attendanceRate()` | number % | Có | **tính ở backend** (view) |
| `ATTENDANCE_RATE_SERIES` | series | Có | `GET /api/reports/attendance-rate` |
| `TODAY_LESSONS[].attendanceDone` | boolean | Có | `GET /api/attendance/today` |

**Hành động:** `Mở khoá lớp` → `POST /api/classes/:classId/attendance/unlock` (**chỉ admin**, ghi `audit_logs`); `Sửa điểm danh giáo viên` → `PUT /api/classes/:classId/sessions/:sessionId/attendance`; `Xuất báo cáo` → `GET /api/reports/attendance/export`.

#### C.5.12. `/admin/lich-trinh` — Sự kiện / lịch trình

| | |
|---|---|
| **File** | `src/pages/admin/admin-events-page.tsx` |
| **Nguồn giả** | `STAFF_EVENTS`, `CENTER_EVENT_META`, `CENTER_EVENT_SCOPE_META`, `TODAY_LESSONS`, `CENTER_CLASSES` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| `CenterEvent{id,title,type,scope,date,endDate,location,description,own}` | object[] | Có | `GET /api/events?type&scope&from&to&page` |
| `type` | `"lesson"\|"exam"\|"holiday"\|"event"\|"training"` | Có | `event_types.code` |
| `scope` | `"all"\|"teachers"\|"staff"\|"classes"` | Có | `event_audiences` |
| Lớp hôm nay (để gán sự kiện) | `TodayLesson[]` | Có | `GET /api/classes/today` |

**Hành động:** `POST/PATCH/DELETE /api/events[/:id]`; `Duyệt` (nếu có trạng thái chờ duyệt) → `POST /api/events/:id/approve`.

#### C.5.13. `/admin/hoc-phi` — Học phí và công nợ

| | |
|---|---|
| **File** | `src/pages/admin/admin-tuition-page.tsx` |
| **Nguồn giả** | `ADMIN_INVOICES`, `invoiceRemaining()`, `debtTotal()`, `DEBT_AGING`, `INVOICE_STATUS_META`, `CASH_CLOSES`, `DISCOUNT_REQUESTS`, `STAFF_STUDENTS`, `CENTER_PAYMENTS` |

Có 4 tab: **Công nợ** · **Hóa đơn** · **Đối soát tiền mặt** · **Giảm giá/hoàn phí**.

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| `AdminInvoice{id,code,studentId,studentName,className,dueDate,total,paid,status,kind}` | object[] | Có | `GET /api/invoices?status&classId&from&to&page` |
| `status` | `"unpaid"\|"partial"\|"paid"\|"overdue"` | Có | tính ở backend |
| `invoiceRemaining()` | number VND | Có | `invoices.total − payments` |
| `debtTotal()` | number VND | Có | `GET /api/reports/debt-total` |
| `DEBT_AGING[]` | `{label,amount}` | Có | `GET /api/reports/debt-aging` |
| `CashClose{id,staffId,staffName,date,shift,totalCollected,cashOnHand,status,note}` | object[] | Có | `GET /api/cash-closings?from&to` |
| `DiscountRequest{id,studentName,className,kind,reason,amount,requestedBy,requestedAt,status}` | object[] | Có | `GET /api/discount-requests?status` |

**Hành động:** `Duyệt giảm giá` → `POST /api/discounts/:id/approve`; `Duyệt hoàn phí` → `POST /api/refunds/:id/approve`; `Đối soát` → `POST /api/cash-closings`; `Chốt ngày` → `POST /api/cash-closings/:id/close`; `Xuất công nợ` → `GET /api/reports/debt/export`. `shift`, `bankTransfer` chưa có cột (B2 #10).

#### C.5.14. `/admin/bang-luong` — Bảng lương

| | |
|---|---|
| **File** | `src/pages/admin/admin-payroll-page.tsx` |
| **Nguồn giả** | `ADMIN_PAYROLL`, `ADMIN_PAYROLL_STATUS_META`, `adminPayrollTotal()` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| `AdminPayrollRow{month,staffId,staffName,role,base,bonus,deduction,status,locked,note}` | object[] | Có | `GET /api/payroll?month&role&status&page` |
| `status` | `"draft"\|"pending"\|"approved"` | Có | `payroll_periods.status` |
| `locked` | boolean | Có | `payroll_items.locked` |
| Tổng (`adminPayrollTotal()`) | number VND | Có | `base+bonus−deduction` |

**Hành động:** `Tạo kỳ lương` → `POST /api/payroll/periods`; `Nhập liệu lương` → `POST /api/payroll/items`; `Duyệt` → `POST /api/payroll/periods/:id/approve`; `Khoá` → `POST .../lock`; `Xuất` → `GET /api/payroll/export`.

#### C.5.15. `/admin/noi-dung` — Bài đăng, banner, giáo viên hiển thị

| | |
|---|---|
| **File** | `src/pages/admin/admin-content-page.tsx` |
| **Nguồn giả** | `getAllPosts()`/`useAllPosts()`, `POST_STATUS_META` (`"published"\|"pending"\|"draft"`), `POST_CATEGORIES`, `LANDING_BANNERS`, `LANDING_TEACHERS` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| `Post` như C.4.8 nhưng có thêm trạng thái `pending` | object[] | Có | `GET /api/posts?status&category&page` |
| `LandingBanner{id,title,subtitle,cta,image,status,updatedAt}` | object[] | Có | `GET /api/banners` (`site_banners`) |
| `LandingTeacher{name,specialty,certificate,photo,showOnWebsite}` | object[] | Có | `PATCH /api/teachers/:id/website-visibility` |

**Hành động:** `Duyệt bài` → `POST /api/posts/:id/approve`; `Gỡ bài` → `POST .../unpublish`; `Xoá mềm` → `DELETE /api/posts/:id`; `Đặt banner` → `POST/PATCH /api/banners[/:id]`; `Bật/tắt hiển thị GV` → `PATCH /api/teachers/:id/website-visibility`.

#### C.5.16. `/admin/bao-cao` — Báo cáo và thống kê

| | |
|---|---|
| **File** | `src/pages/admin/admin-reports-page.tsx` |
| **Nguồn giả** | `REVENUE_SERIES`, `ENROLLMENT_SERIES`, `CLASS_SIZE_SERIES`, `SOURCE_SERIES`, `FUNNEL_SERIES`, `DEBT_AGING`, `ATTENDANCE_RATE_SERIES`, `RECAP`/summary |

| Trường | Kiểu | Nguồn đề xuất |
|---|---|---|
| Khoảng thời gian (`from`,`to`), cấp độ, lớp | filter | truy vấn |
| `revenue{month,revenue,target}` | series | `GET /api/reports/revenue` |
| `enrollment{month,enrolled,churned}` | series | `GET /api/reports/enrollment` |
| `classSize{name,enrolled,capacity}` | series | `GET /api/reports/class-size` |
| `source{name,value}` | series | `GET /api/reports/lead-source` |
| `funnel{step,value}` | series | `GET /api/reports/funnel` |
| `debtAging{label,amount}` | series | `GET /api/reports/debt-aging` |
| `attendanceRate{name,rate}` | series | `GET /api/reports/attendance-rate` |

**Hành động:** `Xuất báo cáo` → `GET /api/reports/export?type=...&from&to` (Excel/PDF). Mọi lần xuất ghi `audit_logs(action=export)`.

#### C.5.17. `/admin/nhat-ky` — Nhật ký hệ thống

| | |
|---|---|
| **File** | `src/pages/admin/admin-audit-log-page.tsx` |
| **Nguồn giả** | `AUDIT_LOGS` (48 bản ghi sinh tự động), `AUDIT_ACTION_META` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| `AuditLog{id,time,actor,actorRole,action,module,detail,ip}` | object[] | Có | `GET /api/audit-logs?action&module&actor&from&to&page` |
| `action` | `"create"\|"update"\|"delete"\|"login"\|"export"\|"import"\|"approve"\|"lock"` | Có | `audit_logs.action` |
| `module` | string | Có | `audit_logs.table_name` |
| `ip` | string | Có | `audit_logs.ip_address` |

Chỉ admin được đọc. Không bao giờ ghi mật khẩu/token vào `detail` (kiểm tra ở backend).

#### C.5.18. `/admin/cai-dat` — Cài đặt trung tâm

| | |
|---|---|
| **File** | `src/pages/admin/admin-settings-page.tsx` |
| **Nguồn giả** | `ADMIN_SETTINGS: CenterSettings` |

| Trường | Kiểu | Bắt buộc | Nguồn đề xuất |
|---|---|---|---|
| `name, address, phone, email, taxCode` | string | Có | `settings` |
| `academicYear, academicStart, academicEnd` | string/date | Có | `settings` |
| `attendanceLockDays` | number | Có | `settings` |
| `receiptHeader, receiptFooter` | string | Có | `settings` |
| `allowSelfEnroll, requirePasswordChange, notifyParentOnPayment` | boolean | Có | `settings` |

**Hành động:** `Lưu cài đặt` → `PATCH /api/settings` (ghi `audit_logs`). **Lưu ý:** 3 cờ boolean hiện có trong UI nhưng **chưa màn nào dùng** → xem D.

---

## D. Chức năng có trong đặc tả nhưng giao diện CHƯA có

| # | Chức năng theo đặc tả / DB | Bảng DB | Trạng thái trên giao diện | Mức |
|---|---|---|---|---|
| D1 | **Vai trò phụ huynh**: tài khoản riêng, xem lịch/con điểm của con | `guardians`, `users` | Chỉ có `GUARDIAN` là dữ liệu của người giám hộ ghi kèm học viên; **không có** vai trò `parent`, khu vực `/phu-huynh`, hay tài khoản đăng nhập | Cần xác nhận (Q2) |
| D2 | **Ghi danh trực tuyến** bởi học viên | `enrollments`, `settings.allowSelfEnroll` | Chỉ nhân viên ghi danh tại `/nhan-vien/ghi-danh` | P2 |
| D3 | **Quản lý giáo trình/bài dạy** của khoá học | `course_lessons` (P2) | UI có `Lesson.topic`/`unit` nhưng là dữ liệu giả, **không có màn quản lý** | P2 |
| D4 | **Quản lý nội dung tĩnh của landing** (giới thiệu, tính năng, lộ trình, gallery, giá trị) | `site_contents` (P2) | Toàn bộ nằm cứng trong `data/landing.ts`; màn Nội dung chỉ sửa **banner** và bài đăng | P2 |
| D5 | **Đặt câu chuyện đánh giá (testimonial)** | `testimonials` (P2) | Cứng trong `data/landing.ts` | P2 |
| D6 | **Thông báo tự động** (nhắc buổi học, nhắc học phí, kết quả) | `notifications` (P2) | Chuông dùng mảng tĩnh `NOTIFICATIONS_BY_ROLE`, tự sinh dữ liệu giả | P2 |
| D7 | **Yêu cầu thay đổi hồ sơ** do nhân viên duyệt | `profile_change_requests` | UI cho học viên sửa hồ sơ trực tiếp, **không có quy trình duyệt** | P1 |
| D8 | **Quy trình duyệt bài đăng**: nhân viên soạn → admin duyệt | `posts.status` | Staff **tự publish**, chỉ có `draft`/`published`; màn admin có `pending` nhưng dữ liệu giả không có | Cần xác nhận (Q4) |
| D9 | **Phiếu chi / chi tiền ra** (vận hành) | `payments` chỉ có khoản thu | UI chỉ có thu tiền; **không có** màn chi phí | P2 |
| D10 | **Đối soát tiền mặt theo ca** có `shift` và `bank_transfer` | `daily_cash_closings` | Màn đối soát có nhưng thiếu 2 cột → B2 #10 | P1 |
| D11 | **Quản lý đơn vị/phòng ban, cơ sở** | `departments`, `branches` | UI giả định một cơ sở, không có màn | P2 |
| D12 | **Quản lý thiết bị, tài liệu, thư viện lớp** | `files`, `class_documents` | Chỉ có `GALLERY` giả; **không có** màn upload | P2 |
| D13 | **Trạng thái buổi học**: đã lên lịch / đã dạy / hủy / dạy bù | `class_sessions.status` | UI chỉ có cờ `marked` + `locked_at` | P1 |
| D14 | **Quản lý thi/kiểm tra chi tiết theo 4 kỹ năng** | `assessments`, `scores` | GV nhập **một điểm tổng**; UI học viên hiển thị 4 cột kỹ năng → E4 | P2 |
| D15 | **Báo cáo lưu chuyển học viên (churn)** | `enrollments.status` | Biểu đồ `ENROLLMENT_SERIES` có `churned` nhưng không định nghĩa cách tính | P1 |
| D16 | **Nhật ký truy cập dữ liệu nhạy cảm** | `sensitive_access_logs` | Không có UI — **không cần**, chỉ ghi ở backend | — |
| D17 | **Quản lý ca giờ dạy bù, dạy thêm** | `class_sessions` | UI không có khái niệm buổi bù | P2 |
| D18 | **Bộ lọc báo cáo điểm danh theo giáo viên** | `attendance` | Màn admin điểm danh lọc theo lớp, chưa có bộ lọc theo GV | P1 |
| D19 | **Tạo lớp học từ giao diện quản trị** | `classes` | `/admin/lop-hoc` chỉ sửa/xoá, **không có nút tạo lớp** | Cần xác nhận (Q5) |
| D20 | **Trang thanh toán trực tuyến** | `payments` | Màn học phí của HV có nút "Thanh toán online" nhưng không có màn/API | P2 |

## E. Chức năng có trên giao diện nhưng đặc tả CHƯA nói rõ

| # | Trên giao diện | Đặc tả / DB chưa mô tả | Đề xuất |
|---|---|---|---|
| E1 | `Course.audience`, `highlights`, `schedule`, `featured`, `levelTone` (landing) | `courses` không có các cột này | Thêm cột hoặc bỏ khỏi UI |
| E2 | `Lesson.topic`, `unit`, `note`, `progress` | `class_sessions` không có | Thêm `topic`; `unit` lấy từ `course_lessons` (P2) |
| E3 | `CareNote` (ghi chú chăm sóc HV, có `tone`) | Không có bảng | Thêm bảng `student_notes` (P2) |
| E4 | `ScoreRow` có 4 kỹ năng + `comment` | `scores` chỉ có `score` đơn, `student_feedback` khác nghĩa | Thêm cột kỹ năng hoặc giản lược UI → Q8 |
| E5 | `StaffTask` (việc cần làm hôm nay) | Không có bảng | Xem là ghi chú cục bộ, không lưu DB |
| E6 | `Stat`, `Feature`, `LEARNING_PATH`, `ABOUT_VALUES` | `site_contents` chưa mô tả cấu trúc | Định nghĩa `site_contents` theo `key` + `jsonb` |
| E7 | Staff tự publish bài; màn admin có trạng thái `pending` | `posts.status` của spec chỉ nói draft/published | Chốt quy trình duyệt → Q4 |
| E8 | `PaymentMethod` là chuỗi tiếng Việt (`"Thẻ ATM"`, `"Ví điện tử"`) | `payments.method` nên là mã | Đổi sang mã: `cash` / `bank_transfer` / `card` / `ewallet` |
| E9 | `StudentStatus` = `active/paused/finished/dropped` | `students.status` của DB là `active/inactive/...` | Chốt: trạng thái ở cấp **học viên** khác `enrollments.status` → Q3 |
| E10 | `TuitionStatus` = `paid/partial/due-soon/overdue` | Spec tính công nợ từ `invoices` + `payments` | Trả 4 trạng thái này từ backend (view) |
| E11 | `Lead.age`, `expectedFee`, `nextFollowUp` | `leads` không có 3 cột | Thêm cột |
| E12 | `Post.facebookUrl` (đăng chéo Facebook) | Spec không nói tích hợp mạng xã hội | `[CẦN XÁC NHẬN]` — có thể bỏ khỏi phạm vi |
| E13 | `AdminAccount.status` = `active/locked/pending/archived` | `users.status` khác tập giá trị | Thống nhất một tập |
| E14 | `NOTIFICATIONS_BY_ROLE` (thông báo giả theo vai trò) | `notifications` là dữ liệu thật do backend sinh | Thay bằng `GET /api/notifications` |
| E15 | `ATTENDANCE_LOCK_DAYS = 7` hardcode | `settings.attendance_lock_days` mới đúng | Luôn đọc từ `settings` |
| E16 | `TIMETABLE_SLOTS` Ca 7 (19:00–20:30) và Ca 8 (19:45–21:15) **chồng nhau** | Spec không định nghĩa ca | Xác nhận lại khung giờ thật → Q6 |
| E17 | `RoomStatus` = `available/occupied` | Spec nói phòng học `status` | Tính từ lịch dùng phòng, không lưu |
| E18 | Mã sinh ở client: `HV2026-MOI`, `PT-2610-NNNN`, `generateCredentials()` | `sequences` trong DB | Backend phải sinh mã |
| E19 | `NOTIFY`/`notifyParentOnPayment` trong Cài đặt | Không có màn dùng | Giữ cờ nhưng cần màn thông báo phụ huynh (D6) |
| E20 | `CENTER_EVENT_SCOPE` gồm `classes` (gán sự kiện cho lớp) | `event_audiences` chưa mô tả rõ | Mô tả lại cấu trúc đối tượng nhận |

## F. Rủi ro khi nối API

| # | Rủi ro | Bằng chứng trong mã | Xử lý ở phase NỐI |
|---|---|---|---|
| F1 | **Vai trò và token nằm trong `localStorage`** — sửa bằng DevTools là chiếm được quyền admin; `DemoRolePicker` cấp vai trò không cần mật khẩu | `lib/auth/auth-context.tsx`, `features/auth/demo-role-picker.tsx` (`MOCK_ACCOUNTS`) | Bỏ `demo-role-picker` và `localStorage`; dùng cookie `httpOnly` + `GET /api/auth/me` trả `roles[]` |
| F2 | **Trạng thái lưu bằng chuỗi tiếng Việt** | `PAYMENT_METHOD_META` key `"Tiền mặt"`, `POST_CATEGORIES` `"Sự kiện"`, `LEAD_NOTE_RESULT_META`, `CenterSettings.position` | API trả mã; frontend giữ bảng `*_META` để hiện nhãn |
| F3 | **Ngày giờ không nhất quán** | `teacher.ts: TODAY = new Date(2026,9,2)`, `admin.ts: ADMIN_TODAY_LABEL = "02/10/2026"`, `staff.ts: TODAY_DATE_LABEL = "02/10/2026"`, màn học viên dùng ngày khác, `formatDate()` theo timezone máy | Server gửi ISO + `timezone: "Asia/Ho_Chi_Minh"`; mọi mốc "hôm nay" lấy từ server |
| F4 | **Dữ liệu giả được sinh bằng hàm, không theo quan hệ thật** | `buildAccounts()`, `buildLessons()`, `Object.fromEntries(...)`, `Array.from({length:48})` | Bỏ toàn bộ, thay bằng query thật có phân trang |
| F5 | **Phân trang và lọc chạy ở client** (`PAGE_SIZE = 10`) | `TablePagination`, `filterStudents()` | Chuyển sang `page/pageSize/total/totalPages` + `sort` |
| F6 | **Xuất/nhập Excel ở client** | `lib/excel.ts`, `lib/admin-excel.ts`; `TEMPLATE_COLUMNS` **không được export** | Backend tạo file; server kiểm tra MIME/kích thước |
| F7 | **Ảnh là URL Unsplash** | `lib/images.ts: unsplash()` | Upload thật qua `files`, kiểm tra nội dung file, đổi tên file |
| F8 | **ID là chuỗi ngẫu nhiên** (`c-01`, `HV-2026-0034`) | `data/*.ts` | Chốt kiểu id (bigint/uuid) và ánh xạ ở lớp DTO |
| F9 | **Số liệu tổng hợp tính ở client** | `debtTotal()`, `attendanceRate()`, `leadConversionRate()`, `tuitionProgress()` | Backend trả sẵn; nếu phân trang server-side thì cách tính hiện tại sẽ sai |
| F10 | **Menu và route lệch nhau** | `role-home-page.tsx` không được route; một số nơi dùng chuỗi cứng | Nguồn sự thật: menu `client-layout.tsx`/`admin-layout.tsx` + `require-role.tsx` |
| F11 | **Link thông báo sai route** | chuông trỏ `/hoc-vien/lich-hoc`, route thật là `/hoc-vien/lich-trinh` | Sửa khi nối API |
| F12 | **Tập trạng thái tài khoản lệch** giữa `admin.ts` và DB | `AccountStatus` vs `users.status` | Chốt Q9 |
| F13 | **Sinh mật khẩu tạm ở client** | `generateCredentials()` trong `admin-excel.ts` | Backend sinh, hiển thị một lần, không ghi log |
| F14 | **Trạng thái bài đăng của nhân viên không được kiểm soát** | `upsertPost()` cho phép publish ngay | Backend chặn publish nếu chọn phương án duyệt (Q4) |
| F15 | **Route trùng tên giữa khu vực** | `/admin/hoc-vien` vs `/hoc-vien` | Phân biệt rõ khi định nghĩa quyền |
| F16 | **State bài đăng ở module scope** | `subscribePosts()` trong `data/posts.ts` | Mất dữ liệu khi tải lại trang, không chia sẻ được giữa người dùng |
| F17 | **`settings` dạng `jsonb` không rõ cấu trúc** | `ADMIN_SETTINGS` gộp 14 khoá | Chốt cấu trúc trước khi viết API cài đặt |

## G. Câu hỏi cần người dùng xác nhận

| # | Câu hỏi | Ảnh hưởng |
|---|---|---|
| Q1 | Quản lý Học viên/Giáo viên/Nhân viên dùng **một endpoint hợp nhất** hay **ba endpoint riêng**? | Thiết kế API Mốc 3 |
| Q2 | **Phụ huynh** có tài khoản đăng nhập riêng trong phạm vi lần này không? | Vai trò, route, bảng `users` |
| Q3 | Trạng thái `active/paused/finished/dropped` là của **học viên** hay của **lần ghi danh**? Hai bảng cần hai tập trạng thái khác nhau | `students.status` vs `enrollments.status` |
| Q4 | Nhân viên soạn bài rồi **admin duyệt** hay **nhân viên tự đăng**? | `posts.status`, Mốc 3 |
| Q5 | Có cần màn **tạo lớp học** ở khu vực quản trị không? | Mốc 3 |
| Q6 | Khung giờ **Ca 7 và Ca 8 chồng nhau** — trung tâm dùng khung giờ nào thật? | Bảng `time_slots` |
| Q7 | Có giữ cơ chế **khoá bản ghi để tránh sửa chéo** (`row_version`) không? | Mốc 2/3 |
| Q8 | Điểm lưu **một điểm tổng** hay **4 kỹ năng + nhận xét**? | `assessments`/`scores`, 2 màn học |
| Q9 | Tập trạng thái tài khoản nào là chính thức? | `users.status` |
| Q10 | Có chấp nhận giá trị `identityNo` (CMND/CCCD) trong hồ sơ không? Cần mã hoá/lưu ý riêng | Bảng `students`, quyền đọc |
| Q11 | Có **hoàn phí / công nợ âm** không, và ai có quyền duyệt? | `refunds`, `daily_cash_closings` |
| Q12 | Có khoá sửa **điểm/điểm danh** sau thời hạn không, ai được mở khoá? | `settings.attendance_lock_days` |