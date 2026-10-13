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
  **Đã xử lý ở P1: xem D-008 (thay thế D-007).**

---

## D-008: Đặc tả đã tìm thấy; hợp đồng dữ liệu lấy từ đặc tả và mã frontend [ĐÃ CHỐT] — thay thế D-007
- Ngày / Phase: 2026-10-04, P1
- Bối cảnh: đã tìm thấy và chép vào repo ba tài liệu gốc:
  `docs/spec/quan-ly-trung-tam-ngoai-ngu.md` (đặc tả chức năng),
  `docs/spec/thiet-ke-database-day-du.md` (thiết kế 40+ bảng), `backend/docs/spec/HUONG-DAN-BACKEND.md`.
  `docs/PERMISSIONS.md` và `docs/BUSINESS-RULES.md` bản P0 vì thế đã suy đoán trên nền đặc tả vắng mặt.
- Đã chọn: coi **đặc tả + mã frontend** là hai nguồn chuẩn. Nơi hai nguồn mâu thuẫn thì **không tự quyết**:
  ghi vào `FRONTEND-CONTRACT.md` (phần D/E) và nhãn `[CẦN XÁC NHẬN]`. `PERMISSIONS.md` được viết lại hoàn toàn
  theo menu thực tế + đặc tả.
- Phương án đã loại và lý do: chọn đặc tả làm đúng và sửa lại UI (vi phạm phase BACKEND sẽ cấm sửa frontend,
  và nhiều mặt bằng giá trị nghiệp vụ chỉ người dùng mới quyết được); giữ bản P0 (đã lệch thực tế).
- Hệ quả: còn 12 câu hỏi mở (`FRONTEND-CONTRACT.md` phần G). Trả lời câu nào thì gỡ nhãn tương ứng và
  ghi thêm ADR nếu có ảnh hưởng kiến trúc.

---

## D-009: Tên trường API giữ nguyên camelCase như biến trong `frontend/src/data` [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-04, P1
- Bối cảnh: frontend dùng tên trường riêng (`fullName`, `studentCode`, `dueDate`, `receiptNo`, `mustChangePassword`).
  Đổi tên sẽ phải sửa hàng loạt component ở 5 phase NỐI.
- Đã chọn: JSON API trả **đúng tên** như frontend. Chỉ đổi 3 nhóm: trạng thái (chuỗi tiếng Việt → mã tiếng Anh),
  ngày giờ (ISO 8601 thay cho `Date`/chuỗi `dd/MM/yyyy`), tiền (số nguyian thay cho chuỗi đã định dạng).
- Phương án đã loại và lý do: đặt tên lại theo chuẩn riêng của API (đẹp hơn nhưng tốn công ánh xạ ở mỗi mốc nối).
- Hệ quả: `docs/API.md` phải bám đúng tên này; lớp ánh xạ Prisma → DTO là nơi duy nhất được đổi tên.

---

## D-010: Trạng thái trả về là mã tiếng Anh, nhãn tiếng Việt ở frontend [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-04, P1
- Bối cảnh: nhiều enum đang lưu **nguyên văn tiếng Việt** trong dữ liệu giả
  (`PaymentMethod = "Tiền mặt"`, `POST_CATEGORIES = ["Sự kiện", …]`, `StaffMember.role = "Giáo viên"`).
- Đã chọn: API trả mã ổn định (`cash`, `bank_transfer`, `published`, `present`…). Frontend dùng bảng `*_META`
  vốn đã có sẵn để hiện nhãn và màu badge — không phải đổi giao diện.
- Phương án đã loại và lý do: giữ chuỗi tiếng Việt trong DB (vỡ khi đổi nhãn, không index/sắp xếp được ổn định).
- Hệ quả: các bảng tra (`payment_methods`, `post_categories`, `event_types`, `lead_sources`) cần định nghĩa rõ trong P3.

---

## D-011: Ngày giờ lưu UTC, API trả ISO 8601, hiển thị theo `Asia/Ho_Chi_Minh` [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-04, P1
- Bối cảnh: dữ liệu giả có ba nguồn "hôm nay" khác nhau (`new Date(2026,9,1)`, `TODAY = new Date(2026,9,2)`,
  `ADMIN_TODAY_LABEL = "02/10/2026"`), `formatDate()` dùng timezone của máy người dùng.
- Đã chọn: DB `timestamptz`; API trả ISO 8601 kèm mốc "hôm nay" của server; mọi mốc ngày ở frontend
  định dạng với `Asia/Ho_Chi_Minh` cố định.
- Phương án đã loại và lý do: để browser tự quyết định múi giờ (người dùng ở Việt Nam nhưng máy có thể lệch).
- Hệ quả: cần test xuyên múi giờ ở backend; `TODAY_*` giả sẽ bị xoá khi nối API.

---

## D-012: Cột DB thiếu mà UI cần — bổ sung theo mức P1/P2, không giản lược UI [CẦN XÁC NHẬN]
- Ngày / Phase: 2026-10-04, P1
- Bối cảnh: 14 nhóm trường giao diện dùng mà thiết kế DB chưa có (xem `FRONTEND-CONTRACT.md` B2), ví dụ
  `students.identity_no`, `teachers.experience`, `courses.target_students`, bảng `student_notes`,
  bảng `time_slots`, `class_sessions.topic/note`.
