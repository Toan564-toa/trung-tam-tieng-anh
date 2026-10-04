import { cn } from "cn"
import { SmartImage } from "@/components/common/smart-image"
import { MARK_META, type AttendanceRecord, type MarkStatus, type TeacherStudent } from "@/data/teacher"

const MARK_ORDER: MarkStatus[] = ["present", "absent", "late", "excused"]

export type QuickMarkListProps = {
  students: TeacherStudent[]
  marks: AttendanceRecord
  onChange: (studentId: string, status: MarkStatus) => void
  /** Khóa toàn bộ danh sách (buổi đã quá hạn sửa). */
  readOnly?: boolean
  className?: string
}

/**
 * Danh sách điểm danh tối ưu cho mobile: mỗi học viên là một hàng với 4 nút
 * trạng thái lớn, bấm một chạm để đánh dấu.
 */
function QuickMarkList({ students, marks, onChange, readOnly, className }: QuickMarkListProps) {
  return (
    <ul className={cn("flex flex-col gap-2.5", className)}>
      {students.map((student, index) => {
        const current = marks[student.id]
        return (
          <li
            key={student.id}
            className={cn(
              "rounded-2xl border bg-white p-3 transition-colors sm:p-3.5",
              current === "absent" ? "border-red-200 bg-red-50/30" : current === "late" ? "border-orange-200 bg-orange-50/30" : "border-slate-100",
            )}
          >
            <div className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface font-heading text-xs font-bold text-ink-soft">
                {index + 1}
              </span>
              <SmartImage
                src={student.avatar}
                alt={student.fullName}
                className="size-10 shrink-0 rounded-full"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{student.fullName}</p>
                <p className="truncate text-xs text-ink-soft">{student.studentCode}</p>
              </div>
              {current && (
                <span className={cn("hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:block", MARK_META[current].active)}>
                  {MARK_META[current].label}
                </span>
              )}
            </div>

            {/* Nút chọn nhanh: 2 cột trên mobile, 4 cột từ sm trở lên */}
            <div className={cn("mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4", readOnly && "pointer-events-none opacity-70")}>
              {MARK_ORDER.map((status) => {
                const meta = MARK_META[status]
                const selected = current === status
                return (
                  <button
                    key={status}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onChange(student.id, status)}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-sm font-semibold transition-all active:scale-95",
                      selected
                        ? cn(meta.active, "border-transparent shadow-soft")
                        : "border-slate-200 bg-white text-ink-soft hover:border-slate-300 hover:bg-surface",
                    )}
                  >
                    <span className={cn("size-2 rounded-full", selected ? "bg-white/80" : meta.dot)} />
                    {meta.short}
                  </button>
                )
              })}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export { QuickMarkList }