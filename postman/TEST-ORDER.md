# Thứ Tự Test API Postman — Phase 8 (P8)

> Môi trường: **P8 Local** (`postman/environments/P8-Local.environment.yaml`)  
> Base URL: `http://localhost:4000`  
> Chạy backend trước: `cd backend && npm run dev`

---

## Nguyên tắc chạy test
1. **Chạy theo thứ tự số** (01 → 02 → 03...) — collection sau phụ thuộc data của collection trước
2. **Mỗi collection** có thể chứa nhiều request — chạy tất cả request trong collection đó trước khi sang collection tiếp theo
3. **Sau mỗi request quan trọng**, copy response → update environment variable (courseId, roomId, classId, studentId, enrollmentId, sessionId, scheduleId...)
4. **Login** tự lưu cookie qua Postman (Settings → Auto-save cookies)

---

## Ma Trận Thứ Tự Test

### BƯỚC 1: AUTH & HEALTH (Bắt buộc trước — lấy cookie admin)
| Thứ tự | Collection                            | Mô tả                                | Yêu cầu                                   |
| ------ | ------------------------------------- | ------------------------------------ | ----------------------------------------- |
| 1.1    | `P8-Auth-Health/01-Health`            | Health check server                  | Server đang chạy                          |
| 1.2    | `P8-Auth-Health/02-Login-Admin`       | **Login admin** — quan trọng nhất    | Username: `admin`, Password: `#Admin1234` |
| 1.3    | `P8-Auth-Health/03-Auth-Me`           | Verify `/api/auth/me` trả đúng admin | Cookie từ 1.2                             |
| 1.4    | `P8-Auth-Health/04-Login-Cac-Vai-Tro` | Login staff/teacher/student          | Tạo cookie cho từng vai trò               |

> ⚠️ **Sau 1.2**: Postman tự lưu cookie `access_token`, `refresh_token`. Các request sau dùng cookie này.

---

### BƯỚC 2: COURSES, ROOMS, TIME-SLOTS (Admin tạo data master)
| Thứ tự | Collection                                | Mô tả          | Environment variable cần set sau khi chạy |
| ------ | ----------------------------------------- | -------------- | ----------------------------------------- |
| 2.1    | `P8-Courses-Rooms-TimeSlots/01-Courses`   | CRUD khóa học  | `courseId` từ response tạo khóa học       |
| 2.2    | `P8-Courses-Rooms-TimeSlots/02-Rooms`     | CRUD phòng học | `roomId` từ response tạo phòng            |
| 2.3    | `P8-Courses-Rooms-TimeSlots/03-TimeSlots` | CRUD ca học    | `timeSlotId` từ response tạo ca           |

> 📝 **Lưu ý**: `courseId`, `roomId`, `timeSlotId` dùng cho tạo Class ở Bước 3.

---

### BƯỚC 3: CLASSES, SCHEDULES, SESSIONS (Tạo lớp & sinh 64 buổi)
| Thứ tự | Collection                                           | Mô tả                                                     | Environment variable cần set |
| ------ | ---------------------------------------------------- | --------------------------------------------------------- | ---------------------------- |
| 3.1    | `P8-Classes-Schedules-Sessions/01-Create-Class`      | Tạo lớp học (cần courseId, roomId, teacherAId)            | `classId`, `classBId`        |
| 3.2    | `P8-Classes-Schedules-Sessions/02-Read-Class`        | Đọc danh sách/chi tiết lớp                                | —                            |
| 3.3    | `P8-Classes-Schedules-Sessions/03-Generate-Sessions` | **Sinh 64 buổi** từ lịch tuần (cần classId, skipHolidays) | `sessionAId` (buổi đầu)      |
| 3.4    | `P8-Classes-Schedules-Sessions/04-Manual-Sessions`   | Thêm/sửa/xóa buổi thủ công                                | —                            |

> 📝 **Lưu ý**: `classId` dùng cho Enrollments ở Bước 4. `teacherAId` lấy từ login teacherA (Bước 1.4).

---

### BƯỚC 4: ENROLLMENTS (Ghi danh, chuyển lớp, bảo lưu, học bù)
| Thứ tự | Collection                                 | Mô tả                                                | Environment variable cần set |
| ------ | ------------------------------------------ | ---------------------------------------------------- | ---------------------------- |
| 4.1    | `P8-Enrollments/01-Create-Enrollment`      | Ghi danh học viên vào lớp (cần studentAId, classId)  | `enrollmentAId`              |
| 4.2    | `P8-Enrollments/02-Read-Update-Enrollment` | Đọc/sửa ghi danh                                     | —                            |
| 4.3    | `P8-Enrollments/03-Transfer-Freeze`        | Chuyển lớp, bảo lưu, mở bảo lưu                      | —                            |
| 4.4    | `P8-Enrollments/04-Makeup`                 | Tạo buổi học bù                                      | —                            |
| 4.5    | `P8-Enrollments/05-Student-Me`             | **Học viên tự xem** `/me/enrollments`, `/me/lessons` | Login studentA trước         |

---

