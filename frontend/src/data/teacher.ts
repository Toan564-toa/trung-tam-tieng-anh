import { unsplash } from "@/lib/images"

/** Ngày "hôm nay" cố định của bản demo, dùng chung cho toàn bộ khu vực giáo viên. */
export const TODAY = new Date(2026, 9, 2) // Thứ Sáu, 02/10/2026

/* ------------------------------------------------------------------ *
 * Giáo viên đang đăng nhập
 * ------------------------------------------------------------------ */

export type TeacherProfile = {
  id: string
  fullName: string
  email: string
  phone: string
  specialty: string
  certificate: string
  experience: string
  startDate: string
  education: string
  bio: string
  avatar: string
}

export const TEACHER_PROFILE: TeacherProfile = {
  id: "GV0012",
  fullName: "Nguyễn Minh Anh",
  email: "minhanh.nguyen@trungtam.edu.vn",
  phone: "0908 224 118",
  specialty: "Tiếng Anh thiếu nhi & A2",
  certificate: "IELTS 8.0 · TESOL",
  experience: "8 năm",
  startDate: "15/09/2021",
  education: "Thạc sĩ Ngôn ngữ học ứng dụng – ĐH Sư phạm TP.HCM",
  bio: "8 năm giảng dạy tiếng Anh cho học sinh THCS và thiếu nhi. Chuyên phương pháp giao tiếp tự nhiên, đồng thời là huấn luyện viên phòng thi Cambridge YLE của trung tâm.",
  avatar: unsplash("photo-1573496359142-b8d87734a5a2", 300),
}

/* ------------------------------------------------------------------ *
 * Lớp học
 * ------------------------------------------------------------------ */

export type ClassStatus = "active" | "finishing" | "closed"

export type TeacherClass = {
  id: string
  name: string
  code: string
  course: string
  level: string
  room: string
  /** 0 = Chủ Nhật ... 6 = Thứ Bảy */
  weekdays: number[]
  time: string
  studentCount: number
  maxStudents: number
  totalLessons: number
  doneLessons: number
  startDate: string
  endDate: string
  status: ClassStatus
  tone: "brand" | "info" | "success"
}

export const CLASSES: TeacherClass[] = [
  {
    id: "A2T01",
    name: "A2 Buổi Tối 01",
    code: "A2T01",
    course: "Tiếng Anh Tiền Trung Cấp",
    level: "A2 · Elementary",
    room: "Phòng 204",
    weekdays: [1, 4],
    time: "19:00 – 20:30",
    studentCount: 18,
    maxStudents: 20,
    totalLessons: 64,
    doneLessons: 24,
    startDate: "06/07/2026",
    endDate: "24/02/2027",
    status: "active",
    tone: "brand",
  },
  {
    id: "B1T02",
    name: "B1 Buổi Tối 02",
    code: "B1T02",
    course: "Tiếng Anh Trung Cấp",
    level: "B1 · Intermediate",
    room: "Phòng 301",
    weekdays: [2, 5],
    time: "19:45 – 21:15",
    studentCount: 14,
    maxStudents: 16,
    totalLessons: 64,
    doneLessons: 31,
    startDate: "11/05/2026",
    endDate: "17/12/2026",
    status: "active",
    tone: "info",
  },
  {
    id: "Y3SAT",
    name: "Thiếu nhi Y3 Sabato",
    code: "Y3SAT",
    course: "Tiếng Anh Khởi Đầu",
    level: "Starter · Pre A1",
    room: "Phòng 102",
    weekdays: [6, 0],
    time: "08:00 – 09:30",
    studentCount: 12,
    maxStudents: 12,
    totalLessons: 64,
    doneLessons: 52,
    startDate: "13/09/2025",
    endDate: "18/07/2026",
    status: "finishing",
    tone: "success",
  },
]

export const CLASS_META: Record<ClassStatus, { label: string; badge: "success" | "warning" | "neutral" }> = {
  active: { label: "Đang dạy", badge: "success" },
  finishing: { label: "Sắp hoàn thành", badge: "warning" },
  closed: { label: "Đã kết thúc", badge: "neutral" },
}

/** Màu badge và màu thanh tiến độ không giống nhau, nên ánh xạ riêng. */
export const CLASS_PROGRESS_TONE: Record<TeacherClass["tone"], "brand" | "sky" | "success"> = {
  brand: "brand",
  info: "sky",
  success: "success",
}

export function getClass(id: string) {
  return CLASSES.find((c) => c.id === id)
}

/* ------------------------------------------------------------------ *
 * Học viên trong các lớp của giáo viên
 * ------------------------------------------------------------------ */

export type TeacherStudent = {
  id: string
  classId: string
  studentCode: string
  fullName: string
  birthDate: string
  gender: "Nam" | "Nữ"
  phone: string
  email: string
  address: string
  guardianName: string
  guardianRelation: string
  guardianPhone: string
  enrolledDate: string
  attendanceRate: number
  averageScore: number
  avatar: string
}

type StudentSeed = Omit<TeacherStudent, "classId" | "attendanceRate" | "averageScore" | "enrolledDate" | "avatar">

const AVATARS = [
  unsplash("photo-1507003211169-0a1dd7228f2d", 120),
  unsplash("photo-1494790108377-be9c29b29330", 120),
  unsplash("photo-1500648767791-00dcc994a43e", 120),
  unsplash("photo-1531123897727-8f129e1688ce", 120),
  unsplash("photo-1438761681033-6461ffad8d80", 120),
  unsplash("photo-1506794778202-cad84cf45f1d", 120),
  unsplash("photo-1544005313-94ddf0286df2", 120),
  unsplash("photo-1547425260-76bcadfb4f2c", 120),
  unsplash("photo-1535713875002-d1d0cf377fde", 120),
  unsplash("photo-1580489944761-15a19d654956", 120),
  unsplash("photo-1502685104226-ee32379fefbe", 120),
  unsplash("photo-1517841905240-472988babdf9", 120),
  unsplash("photo-1487412720507-e7ab37603c6f", 120),
  unsplash("photo-1542206395-9feb3edaa68d", 120),
  unsplash("photo-1524504388940-b1c1722653e1", 120),
  unsplash("photo-1519085360753-af0119f7cbe7", 120),
  unsplash("photo-1508214751196-bcfd4ca60f91", 120),
  unsplash("photo-1472099645785-5658abf4ff4e", 120),
]

