import { useMemo, useState } from "react"
import {
  BookOpen,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  GraduationCap,
  Pencil,
  Plus,
  Trash2,
  Users,
  Wallet,
} from "lucide-react"
import { cn } from "cn"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
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
import {
  ADMIN_COURSES,
  ADMIN_TODAY_LABEL,
  COURSE_STATUS_META,
  type AdminCourse,
  type CourseStatus,
} from "@/data/admin"
import { exportAdminTable } from "@/lib/admin-excel"
import { formatVnd } from "@/lib/format"

const PAGE_SIZE = 10

const COURSE_STATUSES = Object.keys(COURSE_STATUS_META) as CourseStatus[]

type CourseDraft = {
  id: string | null
  name: string
  level: string
  lessons: string
  tuition: string
  target: string
  status: CourseStatus
}

type CourseErrors = {
  name?: string
  level?: string
  lessons?: string
  tuition?: string
  target?: string
}

const EMPTY_DRAFT: CourseDraft = {
  id: null,
  name: "",
  level: "A1 · Beginner",
  lessons: "64",
  tuition: "8400000",
  target: "200",
  status: "draft",
}

function parseNumber(value: string) {
  return Number(value.replace(/\D/g, ""))
}

export function AdminCoursesPage() {
  const [courses, setCourses] = useState<AdminCourse[]>(ADMIN_COURSES)
  const [hiddenIds, setHiddenIds] = useState<string[]>([])

  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<CourseStatus | "all">("all")
  const [page, setPage] = useState(1)

  const [draft, setDraft] = useState<CourseDraft | null>(null)
  const [errors, setErrors] = useState<CourseErrors>({})
  const [pendingDelete, setPendingDelete] = useState<AdminCourse | null>(null)

  const visibleCourses = useMemo(
    () => courses.filter((course) => !hiddenIds.includes(course.id)),
    [courses, hiddenIds],
  )

  const stats = useMemo(() => {
    const open = visibleCourses.filter((course) => course.status === "published")
    const students = visibleCourses.reduce((sum, course) => sum + course.enrolled, 0)
    const potential = visibleCourses.reduce((sum, course) => sum + course.tuition * course.enrolled, 0)
    const target = visibleCourses.reduce((sum, course) => sum + course.target, 0)
    return { open: open.length, students, potential, target }
  }, [visibleCourses])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return visibleCourses.filter((course) => {
      if (statusFilter !== "all" && course.status !== statusFilter) return false
      if (!needle) return true
      return course.name.toLowerCase().includes(needle) || course.level.toLowerCase().includes(needle)
    })
  }, [visibleCourses, query, statusFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const openCreate = () => {
    setErrors({})
    setDraft({ ...EMPTY_DRAFT })
  }

  const openEdit = (course: AdminCourse) => {
    setErrors({})
    setDraft({
      id: course.id,
      name: course.name,
      level: course.level,
      lessons: String(course.lessons),
      tuition: String(course.tuition),
      target: String(course.target),
      status: course.status,
    })
  }

  const closeDraft = () => {
    setDraft(null)
    setErrors({})
  }

  const saveDraft = () => {
    if (!draft) return
    const lessons = parseNumber(draft.lessons)
    const tuition = parseNumber(draft.tuition)
    const target = parseNumber(draft.target)
    const nextErrors: CourseErrors = {}

    if (!draft.name.trim()) nextErrors.name = "Vui lòng nhập tên khóa học."
    if (!draft.level.trim()) nextErrors.level = "Vui lòng nhập trình độ."
    if (!draft.lessons.trim() || Number.isNaN(lessons) || lessons <= 0) nextErrors.lessons = "Số buổi phải lớn hơn 0."
    if (!draft.tuition.trim() || Number.isNaN(tuition) || tuition <= 0) nextErrors.tuition = "Học phí phải lớn hơn 0."
    if (!draft.target.trim() || Number.isNaN(target) || target <= 0) nextErrors.target = "Chỉ tiêu sĩ số phải lớn hơn 0."

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Vui lòng kiểm tra lại thông tin khóa học")
      return
    }

    if (draft.id) {
      setCourses((prev) =>
        prev.map((course) =>
          course.id === draft.id
            ? {
                ...course,
                name: draft.name.trim(),
                level: draft.level.trim(),
                lessons,
                tuition,
                target,
                status: draft.status,
                updatedAt: ADMIN_TODAY_LABEL,
              }
            : course,
        ),
      )
      toast.success("Đã cập nhật khóa học", { description: draft.name.trim() })
      closeDraft()
      return
    }

    const payload: AdminCourse = {
      id: `course-${Date.now()}`,
      name: draft.name.trim(),
      level: draft.level.trim(),
      lessons,
      tuition,
      enrolled: 0,
      target,
      status: draft.status,
      updatedAt: ADMIN_TODAY_LABEL,
    }
    setCourses((prev) => [payload, ...prev])
    toast.success("Đã tạo khóa học", { description: `${payload.name} · ${COURSE_STATUS_META[payload.status].label}` })
    closeDraft()
  }

  const togglePublished = (course: AdminCourse) => {
    const nextStatus: CourseStatus = course.status === "published" ? "draft" : "published"
    setCourses((prev) =>
      prev.map((item) =>
        item.id === course.id ? { ...item, status: nextStatus, updatedAt: ADMIN_TODAY_LABEL } : item,
      ),
    )
    toast.success(nextStatus === "published" ? "Đã hiện khóa học trên website" : "Đã ẩn khóa học khỏi website", {
      description: course.name,
    })
  }

  const softDelete = (course: AdminCourse) => {
    setCourses((prev) =>
      prev.map((item) =>
        item.id === course.id ? { ...item, status: "archived", updatedAt: ADMIN_TODAY_LABEL } : item,
      ),
    )
    setHiddenIds((prev) => [...prev, course.id])
    setPendingDelete(null)
    toast.success("Đã xoá khóa học", { description: `${course.name} · có thể khôi phục trong nhật ký thao tác` })
  }

  const exportCourses = () => {
    void exportAdminTable(
      "Khoa-hoc",
      "Khóa học",
      ["Khóa học", "Trình độ", "Số buổi", "Học phí", "Sĩ số", "Chỉ tiêu", "Trạng thái", "Cập nhật"],
      filtered.map((course) => [
        course.name,
        course.level,
        course.lessons,
        course.tuition,
        course.enrolled,
        course.target,
        COURSE_STATUS_META[course.status].label,
        course.updatedAt,
      ]),
    ).then(() => toast.success("Đã xuất Excel khóa học"))
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`Chương trình đào tạo · dữ liệu ${ADMIN_TODAY_LABEL}`}
        title="Khóa học"
        description="Quản lý học phí, số buổi, chỉ tiêu sĩ số và trạng thái hiển thị của từng khóa học trên website."
        actions={
          <>
            <Button variant="outline" onClick={exportCourses}>
              <Download /> Xuất Excel
            </Button>
            <Button onClick={openCreate}>
              <Plus /> Thêm khóa học
            </Button>
          </>
        }
      />

      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard
            label="Tổng khóa học"
            value={String(visibleCourses.length)}
            icon={BookOpen}
            trend={{ text: `${stats.target.toLocaleString("vi-VN")} chỉ tiêu sĩ số`, tone: "info" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Khóa đang mở"
            value={String(stats.open)}
            icon={CheckCircle2}
            iconClass="bg-green-100 text-success"
            trend={{
              text: `${visibleCourses.filter((c) => c.status === "draft").length} bản nháp chờ duyệt`,
              tone: "warning",
            }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Sĩ số đang theo học"
            value={stats.students.toLocaleString("vi-VN")}
            icon={GraduationCap}
            iconClass="bg-sky-100 text-sky-700"
            trend={{
              text: `${Math.round((stats.students / Math.max(1, stats.target)) * 100)}% chỉ tiêu`,
              tone: "info",
            }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Doanh thu tiềm năng"
            value={formatVnd(stats.potential)}
            icon={Wallet}
            iconClass="bg-orange-100 text-warning"
            trend={{ text: "Học phí × sĩ số hiện tại", tone: "success" }}
          />
        </StaggerItem>
      </Stagger>

      <Reveal delay={0.05}>
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle>Danh sách khóa học</CardTitle>
              <CardDescription>Sĩ số hiển thị theo thang chỉ tiêu của từng khóa</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportCourses}>
              <Download /> Xuất Excel
            </Button>
          </CardHeader>
          <TableToolbar
            query={query}
            onQueryChange={(value) => {
              setQuery(value)
              setPage(1)
            }}
            searchPlaceholder="Tìm khóa học, trình độ…"
          >
            <ToolbarSelect
              id="course-status"
              label="Lọc trạng thái"
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value as CourseStatus | "all")
                setPage(1)
              }}
              options={[
                { value: "all", label: "Tất cả trạng thái" },
                ...COURSE_STATUSES.map((key) => ({ value: key, label: COURSE_STATUS_META[key].label })),
              ]}
            />
            <span className="flex items-center gap-1.5 text-xs text-ink-soft">
              <Users className="size-3.5" /> {filtered.length} khóa
            </span>
          </TableToolbar>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1020px] text-left text-sm">
                <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-2.5">Khóa học</th>
                    <th scope="col" className="px-3 py-2.5">Trình độ</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Số buổi</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Học phí</th>
                    <th scope="col" className="px-3 py-2.5">Sĩ số</th>
                    <th scope="col" className="px-3 py-2.5">Trạng thái</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Cập nhật</th>
                    <th scope="col" className="px-4 py-2.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((course) => (
                    <tr key={course.id} className="transition-colors hover:bg-surface">
                      <td className="px-4 py-3">
                        <span className="block font-semibold text-ink">{course.name}</span>
                        <span className="block font-mono text-[11px] text-ink-soft">{course.id}</span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{course.level}</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-ink">{course.lessons}</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-ink">
                        {formatVnd(course.tuition)}
                      </td>
                      <td className="w-56 px-3 py-3">
                        <Progress value={course.enrolled} max={course.target} size="sm" hideValue className="min-w-32" />
                        <p className="mt-1.5 text-xs tabular-nums text-ink-soft">
                          <span className="font-semibold text-ink">{course.enrolled}</span> / {course.target} học viên
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={COURSE_STATUS_META[course.status].badge}>
                          {COURSE_STATUS_META[course.status].label}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-ink-soft">
                        {course.updatedAt}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(course)}>
                            <Pencil /> Sửa
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => togglePublished(course)}>
                            {course.status === "published" ? <EyeOff /> : <Eye />}
                            {course.status === "published" ? "Ẩn" : "Hiện"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-danger hover:bg-red-50"
                            onClick={() => setPendingDelete(course)}
                          >
                            <Trash2 /> Xoá
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && <TableEmpty colSpan={8} />}
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
        title={draft?.id ? "Chỉnh sửa khóa học" : "Thêm khóa học"}
        description="Thay đổi ở đây chỉ có tác dụng trong phiên làm việc hiện tại."
        icon={<BookOpen className="size-6" />}
        footer={
          <>
            <Button variant="outline" onClick={closeDraft}>
              Huỷ bỏ
            </Button>
            <Button onClick={saveDraft}>{draft?.id ? "Lưu thay đổi" : "Tạo khóa học"}</Button>
          </>
        }
      >
        {draft && (
          <div className="flex flex-col gap-4">
            <FormField id="course-name" label="Tên khóa học" required error={errors.name}>
              <Input
                id="course-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Ví dụ: Tiếng Anh Tiền Trung Cấp"
                aria-invalid={Boolean(errors.name) || undefined}
                aria-describedby={errors.name ? "course-name-error" : undefined}
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="course-level" label="Trình độ" required error={errors.level}>
                <Input
                  id="course-level"
                  value={draft.level}
                  onChange={(e) => setDraft({ ...draft, level: e.target.value })}
                  placeholder="A2 · Elementary"
                  aria-invalid={Boolean(errors.level) || undefined}
                />
              </FormField>
              <FormField id="course-lessons" label="Số buổi" required error={errors.lessons}>
                <Input
                  id="course-lessons"
                  inputMode="numeric"
                  className="tabular-nums"
                  value={draft.lessons}
                  onChange={(e) => setDraft({ ...draft, lessons: e.target.value })}
                  aria-invalid={Boolean(errors.lessons) || undefined}
                />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="course-tuition" label="Học phí (VNĐ)" required error={errors.tuition}>
                <Input
                  id="course-tuition"
                  inputMode="numeric"
                  className="tabular-nums"
                  value={draft.tuition}
                  onChange={(e) => setDraft({ ...draft, tuition: e.target.value })}
                  aria-invalid={Boolean(errors.tuition) || undefined}
                />
              </FormField>
              <FormField id="course-target" label="Chỉ tiêu sĩ số" required error={errors.target}>
                <Input
                  id="course-target"
                  inputMode="numeric"
                  className="tabular-nums"
                  value={draft.target}
                  onChange={(e) => setDraft({ ...draft, target: e.target.value })}
                  aria-invalid={Boolean(errors.target) || undefined}
                />
              </FormField>
            </div>
            <FormField id="course-status-field" label="Trạng thái" required>
              <select
                id="course-status-field"
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as CourseStatus })}
                className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}
              >
                {COURSE_STATUSES.map((key) => (
                  <option key={key} value={key}>
                    {COURSE_STATUS_META[key].label}
                  </option>
                ))}
              </select>
            </FormField>
            {draft.id && (
              <p className="rounded-xl bg-sky-50 p-3 text-xs leading-relaxed text-sky-800">
                Trạng thái “Đang mở” hiển thị khóa học trên website. Trạng thái “Bản nháp” chỉ hiện trong khu vực quản trị.
              </p>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Xoá khóa học?"
        description={pendingDelete ? `${pendingDelete.name} · ${pendingDelete.level}` : undefined}
        detail={
          pendingDelete
            ? `Khóa học sẽ được ẩn khỏi danh sách và website. ${pendingDelete.enrolled.toLocaleString("vi-VN")} học viên đang theo học vẫn giữ nguyên lịch học.`
            : undefined
        }
        confirmLabel="Xoá khóa học"
        onConfirm={() => pendingDelete && softDelete(pendingDelete)}
      />
    </div>
  )
}
