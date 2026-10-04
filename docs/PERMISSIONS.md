# Ma trận phân quyền

> **Phase 1.** Đã đối chiếu 3 nguồn: `AGENTS.md` mục 7 · mã nguồn `frontend/src/layouts/` (`NAV_BY_ROLE`, `ADMIN_NAV`),
> `RequireRole` trong `src/app/require-role.tsx` · đặc tả `docs/spec/quan-ly-trung-tam-ngoai-ngu.md` và
> `docs/spec/thiet-ke-database-day-du.md`. Bản P0 (chỉ dựa trên mã frontend) được thay bằng bản này; xem D-008.

4 vai trò: **Học viên (student)**, **Giáo viên (teacher)**, **Nhân viên (staff)**, **Quản trị (admin)**.
DB dùng `roles` + `user_roles` (quan hệ nhiều–nhiều) nhưng giao diện chỉ có `AuthUser.role` đơn lẻ → xem Q2/Q3.

Nguyên tắc bắt buộc (AGENTS.md mục 7):
1. Phân quyền kiểm tra ở **backend** cho mọi yêu cầu: theo vai trò (`requireRole`) **và** theo dữ liệu.
2. Ẩn menu ở frontend **không phải** bảo mật.
3. Không tin giá trị từ client cho user id, teacher id, vai trò, số tiền đã tính.

Ký hiệu: ✅ được phép · 🔒 chỉ dữ liệu của chính mình / lớp mình phụ trách · ❌ không được phép · ➕ chỉ tạo (không sửa/xoá)

---

## 0. Menu → route → quyền yêu cầu

Nguồn chính xác: `layouts/client-layout.tsx` (`NAV_BY_ROLE`), `layouts/admin-layout.tsx` (`ADMIN_NAV`), `app/router.tsx`.

| Menu | Route | Học viên | Giáo viên | Nhân viên | Quản trị |
|---|---|---|---|---|---|
| Tổng quan | `/hoc-vien` | ✅ | — | — | — |
| Lịch trình | `/hoc-vien/lich-trinh` | ✅ | — | — | — |
| Bảng điểm | `/hoc-vien/bang-diem` | ✅ | — | — | — |
| Bài tập | `/hoc-vien/bai-tap` | ✅ | — | — | — |
| Học phí | `/hoc-vien/hoc-phi` | ✅ | — | — | — |
| Thời gian học | `/hoc-vien/thoi-gian-hoc` | ✅ | — | — | — |
| Thông tin cá nhân | `/hoc-vien/thong-tin-ca-nhan` | ✅ | — | — | — |
| Tổng quan (GV) | `/giao-vien` | — | ✅ | — | — |
| Lớp của tôi | `/giao-vien/lop-hoc` | — | ✅ | — | — |
| *Chi tiết lớp* (không có trong menu) | `/giao-vien/lop-hoc/:classId` | — | 🔒 lớp mình | — | — |
| Điểm danh | `/giao-vien/diem-danh` | — | 🔒 lớp mình | — | — |
| Nhập điểm | `/giao-vien/nhap-diem` | — | 🔒 lớp mình | — | — |
| Học viên | `/giao-vien/hoc-vien` | — | 🔒 lớp mình | — | — |
| *Chi tiết học viên* (không có trong menu) | `/giao-vien/hoc-vien/:studentId` | — | 🔒 lớp mình | — | — |
| Lịch trình (GV) | `/giao-vien/lich-trinh` | — | ✅ | — | — |
| Giao bài tập | `/giao-vien/bai-tap` | — | 🔒 lớp mình | — | — |
| Bảng lương (GV) | `/giao-vien/bang-luong` | — | 🔒 của mình | — | — |
| Thông tin cá nhân (GV) | `/giao-vien/thong-tin-ca-nhan` | — | 🔒 | — | — |
| Tổng quan (NV) | `/nhan-vien` | — | — | ✅ | — |
| Học viên (NV) | `/nhan-vien/hoc-vien` | — | — | 🔒 HV được phụ trách | — |
| *Chi tiết học viên* (không có trong menu) | `/nhan-vien/hoc-vien/:studentId` | — | — | 🔒 HV được phụ trách | — |
| Ghi danh | `/nhan-vien/ghi-danh` | — | — | ✅ | — |
| Thu học phí | `/nhan-vien/hoc-phi` | — | — | ✅ | ✅ |
| Khách tiềm năng | `/nhan-vien/khach-tiem-nang` | — | — | 🔒 của mình | ✅ |
| Lịch trình (NV) | `/nhan-vien/lich-trinh` | — | — | ✅ | ✅ |
| Bài đăng | `/nhan-vien/bai-dang` | — | — | ➕ (xem Q4) | ✅ |
| Bảng lương (NV) | `/nhan-vien/bang-luong` | — | — | 🔒 của mình | ✅ |
| Thông tin cá nhân (NV) | `/nhan-vien/thong-tin-ca-nhan` | — | — | 🔒 | — |
| Bảng điều khiển | `/admin` | — | — | — | ✅ |
| Báo cáo | `/admin/bao-cao` | — | — | — | ✅ |
| Nhật ký thao tác | `/admin/nhat-ky` | — | — | — | ✅ |
| Tài khoản & phân quyền | `/admin/tai-khoan` | — | — | — | ✅ |
| Học viên (admin) | `/admin/hoc-vien` | — | — | — | ✅ |
| Giáo viên (admin) | `/admin/giao-vien` | — | — | — | ✅ |
| Nhân viên (admin) | `/admin/nhan-vien` | — | — | — | ✅ |
| Nhập Excel | `/admin/import` | — | — | — | ✅ |
| Khóa học | `/admin/khoa-hoc` | — | — | — | ✅ |
| Lớp học | `/admin/lop-hoc` | — | — | — | ✅ |
| Phòng học | `/admin/phong-hoc` | — | — | — | ✅ |
| Thời khóa biểu | `/admin/thoi-khoa-bieu` | — | — | — | ✅ |
| Điểm danh (admin) | `/admin/diem-danh` | — | — | — | ✅ |
| Lịch trình (admin) | `/admin/lich-trinh` | — | — | — | ✅ |
| Học phí & công nợ | `/admin/hoc-phi` | — | — | — | ✅ |
| Bảng lương (admin) | `/admin/bang-luong` | — | — | — | ✅ |
| Nội dung website | `/admin/noi-dung` | — | — | — | ✅ |
| Cài đặt | `/admin/cai-dat` | — | — | — | ✅ |

