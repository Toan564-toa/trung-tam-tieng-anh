# Quyết định kiến trúc (ADR)

Cách dùng: mỗi quyết định một khối `D-xxx`. Ghi quyết định mới **ngay trong commit đã đổi code**, không sửa quyết định cũ;
nếu quyết định cũ sai thì thêm quyết định mới ghi "thay thế D-xxx".

---

## D-001: Monorepo — `backend/` + `frontend/` trong một repo [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-04, P0
- Bối cảnh: dự án gồm hai ứng dụng độc lập (API và web) nhưng phải dùng chung một bộ tài liệu, quy tắc nghiệp vụ
  và tiến độ; hai bên phải sửa đồng thời rất nhiều lần (đặc biệt khi nối API ở 5 mốc).
- Đã chọn: Một repo git duy nhất, hai thư mục độc lập `backend/` và `frontend/`, mỗi thư mục có `package.json` riêng.
  Lệnh gốc điều phối bằng `npm --prefix <thư mục>` qua `scripts/check.mjs`; **không** dùng npm workspaces ở P0.
- Phương án đã loại và lý do:
  - Hai repo riêng: khó đảm bảo tài liệu và commit luôn khớp, tốn công điều phối 5 mốc nối.
  - npm workspaces: phụ thuộc hoisting, dễ xung đột với `frontend/node_modules` đã cài sẵn; thêm rủi ro khi khung
    backend chưa có. Có thể chuyển sang sau nếu thực sự cần (ghi D-00x mới).
- Hệ quả: `npm run check` ở gốc kiểm tra lần lượt backend rồi frontend, dừng ngay khi một bên đỏ. Không có script
  dùng chung giữa hai phía trong P0.

---

## D-002: Xác thực bằng JWT trong cookie httpOnly [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-04, P0 (theo `AGENTS.md` mục 2 và 7)
- Bối cảnh: frontend hiện dùng chế độ demo và có thể lưu token ở `localStorage` (sẽ kiểm kê ở P1).
- Đã chọn: Backend ký JWT và trả trong cookie `httpOnly` (+ `Secure` ở production, `SameSite=Lax`). Frontend không
  đọc token; mọi request dùng `credentials: "include"`. Đổi mật khẩu/đăng xuất sẽ làm token hết hiệu lực.
- Phương án đã loại và lý do: token trong `localStorage` (dễ bị đánh cắp qua XSS), và cơ chế refresh-token phức tạp
  (chưa cần cho quy mô hiện tại).
- Hệ quả: cần cấu hình CORS dạng origin cụ thể + `credentials: true` (không dùng `*`), cần xử lý CSRF cơ bản.
  Ghi "Lệch hợp đồng" ở P1 nếu frontend đang lưu token ở `localStorage`.

---

## D-003: Prisma 6 làm ORM, PostgreSQL làm cơ sở dữ liệu [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-04, P0
- Bối cảnh: cần ràng buộc rõ ràng, migration có trong git, và truy vấn đủ nhanh cho báo cáo tổng hợp.
- Đã chọn: Prisma 6 + PostgreSQL. Migration nằm trong `backend/prisma/migrations/` và phải commit. Ràng buộc Prisma
  không mô tả được (CHECK, unique có điều kiện, trigger, view) viết bằng SQL trong migration (`--create-only`).
- Phương án đã loại và lý do: TypeORM/Drizzle (đổi khung backend có sẵn nếu có), SQL thuần (nhiều code thừa, dễ sai
  khi đổi cấu trúc).
- Hệ quả: `prisma migrate dev` khi đổi schema, `prisma generate` sau khi cài; không sửa migration đã áp dụng,
  không `migrate reset` trên dữ liệu thật.

---

## D-004: Tên bảng/cột trong DB dùng snake_case, mã nguồn dùng camelCase [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-04, P0
- Bối cảnh: truy vấn tay, view báo cáo và SQL đối soát sẽ được viết bằng SQL thuần cho một số phần.
- Đã chọn: `@@map`/`@map` sang snake_case trong `schema.prisma`; mã nguồn và JSON API dùng camelCase
  (`fullName`, `dueDate`), tiền là số nguyên VND.
