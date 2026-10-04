import { Link } from "react-router-dom"
import {
  ArrowUpRight,
  BookOpen,
  CalendarCheck,
  ClipboardCheck,
  GraduationCap,
  TriangleAlert,
  UserPlus,
  Wallet,
} from "lucide-react"
import { StatCard } from "@/components/common/stat-card"
import { PageHeader } from "@/components/layout/page-header"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AttendanceRateChart, ChartFrame, ClassSizeChart, RevenueChart } from "@/components/admin/charts"
import {
  ATTENDANCE_RATE_SERIES,
  ADMIN_INVOICES,
  CLASS_SIZE_SERIES,
  DEBT_AGING,
  NEW_LEADS,
  REVENUE_SERIES,
  TODAY_LESSONS,
  invoiceRemaining,
} from "@/data/admin"
import { CENTER_CLASSES } from "@/data/staff"
import { formatVnd } from "@/lib/format"

const REVENUE_MONTH = REVENUE_SERIES[REVENUE_SERIES.length - 1]

export function AdminDashboardPage() {
  const activeStudents = CENTER_CLASSES.reduce((sum, cls) => sum + cls.studentCount, 0)
  const openClasses = CENTER_CLASSES.filter((cls) => cls.status !== "closed").length
  const overdue = ADMIN_INVOICES.filter((invoice) => invoice.status === "overdue" || invoice.status === "unpaid")
    .sort((a, b) => invoiceRemaining(b) - invoiceRemaining(a))
    .slice(0, 6)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Tổng quan trung tâm · dữ liệu 02/10/2026"
        title="Bảng điều khiển quản trị"
        description="Theo dõi sĩ số, doanh thu, công nợ và vận hành học phí trong một màn hình."
        actions={
          <>
            <Button variant="outline" render={<Link to="/admin/bao-cao" />}>
              <ArrowUpRight /> Xem báo cáo
            </Button>
            <Button render={<Link to="/admin/hoc-vien" />}>
              <UserPlus /> Thêm học viên
            </Button>
          </>
        }
      />

      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard
            label="Học viên đang học"
            value={activeStudents.toLocaleString("vi-VN")}
            icon={GraduationCap}
            trend={{ text: "+312 học viên mới tháng này", tone: "success" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Lớp đang mở"
            value={String(openClasses)}
            icon={BookOpen}
            iconClass="bg-green-100 text-success"
            trend={{ text: `${CENTER_CLASSES.filter((c) => c.studentCount >= c.maxStudents).length} lớp đã đủ chỗ`, tone: "warning" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Doanh thu tháng 10"
            value={formatVnd(REVENUE_MONTH.revenue)}
            icon={Wallet}
            iconClass="bg-sky-100 text-sky-700"
            trend={{ text: "+9,5% so với chỉ tiêu", tone: "success" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Công nợ tồn đọng"
            value={formatVnd(DEBT_AGING.reduce((sum, item) => sum + item.value, 0))}
            icon={TriangleAlert}
            iconClass="bg-red-100 text-danger"
            trend={{ text: `${ADMIN_INVOICES.filter((i) => i.status === "overdue").length} khoản quá hạn`, tone: "danger" }}
          />
        </StaggerItem>
      </Stagger>

      <div className="grid gap-6 xl:grid-cols-2">
        <Reveal>
          <ChartFrame title="Doanh thu theo tháng" description="Thực tế so với chỉ tiêu tháng (đơn vị: triệu đồng)" height={300}>
            <RevenueChart data={REVENUE_SERIES} />
          </ChartFrame>
        </Reveal>
        <Reveal delay={0.05}>
          <ChartFrame title="Sĩ số từng lớp" description="Đang học so với chỉ tiêu tối đa của lớp" height={300}>
            <ClassSizeChart data={CLASS_SIZE_SERIES} />
          </ChartFrame>
        </Reveal>
        <Reveal>
          <ChartFrame title="Tỷ lệ điểm danh" description="Cảnh báo đỏ khi dưới 80% vài buổi gần đây" height={300}>
            <AttendanceRateChart data={ATTENDANCE_RATE_SERIES} />
          </ChartFrame>
        </Reveal>
        <Reveal delay={0.05}>
          <ChartFrame title="Cơ cấu công nợ theo thời gian" description="Phân bổ số nợ còn lại theo số ngày quá hạn" height={300}>
            <div className="flex h-full flex-col justify-center gap-4">
              {DEBT_AGING.map((item) => {
                const total = DEBT_AGING.reduce((sum, entry) => sum + entry.value, 0)
                const percent = Math.round((item.value / total) * 100)
                return (
                  <div key={item.bucket} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-ink-soft">{item.bucket}</span>
                      <span className="font-semibold tabular-nums text-ink">
                        {formatVnd(item.value)} · {percent}%
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-surface">
                      <div
                        className="h-full rounded-full bg-danger/80"
                        style={{ width: `${percent}%` }}
                        role="presentation"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </ChartFrame>
        </Reveal>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Reveal>
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle>Buổi học hôm nay</CardTitle>
                <CardDescription>Trạng thái điểm danh và tiến độ buổi học</CardDescription>
              </div>
              <Button variant="ghost" size="sm" render={<Link to="/admin/diem-danh" />}>
                <ClipboardCheck /> Điểm danh
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                    <tr>
                      <th scope="col" className="px-3 py-2.5">Lớp</th>
                      <th scope="col" className="px-3 py-2.5">Thời gian</th>
                      <th scope="col" className="px-3 py-2.5">Phòng</th>
                      <th scope="col" className="px-3 py-2.5 text-right">Sĩ số</th>
                      <th scope="col" className="px-3 py-2.5">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {TODAY_LESSONS.map((lesson) => (
                      <tr key={lesson.classId} className="transition-colors hover:bg-surface">
                        <td className="px-3 py-3 font-semibold text-ink">{lesson.className}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{lesson.time}</td>
                        <td className="px-3 py-3 text-ink-soft">{lesson.room}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-ink">{lesson.studentCount}</td>
                        <td className="px-3 py-3">
                          <Badge variant={lesson.status === "done" ? "success" : lesson.status === "ongoing" ? "warning" : "neutral"}>
                            {lesson.status === "done" ? "Đã điểm danh" : lesson.status === "ongoing" ? "Đang học" : "Sắp diễn ra"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </Reveal>

        <div className="flex flex-col gap-6">
          <Reveal delay={0.05}>
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle>Công nợ cần xử lý</CardTitle>
                  <CardDescription>Học phí chưa thu / quá hạn</CardDescription>
                </div>
                <Button variant="ghost" size="sm" render={<Link to="/admin/hoc-phi" />}>
                  <Wallet /> Thu học phí
                </Button>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {overdue.map((invoice) => (
                    <li key={invoice.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3.5 py-2.5">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">{invoice.studentName}</span>
                        <span className="block truncate text-xs text-ink-soft">
                          {invoice.className} · {invoice.kind} · hạn {invoice.dueDate}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-heading text-sm font-extrabold text-danger tabular-nums">
                          {formatVnd(invoiceRemaining(invoice))}
                        </span>
                        <Badge variant={invoice.status === "overdue" ? "danger" : "warning"}>
                          {invoice.status === "overdue" ? "Quá hạn" : "Chưa thu"}
                        </Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.1}>
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle>Khách mới từ tư vấn</CardTitle>
                  <CardDescription>Chuyển sang ghi danh trước khi hết hạn</CardDescription>
                </div>
                <Button variant="ghost" size="sm" render={<Link to="/admin/bao-cao" />}>
                  <CalendarCheck /> Hiệu quả tuyển sinh
                </Button>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {NEW_LEADS.slice(0, 4).map((lead) => (
                    <li key={lead.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3.5 py-2.5">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">{lead.fullName}</span>
                        <span className="block truncate text-xs text-ink-soft">
                          {lead.source} · {lead.phone}
                        </span>
                      </span>
                      <Badge variant="info">{lead.expectedFee ? formatVnd(lead.expectedFee) : "—"}</Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
