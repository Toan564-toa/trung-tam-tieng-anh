import { useState, type FormEvent } from "react"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Download, GraduationCap, Pencil, Plus, RotateCcw, Trash2, UserCheck, UserMinus, Users } from "lucide-react"
import { cn } from "cn"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { TableEmpty, TablePagination, TableToolbar, ToolbarSelect } from "@/components/admin/table-toolbar"
import { StatCard } from "@/components/common/stat-card"
import { PageHeader } from "@/components/layout/page-header"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { fieldBase, Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { toast } from "@/components/ui/toast"
import { studentsApi, type Gender, type StudentListItem, type StudentStatus } from "@/api/students"
import { errorMessage } from "@/lib/api-error"

const PAGE_SIZE = 10
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/

const STATUS_LABEL: Record<StudentStatus, string> = {
  STUDYING: "Đang học",
  FROZEN: "Tạm dừng",
  DROPPED: "Đã bỏ học",
  GRADUATED: "Đã tốt nghiệp",
}

const STATUS_BADGE: Record<StudentStatus, "success" | "warning" | "danger" | "info"> = {
  STUDYING: "success",
  FROZEN: "warning",
  DROPPED: "danger",
  GRADUATED: "info",
}

const STATUS_FILTERS = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "STUDYING", label: "Đang học" },
  { value: "FROZEN", label: "Tạm dừng" },
  { value: "DROPPED", label: "Đã bỏ học" },
  { value: "GRADUATED", label: "Đã tốt nghiệp" },
]

type FormValues = {
  fullName: string
  email: string
  phone: string
  birthDate: string
  gender: string
  level: string
  school: string
  address: string
}

type FormErrors = Partial<Record<keyof FormValues, string>>

const EMPTY_VALUES: FormValues = {
  fullName: "",
  email: "",
  phone: "",
  birthDate: "",
  gender: "",
  level: "",
  school: "",
  address: "",
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("vi-VN")
}

