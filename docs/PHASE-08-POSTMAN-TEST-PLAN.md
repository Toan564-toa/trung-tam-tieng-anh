# P8 — Ma trận kiểm thử API bằng Postman Desktop

Tài liệu này hướng dẫn kiểm thử thủ công Phase 8 (BACKEND): khóa học, phòng, ca học,
lớp, lịch học, buổi học, ghi danh, học viên tự xem dữ liệu và thời khóa biểu.
Đây là kế hoạch kiểm thử, không phải kết quả xác nhận các API đã đạt.

Nguồn đối chiếu: `AGENTS.md` mục 10, `docs/BUSINESS-RULES.md` BR-01/02/11/12,
`docs/FRONTEND-CONTRACT.md` mục C.2/C.3/C.4/C.5.7–C.5.10,
`docs/API.md` và các request mẫu trong `backend/requests/`.

## 1. An toàn trước khi gửi request

1. Chạy backend local (`npm run dev:be`) và kiểm tra `GET /health`.
2. Xác nhận `DATABASE_URL` của tiến trình backend là database/branch **dành riêng cho kiểm thử**,
   không phải production hay dữ liệu thật. Chỉ dùng tài khoản và dữ liệu giả.
   Không in, dán vào Postman, hoặc chia sẻ giá trị `.env`.
3. Các request tạo/cập nhật có ghi dữ liệu. Dùng mã định danh riêng cho lần chạy, ví dụ
   `P8-POSTMAN-20261018-01`; xóa mềm dữ liệu thử sau cùng nếu phù hợp.
4. Không gửi các request `DELETE` lên bản ghi dùng chung hoặc seed. Không chạy seed/migration
   trên database chưa xác nhận là môi trường test.
5. **Không chạy `npm run check`/`npm test` cho tới khi `TEST_DATABASE_URL` được xác nhận là
   database test độc lập có thể bị xóa.** `backend/tests/global-setup.ts` chạy
   `DROP DATABASE ... WITH (FORCE)` rồi tạo lại database đó.
6. Dùng Postman Desktop/Local Runner để gọi `http://localhost:4000`. Postman Cloud Runner
   không truy cập được `localhost` trên máy bạn.

## 2. Chuẩn bị Postman

Tạo environment `P8 Local` với:

| Variable | Giá trị |
|---|---|
| `baseUrl` | `http://localhost:4000` |
| `runTag` | Chuỗi duy nhất cho lần chạy, ví dụ `P8-POSTMAN-20261018-01` |
| `adminUsername`, `adminPassword` | Tài khoản admin giả của môi trường test |
| `staffUsername`, `staffPassword` | Tài khoản staff giả |
| `teacherAUsername`, `teacherAPassword` | Giáo viên phụ trách lớp A |
| `teacherBUsername`, `teacherBPassword` | Giáo viên không phụ trách lớp A |
| `studentAUsername`, `studentAPassword` | Học viên được ghi danh vào lớp A |
| `studentBUsername`, `studentBPassword` | Học viên không được ghi danh vào lớp A |
| `courseId`, `roomId`, `timeSlotId`, `classId`, `classBId` | Gán từ response khi tạo dữ liệu |
| `studentAId`, `studentBId`, `teacherAId`, `teacherBId` | ID giả từ dữ liệu test hiện có |
| `enrollmentAId`, `sessionAId`, `scheduleAId` | Gán từ response tương ứng |

Đặt mật khẩu thành **Secret** trong Postman Vault hoặc biến local không đồng bộ; không lưu
token vào variable, không export cookie, và không chia sẻ environment chứa thông tin đăng nhập.

Đăng nhập bằng `POST {{baseUrl}}/api/auth/login` với:

```json
{
  "username": "{{adminUsername}}",
  "password": "{{adminPassword}}",
  "portal": "admin"
}
```

Tạo bản sao request login cho từng vai trò, thay credentials và `portal` bằng vai trò cần test.
Xác thực dùng cookie `httpOnly`: dùng cùng host `localhost` cho mọi request để Postman Cookie Jar
nhận và gửi cookie. Không đặt token vào `Authorization` hoặc environment. Đăng nhập lại vai trò
khác trước nhóm request của vai trò đó; không chạy xen kẽ các login khi dùng chung Cookie Jar.

Trong tab **Scripts → Post-response** của request có thể dùng assertion cơ bản:

