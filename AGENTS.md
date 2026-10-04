# AGENTS.md: Luật làm việc cho dự án Web quản lý trung tâm ngoại ngữ

## 1. Bối cảnh
Hệ thống quản lý trung tâm ngoại ngữ gồm: landing page, khu vực học viên, giáo viên, nhân viên và admin.
Lộ trình học: 64 buổi, 2 buổi/tuần, khoảng 8 tháng. Giao diện và người dùng bằng TIẾNG VIỆT.
HIỆN TRẠNG: frontend (`frontend/`) đã hoàn thành với dữ liệu giả. Đang làm backend (`backend/`), sau đó nối hai bên.

## 2. Công nghệ cố định (không đổi nếu chưa được người dùng đồng ý)
- Backend: Node.js 20+, Express 5, TypeScript, Prisma 6, PostgreSQL, zod, argon2, JWT trong cookie httpOnly.
- Frontend: đã có sẵn (React, Vite, TypeScript, Tailwind, shadcn/ui...). Không đổi thư viện giao diện.
  Khi nối API được thêm TanStack Query nếu chưa có.
- Thêm thư viện mới: chỉ khi cần thật sự, ưu tiên phổ biến; ghi lý do vào `docs/DECISIONS.md`.

## 3. Vòng lặp làm việc (BẮT BUỘC mỗi phiên)
1. Đọc `docs/PROGRESS.md` để biết phase hiện tại và việc kế tiếp. Đọc `DECISIONS.md` và `BUSINESS-RULES.md`.
2. Đọc đúng phần liên quan trong `docs/FRONTEND-CONTRACT.md` và `docs/spec/`. KHÔNG đọc lại toàn bộ mỗi lần.
3. Chỉ làm đúng phạm vi phase. Việc ngoài phạm vi: ghi vào mục "Việc phát sinh" của PROGRESS.md.
4. Làm từng hạng mục nhỏ; sau mỗi hạng mục chạy kiểm tra (mục 10) và (nếu có git) commit.
5. Cuối phiên: cập nhật `PROGRESS.md`, `API.md`, `DECISIONS.md`.
6. Không đánh dấu hoàn thành khi kiểm tra còn đỏ. Dở dang thì ghi rõ chỗ dở.

## 4. Quy tắc theo loại phase (rất quan trọng)
- Phase BACKEND: CẤM sửa bất cứ file nào trong `frontend/`. Nếu thấy frontend cần đổi, ghi vào PROGRESS.md mục
  "Lệch hợp đồng" để xử lý ở phase NỐI.
- Phase NỐI: chỉ thay NGUỒN DỮ LIỆU (dữ liệu giả sang API). KHÔNG đổi thiết kế, bố cục, màu sắc, chữ hiển thị
  (trừ thông báo lỗi/trạng thái còn thiếu). Component không gọi fetch trực tiếp, chỉ dùng hook trong `src/api`.
- Phase KIỂM KÊ (Phase 1): chỉ đọc frontend và viết tài liệu, không sửa mã.

## 5. Quy ước code
- Định danh (biến, hàm, file, bảng, cột) bằng tiếng Anh. Chú thích ngắn bằng tiếng Việt. Chữ cho người dùng bằng tiếng Việt.
- Backend theo module: `src/modules/<tên>/{routes,controller,service,schema}.ts`. Controller mỏng; logic ở service.
- DTO: service trả về dữ liệu đã chọn lọc trường (`select`/map) khớp hợp đồng. KHÔNG trả thẳng model Prisma
  (tránh lộ `passwordHash`, trường nội bộ, dữ liệu của người khác).
- Tên bảng/cột DB snake_case (`@@map`/`@map`), code dùng camelCase. Không dùng `any` nếu tránh được.
- Hàm dài trên khoảng 60 dòng thì tách.

## 6. Quy ước API
- Tiền tố `/api`. Tài nguyên số nhiều, kebab-case.
- Thành công: `{ "data": ... }`. Danh sách: `{ "data": { "items": [], "page", "pageSize", "total", "totalPages" } }`.
- Lỗi: `{ "error": { "code", "message", "details?" } }` với mã HTTP đúng (400, 401, 403, 404, 409, 423, 429, 500).
- Mọi danh sách có phân trang (mặc định 20, tối đa 100), sắp xếp ổn định, và hỗ trợ đúng bộ lọc/tìm kiếm mà
  FRONTEND-CONTRACT.md ghi cho màn hình đó.
- Tên trường trong JSON bám theo FRONTEND-CONTRACT.md (nếu đã có), để phase NỐI ít phải ánh xạ.
- Dữ liệu vào luôn kiểm tra bằng zod ở backend.
- Thay đổi API: cập nhật `docs/API.md` (kèm ví dụ yêu cầu/phản hồi) TRONG CÙNG commit.
- Mỗi module có file ví dụ gọi thử `backend/requests/<module>.http` (định dạng REST Client của VS Code) để kiểm tra bằng tay.

## 7. Bảo mật (không thương lượng)
- Phân quyền kiểm tra ở BACKEND cho mọi yêu cầu: (a) theo vai trò (`requireRole`), (b) theo dữ liệu (giáo viên chỉ lớp mình,
  học viên chỉ dữ liệu của mình). Ẩn menu ở frontend không phải bảo mật.
