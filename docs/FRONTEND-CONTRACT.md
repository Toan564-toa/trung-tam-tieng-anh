# Hợp đồng dữ liệu frontend ↔ backend

Mục đích: để phase NỐI **chỉ thay nguồn dữ liệu**, không phải đổi giao diện.
Nguồn: mã nguồn `frontend/src/` (route, menu, kiểu dữ liệu trong `src/data/`) + `AGENTS.md`.

Trạng thái: **khung P0 + điền sơ bộ từ mã nguồn; chưa đối chiếu `docs/spec/` (đang thiếu) → các mục cần xác nhận gắn
`[CẦN XÁC NHẬN]`.** Phase P1 sẽ rà lại từng màn và đánh dấu xác nhận.

---

## A. Nguyên tắc
1. Component **không gọi `fetch` trực tiếp**; mọi request đi qua hook trong `src/api/` (chưa tồn tại — sẽ tạo ở P7).
2. Tên trường JSON **bám đúng** tên biến trong `frontend/src/data/*.ts` để phase NỐI hầu như không phải ánh xạ.
3. Tiền là **số nguyên VND**. Thời gian trả về ISO 8601 UTC; frontend đã có `src/lib/date.ts` để hiển thị giờ Việt Nam.
4. Mọi danh sách trả `{ items, page, pageSize, total, totalPages }` (mặc định 20, tối đa 100).
5. Trạng thái trong UI dùng **chuỗi tiếng Việt không dấu** khoảng (`"đang học"`) hoặc mã tiếng Anh (`"active"`) tuỳ màn;
   API trả **mã tiếng Anh**, mapping nằm ở tầng hook (`src/api`), không đưa vào component.
6. Backend không bao giờ trả `passwordHash` hay trường nội bộ; chỉ trả đúng trường trong tài liệu này.

---

## B. Danh sách màn hình (46 màn + landing)

### B1. Công khai
| Route | Màn hình | Dữ liệu | Endpoint dự kiến |
| --- | --- | --- | --- |
| `/` | Landing page: khoá học nổi bật, giáo viên, tin tức, đánh giá, số liệu, form tư vấn | `landing` | `GET /api/public/landing` |
| `/dang-nhap` | Đăng nhập học viên / giáo viên / nhân viên | `AuthUser` | `POST /api/auth/login` |
| `/admin/dang-nhap` | Đăng nhập quản trị | `AuthUser` | `POST /api/auth/login` (scope `admin`) |
| `/doi-mat-khau` | Đổi mật khẩu (bắt buộc khi `mustChangePassword`) | `AuthUser` | `POST /api/auth/change-password` |
| `*` | 404 | — | — |

### B2. Học viên (`/hoc-vien`, `RequireRole: student`)
| Route | Màn hình | Dữ liệu chính | Endpoint dự kiến | Bộ lọc/sắp xếp |
| --- | --- | --- | --- | --- |
| `/hoc-vien` | Tổng quan: lớp đang học, buổi sắp tới, điểm TB, công nợ, thông báo | `StudentProfile`, `Lesson[]`, `Announcement[]`, `ScoreRow[]` | `GET /api/students/me`, `GET /api/students/me/summary` | — |
| `/hoc-vien/lich-trinh` | Lịch trình (lịch tuần/tháng) | `CalendarEvent[]` | `GET /api/events?scope=me&from=&to=` | `from`, `to`, `type` |
| `/hoc-vien/bang-diem` | Bảng điểm | `ScoreRow[]` | `GET /api/students/me/scores` | `kind` |
| `/hoc-vien/bai-tap` | Bài tập | `Assignment[]` | `GET /api/students/me/assignments` | `status` |
| `/hoc-vien/hoc-phi` | Học phí: khoản phải thu, đã thu, còn nợ, lịch sử phiếu thu | `Invoice[]`, `Payment[]` | `GET /api/students/me/invoices`, `GET /api/students/me/payments` | `status` |
| `/hoc-vien/thoi-gian-hoc` | Thời gian học: lịch sử điểm danh | `Lesson[]` | `GET /api/students/me/attendance` | `status`, `from`, `to` |
| `/hoc-vien/thong-tin-ca-nhan` | Hồ sơ + phụ huynh | `StudentProfile`, `Guardian[]` | `GET /api/students/me`, `PATCH /api/students/me` | — |