- Đã chọn (tạm): **bổ sung cột/bảng vào DB** cho các trường nghiệp vụ thật (`identity_no`, `topic`, `note`,
  `student_notes`, `time_slots`, `target_students`, `leads.next_follow_up`…); các trường chỉ phục vụ trình bày
  (`tone`, `levelTone`, `featured`, `progress`) **không lưu**, để backend tính hoặc bỏ khỏi UI.
- Phương án đã loại và lý do: xoá trường khỏi UI ngay ở phase NỐI (vi phạm "không đổi giao diện", mất thông tin vận hành).
- Hệ quả: P3 (schema) phải cập nhật `thiet-ke-database-day-du.md` và viết migration cho từng cột ở B2.
  Chờ người dùng xác nhận trước khi viết migration.

---

## D-013: Đặt tên endpoint theo tài nguyên, không đưa vai trò vào đường dẫn [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-04, P1
- Bối cảnh: khi lập hợp đồng từng màn hình đã sinh ra nhiều biến thể: `/api/students/me/...`, `/api/teachers/me/...`,
  `/api/admin/students`, `/api/admin/payments/recent`… Trong khi `AGENTS.md` mục 6 chỉ yêu cầu tài nguyên số nhiều,
  kebab-case dưới tiền tố `/api`.
- Đã chọn:
  1. **Đường dẫn chỉ theo tài nguyên**, không có `/admin`, `/teacher`, `/staff`:
     `/api/users`, `/api/students`, `/api/teachers`, `/api/staff`, `/api/courses`, `/api/classes`,
     `/api/class-schedules`, `/api/rooms`, `/api/timetable`, `/api/events`, `/api/invoices`, `/api/payments`,
     `/api/discounts`, `/api/refunds`, `/api/cash-closings`, `/api/payroll`, `/api/posts`, `/api/leads`,
     `/api/assessments`, `/api/assignments`, `/api/notifications`, `/api/imports`, `/api/reports/*`,
     `/api/audit-logs`, `/api/settings`.
  2. **Dữ liệu của chính mình** dùng tiền tố `/api/me`: `GET /api/me`, `/api/me/tuition`, `/api/me/payments`,
     `/api/me/scores`, `/api/me/lessons`, `/api/me/attendance`, `/api/me/progress`, `/api/me/payroll`,
     `/api/me/classes`, `/api/me/students`, `/api/me/leads`, `/api/me/posts`, `/api/me/events`,
     `/api/me/timetable`, `/api/me/summary`, `/api/me/notifications`.
  3. **Danh sách theo phạm vi vai trò** dùng bộ lọc truy vấn, không dùng path khác:
     `GET /api/students?classId=…`, `GET /api/leads?stage=new`.
  4. Hành động đặc thù nằm ở **sub-resource**: `PUT /api/classes/:classId/sessions/:sessionId/attendance`,
     `POST /api/classes/:classId/attendance/unlock`, `POST /api/leads/:id/convert`.
  5. `GET /api/auth/me` chỉ trả **danh tính và vai trò** (`id`, `fullName`, `roles[]`), không trả hồ sơ nghiệp vụ.
  6. Site công khai dùng tiền tố `/api/public`: `/api/public/courses`, `/api/public/teachers`,
     `/api/public/consultations`.
- Phương án đã loại và lý do: `/api/admin/...` và `/api/teachers/me/...` (nhân bản tài nguyên, dễ lệch với bảng DB,
  khó tra cứu; quyền đã kiểm bằng `requireRole` nên không cần nhúng vào path).
- Hệ quả: cùng một endpoint phục vụ nhiều vai trò với phạm vi dữ liệu khác nhau → **bắt buộc** kiểm tra theo dữ liệu
  ở service, không chỉ `requireRole`. Phải có test cho trường hợp đúng vai trò nhưng ngoài phạm vi (403).

---

# Phase 2 — Kiểm chứng khung backend

## D-014: Khung backend gần như không cần sửa để biên dịch [ĐÃ CHỖT]
- Ngày / Phase: 2026-10-05, P2
- Bối cảnh: `HUONG-DAN-BACKEND.md` cảnh báo khung "chưa được cài thư viện, biên dịch hay chạy" và có thể có lỗi do
  khác phiên bản (`pino-http`, kiểu của `jsonwebtoken`, cấu hình NodeNext). Thực tế kiểm chứng:
- Kết quả kiểm chứng:
  - `npm run typecheck` **xanh ngay lần đầu**, 0 lỗi, với `express@5`, `zod` bản mới, `jsonwebtoken` bản mới,
    `moduleResolution: NodeNext` và `esModuleInterop: true`. Các nghi ngờ trong hướng dẫn **không xảy ra**.
  - Import kiểu `import pinoHttp from 'pino-http'` và `import jwt from 'jsonwebtoken'` đều hợp lệ nhờ `esModuleInterop`.
  - `expiresIn: number` của `jsonwebtoken` được chấp nhận, không cần ép kiểu `ms.StringValue`.
