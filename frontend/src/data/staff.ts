import { TEACHERS } from "@/data/landing"
import {
  CLASSES as TEACHER_CLASSES,
  TEACHER_PROFILE,
  TEACHER_STUDENTS,
  TODAY,
  lessonsOfClass,
  type ClassLesson,
  type MarkStatus,
  type TeacherClass,
} from "@/data/teacher"
import { unsplash } from "@/lib/images"

/** Ngày "hôm nay" của bản demo khu vực nhân viên (giống khu vực giáo viên). */
export const STAFF_TODAY = TODAY

/* ------------------------------------------------------------------ *
 * Nhân viên đang đăng nhập
 * ------------------------------------------------------------------ */

export type StaffProfile = {
  id: string
  fullName: string
  email: string
  phone: string
  position: string
  department: string
  startDate: string
  education: string
  bio: string
  avatar: string
}

export const STAFF_PROFILE: StaffProfile = {
  id: "NV0007",
  fullName: "Trần Thị Hồng Nhung",
  email: "hongnhung.tran@trungtam.edu.vn",
  phone: "0903 118 224",
  position: "Nhân viên tư vấn & đào tạo",
  department: "Phòng Tư vấn – Đào tạo",
  startDate: "03/08/2022",
  education: "Thạc sĩ Quản trị Giáo dục – ĐH Sư phạm TP.HCM",
  bio: "4 năm kinh nghiệm tư vấn khóa học và đồng hành cùng phụ huynh trong suốt hành trình học tiếng Anh của con em.",
  avatar: unsplash("photo-1544005313-94ddf0286df2", 300),
}

export type StaffMember = {
  id: string
  fullName: string
  role: string
  phone: string
  avatar: string
}

export const STAFF_TEAM: StaffMember[] = [
  { id: STAFF_PROFILE.id, fullName: STAFF_PROFILE.fullName, role: "Tư vấn & đào tạo", phone: STAFF_PROFILE.phone, avatar: STAFF_PROFILE.avatar },
  { id: "NV0002", fullName: "Lê Quốc Bảo", role: "Trưởng nhóm tư vấn", phone: "0912 445 118", avatar: unsplash("photo-1507003211169-0a1dd7228f2d", 160) },
  { id: "NV0003", fullName: "Phạm Thùy Linh", role: "Đào tạo & chăm sóc học viên", phone: "0938 220 907", avatar: unsplash("photo-1494790108377-be9c29b29330", 160) },
  { id: "NV0004", fullName: "Đỗ Anh Tuấn", role: "Thu học & hồ sơ", phone: "0975 663 204", avatar: unsplash("photo-1500648767791-00dcc994a43e", 160) },
  { id: "NV0005", fullName: "Vũ Khánh Chi", role: "Tư vấn khóa thi", phone: "0907 812 336", avatar: unsplash("photo-1531123897727-8f129e1688ce", 160) },
]

export function getStaffMember(id: string) {
  return STAFF_TEAM.find((s) => s.id === id)
}

/* ------------------------------------------------------------------ *
 * Lớp học toàn trung tâm
 * ------------------------------------------------------------------ */

export type CenterClassStatus = "active" | "finishing" | "closed"

export type CenterClass = TeacherClass & {
  teacher: string
  /** Nhân viên phụ trách hồ sơ học viên của lớp. */
  staffId: string
}

export const CLASS_STATUS_META: Record<CenterClassStatus, { label: string; badge: "success" | "warning" | "neutral" }> = {
  active: { label: "Đang học", badge: "success" },
  finishing: { label: "Sắp hoàn thành", badge: "warning" },
  closed: { label: "Đã kết thúc", badge: "neutral" },
}

/** 3 lớp đã có trong `data/teacher.ts` được tái sử dụng để dữ liệu hai khu vực không lệch nhau. */
const SHARED_CLASS_STAFF: Record<string, string> = { A2T01: "NV0007", B1T02: "NV0003", Y3SAT: "NV0007" }

const EXTRA_CLASSES: CenterClass[] = [
  {
    id: "A1E03",
    name: "A1 Buổi Sáng 03",
    code: "A1E03",
    course: "Tiếng Anh Sơ Cấp",
    level: "A1 · Beginner",
    room: "Phòng 103",
    weekdays: [2, 6],
    time: "08:00 – 09:30",
    studentCount: 14,
    maxStudents: 18,
    totalLessons: 64,
    doneLessons: 21,
    startDate: "12/01/2026",
    endDate: "05/12/2026",
    status: "active",
    tone: "brand",
    teacher: TEACHERS[1].name,
    staffId: "NV0004",
  },
  {
    id: "C1T01",
    name: "C1 Buổi Tối 01",
    code: "C1T01",
    course: "Tiếng Anh Nâng Cao",
    level: "C1 · Advanced",
    room: "Phòng 401",
    weekdays: [3, 6],
    time: "19:00 – 20:45",
    studentCount: 11,
    maxStudents: 14,
    totalLessons: 48,
    doneLessons: 30,
    startDate: "19/04/2026",
    endDate: "19/12/2026",
    status: "active",
    tone: "info",
    teacher: TEACHERS[3].name,
    staffId: "NV0005",
  },
  {
    id: "Y5SUN",
    name: "Thiếu nhi Y5 Chủ Nhật",
    code: "Y5SUN",
    course: "Tiếng Anh Khởi Đầu",
    level: "Starter · Pre A1",
    room: "Phòng 101",
    weekdays: [0],
    time: "15:00 – 16:30",
    studentCount: 13,
    maxStudents: 16,
    totalLessons: 64,
    doneLessons: 38,
    startDate: "14/09/2025",
    endDate: "19/07/2026",
    status: "active",
    tone: "success",
    teacher: TEACHERS[4].name,
    staffId: "NV0003",
  },
  {
    id: "B2E02",
    name: "B2 Buổi Tối 02",
    code: "B2E02",
    course: "Tiếng Anh Trung Cấp",
    level: "B2 · Upper Intermediate",
    room: "Phòng 302",
    weekdays: [1, 4],
    time: "19:45 – 21:15",
    studentCount: 12,
    maxStudents: 16,
    totalLessons: 64,
    doneLessons: 58,
    startDate: "10/11/2025",
    endDate: "28/11/2026",
    status: "finishing",
    tone: "info",
    teacher: TEACHERS[2].name,
    staffId: "NV0007",
  },
  {
    id: "A2T04",
    name: "A2 Buổi Tối 04",
    code: "A2T04",
    course: "Tiếng Anh Tiền Trung Cấp",
    level: "A2 · Elementary",
    room: "Phòng 205",
    weekdays: [2, 5],
    time: "19:00 – 20:30",
    studentCount: 0,
    maxStudents: 18,
    totalLessons: 64,
    doneLessons: 64,
    startDate: "06/05/2026",
    endDate: "30/10/2026",
    status: "closed",
    tone: "brand",
    teacher: TEACHERS[5].name,
    staffId: "NV0002",
  },
]

