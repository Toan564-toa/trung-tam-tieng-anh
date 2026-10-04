import type * as XLSXType from "xlsx"
import { MARK_META, type ClassLesson, type MarkStatus } from "@/data/teacher"
import { formatDate } from "@/lib/date"
import type { PayrollTotals, TeacherStudent } from "@/data/teacher"

type XLSXModule = typeof XLSXType

let cached: Promise<XLSXModule> | null = null

/** SheetJS khá nặng nên chỉ nạp khi người dùng thực sự bấm xuất Excel. */
function loadXlsx(): Promise<XLSXModule> {
  cached ??= import("xlsx")
  return cached
}

export { loadXlsx as getXlsx }

export { download as downloadWorkbook, safeFileName }

/** Tên file an toàn cho Windows (bỏ ký tự cấm). */
function safeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, "-").trim()
}

function download(XLSX: XLSXModule, workbook: XLSXType.WorkBook, fileName: string) {
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const MARKS: MarkStatus[] = ["present", "absent", "late", "excused"]

/** Bảng điểm danh của một buổi học. */
export async function exportAttendanceSheet(
  className: string,
  lesson: ClassLesson,
  students: TeacherStudent[],
  note?: string,
) {
  const XLSX = await loadXlsx()
  const rows = students.map((student, index) => ({
    STT: index + 1,
    "Mã học viên": student.studentCode,
    "Họ và tên": student.fullName,
    "Giới tính": student.gender,
    "SĐT phụ huynh": student.guardianPhone,
    ...Object.fromEntries(MARKS.map((status) => [MARK_META[status].label, ""] as const)),
    "Ghi chú": "",
  }))

  const header = [
    "STT",
    "Mã học viên",
    "Họ và tên",
    "Giới tính",
    "SĐT phụ huynh",
    ...MARKS.map((status) => MARK_META[status].label),
    "Ghi chú",
  ] as const

  const title = [
    [`BẢNG ĐIỂM DANH – ${className}`],
    [`Buổi ${lesson.no} · ${lesson.topic}`],
    [`Thời gian: ${formatDate(lesson.date)} (${lesson.time})`],
    [`Tổng số học viên: ${students.length}`],
  ]

  // Đánh dấu X vào đúng cột trạng thái của từng học viên.
  rows.forEach((row, index) => {
    const status = lesson.marks[students[index].id]
    if (!status) return
    const col = MARKS.indexOf(status)
    if (col >= 0) (row as Record<string, string | number>)[MARK_META[status].label] = "X"
  })

  // Dựng hàng theo đúng thứ tự cột header để thứ tự luôn ổn định.
  const body = rows.map((row) => {
    const record = row as Record<string, string | number>
    return header.map((column) => record[column] ?? "")
  })

  const sheet = XLSX.utils.aoa_to_sheet([...title, [], [...header], ...body])

  sheet["!cols"] = [
    { wch: 5 },
    { wch: 13 },
    { wch: 24 },
    { wch: 10 },
    { wch: 15 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 26 },
  ]
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 9 } },
  ]

  if (note) {
    XLSX.utils.sheet_add_aoa(sheet, [[], [`Ghi chú buổi học: ${note}`]], { origin: -1 })
    sheet["!merges"] = [...(sheet["!merges"] ?? []), { s: { r: 6 + students.length, c: 0 }, e: { r: 6 + students.length, c: 9 } }]
  }

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, "Điểm danh")
  download(XLSX, workbook, safeFileName(`DiemDanh_${className}_Buoi${lesson.no}_${formatDate(lesson.date).replace(/\//g, "-")}.xlsx`))
}