const A2_STUDENTS: StudentSeed[] = [
  { id: "s-a2-1", studentCode: "HV2026-0147", fullName: "Nguyễn Gia Huy", birthDate: "14/05/2009", gender: "Nam", phone: "0909 123 456", email: "hocvien@trungtam.edu.vn", address: "145/12 Nguyễn Văn Linh, Quận 7, TP.HCM", guardianName: "Nguyễn Văn Hùng", guardianRelation: "Bố", guardianPhone: "0912 345 678" },
  { id: "s-a2-2", studentCode: "HV2026-0148", fullName: "Trần Thị Bảo Ngọc", birthDate: "02/09/2009", gender: "Nữ", phone: "0909 223 457", email: "baongoc.tran@student.edu.vn", address: "22 Lê Văn Viện, Quận 7, TP.HCM", guardianName: "Trần Quốc Tuấn", guardianRelation: "Bố", guardianPhone: "0938 111 222" },
  { id: "s-a2-3", studentCode: "HV2026-0151", fullName: "Lê Hoàng Nam", birthDate: "27/11/2009", gender: "Nam", phone: "0907 884 210", email: "hoangnam.le@student.edu.vn", address: "90 Nguyễn Thị Thập, Quận 7, TP.HCM", guardianName: "Lê Thị Hồng Nhung", guardianRelation: "Mẹ", guardianPhone: "0913 556 677" },
  { id: "s-a2-4", studentCode: "HV2026-0155", fullName: "Phạm Thuỳ Linh", birthDate: "18/01/2010", gender: "Nữ", phone: "0905 667 889", email: "thuylinh.pham@student.edu.vn", address: "310 Phạm Ngọc Thạch, Quận 7, TP.HCM", guardianName: "Phạm Quốc Bảo", guardianRelation: "Bố", guardianPhone: "0901 334 455" },
  { id: "s-a2-5", studentCode: "HV2026-0159", fullName: "Đỗ Đức Thành", birthDate: "05/04/2009", gender: "Nam", phone: "0918 220 334", email: "ducthanh.do@student.edu.vn", address: "17 Lê Đức Thọ, Quận 7, TP.HCM", guardianName: "Đỗ Hữu Phước", guardianRelation: "Bố", guardianPhone: "0922 776 554" },
  { id: "s-a2-6", studentCode: "HV2026-0163", fullName: "Hoàng Mai Anh", birthDate: "23/07/2010", gender: "Nữ", phone: "0936 445 566", email: "maianh.hoang@student.edu.vn", address: "58 Nguyễn Văn Cừ, Quận 5, TP.HCM", guardianName: "Hoàng Minh Đức", guardianRelation: "Bố", guardianPhone: "0933 889 900" },
  { id: "s-a2-7", studentCode: "HV2026-0167", fullName: "Vũ Ngọc Sơn", birthDate: "11/12/2009", gender: "Nam", phone: "0978 112 233", email: "ngocson.vu@student.edu.vn", address: "12B Nguyễn Khoái, Quận 1, TP.HCM", guardianName: "Vũ Thị Lan", guardianRelation: "Mẹ", guardianPhone: "0944 556 677" },
  { id: "s-a2-8", studentCode: "HV2026-0171", fullName: "Ngô Thanh Hà", birthDate: "30/06/2009", gender: "Nữ", phone: "0906 334 455", email: "thanhha.ngo@student.edu.vn", address: "203 Lê Văn Sỹ, Quận 3, TP.HCM", guardianName: "Ngô Thanh Sơn", guardianRelation: "Bố", guardianPhone: "0955 667 788" },
  { id: "s-a2-9", studentCode: "HV2026-0175", fullName: "Trịnh Quốc Việt", birthDate: "16/09/2010", gender: "Nam", phone: "0912 998 877", email: "quocviet.trinh@student.edu.vn", address: "45 Nguyễn Đình Chiểu, Quận 3, TP.HCM", guardianName: "Trịnh Quốc Hùng", guardianRelation: "Bố", guardianPhone: "0966 778 899" },
  { id: "s-a2-10", studentCode: "HV2026-0179", fullName: "Lý Bảo Châu", birthDate: "08/03/2010", gender: "Nữ", phone: "0925 667 788", email: "baochau.ly@student.edu.vn", address: "77 Nguyễn Khoái, Quận 1, TP.HCM", guardianName: "Lý Thanh Hà", guardianRelation: "Mẹ", guardianPhone: "0977 889 900" },
  { id: "s-a2-11", studentCode: "HV2026-0183", fullName: "Phan Anh Khoa", birthDate: "21/02/2009", gender: "Nam", phone: "0939 445 566", email: "anhkhoa.phan@student.edu.vn", address: "9 Nguyễn Thị Minh Khai, Quận 3, TP.HCM", guardianName: "Phan Quốc Bình", guardianRelation: "Bố", guardianPhone: "0988 112 233" },
  { id: "s-a2-12", studentCode: "HV2026-0187", fullName: "Đặng Khánh Vy", birthDate: "19/08/2010", gender: "Nữ", phone: "0914 223 344", email: "khanhvy.dang@student.edu.vn", address: "120 Pasteur, Quận 3, TP.HCM", guardianName: "Đặng Minh Khoa", guardianRelation: "Bố", guardianPhone: "0913 334 455" },
  { id: "s-a2-13", studentCode: "HV2026-0191", fullName: "Bùi Trọng Nghĩa", birthDate: "03/10/2009", gender: "Nam", phone: "0947 556 677", email: "trongnghia.bui@student.edu.vn", address: "18 Trần Bình Trọng, Quận 5, TP.HCM", guardianName: "Bùi Thị Thu Hà", guardianRelation: "Mẹ", guardianPhone: "0955 778 899" },
  { id: "s-a2-14", studentCode: "HV2026-0195", fullName: "Mai Phương Anh", birthDate: "26/05/2010", gender: "Nữ", phone: "0908 667 788", email: "phuonganh.mai@student.edu.vn", address: "155 Ba Thanh Thuan, Quận 1, TP.HCM", guardianName: "Mai Đức Hùng", guardianRelation: "Bố", guardianPhone: "0966 889 900" },
  { id: "s-a2-15", studentCode: "HV2026-0199", fullName: "Trương Đức Thắng", birthDate: "12/01/2009", gender: "Nam", phone: "0923 334 455", email: "ducthang.truong@student.edu.vn", address: "66 Lê Thánh Tôn, Quận 1, TP.HCM", guardianName: "Trương Văn Kiên", guardianRelation: "Bố", guardianPhone: "0977 112 233" },
  { id: "s-a2-16", studentCode: "HV2026-0203", fullName: "Cao Khánh Linh", birthDate: "07/07/2010", gender: "Nữ", phone: "0935 223 344", email: "khanhlinh.cao@student.edu.vn", address: "300 Hai Bà Trưng, Quận 5, TP.HCM", guardianName: "Cao Thị Bích Ngọc", guardianRelation: "Mẹ", guardianPhone: "0988 334 455" },
  { id: "s-a2-17", studentCode: "HV2026-0207", fullName: "Nguyễn Hữu Tín", birthDate: "29/04/2010", gender: "Nam", phone: "0916 445 566", email: "huutin.nguyen@student.edu.vn", address: "241 Cách Mạng Tháng 8, Quận 10, TP.HCM", guardianName: "Nguyễn Hữu Công", guardianRelation: "Bố", guardianPhone: "0911 556 677" },
  { id: "s-a2-18", studentCode: "HV2026-0211", fullName: "Tạ Minh Uyên", birthDate: "14/11/2009", gender: "Nữ", phone: "0948 778 899", email: "minhuyen.ta@student.edu.vn", address: "88 Nguyễn Trãi, Quận 5, TP.HCM", guardianName: "Tạ Văn Hiếu", guardianRelation: "Bố", guardianPhone: "0922 667 788" },
]

