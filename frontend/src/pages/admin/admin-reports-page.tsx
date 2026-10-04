import { useMemo, useState } from "react"
import { AlertTriangle, Banknote, CalendarRange, Download, GraduationCap, Target, TrendingUp, UserPlus } from "lucide-react"
import {
  AttendanceRateChart,
  ChartFrame,
  EnrollmentChart,
  FunnelChart,
  RevenueChart,
  SharePieChart,
} from "@/components/admin/charts"
import { TableEmpty, TableToolbar, ToolbarSelect } from "@/components/admin/table-toolbar"
import { StatCard } from "@/components/common/stat-card"
import { PageHeader } from "@/components/layout/page-header"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import {
  ADMIN_INVOICES,
  ATTENDANCE_SUMMARIES,
  DEBT_AGING,
  ENROLLMENT_SERIES,
  FUNNEL_SERIES,
  INVOICE_STATUS_META,
  RECRUIT_SUMMARY,
  REVENUE_SERIES,
  SOURCE_SERIES,
  attendanceRate,
  classAttendanceRows,
  invoiceRemaining,
} from "@/data/admin"
import { CENTER_CLASSES } from "@/data/staff"
import { exportAdminTable } from "@/lib/admin-excel"
import { formatDate, toDateKey } from "@/lib/date"
import { formatVnd } from "@/lib/format"

const REPORTS = [
  { value: "revenue", label: "Doanh thu" },
  { value: "debt", label: "Công nợ" },
  { value: "enrollment", label: "Sĩ số" },
  { value: "attendance", label: "Chuyên cần" },
  { value: "recruitment", label: "Hiệu quả tuyển sinh" },
] as const

type ReportKey = (typeof REPORTS)[number]["value"]

const SERIES_YEAR = 2026
const SERIES_START_MONTH = 4
const ATTENDANCE_THRESHOLD = 85

function monthStartOf(index: number) {
  return new Date(SERIES_YEAR, SERIES_START_MONTH - 1 + index, 1)
}

function fromDateInput(value: string) {
  if (!value) return ""
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return ""
  return formatDate(new Date(year, month - 1, day))
}

function monthsInRange<T>(list: T[], from: string, to: string) {
  if (from && to && from > to) return []
  return list.filter((_, index) => {
    const start = monthStartOf(index)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
    const startKey = toDateKey(start)
    const endKey = toDateKey(end)
    if (from && endKey < from) return false
    if (to && startKey > to) return false
    return true
  })
}

