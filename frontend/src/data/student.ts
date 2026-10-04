import { unsplash } from "@/lib/images"

/* ------------------------------------------------------------------ *
 * Hồ sơ học viên
 * ------------------------------------------------------------------ */

export type StudentProfile = {
  studentId: string
  fullName: string
  birthDate: string
  gender: "Nam" | "Nữ"
  email: string
  phone: string
  address: string
  identityNo: string
  occupation: string
  level: string
  startDate: string
  status: string
  avatar: string
}

export const STUDENT_PROFILE: StudentProfile = {
  studentId: "HV2026-0147",
  fullName: "Nguyễn Gia Huy",
  birthDate: "14/05/2009",
  gender: "Nam",
  email: "hocvien@trungtam.edu.vn",
  phone: "0909 123 456",
  address: "145/12 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP. Hồ Chí Minh",
  identityNo: "079 209 004 512",
  occupation: "Học sinh THPT",
  level: "A2 · Tiền Trung Cấp",
  startDate: "06/07/2026",
  status: "Đang học",
  avatar: unsplash("photo-1507003211169-0a1dd7228f2d", 300),
}

export type Guardian = {
  fullName: string
  relation: string
  phone: string
  email: string
  occupation: string
  address: string
}

export const GUARDIAN: Guardian = {
  fullName: "Nguyễn Văn Hùng",
  relation: "Bố",
  phone: "0912 345 678",
  email: "hung.nguyen@gmail.com",
  occupation: "Kỹ sư Cơ khí",
  address: "145/12 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP. Hồ Chí Minh",
}

/* ------------------------------------------------------------------ *
 * Lớp học & tiến độ
 * ------------------------------------------------------------------ */

export const ENROLLMENT = {
  className: "Lớp A2 Buổi Tối 01",
  classCode: "A2T01",
  courseName: "Tiếng Anh Tiền Trung Cấp",
  teacher: "Cô Nguyễn Minh Anh",
  room: "Phòng 204 · Cơ sở Quận 7",
  schedule: "Thứ 2 & Thứ 6 · 19:00 – 20:30",
  totalLessons: 64,
  attendedLessons: 24,
  startDate: new Date(2026, 6, 6),
  estimatedCompletion: new Date(2027, 1, 24),
} as const

/* ------------------------------------------------------------------ *
 * Buổi học & điểm danh
 * ------------------------------------------------------------------ */

export type AttendanceStatus = "present" | "absent" | "late" | "excused" | "upcoming"

export const ATTENDANCE_META: Record<AttendanceStatus, { label: string; badge: "success" | "danger" | "warning" | "info" | "neutral" }> = {
  present: { label: "Có mặt", badge: "success" },
  absent: { label: "Vắng", badge: "danger" },
  late: { label: "Muộn", badge: "warning" },
  excused: { label: "Có phép", badge: "info" },
  upcoming: { label: "Chưa học", badge: "neutral" },
}

export type Lesson = {
  no: number
  date: Date
  time: string
  topic: string
  unit: string
  status: AttendanceStatus
}

/** Chủ đề 64 buổi học, chia theo 8 unit x 8 buổi. */
const UNITS: { unit: string; title: string; topics: string[] }[] = [
  { unit: "Unit 1", title: "Giới thiệu bản thân", topics: ["Lời chào và giới thiệu", "Thông tin cá nhân", "Sở thích và thói quen", "Nghề nghiệp", "Gia đình", "Những điều thích", "Miêu tả người", "Tổng kết Unit 1"] },
  { unit: "Unit 2", title: "Địa điểm & hướng", topics: ["Nhà cửa", "Thành phố và làng quê", "Đường phố", "Chỉ đường", "Phương tiện giao thông", "Địa điểm công cộng", "Bản đồ", "Tổng kết Unit 2"] },
  { unit: "Unit 3", title: "Sinh hoạt hằng ngày", topics: ["Thứ trong tuần", "Giờ giấc", "Dậy sớm hay muộn", "Thói quen ăn uống", "Mua sắm", "Làm việc nhà", "Sức khỏe", "Tổng kết Unit 3"] },
  { unit: "Unit 4", title: "Trường học & học tập", topics: ["Môn học", "Đồ dùng học tập", "Lớp học", "Thầy cô giáo", "Bài kiểm tra", "Cách học tiếng Anh", "Thư viện", "Tổng kết Unit 4"] },
  { unit: "Unit 5", title: "Sở thích & giải trí", topics: ["Thể thao", "Âm nhạc", "Phim ảnh", "Đọc sách", "Du lịch", "Nấu ăn", "Hoạt động cuối tuần", "Tổng kết Unit 5"] },
  { unit: "Unit 6", title: "Công việc & nghề nghiệp", topics: ["Nghề nghiệp", "Công ty", "Phỏng vấn xin việc", "Lịch làm việc", "Đồng nghiệp", "Giao tiếp điện thoại", "Thăng tiến", "Tổng kết Unit 6"] },
  { unit: "Unit 7", title: "Sức khỏe & đời sống", topics: ["Bệnh viện", "Triệu chứng bệnh", "Thuốc men", "Bác sĩ", "Chế độ ăn uống", "Thể dục", "Tinh thần", "Tổng kết Unit 7"] },
  { unit: "Unit 8", title: "Môi trường & xã hội", topics: ["Môi trường sống", "Rác thải", "Năng lượng", "Giao thông đô thị", "Cộng đồng", "Tình nguyện", "Bảo vệ thiên nhiên", "Tổng kết Unit 8"] },
]

