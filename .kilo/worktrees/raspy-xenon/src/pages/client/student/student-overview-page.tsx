import { Link } from "react-router-dom"
import {
  ArrowRight,
  Bell,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  GraduationCap,
  MapPin,
  Megaphone,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"
import { cn } from "cn"
import { PageHeader } from "@/components/layout/page-header"
import { StatCard } from "@/components/common/stat-card"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/lib/auth/auth-context"
import { formatVnd } from "@/lib/format"
import { daysBetween, formatDate, formatWeekdayShort } from "@/lib/date"
import {
  ANNOUNCEMENTS,
  ASSIGNMENTS,
  ASSIGNMENT_META,
  ATTENDANCE_STATS,
  ENROLLMENT,
  SCORE_AVERAGE,
  TUITION,
  UPCOMING_LESSONS,
} from "@/data/student"

/** Ngày "hôm nay" của bản demo, cố định để dữ liệu mẫu nhất quán. */
const TODAY = new Date(2026, 9, 1)

const TONE_CLASS = {
  info: "bg-sky-100 text-sky-700",
  success: "bg-green-100 text-success",
  warning: "bg-orange-100 text-warning",
  danger: "bg-red-100 text-danger",
} as const

export function StudentOverviewPage() {
  const { user } = useAuth()
  const firstName = user?.name.split(" ").pop() ?? "bạn"

  const percentDone = Math.round((ENROLLMENT.attendedLessons / ENROLLMENT.totalLessons) * 100)
  const remainingDays = daysBetween(TODAY, ENROLLMENT.estimatedCompletion)
  const pendingAssignments = ASSIGNMENTS.filter((a) => a.status !== "submitted")
  const urgentAssignments = pendingAssignments
    .filter((a) => a.status === "late" || a.status === "overdue")
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
  const latestAnnouncements = ANNOUNCEMENTS.slice(0, 3)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`${ENROLLMENT.className} · ${ENROLLMENT.courseName}`}
        title={`Xin chào, ${firstName}! 👋`}
        description="Tóm tắt tiến độ học tập, lịch học sắp tới và các thông báo mới nhất của bạn."
        actions={
          <>
            <Button variant="outline" render={<Link to="/hoc-vien/lich-trinh" />}>
              <CalendarDays /> Lịch trình
            </Button>
            <Button render={<Link to="/hoc-vien/bai-tap" />}>
              <Bell /> Bài tập ({pendingAssignments.length})
            </Button>
          </>
        }
      />

      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard
            label="Buổi đã học"
            value={`${ENROLLMENT.attendedLessons}/${ENROLLMENT.totalLessons}`}
            icon={CalendarDays}
            trend={{ text: "Đúng tiến độ", tone: "success" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Bài tập chờ nộp"
            value={String(pendingAssignments.length)}
            icon={Bell}
            trend={urgentAssignments.length ? { text: `${urgentAssignments.length} bài cần gấp`, tone: "warning" } : { text: "Đã nộp đủ", tone: "success" }}
            iconClass="bg-orange-100 text-warning"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Điểm trung bình"
            value={SCORE_AVERAGE.toFixed(1)}
            icon={TrendingUp}
            trend={{ text: "Trên thang điểm 10", tone: "info" }}
            iconClass="bg-sky-100 text-sky-700"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Học phí còn nợ"
            value={formatVnd(TUITION.remaining)}
            icon={CreditCard}
            trend={{ text: `Hạn ${formatDate(TUITION.nextDueDate)}`, tone: "warning" }}
            iconClass="bg-red-100 text-danger"
          />
        </StaggerItem>
      </Stagger>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Tiến độ học tập */}
        <Reveal className="xl:col-span-2">
          <Card className="h-full overflow-hidden">
            <div className="relative bg-brand p-6 sm:p-7">
              <div className="absolute -top-12 -right-12 size-48 rounded-full bg-white/25" aria-hidden="true" />
              <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-ink/70">Tiến độ khóa học</p>
                  <p className="font-heading text-3xl font-extrabold text-ink">
                    Đã học {ENROLLMENT.attendedLessons}/{ENROLLMENT.totalLessons} buổi
                  </p>
                  <p className="mt-1 text-sm text-ink/75">
                    {percentDone}% khóa học · Còn {ENROLLMENT.totalLessons - ENROLLMENT.attendedLessons} buổi
                  </p>
                </div>
                <Badge variant="dark">Dự kiến hoàn thành {formatDate(ENROLLMENT.estimatedCompletion)}</Badge>
              </div>
              <Progress value={percentDone} size="lg" className="relative mt-6" hideValue tone="success" />
              <div className="relative mt-2 flex justify-between text-xs font-medium text-ink/70">
                <span>Khai giảng {formatDate(ENROLLMENT.startDate)}</span>
                <span>Còn khoảng {remainingDays} ngày</span>
              </div>
            </div>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <InfoTile icon={GraduationCap} label="Lớp học" value={ENROLLMENT.className} />
              <InfoTile icon={Clock} label="Lịch học" value={ENROLLMENT.schedule} />
              <InfoTile icon={MapPin} label="Phòng học" value={ENROLLMENT.room} />
            </CardContent>
          </Card>
        </Reveal>

        {/* Tỷ lệ điểm danh */}
        <Reveal delay={0.08}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Tỷ lệ điểm danh</CardTitle>
              <CardDescription>Trong {ATTENDANCE_STATS.total} buổi đã học</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Progress value={ATTENDANCE_STATS.rate} size="lg" label="Tổng thể" tone={ATTENDANCE_STATS.rate >= 80 ? "success" : "warning"} />
              <ul className="grid grid-cols-2 gap-3">
                <MiniStat label="Có mặt" value={ATTENDANCE_STATS.present} tone="text-success" />
                <MiniStat label="Muộn" value={ATTENDANCE_STATS.late} tone="text-warning" />
                <MiniStat label="Vắng" value={ATTENDANCE_STATS.absent} tone="text-danger" />
                <MiniStat label="Có phép" value={ATTENDANCE_STATS.excused} tone="text-sky-600" />
              </ul>
              <Button variant="outline" size="sm" block render={<Link to="/hoc-vien/thoi-gian-hoc" />}>
                Xem chi tiết thời gian học <ArrowRight />
              </Button>
            </CardContent>
          </Card>
        </Reveal>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Buổi học sắp tới */}
        <Reveal>
          <Card className="h-full">
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>Buổi học sắp tới</CardTitle>
                <CardDescription>Lịch học tuần tới của bạn</CardDescription>
              </div>
              <Button variant="ghost" size="sm" render={<Link to="/hoc-vien/lich-trinh" />}>
                Xem lịch <ArrowRight />
              </Button>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3">
                {UPCOMING_LESSONS.map((lesson) => {
                  const diff = daysBetween(TODAY, lesson.date)
                  return (
                    <li key={lesson.no} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-surface p-3.5 transition-colors hover:border-brand/40">
                      <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-white shadow-soft">
                        <span className="text-[11px] font-bold text-brand-hover">{formatWeekdayShort(lesson.date)}</span>
                        <span className="font-heading text-lg leading-none font-extrabold text-ink">{lesson.date.getDate()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">
                          Buổi {lesson.no} · {lesson.topic}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-ink-soft">
                          {lesson.unit} · {lesson.time} · {ENROLLMENT.room}
                        </p>
                      </div>
                      <Badge variant={diff <= 3 ? "warning" : "neutral"}>{diff === 1 ? "Ngày mai" : `${diff} ngày nữa`}</Badge>
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>
        </Reveal>

        {/* Bài tập sắp đến hạn */}
        <Reveal delay={0.08}>
          <Card className="h-full">
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>Bài tập sắp đến hạn</CardTitle>
                <CardDescription>{pendingAssignments.length} bài đang chờ bạn hoàn thành</CardDescription>
              </div>
              <Button variant="ghost" size="sm" render={<Link to="/hoc-vien/bai-tap" />}>
                Tất cả <ArrowRight />
              </Button>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3">
                {pendingAssignments.slice(0, 4).map((assignment) => {
                  const meta = ASSIGNMENT_META[assignment.status]
                  const diff = daysBetween(TODAY, assignment.dueDate)
                  return (
                    <li key={assignment.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-surface p-3.5">
                      <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl", TONE_CLASS[meta.badge === "danger" ? "danger" : meta.badge === "warning" ? "warning" : "info"])}>
                        <CalendarClock className="size-4.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{assignment.title}</p>
                        <p className="mt-0.5 text-xs text-ink-soft">
                          Hạn nộp {formatDate(assignment.dueDate)} · {diff < 0 ? `quá hạn ${Math.abs(diff)} ngày` : `còn ${diff} ngày`}
                        </p>
                      </div>
                      <Badge variant={meta.badge}>{meta.label}</Badge>
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>
        </Reveal>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Học phí */}
        <Reveal>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Học phí</CardTitle>
              <CardDescription>{TUITION.nextDueLabel}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="rounded-2xl bg-surface p-4">
                <p className="text-xs font-medium text-ink-soft">Còn phải đóng</p>
                <p className="mt-1 font-heading text-2xl font-extrabold text-danger">{formatVnd(TUITION.remaining)}</p>
                <p className="mt-1 text-xs text-ink-soft">Đến hạn {formatDate(TUITION.nextDueDate)}</p>
              </div>
              <Progress
                value={TUITION.paid}
                max={TUITION.total}
                tone="success"
                label="Đã đóng"
                valueLabel={`${formatVnd(TUITION.paid)} / ${formatVnd(TUITION.total)}`}
              />
              <Button variant="outline" size="sm" block render={<Link to="/hoc-vien/hoc-phi" />}>
                Xem chi tiết học phí <ArrowRight />
              </Button>
            </CardContent>
          </Card>
        </Reveal>

        {/* Thông báo mới nhất */}
        <Reveal delay={0.08} className="xl:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>Thông báo mới nhất</CardTitle>
                <CardDescription>Thông báo từ giáo viên và trung tâm</CardDescription>
              </div>
              <Button variant="ghost" size="sm" render={<Link to="/hoc-vien/bai-tap" />}>
                Tất cả <ArrowRight />
              </Button>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3">
                {latestAnnouncements.map((notice) => (
                  <li key={notice.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-surface p-3.5">
                    <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl", TONE_CLASS[notice.tone])}>
                      <Megaphone className="size-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{notice.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-soft">{notice.body}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{notice.date} · {notice.author}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </Reveal>
      </div>

      <Reveal>
        <div className="flex flex-col items-start gap-4 rounded-3xl border border-dashed border-slate-300 bg-white p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-amber-700">
              <CheckCircle2 className="size-6" />
            </span>
            <div>
              <h2 className="font-heading text-lg font-bold text-ink">Bạn cần cập nhật thông tin?</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Nếu thay đổi số điện thoại, email hoặc địa chỉ, hãy gửi yêu cầu để phòng Hành chính hỗ trợ.
              </p>
            </div>
          </div>
          <Button variant="outline" render={<Link to="/hoc-vien/thong-tin-ca-nhan" />}>
            Gửi yêu cầu chỉnh sửa <ArrowRight />
          </Button>
        </div>
      </Reveal>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Thành phần nhỏ
 * ------------------------------------------------------------------ */

function InfoTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-surface p-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-amber-700">
        <Icon className="size-4.5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink-soft">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-ink">{value}</p>
      </div>
    </div>
  )
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <li className="rounded-2xl border border-slate-100 p-3">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className={cn("font-heading mt-0.5 text-lg font-extrabold", tone)}>{value}</p>
    </li>
  )
}