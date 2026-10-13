import type * as XLSXType from "xlsx"
import { downloadWorkbook, getXlsx } from "@/lib/excel"
import { formatDate } from "@/lib/date"
import { ADMIN_ACCOUNTS, type AccountRole } from "@/data/admin"

export type ImportKind = "student" | "teacher" | "staff"

export const IMPORT_KIND_META: Record<ImportKind, { label: string; role: AccountRole; prefix: string; description: string }> = {
  student: {
    label: "Học viên",
    role: "student",
    prefix: "hv",
    description: "Mã học viên*, Họ tên*, Ngày sinh, Giới tính, SĐT, Email, Địa chỉ, Trường, Trình độ.",
  },
  teacher: {
    label: "Giáo viên",
    role: "teacher",
    prefix: "gv",
    description: "Mã giáo viên*, Họ tên*, SĐT, Email, Chuyên môn, Ngày vào, Hiện website.",
  },
  staff: {
    label: "Nhân viên",
    role: "staff",
    prefix: "nv",
    description: "Mã nhân viên*, Họ tên*, SĐT, Email, Chức vụ, Phòng ban, Ngày vào.",
  },
}

/** Cột bắt buộc của từng loại file mẫu. */
const TEMPLATE_COLUMNS: Record<ImportKind, { key: string; label: string; example: string; required: boolean }[]> = {
  student: [
    { key: "studentCode", label: "Ma hoc vien", example: "HV2026-0401", required: true },
    { key: "fullName", label: "Ho va ten", example: "Nguyen Van An", required: true },
    { key: "birthDate", label: "Ngay sinh", example: "12/05/2014", required: true },
    { key: "gender", label: "Gioi tinh", example: "Nam", required: true },
    { key: "guardianName", label: "Phu huynh", example: "Nguyen Thi Binh", required: true },
    { key: "guardianPhone", label: "SĐT phu huynh", example: "0909123456", required: true },
    { key: "email", label: "Email", example: "an.nguyen@gmail.com", required: false },
    { key: "classCode", label: "Ma lop", example: "A2T01", required: false },
  ],
  teacher: [
    { key: "fullName", label: "Ho va ten", example: "Tran Thi B", required: true },
    { key: "email", label: "Email cong ty", example: "tran.b@ttnn.edu.vn", required: true },
    { key: "phone", label: "So dien thoai", example: "0912345678", required: true },
    { key: "level", label: "Trinh do", example: "B1 · Trung cap", required: false },
    { key: "specialty", label: "Chuyen mon", example: "IELTS 7.0", required: false },
    { key: "startDate", label: "Ngay bat dau", example: "01/09/2026", required: false },
  ],
  staff: [
    { key: "fullName", label: "Ho va ten", example: "Le Thi D", required: true },
    { key: "email", label: "Email cong ty", example: "le.d@ttnn.edu.vn", required: true },
    { key: "phone", label: "So dien thoai", example: "0912345679", required: true },
    { key: "department", label: "Phong ban", example: "Tu van – Dao tao", required: true },
    { key: "startDate", label: "Ngay bat dau", example: "01/10/2026", required: false },
  ],
}

export type ImportRow = {
  /** Số thứ tự trong file (bắt đầu từ 2 vì hàng 1 là tiêu đề cột). */
  rowNumber: number
  values: Record<string, string>
  errors: string[]
}

export type ParseResult = {
  kind: ImportKind
  fileName: string
  /** Các cột bắt buộc bị thiếu trong header. */
  missingColumns: string[]
  rows: ImportRow[]
  totalRows: number
  validRows: number
}

const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CODE_RE = /^[A-Z]{1,2}\d{3,4}$/

function normalize(value: unknown) {
  return typeof value === "string" ? value.trim() : value === undefined || value === null ? "" : String(value).trim()
}

/** So khớp tên cột tiếng Việt/tiếng Anh không phân biệt dấu và khoảng trắng. */
function fold(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, "")
}

function matchKey(headerKey: string, column: { key: string; label: string }) {
  const candidates = [column.key, column.label]
  return candidates.some((candidate) => fold(candidate) === fold(headerKey))
}

/** Tải file mẫu có sẵn 2 dòng dữ liệu minh hoạ và 1 dòng ghi chú. */
export async function downloadImportTemplate(kind: ImportKind) {
  const XLSX = await getXlsx()
  const columns = TEMPLATE_COLUMNS[kind]
  const meta = IMPORT_KIND_META[kind]

  const guide = [
    [`MẪU NHẬP ${meta.label.toUpperCase()} – [TÊN TRUNG TÂM]`],
    ["Cột có dấu * là bắt buộc. Không được đổi tên cột. Xoá các dòng ghi chú trước khi điền dữ liệu."],
    [],
    columns.map((column) => `${column.label}${column.required ? " *" : ""}`),
    columns.map((column) => column.example),
  ]

  const sheet = XLSX.utils.aoa_to_sheet(guide)
  sheet["!cols"] = columns.map((column) => ({ wch: Math.max(18, column.label.length + 6) }))

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, meta.label)
  downloadWorkbook(XLSX, workbook, `MauNhap_${meta.label.replace(/\s+/g, "")}.xlsx`)
}

