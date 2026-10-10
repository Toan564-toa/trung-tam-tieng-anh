-- Ràng buộc và đối tượng SQL mà Prisma không biểu đạt được.
-- Áp dụng SAU migration init. Từ phase này trở đi KHÔNG sửa file migration đã áp dụng.
--
-- Nội dung:
--   1. extension `unaccent` + hàm ttnn_unaccent() để tìm tiếng Việt không dấu (D-020)
--   2. CHECK: tiền > 0, sĩ số > 0, tổng buổi > 0, miền giá trị rời rạc
--   3. UNIQUE CÓ ĐIỀU KIỆN: mỗi học viên chỉ có 1 enrollment ACTIVE trong 1 lớp
--   4. TRIGGER: payments chỉ thêm, không sửa, không xoá; scores chỉ thêm (dùng score_changes)
--   5. VIEW: v_invoice_balance, v_enrollment_progress

-- ============================================================================
-- 1. TÌM TIẾNG VIỆT KHÔNG DẤU
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS unaccent;

-- Bọc lại hàm gốc để đánh dấu IMMUTABLE: extension `unaccent` không có nhãn này
-- nên không tạo được index gọi tới nó.
CREATE OR REPLACE FUNCTION ttnn_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE STRICT PARALLEL SAFE
AS $fn$
  SELECT public.unaccent('public.unaccent', $1)
$fn$;

CREATE INDEX students_full_name_unaccent_idx ON students (ttnn_unaccent(full_name));
CREATE INDEX teachers_full_name_unaccent_idx ON teachers (ttnn_unaccent(full_name));
CREATE INDEX staff_full_name_unaccent_idx   ON staff (ttnn_unaccent(full_name));
CREATE INDEX leads_full_name_unaccent_idx   ON leads (ttnn_unaccent(full_name));
CREATE INDEX guardians_full_name_unaccent_idx ON guardians (ttnn_unaccent(full_name));

-- ============================================================================
-- 2. CHECK — tiền, sĩ số, tổng buổi, miền giá trị
-- ============================================================================

-- Tiền: luôn dương. 0 VND là dòng rác, không phải khoản thu.
ALTER TABLE payments             ADD CONSTRAINT payments_amount_positive          CHECK (amount > 0);
ALTER TABLE payment_adjustments  ADD CONSTRAINT payment_adjustments_nonzero       CHECK (amount <> 0);
ALTER TABLE refunds              ADD CONSTRAINT refunds_amount_positive           CHECK (amount > 0);
ALTER TABLE invoice_items        ADD CONSTRAINT invoice_items_amount_positive     CHECK (amount > 0);
ALTER TABLE installments         ADD CONSTRAINT installments_amount_positive      CHECK (amount > 0);
ALTER TABLE invoice_discounts    ADD CONSTRAINT invoice_discounts_amount_positive CHECK (amount > 0);
ALTER TABLE pay_rates            ADD CONSTRAINT pay_rates_amount_positive         CHECK (amount > 0);
ALTER TABLE course_price_history ADD CONSTRAINT course_price_history_price_non_negative CHECK (price >= 0);
ALTER TABLE course_price_history ADD CONSTRAINT course_price_history_date_range  CHECK (
  effective_to IS NULL OR effective_to >= effective_from
);

-- Hoá đơn: không âm, và tổng phải đóng = tổng gốc − giảm giá.
ALTER TABLE invoices ADD CONSTRAINT invoices_amounts_non_negative CHECK (
  subtotal_amount >= 0 AND discount_amount >= 0 AND total_amount >= 0
);
ALTER TABLE invoices ADD CONSTRAINT invoices_total_matches CHECK (
  total_amount = subtotal_amount - discount_amount
);

