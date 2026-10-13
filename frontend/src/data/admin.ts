import { COURSES, TEACHERS } from "@/data/landing"
import {
  CENTER_CLASSES,
  CENTER_PAYMENTS,
  STAFF_LEADS,
  STAFF_STUDENTS,
  STAFF_TEAM,
  classNameOf,
  getStaffMember,
  type CenterPayment,
  type LeadSource,
  type PaymentMethod,
  type StaffStudent,
} from "@/data/staff"
import { lessonsOfClass, MARK_META, type MarkStatus } from "@/data/teacher"
import { formatDate } from "@/lib/date"

/** Ngày "hôm nay" của bản demo khu vực quản trị (thứ Sáu, 02/10/2026). */
export const ADMIN_TODAY = new Date(2026, 9, 2)
export const ADMIN_TODAY_LABEL = "02/10/2026"

/* ------------------------------------------------------------------ *
 * Tài khoản và phân quyền
 * ------------------------------------------------------------------ */

export type AccountRole = "student" | "teacher" | "staff" | "admin" | "guardian"
export type AccountStatus = "active" | "locked" | "pending" | "archived"

export const ACCOUNT_ROLE_META: Record<AccountRole, { label: string; badge: "info" | "success" | "warning" | "danger" | "neutral"; prefix: string }> = {
  student: { label: "Học viên", badge: "info", prefix: "hv" },
  teacher: { label: "Giáo viên", badge: "success", prefix: "gv" },
  staff: { label: "Nhân viên", badge: "warning", prefix: "nv" },
  admin: { label: "Quản trị", badge: "danger", prefix: "ad" },
  guardian: { label: "Phụ huynh", badge: "neutral", prefix: "gh" },
}

export const ACCOUNT_STATUS_META: Record<AccountStatus, { label: string; badge: "success" | "danger" | "warning" | "neutral" }> = {
  active: { label: "Đang hoạt động", badge: "success" },
  locked: { label: "Đã khoá", badge: "danger" },
  pending: { label: "Chờ kích hoạt", badge: "warning" },
  archived: { label: "Đã ẩn", badge: "neutral" },
}

export type AdminAccount = {
  id: string
  username: string
  fullName: string
  email: string
  phone: string
  role: AccountRole
  status: AccountStatus
  /** Lần đăng nhập gần nhất, dd/MM/yyyy. Rỗng = chưa đăng nhập. */
  lastLogin: string
  createdAt: string
  /** Tài khoản bị xoá mềm sẽ không hiện trong danh sách mặc định. */
  deletedAt?: string
}

const ACCOUNT_SURNAMES = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đặng", "Bùi", "Đỗ", "Ngô", "Dương", "Lý", "Trịnh", "Phan"]
const ACCOUNT_GIVEN = ["Minh Anh", "Thu Hà", "Quỳnh Như", "Gia Bảo", "Phương Linh", "Hoàng Nam", "Thùy Dung", "Đức Thắng", "Khánh Vy", "Tuấn Kiệt", "Ngọc Ánh", "Tấn Phát"]
const ACCOUNT_EMAIL_DOMAINS = ["gmail.com", "outlook.com", "student.ttnn.edu.vn", "teacher.ttnn.edu.vn"]
/** Đầu số di động hợp lệ để dữ liệu mẫu khớp với regex kiểm tra SĐT của các form. */
const ACCOUNT_MOBILE_PREFIX = [3, 5, 7, 8, 9]

function buildAccounts(): AdminAccount[] {
  const list: AdminAccount[] = []
  let seq = 1000

  const push = (role: AccountRole, count: number, statuses: AccountStatus[]) => {
    for (let i = 0; i < count; i += 1) {
      seq += 1
      const fullName = `${ACCOUNT_SURNAMES[i % ACCOUNT_SURNAMES.length]} ${ACCOUNT_GIVEN[(i * 5 + role.length) % ACCOUNT_GIVEN.length]}`
      const slug = fullName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/\s+/g, ".")
      const status = statuses[i % statuses.length]
      list.push({
        id: `ac-${seq}`,
        username: `${ACCOUNT_ROLE_META[role].prefix}${seq}`,
        fullName,
        email: `${slug}@${ACCOUNT_EMAIL_DOMAINS[i % ACCOUNT_EMAIL_DOMAINS.length]}`,
        phone: `09${ACCOUNT_MOBILE_PREFIX[i % ACCOUNT_MOBILE_PREFIX.length]}${String(100 + (i * 37) % 899)} ${String(200 + (i * 53) % 799)}`,
        role,
        status,
        lastLogin: status === "pending" ? "" : `${String(1 + ((i * 7) % 28)).padStart(2, "0")}/${String(1 + ((i * 11) % 9)).padStart(2, "0")}/2026`,
        createdAt: `${String(1 + ((i * 3) % 28)).padStart(2, "0")}/0${1 + (i % 9)}/2026`,
        deletedAt: i % 11 === 0 ? "28/09/2026" : undefined,
      })
    }
  }

  push("student", 40, ["active", "active", "active", "locked", "pending"])
  push("teacher", 8, ["active", "active", "locked"])
  push("staff", 5, ["active", "active"])
  push("admin", 3, ["active", "locked"])

  return list
}