- Đã chọn: **không sửa kiến trúc, không đổi API module nào.** Chỉ bổ sung phần hạ tầng còn thiếu (D-015…D-019).
- Phương án đã loại và lý do: chỉnh lại code cho "chuẩn hơn" khi không có lỗi (vi phạm "sửa tối thiểu" của P2).

## D-015: `.env.example` không được chứa thông tin thật [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-05, P2
- Bối cảnh: `.env.example` gốc chứa **URL PostgreSQL thật của Aiven** kèm tên đăng nhập và mật khẩu
  (`avnadmin:AVNS_…@pg-3fbe2c6a-…aivencloud.com`). Đây là bí mật đã được commit (vi phạm `AGENTS.md` mục 7).
- Đã chọn: thay bằng URL PostgreSQL local khớp `docker-compose.yml`, đặt khoá thật chỉ trong `.env` (đã gitignore)
  và sinh bằng `crypto.randomBytes(48)`. Hai khoá JWT trong file mẫu giữ dạng placeholder.
- Phương án đã loại và lý do: giữ URL cloud trong file mẫu (rò rỉ bí mật); dùng luôn database cloud cho phát triển
  và test (test sẽ xoá sạch dữ liệu — nguy hiểm).
- Hệ quả: nếu sau này dùng database cloud thì đặt URL vào `.env` cục bộ, **không** commit.
  Nếu khoá đã bị lộ, cần đổi mật khẩu `avnadmin` trên Aiven — cần người dùng tự làm.

## D-016: Test dùng database riêng, xoá và dựng lại trước mỗi lần chạy [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-05, P2
- Bối cảnh: test cần dữ liệu sạch và không được chạm database phát triển.
- Đã chọn: `TEST_DATABASE_URL` trỏ tới `trung_tam_test`. `tests/global-setup.ts` **xoá và tạo lại** database này
  rồi chạy `prisma migrate deploy`; mỗi test file gọi `resetDatabase()` (`TRUNCATE … RESTART IDENTITY CASCADE`)
  trước mỗi test. Các test chạy tuần tự (`fileParallelism: false`) vì dùng chung một database.
- Phương án đã loại và lý do: dùng chung database phát triển (`prisma migrate reset` rất dễ mất dữ liệu thật —
  `AGENTS.md` mục 9); transaction rollback cho từng test (PostgreSQL + Prisma không rollback được khi test gọi HTTP
  qua nhiều connection).
- Hệ quả: cần `POSTGRES` user có quyền `CREATE DATABASE`. `npm test` không chạy được nếu PostgreSQL chưa bật —
  script sẽ báo rõ.

## D-017: npm 11 chặn install script — phải duyệt cho Prisma và argon2 [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-05, P2
- Bối cảnh: `npm install` báo `install-scripts … not yet covered by allowScripts` và **không** chạy script của
  `@prisma/client`, `@prisma/engines`, `prisma`, `argon2`, `esbuild`. Hậu quả: Prisma Client không được sinh,
  argon2 không có binding native.
- Đã chọn: chạy `npm install-scripts approve @prisma/client @prisma/engines argon2 esbuild prisma` rồi
  `npx prisma generate`. Đã kiểm chứng: argon2 băm/xác minh được, Prisma Client sinh thành công.
- Hệ quả: ghi vào `backend/README.md` vì máy mới phải làm lại bước này.

## D-018: Nới hạn mức rate limit khi `NODE_ENV=test` [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-05, P2
- Bối cảnh: `loginLimiter` giới hạn 20 lần/15 phút. Bộ test cố tình đăng nhập sai 5 lần để kiểm tra khoá tài khoản,
  nhiều file test cộng dồn sẽ vượt 20 và nhận `429` trước khi tới bước kiểm tra `423`.
- Đã chọn: `src/middlewares/rateLimit.ts` đọc `NODE_ENV`; ở `test` nới lên 100 000, ở môi trường thật giữ nguyên
  giá trị cũ (600 / 20 / 10).
- Hệ quả: giới hạn thật **không** bị nới lỏng; test vẫn kiểm tra được hành vi 423.

## D-019: Cột database tạm dùng camelCase, chưa đổi sang snake_case [CẦN XÁC NHẬN]
- Ngày / Phase: 2026-10-05, P2
- Bối cảnh: `schema.prisma` dùng camelCase cho **tên bảng đã** `@@map` sang snake_case, nhưng **cột** chưa `@map`.
  Điều này **trái với D-004** và `AGENTS.md` mục 9. `HUONG-DAN-BACKEND.md` mục 10 cũng nói "nên quyết định trước
  khi có dữ liệu thật".
- Đã chọn (tạm): **giữ nguyên camelCase ở P2** vì nhiệm vụ là kiểm chứng khung và "sửa tối thiểu"; thêm `@map` cho
  ~90 cột là thay đổi lớn, phải làm trước khi có dữ liệu thật và cần chạy lại toàn bộ truy vấn.
- Phương án đã loại và lý do: đổi ngay ở P2 (vượt phạm vi, rủi ro cao khi migration chưa từng chạy thật).
- Hệ quả: **phải quyết định ở P3 trước khi seed dữ liệu thật.** Đã ghi vào `docs/PROGRESS.md`.