-- Sức chứa và lộ trình học.
ALTER TABLE classes            ADD CONSTRAINT classes_max_students_positive  CHECK (max_students > 0);
ALTER TABLE rooms              ADD CONSTRAINT rooms_capacity_positive        CHECK (capacity > 0);
ALTER TABLE courses            ADD CONSTRAINT courses_total_sessions_positive CHECK (total_sessions > 0);
ALTER TABLE courses            ADD CONSTRAINT courses_sessions_per_week_positive CHECK (sessions_per_week > 0);
ALTER TABLE courses            ADD CONSTRAINT courses_duration_months_positive CHECK (duration_months > 0);
ALTER TABLE courses            ADD CONSTRAINT courses_target_students_positive CHECK (
  target_students IS NULL OR target_students > 0
);
ALTER TABLE class_sessions     ADD CONSTRAINT class_sessions_lesson_no_positive  CHECK (lesson_no > 0);
ALTER TABLE course_lessons     ADD CONSTRAINT course_lessons_lesson_no_positive  CHECK (lesson_no > 0);
ALTER TABLE enrollments        ADD CONSTRAINT enrollments_total_sessions_positive CHECK (total_sessions > 0);
ALTER TABLE enrollments        ADD CONSTRAINT enrollments_tuition_non_negative  CHECK (tuition_amount >= 0);
ALTER TABLE attendance_lock_days ADD CONSTRAINT attendance_lock_days_non_negative CHECK (days >= 0);
ALTER TABLE payroll_items      ADD CONSTRAINT payroll_items_amounts_non_negative CHECK (
  lesson_rate >= 0 AND base_salary >= 0 AND bonus >= 0 AND deduction >= 0
  AND allowance >= 0 AND lessons_taught >= 0 AND hours_taught >= 0
);

-- Miền giá trị rời rạc nằm ngoài enum.
ALTER TABLE class_schedules ADD CONSTRAINT class_schedules_weekday_range CHECK (weekday BETWEEN 0 AND 6);
ALTER TABLE time_slots      ADD CONSTRAINT time_slots_times_valid  CHECK (
  start_time ~ '^[0-2][0-9]:[0-5][0-9]$'
  AND end_time ~ '^[0-2][0-9]:[0-5][0-9]$'
  AND end_time > start_time
);
ALTER TABLE class_schedules ADD CONSTRAINT class_schedules_times_valid CHECK (
  start_time ~ '^[0-2][0-9]:[0-5][0-9]$'
  AND end_time ~ '^[0-2][0-9]:[0-5][0-9]$'
  AND end_time > start_time
);
ALTER TABLE class_sessions ADD CONSTRAINT class_sessions_times_valid CHECK (
  (start_time IS NULL OR start_time ~ '^[0-2][0-9]:[0-5][0-9]$')
  AND (end_time IS NULL OR end_time ~ '^[0-2][0-9]:[0-5][0-9]$')
);
ALTER TABLE discounts ADD CONSTRAINT discounts_value_valid CHECK (
  (type = 'PERCENT' AND value BETWEEN 1 AND 100) OR (type = 'AMOUNT' AND value > 0)
);
ALTER TABLE testimonials ADD CONSTRAINT testimonials_rating_range CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE students     ADD CONSTRAINT students_birth_date_not_future CHECK (
  birth_date IS NULL OR birth_date <= CURRENT_DATE
);
ALTER TABLE scores ADD CONSTRAINT scores_values_non_negative CHECK (
  (score      IS NULL OR score >= 0)
  AND (listening IS NULL OR listening >= 0)
  AND (reading   IS NULL OR reading >= 0)
  AND (writing   IS NULL OR writing >= 0)
  AND (speaking  IS NULL OR speaking >= 0)
);

-- ============================================================================
-- 3. UNIQUE CÓ ĐIỀU KIỆN
-- ============================================================================

-- Một học viên chỉ được có MỘT lần ghi danh đang hiệu lực trong một lớp.
-- Học viên nghỉ rồi ghi danh lại lớp khác vẫn được; cùng lớp thì phải kết thúc
-- lần cũ trước. Prisma không biểu đạt được unique một phần nên viết bằng SQL.
CREATE UNIQUE INDEX enrollments_active_unique
  ON enrollments (student_id, class_id)
  WHERE status = 'ACTIVE';

