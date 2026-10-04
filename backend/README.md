# backend

Mã nguồn backend (Node.js 20+, Express 5, TypeScript, Prisma 6, PostgreSQL).

> **Trạng thái P0 (2026-10-04): thư mục này ĐANG TRỐNG.**
> Người dùng nói đã giải nén `trung-tam-backend.zip` vào đây nhưng tại thời điểm P0 không tìm thấy file nào.
> Vì vậy `npm run check` ở gốc sẽ in rõ "chưa có backend/package.json — BỎ QUA (KHÔNG phải đã xanh)".

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