const B1_STUDENTS: StudentSeed[] = [
  { id: "s-b1-1", studentCode: "HV2026-0088", fullName: "Nguyễn Thanh Phương", birthDate: "18/08/2004", gender: "Nữ", phone: "0912 778 899", email: "thanhphuong.nguyen@student.edu.vn", address: "72 Nguyễn Văn Cừ, Quận 5, TP.HCM", guardianName: "Nguyễn Văn Thành", guardianRelation: "Bố", guardianPhone: "0933 112 233" },
  { id: "s-b1-2", studentCode: "HV2026-0092", fullName: "Trần Minh Đức", birthDate: "05/02/2005", gender: "Nam", phone: "0907 334 455", email: "minhduc.tran@student.edu.vn", address: "19 Phạm Ngũ Lão, Quận 5, TP.HCM", guardianName: "Trần Thị Mai", guardianRelation: "Mẹ", guardianPhone: "0944 223 344" },
  { id: "s-b1-3", studentCode: "HV2026-0096", fullName: "Lê Hoài An", birthDate: "30/12/2004", gender: "Nữ", phone: "0918 556 677", email: "hoaian.le@student.edu.vn", address: "143 Trần Bình Trọng, Quận 5, TP.HCM", guardianName: "Lê Quốc Bảo", guardianRelation: "Bố", guardianPhone: "0955 334 455" },
  { id: "s-b1-4", studentCode: "HV2026-0100", fullName: "Phạm Gia Bảo", birthDate: "22/03/2005", gender: "Nam", phone: "0926 667 788", email: "giabao.pham@student.edu.vn", address: "210 Trường Chinh, Quận 12, TP.HCM", guardianName: "Phạm Thị Hồng", guardianRelation: "Mẹ", guardianPhone: "0966 445 566" },
  { id: "s-b1-5", studentCode: "HV2026-0104", fullName: "Đỗ Khánh Vy", birthDate: "09/06/2004", gender: "Nữ", phone: "0934 778 899", email: "khanhvy.do@student.edu.vn", address: "54 Lê Thánh Tôn, Quận 1, TP.HCM", guardianName: "Đỗ Hữu Nghị", guardianRelation: "Bố", guardianPhone: "0977 556 677" },
  { id: "s-b1-6", studentCode: "HV2026-0108", fullName: "Võ Nguyên Hào", birthDate: "17/10/2005", gender: "Nam", phone: "0915 223 344", email: "nguyenhao.vo@student.edu.vn", address: "8 Bạch Đằng, Quận 1, TP.HCM", guardianName: "Võ Thị Mỹ Duyên", guardianRelation: "Mẹ", guardianPhone: "0911 667 788" },
  { id: "s-b1-7", studentCode: "HV2026-0112", fullName: "Huỳnh Mai Chi", birthDate: "04/04/2004", gender: "Nữ", phone: "0946 334 455", email: "maichi.huynh@student.edu.vn", address: "382 Lê Văn Viện, Quận 7, TP.HCM", guardianName: "Huỳnh Văn Cường", guardianRelation: "Bố", guardianPhone: "0922 778 899" },
  { id: "s-b1-8", studentCode: "HV2026-0116", fullName: "Bùi Trọng Đại", birthDate: "26/07/2004", gender: "Nam", phone: "0909 445 566", email: "trongdai.bui@student.edu.vn", address: "110 Cách Mạng Tháng 8, Quận 10, TP.HCM", guardianName: "Bùi Thị Hồng Nhựt", guardianRelation: "Mẹ", guardianPhone: "0933 889 900" },
  { id: "s-b1-9", studentCode: "HV2026-0120", fullName: "Ngô Trà My", birthDate: "13/09/2005", gender: "Nữ", phone: "0917 556 677", email: "tramyy.ngo@student.edu.vn", address: "66 Nguyễn Thị Minh Khai, Quận 3, TP.HCM", guardianName: "Ngô Đức Anh", guardianRelation: "Bố", guardianPhone: "0944 112 233" },
  { id: "s-b1-10", studentCode: "HV2026-0124", fullName: "Đặng Tuấn Kiệt", birthDate: "02/02/2005", gender: "Nam", phone: "0928 667 788", email: "tuankiet.dang@student.edu.vn", address: "95 Nguyễn Thái Bình, Quận 1, TP.HCM", guardianName: "Đặng Minh Tuấn", guardianRelation: "Bố", guardianPhone: "0955 223 344" },
  { id: "s-b1-11", studentCode: "HV2026-0128", fullName: "Lương Bảo Ngọc", birthDate: "21/05/2004", gender: "Nữ", phone: "0935 778 899", email: "baongoc.luong@student.edu.vn", address: "176 Hai Bà Trưng, Quận 5, TP.HCM", guardianName: "Lương Văn Kiên", guardianRelation: "Bố", guardianPhone: "0966 334 455" },
  { id: "s-b1-12", studentCode: "HV2026-0132", fullName: "Phan Trọng Nghĩa", birthDate: "08/08/2005", gender: "Nam", phone: "0913 112 233", email: "trongnghia.phan@student.edu.vn", address: "40 Trần Nhân Trách, Quận 10, TP.HCM", guardianName: "Phan Thị Thu", guardianRelation: "Mẹ", guardianPhone: "0977 445 566" },
  { id: "s-b1-13", studentCode: "HV2026-0136", fullName: "Trần Bảo Châu", birthDate: "15/11/2004", gender: "Nữ", phone: "0947 223 344", email: "baochau.tran@student.edu.vn", address: "288 Lê Văn Sỹ, Quận 3, TP.HCM", guardianName: "Trần Quang Huy", guardianRelation: "Bố", guardianPhone: "0911 556 677" },
  { id: "s-b1-14", studentCode: "HV2026-0140", fullName: "Nguyễn Vĩnh Hưng", birthDate: "29/01/2005", gender: "Nam", phone: "0924 334 455", email: "vinh Hung.nguyen@student.edu.vn", address: "83 Cách Mạng Tháng 8, Quận 10, TP.HCM", guardianName: "Nguyễn Văn Hùng", guardianRelation: "Bố", guardianPhone: "0922 667 788" },
]

