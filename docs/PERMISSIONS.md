# Ma trận phân quyền

Nguồn: `AGENTS.md` mục 7 + menu thực tế trong mã nguồn `frontend/src/layouts/` (`NAV_BY_ROLE`, `ADMIN_NAV`).
**Chưa đối chiếu với `docs/spec/quan-ly-trung-tam-ngoai-ngu.md` vì đặc tả đang thiếu** → các mục suy đoán gắn
`[CẦN XÁC NHẬN]` (xem D-007).

4 vai trò: **Học viên (student)**, **Giáo viên (teacher)**, **Nhân viên (staff)**, **Quản trị (admin)**.

Nguyên tắc bắt buộc (AGENTS.md mục 7):
1. Phân quyền kiểm tra ở **backend** cho mọi yêu cầu: theo vai trò (`requireRole`) **và** theo dữ liệu.
2. Ẩn menu ở frontend **không phải** bảo mật.
3. Không tin giá trò từ client cho user id, teacher id, vai trò, số tiền đã tính.

Ký hiệu: ✅ được phép · 🔒 chỉ dữ liệu của chính mình / lớp mình phụ trách · ❌ không được phép · ➕ chỉ tạo (không sửa/xoá)

## 1. Tài khoản và xác thực
| Chức năng | Học viên | Giáo viên | Nhân viên | Quản trị |
| --- | --- | --- | --- | --- |
| Đăng nhập / đổi mật khẩu / đăng xuất | ✅ | ✅ | ✅ | ✅ |
| Xem hồ sơ cá nhân của mình | 🔒 | 🔒 | 🔒 | 🔒 |
| Danh sách tài khoản, lọc theo vai trò | ❌ | ❌ | ❌ | ✅ |
| Tạo tài khoản, đổi vai trò | ❌ | ❌ | ❌ | ✅ |
| Khoá / mở khoá tài khoản, đặt lại mật khẩu | ❌ | ❌ | ❌ | ✅ |
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
| Sửa hồ sơ | ❌ | ❌ | ✅ `[CẦN XÁC NHẬN: giáo viên có sửa được mục chuyên môn không?]` | ✅ |
| Xoá mềm học viên | ❌ | ❌ | ✅ `[CẦN XÁC NHẬN]` | ✅ |
| Ghi chú chăm sóc học viên | ❌ | 🔒 | ✅ | ✅ |
| Xem điểm danh của mình | 🔒 | ❌ | ❌ | ✅ |
| Xem tiến độ học (số buổi đã học) của mình | 🔒 | 🔒 (lớp mình) | ✅ | ✅ |

## 3. Đào tạo: khóa học, lớp học, phòng học, thời khóa biểu
| Chức năng | Học viên | Giáo viên | Nhân viên | Quản trị |
| --- | --- | --- | --- | --- |
| Xem khóa học / lịch trình công khai | ✅ | ✅ | ✅ | ✅ |
| Xem lớp của mình (lịch, giáo viên, phòng) | 🔒 | 🔒 | ✅ | ✅ |
| Tạo / sửa khóa học | ❌ | ❌ | ❌ | ✅ |
| Tạo / sửa / xoá mềm lớp học, ghi danh học viên vào lớp | ❌ | ❌ | ✅ `[CẦN XÁC NHẬN: ai duyệt lớp vượt chỉ tiêu?]` | ✅ |
| Quản lý phòng học | ❌ | ❌ | ❌ | ✅ |
| Sửa thời khóa biểu tuần | ❌ | ❌ | ✅ `[CẦN XÁC NHẬN]` | ✅ |
| Được phép đổi phòng / đổi ca khi đã có lớp khác | ❌ | ❌ | ❌ | ✅ (kiểm tra trùng phòng và trùng giáo viên) |
| Sửa lịch sự kiện của riêng mình | ❌ | ➕ | ➕ | ✅ |

## 4. Điểm danh và kết quả học tập
| Chức năng | Học viên | Giáo viên | Nhân viên | Quản trị |
| --- | --- | --- | --- | --- |
| Điểm danh buổi học | ❌ | 🔒 (lớp mình) | ❌ | ✅ |
| Sửa điểm danh quá hạn | ❌ | ❌ (423 LOCKED) | ❌ | ✅ (mở khoá được) |
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
| Áp giảm giá / hoàn phí | ❌ | ❌ | ➕ (gửi yêu cầu) | ✅ (duyệt) |
| Xem công nợ toàn trung tâm | ❌ | ❌ | ✅ | ✅ |
| Đối soát tiền mặt cuối ngày (theo nhân viên) | ❌ | ❌ | 🔒 (của mình) | ✅ |
| Sửa / xoá phiếu thu đã ghi | ❌ | ❌ | ❌ | ❌ (chỉ tạo bút toán điều chỉnh / hoàn phí) |

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
| Quản lý khách tiềm năng (kanban tư vấn) | ❌ | ❌ | ✅ | ✅ |
| Soạn / xuất bản bài đăng, banner | ❌ | ❌ | ✅ | ✅ |
| Duyệt nội dung trước khi hiển thị | ❌ | ❌ | ❌ | ✅ |

## 8. Báo cáo, dashboard, cài đặt
| Chức năng | Học viên | Giáo viên | Nhân viên | Quản trị |
| --- | --- | --- | --- | --- |
| Dashboard cá nhân (lớp hôm nay, điểm danh cần làm) | ✅ | ✅ | ✅ | ✅ |
| Dashboard toàn trung tâm, báo cáo doanh thu / công nợ / sĩ số / tuyển sinh | ❌ | ❌ | ❌ | ✅ |
| Cài đặt trung tâm, năm học, mẫu biên lai, thời hạn khoá điểm danh | ❌ | ❌ | ❌ | ✅ |
| Tải / xuất báo cáo ra Excel | ❌ | ❌ | ❌ | ✅ |

## 9. Quy tắc bổ sung cần kiểm tra lại khi có đặc tả
- [CẦN XÁC NHẬN] Nhân viên có được phép sửa **xoá mềm** học viên và lớp hay chỉ admin?
- [CẦN XÁC NHẬN] Có vai trò nào ngoài 4 vai trò này (ví dụ kế toán, phụ huynh xem lịch con) không?
- [CẦN XÁC NHẬN] Giáo viên có được duyệt giảm giá không, hay chỉ gửi yêu cầu?
- [CẦN XÁC NHẬN] Thời hạn khoá sửa điểm danh tính từ ngày buổi học hay ngày chốt lương? (mặc định đang dùng 7 ngày)