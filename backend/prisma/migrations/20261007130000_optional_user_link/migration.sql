-- Giáo viên / nhân viên có thể chưa có tài khoản đăng nhập:
-- tạo hồ sơ trước, tạo tài khoản sau (theo hợp đồng C.5.3 "tùy chọn tạo kèm tài khoản").
ALTER TABLE "teachers" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "staff" ALTER COLUMN "user_id" DROP NOT NULL;
