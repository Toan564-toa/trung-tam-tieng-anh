import { useMemo, useState } from "react"
import { CalendarCheck, CalendarRange, CheckCircle2, Download, Percent, UserX } from "lucide-react"
import { cn } from "cn"
import { PageHeader } from "@/components/layout/page-header"
import { StatCard } from "@/components/common/stat-card"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ATTENDANCE_META, ATTENDANCE_STATS, ENROLLMENT, LESSONS, type AttendanceStatus, type Lesson } from "@/data/student"
import { formatDate, formatMonthName, formatWeekdayShort } from "@/lib/date"

const FILTERS: { value: "all" | AttendanceStatus; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "present", label: "Có mặt" },
  { value: "late", label: "Muộn" },
  { value: "excused", label: "Có phép" },
  { value: "absent", label: "Vắng" },
  { value: "upcoming", label: "Chưa học" },
]

const STATUS_ROW = {
  present: "border-l-success",
  late: "border-l-warning",
  excused: "border-l-sky-accent",
  absent: "border-l-danger",
  upcoming: "border-l-slate-200",
} as const

export function StudentAttendancePage() {
  const [filter, setFilter] = useState<"all" | AttendanceStatus>("all")

  const filtered = useMemo(
    () => (filter === "all" ? LESSONS : LESSONS.filter((l) => l.status === filter)),
    [filter],
  )

  /** Gom 64 buổi học theo tháng để hiển thị dạng nhóm. */
  const groups = useMemo(() => {
    const map = new Map<string, Lesson[]>()
    for (const lesson of filtered) {
      const key = formatMonthName(lesson.date)
      const list = map.get(key)
      if (list) list.push(lesson)
      else map.set(key, [lesson])
    }
    return [...map.entries()]
  }, [filtered])

  const doneCount = ATTENDANCE_STATS.total

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`${ENROLLMENT.className} · ${ENROLLMENT.teacher}`}
        title="Thời gian học"
        description={`Toàn bộ ${ENROLLMENT.totalLessons} buổi học của khóa, trạng thái điểm danh của từng buổi.`}
        actions={
          <Button variant="outline" size="sm">
            <Download /> Xuất bảng điểm danh
          </Button>
        }
      />

      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard label="Buổi đã học" value={`${doneCount}/${ENROLLMENT.totalLessons}`} icon={CalendarCheck} trend={{ text: "Hoàn thành 37%", tone: "info" }} iconClass="bg-sky-100 text-sky-700" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Tỷ lệ tham dự" value={`${ATTENDANCE_STATS.rate}%`} icon={Percent} trend={{ text: ATTENDANCE_STATS.rate >= 80 ? "Đạt yêu cầu" : "Cần cải thiện", tone: ATTENDANCE_STATS.rate >= 80 ? "success" : "warning" }} iconClass="bg-green-100 text-success" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Số buổi vắng" value={String(ATTENDANCE_STATS.absent)} icon={UserX} trend={{ text: "Cần báo lại phòng hành chính", tone: "danger" }} iconClass="bg-red-100 text-danger" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Số buổi chưa học" value={String(ATTENDANCE_STATS.total === ENROLLMENT.totalLessons ? ENROLLMENT.totalLessons - doneCount : 0)} icon={CalendarRange} iconClass="bg-slate-100 text-ink-soft" />
        </StaggerItem>
      </Stagger>

      <Reveal>
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="grid gap-5 sm:grid-cols-[200px_1fr] sm:items-center">
              <Progress
                value={ATTENDANCE_STATS.rate}
                size="lg"
                tone={ATTENDANCE_STATS.rate >= 80 ? "success" : "warning"}
                label="Tỷ lệ tham dự chung"
                valueLabel={`${ATTENDANCE_STATS.rate}%`}
              />
              <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {(Object.entries(ATTENDANCE_META) as [AttendanceStatus, (typeof ATTENDANCE_META)[AttendanceStatus]][])
                  .filter(([status]) => status !== "upcoming")
                  .map(([status, meta]) => {
                    const count = ATTENDANCE_STATS[status as "present" | "late" | "excused" | "absent"]
                    return (
                      <li key={status} className="rounded-xl border border-slate-100 p-3">
                        <p className="text-xs text-ink-soft">{meta.label}</p>
                        <p className="font-heading mt-0.5 text-lg font-extrabold text-ink tabular-nums">{count}</p>
                      </li>
                    )
                  })}
              </ul>
            </div>
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-cream p-3.5 text-xs leading-relaxed text-ink-soft">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
              Học viên cần tham dự tối thiểu 80% tổng số buổi học để được xét cấp chứng nhận hoàn thành khóa học.
            </p>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal>
        <Card>
          <CardHeader className="flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Danh sách buổi học</CardTitle>
              <CardDescription>Gom theo tháng, từ buổi 1 đến buổi {ENROLLMENT.totalLessons}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={cn(
                    "cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                    filter === option.value ? "bg-brand text-ink shadow-glow" : "bg-surface text-ink-soft hover:bg-cream",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {groups.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 py-12 text-center text-sm text-ink-soft">
                Không có buổi học nào ở trạng thái này.
              </p>
            ) : (
              groups.map(([month, lessons]) => (
                <section key={month}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="font-heading text-sm font-bold text-ink">{month}</h3>
                    <Badge variant="neutral">{lessons.length} buổi</Badge>
                  </div>
                  <ul className="grid gap-2 lg:grid-cols-2">
                    {lessons.map((lesson) => {
                      const meta = ATTENDANCE_META[lesson.status]
                      return (
                        <li
                          key={lesson.no}
                          className={cn(
                            "flex items-center gap-3 rounded-2xl border border-slate-100 border-l-4 bg-white p-3 transition-colors hover:border-brand/40 hover:bg-cream/25",
                            STATUS_ROW[lesson.status],
                          )}
                        >
                          <span className="flex size-10 shrink-0 flex-col items-center justify-center rounded-xl bg-surface">
                            <span className="text-[10px] font-bold text-brand-hover">{formatWeekdayShort(lesson.date)}</span>
                            <span className="font-heading text-sm leading-none font-extrabold text-ink">{lesson.date.getDate()}</span>
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ink">
                              Buổi {lesson.no} · {lesson.topic}
                            </p>
                            <p className="mt-0.5 text-xs text-ink-soft">
                              {formatDate(lesson.date)} · {lesson.time}
                            </p>
                          </div>
                          <Badge variant={meta.badge} className="shrink-0">
                            {meta.label}
                          </Badge>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))
            )}
          </CardContent>
        </Card>
      </Reveal>
    </div>
  )
}