export const ADMIN_ACCOUNTS: AdminAccount[] = buildAccounts()

export function accountsByRole(role: AccountRole) {
  return ADMIN_ACCOUNTS.filter((a) => a.role === role)
}

/* ------------------------------------------------------------------ *
 * Người dùng quản lý (học viên / giáo viên / nhân viên)
 * ------------------------------------------------------------------ */

export type ManagedPerson = {
  id: string
  code: string
  fullName: string
  email: string
  phone: string
  /** Nhóm/lớp/phòng ban liên quan. */
  group: string
  status: "active" | "inactive"
  joinedAt: string
  deletedAt?: string
}

export function managedStudents(): ManagedPerson[] {
  return STAFF_STUDENTS.map((student: StaffStudent) => ({
    id: student.id,
    code: student.studentCode,
    fullName: student.fullName,
    email: student.email,
    phone: student.phone,
    group: classNameOf(student.classId),
    status: student.status === "active" ? ("active" as const) : ("inactive" as const),
    joinedAt: student.startDate,
  }))
}

export function managedTeachers(): ManagedPerson[] {
  return TEACHERS.map((teacher, index) => {
    const classes = CENTER_CLASSES.filter((c) => c.teacher === teacher.name)
    return {
      id: `gv-${index + 1}`,
      code: `GV${String(10 + index).padStart(4, "0")}`,
      fullName: teacher.name,
      email: `${teacher.name.toLowerCase().replace(/ /g, ".").normalize("NFD").replace(/[\u0300-\u036f]/g, "")}@ttnn.edu.vn`,
      phone: `09${String(20 + index * 7).padStart(2, "0")} ${String(300 + index * 41).padStart(3, "0")} ${String(500 + index * 29).padStart(3, "0")}`,
      group: classes.length ? classes.map((c) => c.code).join(", ") : "Chưa xếp lớp",
      status: index === 5 ? ("inactive" as const) : ("active" as const),
      joinedAt: `0${1 + index}/0${3 + index}/2023`,
    }
  })
}

export function managedStaff(): ManagedPerson[] {
  return STAFF_TEAM.map((member) => ({
    id: member.id,
    code: member.id,
    fullName: member.fullName,
    email: `${member.fullName.toLowerCase().replace(/ /g, ".").normalize("NFD").replace(/[\u0300-\u036f]/g, "")}@ttnn.edu.vn`,
    phone: member.phone,
    group: member.role,
    status: "active" as const,
    joinedAt: "03/08/2022",
  }))
}

/* ------------------------------------------------------------------ *
 * Khóa học
 * ------------------------------------------------------------------ */

export type CourseStatus = "published" | "draft" | "archived"

export type AdminCourse = {
  id: string
  name: string
  level: string
  /** Số buổi học trong khóa. */
  lessons: number
  tuition: number
  /** Tỷ lệ học viên đang theo học / tổng số chỉ tiêu. */
  enrolled: number
  target: number
  status: CourseStatus
  updatedAt: string
}

export const COURSE_STATUS_META: Record<CourseStatus, { label: string; badge: "success" | "warning" | "neutral" }> = {
  published: { label: "Đang mở", badge: "success" },
  draft: { label: "Bản nháp", badge: "warning" },
  archived: { label: "Đã ẩn", badge: "neutral" },
}

const COURSE_TUITION: Record<string, { lessons: number; tuition: number; target: number }> = {
  "A1 · Beginner": { lessons: 64, tuition: 8_400_000, target: 260 },
  "A2 · Elementary": { lessons: 64, tuition: 9_600_000, target: 320 },
  "B1 · Intermediate": { lessons: 64, tuition: 10_800_000, target: 240 },
  "B2 · Upper-Intermediate": { lessons: 64, tuition: 12_000_000, target: 180 },
  "C1 · Advanced": { lessons: 48, tuition: 12_000_000, target: 90 },
}

export const ADMIN_COURSES: AdminCourse[] = COURSES.map((course, index) => {
  const preset = COURSE_TUITION[course.level] ?? { lessons: 64, tuition: 9_600_000, target: 200 }
  return {
    id: course.id,
    name: course.name,
    level: course.level,
    lessons: preset.lessons,
    tuition: preset.tuition,
    enrolled: [214, 268, 187, 121, 64][index % 5],
    target: preset.target,
    status: (["published", "published", "published", "draft", "archived"][index % 5]) as CourseStatus,
    updatedAt: `0${1 + index}/09/2026`,
  }
})