### B3. Giáo viên (`/giao-vien`, `RequireRole: teacher`)
| Route | Màn hình | Dữ liệu chính | Endpoint dự kiến | Bộ lọc |
| --- | --- | --- | --- | --- |
| `/giao-vien` | Tổng quan: lớp hôm nay, việc cần làm | `TeacherClass[]`, `TeacherEvent[]` | `GET /api/teachers/me/summary` | — |
| `/giao-vien/lop-hoc` | Danh sách lớp của tôi | `TeacherClass[]` | `GET /api/classes?teacherId=me` | `status` |
| `/giao-vien/lop-hoc/:classId` | Chi tiết lớp: học viên, buổi học, điểm | `TeacherClass`, `TeacherStudent[]`, `ClassLesson[]` | `GET /api/classes/:id`, `GET /api/classes/:id/students`, `GET /api/classes/:id/sessions` | — |
| `/giao-vien/hoc-vien` | Học viên trong lớp tôi | `TeacherStudent[]` | `GET /api/students?scope=my-classes` | `query`, `classId` |
| `/giao-vien/hoc-vien/:studentId` | Hồ sơ học viên (chỉ đọc phần liên quan lớp) | `TeacherStudent` | `GET /api/students/:id` | — |
| `/giao-vien/diem-danh` | Điểm danh theo lớp/ngày | `ClassLesson[]`, `marks` | `GET /api/classes/:id/sessions?date=`, `POST /api/attendances` | `classId`, `date` |
| `/giao-vien/nhap-diem` | Nhập điểm bài kiểm tra | `TeacherTest[]`, `scores` | `GET /api/classes/:id/tests`, `PUT /api/tests/:id/scores` | `classId` |
| `/giao-vien/lich-trinh` | Lịch dạy của tôi | `TeacherEvent[]` | `GET /api/events?scope=me` | `from`, `to` |
| `/giao-vien/bai-tap` | Bài tập đã giao | `TeacherAssignment[]` | `GET /api/classes/:id/assignments`, `POST /api/assignments` | `classId` |
| `/giao-vien/bang-luong` | Lương của tôi (chỉ kỳ đã chốt) | `PayrollRow[]`, `PayrollTotals` | `GET /api/pay-rolls/me` | `month` |
| `/giao-vien/thong-tin-ca-nhan` | Hồ sơ giáo viên | `TeacherProfile` | `GET /api/teachers/me`, `PATCH /api/teachers/me` | — |

### B4. Nhân viên (`/nhan-vien`, `RequireRole: staff`)
| Route | Màn hình | Dữ liệu chính | Endpoint dự kiến | Bộ lọc |
| --- | --- | --- | --- | --- |
| `/nhan-vien` | Tổng quan: việc hôm nay, lớp sắp mở, học viên cần theo dõi | `StaffTask[]`, `CenterClass[]`, `StaffStudent[]` | `GET /api/staff/me/summary` | — |
| `/nhan-vien/hoc-vien` | Danh sách học viên | `StaffStudent[]` | `GET /api/students` | `query`, `status`, `classId`, `staffId`, `tuition` |
| `/nhan-vien/hoc-vien/:studentId` | Hồ sơ học viên: thông tin, phụ huynh, lớp, học phí, điểm danh, ghi chú | `StaffStudent`, `CareNote[]`, `CenterPayment[]` | `GET /api/students/:id`, `GET /api/students/:id/notes`, `POST /api/students/:id/notes` | — |
| `/nhan-vien/ghi-danh` | Ghi danh học viên vào lớp | `CenterClass[]`, `Course[]` | `POST /api/enrollments` | `courseId`, `classId` |
| `/nhan-vien/hoc-phi` | Thu học phí, in biên lai, công nợ | `CenterPayment[]`, `StaffStudent[]` | `POST /api/payments`, `GET /api/payments?staffId=me` | `query`, `studentId`, `method` |
| `/nhan-vien/khach-tiem-nang` | Kanban khách tiềm năng | `Lead[]` | `GET /api/leads`, `PATCH /api/leads/:id`, `POST /api/leads` | `stage`, `ownerId` |
| `/nhan-vien/lich-trinh` | Lịch trung tâm | `CenterEvent[]` | `GET /api/events` | `from`, `to`, `scope`, `type` |
| `/nhan-vien/bai-dang` | Soạn bài đăng | `Post[]` | `GET /api/posts`, `POST /api/posts`, `PATCH /api/posts/:id` | `status`, `category` |
| `/nhan-vien/bang-luong` | Lương của tôi (chỉ kỳ đã chốt) | `StaffPayrollRow[]` | `GET /api/pay-rolls/me` | `month` |
| `/nhan-vien/thong-tin-ca-nhan` | Hồ sơ nhân viên | `StaffProfile` | `GET /api/staff/me`, `PATCH /api/staff/me` | — |