```javascript
pm.test("HTTP status đúng kỳ vọng", function () {
  pm.expect(pm.response.code).to.be.oneOf([200, 201, 204]);
});

pm.test("Không trả trường nhạy cảm", function () {
  if (pm.response.text()) {
    const body = pm.response.json();
    const forbidden = /passwordhash|password|accesstoken|refreshtoken|authorization|cookie/i;
    function inspect(value) {
      if (Array.isArray(value)) return value.forEach(inspect);
      if (value && typeof value === "object") {
        Object.entries(value).forEach(([key, child]) => {
          pm.expect(key, `Trường nhạy cảm: ${key}`).not.to.match(forbidden);
          inspect(child);
        });
      }
    }
    inspect(body);
  }
});
```

Với request âm, thay danh sách status trong assertion bằng mã đang kiểm tra (401, 403, 404,
409, 423 hoặc 400). Không để assertion status thành công chung cho tất cả request.

## 3. Thứ tự tạo dữ liệu và kiểm thử luồng chính

Chạy tuần tự, gán ID trả về vào environment. Nếu database không có dữ liệu giáo viên/học viên
thử, dùng endpoint quản lý tương ứng trên môi trường test để tạo dữ liệu giả trước; không giả
định ID là `1`.

### 3.1 Health và đăng nhập

| ID | Request | Cách thử | Kỳ vọng |
|---|---|---|---|
| P8-001 | `GET {{baseUrl}}/health` | Không cookie | 200, health OK |
| P8-002 | `POST /api/auth/login` | Login admin hợp lệ | 2xx, cookie phiên được đặt; body không trả password/token |
| P8-003 | `GET /api/auth/me` | Sau login | 2xx, đúng người/vai trò |
| P8-004 | `GET /api/auth/me` | Logout rồi gọi lại | 401 |

### 3.2 Khóa học, phòng và ca học

1. Admin tạo khóa học với `code`/`slug` duy nhất có `runTag`, `totalSessions: 64`,
   `sessionsPerWeek: 2`, `durationMonths: 8`, `listPrice` là số nguyên VND,
   `status: "PUBLISHED"` và `isPublic: true`. Lưu `courseId`.
2. Admin tạo phòng với tên có `runTag`, `capacity` đủ cho test, `status: "AVAILABLE"`.
   Lưu `roomId`.
3. Admin tạo ca học với mã duy nhất, `startTime` nhỏ hơn `endTime`; lưu `timeSlotId`.
4. Thử đọc/cập nhật danh sách và chi tiết, pagination, lọc status; kiểm tra list có envelope
   `{data:{items,page,pageSize,total,totalPages}}` theo quy ước API.
5. Gọi `GET /api/public/courses` và `GET /api/public/courses/{{courseId}}` không đăng nhập.
   Khóa học đã công khai xuất hiện; bản nháp/ẩn không được lộ ra công khai.
6. Thử mã trùng, trường bắt buộc thiếu, `listPrice` âm/thập phân, `startTime >= endTime`,
   `capacity` không hợp lệ, `pageSize=101`; kỳ vọng validation 400 hoặc conflict 409 theo hợp đồng.
7. Tạo một ca học đang được lịch lớp sử dụng; thử xóa. Không được làm hỏng lịch liên quan.
   Kiểm tra chính xác chính sách delete/409 trước khi chốt kỳ vọng theo implementation.

### 3.3 Lớp, lịch lặp và sinh buổi học

Tạo lớp A bằng admin. Payload tối thiểu tham khảo `backend/requests/classes.http`:

```json
{
  "courseId": {{courseId}},
  "classCode": "{{runTag}}-A",
  "name": "{{runTag}} Lop A",
  "teacherId": {{teacherAId}},
  "roomId": {{roomId}},
  "startDate": "2026-11-02",
  "expectedEndDate": "2027-07-02",
  "maxStudents": 2,
  "status": "PLANNED",
  "schedules": [
    {
      "weekday": 1,
      "startTime": "17:30",
      "endTime": "19:00",
      "roomId": {{roomId}},
      "timeSlotId": {{timeSlotId}}
    },
    {
      "weekday": 3,
      "startTime": "17:30",
      "endTime": "19:00",
      "roomId": {{roomId}},
      "timeSlotId": {{timeSlotId}}
    }
  ]
}
```

Gán `classId`, `scheduleAId` từ response. Ngày test phải nằm trong tương lai ở thời điểm chạy.