## D-020: Tìm kiếm tiếng Việt không phân biệt dấu [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-05, P2
- Bối cảnh: test `search=nguyen` không ra `Nguyễn Văn A`. Nguyên nhân: `mode: 'insensitive'` của Prisma
  chỉ bỏ HOA THƯỜNG, **không** bỏ dấu tiếng Việt. Hướng dẫn gốc mục 8 lại dùng đúng ví dụ này
  (`?search=Nguyen`), và mọi màn hình danh sách đều có ô tìm kiếm tên.
- Đã chọn: bật extension `unaccent` của PostgreSQL qua migration `20261005070000_add_unaccent`, bọc lại
  thành hàm `ttnn_unaccent(text)` đánh dấu `IMMUTABLE` (extension gốc không có nhãn này nên không index
  được), kèm index trên `ttnn_unaccent("fullName")`.
- Vì sao không dùng cách khác:
  - Chuẩn hoá trong ứng dụng: phải bỏ dấu mọi bản ghi khi ghi, cần cột phụ, và tốn công khi sửa dữ liệu cũ.
  - Chuẩn hoá bằng `pg_tgm` (`similarity`): trả về điểm số, dễ trả kết quả lạ; người dùng cần tìm chính xác.
- Lỗi đã phát hiện khi kiểm chứng: bản đầu chỉ bỏ dấu **cột** mà quên bỏ dấu **từ khoá**, nên gõ
  `nguyễn` (có dấu) lại không ra kết quả. Đã sửa thành bỏ dấu cả hai vế.
- Hệ quả: mọi module có tìm kiếm tên ở P3 trở đi phải dùng `ttnn_unaccent` theo mẫu này.
  Tiền tố `CREATE EXTENSION` cần quyền trên production — kiểm tra khi lên triển khai (P21).

## D-021: `students.email` KHÔNG phải cột duy nhất, `student_code` mới là duy nhất [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-05, P2 (người dùng xác nhận)
- Bối cảnh: test ban đầu giả định email trùng phải trả 409, nhưng thực tế tạo được (201). Kiểm tra lại:
  `schema.prisma` chỉ đánh dấu `@unique` cho `studentCode` và `userId`, và đặc tả thiết kế
  (`thiet-ke-database-day-du.md:78`) cũng chỉ ghi `student_code (duy nhất)`.
- Đã chốt: **giữ nguyên schema** — thêm ràng buộc duy nhất cho `email` sẽ là sai nghiệp vụ.
- Lý do (người dùng nêu):
  - Phụ huynh có thể dùng chung một email để nhận thông báo cho con, hoặc một học viên dùng email của
    người nhà/trường. Ép duy nhất sẽ chặn những ca hợp lệ.
  - Ý tưởng ban đầu: **trung tâm cấp email** cho học viên (`hv...@trungtam.edu.vn`), nên email là dữ liệu
    do trung tâm quản lý, không phải định danh người dùng.
  - Vì vậy **định danh tin cậy là `student_code`**, không phải email.
- Hệ quả cần ghi nhớ:
  - Tìm kiếm học viên **không được dựa vào email** làm khoá duy nhất; dùng `student_code` hoặc tên + mã.
  - Module import Excel ở P6 phải cho phép trùng email và báo lỗi khi trùng `student_code`.
  - Nếu sau này cấp email tự động thì email đó **không** dùng làm khoá và không đảm bảo duy nhất.
  - `errorHandler` đã sẵn sàng dịch lỗi `P2002` thành 409 nên khi nào siết `student_code` cũng không cần sửa thêm.
- Test đã sửa cho khớp: `tests/students.test.ts` kiểm tra email trùng vẫn tạo được (201) và mã học viên
  sinh ra khác.

---

## D-022: Xóa migration cũ, tạo lại `init` một lần duy nhất ở P3 [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-06, P3
- Bối cảnh: migration P2 (`20261005064713_init`, `20261005070000_add_unaccent`, `20261005090000_init`, `20261005091000_constraints`) được tạo lẻ từng lần khi schema thay đổi. Hiện tại schema đã đủ đầy (thêm `score_changes`, nhiều cột/cột mới), cần một migration gốc sạch làm nền tảng bền vững cho các phase sau.
- Đã chọn: **xoá toàn bộ migration cũ** và chạy `prisma migrate dev --name init` từ schema hiện tại → tạo `20261006021914_init`. Sau đó tạo migration `20261006022131_constraints` chứa toàn bộ ràng buộc SQL (CHECK, unique có điều kiện, trigger append-only, views). Từ sau phase này **tuyệt đối không sửa** migration đã áp dụng.
- Hệ quả:
  - Mọi máy phát triển/test đều dựng từ cùng một migration duy nhất.
  - `prisma migrate reset` an toàn vì chưa có dữ liệu thật.
  - Database test tạo lại sạch sẽ trước mỗi `npm test`.

---