export const CENTER_CLASSES: CenterClass[] = [
  ...TEACHER_CLASSES.map<CenterClass>((cls) => ({
    ...cls,
    teacher: TEACHER_PROFILE.fullName,
    staffId: SHARED_CLASS_STAFF[cls.id] ?? "NV0002",
  })),
  ...EXTRA_CLASSES,
]

export function getCenterClass(id: string) {
  return CENTER_CLASSES.find((c) => c.id === id)
}

export function classNameOf(id: string) {
  return getCenterClass(id)?.name ?? "Chưa xếp lớp"
}

/* ------------------------------------------------------------------ *
 * Học viên toàn trung tâm
 * ------------------------------------------------------------------ */

export type StudentStatus = "active" | "paused" | "finished" | "dropped"
export type TuitionStatus = "paid" | "partial" | "due-soon" | "overdue"

export const STUDENT_STATUS_META: Record<StudentStatus, { label: string; badge: "success" | "warning" | "neutral" | "danger" }> = {
  active: { label: "Đang học", badge: "success" },
  paused: { label: "Tạm nghỉ", badge: "warning" },
  finished: { label: "Đã hoàn thành", badge: "neutral" },
  dropped: { label: "Đã nghỉ học", badge: "danger" },
}

export const TUITION_STATUS_META: Record<TuitionStatus, { label: string; badge: "success" | "warning" | "danger" | "info" }> = {
  paid: { label: "Đã đóng đủ", badge: "success" },
  partial: { label: "Còn nợ", badge: "info" },
  "due-soon": { label: "Sắp đến hạn", badge: "warning" },
  overdue: { label: "Quá hạn", badge: "danger" },
}

export type CareNote = {
  id: string
  date: string
  author: string
  title: string
  body: string
  tone: "info" | "warning" | "success" | "danger"
}

export type GuardianInfo = {
  fullName: string
  relation: string
  phone: string
  email: string
  occupation: string
  address: string
}

export type StaffStudent = {
  id: string
  studentCode: string
  fullName: string
  birthDate: string
  gender: "Nam" | "Nữ"
  phone: string
  email: string
  address: string
  identityNo: string
  occupation: string
  status: StudentStatus
  level: string
  /** Ngày nhập học dạng dd/MM/yyyy. */
  startDate: string
  classId: string
  staffId: string
  guardian: GuardianInfo
  tuition: { total: number; paid: number; remaining: number; dueDate: Date; status: TuitionStatus }
  attendance: { rate: number; absent: number; late: number }
  averageScore: number
  notes: CareNote[]
  avatar: string
}

const FEMALE_NAMES = [
  "Nguyễn Thị Hồng Nhung", "Trần Ngọc Bích Châu", "Lê Hoàng Mỹ Duyên", "Phạm Quỳnh Anh",
  "Huỳnh Thị Thu Hà", "Võ Ngọc Khánh Linh", "Đặng Thùy Nhung", "Bùi Kim Yến",
  "Đỗ Hoàng Oanh", "Ngô Thanh Phương", "Dương Mai Phượng", "Lý Thị Quỳnh",
  "Trịnh Ngọc Ánh", "Phan Thị Bảo Châu", "Hoàng Thị Diệu", "Vũ Hạ Giang",
  "Đinh Thị Hồng", "Tạ Thị Lan Anh", "Cao Thị Ngọc", "Mai Thị Thanh",
  "Tô Thị Trang", "Lương Thị Vân",
]

const MALE_NAMES = [
  "Nguyễn Hoàng Minh", "Trần Đức Anh", "Lê Quang Huy", "Phạm Tiến Dũng",
  "Đặng Gia Bảo", "Vũ Thành Long", "Bùi Đình Nam", "Hoàng Minh Khôi",
  "Đỗ Quốc Bảo", "Ngô Tuấn Kiệt", "Dương Văn Hiếu", "Lý Hoàng Nam",
  "Trịnh Quốc Việt", "Phan Đức Tài", "Võ Thanh Sơn", "Huỳnh Ngọc Trung",
  "Đinh Hữu Phước", "Tạ Quang Vinh", "Cao Văn Thắng", "Mai Hữu Tín",
]

const GUARDIAN_NAMES = [
  ["Nguyễn Thị Hồng", "Mẹ"], ["Trần Văn Hùng", "Bố"], ["Lê Thị Mai", "Mẹ"],
  ["Phạm Văn Kiên", "Bố"], ["Hoàng Thị Lan", "Mẹ"], ["Vũ Văn Thành", "Bố"],
  ["Đỗ Thị Thu", "Mẹ"], ["Bùi Văn Hải", "Bố"], ["Ngô Thị Bích", "Mẹ"],
  ["Dương Văn Sơn", "Bố"], ["Lý Thị Lan Anh", "Mẹ"], ["Phan Văn Quang", "Bố"],
  ["Võ Thị Hạnh", "Mẹ"], ["Huỳnh Văn Nam", "Bố"], ["Đinh Thị Nhung", "Mẹ"],
]

const OCCUPATIONS = ["Kế toán", "Giáo viên", "Kỹ sư", "Bác sĩ", "Nhân viên văn phòng", "Kinh doanh", "Công nhân", "Luật sư", "Nộp trợ", "Freelancer"]