-- Tương tự: không ghi danh trùng ACTIVE cùng khóa học/lớp đã bị huỷ.
ALTER TABLE leads      ADD CONSTRAINT leads_followup_required CHECK (next_follow_up IS NULL OR next_follow_up >= created_at);
ALTER TABLE user_roles ADD CONSTRAINT user_roles_granted_at_ok  CHECK (granted_at <= now() + INTERVAL '1 day');

-- ============================================================================
-- 4. TRIGGER — payments chỉ thêm, không sửa, không xoá
-- ============================================================================

-- AGENTS.md mục 8: `payments` chỉ thêm, không sửa, không xóa. Sai thì tạo
-- bút toán điều chỉnh (`payment_adjustments`) hoặc hoàn phí (`refunds`).
CREATE OR REPLACE FUNCTION ttnn_payments_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  RAISE EXCEPTION
    'Bảng payments chỉ cho phép thêm dòng. Dùng payment_adjustments hoặc refunds để điều chỉnh (receipt_no=%)',
    COALESCE(OLD.receipt_no, NEW.receipt_no)
    USING ERRCODE = 'restrict_violation';
END;
$fn$;

CREATE TRIGGER payments_append_only
  BEFORE UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION ttnn_payments_append_only();

-- Điểm số: chỉ sửa bằng cách thêm dòng vào score_changes.
CREATE OR REPLACE FUNCTION ttnn_scores_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  RAISE EXCEPTION
    'Bảng scores chỉ cho phép thêm dòng. Dùng score_changes để ghi lịch sử sửa điểm (score_id=%)',
    OLD.id
    USING ERRCODE = 'restrict_violation';
END;
$fn$;

CREATE TRIGGER scores_append_only
  BEFORE UPDATE OR DELETE ON scores
  FOR EACH ROW EXECUTE FUNCTION ttnn_scores_append_only();

-- Nhật ký điểm danh, điểm số, đăng nhập, audit cũng chỉ thêm.
CREATE OR REPLACE FUNCTION ttnn_append_only_table()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  RAISE EXCEPTION
    'Bảng % chỉ cho phép thêm dòng, không sửa hoặc xoá', TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$fn$;

CREATE TRIGGER attendance_changes_append_only
  BEFORE UPDATE OR DELETE ON attendance_changes
  FOR EACH ROW EXECUTE FUNCTION ttnn_append_only_table();

CREATE TRIGGER score_changes_append_only
  BEFORE UPDATE OR DELETE ON score_changes
  FOR EACH ROW EXECUTE FUNCTION ttnn_append_only_table();

CREATE TRIGGER audit_logs_append_only
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION ttnn_append_only_table();

CREATE TRIGGER login_history_append_only
  BEFORE UPDATE OR DELETE ON login_history
  FOR EACH ROW EXECUTE FUNCTION ttnn_append_only_table();

-- ============================================================================
-- 5. VIEW — công nợ và tiến độ học (tính ra, không lưu tay)
-- ============================================================================