## D-023: Thêm bảng `score_changes` (P3 theo đặc tả, nhưng người dùng yêu cầu ở P3) [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-06, P3
- Bối cảnh: đặc tả liệt kê `score_changes` là P3, nhưng yêu cầu phase này yêu cầu thêm tất cả bảng P1/P2 còn thiếu. Người dùng có nhu cầu theo dõi lịch sử sửa điểm.
- Đã chọn: **thêm `score_changes` vào schema P3** vì đây là bảng nhật ký (chỉ thêm) và phục vụ quy tắc nghiệp vụ "ghi audit_logs cho điểm". Cũng thêm trigger `scores_append_only` để điểm chỉ sửa bằng cách thêm dòng vào `score_changes`.
- Hệ quả: Giáo viên không sửa trực tiếp `scores`; mọi thay đổi phải tạo `ScoreChange` tương ứng.

---

## D-024: Seed demo lấy trực tiếp từ dữ liệu giả của frontend [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-06, P3
- Bối cảnh: yêu cầu phase này yêu cầu seed dựa trên mock frontend. File `backend/prisma/demo-data.ts` đã chứa dữ liệu giả phù hợp với `frontend/src/data/*.ts`.
- Đã chọn: **giữ nguyên `demo-data.ts`** vì dữ liệu đã bám sát mock frontend và đủ lớn để kiểm ch tra các màn hình. Cờ `--demo` trong `prisma/seed.ts` chỉ chạy `seedDemo` và in mật khẩu demo một lần.
- Hệ quả: `npm run db:seed -- --demo` tạo dữ liệu demo đầy đủ; `npm run db:seed` (không có `--demo`) chỉ tạo vai trò + admin + 1 khóa học mẫu.

## D-025: Refresh token rotation với phát hiện reuse + bảng `refresh_tokens` [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-07, P4
- Bối cảnh: JWT access token ngắn (15 phút) cần refresh an toàn; phải phát hiện token bị ăn cắp (reuse).
- Đã chọn: bảng `refresh_tokens` lưu hash (argon2id) của refresh token, có `parentRefreshTokenId` để truy vết chain. Mỗi lần refresh:
  1. Tìm bản ghi khớp userId + token hash.
  2. Nếu tìm thấy → vô hiệu hóa cũ, tạo mới ghi `parentRefreshTokenId`.
  3. Trả 401 nếu token **đã dùng rồi** (reuse, nghi ngờ bị đánh cắp) hoặc hết hạn.
- Hàm: `hashRefreshToken()` / `verifyRefreshTokenHash()` trong `tokens.ts`.
- Hệ quả: migration `20261007013709_add_refresh_token_parent`; `npm run check` xanh (sau sửa httpError.ts).

## D-026: `mustChangePassword` flag cho tài khoản seed demo [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-07, P4
- Bối cảnh: tài khoản admin seed demo cần bắt đổi mật khẩu lần đầu.
- Đã chọn: cờ `mustChangePassword` trên `users` (boolean). Login trả `mustChangePassword` trong body; controller/frontend bắt đổi mật khẩu trước khi dùng API khác.
- Hệ quả: login response chứa trường `mustChangePassword`; seed demo đặt `mustChangePassword = true` cho admin.

## D-027: Truyền `portal` trong body đăng nhập [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-07, P4
- Bối cảnh: frontend cần phân biệt portal (học viên/giáo viên/nhân viên) để tạo refresh token phù hợp.
- Đã chọn theo yêu cầu P4: login nhận `portal: "client" | "admin"` trong JSON body; portal admin yêu cầu tài khoản có role `admin`. Refresh token không mang portal.
- Không dùng portal trong cookie vì cookie là credential phiên; scope đăng nhập cần được kiểm tra khi xác thực thông tin đăng nhập.

## D-028: Hợp đồng xác thực và quản lý tài khoản P4 [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-07, P4.
- Chốt theo yêu cầu P4: `POST /api/auth/login` nhận `portal: client|admin`; portal admin yêu cầu vai trò admin, portal client từ chối tài khoản chỉ có admin. Login và `/api/auth/me` trả `data.user` theo `AuthUser` thật của frontend (`id` dạng chuỗi, `username`, `name`, `email`, `role`, `mustChangePassword`).
- Refresh token là JWT có `jti`, DB lưu Argon2id hash theo `tokenId`; refresh xoay trong transaction. Dùng lại token bị thu hồi làm thu hồi cả họ token. Đổi mật khẩu, reset, khóa và xóa tài khoản thu hồi phiên; `tokenVersion` chặn access token cũ.
- Tài khoản có `mustChangePassword` chỉ gọi được `/api/auth/me`, `/api/auth/change-password`, `/api/auth/logout`; API nội bộ còn lại trả 403 `PASSWORD_CHANGE_REQUIRED`.
- Username được so sánh không phân biệt hoa thường như hợp đồng frontend; DB có unique index trên `lower(username)`.

