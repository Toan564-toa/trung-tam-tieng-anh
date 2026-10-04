# Web app quản lý trung tâm ngoại ngữ

Tài liệu tổng hợp: chức năng theo mức ưu tiên, vai trò và phân quyền, thiết kế database.

---

## 1. Tổng quan

Hệ thống gồm hai phần:

- **Website công khai**: giới thiệu trung tâm, khóa học, liên hệ, đăng ký tư vấn.
- **Hệ thống quản lý nội bộ** (cần đăng nhập): học viên, lớp học, điểm danh, học phí, tuyển sinh, báo cáo.

### Các vai trò người dùng

| Vai trò | Mô tả |
|---|---|
| **Admin** | Quản lý toàn bộ hệ thống, tài khoản, học phí, báo cáo |
| **Nhân viên (staff)** | Quản lý học viên, tư vấn tuyển sinh, ghi danh, thu học phí (không phải giáo viên) |
| **Giáo viên (teacher)** | Xem lớp của mình, điểm danh, nhập điểm |
| **Học viên/Phụ huynh** | Xem lịch học, điểm, học phí (giai đoạn sau) |

---

## 2. Chức năng theo mức ưu tiên

### 2.1. Phải có (MVP)

**Hệ thống nền**
- Đăng nhập, đăng xuất, phân quyền theo vai trò (Admin, Nhân viên, Giáo viên)
- Quản lý tài khoản người dùng

**Trang công khai**
- Giới thiệu trung tâm, danh sách khóa học, thông tin liên hệ
- Form đăng ký tư vấn (dữ liệu đổ về cho văn phòng)

**Quản lý học viên**
- Thêm, sửa, xóa, tìm kiếm hồ sơ (họ tên, ngày sinh, số điện thoại, phụ huynh)
- Gán nhân viên phụ trách học viên

**Quản lý khóa học và lớp học**
- Danh mục khóa học (tên, thời lượng, học phí niêm yết)
- Tạo lớp: giáo viên, phòng, lịch học, sĩ số tối đa
- Ghi danh học viên vào lớp

**Điểm danh**
- Giáo viên điểm danh theo buổi: có mặt, vắng, đi muộn, vắng có phép

**Học phí cơ bản**
- Ghi nhận khoản thu theo học viên, số tiền đã đóng, còn nợ
- Xuất biên lai đơn giản

### 2.2. Nên có

- **Quản lý giáo viên và nhân viên**: hồ sơ, lịch dạy, lương theo buổi hoặc theo giờ
- **Quản lý phòng học và thời khóa biểu**: phát hiện trùng lịch phòng, trùng giáo viên
- **Điểm số và nhận xét**: bài kiểm tra định kỳ, kết quả cuối khóa
- **Quản lý khách hàng tiềm năng (lead)**: theo dõi từ lúc đăng ký tư vấn đến khi chốt học
- **Học phí nâng cao**: chia đợt, giảm giá, học bổng, hoàn phí
- **Báo cáo thống kê**: doanh thu, công nợ, sĩ số, tỷ lệ chuyên cần
- **Nhật ký thao tác**: ai sửa gì, lúc nào
- **Xuất Excel/PDF** cho danh sách và báo cáo

### 2.3. Nâng cao

- **Cổng học viên/phụ huynh**: xem lịch học, điểm, học phí, thông báo
- **Thông báo tự động**: nhắc lịch học, nhắc đóng học phí qua email, SMS hoặc Zalo
- **Điểm danh thông minh**: quét mã QR, sau đó là face ID
- **Thanh toán online**: chuyển khoản qua mã QR ngân hàng, cổng thanh toán, tự động đối soát
- **Bài tập và tài liệu**: giáo viên đăng tài liệu, học viên nộp bài
- **Học bù và bảo lưu**: quản lý buổi học bù, bảo lưu khóa học
- **Ứng dụng di động** hoặc PWA
- **Phân tích nâng cao**: dự báo học viên bỏ học, đánh giá hiệu quả giáo viên

> **Lưu ý về face ID:** làm được nhưng phức tạp hơn hẳn các phần khác và liên quan đến dữ liệu sinh trắc học, cần cân nhắc quyền riêng tư và sự đồng ý của học viên. Nên bắt đầu bằng điểm danh thủ công hoặc QR, thêm face ID khi hệ thống đã chạy ổn.