const STREETS = [
  "42 Nguyễn Thị Minh Khai, Quận 1, TP.HCM",
  "128 Lê Lợi, Quận 1, TP.HCM",
  "15B Nguyễn Văn Trỗi, Phú Nhuận, TP.HCM",
  "220 Hai Bà Trưng, Quận 3, TP.HCM",
  "88 Nguyễn Kiệm, Quận 3, TP.HCM",
  "310 Cách Mạng Tháng 8, Quận 10, TP.HCM",
  "64 Trần Phú, Quận 5, TP.HCM",
  "19 Nguyễn Đình Chiểu, Quận 3, TP.HCM",
  "72 Pasteur, Quận 3, TP.HCM",
  "256 Lạc Long Quân, Quận 5, TP.HCM",
]

const TUITION_BY_LEVEL: Record<string, number> = {
  "A1 · Beginner": 8_400_000,
  "A2 · Elementary": 8_400_000,
  "B1 · Intermediate": 9_600_000,
  "B2 · Upper Intermediate": 10_800_000,
  "C1 · Advanced": 12_000_000,
  "Starter · Pre A1": 6_000_000,
}

const PAID_RATIOS = [1, 0.5, 0.75, 0, 0.25, 1, 0.5, 0, 0.75, 0.25, 1, 0.5]

function tuitionOf(level: string, index: number, startDate: string) {
  const total = TUITION_BY_LEVEL[level] ?? 8_400_000
  const paid = Math.round((total * PAID_RATIOS[index % PAID_RATIOS.length]) / 50_000) * 50_000
  const remaining = total - paid
  const [day, month, year] = startDate.split("/").map(Number)
  // Đợt thứ hai rơi vào giữa khóa, cách ngày bắt đầu khoảng 3 tháng.
  const dueDate = new Date(year, month - 1 + 3, Math.min(day, 28))
  return { total, paid, remaining, dueDate }
}

function tuitionStatusOf(paid: number, total: number, dueDate: Date): TuitionStatus {
  if (paid >= total) return "paid"
  const days = Math.round((dueDate.getTime() - STAFF_TODAY.getTime()) / 86_400_000)
  if (days < 0) return "overdue"
  if (days <= 10) return "due-soon"
  return "partial"
}

const CARE_NOTE_TEMPLATES: { title: string; body: string; tone: CareNote["tone"] }[] = [
  { title: "Phụ huynh hỏi chuyển lớp", body: "Phụ huynh muốn chuyển sang lớp buổi tối do thời gian làm việc thay đổi. Đã ghi nhận, chờ khai giảng kỳ tới.", tone: "warning" },
  { title: "Nhắc học phí đợt 2", body: "Đã gọi nhắc học phí, phụ huynh cam kết chuyển khoản trước thứ Sáu tuần này.", tone: "danger" },
  { title: "Khen tiến bộ", body: "Giáo viên ghi nhận em tiến bộ rõ rệt ở kỹ năng nói. Đã chia sẻ phụ huynh qua tin nhắn.", tone: "success" },
  { title: "Bổ sung hồ sơ CCCD", body: "Hồ sơ còn thiếu ảnh CCCD mặt sau. Đã nhắc phụ huynh gửi qua Zalo.", tone: "info" },
  { title: "Đề xuất học thêm lớp kỹ năng", body: "Em đạt trình độ khá, phụ huynh đồng ý để xét lớp nâng cao khi khóa hiện tại kết thúc.", tone: "info" },
]

function buildNotes(index: number, author: string, startDate: string): CareNote[] {
  if (index % 4 === 3) return []
  const template = CARE_NOTE_TEMPLATES[index % CARE_NOTE_TEMPLATES.length]
  return [
    {
      id: `cn-${index}`,
      date: startDate,
      author,
      title: template.title,
      body: template.body,
      tone: template.tone,
    },
  ]
}

const STATUS_BY_INDEX: StudentStatus[] = ["active", "active", "active", "active", "active", "paused", "active", "finished", "active", "dropped"]