const COURSE_START = ENROLLMENT.startDate

/** Ngày nghỉ không có buổi học (nghỉ lễ, kỳ nghỉ Tết). */
const SKIP_DATES = new Set(["2026-10-01", "2027-02-08", "2027-02-09", "2027-02-10"])

/** Sinh 64 buổi học: Thứ 2 & Thứ 6 kể từ ngày khai giảng. */
function buildLessons(): Lesson[] {
  const lessons: Lesson[] = []
  const topicIndex = (no: number) => UNITS[Math.min(Math.floor((no - 1) / 8), UNITS.length - 1)]

  // Buổi học đã diễn ra trước ngày "hôm nay" của bản demo.
  const TODAY = new Date(2026, 9, 1)

  for (let week = 0; lessons.length < 64; week += 1) {
    for (const dayOffset of [0, 4]) {
      const monday = new Date(COURSE_START)
      monday.setDate(COURSE_START.getDate() + week * 7)
      const date = new Date(monday)
      date.setDate(monday.getDate() + dayOffset)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
      if (SKIP_DATES.has(key)) continue
      if (lessons.length >= 64) break

      const no = lessons.length + 1
      const info = topicIndex(no)
      lessons.push({
        no,
        date,
        time: "19:00 – 20:30",
        unit: info.unit,
        topic: `${info.title} – ${info.topics[(no - 1) % 8]}`,
        status: date < TODAY ? "present" : "upcoming",
      })
    }
  }

  // Điểm danh thực tế cho các buổi đã qua.
  const overrides: Record<number, AttendanceStatus> = {
    4: "late",
    7: "absent",
    10: "excused",
    13: "late",
    16: "absent",
    19: "late",
    22: "excused",
  }
  for (const [no, status] of Object.entries(overrides)) {
    const lesson = lessons[Number(no) - 1]
    if (lesson) lesson.status = status
  }

  return lessons
}

export const LESSONS: Lesson[] = buildLessons()

export const UPCOMING_LESSONS = LESSONS.filter((l) => l.status === "upcoming").slice(0, 4)

/** Thống kê điểm danh tổng hợp. */
export const ATTENDANCE_STATS = (() => {
  const done = LESSONS.filter((l) => l.status !== "upcoming")
  const count = (s: AttendanceStatus) => done.filter((l) => l.status === s).length
  const present = count("present")
  const late = count("late")
  const excused = count("excused")
  const absent = count("absent")
  return {
    total: done.length,
    present,
    late,
    excused,
    absent,
    rate: done.length ? Math.round(((present + late) / done.length) * 100) : 0,
  }
})()

/* ------------------------------------------------------------------ *
 * Lịch trình – các sự kiện trên lịch
 * ------------------------------------------------------------------ */

export type CalendarEventType = "lesson" | "exam" | "holiday" | "event"

export type CalendarEvent = {
  id: string
  date: Date
  type: CalendarEventType
  title: string
  subtitle?: string
  time?: string
  location?: string
  description?: string
}