**Lưu ý:** 3 route chi tiết (`:classId`, `:studentId` × 2) không có trong menu — phải kiểm tra quyền ở backend
theo quan hệ dữ liệu, không được suy ra từ việc có mục menu hay không.

---

## 1. Tài khoản và xác thực
| Chức năng | Học viên | Giáo viên | Nhân viên | Quản trị |
| --- | --- | --- | --- | --- |
| Đăng nhập / đổi mật khẩu / đăng xuất | ✅ | ✅ | ✅ | ✅ |
| Xem hồ sơ cá nhân của mình | 🔒 | 🔒 | 🔒 | 🔒 |
| Danh sách tài khoản, lọc theo vai trò | ❌ | ❌ | ❌ | ✅ |
| Tạo tài khoản, đổi vai trò | ❌ | ❌ | ❌ | ✅ |
| Khoá / mở khoá tài khoản, đặt lại mật khẩu | ❌ | ❌ | ❌ | ✅ |
| Xem bản ghi đã xoá mềm (`onlyDeleted`) | ❌ | ❌ | ❌ | ✅ |
| Xem mật khẩu tạm của người khác | ❌ | ❌ | ❌ | ❌ (chỉ hiện 1 lần lúc tạo/import) |
| Import tài khoản hàng loạt từ Excel | ❌ | ❌ | ❌ | ✅ |
| Xem nhật ký thao tác | ❌ | ❌ | ❌ | ✅ |