/** Lớp thiếu nhi: sinh 12 học viên để khớp với `studentCount`. */
function makeY3Students(): StudentSeed[] {
  const NAMES: [string, "Nam" | "Nữ"][] = [
    ["Lê Tuấn Khang", "Nam"],
    ["Phan Ngọc Bích", "Nữ"],
    ["Trần Minh Quân", "Nam"],
    ["Hoàng Yến Nhi", "Nữ"],
    ["Đỗ Gia Linh", "Nữ"],
    ["Vũ Đức Thắng", "Nam"],
    ["Ngô Bảo Châu", "Nữ"],
    ["Bùi Khánh Duy", "Nam"],
    ["Lý Hoàng Long", "Nam"],
    ["Trịnh Mai Ngân", "Nữ"],
    ["Phạm Gia Bảo", "Nam"],
    ["Cao Ngọc Ánh", "Nữ"],
  ]
  const GUARDIANS = [
    ["Lê Minh Tuấn", "Bố"],
    ["Phan Văn Bình", "Bố"],
    ["Trần Thị Mai", "Mẹ"],
    ["Hoàng Thị Nga", "Mẹ"],
    ["Đỗ Hữu Công", "Bố"],
    ["Vũ Văn Hải", "Bố"],
    ["Ngô Đức Anh", "Bố"],
    ["Bùi Thị Hằng", "Mẹ"],
    ["Lý Thanh Hà", "Mẹ"],
    ["Trịnh Quốc Tuấn", "Bố"],
    ["Phạm Văn Kiên", "Bố"],
    ["Cao Thị Bích Ngọc", "Mẹ"],
  ] as const
  const STREETS = [
    "12 Nguyễn Văn Cừ, Quận 5, TP.HCM",
    "88 Lê Văn Viện, Quận 7, TP.HCM",
    "45 Nguyễn Thị Thập, Quận 7, TP.HCM",
    "210 Trường Chinh, Quận 12, TP.HCM",
    "17 Lê Đức Thọ, Quận 7, TP.HCM",
    "9 Nguyễn Thị Minh Khai, Quận 3, TP.HCM",
    "66 Nguyễn Thái Bình, Quận 1, TP.HCM",
    "120 Pasteur, Quận 3, TP.HCM",
    "155 Ba Thanh Thuan, Quận 1, TP.HCM",
    "40 Trần Nhân Trách, Quận 10, TP.HCM",
    "288 Lê Văn Sỹ, Quận 3, TP.HCM",
    "83 Cách Mạng Tháng 8, Quận 10, TP.HCM",
  ]

  return NAMES.map(([fullName, gender], i) => {
    const index = i + 1
    const [guardianName, guardianRelation] = GUARDIANS[i]
    return {
      id: `s-y3-${index}`,
      studentCode: `HV2025-${String(900 + index).padStart(4, "0")}`,
      fullName,
      birthDate: `${String(2 + ((i * 3) % 26)).padStart(2, "0")}/${String(1 + ((i * 4) % 12)).padStart(2, "0")}/${2017 + (i % 2)}`,
      gender,
      phone: `09${String(10 + index).padStart(2, "0")} ${String(100 + i * 37).padStart(3, "0")} ${String(200 + i * 53).padStart(3, "0")}`,
      email: `${fullName.toLowerCase().replace(/ /g, ".")}@student.edu.vn`,
      address: STREETS[i],
      guardianName,
      guardianRelation,
      guardianPhone: `09${String(30 + index).padStart(2, "0")} ${String(300 + i * 41).padStart(3, "0")} ${String(400 + i * 61).padStart(3, "0")}`,
    }
  })
}