export const EVENT_META: Record<CalendarEventType, { label: string; dot: string; badge: "brand" | "warning" | "danger" | "success" }> = {
  lesson: { label: "Buổi học", dot: "bg-brand-hover", badge: "brand" },
  exam: { label: "Kỳ thi", dot: "bg-warning", badge: "warning" },
  holiday: { label: "Nghỉ lễ", dot: "bg-danger", badge: "danger" },
  event: { label: "Sự kiện", dot: "bg-success", badge: "success" },
}

/** Sự kiện cố định: kỳ thi, ngày lễ và sự kiện của trung tâm. */
const EXTRA_EVENTS: Omit<CalendarEvent, "id">[] = [
  { date: new Date(2026, 9, 1), type: "holiday", title: "Quốc khánh 2/9", subtitle: "Nghỉ lễ quốc gia", description: "Trung tâm nghỉ đón Quốc khánh, buổi học được chuyển sang lịch bù." },
  { date: new Date(2026, 9, 24), type: "exam", title: "Kiểm tra định kỳ Unit 5 – 6", subtitle: ENROLLMENT.className, time: "19:00 – 20:30", location: ENROLLMENT.room, description: "Bài kiểm tra 50 phút gồm ngữ pháp, từ vựng và đọc hiểu. Đề cập nhật trên lớp trước 3 ngày." },
  { date: new Date(2026, 9, 31), type: "event", title: "English Day 2026", subtitle: "Ngày hội tiếng Anh toàn trung tâm", time: "08:30 – 12:00", location: "Sân trường cơ sở Quận 7", description: "Chuỗi trò chơi, thi hùng biện và workshop miễn phí dành cho học viên và phụ huynh." },
  { date: new Date(2026, 10, 14), type: "event", title: "Buổi tư vấn phụ huynh giữa kỳ", subtitle: ENROLLMENT.teacher, time: "17:00 – 19:00", location: "Phòng họp 3", description: "Giáo viên báo cáo tiến độ và trao đổi trực tiếp với phụ huynh học viên A2." },
  { date: new Date(2026, 10, 28), type: "exam", title: "Kiểm tra giữa khóa A2", subtitle: ENROLLMENT.className, time: "19:00 – 20:30", location: ENROLLMENT.room, description: "Bài kiểm tra giữa khóa gồm Listening, Reading, Writing và Speaking với thang điểm 10." },
  { date: new Date(2026, 11, 20), type: "event", title: "Đăng ký khóa B1 kế tiếp", subtitle: "Ưu đãi 15% học phí", description: "Học viên hoàn thành khóa A2 được ưu đãi khi đăng ký khóa Tiếng Anh Trung Cấp." },
  { date: new Date(2026, 11, 24), type: "event", title: "Báo cáo tiến độ học kỳ II", subtitle: ENROLLMENT.teacher, description: "Gửi báo cáo tiến độ và kết quả học kỳ II tới phụ huynh qua Zalo và email." },
  { date: new Date(2027, 1, 8), type: "holiday", title: "Nghỉ Tết Nguyên Đán", subtitle: "Nghỉ 3 ngày", description: "Trung tâm nghỉ Tết, lớp học sẽ được chuyển sang lịch bù trong tuần sau." },
  { date: new Date(2027, 1, 24), type: "exam", title: "Thi cuối khóa & trao chứng nhận", subtitle: ENROLLMENT.className, time: "14:00 – 16:00", location: "Hội trường cơ sở Quận 7", description: "Bài thi cuối khóa và lễ trao chứng nhận hoàn thành khóa học." },
]

/** Toàn bộ sự kiện dùng cho lịch, ghép cả buổi học và sự kiện riêng. */
export const CALENDAR_EVENTS: CalendarEvent[] = [
  ...LESSONS.map((lesson) => ({
    id: `lesson-${lesson.no}`,
    date: lesson.date,
    type: "lesson" as const,
    title: lesson.topic,
    subtitle: `${ENROLLMENT.className} · ${lesson.unit}`,
    time: lesson.time,
    location: ENROLLMENT.room,
    description: lesson.status === "upcoming"
      ? "Buổi học sắp tới. Vui lòng đến trước 10 phút và mang theo sách tập vở."
      : `Buổi học đã diễn ra · Điểm danh: ${ATTENDANCE_META[lesson.status].label.toLowerCase()}.`,
  })),
  ...EXTRA_EVENTS.map((event, i) => ({ ...event, id: `event-${i}` })),
]

/* ------------------------------------------------------------------ *
 * Bảng điểm
 * ------------------------------------------------------------------ */

