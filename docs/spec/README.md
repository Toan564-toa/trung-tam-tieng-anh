# docs/spec

Thư mục này chứa **đặc tả gốc** của dự án (bản Markdown do người dùng cung cấp).

> **Trạng thái P1 (2026-10-04): ĐÃ CÓ ĐẶC TẢ.** Ba tài liệu gốc đã được chép từ `E:\tải\` vào repo:
>
> | File | Nội dung | Dùng cho |
> | --- | --- | --- |
> | `quan-ly-trung-tam-ngoai-ngu.md` | Đặc tả chức năng theo vai trò | Ma trận quyền, phạm vi màn hình, mục D/E của hợp đồng dữ liệu |
> | `thiet-ke-database-day-du.md` | Thiết kế database 40+ bảng, ưu tiên P1/P2/P3 | Mục B của hợp đồng dữ liệu, phase P3 (schema) |
> | `../backend/docs/spec/HUONG-DAN-BACKEND.md` | Hướng dẫn khung backend | Phase P2 |
>
> `docs/FRONTEND-CONTRACT.md`, `docs/PERMISSIONS.md` và `docs/DECISIONS.md` (D-008) đã được viết lại theo hai đặc tả này.
> Các câu hỏi nghiệp vụ còn mở nằm ở `docs/FRONTEND-CONTRACT.md` phần G và `docs/PROGRESS.md`.

Quy tắc dùng spec:
1. Chỉ đọc phần liên quan tới phase đang làm (AGENTS.md mục 3.2).
2. Nếu spec mâu thuẫn với `AGENTS.md` hoặc với `FRONTEND-CONTRACT.md`, ghi vào `docs/PROGRESS.md` mục "Lệch hợp đồng"
   và hỏi người dùng — không tự quyết.
3. **Không sửa đặc tả gốc.** Nếu phát hiện đặc tả sai hoặc thiếu so với giao diện, ghi vào `FRONTEND-CONTRACT.md`
   phần D hoặc E và nêu câu hỏi, đừng sửa tại file này.
4. Còn tệp `trung-tam-backend.zip` ở `E:\tải\` — chờ người dùng cho phép giải nén vào `backend/`.