/* ------------------------------------------------------------------ *
 * Phòng học và thời khóa biểu
 * ------------------------------------------------------------------ */

export type AdminRoom = {
  id: string
  name: string
  capacity: number
  floor: number
  /** Loại thiết bị có sẵn trong phòng. */
  equipment: string[]
  status: "available" | "maintenance"
}

export const ROOM_STATUS_META: Record<AdminRoom["status"], { label: string; badge: "success" | "warning" }> = {
  available: { label: "Đang dùng được", badge: "success" },
  maintenance: { label: "Đang bảo trì", badge: "warning" },
}

export const ADMIN_ROOMS: AdminRoom[] = [
  { id: "R101", name: "Phòng 101", capacity: 18, floor: 1, equipment: ["TV", "Máy chiếu"], status: "available" },
  { id: "R103", name: "Phòng 103", capacity: 20, floor: 1, equipment: ["TV", "Loa"], status: "available" },
  { id: "R204", name: "Phòng 204", capacity: 22, floor: 2, equipment: ["Máy chiếu", "Bảng thông minh"], status: "available" },
  { id: "R205", name: "Phòng 205", capacity: 18, floor: 2, equipment: ["TV", "Loa"], status: "available" },
  { id: "R206", name: "Phòng 206", capacity: 16, floor: 2, equipment: ["TV"], status: "maintenance" },
  { id: "R301", name: "Phòng 301", capacity: 18, floor: 3, equipment: ["Máy chiếu", "Loa"], status: "available" },
  { id: "R302", name: "Phòng 302", capacity: 20, floor: 3, equipment: ["TV", "Bảng thông minh"], status: "available" },
  { id: "R401", name: "Phòng 401", capacity: 16, floor: 4, equipment: ["Máy chiếu"], status: "available" },
  { id: "LAB1", name: "Phòng Lab 1", capacity: 14, floor: 4, equipment: ["Máy tính", "Tai nghe"], status: "available" },
]

export function getRoom(name: string) {
  return ADMIN_ROOMS.find((room) => room.name === name)
}

/** Lưới tuần hiển thị từ thứ Hai, nhưng `value` giữ đúng quy ước của `TeacherClass.weekdays` (0 = Chủ Nhật). */
export const TIMETABLE_WEEKDAYS = [
  { value: 1, label: "Thứ 2", short: "T2" },
  { value: 2, label: "Thứ 3", short: "T3" },
  { value: 3, label: "Thứ 4", short: "T4" },
  { value: 4, label: "Thứ 5", short: "T5" },
  { value: 5, label: "Thứ 6", short: "T6" },
  { value: 6, label: "Thứ 7", short: "T7" },
  { value: 0, label: "Chủ Nhật", short: "CN" },
]

export const TIMETABLE_SLOTS = [
  { id: "s1", label: "Ca 1", start: "06:30", end: "08:00" },
  { id: "s2", label: "Ca 2", start: "08:15", end: "09:45" },
  { id: "s3", label: "Ca 3", start: "10:00", end: "11:30" },
  { id: "s4", label: "Ca 4", start: "13:30", end: "15:00" },
  { id: "s5", label: "Ca 5", start: "15:15", end: "16:45" },
  { id: "s6", label: "Ca 6", start: "17:00", end: "18:30" },
  { id: "s7", label: "Ca 7", start: "19:00", end: "20:30" },
  { id: "s8", label: "Ca 8", start: "19:45", end: "21:15" },
]

export type TimetableEntry = {
  id: string
  classId: string
  roomId: string
  teacherId: string
  slotId: string
  weekday: number
}

export const TIMETABLE: TimetableEntry[] = CENTER_CLASSES.flatMap((cls, index) =>
  cls.weekdays.map((weekday, dayIndex) => ({
    id: `tt-${cls.id}-${weekday}`,
    classId: cls.id,
    roomId: getRoom(cls.room)?.id ?? "R204",
    teacherId: `gv-${(index % TEACHERS.length) + 1}`,
    slotId: TIMETABLE_SLOTS[cls.time.startsWith("19") ? (cls.time.startsWith("19:00") ? 6 : 7) : cls.time.startsWith("08") ? 1 : cls.time.startsWith("17") ? 5 : 3].id,
    weekday,
    dayIndex,
  })),
)

/** Xung đột lịch khi thêm/sửa một mục thời khóa biểu. */
export type TimetableConflict = {
  kind: "room" | "teacher"
  message: string
  entry: TimetableEntry
}