export function AdminReportsPage() {
  const [fromInput, setFromInput] = useState("2026-10-01")
  const [toInput, setToInput] = useState("2026-10-02")
  const [report, setReport] = useState<ReportKey>("revenue")

  const from = fromInput
  const to = toInput
  const invalidRange = Boolean(from && to && from > to)

  const revenueRows = useMemo(() => monthsInRange(REVENUE_SERIES, from, to), [from, to])

  const enrollmentRows = useMemo(() => monthsInRange(ENROLLMENT_SERIES, from, to), [from, to])

  const revenueTotal = revenueRows.reduce((sum, item) => sum + item.revenue, 0)
  const revenueTarget = revenueRows.reduce((sum, item) => sum + item.target, 0)

  const shareMix = useMemo(() => {
    const map = new Map<string, number>()
    for (const invoice of ADMIN_INVOICES) {
      map.set(invoice.kind, (map.get(invoice.kind) ?? 0) + invoice.paid)
    }
    return [...map.entries()].map(([name, value]) => ({ name, value }))
  }, [])

  const debtors = useMemo(() => {
    const map = new Map<string, { studentName: string; className: string; remaining: number; status: string }>()
    for (const invoice of ADMIN_INVOICES) {
      const remaining = invoiceRemaining(invoice)
      if (remaining <= 0) continue
      const found = map.get(invoice.studentId)
      if (found) {
        found.remaining += remaining
        continue
      }
      map.set(invoice.studentId, {
        studentName: invoice.studentName,
        className: invoice.className,
        remaining,
        status: INVOICE_STATUS_META[invoice.status].label,
      })
    }
    return [...map.values()].sort((a, b) => b.remaining - a.remaining)
  }, [])

  const debtTotalValue = debtors.reduce((sum, item) => sum + item.remaining, 0)

  const classRows = useMemo(
    () =>
      CENTER_CLASSES.map((cls) => ({
        id: cls.id,
        name: cls.name,
        code: cls.code,
        teacher: cls.teacher,
        room: cls.room,
        status: cls.status,
        enrolled: cls.studentCount,
        capacity: cls.maxStudents,
        fill: cls.maxStudents ? Math.round((cls.studentCount / cls.maxStudents) * 100) : 0,
      })),
    [],
  )

  const lowClasses = useMemo(
    () =>
      ATTENDANCE_SUMMARIES.map((summary) => ({ ...summary, rate: attendanceRate(summary) }))
        .filter((summary) => summary.rate < ATTENDANCE_THRESHOLD)
        .sort((a, b) => a.rate - b.rate),
    [],
  )

  const lowStudents = useMemo(
    () =>
      lowClasses.flatMap((summary) =>
        classAttendanceRows(summary.classId)
          .filter((row) => row.lessons > 0 && row.rate < ATTENDANCE_THRESHOLD)
          .map((row) => ({
            id: row.student.id,
            studentCode: row.student.studentCode,
            studentName: row.student.fullName,
            className: summary.className,
            rate: row.rate,
            absent: row.counts.absent,
            lessons: row.lessons,
          })),
      ),
    [lowClasses],
  )

  const sourceRows = useMemo(
    () =>
      SOURCE_SERIES.map((item) => ({
        ...item,
        rate: item.leads ? Math.round((item.won / item.leads) * 100) : 0,
      })),
    [],
  )

  const exportReport = () => {
    if (invalidRange) {
      toast.error("Khoảng thời gian không hợp lệ", { description: "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc." })
      return
    }
    const rangeLabel = `${from}–${to}`
    if (report === "revenue") {
      void exportAdminTable(
        "Bao-cao-doanh-thu",
        "Doanh thu",
        ["Kỳ", "Doanh thu", "Chỉ tiêu", "Chênh lệch", "Tỷ lệ đạt"],
        revenueRows.map((item) => [
          item.month,
          item.revenue,
          item.target,
          item.revenue - item.target,
          `${Math.round((item.revenue / Math.max(1, item.target)) * 100)}%`,
        ]),
      ).then(() => toast.success(`Đã xuất Excel báo cáo doanh thu ${rangeLabel}`))
      return
    }
    if (report === "debt") {
      void exportAdminTable(
        "Bao-cao-cong-no",
        "Công nợ",
        ["Học viên", "Lớp", "Còn phải thu", "Trạng thái"],
        debtors.slice(0, 50).map((item) => [item.studentName, item.className, item.remaining, item.status]),
      ).then(() => toast.success(`Đã xuất Excel báo cáo công nợ ${rangeLabel}`))
      return
    }
    if (report === "enrollment") {
      void exportAdminTable(
        "Bao-cao-si-so",
        "Sĩ số",
        ["Lớp", "Mã lớp", "Giáo viên", "Phòng", "Đang học", "Chỉ tiêu", "Tỷ lệ lấp"],
        classRows.map((item) => [item.name, item.code, item.teacher, item.room, item.enrolled, item.capacity, `${item.fill}%`]),
      ).then(() => toast.success(`Đã xuất Excel báo cáo sĩ số ${rangeLabel}`))
      return
    }
    if (report === "attendance") {
      void exportAdminTable(
        "Bao-cao-chuyen-can",
        "Chuyên cần",
        ["Lớp", "Giáo viên", "Tổng", "Có mặt", "Muộn", "Vắng", "Tỷ lệ có mặt"],
        lowClasses.map((item) => [item.className, item.teacherName, item.total, item.present, item.late, item.absent, `${item.rate}%`]),
      ).then(() => toast.success(`Đã xuất Excel báo cáo chuyên cần ${rangeLabel}`))
      return
    }
    void exportAdminTable(
      "Bao-cao-tuyen-sinh",
      "Tuyển sinh",
      ["Nguồn", "Lead", "Chốt", "Tỷ lệ chuyển đổi"],
      sourceRows.map((item) => [item.name, item.leads, item.won, `${item.rate}%`]),
    ).then(() => toast.success(`Đã xuất Excel báo cáo tuyển sinh ${rangeLabel}`))
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Báo cáo & phân tích"
        title="Báo cáo"
        description="Doanh thu, công nợ, sĩ số, chuyên cần và hiệu quả tuyển sinh theo khoảng thời gian bạn chọn."
        actions={
          <Button variant="outline" onClick={exportReport}>
            <Download /> Xuất Excel
          </Button>
        }
      />

      <Reveal>
        <Card>
          <CardHeader>
            <CardTitle>Bộ lọc báo cáo</CardTitle>
            <CardDescription>
              Khoảng thời gian: {fromInput ? fromDateInput(fromInput) : "—"} đến {toInput ? fromDateInput(toInput) : "—"}.
              {invalidRange && " Ngày bắt đầu phải trước ngày kết thúc."}
            </CardDescription>
          </CardHeader>
          <TableToolbar>
            <FormField id="report-from" label="Từ ngày" className="min-w-44">
              <Input
                id="report-from"
                type="date"
                value={fromInput}
                onChange={(e) => setFromInput(e.target.value)}
                className="h-10"
              />
            </FormField>
            <FormField id="report-to" label="Đến ngày" className="min-w-44">
              <Input
                id="report-to"
                type="date"
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                className="h-10"
              />
            </FormField>
            <ToolbarSelect
              id="report-kind"
              label="Loại báo cáo"
              value={report}
              onChange={(value) => setReport(value as ReportKey)}
              options={REPORTS.map((item) => ({ value: item.value, label: item.label }))}
              className="min-w-44"
            />
          </TableToolbar>
        </Card>
      </Reveal>

      {report === "revenue" && (
        <div className="flex flex-col gap-6">
          <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StaggerItem>
              <StatCard label="Doanh thu kỳ" value={formatVnd(revenueTotal)} icon={Banknote} trend={{ text: `${revenueRows.length} tháng có dữ liệu`, tone: "info" }} />
            </StaggerItem>
            <StaggerItem>
              <StatCard label="Chỉ tiêu" value={formatVnd(revenueTarget)} icon={Target} iconClass="bg-slate-100 text-ink-soft" trend={{ text: "Chỉ tiêu của kỳ", tone: "warning" }} />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Chênh lệch"
                value={formatVnd(revenueTotal - revenueTarget)}
                icon={TrendingUp}
                iconClass="bg-green-100 text-success"
                trend={{ text: revenueTotal >= revenueTarget ? "Đạt chỉ tiêu" : "Chưa đạt chỉ tiêu", tone: revenueTotal >= revenueTarget ? "success" : "danger" }}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Tỷ lệ đạt"
                value={`${Math.round((revenueTotal / Math.max(1, revenueTarget)) * 100)}%`}
                icon={CalendarRange}
                iconClass="bg-sky-100 text-sky-700"
                trend={{ text: "Doanh thu / chỉ tiêu", tone: "info" }}
              />
            </StaggerItem>
          </Stagger>

          <div className="grid gap-6 xl:grid-cols-2">
            <Reveal>
              <ChartFrame title="Doanh thu theo tháng" description="Thực tế so với chỉ tiêu trong khoảng đã chọn" height={300}>
                <RevenueChart data={revenueRows} />
              </ChartFrame>
            </Reveal>
            <Reveal delay={0.05}>
              <ChartFrame title="Cơ cấu doanh thu theo khoản thu" description="Tỷ trọng số tiền đã thu theo từng loại khoản" height={300}>
                <SharePieChart data={shareMix} />
              </ChartFrame>
            </Reveal>
          </div>

          <Reveal delay={0.05}>
            <Card>
              <CardHeader>
                <CardTitle>Bảng doanh thu theo tháng</CardTitle>
                <CardDescription>Chênh lệch = doanh thu thực tế − chỉ tiêu</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                      <tr>
                        <th scope="col" className="px-4 py-2.5">Tháng</th>
                        <th scope="col" className="px-3 py-2.5 text-right">Doanh thu</th>
                        <th scope="col" className="px-3 py-2.5 text-right">Chỉ tiêu</th>
                        <th scope="col" className="px-3 py-2.5 text-right">Chênh lệch</th>
                        <th scope="col" className="px-4 py-2.5 text-right">Tỷ lệ đạt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {revenueRows.map((item) => {
                        const diff = item.revenue - item.target
                        const percent = Math.round((item.revenue / Math.max(1, item.target)) * 100)
                        return (
                          <tr key={item.month} className="transition-colors hover:bg-surface">
                            <td className="px-4 py-3 font-semibold text-ink">{item.month}</td>
                            <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-ink">{formatVnd(item.revenue)}</td>
                            <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-ink-soft">{formatVnd(item.target)}</td>
                            <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-success">
                              {diff >= 0 ? `+${formatVnd(diff)}` : `−${formatVnd(Math.abs(diff))}`}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Badge variant={percent >= 100 ? "success" : "warning"}>{percent}%</Badge>
                            </td>
                          </tr>
                        )
                      })}
                      {revenueRows.length === 0 && <TableEmpty colSpan={5} message="Không có tháng nào trong khoảng thời gian đã chọn." />}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      )}

      {report === "debt" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
          <Reveal>
            <ChartFrame title="Cơ cấu công nợ theo độ tuổi" description="Phân bổ nợ tồn đọng theo số ngày quá hạn" height={300}>
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
                        <div className="h-full rounded-full bg-danger/80" style={{ width: `${percent}%` }} role="presentation" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </ChartFrame>
          </Reveal>

          <Reveal delay={0.05}>
            <Card>
              <CardHeader>
                <CardTitle>Học viên còn nợ nhiều nhất</CardTitle>
                <CardDescription>Tổng công nợ chưa thu: {formatVnd(debtTotalValue)}</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                      <tr>
                        <th scope="col" className="px-4 py-2.5">Học viên</th>
                        <th scope="col" className="px-3 py-2.5">Lớp</th>
                        <th scope="col" className="px-3 py-2.5">Trạng thái</th>
                        <th scope="col" className="px-4 py-2.5 text-right">Còn phải thu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {debtors.slice(0, 10).map((item) => (
                        <tr key={item.studentName} className="transition-colors hover:bg-surface">
                          <td className="px-4 py-3 font-semibold whitespace-nowrap text-ink">{item.studentName}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{item.className}</td>
                          <td className="px-3 py-3">
                            <Badge variant={item.status === "Quá hạn" ? "info" : item.status === "Chưa thu" ? "danger" : "warning"}>
                              {item.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums text-danger">
                            {formatVnd(item.remaining)}
                          </td>
                        </tr>
                      ))}
                      {debtors.length === 0 && <TableEmpty colSpan={4} message="Không còn học viên nào nợ học phí." />}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      )}

      {report === "enrollment" && (
        <div className="flex flex-col gap-6">
          <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StaggerItem>
              <StatCard
                label="Học viên nhập mới"
                value={enrollmentRows.reduce((sum, item) => sum + item.enrolled, 0).toLocaleString("vi-VN")}
                icon={UserPlus}
                iconClass="bg-green-100 text-success"
                trend={{ text: "Trong khoảng đã chọn", tone: "success" }}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Học viên rời khóa"
                value={enrollmentRows.reduce((sum, item) => sum + item.churned, 0).toLocaleString("vi-VN")}
                icon={AlertTriangle}
                iconClass="bg-red-100 text-danger"
                trend={{ text: "Cần chăm sóc giữ chân", tone: "danger" }}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Sĩ số toàn trung tâm"
                value={classRows.reduce((sum, item) => sum + item.enrolled, 0).toLocaleString("vi-VN")}
                icon={GraduationCap}
                trend={{ text: `${classRows.length} lớp đang chạy`, tone: "info" }}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Lớp đã đủ chỗ"
                value={String(classRows.filter((item) => item.enrolled >= item.capacity).length)}
                icon={Target}
                iconClass="bg-orange-100 text-warning"
                trend={{ text: "Cần mở thêm lớp", tone: "warning" }}
              />
            </StaggerItem>
          </Stagger>

          <Reveal>
            <ChartFrame title="Học viên nhập mới và rời khóa" description="Biến động sĩ số theo tháng trong khoảng đã chọn" height={300}>
              <EnrollmentChart data={enrollmentRows} />
            </ChartFrame>
          </Reveal>

          <Reveal delay={0.05}>
            <Card>
              <CardHeader>
                <CardTitle>Sĩ số theo lớp</CardTitle>
                <CardDescription>Số học viên đang học so với chỉ tiêu tối đa của từng lớp</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                      <tr>
                        <th scope="col" className="px-4 py-2.5">Lớp</th>
                        <th scope="col" className="px-3 py-2.5">Giáo viên</th>
                        <th scope="col" className="px-3 py-2.5">Phòng</th>
                        <th scope="col" className="px-3 py-2.5 text-right">Đang học</th>
                        <th scope="col" className="px-3 py-2.5 text-right">Chỉ tiêu</th>
                        <th scope="col" className="px-3 py-2.5">Tỷ lệ lấp</th>
                        <th scope="col" className="px-4 py-2.5">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classRows.map((item) => (
                        <tr key={item.id} className="transition-colors hover:bg-surface">
                          <td className="px-4 py-3">
                            <span className="block font-semibold whitespace-nowrap text-ink">{item.name}</span>
                            <span className="block font-mono text-xs text-ink-soft">{item.code}</span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{item.teacher}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{item.room}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-ink">{item.enrolled}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-ink-soft">{item.capacity}</td>
                          <td className="px-3 py-3">
                            <Badge variant={item.fill >= 100 ? "danger" : item.fill >= 80 ? "success" : "warning"}>
                              {item.fill}%
                            </Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-ink-soft">
                            {item.status === "active" ? "Đang học" : item.status === "finishing" ? "Sắp hoàn thành" : "Đã kết thúc"}
                          </td>
                        </tr>
                      ))}
                      {classRows.length === 0 && <TableEmpty colSpan={7} />}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      )}

      {report === "attendance" && (
        <div className="flex flex-col gap-6">
          <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StaggerItem>
              <StatCard
                label="Lớp dưới ngưỡng"
                value={String(lowClasses.length)}
                icon={AlertTriangle}
                iconClass="bg-red-100 text-danger"
                trend={{ text: `Dưới ${ATTENDANCE_THRESHOLD}% tỷ lệ có mặt`, tone: "danger" }}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Học viên cần nhắc"
                value={String(lowStudents.length)}
                icon={GraduationCap}
                trend={{ text: "Tỷ lệ thấp trong lớp bị cảnh báo", tone: "warning" }}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Buổi vắng nhiều nhất"
                value={String(lowClasses[0]?.absent ?? 0)}
                icon={CalendarRange}
                iconClass="bg-orange-100 text-warning"
                trend={{ text: lowClasses[0]?.className ?? "—", tone: "warning" }}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Tỷ lệ thấp nhất"
                value={`${lowClasses[0]?.rate ?? 0}%`}
                icon={TrendingUp}
                iconClass="bg-sky-100 text-sky-700"
                trend={{ text: lowClasses[0]?.teacherName ?? "—", tone: "info" }}
              />
            </StaggerItem>
          </Stagger>

          <Reveal>
            <ChartFrame
              title="Tỷ lệ điểm danh toàn trung tâm"
              description="Lớp dưới 85% được tô đậm để ưu tiên xử lý"
              height={320}
            >
              <AttendanceRateChart
                data={[...ATTENDANCE_SUMMARIES.map((summary) => ({ name: summary.className, rate: attendanceRate(summary) }))].sort(
                  (a, b) => a.rate - b.rate,
                )}
              />
            </ChartFrame>
          </Reveal>

          <Reveal delay={0.05}>
            <Card>
              <CardHeader>
                <CardTitle>Lớp có tỷ lệ điểm danh dưới 85%</CardTitle>
                <CardDescription>{lowClasses.length} lớp cần nhắc nhở phụ huynh</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                      <tr>
                        <th scope="col" className="px-4 py-2.5">Lớp</th>
                        <th scope="col" className="px-3 py-2.5">Giáo viên</th>
                        <th scope="col" className="px-3 py-2.5 text-right">Tổng</th>
                        <th scope="col" className="px-3 py-2.5 text-right">Có mặt</th>
                        <th scope="col" className="px-3 py-2.5 text-right">Muộn</th>
                        <th scope="col" className="px-3 py-2.5 text-right">Vắng</th>
                        <th scope="col" className="px-4 py-2.5 text-right">Tỷ lệ có mặt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lowClasses.map((item) => (
                        <tr key={item.classId} className="transition-colors hover:bg-surface">
                          <td className="px-4 py-3 font-semibold whitespace-nowrap text-ink">{item.className}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{item.teacherName}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-ink-soft">{item.total}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-success">{item.present}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-warning">{item.late}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-danger">{item.absent}</td>
                          <td className="px-4 py-3 text-right">
                            <Badge variant={item.rate < 80 ? "danger" : "warning"}>{item.rate}%</Badge>
                          </td>
                        </tr>
                      ))}
                      {lowClasses.length === 0 && <TableEmpty colSpan={7} message="Không có lớp nào dưới ngưỡng." />}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.1}>
            <Card>
              <CardHeader>
                <CardTitle>Học viên có tỷ lệ thấp</CardTitle>
                <CardDescription>Tính trên các buổi học đã có dữ liệu điểm danh của lớp</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                      <tr>
                        <th scope="col" className="px-4 py-2.5">Mã học viên</th>
                        <th scope="col" className="px-3 py-2.5">Họ tên</th>
                        <th scope="col" className="px-3 py-2.5">Lớp</th>
                        <th scope="col" className="px-3 py-2.5 text-right">Buổi học</th>
                        <th scope="col" className="px-3 py-2.5 text-right">Số buổi vắng</th>
                        <th scope="col" className="px-4 py-2.5 text-right">Tỷ lệ có mặt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lowStudents.map((item) => (
                        <tr key={item.id} className="transition-colors hover:bg-surface">
                          <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-ink-soft">{item.studentCode}</td>
                          <td className="px-3 py-3 font-semibold whitespace-nowrap text-ink">{item.studentName}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{item.className}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-ink-soft">{item.lessons}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-danger">{item.absent}</td>
                          <td className="px-4 py-3 text-right">
                            <Badge variant={item.rate < 60 ? "danger" : "warning"}>{item.rate}%</Badge>
                          </td>
                        </tr>
                      ))}
                      {lowStudents.length === 0 && <TableEmpty colSpan={6} message="Không có học viên nào dưới ngưỡng." />}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      )}

      {report === "recruitment" && (
        <div className="flex flex-col gap-6">
          <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StaggerItem>
              <StatCard
                label="Tỷ lệ chuyển đổi"
                value={`${RECRUIT_SUMMARY.conversionRate}%`}
                icon={Target}
                trend={{ text: `${RECRUIT_SUMMARY.converted}/${RECRUIT_SUMMARY.newLeads} lead`, tone: "success" }}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Số ngày trung bình"
                value={String(RECRUIT_SUMMARY.avgDaysToEnroll)}
                icon={CalendarRange}
                iconClass="bg-sky-100 text-sky-700"
                trend={{ text: "Từ lead đến khi ghi danh", tone: "info" }}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Chi phí / học viên"
                value={formatVnd(RECRUIT_SUMMARY.costPerEnroll)}
                icon={Banknote}
                iconClass="bg-orange-100 text-warning"
                trend={{ text: "Ước tính tháng gần nhất", tone: "warning" }}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Lead mới"
                value={RECRUIT_SUMMARY.newLeads.toLocaleString("vi-VN")}
                icon={UserPlus}
                trend={{ text: `${RECRUIT_SUMMARY.contacted} đã gọi`, tone: "info" }}
              />
            </StaggerItem>
          </Stagger>

          <Reveal>
            <ChartFrame title="Phễu tuyển sinh" description="Từ lead mới đến học viên tái học" height={300}>
              <FunnelChart data={FUNNEL_SERIES} />
            </ChartFrame>
          </Reveal>

          <Reveal delay={0.05}>
            <Card>
              <CardHeader>
                <CardTitle>Lead và chốt ghi danh theo nguồn</CardTitle>
                <CardDescription>Tỷ lệ chuyển đổi = số chốt / số lead của từng nguồn</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                      <tr>
                        <th scope="col" className="px-4 py-2.5">Nguồn</th>
                        <th scope="col" className="px-3 py-2.5 text-right">Lead</th>
                        <th scope="col" className="px-3 py-2.5 text-right">Chốt ghi danh</th>
                        <th scope="col" className="px-4 py-2.5 text-right">Tỷ lệ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sourceRows.map((item) => (
                        <tr key={item.name} className="transition-colors hover:bg-surface">
                          <td className="px-4 py-3 font-semibold text-ink">{item.name}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-ink">{item.leads}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-success">{item.won}</td>
                          <td className="px-4 py-3 text-right">
                            <Badge variant={item.rate >= 40 ? "success" : item.rate >= 20 ? "warning" : "danger"}>
                              {item.rate}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                      {sourceRows.length === 0 && <TableEmpty colSpan={4} />}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      )}
    </div>
  )
}