### B5. Quản trị (`/admin`, `RequireRole: admin`)
| Route | Màn hình | Dữ liệu chính | Endpoint dự kiến | Bộ lọc |
| --- | --- | --- | --- | --- |
| `/admin` | Bảng điều khiển: buổi hôm nay, doanh thu, công nợ, cảnh báo | `TodayLesson[]`, số liệu tổng hợp | `GET /api/dashboard` | `from`, `to` |
| `/admin/tai-khoan` | Tài khoản & phân quyền | `AdminAccount[]` | `GET/POST/PATCH/DELETE /api/users` | `query`, `role`, `status` |
| `/admin/hoc-vien` | Quản lý học viên | `ManagedPerson[]` | `GET /api/students` | `query`, `group`, `status` |
| `/admin/giao-vien` | Quản lý giáo viên | `ManagedPerson[]` | `GET /api/teachers` | `query`, `status` |
| `/admin/nhan-vien` | Quản lý nhân viên | `ManagedPerson[]` | `GET /api/staff` | `query`, `status` |
| `/admin/import` | Nhập Excel (học viên, giáo viên, nhân viên) | kết quả từng dòng | `POST /api/import/:kind` (multipart) | — |
| `/admin/khoa-hoc` | Khóa học | `AdminCourse[]` | `GET/POST/PATCH /api/courses` | `status`, `query` |
| `/admin/lop-hoc` | Lớp học | `CenterClass[]` | `GET/POST/PATCH/DELETE /api/classes` | `status`, `query` |
| `/admin/phong-hoc` | Phòng học | `AdminRoom[]` | `GET/POST/PATCH/DELETE /api/rooms` | `status` |
| `/admin/thoi-khoa-bieu` | Thời khóa biểu tuần + cảnh báo trùng | `TimetableEntry[]`, `TimetableConflict[]` | `GET/PUT /api/timetable` | `weekday`, `classId` |
| `/admin/diem-danh` | Giám sát điểm danh toàn trung tâm | `AttendanceSummary[]` | `GET /api/attendance/summaries` | `classId`, `date`, `locked` |
| `/admin/lich-trinh` | Lịch trình / sự kiện | `CenterEvent[]` | `GET/POST/PATCH/DELETE /api/events` | `scope`, `type` |
| `/admin/hoc-phi` | Học phí & công nợ: khoản phải thu, đối soát tiền mặt, duyệt giảm giá | `AdminInvoice[]`, `CashClose[]`, `DiscountRequest[]` | `GET /api/invoices`, `GET /api/receipts/close-of-day`, `POST /api/discount-requests/:id/approve` | `status`, `kind`, `query` |
| `/admin/bang-luong` | Bảng lương + chốt lương | `AdminPayrollRow[]` | `GET/POST/PATCH /api/pay-rolls`, `POST /api/pay-rolls/:id/close` | `month`, `role`, `status` |
| `/admin/noi-dung` | Nội dung website: banner, giáo viên nổi bật, bài đăng | `LandingBanner[]`, `LandingTeacher[]`, `Post[]` | `GET/PATCH /api/content/*`, `GET/POST /api/posts` | `status` |
| `/admin/bao-cao` | Báo cáo doanh thu, công nợ, sĩ số, tuyển sinh, giờ dạy | số liệu tổng hợp | `GET /api/reports/:kind` | `from`, `to`, `classId`, `teacherId` |
| `/admin/nhat-ky` | Nhật ký thao tác | `AuditLog[]` | `GET /api/audit-logs` | `actor`, `action`, `module`, `from`, `to` |
| `/admin/cai-dat` | Cài đặt trung tâm | `CenterSettings` | `GET/PATCH /api/settings` | — |

