import { useMemo, useState } from "react"
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  FileText,
  Megaphone,
} from "lucide-react"
import { cn } from "cn"
import { PageHeader } from "@/components/layout/page-header"
import { StatCard } from "@/components/common/stat-card"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ANNOUNCEMENTS, ASSIGNMENTS, ASSIGNMENT_META, ENROLLMENT, type AssignmentStatus } from "@/data/student"
import { describeDeadline, formatDate } from "@/lib/date"

/** Ngày "hôm nay" của bản demo. */
const TODAY = new Date(2026, 9, 1)

const STATUS_ICON = {
  submitted: CheckCircle2,
  due: CircleDashed,
  late: CalendarClock,
  overdue: AlertTriangle,
} as const

const STATUS_STYLE = {
  submitted: "bg-green-100 text-success",
  due: "bg-slate-100 text-ink-soft",
  late: "bg-orange-100 text-warning",
  overdue: "bg-red-100 text-danger",
} as const

const TONE_CLASS = {
  info: "bg-sky-100 text-sky-700",
  success: "bg-green-100 text-success",
  warning: "bg-orange-100 text-warning",
  danger: "bg-red-100 text-danger",
} as const

const FILTERS: { value: "all" | AssignmentStatus; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "overdue", label: "Quá hạn" },
  { value: "late", label: "Sắp hết hạn" },
  { value: "due", label: "Chưa nộp" },
  { value: "submitted", label: "Đã nộp" },
]

export function StudentAssignmentsPage() {
  const [filter, setFilter] = useState<"all" | AssignmentStatus>("all")

  const filtered = useMemo(
    () => (filter === "all" ? ASSIGNMENTS : ASSIGNMENTS.filter((a) => a.status === filter)),
    [filter],
  )

  const counts = useMemo(
    () => ({
      pending: ASSIGNMENTS.filter((a) => a.status !== "submitted").length,
      urgent: ASSIGNMENTS.filter((a) => a.status === "late" || a.status === "overdue").length,
      submitted: ASSIGNMENTS.filter((a) => a.status === "submitted").length,
      total: ASSIGNMENTS.length,
    }),
    [],
  )

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const rank: Record<AssignmentStatus, number> = { overdue: 0, late: 1, due: 2, submitted: 3 }
        if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status]
        return a.dueDate.getTime() - b.dueDate.getTime()
      }),
    [filtered],
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`${ENROLLMENT.className} · ${ENROLLMENT.teacher}`}
        title="Bài tập & thông báo"
        description="Theo dõi các bài tập giáo viên giao và đọc thông báo mới từ trung tâm."
      />

      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard label="Tổng bài đã giao" value={String(counts.total)} icon={FileText} />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Chờ nộp"
            value={String(counts.pending)}
            icon={CircleDashed}
            iconClass="bg-sky-100 text-sky-700"
            trend={{ text: "Trong khóa A2", tone: "info" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Cần xử lý gấp"
            value={String(counts.urgent)}
            icon={AlertTriangle}
            iconClass="bg-orange-100 text-warning"
            trend={{ text: counts.urgent ? "Đã quá hoặc sắp hạn" : "Không có", tone: "warning" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Đã nộp"
            value={String(counts.submitted)}
            icon={CheckCircle2}
            iconClass="bg-green-100 text-success"
            trend={{ text: "Đúng hạn", tone: "success" }}
          />
        </StaggerItem>
      </Stagger>

      <Reveal>
        <Card>
          <CardHeader className="flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Danh sách bài tập</CardTitle>
              <CardDescription>Bài tập được nộp trực tiếp với giáo viên tại lớp</CardDescription>
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
          <CardContent className="flex flex-col gap-3">
            {sorted.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 py-12 text-center text-sm text-ink-soft">
                Không có bài tập nào ở trạng thái này.
              </p>
            ) : (
              sorted.map((assignment) => {
                const meta = ASSIGNMENT_META[assignment.status]
                const Icon = STATUS_ICON[assignment.status]
                return (
                  <article
                    key={assignment.id}
                    className={cn(
                      "flex flex-col gap-3 rounded-2xl border p-4 transition-colors sm:flex-row sm:items-center",
                      assignment.status === "overdue"
                        ? "border-red-100 bg-red-50/40"
                        : assignment.status === "late"
                          ? "border-orange-100 bg-orange-50/40"
                          : "border-slate-100 hover:border-brand/40",
                    )}
                  >
                    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", STATUS_STYLE[assignment.status])}>
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-ink">{assignment.title}</h3>
                        <Badge variant={meta.badge}>{meta.label}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-ink-soft">
                        {assignment.className} · Hạn nộp {formatDate(assignment.dueDate)}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-ink-soft">{assignment.note}</p>
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
                      {assignment.status === "submitted" ? (
                        <>
                          <p className="text-xs font-semibold text-success">Đã nộp {assignment.submittedAt && formatDate(assignment.submittedAt)}</p>
                          <p className="mt-0.5 text-[11px] text-ink-soft">Giáo viên sẽ trả bài tại lớp</p>
                        </>
                      ) : (
                        <p className={cn("text-xs font-semibold", assignment.status === "overdue" ? "text-danger" : "text-warning")}>
                          {describeDeadline(TODAY, assignment.dueDate)}
                        </p>
                      )}
                    </div>
                  </article>
                )
              })
            )}
            <p className="mt-1 flex items-start gap-2 rounded-xl bg-surface p-3.5 text-xs leading-relaxed text-ink-soft">
              <FileText className="mt-0.5 size-4 shrink-0" />
              Trung tâm không nhận file nộp trực tuyến. Bạn nộp bài trực tiếp tại lớp và giáo viên sẽ cập nhật trạng thái
              trong vòng 24 giờ.
            </p>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={0.08}>
        <Card>
          <CardHeader>
            <CardTitle>Thông báo</CardTitle>
            <CardDescription>Thông báo từ giáo viên và phòng hành chính</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {ANNOUNCEMENTS.map((notice) => (
                <li key={notice.id} className="flex items-start gap-4 rounded-2xl border border-slate-100 p-4 transition-colors hover:border-brand/40">
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-2xl", TONE_CLASS[notice.tone])}>
                    <Megaphone className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-ink">{notice.title}</h3>
                      <Badge variant={notice.tone}>{notice.date}</Badge>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{notice.body}</p>
                    <p className="mt-2 text-xs font-medium text-ink-soft">{notice.author}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  )
}