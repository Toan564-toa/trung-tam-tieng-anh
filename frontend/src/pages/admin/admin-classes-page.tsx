import { useMemo, useState } from "react"
import { BookOpen, CalendarClock, DoorOpen, Download, GraduationCap, Lock, LockOpen, Pencil, Users } from "lucide-react"
import { cn } from "cn"
import { TableEmpty, TablePagination, TableToolbar, ToolbarSelect } from "@/components/admin/table-toolbar"
import { StatCard } from "@/components/common/stat-card"
import { PageHeader } from "@/components/layout/page-header"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { fieldBase, Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/toast"
import { ADMIN_ROOMS, ADMIN_TODAY_LABEL, ATTENDANCE_SUMMARIES, unlockClassAttendance } from "@/data/admin"
import { TEACHERS } from "@/data/landing"
import { CENTER_CLASSES, CLASS_STATUS_META, getCenterClass, type CenterClass, type CenterClassStatus } from "@/data/staff"
import { exportAdminTable } from "@/lib/admin-excel"
import { formatDate } from "@/lib/date"

const PAGE_SIZE = 10

/** 0 = Chủ Nhật … 6 = Thứ Bảy, khớp với `TeacherClass.weekdays`. */
const CLASS_WEEKDAYS = [
  { value: 0, label: "Chủ Nhật", short: "CN" },
  { value: 1, label: "Thứ Hai", short: "T2" },
  { value: 2, label: "Thứ Ba", short: "T3" },
  { value: 3, label: "Thứ Tư", short: "T4" },
  { value: 4, label: "Thứ Năm", short: "T5" },
  { value: 5, label: "Thứ Sáu", short: "T6" },
  { value: 6, label: "Thứ Bảy", short: "T7" },
] as const

const CLASS_STATUSES = Object.keys(CLASS_STATUS_META) as CenterClassStatus[]

function weekdayShort(value: number) {
  return CLASS_WEEKDAYS.find((day) => day.value === value)?.short ?? "—"
}

function weekdayText(weekdays: number[]) {
  if (weekdays.length === 0) return "Chưa xếp"
  return [...weekdays].sort((a, b) => a - b).map(weekdayShort).join(", ")
}

type ClassDraft = {
  id: string
  name: string
  teacher: string
  room: string
  weekdays: number[]
  time: string
  maxStudents: string
  status: CenterClassStatus
}

type ClassErrors = {
  name?: string
  teacher?: string
  room?: string
  weekdays?: string
  time?: string
  maxStudents?: string
}

export function AdminClassesPage() {
  const [classes, setClasses] = useState<CenterClass[]>(CENTER_CLASSES)
  const [lockedIds, setLockedIds] = useState<string[]>(
    ATTENDANCE_SUMMARIES.filter((summary) => summary.locked).map((summary) => summary.classId),
  )

  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<CenterClassStatus | "all">("all")
  const [teacherFilter, setTeacherFilter] = useState<string>("all")
  const [page, setPage] = useState(1)

  const [draft, setDraft] = useState<ClassDraft | null>(null)
  const [errors, setErrors] = useState<ClassErrors>({})

  const teacherNames = useMemo(() => {
    const names = new Set<string>(classes.map((cls) => cls.teacher))
    TEACHERS.forEach((teacher) => names.add(teacher.name))
    return [...names]
  }, [classes])

  const stats = useMemo(() => {
    const open = classes.filter((cls) => cls.status !== "closed")
    const students = classes.reduce((sum, cls) => sum + cls.studentCount, 0)
    const full = classes.filter((cls) => cls.studentCount >= cls.maxStudents)
    const nearlyDone = classes.filter((cls) => cls.totalLessons > 0 && cls.doneLessons / cls.totalLessons >= 0.8)
    return { open: open.length, students, full: full.length, nearlyDone: nearlyDone.length }
  }, [classes])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return classes.filter((cls) => {
      if (statusFilter !== "all" && cls.status !== statusFilter) return false
      if (teacherFilter !== "all" && cls.teacher !== teacherFilter) return false
      if (!needle) return true
      return (
        cls.name.toLowerCase().includes(needle) ||
        cls.code.toLowerCase().includes(needle) ||
        cls.course.toLowerCase().includes(needle) ||
        cls.room.toLowerCase().includes(needle)
      )
    })
  }, [classes, query, statusFilter, teacherFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const openEdit = (cls: CenterClass) => {
    setErrors({})
    setDraft({
      id: cls.id,
      name: cls.name,
      teacher: cls.teacher,
      room: cls.room,
      weekdays: [...cls.weekdays],
      time: cls.time,
      maxStudents: String(cls.maxStudents),
      status: cls.status,
    })
  }

  const closeDraft = () => {
    setDraft(null)
    setErrors({})
  }

  const toggleWeekday = (value: number) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            weekdays: prev.weekdays.includes(value)
              ? prev.weekdays.filter((item) => item !== value)
              : [...prev.weekdays, value],
          }
        : prev,
    )
  }

  const saveDraft = () => {
    if (!draft) return
    const maxStudents = Number(draft.maxStudents.replace(/\D/g, ""))
    const nextErrors: ClassErrors = {}
    if (!draft.name.trim()) nextErrors.name = "Vui lòng nhập tên lớp."
    if (!draft.teacher) nextErrors.teacher = "Vui lòng chọn giáo viên phụ trách."
    if (!draft.room) nextErrors.room = "Vui lòng chọn phòng học."
    if (draft.weekdays.length === 0) nextErrors.weekdays = "Chọn ít nhất một ngày học."
    if (!draft.time.trim()) nextErrors.time = "Vui lòng nhập khung giờ học."
    if (Number.isNaN(maxStudents) || maxStudents <= 0) nextErrors.maxStudents = "Sĩ số tối đa phải lớn hơn 0."

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Vui lòng kiểm tra lại thông tin lớp học")
      return
    }

    setClasses((prev) =>
      prev.map((cls) =>
        cls.id === draft.id
          ? {
              ...cls,
              name: draft.name.trim(),
              teacher: draft.teacher,
              room: draft.room,
              weekdays: [...draft.weekdays].sort((a, b) => a - b),
              time: draft.time.trim(),
              maxStudents,
              status: draft.status,
            }
          : cls,
      ),
    )
    toast.success("Đã cập nhật lớp học", { description: `${draft.name.trim()} · ${weekdayText(draft.weekdays)}` })
    closeDraft()
  }

  const toggleAttendanceLock = (cls: CenterClass) => {
    const isLocked = lockedIds.includes(cls.id)
    if (isLocked) {
      unlockClassAttendance(cls.id)
      setLockedIds((prev) => prev.filter((id) => id !== cls.id))
      toast.success("Đã mở khoá điểm danh", { description: `${cls.name} · giáo viên có thể sửa lại` })
      return
    }
    setLockedIds((prev) => [...prev, cls.id])
    toast.success("Đã khoá điểm danh", { description: `${cls.name} · chỉ quản trị mở khoá được` })
  }

  const exportClasses = () => {
    void exportAdminTable(
      "Lop-hoc",
      "Lớp học",
      ["Mã lớp", "Tên lớp", "Khóa học", "Trình độ", "Giáo viên", "Phòng", "Thứ học", "Giờ", "Tiến độ", "Sĩ số", "Trạng thái"],
      filtered.map((cls) => [
        cls.code,
        cls.name,
        cls.course,
        cls.level,
        cls.teacher,
        cls.room,
        weekdayText(cls.weekdays),
        cls.time,
        `${cls.doneLessons}/${cls.totalLessons}`,
        `${cls.studentCount}/${cls.maxStudents}`,
        CLASS_STATUS_META[cls.status].label,
      ]),
    ).then(() => toast.success("Đã xuất Excel lớp học"))
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`Vận hành lớp · dữ liệu ${ADMIN_TODAY_LABEL}`}
        title="Lớp học"
        description="Xếp giáo viên, phòng học, lịch học trong tuần và khoá điểm danh cho từng lớp."
        actions={
          <Button variant="outline" onClick={exportClasses}>
            <Download /> Xuất Excel
          </Button>
        }
      />

      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard
            label="Lớp đang mở"
            value={String(stats.open)}
            icon={BookOpen}
            trend={{ text: `${classes.length} lớp trong hệ thống`, tone: "info" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Sĩ số toàn trung tâm"
            value={stats.students.toLocaleString("vi-VN")}
            icon={GraduationCap}
            iconClass="bg-sky-100 text-sky-700"
            trend={{ text: `${stats.full} lớp đã đủ chỗ`, tone: "warning" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Lớp sắp hoàn thành"
            value={String(stats.nearlyDone)}
            icon={CalendarClock}
            iconClass="bg-green-100 text-success"
            trend={{ text: "Đã học trên 80% chương trình", tone: "success" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Lớp đã khoá điểm danh"
            value={String(lockedIds.length)}
            icon={Lock}
            iconClass="bg-orange-100 text-warning"
            trend={{ text: "Quản trị mở khoá khi cần sửa", tone: "warning" }}
          />
        </StaggerItem>
      </Stagger>

      <Reveal delay={0.05}>
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle>Danh sách lớp học</CardTitle>
              <CardDescription>Tiến độ tính theo số buổi đã học trên tổng số buổi của khóa</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportClasses}>
              <Download /> Xuất Excel
            </Button>
          </CardHeader>
          <TableToolbar
            query={query}
            onQueryChange={(value) => {
              setQuery(value)
              setPage(1)
            }}
            searchPlaceholder="Tìm mã lớp, tên lớp, phòng…"
          >
            <ToolbarSelect
              id="class-status"
              label="Lọc trạng thái"
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value as CenterClassStatus | "all")
                setPage(1)
              }}
              options={[
                { value: "all", label: "Tất cả trạng thái" },
                ...CLASS_STATUSES.map((key) => ({ value: key, label: CLASS_STATUS_META[key].label })),
              ]}
            />
            <ToolbarSelect
              id="class-teacher"
              label="Lọc giáo viên"
              value={teacherFilter}
              onChange={(value) => {
                setTeacherFilter(value)
                setPage(1)
              }}
              options={[{ value: "all", label: "Tất cả giáo viên" }, ...teacherNames.map((name) => ({ value: name, label: name }))]}
            />
            <span className="flex items-center gap-1.5 text-xs text-ink-soft">
              <Users className="size-3.5" /> {filtered.length} lớp
            </span>
          </TableToolbar>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left text-sm">
                <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-2.5">Mã lớp</th>
                    <th scope="col" className="px-3 py-2.5">Tên lớp</th>
                    <th scope="col" className="px-3 py-2.5">Khóa học</th>
                    <th scope="col" className="px-3 py-2.5">Trình độ</th>
                    <th scope="col" className="px-3 py-2.5">Giáo viên</th>
                    <th scope="col" className="px-3 py-2.5">Phòng</th>
                    <th scope="col" className="px-3 py-2.5">Thứ / giờ</th>
                    <th scope="col" className="px-3 py-2.5">Tiến độ</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Sĩ số</th>
                    <th scope="col" className="px-3 py-2.5">Trạng thái</th>
                    <th scope="col" className="px-4 py-2.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((cls) => {
                    const isLocked = lockedIds.includes(cls.id)
                    return (
                      <tr key={cls.id} className="transition-colors hover:bg-surface">
                        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-ink-soft">{cls.code}</td>
                        <td className="px-3 py-3 font-semibold whitespace-nowrap text-ink">{cls.name}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{cls.course}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{cls.level}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{cls.teacher}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-ink-soft">
                          <span className="flex items-center gap-1.5">
                            <DoorOpen className="size-3.5" /> {cls.room}
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="block font-medium text-ink">{weekdayText(cls.weekdays)}</span>
                          <span className="block text-xs tabular-nums text-ink-soft">{cls.time}</span>
                        </td>
                        <td className="w-48 px-3 py-3">
                          <Progress
                            value={cls.doneLessons}
                            max={cls.totalLessons}
                            size="sm"
                            tone={cls.doneLessons / Math.max(1, cls.totalLessons) >= 0.8 ? "success" : "brand"}
                            valueLabel={`${cls.doneLessons}/${cls.totalLessons}`}
                            className="min-w-28"
                          />
                          <p className="mt-1.5 text-xs tabular-nums text-ink-soft">
                            {cls.doneLessons}/{cls.totalLessons} buổi
                          </p>
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-ink">
                          <span className={cn(cls.studentCount >= cls.maxStudents ? "text-danger" : "text-ink")}>
                            {cls.studentCount}/{cls.maxStudents}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant={CLASS_STATUS_META[cls.status].badge}>
                            {CLASS_STATUS_META[cls.status].label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEdit(cls)}>
                              <Pencil /> Sửa
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={isLocked ? "text-success hover:bg-green-50" : "text-danger hover:bg-red-50"}
                              onClick={() => toggleAttendanceLock(cls)}
                            >
                              {isLocked ? <LockOpen /> : <Lock />}
                              {isLocked ? "Mở khoá" : "Khoá điểm danh"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {rows.length === 0 && <TableEmpty colSpan={11} />}
                </tbody>
              </table>
            </div>
            <TablePagination page={currentPage} pageCount={pageCount} total={filtered.length} onPageChange={setPage} />
          </CardContent>
        </Card>
      </Reveal>

      <Modal
        open={Boolean(draft)}
        onOpenChange={(open) => !open && closeDraft()}
        title="Chỉnh sửa lớp học"
        description={draft ? `${draft.name} · ${getCenterClass(draft.id)?.code ?? ""}` : undefined}
        icon={<BookOpen className="size-6" />}
        className="sm:max-w-xl"
        footer={
          <>
            <Button variant="outline" onClick={closeDraft}>
              Huỷ bỏ
            </Button>
            <Button onClick={saveDraft}>Lưu thay đổi</Button>
          </>
        }
      >
        {draft && (
          <div className="flex flex-col gap-4">
            <FormField id="class-name" label="Tên lớp" required error={errors.name}>
              <Input
                id="class-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                aria-invalid={Boolean(errors.name) || undefined}
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="class-teacher-field" label="Giáo viên phụ trách" required error={errors.teacher}>
                <select
                  id="class-teacher-field"
                  value={draft.teacher}
                  onChange={(e) => setDraft({ ...draft, teacher: e.target.value })}
                  className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}
                >
                  {TEACHERS.map((teacher) => (
                    <option key={teacher.name} value={teacher.name}>
                      {teacher.name}
                    </option>
                  ))}
                  {!TEACHERS.some((teacher) => teacher.name === draft.teacher) && (
                    <option value={draft.teacher}>{draft.teacher}</option>
                  )}
                </select>
              </FormField>
              <FormField id="class-room" label="Phòng học" required error={errors.room}>
                <select
                  id="class-room"
                  value={draft.room}
                  onChange={(e) => setDraft({ ...draft, room: e.target.value })}
                  className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}
                >
                  {ADMIN_ROOMS.map((room) => (
                    <option key={room.id} value={room.name}>
                      {room.name}
                    </option>
                  ))}
                  {!ADMIN_ROOMS.some((room) => room.name === draft.room) && (
                    <option value={draft.room}>{draft.room}</option>
                  )}
                </select>
              </FormField>
            </div>
            <FormField id="class-weekdays" label="Ngày học trong tuần" required error={errors.weekdays}>
              <div className="grid grid-cols-4 gap-2">
                {CLASS_WEEKDAYS.map((day) => {
                  const active = draft.weekdays.includes(day.value)
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleWeekday(day.value)}
                      aria-pressed={active}
                      className={cn(
                        "min-h-10 cursor-pointer rounded-xl px-2 text-xs font-semibold transition-colors",
                        active ? "bg-brand text-ink shadow-glow" : "bg-surface text-ink-soft hover:bg-cream",
                      )}
                    >
                      {day.short}
                    </button>
                  )
                })}
              </div>
            </FormField>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField id="class-time" label="Khung giờ" required error={errors.time} className="sm:col-span-1">
                <Input
                  id="class-time"
                  value={draft.time}
                  onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                  placeholder="19:00 – 20:30"
                  aria-invalid={Boolean(errors.time) || undefined}
                />
              </FormField>
              <FormField id="class-max" label="Sĩ số tối đa" required error={errors.maxStudents}>
                <Input
                  id="class-max"
                  inputMode="numeric"
                  className="tabular-nums"
                  value={draft.maxStudents}
                  onChange={(e) => setDraft({ ...draft, maxStudents: e.target.value })}
                  aria-invalid={Boolean(errors.maxStudents) || undefined}
                />
              </FormField>
              <FormField id="class-status-field" label="Trạng thái" required>
                <select
                  id="class-status-field"
                  value={draft.status}
                  onChange={(e) => setDraft({ ...draft, status: e.target.value as CenterClassStatus })}
                  className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}
                >
                  {CLASS_STATUSES.map((key) => (
                    <option key={key} value={key}>
                      {CLASS_STATUS_META[key].label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            {draft.id && lockedIds.includes(draft.id) && (
              <p className="rounded-xl bg-surface p-3 text-xs leading-relaxed text-ink-soft">
                Lớp đang khoá điểm danh. Mở khoá trước khi yêu cầu giáo viên sửa lại dữ liệu buổi học đã qua.
              </p>
            )}
            <p className="rounded-xl bg-sky-50 p-3 text-xs leading-relaxed text-sky-800">
              Thay đổi chỉ áp dụng cho phiên làm việc hiện tại, dữ liệu gốc của hệ thống không bị ghi đè.
            </p>
          </div>
        )}
      </Modal>

      <Reveal delay={0.1}>
        <Card>
          <CardHeader>
            <CardTitle>Ngày học trong tuần</CardTitle>
            <CardDescription>
              Quy ước: CN = Chủ Nhật, T2 … T7 = Thứ Hai → Thứ Bảy. Cập nhật ngày {formatDate(new Date(2026, 9, 2))}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                  <tr>
                    {CLASS_WEEKDAYS.map((day) => (
                      <th key={day.value} scope="col" className="px-4 py-2.5">
                        {day.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="transition-colors hover:bg-surface">
                    {CLASS_WEEKDAYS.map((day) => {
                      const list = classes.filter((cls) => cls.weekdays.includes(day.value))
                      return (
                        <td key={day.value} className="px-4 py-3 align-top">
                          {list.length === 0 ? (
                            <span className="text-xs text-ink-soft">—</span>
                          ) : (
                            <ul className="flex flex-col gap-1.5">
                              {list.map((cls) => (
                                <li key={cls.id} className="flex flex-col gap-0.5">
                                  <span className="text-xs font-semibold text-ink">{cls.name}</span>
                                  <span className="text-[11px] text-ink-soft">
                                    {cls.time} · {cls.room}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  )
}