---

## 3. Phân quyền gợi ý

| Chức năng | Admin | Nhân viên | Giáo viên |
|---|---|---|---|
| Quản lý tài khoản, phân quyền | ✅ | ❌ | ❌ |
| Hồ sơ học viên | Toàn bộ | Xem/sửa (xóa cần admin) | Chỉ học viên lớp mình |
| Tạo lớp, xếp lịch | ✅ | Có thể | ❌ |
| Ghi danh học viên | ✅ | ✅ | ❌ |
| Điểm danh | ✅ | Sửa hộ khi cần | Lớp mình dạy |
| Thu học phí, in biên lai | ✅ | ✅ | ❌ |
| Giảm giá, hoàn phí | ✅ | Cần admin duyệt | ❌ |
| Khách tiềm năng (leads) | ✅ | ✅ | ❌ |
| Báo cáo doanh thu, lương | ✅ | ❌ hoặc giới hạn | ❌ |

Nguyên tắc: các thao tác liên quan đến tiền (giảm giá, hoàn phí, xóa) nên để admin duyệt. Nếu sau này cần chia quyền chi tiết hơn (ví dụ thu ngân khác nhân viên tư vấn), thêm bảng `permissions` và `role_permissions`.

---

## 4. Thiết kế database (giai đoạn "Phải có")

Gồm 16 bảng chính. Các cột chỉ là cột chính, chưa liệt kê hết.

### 4.1. Hệ thống

| Bảng | Cột chính |
|---|---|
| **users** | id, email/username, mật khẩu (đã băm), role (`admin`/`staff`/`teacher`), trạng thái, lần đăng nhập cuối |
| **audit_logs** | id, user_id, hành động, bảng bị sửa, dữ liệu cũ/mới, thời gian |

> Nếu cần bảng `roles` riêng hoặc một người có nhiều vai trò, thêm `roles` và `user_roles`. Với 3 vai trò cố định, cột `role` trong `users` là đủ.

### 4.2. Con người

| Bảng | Cột chính |
|---|---|
| **students** | id, họ tên, ngày sinh, giới tính, SĐT, email, địa chỉ, ghi chú, trạng thái (đang học/nghỉ/bảo lưu), **advisor_id** (nhân viên phụ trách) |
| **guardians** | id, student_id, họ tên, quan hệ, SĐT |
| **teachers** | id, user_id, họ tên, SĐT, chuyên môn, mức lương/giờ, trạng thái |
| **staff** | id, user_id, họ tên, SĐT, email, chức vụ (tư vấn, chăm sóc học viên, thu ngân, kế toán...), ngày vào làm, trạng thái |

> Nếu một người vừa dạy vừa làm văn phòng: cho phép nhiều role qua `user_roles`, hoặc gộp thành bảng `employees` (thông tin chung) và để `teachers` chỉ giữ thông tin riêng của giáo viên.

> Nếu một học viên do nhiều nhân viên chăm sóc, hoặc cần lưu lịch sử chuyển giao: thêm bảng **student_assignments** (student_id, staff_id, từ ngày, đến ngày).

### 4.3. Đào tạo

| Bảng | Cột chính |
|---|---|
| **courses** | id, tên khóa, cấp độ, số buổi, học phí niêm yết, mô tả |
| **rooms** | id, tên phòng, sức chứa |
| **classes** | id, course_id, teacher_id, room_id, tên lớp, ngày bắt đầu/kết thúc, sĩ số tối đa, trạng thái |
| **class_schedules** | id, class_id, thứ trong tuần, giờ bắt đầu, giờ kết thúc (lịch lặp hằng tuần) |
| **enrollments** (ghi danh) | id, student_id, class_id, ngày ghi danh, trạng thái, học phí áp dụng, **created_by** (nhân viên ghi danh) |
| **sessions** (buổi học cụ thể) | id, class_id, ngày, giờ, giáo viên dạy, trạng thái (đã học/hủy/học bù) |
| **attendance** | id, session_id, student_id, trạng thái (có mặt/vắng/muộn/có phép), ghi chú |

### 4.4. Học phí

