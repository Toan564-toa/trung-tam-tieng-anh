import { useState, type ChangeEvent, type FormEvent } from "react"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Download, Pencil, Plus, RotateCcw, Trash2, UserCog } from "lucide-react"
import { cn } from "cn"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { TableEmpty, TablePagination, TableToolbar, ToolbarSelect } from "@/components/admin/table-toolbar"
import { PageHeader } from "@/components/layout/page-header"
import { Reveal } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { toast } from "@/components/ui/toast"
import { teachersApi, type Teacher, type TeacherStatus } from "@/api/teachers"
import { errorMessage } from "@/lib/api-error"

const PAGE_SIZE = 10
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/

const STATUS_LABEL: Record<TeacherStatus, string> = {
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Ngừng hoạt động",
}

const STATUS_FILTERS = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "INACTIVE", label: "Ngừng hoạt động" },
]

type FormValues = {
  fullName: string
  email: string
  phone: string
  specialty: string
  certificate: string
  education: string
  startDate: string
  bio: string
  showOnWebsite: boolean
}

type FormErrors = Partial<Record<keyof FormValues, string>>

const EMPTY_VALUES: FormValues = {
  fullName: "",
  email: "",
  phone: "",
  specialty: "",
  certificate: "",
  education: "",
  startDate: "",
  bio: "",
  showOnWebsite: false,
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("vi-VN")
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function AdminTeachersPage() {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<TeacherStatus | "all">("all")
  const [onlyDeleted, setOnlyDeleted] = useState(false)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Teacher | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Teacher | null>(null)

  const listQuery = useQuery({
    queryKey: ["teachers", { query, filter, onlyDeleted, page }],
    queryFn: () =>
      teachersApi.list({
        query: query.trim() || undefined,
        status: filter === "all" ? undefined : filter,
        onlyDeleted,
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })

  const rows = listQuery.data?.items ?? []
  const total = listQuery.data?.total ?? 0
  const pageCount = Math.max(1, listQuery.data?.totalPages ?? 1)

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["teachers"] })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => teachersApi.remove(id),
    onSuccess: () => {
      invalidate()
      toast.success("Đã xoá hồ sơ giáo viên", { description: "Hồ sơ chuyển sang mục đã xoá, có thể khôi phục." })
    },
    onError: (err) => toast.error(errorMessage(err, "Không xoá được hồ sơ")),
  })

  const restoreMutation = useMutation({
    mutationFn: (id: number) => teachersApi.restore(id),
    onSuccess: () => {
      invalidate()
      toast.success("Đã khôi phục hồ sơ", { description: "Hồ sơ trở lại danh sách đang hoạt động." })
    },
    onError: (err) => toast.error(errorMessage(err, "Không khôi phục được hồ sơ")),
  })

  const onExport = () => {
    void teachersApi
      .exportExcel({
        query: query.trim() || undefined,
        status: filter === "all" ? undefined : filter,
        onlyDeleted,
        page: 1,
        pageSize: 100,
      })
      .then((blob) => downloadBlob(blob, "Danh-sach-giao-vien.xlsx"))
      .then(() => toast.success("Đã xuất danh sách giáo viên", { description: "File Excel đã được tải xuống." }))
      .catch((err) => toast.error(errorMessage(err, "Không xuất được file Excel")))
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`${total.toLocaleString("vi-VN")} giáo viên`}
        title="Quản lý giáo viên"
        description="Danh sách giáo viên, lớp phụ trách và thông tin liên hệ để phân công giảng dạy."
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
              <Plus /> Thêm giáo viên
            </Button>
          </>
        }
      />

      <Reveal>
        <Card>
          <TableToolbar
            query={query}
            onQueryChange={(value) => {
              setQuery(value)
              setPage(1)
            }}
            searchPlaceholder="Tìm mã, họ tên, email, SĐT, chuyên môn..."
          >
            <ToolbarSelect
              id="tea-status"
              label="Lọc theo trạng thái"
              value={filter}
              onChange={(value) => {
                setFilter(value as TeacherStatus | "all")
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
                  <th scope="col" className="px-4 py-3 font-semibold">Chuyên môn</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Ngày vào</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listQuery.isLoading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-ink-soft">
                      Đang tải danh sách giáo viên…
                    </td>
                  </tr>
                )}
                {listQuery.isError && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-danger">
                      {errorMessage(listQuery.error, "Không tải được danh sách giáo viên.")}
                    </td>
                  </tr>
                )}
                {!listQuery.isLoading &&
                  !listQuery.isError &&
                  rows.map((person) => (
                    <tr key={person.id} className="transition-colors hover:bg-surface">
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-ink-soft">{person.teacherCode}</td>
                      <td className="px-4 py-3 font-semibold whitespace-nowrap text-ink">{person.fullName}</td>
                      <td className="px-4 py-3 text-ink-soft">{person.email ?? "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-ink-soft tabular-nums">{person.phone ?? "—"}</td>
                      <td className="px-4 py-3 text-ink-soft">{person.specialty ?? "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-ink-soft tabular-nums">{formatDate(person.startDate)}</td>
                      <td className="px-4 py-3">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <Badge variant={person.status === "ACTIVE" ? "success" : "neutral"}>{STATUS_LABEL[person.status]}</Badge>
                          {person.showOnWebsite && <Badge variant="info">Hiện website</Badge>}
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
                  <TableEmpty colSpan={8} message="Không có giáo viên nào khớp bộ lọc hiện tại." />
                )}
              </tbody>
            </table>
          </div>

          <TablePagination page={page} pageCount={pageCount} total={total} onPageChange={setPage} />
        </Card>
      </Reveal>

      <TeacherFormModal
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        person={editing}
        onSaved={invalidate}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Xoá hồ sơ giáo viên"
        description={deleting ? `Xoá mềm hồ sơ ${deleting.fullName} (${deleting.teacherCode}).` : undefined}
        detail="Hồ sơ sẽ bị ẩn khỏi danh sách, dữ liệu lớp học và điểm danh vẫn được giữ nguyên. Có thể khôi phục sau."
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

function TeacherFormModal({
  open,
  onOpenChange,
  person,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  person: Teacher | null
  onSaved: () => void
}) {
  const [values, setValues] = useState<FormValues>(() =>
    person
      ? {
          fullName: person.fullName,
          email: person.email ?? "",
          phone: person.phone ?? "",
          specialty: person.specialty ?? "",
          certificate: person.certificate ?? "",
          education: person.education ?? "",
          startDate: person.startDate ? person.startDate.slice(0, 10) : "",
          bio: person.bio ?? "",
          showOnWebsite: person.showOnWebsite,
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
    "aria-describedby": errors[key] ? `tea-${key}-error` : undefined,
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
    if (values.fullName.trim().length < 2) found.fullName = "Vui lòng nhập họ và tên giáo viên."
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
      specialty: values.specialty.trim() || null,
      certificate: values.certificate.trim() || null,
      education: values.education.trim() || null,
      startDate: values.startDate ? new Date(`${values.startDate}T00:00:00Z`).toISOString() : null,
      bio: values.bio.trim() || null,
      showOnWebsite: values.showOnWebsite,
    }
    try {
      if (person) {
        await teachersApi.update(person.id, payload)
        toast.success("Đã cập nhật hồ sơ giáo viên", { description: `${payload.fullName} · ${person.teacherCode}` })
      } else {
        await teachersApi.create(payload)
        toast.success("Đã thêm giáo viên mới", { description: payload.fullName })
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
      title={person ? "Cập nhật hồ sơ giáo viên" : "Thêm giáo viên mới"}
      description="Thông tin liên hệ, chuyên môn và hiển thị trên website. Mã giáo viên được hệ thống tự sinh."
      icon={person ? <Pencil className="size-6" /> : <UserCog className="size-6" />}
      className="sm:max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={() => close()}>Huỷ bỏ</Button>
          <Button type="submit" form="teacher-admin-form" disabled={submitting}>
            {submitting ? "Đang lưu…" : person ? "Lưu thay đổi" : "Tạo hồ sơ"}
          </Button>
        </>
      }
    >
      <form id="teacher-admin-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="tea-fullName" label="Họ và tên" required error={errors.fullName}>
            <Input id="tea-fullName" value={values.fullName} onChange={(e) => update("fullName")(e.target.value)} placeholder="Lê Văn C" {...invalid("fullName")} />
          </FormField>
          <FormField id="tea-specialty" label="Chuyên môn">
            <Input id="tea-specialty" value={values.specialty} onChange={(e) => update("specialty")(e.target.value)} placeholder="VD: Tiếng Anh thiếu nhi" {...invalid("specialty")} />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="tea-email" label="Email" required error={errors.email}>
            <Input id="tea-email" type="email" value={values.email} onChange={(e) => update("email")(e.target.value)} placeholder="email@vidu.com" {...invalid("email")} />
          </FormField>
          <FormField id="tea-phone" label="Số điện thoại" required error={errors.phone}>
            <Input id="tea-phone" type="tel" value={values.phone} onChange={(e) => update("phone")(e.target.value)} placeholder="0909 123 456" {...invalid("phone")} />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="tea-certificate" label="Chứng chỉ">
            <Input id="tea-certificate" value={values.certificate} onChange={(e) => update("certificate")(e.target.value)} placeholder="VD: IELTS 8.0, TESOL" {...invalid("certificate")} />
          </FormField>
          <FormField id="tea-education" label="Học vấn">
            <Input id="tea-education" value={values.education} onChange={(e) => update("education")(e.target.value)} placeholder="VD: Cử nhân Sư phạm" {...invalid("education")} />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="tea-startDate" label="Ngày vào">
            <Input id="tea-startDate" type="date" value={values.startDate} onChange={(e) => update("startDate")(e.target.value)} {...invalid("startDate")} />
          </FormField>
          <FormField id="tea-bio" label="Giới thiệu">
            <Input id="tea-bio" value={values.bio} onChange={(e) => update("bio")(e.target.value)} placeholder="Giới thiệu ngắn gọn" {...invalid("bio")} />
          </FormField>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-surface px-3.5 py-3 text-sm">
          <input
            type="checkbox"
            checked={values.showOnWebsite}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setValues((prev) => ({ ...prev, showOnWebsite: e.target.checked }))
            }
            className="size-4 accent-amber-400"
          />
          <span className="text-ink">
            Hiện giáo viên này trên trang chủ của website
            <span className="block text-xs text-ink-soft">Ảnh đại diện và giới thiệu sẽ hiển thị công khai.</span>
          </span>
        </label>
      </form>
    </Modal>
  )
}