| ID | Thử nghiệm | Kỳ vọng |
|---|---|---|
| P8-020 | Tạo lớp với các FK hợp lệ và schedules | 2xx; trả DTO lớp khớp hợp đồng |
| P8-021 | Tạo lớp bằng staff | Theo code hiện tại phải 403 (route chỉ cho admin); đối chiếu và sửa lệch với `docs/API.md` nếu chủ đích là staff cũng được tạo |
| P8-022 | Tạo lớp với course/teacher/room không tồn tại hoặc ngày kết thúc trước ngày bắt đầu | 400/404 phù hợp; không tạo bản ghi dở dang |
| P8-023 | Tạo lịch trùng phòng cùng thời gian | Bị từ chối; không tạo lịch xung đột |
| P8-024 | Tạo lịch trùng giáo viên ở lớp khác | Bị từ chối; không tạo lịch xung đột |
| P8-025 | `GET /api/classes/{{classId}}/sessions` | Trả session đã sinh/thêm cho lớp, theo pagination |
| P8-026 | `GET /api/classes/{{classId}}/schedules` (được liệt kê trong API docs) | Xác minh route: hiện chưa thấy handler GET schedule; nếu 404 thì docs không khớp code và cần đồng bộ |
| P8-027 | `GET /api/classes/conflicts?...` | Phải vào handler conflicts; nếu trả 404/validation của ID, nghi route `/:id` bắt trước route tĩnh |
| P8-028 | `GET /api/classes/timetable?...` | Trả thời khóa biểu; nếu bị xử lý như class ID, cần sửa thứ tự route hoặc path |
| P8-029 | `POST /api/classes/{{classId}}/generate-sessions` với weekdays [1,3], giờ/phòng và `skipHolidays` | Sinh 64 buổi theo tổng buổi khóa học, không chứa ngày nghỉ được truyền |
| P8-030 | Gọi generate lần hai | Không nhân đôi buổi; chỉ cập nhật các buổi tương lai chưa điểm danh theo chính sách P8 |
| P8-031 | Thử sinh buổi trong khoảng có lịch phòng/giáo viên trùng | Conflict được báo; không để lại một phần session/lịch |
| P8-032 | Thêm/cập nhật session thủ công | Trả đúng `lessonNo`, ngày, giờ, phòng, giáo viên; `lessonNo` phải > 0 |

### 3.4 Ghi danh, học phí snapshot và thao tác liên quan

1. Tạo ghi danh cho `studentAId` vào lớp A với sức chứa còn chỗ. Lưu `enrollmentAId`.
2. Đọc chi tiết ghi danh, danh sách admin/staff; xác nhận invoice sinh cùng transaction và có
   snapshot giá khóa học/số buổi/đơn giá tại thời điểm ghi danh.
3. Dùng lớp A (capacity 2) ghi danh học viên thứ hai, sau đó thử học viên thứ ba: request cuối
   phải bị từ chối 409, sĩ số không được vượt giới hạn.
4. Thử ghi danh lại cùng học viên vào khóa đang học: 409 theo BR-02.
5. Thay đổi `courses.listPrice` sau khi có invoice; invoice hiện tại vẫn giữ snapshot ban đầu.
6. Gửi `tuitionAmount`/`discountAmount` sai, âm, thập phân hoặc thấp hơn/khác giá khóa học.
   Backend phải tính/kiểm tra số tiền theo dữ liệu tin cậy ở server; không được tin số tiền do
   client tự gửi. Đối chiếu `invoice.total`, `discount_amount` và phản hồi với BR-01/05.
7. Thử `PATCH /api/enrollments/{{enrollmentAId}}` và `/status` với dữ liệu hợp lệ/không hợp lệ.
   Kiểm tra status transition, invoice/payment không bị sửa trái quy tắc.
8. Freeze rồi unfreeze; kiểm tra khoảng ngày, lý do, bản ghi freeze được đóng đúng, request lặp
   hoặc ngày không hợp lệ bị từ chối.
9. Transfer sang lớp B; lớp cũ phải được đánh dấu `TRANSFERRED`, lớp mới có ghi danh đúng,
   transaction không để cả hai enrollment active nếu nghiệp vụ cấm.
10. Tạo makeup cho session gốc. Xác nhận buổi bù hợp lệ theo constraint DB, lịch phòng/giáo viên
   không xung đột và không thay đổi/xóa buổi gốc. Đặc biệt kiểm tra `lessonNo > 0`; lỗi constraint
   là blocker, không được coi là test pass.