/** Tổng hợp điểm danh cả lớp theo từng buổi. */
export async function exportAttendanceSummary(
  className: string,
  lessons: ClassLesson[],
  students: TeacherStudent[],
) {
  const XLSX = await loadXlsx()
  const header = [
    "STT",
    "Mã học viên",
    "Họ và tên",
    "Buổi đã học",
    ...MARKS.map((status) => MARK_META[status].label),
    "Tỷ lệ %",
  ] as const

  const rows = students.map((student, index) => {
    const counts = MARKS.map((status) => lessons.filter((l) => l.marks[student.id] === status).length)
    const attended = counts[0] + counts[2]
    return [
      index + 1,
      student.studentCode,
      student.fullName,
      lessons.length,
      ...counts,
      lessons.length ? Math.round((attended / lessons.length) * 100) : 0,
    ]
  })

  const sheet = XLSX.utils.aoa_to_sheet([[`TỔNG HỢP ĐIỂM DANH – ${className}`], [], [...header], ...rows])
  sheet["!cols"] = [
    { wch: 5 },
    { wch: 13 },
    { wch: 24 },
    { wch: 13 },
    ...MARKS.map(() => ({ wch: 11 })),
    { wch: 10 },
  ]
  sheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } }]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, "Tổng hợp")
  download(XLSX, workbook, safeFileName(`DiemDanhTongHop_${className}.xlsx`))
}

/** Bảng điểm của một bài kiểm tra. */
export async function exportScoreSheet(
  className: string,
  testName: string,
  students: TeacherStudent[],
  scores: Record<string, number>,
) {
  const XLSX = await loadXlsx()
  const header = ["STT", "Mã học viên", "Họ và tên", "Điểm", "Đánh giá"] as const
  const rows = students.map((student, index) => {
    const value = scores[student.id]
    const grade = value === undefined ? "Chưa chấm" : value >= 8.5 ? "Xuất sắc" : value >= 7 ? "Đạt" : value >= 5 ? "Cần cải thiện" : "Chưa đạt"
    return [index + 1, student.studentCode, student.fullName, value === undefined ? "" : value, grade]
  })

  const sheet = XLSX.utils.aoa_to_sheet([[`KẾT QUẢ – ${testName}`], [`Lớp: ${className}`], [], [...header], ...rows])
  sheet["!cols"] = [{ wch: 5 }, { wch: 13 }, { wch: 24 }, { wch: 10 }, { wch: 16 }]
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, "Điểm")
  download(XLSX, workbook, safeFileName(`Diem_${className}_${testName}.xlsx`))
}

/** Bảng lương tháng. */
export async function exportPayroll(
  monthLabel: string,
  teacherName: string,
  rows: { className: string; lessons: number }[],
  totals: { lessonRate: number; bonusPerLesson: number } & PayrollTotals,
  adjustments: { label: string; amount: number }[],
) {
  const XLSX = await loadXlsx()
  const sheet = XLSX.utils.aoa_to_sheet([
    [`BẢNG LƯƠNG – ${monthLabel}`],
    [`Giáo viên: ${teacherName}`],
    [],
    ["Lớp", "Số buổi dạy"],
    ...rows.map((r) => [r.className, r.lessons]),
    [],
    ["Đơn giá / buổi", totals.lessonRate],
    ["Thưởng thêm / buổi", totals.bonusPerLesson],
    [],
    ["Cơ học cảnh báo", "Số tiền"],
    ...adjustments.map((a) => [a.label, a.amount]),
    [],
    ["Tổng giờ giảng", totals.baseAmount + totals.bonusAmount],
    ["Tổng điều chỉnh", totals.adjustmentAmount],
    ["TỔNG THỰC NHẬN", totals.total],
  ])
  sheet["!cols"] = [{ wch: 34 }, { wch: 16 }]
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, "Lương")
  download(XLSX, workbook, safeFileName(`BangLuong_${monthLabel.replace(/\s/g, "_")}.xlsx`))
}