## D-029: Gửi email đặt lại mật khẩu [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-07, P4.
- Dùng nodemailer qua SMTP (`SMTP_*`). Môi trường phát triển không cần SMTP: logger in nội dung email mẫu nhưng ẩn recipient và reset token, tuân thủ quy tắc không ghi dữ liệu cá nhân/token vào log. Muốn nhận link thật cần cấu hình SMTP trong `.env`.
- Token reset tạo ngẫu nhiên 256-bit, chỉ lưu SHA-256 hash, hết hạn 20 phút và chỉ dùng một lần. Phản hồi API luôn giống nhau cho email tồn tại/không tồn tại.
- Lý do thêm thư viện: nodemailer là yêu cầu cụ thể của P4 và là thư viện SMTP phổ biến; không có sẵn trong backend.

## D-030: Phân quyền theo dữ liệu cho giáo viên và nhân viên (P5) [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-09, P5.
- Giáo viên chỉ xem được học viên thuộc lớp mình phụ trách (chính qua `classes.teacher_id`, phụ qua `class_teachers`); danh sách giáo viên chỉ trả lớp mình, không trả `identityNo`. Nhân viên thường không xem danh sách nhân viên (admin-only); chỉ sửa được hồ sơ mình và chỉ khi là advisor của học viên đó. Kiểm tra ở backend, không dựa vào ẩn menu frontend.

## D-031: Upload tệp — kiểm tra MIME bằng magic-byte, lưu local qua interface [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-09, P5.
- Multer dùng memoryStorage, giới hạn 5 MB (`FILE_MAX_SIZE_MB`). Kiểu MIME xác định bằng magic-byte (`fileType.ts`), không tin `Content-Type` từ client. Lưu qua `FileStorage` interface với `LocalFileStorage` mặc định (`FILE_STORAGE_DIR=storage/uploads`), đổi tên file để tránh trùng, không thực thi file tải lên. Sẵn sàng thêm S3 bằng cách cài interface khác.
- Lý do: tuân thủ quy tắc bảo mật upload (kiểm tra theo nội dung, giới hạn dung lượng, đổi tên, không thực thi).

## D-032: Xuất Excel phía server (P5) [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-09, P5.
- Dùng exceljs tạo buffer xlsx trong memory, trả kèm `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` và `Content-Disposition: attachment`. Cột và thứ tự theo hợp đồng frontend. Phân trang/xuất client chuyển sang server (lệch F5/F6).
- Lý do thêm thư viện: exceljs là thư viện xlsx phổ biến, tạo file Excel phía server theo yêu cầu xuất danh sách.

## D-033: `teachers.userId`/`staff.userId` nullable + unique (P5) [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-09, P5.
- Giáo viên/nhân viên có thể chưa có tài khoản đăng nhập (tạo hồ sơ trước, gắn tài khoản sau). `userId` nullable và unique (mỗi tài khoản gắn tối đa một giáo viên/nhân viên). Migration `20261007130000_optional_user_link`.

## D-034: Mật khẩu tạm một lần khi tạo kèm tài khoản (P5) [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-09, P5.
- Tạo giáo viên/nhân viên kèm tài khoản: sinh mật khẩu tạm, trả một lần trong phản hồi, đặt `mustChangePassword=true`, không lưu dạng rõ. Tạo không kèm tài khoản: `hasAccount=false`, không trả `temporaryPassword` (null).

## D-035: Tìm kiếm tiếng Việt dùng `ttnn_unaccent(lower(...))` (P5) [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-09, P5.
- Pattern chuẩn cho mọi tìm kiếm không dấu: `ttnn_unaccent(lower(concat_ws(' ', <cột>))) LIKE '%' || ttnn_unaccent(lower(<từ khoá>)) || '%'`. `lower()` trả `text` nên chỉ cần overload `text` của `ttnn_unaccent`. Sửa lỗi chính tả `tnnn_unaccent` (3 chữ n) gây lỗi 42883 ở `students.service.ts`.

## D-036: Dữ liệu nhạy cảm không ghi audit_logs (P5, sửa lỗi rà soát) [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-10, P5.
- Bối cảnh: rà soát P5 phát hiện CCCD (`identityNo`) được ghi **dạng rõ** vào `audit_logs.newData/oldData` ở `me.service.ts` (duyệt yêu cầu đổi hồ sơ) và `students.service.ts` (tạo/sửa/xoá mềm/khôi phục học viên) — vi phạm BR-12 và comment trên cột `students.identity_no` ("không bao giờ ghi vào audit_logs").
- Đã chọn: tạo `studentAuditDto()` (bỏ `identityNo` khỏi DTO ghi audit) cho mọi `writeAudit` của module students; `reviewChangeRequest` chỉ ghi `{ fieldName }` khi trường thuộc tập nhạy cảm (`SENSITIVE_AUDIT_FIELDS`). Giá trị CCCD vẫn được lưu trong `profile_change_requests` (bảng riêng, chỉ staff/admin đọc được) và áp dụng khi duyệt — chỉ không đi vào audit.
- Hệ quả: test profiles/students kiểm tra audit không chứa giá trị CCCD.