- Không tin giá trị từ client cho: user id, teacher id, vai trò, số tiền đã tính. Lấy từ token/DB.
- Mật khẩu chỉ lưu băm (argon2). Mật khẩu tạm hiển thị một lần, không ghi vào DB (dạng rõ), log hay audit.
- Không ghi mật khẩu, token, cookie, dữ liệu cá nhân nhạy cảm vào log.
- Truy vấn Prisma/`$queryRaw` luôn tham số hóa. Cấm nối chuỗi SQL từ dữ liệu người dùng.
- Upload: kiểm tra loại theo nội dung, giới hạn dung lượng, đổi tên file, không thực thi file tải lên.
- HTML do người dùng nhập (bài đăng) phải được làm sạch trước khi lưu/hiển thị.
- Không commit `.env`, khóa, dữ liệu thật. Dữ liệu mẫu chỉ là dữ liệu giả.
- Dữ liệu sinh trắc học (face ID) KHÔNG làm trong các phase hiện tại.

## 8. Dữ liệu và tiền
- Tiền là số nguyên VND, không dùng số thực.
- `payments` chỉ thêm, không sửa, không xóa. Sai thì tạo bút toán điều chỉnh/hoàn phí.
- Chụp lại (snapshot) học phí, số buổi, đơn giá tại thời điểm giao dịch.
- Công nợ, tiến độ học là dữ liệu TÍNH RA (view/truy vấn), không lưu tay.
- Xóa mềm (`deleted_at`) cho học viên, giáo viên, nhân viên, lớp, bài đăng, sự kiện; truy vấn mặc định loại bản ghi đã xóa.
- Thao tác nhiều bước chạy trong MỘT transaction.
- Ghi `audit_logs` cho tạo/sửa/xóa dữ liệu quan trọng (học viên, tiền, điểm, điểm danh, lương, tài khoản).
- Thời gian lưu UTC (`timestamptz`), hiển thị Asia/Ho_Chi_Minh.

## 9. Cơ sở dữ liệu và migration
- Mọi thay đổi cấu trúc qua migration Prisma, đưa vào git. KHÔNG sửa migration đã áp dụng, KHÔNG sửa DB bằng tay.
- Ràng buộc Prisma không mô tả được (CHECK, unique có điều kiện, trigger, view) viết bằng SQL trong migration (`--create-only`).
- Mỗi bảng có `created_at`, `updated_at`; `deleted_at` khi cần xóa mềm. Index cho khóa ngoại và cột hay lọc.
- Không `prisma migrate reset` trên dữ liệu thật.

## 10. Kiểm tra và Định nghĩa "Hoàn thành"
Một hạng mục chỉ hoàn thành khi TẤT CẢ đúng:
- `npm run check` ở gốc chạy xanh (typecheck + lint + test + build cho phần đã tồn tại).
- Phase BACKEND: có test cho quyền truy cập (đúng vai trò được, sai vai trò 403, dữ liệu người khác bị chặn), luồng chính,
  và các quy tắc nghiệp vụ liên quan; endpoint trả đúng trường theo FRONTEND-CONTRACT.md; `docs/API.md` và `backend/requests/*.http` đã cập nhật.
- Phase NỐI: các màn trong phạm vi chạy bằng API thật (không còn dữ liệu giả), đủ trạng thái đang tải/rỗng/lỗi/thành công,
  giao diện không đổi, dùng được trên điện thoại.
- `PROGRESS.md` (và `DECISIONS.md` nếu có quyết định) đã cập nhật. Không còn `console.log` thừa hay bí mật trong mã.

## 11. Khi thiếu thông tin
- Quy tắc nghiệp vụ chưa rõ: chọn mặc định hợp lý, ghi `DECISIONS.md` nhãn `[CẦN XÁC NHẬN]`, tiếp tục.
- DỪNG và hỏi người dùng trước khi làm nếu liên quan: xóa dữ liệu hàng loạt, đổi cách tính tiền/lương đã chốt, đổi công nghệ nền,
  gửi dữ liệu ra dịch vụ ngoài, việc không thể hoàn tác.
- Không bịa tên thư viện, hàm, endpoint, phiên bản. Chưa chắc thì kiểm tra tài liệu hoặc thử chạy.

## 12. Git
- Nhánh theo phase: `phase-04-auth`. Commit nhỏ, thông điệp tiếng Anh dạng Conventional Commits: `feat(attendance): lock sessions after N days`.
- Mỗi commit: code chạy được, kiểm tra xanh.

## 13. Điều cấm
- Không làm ngoài phạm vi phase. Không refactor lớn không được yêu cầu.
- Không hạ yếu kiểm tra bảo mật, rate limit, validation để "cho chạy được".
- Không lưu token vào localStorage. Không tắt kiểm tra TLS. Không mở CORS `*` kèm credentials.
- Không lộ stack trace ra client ở production. Không đưa dữ liệu thật vào mã.
- Không tự ý sửa `AGENTS.md`; muốn đổi luật thì đề xuất trong PROGRESS.md.

## 14. Lệnh thường dùng
- Gốc: `npm run check`, `npm run dev:be`, `npm run dev:fe`
- Backend: `npm run dev`, `npm run typecheck`, `npm test`, `npx prisma migrate dev --name <tên>`, `npm run db:seed`
- Frontend: `npm run dev`, `npm run build`, `npm run lint`