export function findConflicts(entry: Omit<TimetableEntry, "id">, ignoreId?: string): TimetableConflict[] {
  const conflicts: TimetableConflict[] = []
  for (const other of TIMETABLE) {
    if (other.id === ignoreId || other.weekday !== entry.weekday || other.slotId !== entry.slotId) continue
    const otherClass = CENTER_CLASSES.find((c) => c.id === other.classId)
    if (other.roomId === entry.roomId) {
      conflicts.push({
        kind: "room",
        message: `Phòng ${getRoom(other.roomId)?.name ?? other.roomId} đã có lớp ${otherClass?.name ?? other.classId} (${otherClass?.time ?? ""}) trong ca này.`,
        entry: other,
      })
    }
    if (other.teacherId === entry.teacherId) {
      conflicts.push({
        kind: "teacher",
        message: `${TEACHERS.find((_, i) => `gv-${i + 1}` === entry.teacherId)?.name ?? "Giáo viên"} đang dạy lớp ${otherClass?.name ?? other.classId} trong cùng ca.`,
        entry: other,
      })
    }
  }
  return conflicts
}

/* ------------------------------------------------------------------ *
 * Học phí: khoản phải thu, công nợ, đối soát cuối ngày
 * ------------------------------------------------------------------ */

export type InvoiceStatus = "unpaid" | "partial" | "paid" | "overdue"

export const INVOICE_STATUS_META: Record<InvoiceStatus, { label: string; badge: "danger" | "warning" | "success" | "info" }> = {
  unpaid: { label: "Chưa thu", badge: "danger" },
  partial: { label: "Thu một phần", badge: "warning" },
  paid: { label: "Đã thu đủ", badge: "success" },
  overdue: { label: "Quá hạn", badge: "info" },
}

export type AdminInvoice = {
  id: string
  code: string
  studentId: string
  studentName: string
  className: string
  dueDate: string
  total: number
  paid: number
  status: InvoiceStatus
  kind: "Học phí" | "Tài liệu" | "Đồng phụ" | "Phí giữ xe"
}

export const ADMIN_INVOICES: AdminInvoice[] = STAFF_STUDENTS.map((student, index) => {
  const kind = (["Học phí", "Tài liệu", "Đồng phụ", "Phí giữ xe"][index % 4]) as AdminInvoice["kind"]
  const base = kind === "Học phí" ? 2_400_000 : kind === "Tài liệu" ? 480_000 : kind === "Đồng phụ" ? 320_000 : 150_000
  const paidRatio = [0, 0.5, 1, 0.25, 0, 0.75][index % 6]
  const status: InvoiceStatus =
    paidRatio === 1 ? "paid" : paidRatio === 0 ? (index % 5 === 0 ? "overdue" : "unpaid") : "partial"
  return {
    id: `in-${index + 1}`,
    code: `HP-${student.classId}-2026-${String((index % 4) + 1).padStart(2, "0")}`,
    studentId: student.id,
    studentName: student.fullName,
    className: classNameOf(student.classId),
    dueDate: student.tuition.dueDate.toLocaleDateString("vi-VN"),
    total: base,
    paid: Math.round(base * paidRatio),
    status,
    kind,
  }
})

export function invoiceRemaining(invoice: AdminInvoice) {
  return Math.max(0, invoice.total - invoice.paid)
}

export function debtTotal() {
  return ADMIN_INVOICES.reduce((sum, invoice) => sum + invoiceRemaining(invoice), 0)
}

export const DEBT_AGING = [
  { bucket: "0 – 30 ngày", value: 184_000_000 },
  { bucket: "31 – 60 ngày", value: 96_000_000 },
  { bucket: "61 – 90 ngày", value: 52_000_000 },
  { bucket: "Trên 90 ngày", value: 21_000_000 },
]

/** Đối soát tiền mặt cuối ngày theo từng nhân viên. */
export type CashClose = {
  staffId: string
  staffName: string
  date: string
  shift: string
  totalCollected: number
  cashOnHand: number
  bankTransfer: number
  status: "balanced" | "pending" | "diff"
  note: string
}

export const CASH_CLOSES: CashClose[] = STAFF_TEAM.map((member, index) => {
  const payments = CENTER_PAYMENTS.filter((p) => p.collectorId === member.id)
  const total = payments.reduce((sum, p) => sum + p.amount, 0)
  const cash = payments.filter((p) => p.method === "Tiền mặt").reduce((sum, p) => sum + p.amount, 0)
  const diff = index === 1 ? -50_000 : 0
  return {
    staffId: member.id,
    staffName: member.fullName,
    date: ADMIN_TODAY_LABEL,
    shift: index % 2 === 0 ? "Ca sáng" : "Ca chiều",
    totalCollected: total,
    cashOnHand: cash + diff,
    bankTransfer: total - cash,
    status: diff !== 0 ? "diff" : index === STAFF_TEAM.length - 1 ? "pending" : "balanced",
    note: diff !== 0 ? "Chênh lệch do đổi tiền lẻ, đã ghi nhận tạm." : "",
  }
})

