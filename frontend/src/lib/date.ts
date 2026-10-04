/** Date helpers used by the client app (calendar, schedule, attendance). All dates are handled in local time. */

const WEEKDAY_SHORT = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const
const WEEKDAY_FULL = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"] as const
const MONTH_LABEL = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
] as const

/** Monday-first short weekday labels, matching the calendar grid. */
const WEEKDAY_GRID = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const

const pad = (n: number) => String(n).padStart(2, "0")

export function startOfDay(date: Date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export function addDays(date: Date, days: number) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

export function addMonths(date: Date, months: number) {
  const copy = new Date(date.getFullYear(), date.getMonth() + months, 1)
  return copy
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** 0 = Monday … 6 = Sunday */
export function weekdayIndex(date: Date) {
  return (date.getDay() + 6) % 7
}

export function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** dd/MM/yyyy */
export function formatDate(date: Date) {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
}

/** Thứ Tư, 01/10/2026 */
export function formatDateLong(date: Date) {
  return `${WEEKDAY_FULL[weekdayIndex(date)]}, ${formatDate(date)}`
}

export function formatMonthYear(date: Date) {
  return `${MONTH_LABEL[date.getMonth()]} ${date.getFullYear()}`
}

export function formatWeekdayShort(date: Date) {
  return WEEKDAY_SHORT[weekdayIndex(date)]
}

/** Tên tháng dùng để gom nhóm danh sách, ví dụ "Tháng 3 năm 2026". */
export function formatMonthName(date: Date) {
  return `${MONTH_LABEL[date.getMonth()]} năm ${date.getFullYear()}`
}

/** Nhãn cột lịch thứ Hai → Chủ Nhật. */
export const CALENDAR_WEEKDAYS = WEEKDAY_GRID

/**
 * Sinh lưới lịch 6 tuần × 7 ngày (bắt đầu từ thứ Hai) chứa ngày của tháng đang xem.
 * Các ô ngoài tháng được đánh dấu để làm mờ.
 */
export function buildMonthGrid(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const gridStart = addDays(first, -weekdayIndex(first))
  return Array.from({ length: 42 }, (_, i) => {
    const date = addDays(gridStart, i)
    return { date, inMonth: date.getMonth() === month.getMonth() }
  })
}

/** Số ngày từ `from` tới `to` (âm nếu `to` nằm trong quá khứ). */
export function daysBetween(from: Date, to: Date) {
  const a = startOfDay(from).getTime()
  const b = startOfDay(to).getTime()
  return Math.round((b - a) / 86_400_000)
}

/** "còn 3 ngày" / "đã quá hạn 2 ngày" / "hôm nay" */
export function describeDeadline(from: Date, to: Date) {
  const diff = daysBetween(from, to)
  if (diff === 0) return "Hết hạn hôm nay"
  if (diff === 1) return "Còn 1 ngày"
  if (diff > 1) return `Còn ${diff} ngày`
  if (diff === -1) return "Quá hạn 1 ngày"
  return `Quá hạn ${Math.abs(diff)} ngày`
}

export { WEEKDAY_FULL, MONTH_LABEL }