function buildExtraStudents(): StaffStudent[] {
  const list: StaffStudent[] = []
  let index = 0

  for (const cls of CENTER_CLASSES) {
    // 3 lớp đầu đã có học viên trong `data/teacher.ts`, ghép vào đây để không trùng dữ liệu.
    const fromTeacher = TEACHER_STUDENTS.filter((s) => s.classId === cls.id)
    if (fromTeacher.length > 0) {
      for (const seed of fromTeacher) {
        const [guardianName, guardianRelation] = GUARDIAN_NAMES[index % GUARDIAN_NAMES.length]
        const tuition = tuitionOf(cls.level, index, seed.enrolledDate)
        list.push({
          id: seed.id,
          studentCode: seed.studentCode,
          fullName: seed.fullName,
          birthDate: seed.birthDate,
          gender: seed.gender,
          phone: seed.phone,
          email: seed.email,
          address: seed.address,
          identityNo: `0${(index % 9) + 1}${String(100000000 + index * 7717).slice(0, 9)}`,
          occupation: OCCUPATIONS[index % OCCUPATIONS.length],
          status: STATUS_BY_INDEX[index % STATUS_BY_INDEX.length],
          level: cls.level.split(" · ")[0],
          startDate: seed.enrolledDate,
          classId: cls.id,
          staffId: cls.staffId,
          guardian: {
            fullName: guardianName,
            relation: guardianRelation,
            phone: seed.guardianPhone,
            email: `${guardianName.toLowerCase().replace(/ /g, ".")}@gmail.com`,
            occupation: OCCUPATIONS[(index + 3) % OCCUPATIONS.length],
            address: seed.address,
          },
          tuition: { ...tuition, status: tuitionStatusOf(tuition.paid, tuition.total, tuition.dueDate) },
          attendance: {
            rate: seed.attendanceRate,
            absent: Math.max(0, Math.round((100 - seed.attendanceRate) / 7)),
            late: index % 4,
          },
          averageScore: seed.averageScore,
          notes: buildNotes(index, STAFF_PROFILE.fullName, seed.enrolledDate),
          avatar: seed.avatar,
        })
        index += 1
      }
      continue
    }

    if (cls.studentCount === 0) continue

    for (let i = 0; i < cls.studentCount; i += 1) {
      const isMale = index % 2 === 0
      const pool = isMale ? MALE_NAMES : FEMALE_NAMES
      const fullName = pool[index % pool.length]
      const [guardianName, guardianRelation] = GUARDIAN_NAMES[index % GUARDIAN_NAMES.length]
      const tuition = tuitionOf(cls.level, index, cls.startDate)
      const address = STREETS[index % STREETS.length]
      const studentId = `s-${cls.id.toLowerCase()}-${i + 1}`
      list.push({
        id: studentId,
        studentCode: `HV${cls.startDate.slice(6)}-${String(300 + index).padStart(4, "0")}`,
        fullName,
        birthDate: `${String(2 + ((index * 3) % 26)).padStart(2, "0")}/${String(1 + ((index * 5) % 12)).padStart(2, "0")}/${2016 + (index % 4)}`,
        gender: isMale ? "Nam" : "Nữ",
        phone: `09${String(10 + (index % 80)).padStart(2, "0")} ${String(100 + index * 31).padStart(3, "0")} ${String(200 + index * 47).padStart(3, "0")}`,
        email: `${fullName.toLowerCase().replace(/ /g, ".")}@student.edu.vn`,
        address,
        identityNo: `0${(index % 9) + 1}${String(200000000 + index * 6151).slice(0, 9)}`,
        occupation: OCCUPATIONS[index % OCCUPATIONS.length],
        status: STATUS_BY_INDEX[index % STATUS_BY_INDEX.length],
        level: cls.level.split(" · ")[0],
        startDate: cls.startDate,
        classId: cls.id,
        staffId: cls.staffId,
        guardian: {
          fullName: guardianName,
          relation: guardianRelation,
          phone: `09${String(30 + (index % 60)).padStart(2, "0")} ${String(400 + index * 29).padStart(3, "0")} ${String(500 + index * 43).padStart(3, "0")}`,
          email: `${guardianName.toLowerCase().replace(/ /g, ".")}@gmail.com`,
          occupation: OCCUPATIONS[(index + 5) % OCCUPATIONS.length],
          address,
        },
        tuition: { ...tuition, status: tuitionStatusOf(tuition.paid, tuition.total, tuition.dueDate) },
        attendance: {
          rate: [96, 92, 100, 88, 84, 96, 78, 92, 88, 100, 92, 84][index % 12],
          absent: index % 5,
          late: index % 4,
        },
        averageScore: [8.8, 9.1, 8.4, 7.9, 7.2, 8.6, 6.8, 8.2, 7.5, 9.3][index % 10],
        notes: buildNotes(index, STAFF_PROFILE.fullName, cls.startDate),
        avatar: TEACHER_STUDENTS[index % TEACHER_STUDENTS.length].avatar,
      })
      index += 1
    }
  }

  return list
}

export const STAFF_STUDENTS: StaffStudent[] = buildExtraStudents()

export function getStaffStudent(id: string) {
  return STAFF_STUDENTS.find((s) => s.id === id)
}

export function studentsOfCenterClass(classId: string) {
  return STAFF_STUDENTS.filter((s) => s.classId === classId)
}

export function studentsOfStaff(staffId: string) {
  return STAFF_STUDENTS.filter((s) => s.staffId === staffId)
}

export type StudentFilter = { query?: string; status?: StudentStatus | "all"; classId?: string; staffId?: string; tuition?: TuitionStatus | "all" }

export function filterStudents({ query = "", status = "all", classId = "all", staffId = "all", tuition = "all" }: StudentFilter) {
  const needle = query.trim().toLowerCase()
  return STAFF_STUDENTS.filter((student) => {
    if (status !== "all" && student.status !== status) return false
    if (classId !== "all" && student.classId !== classId) return false
    if (staffId !== "all" && student.staffId !== staffId) return false
    if (tuition !== "all" && student.tuition.status !== tuition) return false
    if (!needle) return true
    return (
      student.fullName.toLowerCase().includes(needle) ||
      student.studentCode.toLowerCase().includes(needle) ||
      student.phone.includes(needle) ||
      student.guardian.fullName.toLowerCase().includes(needle) ||
      student.guardian.phone.includes(needle)
    )
  })
}

export function tuitionProgress(student: StaffStudent) {
  return student.tuition.total === 0 ? 0 : Math.round((student.tuition.paid / student.tuition.total) * 100)
}

/** Học viên nợ học phí quá hạn, nặng nhất lên đầu. */
export function overdueStudents() {
  return STAFF_STUDENTS.filter((s) => s.tuition.status === "overdue").sort(
    (a, b) => b.tuition.remaining - a.tuition.remaining,
  )
}

/* ------------------------------------------------------------------ *
 * Học phí
 * ------------------------------------------------------------------ */

export type PaymentMethod = "Tiền mặt" | "Chuyển khoản" | "Thẻ ATM" | "Ví điện tử"

export const PAYMENT_METHOD_META: Record<PaymentMethod, { badge: "neutral" | "info" | "success" | "brand"; short: string }> = {
  "Tiền mặt": { badge: "neutral", short: "TM" },
  "Chuyển khoản": { badge: "info", short: "CK" },
  "Thẻ ATM": { badge: "success", short: "ATM" },
  "Ví điện tử": { badge: "brand", short: "Ví" },
}

export type CenterPayment = {
  id: string
  studentId: string
  /** dd/MM/yyyy */
  date: string
  amount: number
  method: PaymentMethod
  receiptNo: string
  note: string
  collectorId: string
  /** Khoản phải thu mà khoản này thanh toán. */
  forInvoice: string
}