export type DiscountRequest = {
  id: string
  studentName: string
  className: string
  kind: "Giảm giá" | "Hoàn phí"
  reason: string
  amount: number
  requestedBy: string
  requestedAt: string
  status: "pending" | "approved" | "rejected"
}

export const DISCOUNT_REQUESTS: DiscountRequest[] = STAFF_STUDENTS.slice(0, 6).map((student, index) => ({
  id: `dr-${index + 1}`,
  studentName: student.fullName,
  className: classNameOf(student.classId),
  kind: index % 3 === 2 ? "Hoàn phí" : "Giảm giá",
  reason: [
    "Hội nghị phụ huynh giới thiệu 2 em.",
    "Gia đình khó khăn, xin hỗ trợ 1 đợt.",
    "Chuyển lớp giữa kỳ, phí tài liệu đã mua.",
    "Em gái giảm giá 10%.",
    "Chuyển khoản trễ, xin miễn phí buổi bù.",
    "Nhân viên giới thiệu.",
  ][index],
  amount: [960_000, 1_200_000, 320_000, 840_000, 480_000, 2_100_000][index],
  requestedBy: STAFF_TEAM[index % STAFF_TEAM.length].fullName,
  requestedAt: `0${1 + index}/10/2026`,
  status: index < 3 ? "pending" : index === 3 ? "approved" : "rejected",
}))

/* ------------------------------------------------------------------ *
 * Điểm danh toàn trung tâm
 * ------------------------------------------------------------------ */

export type AttendanceSummary = {
  classId: string
  className: string
  teacherName: string
  room: string
  weekday: number
  time: string
  total: number
  present: number
  late: number
  absent: number
  excused: number
  /** Buổi đã qua quá số ngày cho phép sửa. */
  locked: boolean
  lastLessonNo: number
  date: string
}

const CLASS_ATTENDANCE_RATES: number[] = [96, 92, 88, 100, 84, 94, 78, 91, 87, 99, 93, 82, 90, 95]

export const ATTENDANCE_SUMMARIES: AttendanceSummary[] = CENTER_CLASSES.map((cls, index) => {
  const total = cls.studentCount
  const absent = Math.max(0, Math.round((total * (100 - CLASS_ATTENDANCE_RATES[index % CLASS_ATTENDANCE_RATES.length])) / 100) - 1)
  const late = index % 3
  const excused = index % 4 === 0 ? 1 : 0
  return {
    classId: cls.id,
    className: cls.name,
    teacherName: cls.teacher,
    room: cls.room,
    weekday: cls.weekdays[0],
    time: cls.time,
    total,
    present: total - absent - late - excused,
    late,
    absent,
    excused,
    locked: index % 3 === 0,
    lastLessonNo: Math.min(cls.doneLessons, cls.totalLessons),
    date: ADMIN_TODAY_LABEL,
  }
})

export function attendanceRate(summary: AttendanceSummary) {
  return summary.total ? Math.round(((summary.present + summary.late) / summary.total) * 100) : 0
}

/** Mở khoá sửa điểm danh cho một lớp (quyền quản trị). */
export function unlockClassAttendance(classId: string) {
  ATTENDANCE_SUMMARIES.forEach((item) => {
    if (item.classId === classId) item.locked = false
  })
}

export const ATTENDANCE_RATE_SERIES = ATTENDANCE_SUMMARIES.map((summary) => ({
  name: summary.className,
  rate: attendanceRate(summary),
}))

/** Điểm danh chi tiết từng học viên của một lớp (dùng cho bảng xem trước). */
export function classAttendanceRows(classId: string) {
  const lessons = lessonsOfClass(classId)
  return STAFF_STUDENTS.filter((student) => student.classId === classId).map((student) => {
    const counts: Record<MarkStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 }
    for (const lesson of lessons) {
      const status = lesson.marks[student.id]
      if (status) counts[status] += 1
    }
    const lessonsCount = lessons.length
    return {
      student,
      counts,
      lessons: lessonsCount,
      rate: lessonsCount ? Math.round(((counts.present + counts.late) / lessonsCount) * 100) : 0,
    }
  })
}

export const MARK_LABELS: Record<MarkStatus, string> = Object.fromEntries(
  (Object.keys(MARK_META) as MarkStatus[]).map((status) => [status, MARK_META[status].label]),
) as Record<MarkStatus, string>

