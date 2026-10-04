import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  AlarmClock,
  ArrowRight,
  BadgeCheck,
  Banknote,
  CalendarCheck,
  CalendarClock,
  Check,
  ClipboardCheck,
  CreditCard,
  Megaphone,
  MessageSquare,
  Phone,
  TrendingUp,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react"
import { cn } from "cn"
import { PageHeader } from "@/components/layout/page-header"
import { StatCard } from "@/components/common/stat-card"
import { Reveal } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/toast"
import { formatDate } from "@/lib/date"
import { formatVnd } from "@/lib/format"
import {
  LEAD_SOURCE_META,
  STAFF_PROFILE,
  STAFF_STUDENTS,
  STAFF_TODAY,
  TODAY_TASKS,
  TASK_TYPE_META,
  classNameOf,
  collectedToday,
  leadConversionRate,
  newLeads,
  overdueStudents,
  paymentsToday,
  type StaffTask,
} from "@/data/staff"

export function StaffOverviewPage() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<StaffTask[]>(TODAY_TASKS)

  const leads = newLeads()
  const overdue = overdueStudents()
  const payments = paymentsToday()
  const collected = collectedToday()
  const doneCount = tasks.filter((t) => t.done).length
  const totalDebt = overdue.reduce((sum, student) => sum + student.tuition.remaining, 0)
  const firstName = STAFF_PROFILE.fullName.split(" ").pop()

  const toggleTask = (id: string) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, done: !task.done } : task)))
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`Thứ Sáu, ${formatDate(STAFF_TODAY)}`}
        title={`Chào ${firstName}, hôm nay làm gì?`}
        description="Tổng quan việc cần xử lý: khách mới, học phí quá hạn và các khoản thu trong ngày."
        actions={
          <>
            <Button variant="outline" render={<Link to="/nhan-vien/hoc-phi" />}>
              <CreditCard /> Thu học phí
            </Button>
            <Button render={<Link to="/nhan-vien/ghi-danh" />}>
              <UserPlus /> Ghi danh học viên
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Khách mới hôm nay"
          value={String(leads.length)}
          icon={MessageSquare}
          trend={leads.length ? { text: "Cần gọi trong 24 giờ", tone: "warning" } : { text: "Đã gọi hết", tone: "success" }}
          iconClass="bg-sky-100 text-sky-700"
        />
        <StatCard
          label="Học phí quá hạn"
          value={formatVnd(totalDebt)}
          icon={AlarmClock}
          trend={{ text: `${overdue.length} học viên`, tone: overdue.length ? "danger" : "success" }}
          iconClass="bg-red-100 text-danger"
        />
        <StatCard
          label="Đã thu hôm nay"
          value={formatVnd(collected)}
          icon={Banknote}
          trend={{ text: `${payments.length} phiếu thu`, tone: "success" }}
          iconClass="bg-green-100 text-success"
        />
        <StatCard
          label="Tỷ lệ chuyển đổi"
          value={`${leadConversionRate()}%`}
          icon={TrendingUp}
          trend={{ text: "Khách đã chốt", tone: "info" }}
          iconClass="bg-brand-soft text-amber-700"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="flex flex-col gap-6">
          {/* Việc cần làm hôm nay */}
          <Reveal>
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>Việc cần làm hôm nay</CardTitle>
                  <CardDescription>
                    {doneCount}/{tasks.length} nhiệm vụ đã hoàn thành
                  </CardDescription>
                </div>
                <Badge variant={doneCount === tasks.length ? "success" : "warning"}>
                  {Math.round((doneCount / tasks.length) * 100)}%
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Progress value={doneCount} max={tasks.length} size="sm" hideValue />
                <ul className="flex flex-col gap-2">
                  {tasks.map((task) => {
                    const meta = TASK_TYPE_META[task.type]
                    return (
                      <li key={task.id}>
                        <button
                          type="button"
                          onClick={() => toggleTask(task.id)}
                          className={cn(
                            "flex w-full cursor-pointer items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors",
                            task.done ? "border-slate-100 bg-surface/60" : "border-slate-100 hover:border-brand/40 hover:bg-cream/40",
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg border transition-colors",
                              task.done ? "border-success bg-success text-white" : "border-slate-300 bg-white",
                            )}
                          >
                            {task.done && <Check className="size-4" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className={cn("text-sm font-semibold", task.done ? "text-ink-soft line-through" : "text-ink")}>
                                {task.title}
                              </span>
                              <Badge variant={meta.tone} className="shrink-0">{meta.label}</Badge>
                            </span>
                            <span className="mt-0.5 block text-xs text-ink-soft">{task.detail}</span>
                          </span>
                          <span className="shrink-0 text-xs font-semibold tabular-nums text-ink-soft">{task.time}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.success("Đã lưu tiến độ công việc trong ngày")}
                >
                  <ClipboardCheck /> Lưu tiến độ
                </Button>
              </CardContent>
            </Card>
          </Reveal>

          {/* Học phí quá hạn */}
          <Reveal delay={0.06}>
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>Học phí quá hạn</CardTitle>
                  <CardDescription>{overdue.length} học viên cần nhắc trong hôm nay</CardDescription>
                </div>
                <Button variant="ghost" size="sm" render={<Link to="/nhan-vien/hoc-phi" />}>
                  Xem tất cả <ArrowRight />
                </Button>
              </CardHeader>
              <CardContent className="flex flex-col gap-2.5">
                {overdue.slice(0, 5).map((student) => (
                  <div key={student.id} className="flex flex-col gap-2 rounded-2xl border border-slate-100 p-3.5 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{student.fullName}</p>
                      <p className="truncate text-xs text-ink-soft">
                        {classNameOf(student.classId)} · Hạn {formatDate(student.tuition.dueDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-heading shrink-0 text-sm font-extrabold text-danger tabular-nums">
                        {formatVnd(student.tuition.remaining)}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        render={<a href={`tel:${student.guardian.phone.replace(/ /g, "")}`} />}
                      >
                        <Phone /> Nhắc phụ huynh
                      </Button>
                    </div>
                  </div>
                ))}
                {overdue.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-slate-300 py-10 text-center text-sm text-ink-soft">
                    Không có học phí quá hạn. Tuyệt vời!
                  </p>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </div>

        <div className="flex flex-col gap-6">
          {/* Khách mới cần gọi */}
          <Reveal delay={0.1}>
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>Khách mới cần gọi</CardTitle>
                  <CardDescription>Từ website, fanpage và giới thiệu</CardDescription>
                </div>
                <Badge variant="info">{leads.length}</Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-2.5">
                {leads.slice(0, 4).map((lead) => (
                  <div key={lead.id} className="rounded-2xl border border-slate-100 p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{lead.fullName}</p>
                        <p className="truncate text-xs text-ink-soft">{classNameOf(lead.interestedClassId)}</p>
                      </div>
                      <Badge variant={LEAD_SOURCE_META[lead.source].badge} className="shrink-0">{lead.source}</Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        render={<a href={`tel:${lead.phone.replace(/ /g, "")}`} />}
                      >
                        <Phone /> {lead.phone}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => navigate("/nhan-vien/khach-tiem-nang")}>
                        Kanban <ArrowRight />
                      </Button>
                    </div>
                  </div>
                ))}
                {leads.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-slate-300 py-10 text-center text-sm text-ink-soft">
                    Không có khách mới.
                  </p>
                )}
              </CardContent>
            </Card>
          </Reveal>

          {/* Đã thu hôm nay */}
          <Reveal delay={0.16}>
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>Đã thu trong ngày</CardTitle>
                  <CardDescription>{formatVnd(collected)} · {payments.length} phiếu</CardDescription>
                </div>
                <Badge variant="success">Hôm nay</Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {payments.map((payment) => {
                  const student = STAFF_STUDENTS.find((s) => s.id === payment.studentId)
                  return (
                    <div key={payment.id} className="flex items-center gap-3 rounded-xl bg-surface p-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-success">
                        <BadgeCheck className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{student?.fullName ?? "Học viên"}</p>
                        <p className="truncate text-xs text-ink-soft">
                          {payment.method} · {payment.receiptNo}
                        </p>
                      </div>
                      <p className="font-heading shrink-0 text-sm font-extrabold text-success tabular-nums">
                        {formatVnd(payment.amount)}
                      </p>
                    </div>
                  )
                })}
                <Button variant="ghost" size="sm" render={<Link to="/nhan-vien/hoc-phi" />}>
                  Mở sổ thu <ArrowRight />
                </Button>
              </CardContent>
            </Card>
          </Reveal>

          {/* Lịch sắp tới cần chuẩn bị */}
          <Reveal delay={0.22}>
            <Card>
              <CardHeader>
                <CardTitle>Hôm nay của nhân viên</CardTitle>
                <CardDescription>Dữ liệu bạn phụ trách</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <MiniStat icon={Users} label="Học viên" value={String(STAFF_STUDENTS.length)} />
                <MiniStat icon={CreditCard} label="Phiếu thu hôm nay" value={String(payments.length)} />
                <MiniStat icon={CalendarCheck} label="Đang theo dõi" value={String(STAFF_STUDENTS.filter((s) => s.staffId === STAFF_PROFILE.id).length)} />
                <MiniStat icon={CalendarClock} label="Hẹn gọi lại" value={String(newLeads().length)} />
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>

      {/* Thao tác nhanh */}
      <Reveal delay={0.28}>
        <Card>
          <CardHeader>
            <CardTitle>Thao tác nhanh</CardTitle>
            <CardDescription>Các việc thường làm trong ngày</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction to="/nhan-vien/hoc-vien" icon={Users} title="Tra cứu học viên" hint="Tìm theo tên, mã, SĐT" />
            <QuickAction to="/nhan-vien/khach-tiem-nang" icon={MessageSquare} title="Bảng tư vấn" hint="Kéo thẻ đổi trạng thái" />
            <QuickAction to="/nhan-vien/lich-trinh" icon={CalendarClock} title="Lịch trung tâm" hint="Tạo sự kiện toàn trung tâm" />
            <QuickAction to="/nhan-vien/bai-dang" icon={Megaphone} title="Đăng bài mới" hint="Hiển thị lên trang chủ" />
          </CardContent>
        </Card>
      </Reveal>
    </div>
  )
}

function MiniStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface p-3.5">
      <Icon className="size-4 text-brand-hover" />
      <p className="font-heading mt-1.5 text-lg font-extrabold text-ink tabular-nums">{value}</p>
      <p className="text-xs text-ink-soft">{label}</p>
    </div>
  )
}

function QuickAction({ to, icon: Icon, title, hint }: { to: string; icon: LucideIcon; title: string; hint: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl border border-slate-100 p-4 transition-all hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-soft"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-amber-700">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-ink">{title}</span>
        <span className="block truncate text-xs text-ink-soft">{hint}</span>
      </span>
    </Link>
  )
}