export function AdminStudentsPage() {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<StudentStatus | "all">("all")
  const [onlyDeleted, setOnlyDeleted] = useState(false)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<StudentListItem | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<StudentListItem | null>(null)

  const listQuery = useQuery({
    queryKey: ["students", { query, filter, onlyDeleted, page }],
    queryFn: () =>
      studentsApi.list({
        search: query.trim() || undefined,
        status: filter === "all" ? undefined : filter,
        onlyDeleted,
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })

  // Thống kê: đếm theo trạng thái (lấy 1 dòng chỉ để lấy total).
  const studyingCount = useQuery({
    queryKey: ["students", "count", "STUDYING"],
    queryFn: () => studentsApi.list({ status: "STUDYING", page: 1, pageSize: 1 }),
  })
  const frozenCount = useQuery({
    queryKey: ["students", "count", "FROZEN"],
    queryFn: () => studentsApi.list({ status: "FROZEN", page: 1, pageSize: 1 }),
  })

  const rows = listQuery.data?.items ?? []
  const total = listQuery.data?.total ?? 0
  const pageCount = Math.max(1, listQuery.data?.totalPages ?? 1)
  const stats = {
    total,
    studying: studyingCount.data?.total ?? 0,
    frozen: frozenCount.data?.total ?? 0,
    deleted: 0,
  }

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["students"] })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => studentsApi.remove(id),
    onSuccess: () => {
      invalidate()
      toast.success("Đã xoá hồ sơ học viên", { description: "Hồ sơ chuyển sang mục đã xoá, dữ liệu học phí và điểm danh vẫn được giữ." })
    },
    onError: (err) => toast.error(errorMessage(err, "Không xoá được hồ sơ")),
  })

  const restoreMutation = useMutation({
    mutationFn: (id: number) => studentsApi.restore(id),
    onSuccess: () => {
      invalidate()
      toast.success("Đã khôi phục hồ sơ", { description: "Hồ sơ trở lại danh sách đang hoạt động." })
    },
    onError: (err) => toast.error(errorMessage(err, "Không khôi phục được hồ sơ")),
  })

  const onExport = () => {
    void studentsApi
      .exportExcel({
        search: query.trim() || undefined,
        status: filter === "all" ? undefined : filter,
        onlyDeleted,
        page: 1,
        pageSize: 100,
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = "Danh-sach-hoc-vien.xlsx"
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)
      })
      .then(() => toast.success("Đã xuất danh sách học viên", { description: "File Excel đã được tải xuống." }))
      .catch((err) => toast.error(errorMessage(err, "Không xuất được file Excel")))
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`${stats.total.toLocaleString("vi-VN")} hồ sơ học viên`}
        title="Quản lý học viên"
        description="Tra cứu, thêm, sửa và xoá mềm hồ sơ học viên toàn trung tâm."
        actions={
          <>
            <Button variant="outline" onClick={onExport}>
              <Download /> Xuất Excel
            </Button>
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus /> Thêm học viên
            </Button>
          </>
        }
      />

      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard label="Tổng hồ sơ" value={stats.total.toLocaleString("vi-VN")} icon={Users} />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Đang học"
            value={stats.studying.toLocaleString("vi-VN")}
            icon={UserCheck}
            iconClass="bg-green-100 text-success"
            trend={{ text: `${Math.round((stats.studying / Math.max(1, stats.total)) * 100)}% hồ sơ`, tone: "success" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Tạm dừng"
            value={stats.frozen.toLocaleString("vi-VN")}
            icon={UserMinus}
            iconClass="bg-orange-100 text-warning"
            trend={{ text: "Cần liên hệ phụ huynh", tone: "warning" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Đã xoá"
            value={stats.deleted.toLocaleString("vi-VN")}
            icon={Trash2}
            iconClass="bg-slate-100 text-ink-soft"
            trend={{ text: "Bật 'Chỉ hiện đã xoá' để xem", tone: "info" }}
          />
        </StaggerItem>
      </Stagger>

      <Reveal>
        <Card>
          <TableToolbar
            query={query}
            onQueryChange={(value) => {
              setQuery(value)
              setPage(1)
            }}
            searchPlaceholder="Tìm mã, họ tên, email, SĐT..."
          >
            <ToolbarSelect
              id="stu-status"
              label="Lọc theo trạng thái"
              value={filter}
              onChange={(value) => {
                setFilter(value as StudentStatus | "all")
                setPage(1)
              }}
              options={STATUS_FILTERS}
            />
            <button
              type="button"
              onClick={() => {
                setOnlyDeleted((prev) => !prev)
                setPage(1)
              }}
              aria-pressed={onlyDeleted}
              className={cn(
                "inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition-colors",
                onlyDeleted
                  ? "border-danger/30 bg-red-50 text-danger"
                  : "border-input bg-white text-ink-soft hover:bg-surface",
              )}
            >
              <Trash2 />
              Chỉ hiện đã xoá
            </button>
          </TableToolbar>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Mã</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Họ tên</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Email</th>
                  <th scope="col" className="px-4 py-3 font-semibold">SĐT</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Trình độ</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Ngày vào</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listQuery.isLoading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-ink-soft">
                      Đang tải danh sách học viên…
                    </td>
                  </tr>
                )}
                {listQuery.isError && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-danger">
                      {errorMessage(listQuery.error, "Không tải được danh sách học viên.")}
                    </td>
                  </tr>
                )}
                {!listQuery.isLoading &&
                  !listQuery.isError &&
                  rows.map((person) => (
                    <tr key={person.id} className="transition-colors hover:bg-surface">
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-ink-soft">{person.studentCode}</td>
                      <td className="px-4 py-3 font-semibold whitespace-nowrap text-ink">{person.fullName}</td>
                      <td className="px-4 py-3 text-ink-soft">{person.email ?? "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-ink-soft tabular-nums">{person.phone ?? "—"}</td>
                      <td className="px-4 py-3 text-ink-soft">{person.level ?? "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-ink-soft tabular-nums">{formatDate(person.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <Badge variant={STATUS_BADGE[person.status]}>{STATUS_LABEL[person.status]}</Badge>
                          {person.hasAccount === false && <Badge variant="neutral">Chưa có tài khoản</Badge>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {onlyDeleted ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`Khôi phục hồ sơ ${person.fullName}`}
                              onClick={() => restoreMutation.mutate(person.id)}
                            >
                              <RotateCcw /> Khôi phục
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Sửa hồ sơ ${person.fullName}`}
                                title="Sửa"
                                onClick={() => {
                                  setEditing(person)
                                  setFormOpen(true)
                                }}
                              >
                                <Pencil />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Xoá hồ sơ ${person.fullName}`}
                                title="Xoá"
                                onClick={() => setDeleting(person)}
                              >
                                <Trash2 />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                {!listQuery.isLoading && !listQuery.isError && rows.length === 0 && (
                  <TableEmpty colSpan={8} message="Không có học viên nào khớp bộ lọc hiện tại." />
                )}
              </tbody>
            </table>
          </div>

          <TablePagination page={page} pageCount={pageCount} total={total} onPageChange={setPage} />
        </Card>
      </Reveal>

      <StudentFormModal
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        person={editing}
        onSaved={invalidate}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Xoá hồ sơ học viên"
        description={deleting ? `Xoá mềm hồ sơ ${deleting.fullName} (${deleting.studentCode}).` : undefined}
        detail="Hồ sơ sẽ bị ẩn khỏi danh sách, dữ liệu học phí và điểm danh vẫn được giữ nguyên. Có thể khôi phục sau."
        confirmLabel="Xoá hồ sơ"
        onConfirm={() => {
          if (!deleting) return
          deleteMutation.mutate(deleting.id)
          setDeleting(null)
        }}
      />
    </div>
  )
}

function StudentFormModal({
  open,
  onOpenChange,
  person,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  person: StudentListItem | null
  onSaved: () => void
}) {
  const [values, setValues] = useState<FormValues>(() =>
    person
      ? {
          fullName: person.fullName,
          email: person.email ?? "",
          phone: person.phone ?? "",
          birthDate: person.birthDate ? person.birthDate.slice(0, 10) : "",
          gender: person.gender ?? "",
          level: person.level ?? "",
          school: person.school ?? "",
          address: person.address ?? "",
        }
      : EMPTY_VALUES,
  )
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const update = (key: keyof FormValues) => (value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const invalid = (key: keyof FormValues) => ({
    "aria-invalid": Boolean(errors[key]) || undefined,
    "aria-describedby": errors[key] ? `stu-${key}-error` : undefined,
  })

  const close = () => {
    onOpenChange(false)
    window.setTimeout(() => {
      setValues(EMPTY_VALUES)
      setErrors({})
      setSubmitting(false)
    }, 200)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const found: FormErrors = {}
    if (values.fullName.trim().length < 2) found.fullName = "Vui lòng nhập họ và tên học viên."
    if (!values.email.trim()) found.email = "Vui lòng nhập email."
    else if (!EMAIL_RE.test(values.email.trim())) found.email = "Email không hợp lệ."
    if (!values.phone.trim()) found.phone = "Vui lòng nhập số điện thoại."
    else if (!PHONE_RE.test(values.phone.replace(/[\s.-]/g, ""))) found.phone = "Số điện thoại không hợp lệ (VD: 0909 123 456)."
    setErrors(found)
    if (Object.keys(found).length > 0) {
      toast.error("Vui lòng kiểm tra lại thông tin", { description: "Một số trường chưa hợp lệ." })
      return
    }
    setSubmitting(true)
    const payload = {
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      birthDate: values.birthDate ? new Date(`${values.birthDate}T00:00:00Z`).toISOString() : null,
      gender: (values.gender || null) as Gender,
      level: values.level.trim() || null,
      school: values.school.trim() || null,
      address: values.address.trim() || null,
    }
    try {
      if (person) {
        await studentsApi.update(person.id, payload)
        toast.success("Đã cập nhật hồ sơ học viên", { description: `${payload.fullName} · ${person.studentCode}` })
      } else {
        await studentsApi.create(payload)
        toast.success("Đã thêm học viên mới", { description: payload.fullName })
      }
      close()
      onSaved()
    } catch (err) {
      toast.error(errorMessage(err, person ? "Không cập nhật được hồ sơ" : "Không tạo được hồ sơ"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={close}
      title={person ? "Cập nhật hồ sơ học viên" : "Thêm học viên mới"}
      description="Thông tin dùng cho hồ sơ, xếp lớp, tính học phí và liên hệ phụ huynh. Mã học viên được hệ thống tự sinh."
      icon={person ? <Pencil className="size-6" /> : <GraduationCap className="size-6" />}
      className="sm:max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={() => close()}>Huỷ bỏ</Button>
          <Button type="submit" form="student-admin-form" disabled={submitting}>
            {submitting ? "Đang lưu…" : person ? "Lưu thay đổi" : "Tạo hồ sơ"}
          </Button>
        </>
      }
    >
      <form id="student-admin-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="stu-fullName" label="Họ và tên" required error={errors.fullName}>
            <Input id="stu-fullName" value={values.fullName} onChange={(e) => update("fullName")(e.target.value)} placeholder="Nguyễn Văn A" {...invalid("fullName")} />
          </FormField>
          <FormField id="stu-birthDate" label="Ngày sinh">
            <Input id="stu-birthDate" type="date" value={values.birthDate} onChange={(e) => update("birthDate")(e.target.value)} {...invalid("birthDate")} />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="stu-email" label="Email" required error={errors.email}>
            <Input id="stu-email" type="email" value={values.email} onChange={(e) => update("email")(e.target.value)} placeholder="email@vidu.com" {...invalid("email")} />
          </FormField>
          <FormField id="stu-phone" label="Số điện thoại" required error={errors.phone}>
            <Input id="stu-phone" type="tel" value={values.phone} onChange={(e) => update("phone")(e.target.value)} placeholder="0909 123 456" {...invalid("phone")} />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="stu-gender" label="Giới tính">
            <select
              id="stu-gender"
              value={values.gender}
              onChange={(e) => update("gender")(e.target.value)}
              className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}
            >
              <option value="">Chưa rõ</option>
              <option value="MALE">Nam</option>
              <option value="FEMALE">Nữ</option>
              <option value="OTHER">Khác</option>
            </select>
          </FormField>
          <FormField id="stu-level" label="Trình độ">
            <Input id="stu-level" value={values.level} onChange={(e) => update("level")(e.target.value)} placeholder="VD: Cơ bản" {...invalid("level")} />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="stu-school" label="Trường">
            <Input id="stu-school" value={values.school} onChange={(e) => update("school")(e.target.value)} placeholder="VD: THCS A" {...invalid("school")} />
          </FormField>
          <FormField id="stu-address" label="Địa chỉ">
            <Input id="stu-address" value={values.address} onChange={(e) => update("address")(e.target.value)} placeholder="Địa chỉ hiện tại" {...invalid("address")} />
          </FormField>
        </div>
      </form>
    </Modal>
  )
}