## 2. Học viên và hồ sơ
| Chức năng | Học viên | Giáo viên | Nhân viên | Quản trị |
| --- | --- | --- | --- | --- |
| Xem hồ sơ của mình (bản thân + phụ huynh) | 🔒 | ❌ | ❌ | ✅ |
| Xem hồ sơ học viên trong lớp mình | ❌ | 🔒 | ✅ | ✅ |
| Danh sách/tìm kiếm học viên toàn trung tâm | ❌ | ❌ | ✅ | ✅ |
| Tạo hồ sơ học viên (ghi danh) | ❌ | ❌ | ✅ | ✅ |
| Sửa hồ sơ của học viên | ❌ | ❌ | 🔒 HV được phụ trách | ✅ |
| Sửa hồ sơ của chính mình | 🔒 chỉ `phone,email,address,occupation` | 🔒 | 🔒 | — |
| Tự sửa họ tên / ngày sinh / CCCD | ❌ | ❌ | ❌ | ✅ (qua `profile_change_requests`) |
| Xoá mềm học viên | ❌ | ❌ | ❌ | ✅ `[CẦN XÁC NHẬN]` |
| Ghi chú chăm sóc học viên | ❌ | ❌ | 🔒 HV được phụ trách | ✅ |
| Xem điểm danh của mình | 🔒 | ❌ | ❌ | ✅ |
| Xem tiến độ học (số buổi đã học) của mình | 🔒 | 🔒 (lớp mình) | ✅ | ✅ |
| Xem lịch sử học phí của học viên | ❌ | ❌ | 🔒 HV được phụ trách | ✅ |

## 3. Đào tạo: khóa học, lớp học, phòng học, thời khóa biểu
| Chức năng | Học viên | Giáo viên | Nhân viên | Quản trị |
| --- | --- | --- | --- | --- |
| Xem khóa học / lịch trình công khai | ✅ | ✅ | ✅ | ✅ |
| Xem lớp của mình (lịch, giáo viên, phòng) | 🔒 | 🔒 | ✅ | ✅ |
| Tạo / sửa khóa học | ❌ | ❌ | ❌ | ✅ |
| Tạo / sửa / xoá mềm lớp học | ❌ | ❌ | ❌ | ✅ `[CẦN XÁC NHẬN: UI chưa có nút tạo lớp]` |
| Ghi danh học viên vào lớp | ❌ | ❌ | ✅ | ✅ |
| Quản lý phòng học | ❌ | ❌ | ❌ | ✅ |
| Sửa thời khóa biểu tuần | ❌ | ❌ | ❌ | ✅ |
| Được phép đổi phòng / đổi ca khi đã có lớp khác | ❌ | ❌ | ❌ | ✅ (kiểm tra trùng phòng và trùng giáo viên) |
| Tạo sự kiện / lịch trình | ❌ | ➕ | ➕ | ✅ |
| Duyệt sự kiện trước khi công bố | ❌ | ❌ | ❌ | ✅ `[CẦN XÁC NHẬN]` |

## 4. Điểm danh và kết quả học tập
| Chức năng | Học viên | Giáo viên | Nhân viên | Quản trị |
| --- | --- | --- | --- | --- |
| Điểm danh buổi học | ❌ | 🔒 (lớp mình) | ❌ | ✅ |
| Sửa điểm danh quá hạn | ❌ | ❌ (423 LOCKED) | ❌ | ✅ (mở khoá được) |
| Mở khoá buổi/lớp đã khoá | ❌ | ❌ | ❌ | ✅ (ghi `audit_logs`) |
| Nhập điểm bài kiểm tra | ❌ | 🔒 (lớp mình) | ❌ | ✅ |
| Xem bảng điểm | 🔒 (của mình) | 🔒 (lớp mình) | ✅ | ✅ |
| Giao / thu bài tập | ❌ | 🔒 (lớp mình) | ❌ | ✅ |
| Nộp bài tập | 🔒 | ❌ | ❌ | ❌ |
| Xuất Excel điểm danh / điểm | ❌ | 🔒 (lớp mình) | ✅ | ✅ |

## 5. Học phí và công nợ
| Chức năng | Học viên | Giáo viên | Nhân viên | Quản trị |
| --- | --- | --- | --- | --- |
| Xem học phí của mình, tải phiếu thu | 🔒 | ❌ | ❌ | ✅ |
| Ghi nhận thu học phí, in biên lai | ❌ | ❌ | ✅ | ✅ |
| Tạo khoản phải thu | ❌ | ❌ | ✅ | ✅ |
| Áp giảm giá | ❌ | ❌ | ➕ (gửi yêu cầu) | ✅ (duyệt) |
| Hoàn phí | ❌ | ❌ | ➕ (gửi yêu cầu) | ✅ (duyệt) `[CẦN XÁC NHẬN]` |
| Xem công nợ toàn trung tâm | ❌ | ❌ | 🔒 HV được phụ trách | ✅ |
| Đối soát tiền mặt cuối ngày (theo nhân viên) | ❌ | ❌ | 🔒 (của mình) | ✅ |
| Sửa / xoá phiếu thu đã ghi | ❌ | ❌ | ❌ | ❌ (chỉ tạo bút toán điều chỉnh / hoàn phí) |
| Xuất báo cáo công nợ | ❌ | ❌ | ❌ | ✅ |