export type ScoreKind = "unit" | "mid" | "final"

export type ScoreRow = {
  id: string
  kind: ScoreKind
  name: string
  date: string
  listening: number
  reading: number
  writing: number
  speaking: number
  average: number
  comment: string
}

export const SCORE_KIND_META: Record<ScoreKind, { label: string; badge: "info" | "warning" | "brand" }> = {
  unit: { label: "Định kỳ", badge: "info" },
  mid: { label: "Giữa khóa", badge: "warning" },
  final: { label: "Cuối khóa", badge: "brand" },
}

const score = (
  id: string,
  kind: ScoreKind,
  name: string,
  date: string,
  listening: number,
  reading: number,
  writing: number,
  speaking: number,
  comment: string,
): ScoreRow => ({
  id,
  kind,
  name,
  date,
  listening,
  reading,
  writing,
  speaking,
  average: Number(((listening + reading + writing + speaking) / 4).toFixed(1)),
  comment,
})

export const SCORES: ScoreRow[] = [
  score("s1", "unit", "Kiểm tra định kỳ Unit 1", "25/07/2026", 7.5, 8, 7.5, 8, "Phát âm chưa tự nhiên nhưng ngữ pháp hiểu đúng. Cần luyện thêm phân biệt /s/ và /z/."),
  score("s2", "unit", "Kiểm tra định kỳ Unit 2 – 3", "08/08/2026", 8, 8.5, 7.5, 8, "Tốt. Nhớ đầy đủ từ vựng về gia đình. Phần viết còn ngắn, cần mở rộng câu."),
  score("s3", "unit", "Kiểm tra định kỳ Unit 4", "29/08/2026", 8, 8, 8.5, 8.5, "Tiến bộ rõ rệt ở kỹ năng nghe và nói. Giữ nguyên phong độ."),
  score("s4", "unit", "Kiểm tra định kỳ Unit 5", "19/09/2026", 8.5, 8.5, 8, 9, "Điểm nói tốt nhất từ trước đến nay. Tiếp tục luyện ngữ pháp thứ tự từ."),
  score("s5", "mid", "Kiểm tra giữa khóa A2", "30/09/2026", 8.5, 9, 8.5, 9, "Đạt yêu cầu. Kết quả tốt, đặc biệt là phần Writing và Speaking. Chúc mừng bạn!"),
]

export const SCORE_AVERAGE = Number((SCORES.reduce((sum, s) => sum + s.average, 0) / SCORES.length).toFixed(1))

/* ------------------------------------------------------------------ *
 * Bài tập & thông báo
 * ------------------------------------------------------------------ */

export type AssignmentStatus = "submitted" | "due" | "late" | "overdue"

export type Assignment = {
  id: string
  title: string
  className: string
  dueDate: Date
  status: AssignmentStatus
  submittedAt?: Date
  note: string
}

export const ASSIGNMENT_META: Record<AssignmentStatus, { label: string; badge: "success" | "warning" | "danger" | "neutral" }> = {
  submitted: { label: "Đã nộp", badge: "success" },
  due: { label: "Chưa nộp", badge: "neutral" },
  late: { label: "Sắp hết hạn", badge: "warning" },
  overdue: { label: "Quá hạn", badge: "danger" },
}

export const ASSIGNMENTS: Assignment[] = [
  { id: "a1", title: "Bài tập Unit 5 – Sở thích & giải trí", className: ENROLLMENT.className, dueDate: new Date(2026, 8, 30), status: "submitted", submittedAt: new Date(2026, 8, 29), note: "Bài tập trên giấy, nộp đầy đủ 3 trang." },
  { id: "a2", title: "Viết đoạn văn 80 từ về ngày nghỉ yêu thích", className: ENROLLMENT.className, dueDate: new Date(2026, 9, 1), status: "submitted", submittedAt: new Date(2026, 8, 31), note: "Đã chấm và trả lại kèm nhận xét sửa lỗi." },
  { id: "a3", title: "Bài tập Unit 6 – Công việc & nghề nghiệp", className: ENROLLMENT.className, dueDate: new Date(2026, 9, 3), status: "late", note: "Bài đọc hiểu trang 42 – 43 kèm 10 câu hỏi." },
  { id: "a4", title: "Luyện nói chủ đề 'Địa điểm công cộng'", className: ENROLLMENT.className, dueDate: new Date(2026, 9, 5), status: "late", note: "Ghi âm 2 phút nói về 3 địa điểm bạn thường ghé." },
  { id: "a5", title: "Bài tập Unit 6 – Phần 2", className: ENROLLMENT.className, dueDate: new Date(2026, 8, 25), status: "overdue", note: "Điền từ vựng và sắp xếp câu. Đã quá hạn 6 ngày." },
  { id: "a6", title: "Ôn tập từ vựng trước kiểm tra giữa khóa", className: ENROLLMENT.className, dueDate: new Date(2026, 9, 20), status: "due", note: "Tự học, không cần nộp. Hệ thống sẽ nhắc khi đến hạn." },
]