/* ------------------------------------------------------------------ *
 * Bảng lương quản trị
 * ------------------------------------------------------------------ */

export type AdminPayrollStatus = "draft" | "pending" | "approved"

export const ADMIN_PAYROLL_STATUS_META: Record<AdminPayrollStatus, { label: string; badge: "neutral" | "warning" | "success"; description: string }> = {
  draft: { label: "Đang tính", badge: "neutral", description: "Chỉ quản trị thấy, nhân viên chưa được xem." },
  pending: { label: "Chờ duyệt", badge: "warning", description: "Đã gửi duyệt, chưa hiển thị cho nhân viên." },
  approved: { label: "Đã chốt", badge: "success", description: "Đã chốt, nhân viên có thể xem." },
}

export type AdminPayrollRow = {
  id: string
  month: string
  staffId: string
  staffName: string
  role: "teacher" | "staff"
  base: number
  bonus: number
  deduction: number
  status: AdminPayrollStatus
  locked: boolean
  note: string
}

export function adminPayrollTotal(row: AdminPayrollRow) {
  return row.base + row.bonus - row.deduction
}

export const ADMIN_PAYROLL: AdminPayrollRow[] = [
  ...TEACHERS.slice(0, 5).map((teacher, index) => ({
    id: `pr-t-${index + 1}`,
    month: "10/2026",
    staffId: `gv-${index + 1}`,
    staffName: teacher.name,
    role: "teacher" as const,
    base: [8_400_000, 7_650_000, 9_200_000, 6_980_000, 8_100_000][index],
    bonus: [1_200_000, 840_000, 1_560_000, 620_000, 980_000][index],
    deduction: [200_000, 0, 350_000, 0, 150_000][index],
    status: (["approved", "approved", "pending", "draft", "draft"][index]) as AdminPayrollStatus,
    locked: index < 2,
    note: index === 2 ? "Chờ duyệt lương thưởng khóa Cambridge." : "",
  })),
  ...STAFF_TEAM.map((member, index) => ({
    id: `pr-s-${index + 1}`,
    month: "10/2026",
    staffId: member.id,
    staffName: member.fullName,
    role: "staff" as const,
    base: 12_000_000 + index * 500_000,
    bonus: [1_800_000, 2_400_000, 1_200_000, 900_000, 1_500_000][index],
    deduction: index === 3 ? 480_000 : 0,
    status: (["approved", "approved", "approved", "pending", "draft"][index]) as AdminPayrollStatus,
    locked: index < 3,
    note: index === 4 ? "Chờ chốt cuối tháng." : "",
  })),
]

/* ------------------------------------------------------------------ *
 * Nội dung landing page
 * ------------------------------------------------------------------ */

export type PublishStatus = "published" | "pending" | "draft"

export const PUBLISH_STATUS_META: Record<PublishStatus, { label: string; badge: "success" | "warning" | "neutral" }> = {
  published: { label: "Đang hiển thị", badge: "success" },
  pending: { label: "Chờ duyệt", badge: "warning" },
  draft: { label: "Bản nháp", badge: "neutral" },
}

export type LandingBanner = {
  id: string
  title: string
  subtitle: string
  cta: string
  image: string
  status: PublishStatus
  updatedAt: string
}

export const LANDING_BANNERS: LandingBanner[] = [
  {
    id: "bn1",
    title: "Nâng tầm tiếng Anh cùng giáo viên bản ngữ",
    subtitle: "Khóa học A1 – C1, lớp nhỏ tối đa 20 học viên, học thật trong lớp.",
    cta: "Xem khóa học",
    image: "photo-1523240795612-9a054b0db644",
    status: "published",
    updatedAt: "28/09/2026",
  },
  {
    id: "bn2",
    title: "Ưu đãi khai giảng mùa Thu 2026",
    subtitle: "Giảm 20% học phí khóa đầu tiên cho học viên đăng ký trong tháng 10.",
    cta: "Nhận ưu đãi",
    image: "photo-1546410531-bb4caa6b424d",
    status: "published",
    updatedAt: "30/09/2026",
  },
  {
    id: "bn3",
    title: "Chuỗi kỳ thi Cambridge YLE tại trung tâm",
    subtitle: "Lịch thi và luyện đề 8 tuần cho học viên từ 8 – 14 tuổi.",
    cta: "Xem lịch thi",
    image: "photo-1524178232363-1fb2b075b655",
    status: "pending",
    updatedAt: "01/10/2026",
  },
]

export type LandingTeacher = {
  id: string
  name: string
  specialty: string
  certificate: string
  experience: string
  photo: string
  status: PublishStatus
}