const CLASS_STUDENT_SEEDS: { classId: string; seeds: StudentSeed[]; enrolled: string }[] = [
  { classId: "A2T01", seeds: A2_STUDENTS, enrolled: "06/07/2026" },
  { classId: "B1T02", seeds: B1_STUDENTS, enrolled: "11/05/2026" },
  { classId: "Y3SAT", seeds: makeY3Students(), enrolled: "13/09/2025" },
]

function buildStudents(): TeacherStudent[] {
  const list: TeacherStudent[] = []
  let avatarIndex = 0

  for (const group of CLASS_STUDENT_SEEDS) {
    group.seeds.forEach((seed, index) => {
      // Tỷ lệ điểm danh và điểm TB dao động nhẹ nhưng có thật, không trùng lặp.
      const rate = [96, 92, 100, 88, 84, 96, 78, 92, 88, 100, 92, 84, 96, 88, 80, 92, 84, 96][index % 18]
      const score = [8.8, 9.1, 8.4, 7.9, 7.2, 8.6, 6.8, 8.2, 7.5, 9.3, 8.0, 7.7, 8.9, 7.4, 6.9, 8.1, 7.6, 8.5][index % 18]
      list.push({
        ...seed,
        classId: group.classId,
        avatar: AVATARS[avatarIndex % AVATARS.length],
        enrolledDate: group.enrolled,
        attendanceRate: rate,
        averageScore: score,
      })
      avatarIndex += 1
    })
  }

  return list
}

export const TEACHER_STUDENTS: TeacherStudent[] = buildStudents()

export function studentsOfClass(classId: string) {
  return TEACHER_STUDENTS.filter((s) => s.classId === classId)
}

export function getStudent(id: string) {
  return TEACHER_STUDENTS.find((s) => s.id === id)
}

/* ------------------------------------------------------------------ *
 * Điểm danh
 * ------------------------------------------------------------------ */

export type MarkStatus = "present" | "absent" | "late" | "excused"

export const MARK_META: Record<MarkStatus, { label: string; short: string; dot: string; active: string; badge: "success" | "danger" | "warning" | "info" }> = {
  present: { label: "Có mặt", short: "Có mặt", dot: "bg-success", active: "bg-success text-white", badge: "success" },
  absent: { label: "Vắng", short: "Vắng", dot: "bg-danger", active: "bg-danger text-white", badge: "danger" },
  late: { label: "Muộn", short: "Muộn", dot: "bg-warning", active: "bg-warning text-white", badge: "warning" },
  excused: { label: "Có phép", short: "Có phép", dot: "bg-sky-accent", active: "bg-sky-accent text-white", badge: "info" },
}

export type AttendanceRecord = Record<string, MarkStatus>

export type ClassLesson = {
  id: string
  classId: string
  no: number
  date: Date
  time: string
  topic: string
  unit: string
  /** Điểm danh đã lưu hay chưa. */
  marked: boolean
  /** Ngày giáo viên được sửa sau khi lưu. */
  lockedAt?: Date
  note?: string
  marks: AttendanceRecord
}

const UNITS = [
  "Unit 1 · Giới thiệu bản thân",
  "Unit 2 · Địa điểm & hướng",
  "Unit 3 · Sinh hoạt hằng ngày",
  "Unit 4 · Trường học & học tập",
  "Unit 5 · Sở thích & giải trí",
  "Unit 6 · Công việc & nghề nghiệp",
  "Unit 7 · Sức khỏe & đời sống",
  "Unit 8 · Môi trường & xã hội",
]

/** Số ngày sau khi lưc điểm danh thì khóa không cho sửa. */
export const ATTENDANCE_LOCK_DAYS = 7

/** Lịch học của từng lớp: Thứ 2 & Thứ 6 (A2), Thứ 3 & Thứ 6 (B1), T7 & CN (Y3). */
const CLASS_SCHEDULE: Record<string, { start: Date; time: string; weekdays: number[] }> = {
  A2T01: { start: new Date(2026, 6, 6), time: "19:00 – 20:30", weekdays: [1, 4] },
  B1T02: { start: new Date(2026, 4, 11), time: "19:45 – 21:15", weekdays: [2, 5] },
  Y3SAT: { start: new Date(2025, 8, 13), time: "08:00 – 09:30", weekdays: [6, 0] },
}

/** Ngày nghỉ chung — dùng chung với lịch trung tâm. */
const SKIP_DATES = new Set(["2026-10-01", "2027-02-08", "2027-02-09", "2027-02-10"])

const pad = (n: number) => String(n).padStart(2, "0")
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function dateKey(d: Date) {
  return toKey(d)
}