---

## C. Hợp đồng dữ liệu (tên trường backend phải trả đúng)

> Các kiểu dưới đây bê nguyên tên trường từ `frontend/src/data/*.ts`. Trường chưa có trong frontend thì để trong
> `LỆCH HỢP ĐỒNG` (mục F) chứ không tự thêm.

### C1. Xác thực — `AuthUser`
```ts
type AuthUser = {
  id: string; username: string; email: string; name: string
  role: "student" | "teacher" | "staff" | "admin"
  mustChangePassword: boolean
}
```
`POST /api/auth/login` nhận `{ identifier, password, scope: "client" | "admin" }` → trả `AuthUser`.

### C2. Hồ sơ
```ts
type StudentProfile = { studentId, fullName, birthDate, gender: "Nam"|"Nữ", email, phone, address,
  identityNo, occupation, level, startDate, status, avatar }
type Guardian = { fullName, relation, phone, email, occupation, address }
type TeacherProfile = { id, fullName, email, phone, specialty, certificate, experience, startDate, education, bio, avatar }
type StaffProfile = { id, fullName, email, phone, position, department, startDate, education, bio, avatar }
```
Lưu ý: `StudentProfile` dùng **`studentId`** (mã học viên) khác `id` (khoá chính). Backend phải trả cả hai khi cần.

### C3. Lớp học và buổi học
```ts
type TeacherClass = { id, name, code, course, level, room, weekdays: number[], time,
  studentCount, maxStudents, totalLessons, doneLessons, startDate, endDate,
  status: "active"|"finishing"|"closed", tone }
type ClassLesson = { id, classId, no, date, time, topic, unit, marked, lockedAt, note,
  marks: Record<studentId, "present"|"absent"|"late"|"excused"> }
```
`tone` (`"brand" | "info" | "success"`) là **màu hiển thị** → quyết định ở frontend từ `status`, **không** yêu cầu
backend trả.

### C4. Điểm danh
```ts
type AttendanceStatus = "present"|"absent"|"late"|"excused"|"upcoming"
type Lesson = { no, date, time, topic, unit, status }
type AttendanceSummary = { classId, className, teacherName, room, weekday, time,
  total, present, late, absent, excused, locked, lastLessonNo, date }
```

### C5. Điểm số và bài tập
```ts
type ScoreRow = { id, kind: "unit"|"mid"|"final", name, date,
  listening, reading, writing, speaking, average, comment }
type TeacherTest = { id, classId, name, kind: "unit"|"mid"|"final"|"quiz", date, maxScore,
  scores: Record<studentId, string> }
type Assignment = { id, title, className, dueDate, status: "submitted"|"due"|"late"|"overdue",
  submittedAt, note }
type TeacherAssignment = { id, classId, title, deadline, description, createdAt, createdBy }
```

### C6. Học phí và công nợ
```ts
type Payment = { id, date, amount, method: "Tiền mặt"|"Chuyển khoản"|"Thẻ ATM"|"Ví điện tử",
  receiptNo, note }
type CenterPayment = { id, studentId, date, amount, method, receiptNo, note, collectorId, forInvoice }
type AdminInvoice = { id, code, studentId, studentName, className, dueDate, total, paid,
  status: "unpaid"|"partial"|"paid"|"overdue",
  kind: "Học phí"|"Tài liệu"|"Đồng phụ"|"Phí gửi xe" }
type StaffStudent = { …, tuition: { status: "paid"|"partial"|"due-soon"|"overdue", … } }
type CashClose = { staffId, staffName, date, shift, totalCollected, cashOnHand,
  bankTransfer, status: "balanced"|"pending"|"diff", note }
type DiscountRequest = { id, studentName, className, kind: "Giảm giá"|"Hoàn phí", reason,
  amount, requestedBy, requestedAt, status: "pending"|"approved"|"rejected" }
```
`method` và `kind` đang là **chuỗi tiếng Việt có dấu** ở frontend → API trả mã `"CASH"|"TRANSFER"|"CARD"|"EWALLET"`,
mapping ở `src/api`. `status` của học viên: `"active"|"paused"|"finished"|"dropped"`.