| Bảng | Cột chính |
|---|---|
| **invoices** (khoản phải thu) | id, enrollment_id, tổng tiền, giảm giá, hạn đóng, trạng thái |
| **payments** (lần thu tiền) | id, invoice_id, số tiền, ngày đóng, phương thức (tiền mặt/chuyển khoản), **collected_by** (nhân viên thu), số biên lai |

### 4.5. Tuyển sinh

| Bảng | Cột chính |
|---|---|
| **leads** | id, họ tên, SĐT, email, khóa quan tâm, nguồn, trạng thái (mới/đã gọi/đã chốt), ghi chú, **assigned_to** (nhân viên chăm sóc) |

> Nội dung trang giới thiệu (tin tức, banner) có thể để file tĩnh ở giai đoạn đầu, chưa cần bảng.

### 4.6. Cột "ai phụ trách" liên quan đến nhân viên

| Bảng | Cột thêm | Ý nghĩa |
|---|---|---|
| students | `advisor_id` | Nhân viên phụ trách học viên |
| leads | `assigned_to` | Nhân viên đang chăm sóc khách tiềm năng |
| enrollments | `created_by` | Ai ghi danh |
| payments | `collected_by` | Ai thu tiền (đối soát cuối ngày) |
| audit_logs | `user_id` | Ghi lại mọi thao tác của người dùng |

---

## 5. Quan hệ giữa các bảng

```
users 1─1 teachers
users 1─1 staff
courses 1─n classes 1─n sessions 1─n attendance n─1 students
classes 1─n class_schedules
classes 1─n enrollments n─1 students
enrollments 1─n invoices 1─n payments
teachers 1─n classes
rooms 1─n classes
students 1─n guardians
staff 1─n students (advisor_id)
staff 1─n leads (assigned_to)
staff 1─n payments (collected_by)
```

Điểm mấu chốt: **enrollments** là cầu nối giữa học viên và lớp (quan hệ nhiều-nhiều), và học phí gắn vào đây chứ không gắn thẳng vào học viên.

---

## 6. Nguyên tắc thiết kế cần nhớ

- **Tách `invoices` và `payments`**: một khoản phải thu có thể đóng nhiều đợt; công nợ = tổng phải thu − tổng đã đóng.
- **Tách `class_schedules` và `sessions`**: lịch lặp là "quy tắc", buổi học cụ thể mới là thứ để điểm danh, hủy hay dạy bù.
- **Tiền lưu dạng số nguyên** (VND không có số lẻ) để tránh sai số.
- **Xóa mềm**: thêm cột `deleted_at` thay vì xóa hẳn dữ liệu học viên hay thanh toán.
- Mỗi bảng có `created_at`, `updated_at`.
- Mật khẩu luôn băm, không lưu dạng thô.

---

## 7. Các bảng cho giai đoạn sau

| Chức năng | Bảng |
|---|---|
| Điểm số | `assessments`, `scores` |
| Thông báo | `notifications` |
| Học bù, bảo lưu | `makeup_sessions`, `enrollment_freezes` |
| Face ID | `face_templates` (tách riêng và mã hóa, vì là dữ liệu sinh trắc học) |
| Lương giáo viên/nhân viên | `payroll` |
| Phân quyền chi tiết | `permissions`, `role_permissions` |
| Phụ huynh/học viên đăng nhập | mở rộng `users` hoặc thêm `user_roles` |

---

## 8. Lộ trình đề xuất

| Giai đoạn | Nội dung |
|---|---|
| **1 (MVP)** | Đăng nhập theo vai trò, học viên, lớp học, điểm danh thủ công, học phí cơ bản, trang giới thiệu |
| **2** | Điểm số, báo cáo, quản lý leads, thời khóa biểu, cổng học viên/phụ huynh, thông báo |
| **3** | Điểm danh QR/face ID, thanh toán online, học bù/bảo lưu |

## 9. Bước tiếp theo

1. Chốt danh sách chức năng và số lượng nhân viên/nhóm việc.
2. Vẽ sơ đồ quan hệ (ERD) và viết SQL tạo bảng (chọn PostgreSQL hoặc MySQL).
3. Vẽ luồng người dùng và phác thảo giao diện (wireframe).
4. Chọn công nghệ và xây dựng bản MVP.
5. Triển khai lên web (Vercel, Netlify hoặc VPS) và gắn tên miền.
