# Quy tắc nghiệp vụ

Nguồn: `AGENTS.md` mục 8 + dữ liệu giả trong `frontend/src/data/` + `docs/spec/quan-ly-trung-tam-ngoai-ngu.md`
và `docs/spec/thiet-ke-database-day-du.md` (đặc tả **đã có** từ P1, xem D-008).
Các mục còn suy đoán vẫn gắn `[CẦN XÁC NHẬN]` và được liệt kê tập trung ở `docs/FRONTEND-CONTRACT.md` phần G.

Nguyên tắc chung:
1. Tiền luôn là **số nguyên VND**, không dùng số thực.
2. `payments` chỉ **thêm**, không sửa, không xoá. Sai thì tạo bút toán điều chỉnh / hoàn phí.
3. Mọi giao dịch tiền **chụp snapshot** học phí, số buổi, đơn giá tại thời điểm thực hiện.
4. Công nợ và tiến độ học là dữ liệu **tính ra** (view/truy vấn), không lưu tay.
5. Xoá mềm (`deleted_at`) cho học viên, giáo viên, nhân viên, lớp, bài đăng, sự kiện; truy vấn mặc định loại bản ghi đã xoá.
6. Thao tác nhiều bước chạy trong **một transaction**; ghi `audit_logs` cho dữ liệu quan trọng.
7. Thời gian lưu UTC (`timestamptz`), hiển thị Asia/Ho_Chi_Minh.

## BR-01. Lộ trình học
- Mỗi khoá học: **64 buổi, 2 buổi/tuần, khoảng 8 tháng** (`AGENTS.md` mục 1).
- Học phí tính theo tổng số buổi của khoá × đơn giá/buổi; hiển thị "còn dự kiến N buổi".
- `[CẦN XÁC NHẬN]` Có mức giá theo từng nhóm tuổi / chính sách giảm giá theo số buổi đã học không?

## BR-02. Lớp học và thời khóa biểu
- Lớp thuộc một khoá học, một giáo viên phụ trách, một phòng học, có **chỉ tiêu số học viên**.
- Ghi danh học viên vào lớp không được vượt chỉ tiêu; ghi danh trùng khoá đang học phải bị chặn (409).
- Buổi học sinh từ thời khóa biểu tuần; đổi phòng hoặc đổi ca phải **kiểm tra trùng phòng và trùng giáo viên**.
- Lớp không có học viên, hoặc đã học hết số buổi → chuyển trạng thái "đã kết thúc" (auto tính ra).

## BR-03. Điểm danh
- Trạng thái mỗi buổi: `chua-diem-danh` → `da-diem-danh` → `da-khoa`.
- **Điểm danh trễ hạn bị từ chối 423 LOCKED**; chỉ admin mở khoá được, và mở khoá phải ghi `audit_logs`.
- Mặc định khoá sau **7 ngày** kể từ ngày buổi học `[CẦN XÁC NHẬN: có cấu hình được không?]`.
- Điểm danh chỉ ghi trạng thái và ghi chú; tiến độ học tính từ số buổi có mặt, không lưu số buổi còn lại.
- Học viên xem lịch sử điểm danh của chính mình; giáo viên xem/sửa trong lớp mình.

## BR-04. Điểm số và bài tập
- Điểm theo thang 10, chỉ nhập số 0–10 `[CẦN XÁC NHẬN]`.
- Điểm số, bài kiểm tra, bài tập gắn với **lớp**; giáo viên chỉ thấy lớp mình.
- Điểm trung bình và xếp loại tính ra; `[CẦN XÁC NHẬN]` có quy đổi sang điểm A/B/C/D theo GPA không.

## BR-05. Học phí, công nợ và thu tiền
- Khoản phải thu (`invoices`) phát sinh khi ghi danh lớp hoặc khi admin tạo hàng loạt.
- Công nợ học viên = tổng khoản phải thu − tổng đã thu (tính ra, không lưu).
- Khi thu tiền: tạo `payments` (chỉ thêm). **Không cho thu vượt công nợ** → 409 `OVERPAYMENT`.
- Phương thức thu: tiền mặt, chuyển khoản, thẻ, ví điện tử.
- Mỗi phiếu thu có **số biên lai** (`receiptNo`) theo cấu hình; tiền mặt đối soát theo nhân viên cuối ngày.
- Giảm giá / hoàn phí: nhân viên **gửi yêu cầu**, admin **duyệt**; không sửa/xoá bản ghi cũ.
- `[CẦN XÁC NHẬN]` Có công nợ âm (đã thu dư) không, hay chặn tuyệt đối?

## BR-06. Lương giáo viên
- Lương tính theo **số buổi đã dạy đủ** trong kỳ × đơn giá/buổi `[CẦN XÁC NHẬN: có thêm phụ cấp, trễ buổi, bù giờ?]`.
- Vòng đời bảng lương: `nhap → gui-duyet → da-chot`; đã chốt thì không sửa, chỉ tính lại kỳ sau.
- Nhân viên (và giáo viên) chỉ xem lương của **chính mình**; admin xem toàn trung tâm.

## BR-07. Lịch trình / sự kiện
- Sự kiện thuộc lớp hoặc là sự kiện chung; có thể liên kết file/bài viết.
- Người tạo có thể sửa sự kiện của mình khi chưa diễn ra; admin sửa được mọi sự kiện.
- Xoá mềm, không xoá cứng; sự kiện đã diễn ra không được xoá.

## BR-08. Khách tiềm năng
- Kanban tư vấn: `moi → lien-he → chot → theo-doi / that` `[CẦN XÁC NHẬN]`.
- Khách tiềm năng không có mật khẩu/tài khoản cho tới khi chuyển thành học viên.
- Nguồn khách: website, facebook, giới thiệu, quảng cáo `[CẦN XÁC NHẬN]`.

## BR-09. Nội dung website
- Bài đăng / tin tức / banner: nhân viên soạn và **gửi duyệt**, admin duyệt rồi mới hiển thị ngoài trang công khai.
- Nội dung do người dùng nhập phải **làm sạch HTML** trước khi lưu và trước khi hiển thị.
- Xoá mềm bài đăng; không xoá cứng.

## BR-10. Tài khoản và đăng nhập
- Mật khẩu chỉ lưu **băm** (argon2). Mật khẩu tạm hiển thị **một lần**, không ghi DB dạng rõ, không ghi log/audit.
- Người dùng đổi mật khẩu lần đầu bằng mật khẩu tạm `[CẦN XÁC NHẬN]`.
- Khoá tài khoản: đăng nhập trả 423 LOCKED `[CẦN XÁC NHẬN: có dùng 403 thay vì 423 không?]`.
- Import Excel: báo cáo kết quả theo từng dòng (thành công / lỗi), giới hạn dung lượng và định dạng file.

## BR-11. Nhật ký và bảo mật
- `audit_logs` ghi cho: tạo/sửa/xoá hồ sơ, thu tiền, điểm, điểm danh, lương, tài khoản, mở khoá điểm danh.
- Log ứng dụng **không** chứa mật khẩu, token, cookie hay dữ liệu cá nhân nhạy cảm.
- Điều hướng và truy cập hệ thống nội bộ còn giữ mật định; chỉ mở khi có yêu cầu rõ ràng `[CẦN XÁC NHẬN]`.

## BR-12. Cấu hình trung tâm
- Thông tin trung tâm, mẫu biên lai, mẫu hợp đồng, năm học và khoá học đang chạy do admin quản lý.
- `năm_hoc_hien_tai` dùng làm mặc định cho màn hình cần chọn khoá; không tự đổi giữa phiên.