## D-037: Transaction timeout 15s cho các thao tác nhiều query (P5, sửa lỗi rà soát) [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-10, P5.
- Bối cảnh: database dev/test là PostgreSQL cloud (~0,5–1s mỗi query). Transaction mặc định 5s của Prisma hết hạn (lỗi `P2028`) khi một request chạy 6–8 query trong transaction — tái tạo được trong isolation, làm `npm run check` đỏ ở `PATCH /api/me/profile`.
- Đã chọn: helper `runInTx()` với `{ timeout: 15_000 }` thay `prisma.$transaction(fn)` ở `me.service.ts`, `teachers.service.ts`, `staff.service.ts` (pattern đã có ở `students.service.ts`). `updateMyProfile` chuyển `readMyProfile`/`avatarUrlOf` ra ngoài transaction và bỏ `findProfileRecord` trùng để giảm query trong tx.
- Hệ quả: `PATCH /api/me/profile` và các endpoint CRUD giáo viên/nhân viên không còn hết timeout trên DB từ xa.

## D-038: Thống nhất audit `recordId` theo bản ghi hồ sơ + lọc specialty/position/department (P5) [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-10, P5.
- `recordId` trong audit_logs của thao tác duyệt yêu cầu đổi hồ sơ là **id bản ghi hồ sơ** (student/teacher/staff), nhất quán với thao tác sửa trực tiếp (trước đó ghi userId). Tra profile id trong transaction qua `profileRecordId()`.
- Bổ sung bộ lọc theo hợp đồng C.5.5: `specialty` cho `/api/teachers`, `position`/`department` cho `/api/staff` (LIKE không phân biệt dấu).
- Bỏ `branchId` khỏi `createStaffSchema` — model `staff` không có cột `branchId` (trước đó schema nhận nhưng service silently drop).
- Hệ quả: test profiles/students cập nhật expect `recordId`; test teachers/staff thêm test lọc.

## D-039: Nhập Excel — validate trước, tạo tài khoản khi confirm (P6) [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-12, P6.
- Hai bước: (1) `POST /api/imports` chỉ đọc file, chuẩn hóa, validate từng dòng (zod), phát hiện trùng mã/sđt trong file và trong hệ thống, lưu `import_batches`/`import_rows` — **chưa tạo tài khoản**; (2) `POST /api/imports/:id/confirm` mới tạo User + hồ sơ + vai trò trong **một transaction**. Admin xem trước và sửa file trước khi chạm DB người dùng.
- Tên đăng nhập sinh từ họ tên (bỏ dấu, thường, `nguyen.van.a`); trùng thì tự suffix `2`, `3`... (bắt P2002 rồi thử lại).
- Mật khẩu tạm sinh ngẫu nhiên 12 ký tự, đặt `mustChangePassword=true`, **chỉ lưu Argon2 hash** (D-034).
- Timeout transaction tỉ lệ với số dòng (`30s + 200ms/dòng`, tối đa 10 phút) vì argon2 ~100ms/dòng — tránh P2028 trên DB từ xa.

## D-040: Token credentials một lần, lưu trong bộ nhớ (P6) [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-12, P6.
- `POST /api/imports/:id/credentials` trả Excel danh sách tài khoản + mật khẩu tạm. Token ngẫu nhiên 256-bit, **dùng một lần**, hết hạn 15 phút, lưu trong `Map` bộ nhớ service (không vào DB, log, audit). Sai token -> 404; đã dùng -> 409; hết hạn -> 410.
- Hệ quả: restart server mất token chưa dùng (admin phải xác nhận lại không được — lô đã COMPLETED; chấp nhận vì mật khẩu chỉ cần tải ngay sau khi nhập). Không lưu mật khẩu dạng rõ ở bất kỳ đâu (BR-12).
- Lý do: bảng `import_credentials` sẽ phải lưu mật khẩu dạng rõ hoặc mã hóa reversible — đều vi phạm "không lưu mật khẩu dạng rõ"; trong bộ nhớ là an toàn nhất cho dữ liệu nhất thời.

## D-041: Auth state chỉ qua `/api/auth/me`, bỏ localStorage (P7 NỐI #1) [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-13, P7.
- `AuthProvider` gọi `/api/auth/me` mỗi tải trang (cookie httpOnly tự gửi); không lưu user/token ở localStorage (quy tắc: không lưu token vào localStorage). Trạng thái `initializing` để `requireRole` hiện loading thay vì nhảy về login.
- `mock-accounts.ts` chỉ còn dữ liệu cho `DemoRolePicker` khi `VITE_DEMO_MODE=true`; production build không dùng.

## D-042: Tài khoản nhiều vai trò → màn chọn khu vực `/chon-khu-vuc` (P7) [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-13, P7.
- Login thành công: `mustChangePassword` → `/doi-mat-khau`; nhiều vai trò → `/chon-khu-vuc` (chọn portal, lưu choice trong state context, không localStorage); một vai trò → thẳng `ROLE_META[role].home`.
- `requireRole` redirect về `ROLE_META[user.role].home` khi sai vai trò; trang 403 riêng (`/403`) cho truy cập trực tiếp URL.

## D-043: Màn Tài khoản xuất Excel ở client (P7) [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-13, P7.
- Backend module `accounts` **không có** endpoint export (chỉ students/teachers/staff có `/export`). Màn Tài khoản dùng `exportAdminTable` client-side, lấy tối đa 100 dòng từ API. Lệch nhỏ so với hợp đồng F5/F6 (xuất server) — ghi nhận ở đây; bổ sung endpoint export cho accounts ở phase sau nếu cần.

