-- Tìm kiếm tiếng Việt không dấu: "Nguyen" phải ra "Nguyễn".
--
-- extension unaccent của PostgreSQL không đánh dấu IMMUTABLE nên không dùng được
-- trong index. Bọc lại thành hàm IMMUTABLE để tạo được index hỗ trợ tìm kiếm.
--
-- Lưu ý: hàm này phụ thuộc extension unaccent nên phải CREATE EXTENSION trước,
-- và khi rollback thì phải xoá hàm trước rồi mới xoá extension.
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION ttnn_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, $1)
$$;

-- Index hỗ trợ tìm theo họ tên không dấu.
CREATE INDEX IF NOT EXISTS idx_students_full_name_unaccent
  ON students (ttnn_unaccent("fullName"));

-- Tìm theo mã học viên: chuỗi ASCII, index thường là đủ.
CREATE INDEX IF NOT EXISTS idx_students_student_code_lower
  ON students (lower("studentCode"));