/** Đọc file người dùng tải lên và validate từng dòng. */
export async function parseImportFile(kind: ImportKind, file: File): Promise<ParseResult> {
  const XLSX = await getXlsx()
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: "array" })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "" })

  const columns = TEMPLATE_COLUMNS[kind]
  const headerIndex = aoa.findIndex((line) => line.some((cell) => columns.some((column) => matchKey(normalize(cell), column))))
  const header = headerIndex >= 0 ? (aoa[headerIndex] ?? []).map(normalize) : []
  const mapped = columns.map((column) => header.findIndex((cell) => matchKey(cell, column)))

  const missingColumns = columns
    .filter((column, index) => column.required && mapped[index] < 0)
    .map((column) => `${column.label} *`)

  const body = aoa.slice(headerIndex + 1)
  const seenPhone = new Map<string, number>()
  const existingPhones = new Set(
    ADMIN_ACCOUNTS.filter((account) => !account.deletedAt).map((account) => account.phone.replace(/\D/g, "")),
  )

  const rows: ImportRow[] = []
  let validRows = 0

  body.forEach((line, offset) => {
    const values: Record<string, string> = {}
    columns.forEach((column, index) => {
      values[column.key] = normalize(mapped[index] >= 0 ? line[mapped[index]] : line[index])
    })

    if (!Object.values(values).some(Boolean)) return

    const errors: string[] = []
    columns.forEach((column) => {
      if (column.required && !values[column.key]) errors.push(`Thiếu cột "${column.label}"`)
    })

    const phoneKey = (values.guardianPhone ?? values.phone ?? "").replace(/\D/g, "")
    if (phoneKey) {
      if (!PHONE_RE.test(phoneKey)) errors.push(`Số điện thoại "${values.guardianPhone ?? values.phone}" sai định dạng`)
      else if (existingPhones.has(phoneKey)) errors.push("Số điện thoại đã tồn tại trong hệ thống")
      else if (seenPhone.has(phoneKey)) errors.push(`Trùng số điện thoại với dòng ${seenPhone.get(phoneKey)}`)
      else seenPhone.set(phoneKey, offset + 2)
    }

    if (values.email && !EMAIL_RE.test(values.email)) errors.push(`Email "${values.email}" sai định dạng`)
    if (values.birthDate && !/^\d{2}\/\d{2}\/\d{4}$/.test(values.birthDate)) errors.push('Ngày sinh phải có định dạng dd/mm/yyyy')
    if (values.classCode && !CODE_RE.test(values.classCode)) errors.push(`Mã lớp "${values.classCode}" không hợp lệ`)

    if (errors.length === 0) validRows += 1
    rows.push({ rowNumber: offset + 2, values, errors })
  })

  return {
    kind,
    fileName: file.name,
    missingColumns,
    rows,
    totalRows: rows.length,
    validRows,
  }
}

/** Sinh tài khoản + mật khẩu tạm cho các dòng hợp lệ. */
export type CreatedCredential = {
  rowNumber: number
  fullName: string
  email: string
  username: string
  password: string
  role: AccountRole
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 18)
}

export function generateCredentials(rows: ImportRow[], kind: ImportKind, startSeq = Date.now() % 9000): CreatedCredential[] {
  const meta = IMPORT_KIND_META[kind]
  return rows.map((row, index) => {
    const fullName = row.values.fullName ?? ""
    return {
      rowNumber: row.rowNumber,
      fullName,
      email: row.values.email || `${slugify(fullName)}@ttnn.edu.vn`,
      username: `${meta.prefix}${startSeq + index + 1}`,
      password: `${slugify(fullName).slice(0, 4) || "user"}${String(1000 + ((startSeq + index * 137) % 8999))}`,
      role: meta.role,
    }
  })
}

/** Tải danh sách tài khoản vừa tạo kèm mật khẩu tạm. */
export async function exportCredentialsSheet(credentials: CreatedCredential[], kind: ImportKind) {
  const XLSX = await getXlsx()
  const header = ["STT", "Họ và tên", "Tên đăng nhập", "Mật khẩu tạm", "Email", "Vai trò"] as const
  const body = credentials.map((item, index) => [
    index + 1,
    item.fullName,
    item.username,
    item.password,
    item.email,
    IMPORT_KIND_META[kind].label,
  ])

  const sheet = XLSX.utils.aoa_to_sheet([
    [`TÀI KHOẢN ĐÃ TẠO – ${IMPORT_KIND_META[kind].label.toUpperCase()}`],
    [`Xuất ngày: ${formatDate(new Date())}`],
    ["Yêu cầu người dùng đổi mật khẩu tạm ở lần đăng nhập đầu tiên."],
    [],
    [...header],
    ...body,
  ])
  sheet["!cols"] = [{ wch: 5 }, { wch: 26 }, { wch: 18 }, { wch: 16 }, { wch: 32 }, { wch: 14 }]
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, "Tai khoan")
  downloadWorkbook(XLSX, workbook, `TaiKhoan_${IMPORT_KIND_META[kind].label.replace(/\s+/g, "")}.xlsx`)
}

/** Xuất bất kỳ bảng nào của khu vực quản trị. */
export async function exportAdminTable(fileName: string, sheetName: string, header: readonly string[], rows: (string | number)[][]) {
  const XLSX: typeof XLSXType = await getXlsx()
  const sheet = XLSX.utils.aoa_to_sheet([
    [`${sheetName.toUpperCase()} – [TÊN TRUNG TÂM]`],
    [`Xuất ngày: ${formatDate(new Date())}`],
    [],
    [...header],
    ...rows,
  ])
  sheet["!cols"] = header.map((column) => ({ wch: Math.max(14, Math.min(40, column.length + 8)) }))
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: header.length - 1 } },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName.slice(0, 31))
  downloadWorkbook(XLSX, workbook, `${fileName}_${formatDate(new Date()).replace(/\//g, "-")}.xlsx`)
}