## D-044: Chuẩn hoá lỗi UI qua `errorMessage()` (P7) [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-13, P7.
- `lib/api-error.ts`: ưu tiên `error.message` tiếng Việt từ backend (`ApiError`), fallback message mặc định. Mọi mutation/query `.catch` dùng helper này — không để lỗi raw ra UI.

## D-045: `SessionExpiryHandler` trong `RootLayout` (P7) [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-13, P7.
- Component cần `useNavigate` nên phải render bên trong `RouterProvider`. `RootLayout` (wraps RouterProvider) là nơi phù hợp; `app.tsx` chỉ còn `ErrorBoundary` + `RootLayout`.

## D-046: Tạo GV/NV qua form không kèm tài khoản (P7) [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-13, P7.
- Form thêm/sửa giáo viên/nhân viên chỉ gửi trường hồ sơ (backend hỗ trợ `account.username` tùy chọn nhưng UI không tạo TK kèm). Muốn tài khoản đăng nhập: admin tạo riêng ở màn Tài khoản (`/tai-khoan`). Tránh hai nơi cùng tạo username bị trùng.
- Học viên không có khái niệm tài khoản riêng biệt — `hasAccount` chỉ là badge đọc từ `userId !== null`.

## D-047: Đổi/đặt lại mật khẩu cấp phiên mới ngay (P7, sửa bug) [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-13, P7 (sửa bug khi test thủ công).
- Triệu chứng: đăng nhập tài khoản mới (mật khẩu tạm) → đổi mật khẩu thành công → mọi request kế tiếp báo "Phiên đăng nhập đã hết hạn".
- Nguyên nhân: `changePassword`/`resetPassword` tăng `tokenVersion` và thu hồi **mọi** refresh token nhưng **không cấp token mới**. Access token cookie cũ có `ver` cũ → middleware từ chối (401); client thử `/api/auth/refresh` → refresh token đã thu hồi → 401 → client báo hết phiên.
- Đã chọn: sau khi đổi/đặt lại mật khẩu thành công, service tạo refresh session mới (`createRefreshSession` với `tokenVersion` mới) và controller đặt lại cookie `access_token`/`refresh_token`. Phiên cũ (trình duyệt khác) vẫn bị thu hồi đúng ý đồ bảo mật; trình duyệt đang thao tác được tiếp tục dùng hệ thống.
- Hệ quả: test `accounts.test.ts` cập nhật kỳ vọng (sau đổi mật khẩu còn đúng 1 refresh token chưa thu hồi = phiên mới; cookie cũ 401, cookie mới 200). Test mới ở `auth.test.ts` và `accounts.test.ts` xác nhận cookie phiên mới và `/api/auth/me` hoạt động ngay.

## D-048: Endpoint auth công khai không trigger làm mới phiên (P7, sửa bug) [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-13, P7 (sửa bug khi test thủ công).
- Triệu chứng: đăng nhập sai mật khẩu (login trả 401 `UNAUTHORIZED`) nhưng UI lại báo "Phiên đăng nhập đã hết hạn" — vì `apiRequest` xử lý **mọi** 401 bằng cách thử `/api/auth/refresh` rồi báo hết phiên, che mất lỗi thật "Sai tên đăng nhập hoặc mật khẩu".
- Đã chọn: `client.ts` bỏ qua bước làm mới token với các endpoint công khai (`/api/auth/login`, `/api/auth/forgot-password`, `/api/auth/reset-password`) — 401 ở đó là lỗi nghiệp vụ (sai mật khẩu, token reset không hợp lệ), trả thẳng message từ backend.
- Hệ quả: UI giờ hiển thị đúng "Sai tên đăng nhập hoặc mật khẩu" khi đăng nhập sai; chỉ endpoint cần đăng nhập mới đi vào flow refresh → hết phiên.

## D-049: Đăng nhập bằng tên đăng nhập hoặc email (P7, sửa bug) [ĐÃ CHỐT]
- Ngày / Phase: 2026-10-13, P7 (sửa bug khi test thủ công).
- Triệu chứng: tạo tài khoản học viên (có email) rồi đăng nhập bằng email → 401 "Sai tên đăng nhập hoặc mật khẩu", dù mật khẩu tạm copy đúng. Đăng nhập admin (username `admin`) vẫn thành công.
- Nguyên nhân: form login UI ghi "Tên đăng nhập hoặc email" (placeholder "VD: hocvien hoặc email@trungtam.edu.vn") nhưng `authService.login` chỉ tìm theo cột `username` — nhập email trả "không tìm thấy user" → 401.
- Đã chọn: `login` tìm `OR[username, email]` (không phân biệt hoa thường). Lịch sử đăng nhập ghi identifier người dùng nhập. Test mới: "đăng nhập bằng email" (auth.test.ts, 19/19 xanh).
- Lưu ý: nếu một user có username trùng email của user khác, `findFirst` trả bản ghi đầu tiên — chấp nhận ở quy mô trung tâm; không ảnh hưởng flow chính.
