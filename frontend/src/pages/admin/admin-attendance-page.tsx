import { useMemo, useState } from "react"
import { ClipboardCheck, Download, Lock, LockOpen, TriangleAlert, UserX, Users } from "lucide-react"
import { cn } from "cn"
import { TableEmpty, TablePagination, TableToolbar, ToolbarSelect } from "@/components/admin/table-toolbar"
import { StatCard } from "@/components/common/stat-card"
import { PageHeader } from "@/components/layout/page-header"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/toast"
import {
  ADMIN_SETTINGS,
  ADMIN_TODAY_LABEL,
  ATTENDANCE_SUMMARIES,
  attendanceRate,
  classAttendanceRows,
  unlockClassAttendance,
  type AttendanceSummary,
} from "@/data/admin"
import { exportAdminTable } from "@/lib/admin-excel"

const PAGE_SIZE = 10

/** 0 = Chủ Nhật … 6 = Thứ Bảy, khớp với `TeacherClass.weekdays`. */
const CLASS_WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]

function weekdayShort(value: number) {
  return CLASS_WEEKDAYS[value % 7] ?? "—"
}

function rateTone(rate: number) {
  if (rate >= 95) return "success" as const
  if (rate >= 85) return "brand" as const
  if (rate >= 80) return "warning" as const
  return "danger" as const
}