export type Announcement = {
  id: string
  title: string
  body: string
  date: string
  author: string
  tone: "info" | "warning" | "success" | "danger"
}

export const ANNOUNCEMENTS: Announcement[] = [
  { id: "n1", title: "Nhắc lịch kiểm tra giữa khóa A2", body: "Kỳ kiểm tra giữa khóa sẽ diễn ra vào ngày 28/11. Đề gồm 4 kỹ năng, thời gian 90 phút. Điểm danh muộn quá 15 phút sẽ không được làm bài.", date: "30/09/2026", author: "Cô Nguyễn Minh Anh", tone: "warning" },
  { id: "n2", title: "English Day 2026 – Đăng ký tham dự", body: "Chương trình ngoài trời lúc 08:30 sáng thứ Bảy 31/10 tại sân trường cơ sở Quận 7. Phụ huynh được mời cùng tham dự, vui lòng đăng ký trước 25/10.", date: "28/09/2026", author: "Ban chuyên môn", tone: "info" },
  { id: "n3", title: "Nghỉ lễ Quốc khánh 2/9", body: "Trung tâm nghỉ ngày 01/10. Buổi học chuyển sang lịch bù, vui lòng theo dõi lịch trình mới trên cổng học viên.", date: "29/09/2026", author: "Phòng Hành chính", tone: "danger" },
  { id: "n4", title: "Cập nhật thông tin liên hệ phụ huynh", body: "Bạn vui lòng kiểm tra và cập nhật số điện thoại liên hệ tại trang Thông tin cá nhân để nhận thông báo kịp thời.", date: "22/09/2026", author: "Phòng Hành chính", tone: "info" },
  { id: "n5", title: "Khen thưởng học viên tiến bộ vượt bậc", body: "Chúc mừng bạn đạt điểm kiểm tra giữa khóa 8.8. Giáo viên sẽ ghi nhận kết quả vào hồ sơ học tập.", date: "30/09/2026", author: "Cô Nguyễn Minh Anh", tone: "success" },
]

/* ------------------------------------------------------------------ *
 * Học phí
 * ------------------------------------------------------------------ */

export type Payment = {
  id: string
  date: string
  amount: number
  method: "Tiền mặt" | "Chuyển khoản" | "Thẻ ATM" | "Ví điện tử"
  receiptNo: string
  note: string
}

export const TUITION_TOTAL = 15_200_000

export const TUITION = {
  total: TUITION_TOTAL,
  paid: 11_400_000,
  remaining: TUITION_TOTAL - 11_400_000,
  nextDueDate: new Date(2026, 10, 10),
  nextDueLabel: "Học phí kỳ 2",
  status: "Còn nợ một khoản",
} as const

export const PAYMENTS: Payment[] = [
  { id: "p1", date: "06/07/2026", amount: 3_800_000, method: "Chuyển khoản", receiptNo: "BL-2026-0712", note: "Đặt cọc giữ chỗ khóa A2" },
  { id: "p2", date: "10/07/2026", amount: 3_800_000, method: "Tiền mặt", receiptNo: "BL-2026-0715", note: "Học phí kỳ 1" },
  { id: "p3", date: "05/09/2026", amount: 3_800_000, method: "Thẻ ATM", receiptNo: "BL-2026-0921", note: "Học phí kỳ 2 – đợt 1" },
]

export const TUITION_METHOD_META: Record<Payment["method"], { badge: "brand" | "info" | "success" | "neutral" }> = {
  "Tiền mặt": { badge: "neutral" },
  "Chuyển khoản": { badge: "info" },
  "Thẻ ATM": { badge: "success" },
  "Ví điện tử": { badge: "brand" },
}