export const CENTER_PAYMENTS: CenterPayment[] = [
  { id: "p1", studentId: "s-a2t01-1", date: "02/10/2026", amount: 2_100_000, method: "Chuyển khoản", receiptNo: "PT-2610-0001", note: "Đợt 2 khóa A2 Buổi Tối 01", collectorId: "NV0007", forInvoice: "HP-A2T01-2026-02" },
  { id: "p2", studentId: "s-a2t01-3", date: "02/10/2026", amount: 4_200_000, method: "Thẻ ATM", receiptNo: "PT-2610-0002", note: "Đóng đủ học phí quý", collectorId: "NV0004", forInvoice: "HP-A2T01-2026-02" },
  { id: "p3", studentId: "s-b1t02-2", date: "02/10/2026", amount: 2_400_000, method: "Tiền mặt", receiptNo: "PT-2610-0003", note: "Thu tại quầy tiếp nhận", collectorId: "NV0007", forInvoice: "HP-B1T02-2026-02" },
  { id: "p4", studentId: "s-b2e02-1", date: "02/10/2026", amount: 2_700_000, method: "Ví điện tử", receiptNo: "PT-2610-0004", note: "Ví MoMo", collectorId: "NV0002", forInvoice: "HP-B2E02-2026-02" },
  { id: "p5", studentId: "s-y3sat-2", date: "02/10/2026", amount: 1_500_000, method: "Tiền mặt", receiptNo: "PT-2610-0005", note: "Học phí tháng 10", collectorId: "NV0007", forInvoice: "HP-Y3SAT-2026-10" },
  { id: "p6", studentId: "s-c1t01-1", date: "29/09/2026", amount: 3_000_000, method: "Chuyển khoản", receiptNo: "PT-2609-0018", note: "Đợt 2", collectorId: "NV0005", forInvoice: "HP-C1T01-2026-02" },
  { id: "p7", studentId: "s-a1e03-4", date: "28/09/2026", amount: 2_100_000, method: "Thẻ ATM", receiptNo: "PT-2609-0016", note: "Đợt 2", collectorId: "NV0004", forInvoice: "HP-A1E03-2026-02" },
  { id: "p8", studentId: "s-y5sun-3", date: "26/09/2026", amount: 1_500_000, method: "Ví điện tử", receiptNo: "PT-2609-0012", note: "Tháng 9", collectorId: "NV0003", forInvoice: "HP-Y5SUN-2026-09" },
]

export const TODAY_DATE_LABEL = "02/10/2026"

export function paymentsOfStudent(studentId: string) {
  return CENTER_PAYMENTS.filter((p) => p.studentId === studentId)
}

export function paymentsToday() {
  return CENTER_PAYMENTS.filter((p) => p.date === TODAY_DATE_LABEL)
}

export function collectedToday() {
  return paymentsToday().reduce((sum, p) => sum + p.amount, 0)
}

let receiptSeq = CENTER_PAYMENTS.length

/** Sinh mã phiếu thu mới, ví dụ `PT-2610-0009`. */
export function nextReceiptNo() {
  receiptSeq += 1
  return `PT-2610-${String(receiptSeq).padStart(4, "0")}`
}

/* ------------------------------------------------------------------ *
 * Việc cần làm hôm nay
 * ------------------------------------------------------------------ */

export type StaffTaskType = "call" | "follow-up" | "payment" | "meeting" | "other"

export const TASK_TYPE_META: Record<StaffTaskType, { label: string; tone: "info" | "warning" | "danger" | "success" | "neutral" }> = {
  call: { label: "Gọi khách", tone: "info" },
  "follow-up": { label: "Chăm sóc HV", tone: "success" },
  payment: { label: "Thu học phí", tone: "warning" },
  meeting: { label: "Họp", tone: "neutral" },
  other: { label: "Khác", tone: "neutral" },
}

export type StaffTask = {
  id: string
  title: string
  detail: string
  time: string
  type: StaffTaskType
  done: boolean
}

export const TODAY_TASKS: StaffTask[] = [
  { id: "t1", title: "Gọi 5 khách mới từ fanpage", detail: "Danh sách khách tiềm năng mới nhất", time: "08:30", type: "call", done: true },
  { id: "t2", title: "Nhắc học phí đợt 2 – lớp A2 Buổi Tối 01", detail: "9 học viên chưa đóng đủ", time: "09:30", type: "payment", done: false },
  { id: "t3", title: "Họp giao bài giảng cho giáo viên mới", detail: "Phòng 204 · 30 phút", time: "11:00", type: "meeting", done: false },
  { id: "t4", title: "Xác nhận lịch học thử của phụ huynh Châu", detail: "Chưa có yêu cầu chuyển lớp", time: "14:00", type: "follow-up", done: false },
  { id: "t5", title: "Hoàn thiện hồ sơ 3 học viên mới", detail: "Thiếu CCCD và ảnh thẻ", time: "15:30", type: "other", done: false },
  { id: "t6", title: "Gọi phụ huynh xác nhận lịch học bù", detail: "Lớp B2 Buổi Tối 02 · thứ Bảy", time: "17:00", type: "follow-up", done: false },
]

/* ------------------------------------------------------------------ *
 * Khách tiềm năng (kanban tư vấn)
 * ------------------------------------------------------------------ */

export type LeadStage = "new" | "called" | "trial" | "won" | "lost"

export const LEAD_STAGES: LeadStage[] = ["new", "called", "trial", "won", "lost"]

export const LEAD_STAGE_META: Record<LeadStage, { label: string; badge: "info" | "warning" | "brand" | "success" | "danger"; dot: string; hint: string }> = {
  new: { label: "Mới", badge: "info", dot: "bg-sky-accent", hint: "Khách vừa để lại thông tin" },
  called: { label: "Đã gọi", badge: "warning", dot: "bg-warning", hint: "Đã liên hệ lần đầu" },
  trial: { label: "Hẹn học thử", badge: "brand", dot: "bg-brand", hint: "Đã xác nhận thời gian học thử" },
  won: { label: "Đã chốt", badge: "success", dot: "bg-success", hint: "Đã ghi danh thành công" },
  lost: { label: "Không chốt", badge: "danger", dot: "bg-danger", hint: "Không phù hợp về thời gian hoặc ngân sách" },
}

export type LeadSource = "Facebook" | "Website" | "Zalo" | "Giới thiệu" | "Khách vãng lai"