export const LANDING_TEACHERS: LandingTeacher[] = TEACHERS.map((teacher, index) => ({
  id: `lt-${index + 1}`,
  name: teacher.name,
  specialty: teacher.specialty,
  certificate: teacher.certificate,
  experience: teacher.experience,
  photo: teacher.photo,
  status: (["published", "published", "published", "published", "pending", "draft"][index] ?? "published") as PublishStatus,
}))

/* ------------------------------------------------------------------ *
 * Nhật ký thao tác
 * ------------------------------------------------------------------ */

export type AuditAction = "create" | "update" | "delete" | "login" | "export" | "import" | "approve" | "lock"

export const AUDIT_ACTION_META: Record<AuditAction, { label: string; tone: "success" | "info" | "warning" | "danger" | "neutral" }> = {
  create: { label: "Tạo mới", tone: "success" },
  update: { label: "Cập nhật", tone: "info" },
  delete: { label: "Xoá", tone: "danger" },
  login: { label: "Đăng nhập", tone: "neutral" },
  export: { label: "Xuất Excel", tone: "neutral" },
  import: { label: "Nhập Excel", tone: "warning" },
  approve: { label: "Duyệt", tone: "success" },
  lock: { label: "Khoá", tone: "danger" },
}

export type AuditLog = {
  id: string
  time: string
  actor: string
  actorRole: AccountRole
  action: AuditAction
  module: string
  detail: string
  ip: string
}

const AUDIT_ACTORS: [string, AccountRole][] = [
  ["Nguyễn Minh Anh", "admin"],
  ["Nguyễn Thị Bích Ngọc", "staff"],
  ["Nguyễn Minh Anh", "teacher"],
  ["Lê Quốc Bảo", "staff"],
  ["Phạm Thùy Linh", "staff"],
  ["Đỗ Anh Tuấn", "staff"],
]

const AUDIT_TEMPLATES: [AuditAction, string, string, string][] = [
  ["create", "Học viên", "Thêm hồ sơ học viên HV2026-0331", "Tạo mới"],
  ["update", "Lớp học", "Đổi phòng lớp B1 Buổi Tối 02 sang Phòng 302", "Cập nhật"],
  ["delete", "Bài đăng", "Gỡ bài đăng \"Ưu đãi hè 2026\" khỏi trang chủ", "Xoá"],
  ["export", "Báo cáo", "Xuất báo cáo doanh thu tháng 09/2026", "Xuất"],
  ["import", "Import Excel", "Nhập 42 tài khoản học viên từ file hoc-vien-thang-10.xlsx", "Nhập"],
  ["approve", "Bảng lương", "Chốt bảng lương tháng 09/2026 cho 11 nhân sự", "Duyệt"],
  ["lock", "Điểm danh", "Khoá chỉnh sửa điểm danh lớp A2 Buổi Tối 01", "Khoá"],
  ["login", "Tài khoản", "Đăng nhập từ thiết bị mới", "Đăng nhập"],
  ["update", "Cài đặt", "Đổi thời hạn khoá điểm danh từ 7 lên 10 ngày", "Cập nhật"],
  ["approve", "Học phí", "Duyệt giảm giá 960.000đ cho học viên Nguyễn Thị Hồng Nhung", "Duyệt"],
]