| ID | Endpoint | Vai trò hợp lệ | Kỳ vọng chính |
|---|---|---|---|
| P8-040 | `GET/POST /api/enrollments` | admin, staff | List phân trang; create enrollment + invoice đồng bộ |
| P8-041 | `GET/PATCH /api/enrollments/:enrollmentId` | đọc: admin/staff/teacher/student theo scope; sửa: admin/staff | ID không tồn tại 404; người ngoài phạm vi không đọc/sửa được |
| P8-042 | `PATCH /api/enrollments/:enrollmentId/status` | admin, staff | Status hợp lệ; status sai 400 |
| P8-043 | `POST /api/enrollments/:enrollmentId/transfer` | admin, staff | Chuyển lớp có lý do/ngày và transaction hoàn chỉnh |
| P8-044 | `POST /api/enrollments/:enrollmentId/freeze` | admin, staff | Tạo freeze record |
| P8-045 | `POST /api/enrollments/:enrollmentId/unfreeze` | admin, staff | Đóng freeze record đúng |
| P8-046 | `POST /api/enrollments/:enrollmentId/makeup` | admin, staff | Tạo buổi bù hợp lệ, không vi phạm constraint/lịch |

## 4. Ma trận quyền theo route hiện thực

Ký hiệu: **2xx** = được phép và có dữ liệu phù hợp; **403** = sai vai trò; **401** = chưa đăng
nhập. Với tài nguyên không thuộc quyền xem, kỳ vọng theo scope là 403 hoặc 404 thống nhất,
không trả dữ liệu của người khác. Đối chiếu route hiện thực trong `backend/src/modules/*/*.routes.ts`.

| Nhóm route | Admin | Staff | Teacher A | Teacher B | Student A | Student B | Chưa đăng nhập |
|---|---:|---:|---:|---:|---:|---:|---:|
| `GET /api/courses`, `GET /api/courses/:id` | 2xx | 2xx | 403 | 403 | 403 | 403 | 401 |
| `POST/PATCH/DELETE /api/courses...` | 2xx | 403 | 403 | 403 | 403 | 403 | 401 |
| `GET/POST/PATCH/DELETE /api/rooms...` | 2xx | 403 | 403 | 403 | 403 | 403 | 401 |
| `GET /api/time-slots` | 2xx | 2xx | 2xx | 2xx | 2xx | 2xx | 401 |
| `POST/PATCH/DELETE /api/time-slots...` | 2xx | 403 | 403 | 403 | 403 | 403 | 401 |
| `GET /api/classes`, `/today` | 2xx | 2xx | 403 | 403 | 403 | 403 | 401 |
| `POST /api/classes` | 2xx | 403* | 403 | 403 | 403 | 403 | 401 |
| `GET /api/classes/:id` | 2xx | 2xx | lớp A: 2xx; lớp khác: chặn | lớp A: chặn; lớp B: 2xx | 403 | 403 | 401 |
| `PATCH/DELETE /api/classes/:id...`, teacher change, schedules | 2xx | 403 | 403 | 403 | 403 | 403 | 401 |
| Generate sessions; thêm/cập nhật sessions | admin/staff: 2xx theo endpoint | 2xx theo endpoint | 403 | 403 | 403 | 403 | 401 |
| Class students/sessions và timetable | 2xx | 2xx | chỉ lớp A | chỉ lớp B | 403 | 403 | 401 |
| `GET /api/classes/teacher/classes...` | 403 | 403 | chỉ lớp A | chỉ lớp B | 403 | 403 | 401 |
| List/create/update/transfer/freeze/unfreeze/makeup enrollments | 2xx | 2xx | 403 | 403 | 403 | 403 | 401 |
| `GET /api/enrollments/:id` | 2xx | 2xx | chỉ ghi danh lớp mình | chỉ ghi danh lớp mình | chỉ của mình | chỉ của mình | 401 |
| `GET /api/me/enrollments`, `/api/me/lessons` | 403 | 403 | 403 | 403 | chỉ dữ liệu mình | chỉ dữ liệu mình | 401 |
| `GET /api/public/courses...` | 2xx | 2xx | 2xx | 2xx | 2xx | 2xx | 2xx |