export const LEAD_SOURCE_META: Record<LeadSource, { badge: "brand" | "info" | "success" | "neutral" | "warning" }> = {
  Facebook: { badge: "info" },
  Website: { badge: "neutral" },
  Zalo: { badge: "success" },
  "Giới thiệu": { badge: "brand" },
  "Khách vãng lai": { badge: "warning" },
}

export type LeadNote = {
  id: string
  date: string
  author: string
  body: string
  result: "connected" | "no-answer" | "busy" | "callback"
}

export const LEAD_NOTE_RESULT_META: Record<LeadNote["result"], { label: string; tone: "success" | "warning" | "danger" | "info" }> = {
  connected: { label: "Nghe máy", tone: "success" },
  "no-answer": { label: "Không nghe máy", tone: "danger" },
  busy: { label: "Đang bận", tone: "warning" },
  callback: { label: "Hẹn gọi lại", tone: "info" },
}

export type Lead = {
  id: string
  fullName: string
  phone: string
  email: string
  age: number
  source: LeadSource
  interestedClassId: string
  ownerId: string
  createdAt: Date
  expectedFee: number
  stage: LeadStage
  nextFollowUp?: Date
  notes: LeadNote[]
}

export const STAFF_LEADS: Lead[] = [
  {
    id: "ld1", fullName: "Chị Nguyễn Thị Mai Anh", phone: "0912 774 118", email: "maianh.nguyen@gmail.com", age: 34,
    source: "Facebook", interestedClassId: "A2T01", ownerId: "NV0007", createdAt: new Date(2026, 9, 2), expectedFee: 8_400_000, stage: "new",
    notes: [],
  },
  {
    id: "ld2", fullName: "Anh Trương Gia Bảo", phone: "0938 220 501", email: "giabao.truong@gmail.com", age: 41,
    source: "Website", interestedClassId: "B1T02", ownerId: "NV0007", createdAt: new Date(2026, 9, 1), expectedFee: 9_600_000, stage: "new",
    notes: [],
  },
  {
    id: "ld3", fullName: "Chị Lê Thị Bảo Trâm", phone: "0975 118 663", email: "baotram.le@gmail.com", age: 29,
    source: "Zalo", interestedClassId: "Y5SUN", ownerId: "NV0003", createdAt: new Date(2026, 8, 29), expectedFee: 6_000_000, stage: "new",
    notes: [],
  },
  {
    id: "ld4", fullName: "Chị Hoàng Thị Thu Hà", phone: "0907 663 224", email: "thuha.hoang@gmail.com", age: 38,
    source: "Facebook", interestedClassId: "C1T01", ownerId: "NV0005", createdAt: new Date(2026, 8, 27), expectedFee: 12_000_000, stage: "called",
    notes: [
      { id: "ln1", date: "28/09/2026", author: "Vũ Khánh Chi", body: "Khách cần lớp cho người lớn, buổi tối thứ Tư & thứ Bảy. Đã gửi bảng giá.", result: "connected" },
      { id: "ln2", date: "30/09/2026", author: "Vũ Khánh Chi", body: "Chưa quyết định, hẹn gọi lại sau khi hỏi ý kiến chồng.", result: "callback" },
    ],
    nextFollowUp: new Date(2026, 9, 4),
  },
  {
    id: "ld5", fullName: "Anh Phạm Quốc Bình", phone: "0988 442 019", email: "quocbinh.pham@gmail.com", age: 45,
    source: "Giới thiệu", interestedClassId: "B2E02", ownerId: "NV0007", createdAt: new Date(2026, 8, 24), expectedFee: 10_800_000, stage: "called",
    notes: [{ id: "ln3", date: "25/09/2026", author: "Trần Thị Hồng Nhung", body: "Đã gọi, khách đang học kèm con nhỏ nên ưu tiên lớp tối. Sẽ gửi lịch khai giảng.", result: "connected" }],
    nextFollowUp: new Date(2026, 9, 3),
  },
  {
    id: "ld6", fullName: "Chị Vũ Thị Hạnh Nhung", phone: "0901 556 883", email: "hanhnung.vu@gmail.com", age: 33,
    source: "Facebook", interestedClassId: "A1E03", ownerId: "NV0004", createdAt: new Date(2026, 8, 20), expectedFee: 8_400_000, stage: "called",
    notes: [{ id: "ln4", date: "21/09/2026", author: "Đỗ Anh Tuấn", body: "Khách chưa chắc chắn về lịch cuối tuần, cần xem lại.", result: "no-answer" }],
  },
  {
    id: "ld7", fullName: "Chị Đỗ Thị Lan Anh", phone: "0966 220 774", email: "lananh.do@gmail.com", age: 31,
    source: "Zalo", interestedClassId: "Y3SAT", ownerId: "NV0007", createdAt: new Date(2026, 8, 15), expectedFee: 6_000_000, stage: "trial",
    notes: [
      { id: "ln5", date: "16/09/2026", author: "Trần Thị Hồng Nhung", body: "Đã đăng ký học thử 2 buổi, hẹn 09:00 Chủ Nhật.", result: "connected" },
    ],
    nextFollowUp: new Date(2026, 9, 4),
  },
  {
    id: "ld8", fullName: "Anh Ngô Minh Khôi", phone: "0898 331 550", email: "minhkhoi.ngo@gmail.com", age: 26,
    source: "Website", interestedClassId: "B1T02", ownerId: "NV0003", createdAt: new Date(2026, 8, 12), expectedFee: 9_600_000, stage: "trial",
    notes: [{ id: "ln6", date: "13/09/2026", author: "Phạm Thùy Linh", body: "Đã học thử buổi tối, phản hồi tích cực, hỏi thông tin kỳ thi.", result: "connected" }],
    nextFollowUp: new Date(2026, 9, 3),
  },
  {
    id: "ld9", fullName: "Chị Bùi Thị Hồng Vân", phone: "0932 118 990", email: "hongvan.bui@gmail.com", age: 36,
    source: "Giới thiệu", interestedClassId: "A2T01", ownerId: "NV0007", createdAt: new Date(2026, 7, 28), expectedFee: 8_400_000, stage: "won",
    notes: [
      { id: "ln7", date: "01/09/2026", author: "Trần Thị Hồng Nhung", body: "Đã ghi danh đợt 1 khóa A2 Buổi Tối 01.", result: "connected" },
    ],
  },
  {
    id: "ld10", fullName: "Anh Phan Đức Thành", phone: "0917 447 662", email: "ducthanh.phan@gmail.com", age: 39,
    source: "Facebook", interestedClassId: "C1T01", ownerId: "NV0005", createdAt: new Date(2026, 7, 25), expectedFee: 12_000_000, stage: "won",
    notes: [{ id: "ln8", date: "05/09/2026", author: "Vũ Khánh Chi", body: "Chốt lớp C1 Buổi Tối 01, đã thu học phí đợt 1.", result: "connected" }],
  },
  {
    id: "ld11", fullName: "Chị Lý Thị Mỹ Duyên", phone: "0868 774 019", email: "mduyen.ly@gmail.com", age: 42,
    source: "Facebook", interestedClassId: "Y5SUN", ownerId: "NV0003", createdAt: new Date(2026, 8, 5), expectedFee: 6_000_000, stage: "lost",
    notes: [{ id: "ln9", date: "08/09/2026", author: "Phạm Thùy Linh", body: "Khách chọn lớp online của trung tâm khác vì không phù hợp lịch.", result: "connected" }],
  },
  {
    id: "ld12", fullName: "Anh Võ Hữu Tài", phone: "0935 220 883", email: "hutai.vo@gmail.com", age: 30,
    source: "Khách vãng lai", interestedClassId: "B2E02", ownerId: "NV0002", createdAt: new Date(2026, 7, 30), expectedFee: 10_800_000, stage: "lost",
    notes: [{ id: "ln10", date: "02/09/2026", author: "Lê Quốc Bảo", body: "Ngân sách chưa phù hợp, khách trả góp không khả thi.", result: "connected" }],
  },
]