/** Danh sách học viên của phòng tư vấn. */
export async function exportStudentsSheet(
  rows: {
    studentCode: string
    fullName: string
    gender: string
    birthDate: string
    phone: string
    email: string
    className: string
    staffName: string
    statusLabel: string
    tuitionLabel: string
    remaining: number
  }[],
  fileHint = "HocVien",
) {
  const XLSX = await loadXlsx()
  const header = [
    "Mã học viên",
    "Họ và tên",
    "Giới tính",
    "Ngày sinh",
    "SĐT",
    "Email",
    "Lớp",
    "Nhân viên phụ trách",
    "Trạng thái",
    "Tình trạng học phí",
    "Còn phải thu",
  ] as const

  const body = rows.map((row, index) => [index + 1, row.studentCode, row.fullName, row.gender, row.birthDate, row.phone, row.email, row.className, row.staffName, row.statusLabel, row.tuitionLabel, row.remaining])

  const sheet = XLSX.utils.aoa_to_sheet([["DANH SÁCH HỌC VIÊN"], [`Xuất ngày: ${formatDate(new Date())}`], [], [...header], ...body])
  sheet["!cols"] = [
    { wch: 5 }, { wch: 13 }, { wch: 24 }, { wch: 10 }, { wch: 12 }, { wch: 15 },
    { wch: 26 }, { wch: 22 }, { wch: 14 }, { wch: 18 }, { wch: 20 }, { wch: 16 },
  ]
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, "Học viên")
  download(XLSX, workbook, safeFileName(`${fileHint}_${formatDate(new Date()).replace(/\//g, "-")}.xlsx`))
}

/** Sổ thu học phí. */
export async function exportPaymentsSheet(
  rows: { date: string; receiptNo: string; studentName: string; studentCode: string; className: string; method: string; amount: number; note: string; collectorName: string }[],
) {
  const XLSX = await loadXlsx()
  const header = ["Ngày", "Số phiếu", "Mã học viên", "Họ và tên", "Lớp", "Hình thức", "Số tiền", "Ghi chú", "Người thu"] as const
  const body = rows.map((row) => [row.date, row.receiptNo, row.studentCode, row.studentName, row.className, row.method, row.amount, row.note, row.collectorName])
  const total = rows.reduce((sum, row) => sum + row.amount, 0)

  const sheet = XLSX.utils.aoa_to_sheet([["SỔ THU HỌC PHÍ"], [], [...header], ...body, [], ["TỔNG", "", "", "", "", "", total, "", ""]])
  sheet["!cols"] = [{ wch: 12 }, { wch: 16 }, { wch: 13 }, { wch: 24 }, { wch: 26 }, { wch: 14 }, { wch: 16 }, { wch: 30 }, { wch: 22 }]
  sheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, "Thu học phí")
  download(XLSX, workbook, safeFileName(`ThuHocPhi_${formatDate(new Date()).replace(/\//g, "-")}.xlsx`))
}

/** Danh sách khách tiềm năng của nhân viên tư vấn. */
export async function exportLeadsSheet(
  rows: { fullName: string; phone: string; email: string; age: number; source: string; className: string; stageLabel: string; ownerName: string; expectedFee: number; createdAt: string }[],
) {
  const XLSX = await loadXlsx()
  const header = ["Họ và tên", "SĐT", "Email", "Tuổi", "Nguồn", "Lớp quan tâm", "Trạng thái", "Nhân viên phụ trách", "Học phí dự kiến", "Ngày tạo"] as const
  const body = rows.map((row) => [row.fullName, row.phone, row.email, row.age, row.source, row.className, row.stageLabel, row.ownerName, row.expectedFee, row.createdAt])

  const sheet = XLSX.utils.aoa_to_sheet([["DANH SÁCH KHÁCH TIỀM NĂNG"], [], [...header], ...body])
  sheet["!cols"] = [{ wch: 24 }, { wch: 15 }, { wch: 28 }, { wch: 8 }, { wch: 14 }, { wch: 26 }, { wch: 16 }, { wch: 22 }, { wch: 18 }, { wch: 13 }]
  sheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, "Khách tiềm năng")
  download(XLSX, workbook, safeFileName(`KhachTiemNang_${formatDate(new Date()).replace(/\//g, "-")}.xlsx`))
}