function buildClassLessons(classId: string): ClassLesson[] {
  const config = CLASS_SCHEDULE[classId]
  const target = getClass(classId)
  if (!config || !target) return []

  const lessons: ClassLesson[] = []
  const classStudents = studentsOfClass(classId)

  for (let week = 0; lessons.length < target.totalLessons; week += 1) {
    for (const weekday of config.weekdays) {
      const monday = new Date(config.start)
      monday.setDate(config.start.getDate() + week * 7)
      const date = new Date(monday)
      // weekday tính theo thứ Hai = 0
      date.setDate(monday.getDate() + ((weekday + 6) % 7))
      if (SKIP_DATES.has(dateKey(date))) continue
      if (lessons.length >= target.totalLessons) break

      const no = lessons.length + 1
      const past = date < TODAY

      // Điểm danh mẫu: đa số có mặt, có xen kẽ vắng / muộn / có phép.
      const marks: AttendanceRecord = {}
      classStudents.forEach((student, index) => {
        const pattern = (no * 7 + index * 3) % 23
        let status: MarkStatus = "present"
        if (pattern === 5) status = "absent"
        else if (pattern === 11) status = "late"
        else if (pattern === 17) status = "excused"
        marks[student.id] = status
      })

      lessons.push({
        id: `${classId}-${pad(no)}`,
        classId,
        no,
        date,
        time: config.time,
        unit: UNITS[Math.min(Math.floor((no - 1) / 8), UNITS.length - 1)],
        topic: `Buổi ${no} · ${UNITS[Math.min(Math.floor((no - 1) / 8), UNITS.length - 1)].split(" · ")[1]}`,
        // Buổi hôm nay chưa điểm danh, các buổi đã qua đều đã lưu.
        marked: past,
        lockedAt: past ? addDaysSafe(date, 1) : undefined,
        note: no % 9 === 0 ? "Buổi học bù cho học viên vắng ngày trước." : undefined,
        marks,
      })
    }
  }

  return lessons
}

function addDaysSafe(date: Date, days: number) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

export const CLASS_LESSONS: Record<string, ClassLesson[]> = Object.fromEntries(
  CLASSES.map((c) => [c.id, buildClassLessons(c.id)]),
)

export function lessonsOfClass(classId: string) {
  return CLASS_LESSONS[classId] ?? []
}

/** Buổi học sắp tới / hôm nay của một lớp. */
export function todayLessonOfClass(classId: string) {
  return lessonsOfClass(classId).find((l) => isSameDate(l.date, TODAY))
}

/* ------------------------------------------------------------------ *
 * Điểm số
 * ------------------------------------------------------------------ */

export type TeacherTest = {
  id: string
  classId: string
  name: string
  kind: "unit" | "mid" | "final" | "quiz"
  date: string
  /** Điểm tối đa của từng kỹ năng. */
  maxScore: number
  /** Điểm đã nhập theo học viên: studentId -> điểm (để trống nếu chưa chấm). */
  scores: Record<string, string>
}

export const TESTS: TeacherTest[] = [
  {
    id: "t-a2-1",
    classId: "A2T01",
    name: "Kiểm tra định kỳ Unit 1",
    kind: "unit",
    date: "25/07/2026",
    maxScore: 10,
    scores: {},
  },
  {
    id: "t-a2-2",
    classId: "A2T01",
    name: "Kiểm tra định kỳ Unit 2 – 3",
    kind: "unit",
    date: "08/08/2026",
    maxScore: 10,
    scores: {},
  },
  {
    id: "t-a2-3",
    classId: "A2T01",
    name: "Kiểm tra giữa khóa A2",
    kind: "mid",
    date: "30/09/2026",
    maxScore: 10,
    scores: {},
  },
  {
    id: "t-a2-4",
    classId: "A2T01",
    name: "Kiểm tra định kỳ Unit 5",
    kind: "unit",
    date: "19/09/2026",
    maxScore: 10,
    scores: {},
  },
  {
    id: "t-b1-1",
    classId: "B1T02",
    name: "Kiểm tra định kỳ Unit 1 – 2",
    kind: "unit",
    date: "30/05/2026",
    maxScore: 10,
    scores: {},
  },
  {
    id: "t-b1-2",
    classId: "B1T02",
    name: "Kiểm tra giữa kỳ B1",
    kind: "mid",
    date: "12/09/2026",
    maxScore: 10,
    scores: {},
  },
]

export const TEST_KIND_META: Record<TeacherTest["kind"], { label: string; badge: "info" | "warning" | "brand" | "neutral" }> = {
  quiz: { label: "Bài kiểm tra nhanh", badge: "neutral" },
  unit: { label: "Định kỳ", badge: "info" },
  mid: { label: "Giữa khóa", badge: "warning" },
  final: { label: "Cuối khóa", badge: "brand" },
}

export function testsOfClass(classId: string) {
  return TESTS.filter((t) => t.classId === classId)
}

/** Điểm đã lưu của một bài kiểm tra. */
export function scoresOfTest(testId: string): Record<string, number> {
  const test = TESTS.find((t) => t.id === testId)
  if (!test) return {}
  const out: Record<string, number> = {}
  for (const student of studentsOfClass(test.classId)) {
    const raw = test.scores[student.id]
    if (raw !== undefined && raw !== "") out[student.id] = Number(raw)
  }
  return out
}

/* ------------------------------------------------------------------ *
 * Bài tập giáo viên đã giao
 * ------------------------------------------------------------------ */

export type TeacherAssignment = {
  id: string
  classId: string
  title: string
  deadline: Date
  description: string
  createdAt: string
  createdBy: string
}