`*` Code route hiện tại chỉ cho admin tạo lớp, trong khi một số tài liệu/API tổng quan ghi
staff/admin. Trước commit cần chốt hành vi mong muốn rồi đồng bộ route, `docs/API.md` và
request mẫu; không ghi nhận staff=403 là pass nếu hợp đồng đã chốt staff được tạo lớp.

### Cách kiểm tra IDOR

1. Tạo lớp A do Teacher A phụ trách và lớp B do Teacher B phụ trách; ghi danh Student A vào A,
   Student B vào B.
2. Đăng nhập Teacher A: thử `GET /api/classes/{{classAId}}`, `/students`, `/sessions`,
   `/api/classes/teacher/classes/{{classAId}}/students`, và enrollment của A — được phép.
3. Với cùng cookie Teacher A, thử đổi mọi ID sang lớp/enrollment B. Phải bị chặn 403/404,
   không được trả tên, email, mã học viên hay chi tiết enrollment B.
4. Lặp lại với Student A: `/api/me/enrollments` và `/api/me/lessons` chỉ có dữ liệu A;
   `GET /api/enrollments/{{enrollmentBId}}` phải bị chặn.
5. Dùng Student B làm đối chứng và thử IDs của A. Kết quả tương tự: không được lộ dữ liệu.
6. Gọi mọi route bảo vệ không cookie; phải 401. Route public courses và `/health` là ngoại lệ.

## 5. DTO, validation, nghiệp vụ và audit cần ghi nhận

- List trả đúng pagination envelope; kiểm tra page mặc định, pageSize mặc định 20, tối đa 100,
  sắp xếp ổn định và filter được hỗ trợ.
- So sánh field thực trả với hợp đồng: khóa học/admin (`AdminCourse`), lớp (`TeacherClass`/
  `CenterClass`), chi tiết `ClassLesson`, danh sách `TeacherStudent`, enrollment và lịch 64 buổi.
  Trường tính như `enrolled`, `studentCount`, `doneLessons`, tiến độ không được nhập từ client.
- Không trả `passwordHash`, mật khẩu, access/refresh token, cookie, secret, hoặc thông tin lớp/
  học viên khác. Thử cả response list, detail, lỗi validation và lỗi 500.
- Với tiền: số nguyên VND, không số thực/âm; snapshot không đổi sau cập nhật course; ghi danh
  cùng invoice phải atomic; verify không tin `tuitionAmount`/`discountAmount` do client gửi.
- Xóa course/class/room theo đúng quy tắc xóa mềm hoặc ràng buộc đang được dùng: bản ghi đã xóa
  không xuất hiện trong list mặc định; không xóa cứng dữ liệu liên quan ngoài hợp đồng.
- Các thao tác quan trọng (tạo/sửa/xóa lớp, ghi danh, thay giáo viên, chuyển/bảo lưu) cần có
  `audit_logs` theo quy tắc audit của dự án; không ghi password/token/cookie hoặc dữ liệu cá nhân
  nhạy cảm vào application log/audit.

## 6. Việc cần hoàn tất để đủ điều kiện commit P8

1. Chạy toàn bộ Postman cases trên môi trường test an toàn và lưu kết quả (request, status,
   assertion pass/fail, không lưu credential/token) trong PR/phiên làm việc.
2. Viết automated integration tests cho module P8; manual Postman không thay thế yêu cầu test
   quyền, luồng chính và business rules trong `AGENTS.md` mục 10. Tiến độ hiện ghi còn thiếu
   `classes.test.ts`, `courses.test.ts`, `rooms.test.ts`, `time-slots.test.ts`,
   `enrollments.test.ts`.
3. Xác nhận `TEST_DATABASE_URL` độc lập, có thể drop. Chỉ sau đó mới chạy `npm test` và
   `npm run check` ở root.
4. Đối chiếu và đồng bộ `docs/API.md`, các `backend/requests/*.http`, DTO với code và
   `docs/FRONTEND-CONTRACT.md`. Cần kiểm tra cụ thể quyền staff tạo lớp, route tĩnh
   `/classes/conflicts`/`/classes/timetable`, đường dẫn timetable ghi trong API docs, và
   buổi makeup không vi phạm constraint `lesson_no > 0`.
5. Không đánh dấu P8 hoàn tất và không commit nếu còn test/check đỏ hoặc có lỗi phân quyền,
   IDOR, sai số tiền, dữ liệu nhạy cảm, hay lệch API contract chưa được chốt.