export function leadsOfStaff(staffId: string) {
  return STAFF_LEADS.filter((lead) => lead.ownerId === staffId)
}

export function newLeads() {
  return STAFF_LEADS.filter((lead) => lead.stage === "new")
}

export function leadConversionRate() {
  const closed = STAFF_LEADS.filter((lead) => lead.stage === "won" || lead.stage === "lost")
  if (closed.length === 0) return 0
  return Math.round((STAFF_LEADS.filter((l) => l.stage === "won").length / closed.length) * 100)
}

/* ------------------------------------------------------------------ *
 * Sự kiện toàn trung tâm (quản lý bởi nhân viên)
 * ------------------------------------------------------------------ */

export type CenterEventType = "lesson" | "exam" | "holiday" | "event" | "training"

export const CENTER_EVENT_META: Record<CenterEventType, { label: string; badge: "brand" | "info" | "success" | "warning" | "danger"; dot: string; chip: string }> = {
  lesson: { label: "Buổi học", badge: "brand", dot: "bg-brand", chip: "bg-brand-soft text-amber-800" },
  exam: { label: "Kỳ thi", badge: "danger", dot: "bg-danger", chip: "bg-red-100 text-danger" },
  holiday: { label: "Nghỉ lễ", badge: "success", dot: "bg-success", chip: "bg-green-100 text-success" },
  event: { label: "Sự kiện", badge: "info", dot: "bg-sky-accent", chip: "bg-sky-100 text-sky-700" },
  training: { label: "Đào tạo", badge: "warning", dot: "bg-warning", chip: "bg-orange-100 text-warning" },
}

export type CenterEventScope = "all" | "teachers" | "staff" | "classes"

export const CENTER_EVENT_SCOPE_META: Record<CenterEventScope, { label: string; description: string }> = {
  all: { label: "Toàn trung tâm", description: "Tất cả học viên, giáo viên và nhân viên đều thấy" },
  teachers: { label: "Chỉ giáo viên", description: "Thông báo nội bộ cho đội ngũ giáo viên" },
  staff: { label: "Chỉ nhân viên", description: "Nội bộ phòng tư vấn – hành chính" },
  classes: { label: "Theo lớp", description: "Chỉ học viên của các lớp được chọn" },
}

export type CenterEvent = {
  id: string
  type: CenterEventType
  title: string
  date: Date
  startTime: string
  endTime: string
  location: string
  scope: CenterEventScope
  classIds: string[]
  description: string
  createdBy: string
}

export const STAFF_EVENTS: CenterEvent[] = [
  { id: "ev1", type: "event", title: "Khai giảng khóa học mùa Thu 2026", date: new Date(2026, 9, 5), startTime: "17:00", endTime: "18:30", location: "Hành lang tầng 1", scope: "all", classIds: [], description: "Buổi lễ khai giảng có quà tặng cho học viên đăng ký sớm.", createdBy: STAFF_PROFILE.fullName },
  { id: "ev2", type: "exam", title: "Kỳ thi Cambridge YLE Movers", date: new Date(2026, 9, 11), startTime: "08:30", endTime: "11:00", location: "Phòng 401", scope: "classes", classIds: ["Y3SAT", "Y5SUN"], description: "Học viên lớp thi cần có mặt 30 phút trước giờ thi, mang theo giấy tờ tùy thân.", createdBy: STAFF_PROFILE.fullName },
  { id: "ev3", type: "training", title: "Đào tạo bài giảng cho giáo viên mới", date: new Date(2026, 9, 2), startTime: "11:00", endTime: "12:00", location: "Phòng 204", scope: "teachers", classIds: [], description: "Họp nội bộ, thống nhất cách tổ chức lớp và bài kiểm tra giữa kỳ.", createdBy: "Lê Quốc Bảo" },
  { id: "ev4", type: "holiday", title: "Nghỉ lễ Quốc khánh", date: new Date(2026, 8, 1), startTime: "", endTime: "", location: "Toàn trung tâm", scope: "all", classIds: [], description: "Trung tâm nghỉ, các lớp dời sang buổi bù.", createdBy: "Lê Quốc Bảo" },
  { id: "ev5", type: "event", title: "English Day 2026", date: new Date(2026, 9, 25), startTime: "09:00", endTime: "16:00", location: "Sân trường", scope: "all", classIds: [], description: "Ngày hội tiếng Anh với sân khấu học thuật, gian hàng sách và quầy tư vấn.", createdBy: STAFF_PROFILE.fullName },
  { id: "ev6", type: "exam", title: "Kiểm tra giữa khóa B1 Buổi Tối 02", date: new Date(2026, 9, 18), startTime: "19:00", endTime: "20:30", location: "Phòng 301", scope: "classes", classIds: ["B1T02"], description: "Bài kiểm tra 4 kỹ năng, thời lượng 90 phút.", createdBy: STAFF_PROFILE.fullName },
  { id: "ev7", type: "training", title: "Họp tổng kết quả tư vấn tháng 9", date: new Date(2026, 9, 1), startTime: "16:30", endTime: "17:30", location: "Phòng họp 2", scope: "staff", classIds: [], description: "Rà soát tỷ lệ chuyển đổi và danh sách học phí quá hạn.", createdBy: "Lê Quốc Bảo" },
  { id: "ev8", type: "lesson", title: "Buổi học bù cho lớp B2 Buổi Tối 02", date: new Date(2026, 9, 10), startTime: "09:00", endTime: "10:30", location: "Phòng 302", scope: "classes", classIds: ["B2E02"], description: "Buổi bù cho các buổi nghỉ lễ, học viên không phải học thêm phí.", createdBy: STAFF_PROFILE.fullName },
]