- Phương án đã loại và lý do: camelCase trong DB (khó đọc SQL báo cáo, lệch chuẩn PostgreSQL).
- Hệ quả: phải khai báo `@map` đầy đủ; DTO trả về khớp `docs/FRONTEND-CONTRACT.md` để phase NỐI ít ánh xạ.

---

## D-005: Làm backend trước, nối frontend theo 5 mốc [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-04, P0
- Bối cảnh: frontend đã hoàn thành với dữ liệu giả (~46 màn hình); nếu sửa và nối từng phần sẽ phải đụng frontend
  nhiều lần và khó kiểm soát tiến độ.
- Đã chọn: Trình tự phase kiểm kê → schema → 5 mốc (Mốc 1 đăng nhập/tài khoản/hồ sơ/import; Mốc 2 lớp học/điểm danh;
  Mốc 3 học phí/lương; Mốc 4 lịch trình/điểm số/landing; Mốc 5 dashboard/báo cáo/cài đặt), mỗi mốc gồm phần BACKEND
  rồi phần NỐI.
- Phương án đã loại và lý do: nối dần từng màn hình ngay từ đầu (dễ lệch hợp đồng, phải sửa frontend liên tục);
  viết hết backend một lượt rồi mới nối (giai đoạn giữa quá dài, không kiểm chứng sớm).
- Hệ quả: phase BACKEND **cấm** sửa file trong `frontend/`; mọi nhu cầu đổi frontend ghi vào PROGRESS.md mục
  "Lệch hợp đồng". Phase NỐI chỉ thay nguồn dữ liệu, không đổi giao diện.

---

## D-006: `npm run check` phải nói rõ bước chưa cấu hình, không giả vờ xanh [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-04, P0
- Bối cảnh: `backend/` chưa có mã nguồn và cả hai phía chưa có test runner; một lệnh `check` "xanh giả" sẽ khiến
  các phase sau tin là đã kiểm tra.
- Đã chọn: `scripts/check.mjs` chạy lần lượt `typecheck → lint → test → build` cho backend rồi frontend, **dừng ngay**
  khi một bước đỏ. Bước thiếu script hoặc thiếu cả thư mục sẽ in cảnh báo `CHƯA CẤU HÌNH … (KHÔNG phải đã xanh)`
  và được liệt kê ở cuối output.
- Phương án đã loại và lý do: thêm script `test` rỗng cho mọi phía (tạo cảm giác an toàn giả); bỏ qua im lặng
  (không phát hiện được phần nào chưa kiểm tra).
- Hệ quả: tiêu chí "Hoàn thành" của `AGENTS.md` mục 10 chỉ được coi là đạt khi **không còn** dòng
  "CHƯA CẤU HÌNH" nào trong output của `npm run check`.

---

## D-007: `docs/PERMISSIONS.md` và `docs/BUSINESS-RULES.md` tạm suy ra từ AGENTS.md bản 2 [CẦN XÁC NHẬN]
- Ngày / Phase: 2026-10-04, P0
- Bối cảnh: người dùng cho biết đã đặt `docs/spec/quan-ly-trung-tam-ngoai-ngu.md`, nhưng thư mục `docs/spec/` và
  `backend/` đều đang trống; máy không tìm thấy file zip đặc tả nào.
- Đã chọn: viết hai tài liệu này dựa trên `AGENTS.md` (mục 7, 8, 9) và mã nguồn `frontend/` (menu theo vai trò, dữ liệu
  giả), gắn nhãn `[CẦN XÁC NHẬN]` ở mọi chỗ suy đoán; **không** bịa nội dung đặc tả.
- Phương án đã loại và lý do: bỏ trống hai tài liệu (P1–P3 sẽ thiếu nền để đối chiếu); tự thêm quy tắc nghiệp vụ
  theo cảm tính (vi phạm `AGENTS.md` mục 11).
- Hệ quả: khi có đặc tả, phải đối chiếu lại toàn bộ hai tài liệu, bỏ nhãn `[CẦN XÁC NHẬN]` hoặc ghi quyết định mới ở đây.