export const TEACHER_ASSIGNMENTS: TeacherAssignment[] = [
  { id: "ta-1", classId: "A2T01", title: "Bài tập Unit 6 – Công việc & nghề nghiệp", deadline: new Date(2026, 9, 3), description: "Bài đọc hiểu trang 42 – 43 kèm 10 câu hỏi trả lời bằng tiếng Anh.", createdAt: "29/09/2026", createdBy: TEACHER_PROFILE.fullName },
  { id: "ta-2", classId: "A2T01", title: "Luyện nói chủ đề 'Địa điểm công cộng'", deadline: new Date(2026, 9, 5), description: "Ghi âm 2 phút nói về 3 địa điểm bạn thường ghé, nộp qua Zalo lớp.", createdAt: "30/09/2026", createdBy: TEACHER_PROFILE.fullName },
  { id: "ta-3", classId: "B1T02", title: "Viết đoạn văn 120 từ về lợi ích của việc học ngoại ngữ", deadline: new Date(2026, 9, 8), description: "Sử dụng 3 cấu trúc câu ghép: although, because, so as to.", createdAt: "01/10/2026", createdBy: TEACHER_PROFILE.fullName },
  { id: "ta-4", classId: "B1T02", title: "Nghe podcast 'Job interview tips'", deadline: new Date(2026, 8, 24), description: "Nghe và trả lời 5 câu hỏi tóm tắt nội dung.", createdAt: "18/09/2026", createdBy: TEACHER_PROFILE.fullName },
  { id: "ta-5", classId: "Y3SAT", title: "Bài tập từ vựng Unit 8 – Animal friends", deadline: new Date(2026, 9, 4), description: "Vẽ và tô màu 5 loài vật, ghi tên bằng tiếng Anh.", createdAt: "01/10/2026", createdBy: TEACHER_PROFILE.fullName },
]

/* ------------------------------------------------------------------ *
 * Lịch trình — sự kiện do giáo viên tạo + sự kiện chung của trung tâm
 * ------------------------------------------------------------------ */

export type TeacherEventType = "lesson" | "exam" | "class" | "center"

export const TEACHER_EVENT_META: Record<TeacherEventType, { label: string; dot: string; badge: "brand" | "warning" | "success" | "info"; editable: boolean }> = {
  lesson: { label: "Buổi học", dot: "bg-brand-hover", badge: "brand", editable: true },
  exam: { label: "Kỳ thi", dot: "bg-warning", badge: "warning", editable: true },
  class: { label: "Hoạt động lớp", dot: "bg-success", badge: "success", editable: true },
  center: { label: "Sự kiện trung tâm", dot: "bg-sky-accent", badge: "info", editable: false },
}

export type TeacherEvent = {
  id: string
  type: TeacherEventType
  title: string
  date: Date
  startTime: string
  endTime: string
  location: string
  /** classId hoặc "ALL" nếu gửi tất cả lớp của giáo viên. */
  audience: string
  description: string
  /** true = giáo viên tự tạo (được sửa/xoá). */
  own: boolean
}

export const CENTER_EVENTS: TeacherEvent[] = [
  { id: "ce-1", type: "center", title: "Quốc khánh 2/9 – nghỉ lễ", date: new Date(2026, 9, 1), startTime: "", endTime: "", location: "Toàn trung tâm", audience: "ALL", description: "Trung tâm nghỉ đón Quốc khánh, buổi học được chuyển sang lịch bù.", own: false },
  { id: "ce-2", type: "center", title: "English Day 2026", date: new Date(2026, 9, 31), startTime: "08:30", endTime: "12:00", location: "Sân trường cơ sở Quận 7", audience: "ALL", description: "Ngày hội tiếng Anh toàn trung tâm: trò chơi, thi hùng biện và workshop miễn phí.", own: false },
  { id: "ce-3", type: "center", title: "Họp giáo viên cuối tháng", date: new Date(2026, 9, 29), startTime: "16:30", endTime: "17:30", location: "Phòng họp 3", audience: "ALL", description: "Tổng kết tháng, thống nhất kế hoạch tháng 11 và lịch nghỉ Tết.", own: false },
  { id: "ce-4", type: "center", title: "Tập huấn phương pháp gamification", date: new Date(2026, 10, 12), startTime: "14:00", endTime: "16:30", location: "Hội trường", audience: "ALL", description: "Chuyên gia chia sẻ thiết kế hoạt động tương tác cho lớp thiếu nhi.", own: false },
  { id: "ce-5", type: "center", title: "Nghỉ Tết Nguyên Đán", date: new Date(2027, 1, 8), startTime: "", endTime: "", location: "Toàn trung tâm", audience: "ALL", description: "Trung tâm nghỉ Tết, lớp học chuyển sang lịch bù trong tuần sau.", own: false },
]

export const OWN_EVENTS: TeacherEvent[] = [
  { id: "oe-1", type: "exam", title: "Kiểm tra định kỳ Unit 5 – 6 (A2)", date: new Date(2026, 9, 24), startTime: "19:00", endTime: "20:30", location: "Phòng 204", audience: "A2T01", description: "Bài kiểm tra 50 phút gồm ngữ pháp, từ vựng và đọc hiểu.", own: true },
  { id: "oe-2", type: "class", title: "Buổi tư vấn phụ huynh giữa kỳ", date: new Date(2026, 10, 14), startTime: "17:00", endTime: "19:00", location: "Phòng họp 3", audience: "A2T01", description: "Trao đổi trực tiếp với phụ huynh về tiến độ học kỳ II.", own: true },
  { id: "oe-3", type: "exam", title: "Kiểm tra giữa khóa B1", date: new Date(2026, 10, 28), startTime: "19:45", endTime: "21:15", location: "Phòng 301", audience: "B1T02", description: "Thi giữa khóa 4 kỹ năng, thang điểm 10.", own: true },
  { id: "oe-4", type: "class", title: "Lớp bổ sung từ vựng Cambridge YLE", date: new Date(2026, 10, 7), startTime: "08:00", endTime: "09:30", location: "Phòng 102", audience: "Y3SAT", description: "Ôn tập từ vựng chuẩn bị cho kỳ thi Flyers tháng 12.", own: true },
]