### C7. Lương
```ts
type PayrollRow = { month, key /* "2026-09" */, status: "draft"|"pending"|"approved",
  lessonRate, bonusPerLesson, breakdown: { classId, className, lessons }[],
  adjustments: { label, amount }[] }
type PayrollTotals = { totalLessons, baseAmount, bonusAmount, adjustmentAmount, total }
type StaffPayrollRow = { id, month, key, status, baseSalary,
  items: { label, amount, hint? }[] }
type AdminPayrollRow = { id, month, staffId, staffName, role: "teacher"|"staff",
  base, bonus, deduction, status, locked, note }
```

### C8. Lịch trình / sự kiện
```ts
type CalendarEvent = { id, date, type: "lesson"|"exam"|"holiday"|"event", title, subtitle, time, location, description }
type TeacherEvent = { id, type: "lesson"|"exam"|"class"|"center", title, date, startTime, endTime,
  location, audience, description, own }
type CenterEvent = { id, type: "lesson"|"exam"|"holiday"|"event"|"training", title, date,
  startTime, endTime, location, scope: "all"|"teachers"|"staff"|"classes", classIds: string[],
  description, createdBy }
```

### C9. Tài khoản và nhân sự
```ts
type AdminAccount = { id, username, fullName, email, phone, role: "student"|"teacher"|"staff"|"admin",
  status: "active"|"locked"|"pending"|"archived", lastLogin, createdAt, deletedAt }
type ManagedPerson = { id, code, fullName, email, phone, group, status: "active"|"inactive", joinedAt, deletedAt }
type StaffMember = { id, fullName, role, phone, avatar }
```

### C10. Đào tạo và cấu hình
```ts
type AdminCourse = { id, name, level, lessons, tuition, enrolled, target,
  status: "published"|"draft"|"archived", updatedAt }
type AdminRoom = { id, name, capacity, floor, equipment: string[], status: "available"|"maintenance" }
type TimetableEntry = { id, classId, roomId, teacherId, slotId, weekday }
type TimetableConflict = { kind: "room"|"teacher", message, entry: TimetableEntry }
type CenterSettings = { name, address, phone, email, taxCode, academicYear, academicStart,
  academicEnd, attendanceLockDays, receiptHeader, receiptFooter, allowSelfEnroll,
  requirePasswordChange, notifyParentOnPayment }
type TodayLesson = { classId, className, room, time, slotId, teacherName, studentCount,
  status: "done"|"ongoing"|"upcoming", attendanceDone }
```

### C11. Nội dung, khách hàng, nhật ký
```ts
type Post = { id, title, excerpt, content, cover, category, date, facebookUrl,
  status: "draft"|"published", author }
type LandingBanner = { id, title, subtitle, cta, image, status: "published"|"pending"|"draft", updatedAt }
type LandingTeacher = { id, name, specialty, certificate, experience, photo, status }
type Lead = { id, fullName, phone, email, age,
  source: "Facebook"|"Website"|"Zalo"|"Giới thiệu"|"Khách vãng lai",
  interestedClassId, ownerId, createdAt, expectedFee,
  stage: "new"|"called"|"trial"|"won"|"lost", nextFollowUp,
  notes: { id, date, author, body, result: "connected"|"no-answer"|"busy"|"callback" }[] }
type CareNote = { id, date, author, title, body, tone: "info"|"warning"|"success"|"danger" }
type AuditLog = { id, time, actor, actorRole, action: "create"|"update"|"delete"|"login"|"export"|"import"|"approve"|"lock",
  module, detail, ip }
type AppNotification = { id, title, description, time, tone, unread, href }
```
`AppNotification` **chưa cần** endpoint riêng ở P0; nếu làm thì thêm `GET /api/notifications`.

---