### BƯỚC 5: PHÂN QUYỀN & IDOR (Kiểm tra bảo mật — chạy sau khi có data)
| Thứ tự | Collection                                   | Mô tả                                               | Test case quan trọng                            |
| ------ | -------------------------------------------- | --------------------------------------------------- | ----------------------------------------------- |
| 5.1    | `P8-Phan-Quyen-IDOR/01-Courses-Phan-Quyen`   | Courses: admin viết, staff đọc, teacher/student 403 | Staff GET /courses = 200, Teacher = 403         |
| 5.2    | `P8-Phan-Quyen-IDOR/02-Rooms-Phan-Quyen`     | Rooms: chỉ admin                                    | Staff GET /rooms = 403                          |
| 5.3    | `P8-Phan-Quyen-IDOR/03-TimeSlots-Phan-Quyen` | Time-slots: admin viết, mọi role đọc                | Student GET /time-slots = 200                   |
| 5.4    | `P8-Phan-Quyen-IDOR/04-Classes-Phan-Quyen`   | Classes: admin/staff CRUD, teacher chỉ lớp mình     | Teacher GET /classes = chỉ lớp mình             |
| 5.5    | `P8-Phan-Quyen-IDOR/05-IDOR-Check`           | **IDOR**: user A không đọc/sửa data user B          | Teacher A không xem học viên Teacher B          |
| 5.6    | `P8-Phan-Quyen-IDOR/06-Me-Phan-Quyen`        | `/me/*`: student chỉ xem của mình                   | Student A không xem `/me/lessons` của Student B |

---

## Checklist Trước Khi Chạy

- [ ] Backend chạy: `npm run dev:be` (port 4000)
- [ ] Database có migration mới nhất: `npx prisma migrate deploy`
- [ ] Seed data nếu cần: `npm run db:seed` (tạo admin, roles...)
- [ ] Import environment `P8-Local.environment.yaml` vào Postman
- [ ] Postman Settings → General → **Auto-save cookies** = ON

---

## Các Environment Variable Cần Cập Nhật Thủ Công

Sau mỗi bước tạo resource, copy `id` từ response → set vào environment:

| Variable        | Nguồn                                            | Ví dụ |
| --------------- | ------------------------------------------------ | ----- |
| `courseId`      | POST `/api/courses` (2.1)                        | `1`   |
| `roomId`        | POST `/api/rooms` (2.2)                          | `1`   |
| `timeSlotId`    | POST `/api/time-slots` (2.3)                     | `1`   |
| `classId`       | POST `/api/classes` (3.1)                        | `1`   |
| `classBId`      | POST `/api/classes` lần 2 (3.1)                  | `2`   |
| `studentAId`    | GET `/api/students?search=hv001` hoặc seed       | `1`   |
| `studentBId`    | GET `/api/students?search=hv002`                 | `2`   |
| `teacherAId`    | GET `/api/teachers?search=gv001`                 | `1`   |
| `teacherBId`    | GET `/api/teachers?search=qt001`                 | `2`   |
| `enrollmentAId` | POST `/api/enrollments` (4.1)                    | `1`   |
| `sessionAId`    | GET `/api/classes/1/sessions` sau generate (3.3) | `1`   |
| `scheduleAId`   | POST `/api/classes/1/schedules`                  | `1`   |

---

## Smoke Test Nhanh (5 phút)

Nếu muốn test nhanh end-to-end chính đường:

```
1. Health check
2. Login Admin
3. Tạo Course → set courseId
4. Tạo Room → set roomId  
5. Tạo TimeSlot → set timeSlotId
6. Tạo Class (dùng courseId, roomId, timeSlotId, teacherAId) → set classId
7. Generate Sessions (classId, weekdays=[1,3], startTime=17:30, endTime=19:00)
8. Tạo Enrollment (studentAId, classId) → set enrollmentId
9. Student login → GET /me/lessons (verify 64 buổi + attendanceStatus=null)
10. Teacher login → GET /classes/teacher/classes (verify thấy classId)
11. Admin GET /users?tempLocked=true (verify filter tạm khóa)
```

---

## Lưu ý Thường Gặp

| Vấn đề                             | Nguyên nhân                                      | Khắc phục                                             |
| ---------------------------------- | ------------------------------------------------ | ----------------------------------------------------- |
| 401 Unauthorized                   | Cookie hết hạn / tokenVersion sai                | Re-login admin                                        |
| P1017 Server closed connection     | Neon idle timeout                                | Retry request (đã fix retry trong auth middleware)    |
| 403 Forbidden                      | Sai vai trò / không có quyền data                | Kiểm tra environment variable đúng user               |
| Search không ra                    | Chữ có dấu / unaccent                            | Dùng `search=nguyen` (không dấu)                      |
| Generate sessions không đủ 64 buổi | Lịch tuần không khớp thứ / ngày nghỉ             | Kiểm tra `weekdays`, `skipHolidays`                   |
| Teacher không thấy lớp             | `teacherId` là userId thay vì teacher profile ID | Dùng `teacherAId` (profile ID) từ GET `/api/teachers` |

---

## File tham khảo
- `backend/requests/*.http` — REST Client format (VS Code)
- `docs/API.md` — Hợp đồng endpoint đầy đủ
- `docs/FRONTEND-CONTRACT.md` — Màn hình UI tương ứng