export function eventAudienceText(event: CenterEvent) {
  if (event.scope === "classes") {
    return event.classIds.map((id) => classNameOf(id)).join(", ") || "Chưa chọn lớp"
  }
  return CENTER_EVENT_SCOPE_META[event.scope].label
}

export function eventsVisibleTo(scope: "student" | "teacher" | "staff", event: CenterEvent) {
  if (event.scope === "all") return true
  if (event.scope === "teachers") return scope === "teacher"
  if (event.scope === "staff") return scope === "staff"
  return true
}

/* ------------------------------------------------------------------ *
 * Bảng lương nhân viên (chỉ xem)
 * ------------------------------------------------------------------ */

export type StaffPayrollStatus = "draft" | "pending" | "approved"

export const STAFF_PAYROLL_STATUS_META: Record<StaffPayrollStatus, { label: string; badge: "neutral" | "warning" | "success"; description: string }> = {
  draft: { label: "Đang tính", badge: "neutral", description: "Chưa chốt số liệu, nhân viên chưa được xem." },
  pending: { label: "Chờ duyệt", badge: "warning", description: "Đang chờ phòng Kế toán duyệt." },
  approved: { label: "Đã chốt", badge: "success", description: "Bảng lương đã được duyệt và chốt." },
}

export type StaffPayrollRow = {
  id: string
  month: string
  key: string
  status: StaffPayrollStatus
  baseSalary: number
  items: { label: string; amount: number; hint?: string }[]
}

export const STAFF_PAYROLL: StaffPayrollRow[] = [
  {
    id: "sp1", month: "Tháng 9/2026", key: "2026-09", status: "approved", baseSalary: 9_000_000,
    items: [
      { label: "Hoa hồng ghi danh", amount: 2_240_000, hint: "4 hợp đồng A2" },
      { label: "Phụ cấp điện thoại", amount: 300_000 },
      { label: "Thưởng chuyển đổi cao", amount: 500_000, hint: "Tỷ lệ 38%" },
    ],
  },
  {
    id: "sp2", month: "Tháng 8/2026", key: "2026-08", status: "approved", baseSalary: 9_000_000,
    items: [
      { label: "Hoa hồng ghi danh", amount: 1_680_000, hint: "3 hợp đồng B1" },
      { label: "Phụ cấp điện thoại", amount: 300_000 },
      { label: "Thưởng chuyển đổi cao", amount: 350_000, hint: "Tỷ lệ 32%" },
    ],
  },
  {
    id: "sp3", month: "Tháng 7/2026", key: "2026-07", status: "approved", baseSalary: 9_000_000,
    items: [
      { label: "Hoa hồng ghi danh", amount: 2_800_000, hint: "5 hợp đồng trẻ em" },
      { label: "Phụ cấp điện thoại", amount: 300_000 },
      { label: "Thưởng English Day", amount: 300_000 },
    ],
  },
  {
    id: "sp4", month: "Tháng 6/2026", key: "2026-06", status: "approved", baseSalary: 9_000_000,
    items: [
      { label: "Hoa hồng ghi danh", amount: 1_120_000, hint: "2 hợp đồng C1" },
      { label: "Phụ cấp điện thoại", amount: 300_000 },
    ],
  },
  {
    id: "sp5", month: "Tháng 10/2026", key: "2026-10", status: "pending", baseSalary: 9_000_000,
    items: [
      { label: "Hoa hồng ghi danh", amount: 1_960_000, hint: "Chưa chốt số hợp đồng cuối tháng" },
      { label: "Phụ cấp điện thoại", amount: 300_000 },
    ],
  },
  {
    id: "sp6", month: "Tháng 11/2026", key: "2026-11", status: "draft", baseSalary: 9_000_000, items: [],
  },
]

export function staffPayrollTotal(row: StaffPayrollRow) {
  return row.baseSalary + row.items.reduce((sum, item) => sum + item.amount, 0)
}

/** Nhân viên chỉ được xem các kỳ đã chốt. */
export function approvedPayroll() {
  return STAFF_PAYROLL.filter((row) => row.status === "approved")
}

/* ------------------------------------------------------------------ *
 * Tiện ích dùng chung
 * ------------------------------------------------------------------ */

/** Lịch buổi học thật của lớp (chỉ 3 lớp giáo viên mẫu có sẵn dữ liệu điểm danh). */
export function lessonsOfStudent(student: StaffStudent): ClassLesson[] {
  return lessonsOfClass(student.classId)
}

export function markCountsOfStudent(student: StaffStudent) {
  const result: Record<MarkStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 }
  for (const lesson of lessonsOfStudent(student)) {
    const status = lesson.marks[student.id]
    if (status) result[status] += 1
  }
  return result
}