## D. Quy ước vận hành
- **Phân trang**: màn nào có bảng > 20 dòng thì phải có `page`/`pageSize` trên bảng (hiện frontend còn tải toàn bộ).
- **Tìm kiếm**: `query` (không phân biệt hoa thường), tối thiểu tìm theo tên + mã + email + SĐT.
- **Sắp xếp ổn định**: luôn có `orderBy` có tiebreaker (`id`) để phân trang không nhảy dòng.
- **Tải tệp**: `avatar`, `cover`, hồ sơ lưu URL tương đối qua endpoint `GET /api/files/:key` (xem `src/components/common/smart-image.tsx`).
- **Excel**: import trả kết quả từng dòng; export trả file CSV/XLSX (frontend đã có `src/lib/excel.ts`, `src/lib/admin-excel.ts`).
- **Lỗi**: mọi màn phải có trạng thái đang tải / rỗng / lỗi / thành công (tiêu chí ở `AGENTS.md` mục 10).
- **Không lộ stack trace** ra client ở production.

---

## E. Ánh xạ nhanh màn hình → module backend
| Màn hình | Module backend | Ghi chú |
| --- | --- | --- |
| Đăng nhập, đổi mật khẩu | `auth` | cookie httpOnly (D-002) |
| Tài khoản, import | `users` | phân quyền `admin` |
| Học viên, ghi danh, ghi chú | `students`, `enrollments` | ghi danh chỉ `staff`+`admin` |
| Lớp, phòng, thời khóa biểu, khóa học | `classes`, `rooms`, `timetable`, `courses` | kiểm tra trùng phòng/GV |
| Điểm danh | `sessions`, `attendances` | khoá sau N ngày → 423 |
| Điểm, bài tập | `grades`, `assignments` | giáo viên chỉ lớp mình |
| Học phí, phiếu thu, giảm giá | `tuition` | `payments` chỉ thêm |
| Lương | `payroll` | chốt thì khoá |
| Lịch trình, bài đăng, khách tiềm năng | `events`, `content`, `leads` | nội dung cần duyệt |
| Dashboard, báo cáo, nhật ký, cài đặt | `reports`, `audit`, `settings` | số liệu tính ra bằng view/truy vấn |

---

## F. Lệch hợp đồng đã phát hiện (xử lý ở phase NỐI)
| # | Vấn đề | Nơi | Hướng xử lý |
| --- | --- | --- | --- |
| 1 | Phiên đăng nhập lưu `AuthUser` trong `localStorage` (`ttnn.auth.user`) | `src/lib/auth/auth-context.tsx:5,36` | Mốc 1: bỏ localStorage, chuyển sang cookie httpOnly + `GET /api/auth/me` |
| 2 | Chưa có thư mục `src/api/`; dữ liệu lấy thẳng từ `src/data/*.ts` | toàn bộ `src/pages` | Tạo hook `src/api` từng module ở các phase NỐI |
| 3 | `AdminAccount.deletedAt` là `string` rỗng thay vì `null` | `src/data/admin.ts` | Backend trả `null`; hook chuẩn hoá về `null` |
| 4 | Mã tiền tệ / thứ tự mảng `breakdown`, `items` lương phụ thuộc thứ tự dữ liệu giả | `src/data/teacher.ts`, `src/data/staff.ts` | Backend trả theo thứ tự ổn định (theo tên lớp / theo mục tăng dần) |
| 5 | `Payment.method` là chuỗi tiếng Việt có dấu | `src/data/student.ts`, `staff.ts` | API trả mã `CASH\|TRANSFER\|CARD\|EWALLET`, mapping trong hook |
| 6 | `tone` hiển thị được frontend tính từ `status` | `teacher.ts`, `staff.ts` | Không yêu cầu backend trả `tone` |
| 7 | `gender` là `"Nam" \| "Nữ"` | `student.ts`, `staff.ts`, `teacher.ts` | API trả `"MALE" \| "FEMALE"`, mapping trong hook |
| 8 | Danh sách học viên tải toàn bộ, chưa phân trang | `src/data/staff.ts` (`filterStudents`) | Mốc 2/3: dùng `page`/`pageSize` |