export function audienceLabel(audience: string) {
  if (audience === "ALL") return "Tất cả lớp của tôi"
  return getClass(audience)?.name ?? audience
}

/* ------------------------------------------------------------------ *
 * Bảng lương
 * ------------------------------------------------------------------ */

export type PayrollStatus = "draft" | "pending" | "approved"

export const PAYROLL_STATUS_META: Record<PayrollStatus, { label: string; badge: "neutral" | "warning" | "success"; description: string }> = {
  draft: { label: "Đang tính", badge: "neutral", description: "Số buổi dạy chưa được chốt, bảng lương tạm thời chỉ để tham khảo." },
  pending: { label: "Chờ duyệt", badge: "warning", description: "Đã chốt số buổi dạy, đang chờ phòng Kế toán duyệt." },
  approved: { label: "Đã chốt", badge: "success", description: "Bảng lương đã được phòng Kế toán duyệt và chốt." },
}

export type PayrollRow = {
  month: string
  /** mã tháng để so sánh, ví dụ "2026-09". */
  key: string
  status: PayrollStatus
  lessonRate: number
  bonusPerLesson: number
  /** Số buổi dạy theo từng lớp. */
  breakdown: { classId: string; className: string; lessons: number }[]
  /** Các khoản điều chỉnh khác. */
  adjustments: { label: string; amount: number }[]
}

const PAYROLL_ROWS: PayrollRow[] = [
  {
    month: "Tháng 9/2026",
    key: "2026-09",
    status: "approved",
    lessonRate: 180_000,
    bonusPerLesson: 20_000,
    breakdown: [
      { classId: "A2T01", className: "A2 Buổi Tối 01", lessons: 9 },
      { classId: "B1T02", className: "B1 Buổi Tối 02", lessons: 8 },
      { classId: "Y3SAT", className: "Thiếu nhi Y3 Sabato", lessons: 5 },
    ],
    adjustments: [
      { label: "Thưởng chuyên cần lớp Y3", amount: 400_000 },
      { label: "Phụ cấp tài liệu", amount: 150_000 },
    ],
  },
  {
    month: "Tháng 8/2026",
    key: "2026-08",
    status: "approved",
    lessonRate: 180_000,
    bonusPerLesson: 20_000,
    breakdown: [
      { classId: "A2T01", className: "A2 Buổi Tối 01", lessons: 8 },
      { classId: "B1T02", className: "B1 Buổi Tối 02", lessons: 8 },
      { classId: "Y3SAT", className: "Thiếu nhi Y3 Sabato", lessons: 6 },
    ],
    adjustments: [{ label: "Thưởng English Day", amount: 500_000 }],
  },
  {
    month: "Tháng 7/2026",
    key: "2026-07",
    status: "approved",
    lessonRate: 175_000,
    bonusPerLesson: 15_000,
    breakdown: [
      { classId: "A2T01", className: "A2 Buổi Tối 01", lessons: 4 },
      { classId: "B1T02", className: "B1 Buổi Tối 02", lessons: 8 },
      { classId: "Y3SAT", className: "Thiếu nhi Y3 Sabato", lessons: 6 },
    ],
    adjustments: [{ label: "Thưởng khai giảng khóa mới", amount: 300_000 }],
  },
  {
    month: "Tháng 6/2026",
    key: "2026-06",
    status: "approved",
    lessonRate: 175_000,
    bonusPerLesson: 15_000,
    breakdown: [
      { classId: "A2T01", className: "A2 Buổi Tối 01", lessons: 0 },
      { classId: "B1T02", className: "B1 Buổi Tối 02", lessons: 9 },
      { classId: "Y3SAT", className: "Thiếu nhi Y3 Sabato", lessons: 5 },
    ],
    adjustments: [],
  },
  {
    month: "Tháng 10/2026",
    key: "2026-10",
    status: "draft",
    lessonRate: 180_000,
    bonusPerLesson: 20_000,
    breakdown: [
      { classId: "A2T01", className: "A2 Buổi Tối 01", lessons: 1 },
      { classId: "B1T02", className: "B1 Buổi Tối 02", lessons: 1 },
      { classId: "Y3SAT", className: "Thiếu nhi Y3 Sabato", lessons: 1 },
    ],
    adjustments: [],
  },
]

export const PAYROLL: PayrollRow[] = PAYROLL_ROWS

export type PayrollTotals = {
  totalLessons: number
  baseAmount: number
  bonusAmount: number
  adjustmentAmount: number
  total: number
}

export function payrollTotals(row: PayrollRow): PayrollTotals {
  const totalLessons = row.breakdown.reduce((sum, b) => sum + b.lessons, 0)
  const baseAmount = totalLessons * row.lessonRate
  const bonusAmount = totalLessons * row.bonusPerLesson
  const adjustmentAmount = row.adjustments.reduce((sum, a) => sum + a.amount, 0)
  return { totalLessons, baseAmount, bonusAmount, adjustmentAmount, total: baseAmount + bonusAmount + adjustmentAmount }
}

/* ------------------------------------------------------------------ *
 * Tiện ích dùng chung
 * ------------------------------------------------------------------ */

function isSameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

const WEEKDAY_VI = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"]

export function weekdayLabel(weekday: number) {
  return WEEKDAY_VI[weekday % 7]
}

export function scheduleText(weekdays: number[]) {
  return weekdays.map(weekdayLabel).join(" & ")
}

/** Các buổi dạy trong tuần của giáo viên, sắp xếp theo thứ tự tuần. */
export function weeklySchedule() {
  return CLASSES.flatMap((cls) =>
    cls.weekdays.map((weekday) => ({
      classId: cls.id,
      className: cls.name,
      weekday,
      time: cls.time,
      room: cls.room,
      course: cls.course,
    })),
  ).sort((a, b) => a.weekday - b.weekday)
}

export { isSameDate, dateKey }