export const AUDIT_LOGS: AuditLog[] = Array.from({ length: 48 }, (_, index) => {
  const [actor, actorRole] = AUDIT_ACTORS[index % AUDIT_ACTORS.length]
  const [action, module, detail] = AUDIT_TEMPLATES[index % AUDIT_TEMPLATES.length]
  const hour = 8 + (index % 11)
  const minute = (index * 13) % 60
  return {
    id: `log-${index + 1}`,
    time: `${String(1 + (index % 9)).padStart(2, "0")}/10/2026 ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    actor,
    actorRole,
    action,
    module,
    detail,
    ip: `192.168.1.${20 + (index % 200)}`,
  }
}).sort((a, b) => b.time.localeCompare(a.time))

/* ------------------------------------------------------------------ *
 * Cài đặt
 * ------------------------------------------------------------------ */

export type CenterSettings = {
  name: string
  address: string
  phone: string
  email: string
  taxCode: string
  academicYear: string
  academicStart: string
  academicEnd: string
  attendanceLockDays: number
  receiptHeader: string
  receiptFooter: string
  allowSelfEnroll: boolean
  requirePasswordChange: boolean
  notifyParentOnPayment: boolean
}

export const ADMIN_SETTINGS: CenterSettings = {
  name: "[TÊN TRUNG TÂM]",
  address: "128 Lê Lợi, Quận 1, TP. Hồ Chí Minh",
  phone: "0909 123 456",
  email: "lienhe@ttnn.edu.vn",
  taxCode: "0314782916",
  academicYear: "2026 – 2027",
  academicStart: "01/09/2026",
  academicEnd: "31/08/2027",
  attendanceLockDays: 7,
  receiptHeader: "PHIẾU THU HỌC PHÍ",
  receiptFooter: "Phiếu thu này có giá trị khi có dấu của Trung tâm.",
  allowSelfEnroll: false,
  requirePasswordChange: true,
  notifyParentOnPayment: true,
}

/* ------------------------------------------------------------------ *
 * Chỉ số tổng quan
 * ------------------------------------------------------------------ */

export const REVENUE_SERIES = [
  { month: "T4", revenue: 412_000_000, target: 400_000_000 },
  { month: "T5", revenue: 438_000_000, target: 410_000_000 },
  { month: "T6", revenue: 465_000_000, target: 420_000_000 },
  { month: "T7", revenue: 392_000_000, target: 430_000_000 },
  { month: "T8", revenue: 421_000_000, target: 430_000_000 },
  { month: "T9", revenue: 486_000_000, target: 450_000_000 },
  { month: "T10", revenue: 512_000_000, target: 470_000_000 },
]

export const ENROLLMENT_SERIES = [
  { month: "T4", enrolled: 186, churned: 42 },
  { month: "T5", enrolled: 204, churned: 38 },
  { month: "T6", enrolled: 231, churned: 47 },
  { month: "T7", enrolled: 198, churned: 55 },
  { month: "T8", enrolled: 246, churned: 41 },
  { month: "T9", enrolled: 289, churned: 44 },
  { month: "T10", enrolled: 312, churned: 36 },
]

export const CLASS_SIZE_SERIES = CENTER_CLASSES.slice(0, 8).map((cls) => ({
  name: cls.code,
  fullName: cls.name,
  enrolled: cls.studentCount,
  capacity: cls.maxStudents,
}))

const LEAD_SOURCE_KEYS: LeadSource[] = ["Facebook", "Website", "Zalo", "Giới thiệu", "Khách vãng lai"]

export const SOURCE_SERIES = LEAD_SOURCE_KEYS.map((source) => ({
  name: source,
  leads: STAFF_LEADS.filter((lead) => lead.source === source).length,
  won: STAFF_LEADS.filter((lead) => lead.source === source && lead.stage === "won").length,
}))

export const FUNNEL_SERIES = [
  { step: "Lead mới", value: 412 },
  { step: "Đã gọi", value: 356 },
  { step: "Đã tham quan", value: 214 },
  { step: "Chốt ghi danh", value: 128 },
  { step: "Tái học", value: 96 },
]

export const RECRUIT_SUMMARY = {
  newLeads: 412,
  contacted: 356,
  converted: 128,
  conversionRate: 31,
  avgDaysToEnroll: 6.4,
  costPerEnroll: 214_000,
  byMonth: ENROLLMENT_SERIES.map((item) => ({ month: item.month, leads: item.enrolled + 40, converted: item.enrolled })),
}

/* ------------------------------------------------------------------ *
 * Buổi học hôm nay và khách mới
 * ------------------------------------------------------------------ */

export type TodayLesson = {
  classId: string
  className: string
  room: string
  time: string
  slotId: string
  teacherName: string
  studentCount: number
  status: "done" | "ongoing" | "upcoming"
  attendanceDone: boolean
}

export const TODAY_LESSONS: TodayLesson[] = CENTER_CLASSES.slice(0, 6).map((cls, index) => ({
  classId: cls.id,
  className: cls.name,
  room: cls.room,
  time: cls.time,
  slotId: TIMETABLE_SLOTS[cls.time.startsWith("19") ? 6 : cls.time.startsWith("08") ? 1 : 4].id,
  teacherName: cls.teacher,
  studentCount: cls.studentCount,
  status: index === 0 ? "done" : index === 1 ? "ongoing" : "upcoming",
  attendanceDone: index < 2,
}))

export const NEW_LEADS = STAFF_LEADS.filter((lead) => lead.stage === "new").slice(0, 6).map((lead) => ({
  id: lead.id,
  fullName: lead.fullName,
  phone: lead.phone,
  source: lead.source,
  ownerName: getStaffMember(lead.ownerId)?.fullName ?? "—",
  createdAt: formatDate(lead.createdAt),
  expectedFee: lead.expectedFee,
}))

/* ------------------------------------------------------------------ *
 * Thanh toán gần đây (dùng chung với khu vực nhân viên)
 * ------------------------------------------------------------------ */

export function recentPayments(limit = 10): (CenterPayment & { studentName: string; method: PaymentMethod })[] {
  return CENTER_PAYMENTS.slice(0, limit).map((payment) => ({
    ...payment,
    studentName: STAFF_STUDENTS.find((s) => s.id === payment.studentId)?.fullName ?? "—",
    method: payment.method,
  }))
}