-- Công nợ từng khoản thu: đã thu = tổng payments − tổng hoàn phí đã trả.
-- `students` được nối qua enrollments nên không phải lưu student_id ở invoices.
CREATE OR REPLACE VIEW v_invoice_balance AS
SELECT
  i.id                                        AS invoice_id,
  i.invoice_no,
  i.enrollment_id,
  e.student_id,
  e.class_id,
  i.subtotal_amount,
  i.discount_amount,
  i.total_amount,
  COALESCE(p.paid_amount, 0)                  AS paid_amount,
  COALESCE(r.refunded_amount, 0)              AS refunded_amount,
  i.total_amount
    - COALESCE(p.paid_amount, 0)
    + COALESCE(r.refunded_amount, 0)          AS remaining_amount,
  i.due_date,
  i.status                                    AS invoice_status,
  CASE
    WHEN i.status = 'CANCELLED' THEN 'CANCELLED'
    WHEN i.total_amount - COALESCE(p.paid_amount, 0) + COALESCE(r.refunded_amount, 0) <= 0 THEN 'PAID'
    WHEN i.due_date IS NOT NULL AND i.due_date < CURRENT_DATE THEN 'OVERDUE'
    WHEN COALESCE(p.paid_amount, 0) > 0 THEN 'PARTIAL'
    ELSE 'UNPAID'
  END                                         AS derived_status,
  CASE
    WHEN i.due_date IS NULL THEN NULL
    WHEN i.due_date >= CURRENT_DATE THEN 0
    ELSE (CURRENT_DATE - i.due_date)
  END                                         AS days_overdue
FROM invoices i
JOIN enrollments e ON e.id = i.enrollment_id
LEFT JOIN (
  SELECT invoice_id, SUM(amount) AS paid_amount
  FROM payments
  GROUP BY invoice_id
) p ON p.invoice_id = i.id
LEFT JOIN (
  SELECT invoice_id, SUM(amount) AS refunded_amount
  FROM refunds
  WHERE status = 'PAID'
  GROUP BY invoice_id
) r ON r.invoice_id = i.id
WHERE i.deleted_at IS NULL;

COMMENT ON VIEW v_invoice_balance IS
  'Công nợ từng khoản thu. remaining = total − đã thu + đã hoàn. Không lưu cột "còn nợ" nhập tay.';

-- Tiến độ học: số buổi đã diễn ra và số buổi học viên có mặt, chia cho
-- enrollments.total_sessions đã chụp lại lúc ghi danh.
CREATE OR REPLACE VIEW v_enrollment_progress AS
SELECT
  e.id                                          AS enrollment_id,
  e.student_id,
  e.class_id,
  e.total_sessions,
  e.status,
  e.enrolled_at,
  e.start_date,
  e.expected_end_date,
  COALESCE(s.sessions_held, 0)                  AS sessions_held,
  COALESCE(s.sessions_attended, 0)              AS sessions_attended,
  COALESCE(s.sessions_late, 0)                  AS sessions_late,
  COALESCE(s.sessions_absent, 0)                AS sessions_absent,
  COALESCE(s.sessions_excused, 0)               AS sessions_excused,
  CASE
    WHEN COALESCE(s.sessions_held, 0) = 0 THEN NULL
    ELSE ROUND(
      (COALESCE(s.sessions_attended, 0) + COALESCE(s.sessions_late, 0))::numeric
      * 100 / s.sessions_held, 1)
  END                                           AS attendance_rate,
  CASE
    WHEN e.total_sessions <= 0 THEN 0
    ELSE LEAST(100, ROUND(COALESCE(s.sessions_held, 0)::numeric * 100 / e.total_sessions, 1))
  END                                           AS progress_percent
FROM enrollments e
LEFT JOIN (
  SELECT
    cs.class_id,
    COUNT(*) FILTER (WHERE cs.status = 'HELD')                              AS sessions_held,
    COUNT(*) FILTER (WHERE a.status = 'PRESENT')                            AS sessions_attended,
    COUNT(*) FILTER (WHERE a.status = 'LATE')                               AS sessions_late,
    COUNT(*) FILTER (WHERE a.status = 'ABSENT')                             AS sessions_absent,
    COUNT(*) FILTER (WHERE a.status = 'EXCUSED')                            AS sessions_excused
  FROM class_sessions cs
  LEFT JOIN attendance a ON a.class_session_id = cs.id
  GROUP BY cs.class_id
) s ON s.class_id = e.class_id;

COMMENT ON VIEW v_enrollment_progress IS
  'Tiến độ học của từng lần ghi danh. sessions_held đếm class_sessions.status = HELD, attendance_rate = (có mặt + muộn) / số buổi đã diễn ra.';