export function AdminAttendancePage() {
  const [rows, setRows] = useState<AttendanceSummary[]>(ATTENDANCE_SUMMARIES)
  const [classId, setClassId] = useState<string>("all")
  const [view, setView] = useState<"rate" | "detail">("rate")
  const [page, setPage] = useState(1)

  const stats = useMemo(() => {
    const total = rows.reduce((sum, row) => sum + row.total, 0)
    const attended = rows.reduce((sum, row) => sum + row.present + row.late, 0)
    const overall = total ? Math.round((attended / total) * 100) : 0
    return {
      overall,
      notMarked: rows.filter((row) => !row.locked).length,
      locked: rows.filter((row) => row.locked).length,
      absent: rows.reduce((sum, row) => sum + row.absent, 0),
    }
  }, [rows])

  const filtered = useMemo(
    () => (classId === "all" ? rows : rows.filter((row) => row.classId === classId)),
    [rows, classId],
  )

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const selected = classId === "all" ? null : (rows.find((row) => row.classId === classId) ?? null)
  const detailRows = useMemo(() => (classId === "all" ? [] : classAttendanceRows(classId)), [classId])

  const unlock = (row: AttendanceSummary) => {
    unlockClassAttendance(row.classId)
    setRows((prev) => prev.map((item) => (item.classId === row.classId ? { ...item, locked: false } : item)))
    toast.success("Đã mở khoá điểm danh", {
      description: `${row.className} · giáo viên có thể sửa trong ${ADMIN_SETTINGS.attendanceLockDays} ngày gần nhất`,
    })
  }

  const exportSummary = () => {
    void exportAdminTable(
      "Diem-danh-tong-hop",
      "Điểm danh tổng hợp",
      ["Lớp", "Giáo viên", "Phòng", "Ca", "Tổng", "Có mặt", "Muộn", "Vắng", "Có phép", "Tỷ lệ", "Khoá"],
      filtered.map((row) => [
        row.className,
        row.teacherName,
        row.room,
        `${weekdayShort(row.weekday)} · ${row.time}`,
        row.total,
        row.present,
        row.late,
        row.absent,
        row.excused,
        `${attendanceRate(row)}%`,
        row.locked ? "Đã khoá" : "Đang mở",
      ]),
    ).then(() => toast.success("Đã xuất Excel điểm danh tổng hợp"))
  }

  const exportDetail = () => {
    if (!selected) return
    void exportAdminTable(
      `Diem-danh-${selected.classId}`,
      `Điểm danh ${selected.className}`,
      ["Học viên", "Mã học viên", "Có mặt", "Muộn", "Vắng", "Có phép", "Số buổi", "Tỷ lệ"],
      detailRows.map((row) => [
        row.student.fullName,
        row.student.studentCode,
        row.counts.present,
        row.counts.late,
        row.counts.absent,
        row.counts.excused,
        row.lessons,
        `${row.rate}%`,
      ]),
    ).then(() => toast.success("Đã xuất Excel chi tiết điểm danh"))
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`Điểm danh toàn trung tâm · dữ liệu ${ADMIN_TODAY_LABEL}`}
        title="Điểm danh"
        description={`Tổng hợp tỷ lệ chuyên cần theo lớp, mở khoá sửa điểm danh đã quá ${ADMIN_SETTINGS.attendanceLockDays} ngày và xuất báo cáo Excel.`}
        actions={
          <Button variant="outline" onClick={exportSummary}>
            <Download /> Xuất Excel
          </Button>
        }
      />

      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard
            label="Tỷ lệ điểm danh chung"
            value={`${stats.overall}%`}
            icon={ClipboardCheck}
            trend={{ text: "Tính trên toàn bộ lớp đang mở", tone: stats.overall >= 90 ? "success" : "warning" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Buổi chưa điểm danh"
            value={String(stats.notMarked)}
            icon={TriangleAlert}
            iconClass="bg-orange-100 text-warning"
            trend={{ text: "Cần giáo viên bổ sung trước khi chốt", tone: "warning" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Lớp đã khoá điểm danh"
            value={String(stats.locked)}
            icon={Lock}
            iconClass="bg-sky-100 text-sky-700"
            trend={{ text: `Khoá sau ${ADMIN_SETTINGS.attendanceLockDays} ngày`, tone: "info" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Học viên vắng"
            value={stats.absent.toLocaleString("vi-VN")}
            icon={UserX}
            iconClass="bg-red-100 text-danger"
            trend={{ text: "Cần nhắc phụ huynh theo dõi", tone: "danger" }}
          />
        </StaggerItem>
      </Stagger>

      <Reveal delay={0.05}>
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle>Điểm danh tổng hợp theo lớp</CardTitle>
              <CardDescription>Tỷ lệ = (có mặt + muộn) / tổng sĩ số của lớp</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportSummary}>
              <Download /> Xuất Excel
            </Button>
          </CardHeader>
          <TableToolbar
            actions={
              <span className="flex items-center gap-1.5 text-xs text-ink-soft">
                <Users className="size-3.5" /> {filtered.length} lớp
              </span>
            }
          >
            <ToolbarSelect
              id="attendance-class"
              label="Chọn lớp"
              value={classId}
              onChange={(value) => {
                setClassId(value)
                setPage(1)
              }}
              options={[
                { value: "all", label: "Tất cả lớp" },
                ...rows.map((row) => ({ value: row.classId, label: `${row.className}` })),
              ]}
            />
            <ToolbarSelect
              id="attendance-view"
              label="Kỳ hiển thị"
              value={view}
              onChange={(value) => setView(value as "rate" | "detail")}
              options={[
                { value: "rate", label: "Tỷ lệ điểm danh" },
                { value: "detail", label: "Chi tiết học viên" },
              ]}
            />
          </TableToolbar>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1160px] text-left text-sm">
                <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-2.5">Lớp</th>
                    <th scope="col" className="px-3 py-2.5">Giáo viên</th>
                    <th scope="col" className="px-3 py-2.5">Phòng</th>
                    <th scope="col" className="px-3 py-2.5">Ca</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Tổng</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Có mặt</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Muộn</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Vắng</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Có phép</th>
                    <th scope="col" className="px-3 py-2.5">Tỷ lệ</th>
                    <th scope="col" className="px-3 py-2.5">Khoá</th>
                    <th scope="col" className="px-4 py-2.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((row) => {
                    const rate = attendanceRate(row)
                    return (
                      <tr key={row.classId} className="transition-colors hover:bg-surface">
                        <td className="px-4 py-3 font-semibold whitespace-nowrap text-ink">{row.className}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{row.teacherName}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{row.room}</td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="block font-medium text-ink">{weekdayShort(row.weekday)}</span>
                          <span className="block text-xs tabular-nums text-ink-soft">{row.time}</span>
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-ink">{row.total}</td>
                        <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-success">{row.present}</td>
                        <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-warning">{row.late}</td>
                        <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-danger">{row.absent}</td>
                        <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-ink-soft">{row.excused}</td>
                        <td className="w-52 px-3 py-3">
                          <Progress
                            value={rate}
                            size="sm"
                            tone={rateTone(rate)}
                            valueLabel={`${rate}%`}
                            className="min-w-28"
                          />
                          <p className="mt-1.5 text-xs tabular-nums text-ink-soft">Buổi gần nhất: {row.date}</p>
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant={row.locked ? "neutral" : "warning"}>
                            {row.locked ? "Đã khoá" : "Đang mở"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {row.locked ? (
                            <Button variant="outline" size="sm" onClick={() => unlock(row)}>
                              <LockOpen /> Mở khoá sửa
                            </Button>
                          ) : (
                            <span className="text-xs text-ink-soft">Đang cho phép sửa</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {visible.length === 0 && <TableEmpty colSpan={12} />}
                </tbody>
              </table>
            </div>
            <TablePagination page={currentPage} pageCount={pageCount} total={filtered.length} onPageChange={setPage} />
          </CardContent>
        </Card>
      </Reveal>

      {selected && view === "detail" && (
        <Reveal delay={0.1}>
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle>Chi tiết điểm danh · {selected.className}</CardTitle>
                <CardDescription>
                  {selected.teacherName} · {selected.room} · {weekdayShort(selected.weekday)} {selected.time} · tỷ lệ lớp{" "}
                  {attendanceRate(selected)}%
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportDetail}>
                <Download /> Xuất Excel
              </Button>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-2.5">Học viên</th>
                      <th scope="col" className="px-3 py-2.5">Mã</th>
                      <th scope="col" className="px-3 py-2.5 text-right">Có mặt</th>
                      <th scope="col" className="px-3 py-2.5 text-right">Muộn</th>
                      <th scope="col" className="px-3 py-2.5 text-right">Vắng</th>
                      <th scope="col" className="px-3 py-2.5 text-right">Có phép</th>
                      <th scope="col" className="px-3 py-2.5 text-right">Số buổi</th>
                      <th scope="col" className="px-4 py-2.5">Tỷ lệ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detailRows.map((row) => (
                      <tr key={row.student.id} className="transition-colors hover:bg-surface">
                        <td className="px-4 py-3 font-semibold whitespace-nowrap text-ink">{row.student.fullName}</td>
                        <td className="px-3 py-3 font-mono text-xs whitespace-nowrap text-ink-soft">
                          {row.student.studentCode}
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-success">
                          {row.counts.present}
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-warning">
                          {row.counts.late}
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-danger">
                          {row.counts.absent}
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-ink-soft">
                          {row.counts.excused}
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-ink">{row.lessons}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "font-heading text-sm font-extrabold tabular-nums",
                              row.rate >= 90 ? "text-success" : row.rate >= 80 ? "text-warning" : "text-danger",
                            )}
                          >
                            {row.rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    {detailRows.length === 0 && (
                      <TableEmpty
                        colSpan={8}
                        message="Lớp này chưa có hồ sơ học viên trong dữ liệu điểm danh chi tiết."
                      />
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      )}

      {selected && view !== "detail" && (
        <Reveal delay={0.1}>
          <Card>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink-soft">
                Đang lọc theo lớp <span className="font-semibold text-ink">{selected.className}</span>. Chọn kỳ hiển thị
                “Chi tiết học viên” để xem từng học viên trong lớp.
              </p>
              <Button variant="outline" size="sm" onClick={() => setView("detail")}>
                Xem chi tiết lớp
              </Button>
            </CardContent>
          </Card>
        </Reveal>
      )}
    </div>
  )
}
