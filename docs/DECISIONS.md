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