## 6. Lương
| Chức năng | Học viên | Giáo viên | Nhân viên | Quản trị |
| --- | --- | --- | --- | --- |
| Xem lương của mình | ❌ | 🔒 | 🔒 | ✅ |
| Xem lương người khác | ❌ | ❌ | ❌ | ✅ |
| Tính / sửa bảng lương (trạng thái nháp) | ❌ | ❌ | ❌ | ✅ |
| Gửi duyệt / chốt lương (khoá) | ❌ | ❌ | ❌ | ✅ |
| Xuất Excel bảng lương | ❌ | ❌ | ❌ | ✅ |

## 7. Khách tiềm năng và nội dung website
| Chức năng | Học viên | Giáo viên | Nhân viên | Quản trị |
| --- | --- | --- | --- | --- |
| Xem landing page, khóa học, giáo viên nổi bật, tin tức | ✅ | ✅ | ✅ | ✅ |
| Quản lý khách tiềm năng (kanban tư vấn) | ❌ | ❌ | 🔒 của mình | ✅ |
| Chuyển khách tiềm năng thành học viên | ❌ | ❌ | ✅ | ✅ |
| Soạn bài đăng | ❌ | ❌ | ✅ | ✅ |
| Xuất bản bài đăng | ❌ | ❌ | ✅ `[CẦN XÁC NHẬN]` | ✅ |
| Duyệt nội dung trước khi hiển thị | ❌ | ❌ | ❌ | ✅ `[CẦN XÁC NHẬN]` |
| Sửa banner landing | ❌ | ❌ | ❌ | ✅ |
| Bật/tắt hiển thị giáo viên trên website | ❌ | ❌ | ❌ | ✅ |
| Gửi yêu cầu tư vấn từ form public | ✅ (công khai) | ✅ | ✅ | ✅ |

## 8. Báo cáo, dashboard, cài đặt
| Chức năng | Học viên | Giáo viên | Nhân viên | Quản trị |
| --- | --- | --- | --- | --- |
| Dashboard cá nhân (lớp hôm nay, điểm danh cần làm) | ✅ | ✅ | ✅ | ✅ |
| Dashboard toàn trung tâm, báo cáo doanh thu / công nợ / sĩ số / tuyển sinh | ❌ | ❌ | ❌ | ✅ |
| Cài đặt trung tâm, năm học, mẫu biên lai, thời hạn khoá điểm danh | ❌ | ❌ | ❌ | ✅ |
| Tải / xuất báo cáo ra Excel | ❌ | ❌ | ❌ | ✅ |
| Xem nhật ký truy cập dữ liệu nhạy cảm | ❌ | ❌ | ❌ | ❌ (chỉ ghi log ở backend) |

## 9. Quy tắc bổ sung
- [CẦN XÁC NHẬN] Có vai trò **phụ huynh** trong phạm vi lần này không? Đặc tả để "Học viên/Phụ huynh" ở giai đoạn sau (xem `FRONTEND-CONTRACT.md` D1).
- [CẦN XÁC NHẬN] Một tài khoản có được nhiều vai trò không? DB cho phép (`user_roles`), UI không.
- [CẦN XÁC NHẬN] Nhân viên có được **xoá mềm** học viên và lớp, hay chỉ admin?
- [CẦN XÁC NHẬN] Nhân viên tự **xuất bản** bài đăng, hay phải admin duyệt?
- [CẦN XÁC NHẬN] Có cho phép **hoàn phí** không và ai duyệt?
- [CẦN XÁC NHẬN] Thời hạn khoá sửa điểm danh tính từ ngày buổi học hay ngày chốt lương? (mặc định `settings.attendance_lock_days`, UI đang ghi cứng 7)
- [CẦN XÁC NHẬN] Giáo viên có được sửa **mục chuyên môn / chứng chỉ** của mình không?
- Phân quyền theo **nút thao tác** của từng màn: xem cột "Hành động" trong `docs/FRONTEND-CONTRACT.md` phần C — mọi endpoint ở đó đều cần `requireRole` tương ứng.