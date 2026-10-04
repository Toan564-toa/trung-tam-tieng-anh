import { Link } from "react-router-dom"
import {
  AlertCircle,
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  GraduationCap,
  MapPin,
  NotebookPen,
  Users,
  Wallet,
} from "lucide-react"
import { cn } from "cn"
import { PageHeader } from "@/components/layout/page-header"
import { StatCard } from "@/components/common/stat-card"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatDateLong, formatWeekdayShort } from "@/lib/date"
import { formatVnd } from "@/lib/format"
import {
  CLASSES,
  CLASS_META,
  CLASS_PROGRESS_TONE,
  PAYROLL,
  TEACHER_PROFILE,
  TEACHER_STUDENTS,
  TODAY,
  payrollTotals,
  scheduleText,
  todayLessonOfClass,
  weeklySchedule,
} from "@/data/teacher"

export function TeacherOverviewPage() {
  const firstName = TEACHER_PROFILE.fullName.split(" ").pop()
  const todayLessons = CLASSES.map((cls) => ({ cls, lesson: todayLessonOfClass(cls.id) })).filter(
    (item): item is { cls: (typeof CLASSES)[number]; lesson: NonNullable<ReturnType<typeof todayLessonOfClass>> } => Boolean(item.lesson),
  )

  const week = weeklySchedule()
  const totalStudents = new Set(TEACHER_STUDENTS.map((s) => s.id)).size
  const pendingMarks = CLASSES.flatMap((c) => {
    const lesson = todayLessonOfClass(c.id)
    return lesson && !lesson.marked ? [c.name] : []
  })
  const currentPayroll = PAYROLL[0]
  const payroll = payrollTotals(currentPayroll)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={formatDateLong(TODAY)}
        title={`Chào cô ${firstName}!`}
        description={`${todayLessons.length} buổi dạy hôm nay · ${totalStudents} học viên đang theo học.`}
        actions={
          <Button variant="outline" render={<Link to="/giao-vien/diem-danh" />}>
            <ClipboardCheck /> Điểm danh nhanh
          </Button>
        }
      />

      {/* Nút Điểm danh lớn — ưu tiên trên mobile vì giáo viên dùng điện thoại tại lớp */}
      {todayLessons.length > 0 ? (
        <Stagger className="flex flex-col gap-3">
          {todayLessons.map(({ cls, lesson }) => (
            <StaggerItem key={cls.id}>
              <Card hoverable className={cn(!lesson.marked && "border-2 border-brand")}>
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-brand text-ink">
                      <span className="text-[11px] font-bold">{formatWeekdayShort(lesson.date)}</span>
                      <span className="font-heading text-lg leading-none font-extrabold">{lesson.date.getDate()}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-heading text-base font-bold text-ink">{cls.name}</h2>
                        <Badge variant={CLASS_META[cls.status].badge}>{CLASS_META[cls.status].label}</Badge>
                        {lesson.marked ? (
                          <Badge variant="success"><CheckCircle2 /> Đã điểm danh</Badge>
                        ) : (
                          <Badge variant="warning"><AlertCircle /> Chưa điểm danh</Badge>
                        )}
                      </div>
                      <p className="mt-1 truncate text-sm text-ink-soft">
                        Buổi {lesson.no} · {lesson.topic}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-ink-soft">
                        <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{cls.time}</span>
                        <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{cls.room}</span>
                        <span className="inline-flex items-center gap-1"><Users className="size-3.5" />{cls.studentCount} học viên</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 sm:shrink-0">
                    <Button
                      size="lg"
                      block
                      className="min-h-14 text-base"
                      render={<Link to={`/giao-vien/diem-danh?lop=${cls.id}&buoi=${lesson.no}`} />}
                    >
                      <ClipboardCheck className="size-5" />
                      {lesson.marked ? "Xem lại điểm danh" : "Điểm danh"}
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      aria-label={`Mở lớp ${cls.name}`}
                      render={<Link to={`/giao-vien/lop-hoc/${cls.id}`} />}
                    >
                      <ArrowRight className="size-5" />
                    </Button>
                  </div>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      ) : (
        <Reveal>
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-green-100 text-success">
                <CalendarCheck className="size-7" />
              </span>
              <h2 className="font-heading text-lg font-bold text-ink">Hôm nay không có buổi dạy</h2>
              <p className="max-w-md text-sm text-ink-soft">
                Bạn có thể dùng thời gian này để chấm bài, cập nhật điểm hoặc chuẩn bị kế hoạch cho tuần sau.
              </p>
              <Button className="mt-1" render={<Link to="/giao-vien/nhap-diem" />}>
                <NotebookPen /> Nhập điểm
              </Button>
            </CardContent>
          </Card>
        </Reveal>
      )}

      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard label="Lớp đang dạy" value={String(CLASSES.length)} icon={GraduationCap} trend={{ text: `${totalStudents} học viên`, tone: "info" }} iconClass="bg-sky-100 text-sky-700" />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Buổi dạy tuần này"
            value={String(week.length)}
            icon={CalendarDays}
            trend={{ text: week.map((w) => formatWeekdayShort(new Date(2026, 9, 5 + w.weekday))).join(" · "), tone: "info" }}
            iconClass="bg-violet-100 text-violet-700"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Cần điểm danh"
            value={String(pendingMarks.length)}
            icon={ClipboardCheck}
            trend={pendingMarks.length ? { text: "Làm ngay tại lớp", tone: "warning" } : { text: "Đã đủ", tone: "success" }}
            iconClass="bg-orange-100 text-warning"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Lương tháng gần nhất"
            value={formatVnd(payroll.total)}
            icon={Wallet}
            trend={{ text: currentPayroll.month, tone: "success" }}
            iconClass="bg-green-100 text-success"
          />
        </StaggerItem>
      </Stagger>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Lịch tuần */}
        <Reveal>
          <Card className="h-full">
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>Lịch dạy trong tuần</CardTitle>
                <CardDescription>Tổng hợp các lớp bạn đang phụ trách</CardDescription>
              </div>
              <Button variant="ghost" size="sm" render={<Link to="/giao-vien/lich-trinh" />}>
                Lịch trình <ArrowRight />
              </Button>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2.5">
                {week.map((item) => (
                  <li key={`${item.classId}-${item.weekday}`} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3.5 transition-colors hover:border-brand/40">
                    <span className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-surface">
                      <span className="text-[10px] font-bold text-brand-hover">{formatWeekdayShort(new Date(2026, 9, 5 + item.weekday))}</span>
                      <span className="font-heading text-sm leading-none font-extrabold text-ink">{item.time.slice(0, 2)}h</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{item.className}</p>
                      <p className="mt-0.5 truncate text-xs text-ink-soft">
                        {item.time} · {item.room} · {item.course}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </Reveal>

        {/* Lớp đang dạy */}
        <Reveal delay={0.08}>
          <Card className="h-full">
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>Lớp đang phụ trách</CardTitle>
                <CardDescription>Tiến độ và sĩ số từng lớp</CardDescription>
              </div>
              <Button variant="ghost" size="sm" render={<Link to="/giao-vien/lop-hoc" />}>
                Tất cả <ArrowRight />
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {CLASSES.map((cls) => (
                <div key={cls.id} className="rounded-2xl border border-slate-100 p-4 transition-colors hover:border-brand/40">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{cls.name}</p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {scheduleText(cls.weekdays)} · {cls.time} · {cls.room}
                      </p>
                    </div>
                    <Badge variant={CLASS_META[cls.status].badge}>{CLASS_META[cls.status].label}</Badge>
                  </div>
                  <Progress
                    className="mt-3"
                    value={cls.doneLessons}
                    max={cls.totalLessons}
                    size="sm"
                    label={`Buổi ${cls.doneLessons}/${cls.totalLessons}`}
                    valueLabel={`${Math.round((cls.doneLessons / cls.totalLessons) * 100)}%`}
                    tone={CLASS_PROGRESS_TONE[cls.tone]}
                  />
                  <p className="mt-2 text-xs text-ink-soft">
                    {cls.studentCount}/{cls.maxStudents} học viên · Kết thúc {cls.endDate}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </Reveal>
      </div>

      {/* Việc cần làm */}
      <Reveal>
        <Card>
          <CardHeader>
            <CardTitle>Việc cần làm</CardTitle>
            <CardDescription>Các đầu việc dành riêng cho giáo viên</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction to="/giao-vien/diem-danh" icon={ClipboardCheck} title="Điểm danh" hint="Chọn lớp & buổi học" />
            <QuickAction to="/giao-vien/nhap-diem" icon={NotebookPen} title="Nhập điểm" hint="Chấm bài kiểm tra" />
            <QuickAction to="/giao-vien/bai-tap" icon={ClipboardList} title="Giao bài tập" hint="Thông báo tới lớp" />
            <QuickAction to="/giao-vien/bang-luong" icon={Wallet} title="Bảng lương" hint={`${currentPayroll.month} · ${formatVnd(payroll.total)}`} />
          </CardContent>
        </Card>
      </Reveal>
    </div>
  )
}

function QuickAction({ to, icon: Icon, title, hint }: { to: string; icon: typeof ClipboardCheck; title: string; hint: string }) {
  return (
    <Link
      to={to}
      className="flex min-h-16 items-center gap-3 rounded-2xl border border-slate-100 p-3.5 transition-all hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-soft"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-amber-700">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="block truncate text-xs text-ink-soft">{hint}</span>
      </span>
    </Link>
  )
}