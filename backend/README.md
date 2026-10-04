# backend

Mã nguồn backend (Node.js 20+, Express 5, TypeScript, Prisma 6, PostgreSQL).

> **Trạng thái P1 (2026-10-04): thư mục này vẫn TRỐNG (chỉ có README và `docs/spec/`).**
> Người dùng nói đã giải nén `trung-tam-backend.zip` vào đây. P1 đã tìm thấy file đó ở `E:\tải\trung-tam-backend.zip`
> nhưng **chưa giải nén** (ngoài phạm vi phase kiểm kê). Vì vậy `npm run check` ở gốc in rõ
> "chưa có backend/package.json — BỎ QUA (KHÔNG phải đã xanh)".
>
> Đã chép `HUONG-DAN-BACKEND.md` vào `backend/docs/spec/`. Lưu ý: tài liệu đó nói "mã nguồn đã được viết",
> nhưng thư mục này không có file mã nào — cần đặt mã nguồn vào trước khi **P2 (kiểm chứng khung backend)** bắt đầu.

Cấu trúc dự kiến (điền khi khung backend được đặt vào):

```
backend/
  prisma/
    schema.prisma          # mô hình dữ liệu, tên bảng/cột snake_case
    migrations/            # migration đã áp dụng, KHÔNG sửa
    seed.ts                # dữ liệu mẫu (giả)
  src/
    index.ts / app.ts      # khởi tạo Express, middleware
    core/                  # config, logger, error, prisma client, jwt, hash
    db/                    # truy vấn dùng chung, view
    modules/<tên>/         # routes.ts, controller.ts, service.ts, schema.ts
  requests/<module>.http   # ví dụ gọi thử (REST Client của VS Code)
  tests/                   # test quyền truy cập, luồng chính, quy tắc nghiệp vụ
```

Xem `../docs/PROGRESS.md` và `../AGENTS.md` trước khi code.