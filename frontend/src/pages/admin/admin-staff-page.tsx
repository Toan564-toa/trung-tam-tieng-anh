import { useMemo, useState, type FormEvent } from "react"
import { BriefcaseBusiness, Download, Pencil, Plus, RotateCcw, Trash2, UserCog } from "lucide-react"
import { cn } from "cn"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { TableEmpty, TablePagination, TableToolbar, ToolbarSelect } from "@/components/admin/table-toolbar"
import { PageHeader } from "@/components/layout/page-header"
import { Reveal } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { fieldBase, Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { toast } from "@/components/ui/toast"
import { ADMIN_TODAY_LABEL, managedStaff, type ManagedPerson } from "@/data/admin"
import { exportAdminTable } from "@/lib/admin-excel"

const PAGE_SIZE = 10
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/

const STATUS_FILTERS = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "active", label: "Đang hoạt động" },
  { value: "inactive", label: "Ngừng hoạt động" },
  { value: "deleted", label: "Đã xoá" },
]

type PersonValues = {
  code: string
  fullName: string
  email: string
  phone: string
  group: string
  status: ManagedPerson["status"]
}

type PersonErrors = Partial<Record<keyof PersonValues, string>>

const EMPTY_VALUES: PersonValues = {
  code: "",
  fullName: "",
  email: "",
  phone: "",
  group: "",
  status: "active",
}

function nextCode(count: number) {
  return `NV${String(2000 + count).padStart(4, "0")}`
}

export function AdminStaffPage() {
  const [people, setPeople] = useState<ManagedPerson[]>(managedStaff)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<ManagedPerson | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<ManagedPerson | null>(null)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return people.filter((person) => {
      if (filter === "deleted" ? !person.deletedAt : person.deletedAt) return false
      if (filter === "active" && person.status !== "active") return false
      if (filter === "inactive" && person.status !== "inactive") return false
      if (!needle) return true
      return [person.code, person.fullName, person.email, person.phone, person.group].some((field) =>
        field.toLowerCase().includes(needle),
      )
    })
  }, [people, query, filter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const live = people.filter((person) => !person.deletedAt)
  const departments = new Set(live.map((person) => person.group)).size

  const onExport = () => {
    void exportAdminTable(
      "Danh-sach-nhan-vien",
      "Nhan vien",
      ["Mã nhân viên", "Họ và tên", "Phòng ban", "Email", "Số điện thoại", "Ngày vào", "Trạng thái"],
      filtered.map((person) => [
        person.code,
        person.fullName,
        person.group,
        person.email,
        person.phone,
        person.joinedAt,
        person.deletedAt ? "Đã xoá" : person.status === "active" ? "Đang hoạt động" : "Ngừng hoạt động",
      ]),
    )
      .then(() => toast.success("Đã xuất danh sách nhân viên", { description: `${filtered.length} dòng ra file Excel.` }))
      .catch(() => toast.error("Không xuất được file Excel"))
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`${live.length} nhân viên · ${departments} phòng ban · dữ liệu ${ADMIN_TODAY_LABEL}`}
        title="Quản lý nhân viên"
        description="Danh sách nhân viên theo phòng ban, dùng cho phân công tư vấn, thu học phí và đối soát cuối ngày."
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
              <Plus /> Thêm nhân viên
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
            searchPlaceholder="Tìm mã, họ tên, email, SĐT, phòng ban..."
          >
            <ToolbarSelect
              id="stf-status"
              label="Lọc theo trạng thái"
              value={filter}
              onChange={(value) => {
                setFilter(value)
                setPage(1)
              }}
              options={STATUS_FILTERS}
            />
            <span className="text-xs text-ink-soft">{filtered.length} kết quả</span>
          </TableToolbar>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Mã</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Họ tên</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Email</th>
                  <th scope="col" className="px-4 py-3 font-semibold">SĐT</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Phòng ban</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Ngày vào</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((person) => (
                  <tr key={person.id} className="transition-colors hover:bg-surface">
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-ink-soft">{person.code}</td>
                    <td className="px-4 py-3 font-semibold whitespace-nowrap text-ink">{person.fullName}</td>
                    <td className="px-4 py-3 text-ink-soft">{person.email}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-soft tabular-nums">{person.phone}</td>
                    <td className="px-4 py-3 text-ink-soft">{person.group}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-soft tabular-nums">{person.joinedAt}</td>
                    <td className="px-4 py-3">
                      {person.deletedAt ? (
                        <Badge variant="danger">Đã xoá</Badge>
                      ) : (
                        <Badge variant={person.status === "active" ? "success" : "neutral"}>
                          {person.status === "active" ? "Đang hoạt động" : "Ngừng hoạt động"}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {person.deletedAt ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Khôi phục nhân viên ${person.fullName}`}
                            onClick={() => {
                              setPeople((prev) =>
                                prev.map((item) => (item.id === person.id ? { ...item, deletedAt: undefined } : item)),
                              )
                              toast.success("Đã khôi phục nhân viên", { description: `${person.fullName} trở lại danh sách.` })
                            }}
                          >
                            <RotateCcw /> Khôi phục
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Sửa nhân viên ${person.fullName}`}
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
                              aria-label={`Xoá nhân viên ${person.fullName}`}
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
                {rows.length === 0 && <TableEmpty colSpan={8} message="Không có nhân viên nào khớp bộ lọc hiện tại." />}
              </tbody>
            </table>
          </div>

          <TablePagination page={currentPage} pageCount={pageCount} total={filtered.length} onPageChange={setPage} />
        </Card>
      </Reveal>

      <StaffFormModal
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        person={editing}
        suggestCode={nextCode(people.length)}
        onSave={(values) => {
          if (editing) {
            setPeople((prev) => prev.map((item) => (item.id === editing.id ? { ...item, ...values } : item)))
            toast.success("Đã cập nhật nhân viên", { description: `${values.fullName} · ${values.group || "Chưa phân phòng ban"}` })
          } else {
            setPeople((prev) => [
              ...prev,
              {
                id: `stf-${prev.length + 1}-${values.code}`,
                code: values.code,
                fullName: values.fullName,
                email: values.email,
                phone: values.phone,
                group: values.group,
                status: values.status,
                joinedAt: ADMIN_TODAY_LABEL,
              },
            ])
            toast.success("Đã thêm nhân viên mới", { description: `${values.fullName} · ${values.code}` })
          }
          setFormOpen(false)
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Xoá nhân viên"
        description={deleting ? `Xoá mềm hồ sơ nhân viên ${deleting.fullName} (${deleting.code}).` : undefined}
        detail="Nhân viên sẽ mất quyền truy cập hệ thống. Các phiếu thu và lịch đã ghi vẫn được giữ nguyên. Có thể khôi phục trong phiên làm việc này."
        confirmLabel="Xoá nhân viên"
        onConfirm={() => {
          if (!deleting) return
          setPeople((prev) => prev.map((item) => (item.id === deleting.id ? { ...item, deletedAt: ADMIN_TODAY_LABEL } : item)))
          toast.success("Đã xoá nhân viên", { description: `${deleting.fullName} chuyển sang mục đã xoá.` })
          setDeleting(null)
        }}
      />
    </div>
  )
}

function StaffFormModal({
  open,
  onOpenChange,
  person,
  suggestCode,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  person: ManagedPerson | null
  suggestCode: string
  onSave: (values: PersonValues) => void
}) {
  const [values, setValues] = useState<PersonValues>(() =>
    person
      ? {
          code: person.code,
          fullName: person.fullName,
          email: person.email,
          phone: person.phone,
          group: person.group,
          status: person.status,
        }
      : { ...EMPTY_VALUES, code: suggestCode },
  )
  const [errors, setErrors] = useState<PersonErrors>({})

  const update = (key: keyof PersonValues) => (value: string) => {
    setValues((prev) => ({ ...prev, [key]: value as never }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const invalid = (key: keyof PersonValues) => ({
    "aria-invalid": Boolean(errors[key]) || undefined,
    "aria-describedby": errors[key] ? `stf-${key}-error` : undefined,
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const found: PersonErrors = {}
    if (values.fullName.trim().length < 2) found.fullName = "Vui lòng nhập họ và tên nhân viên."
    if (!values.code.trim()) found.code = "Vui lòng nhập mã nhân viên."
    if (!values.email.trim()) found.email = "Vui lòng nhập email công ty."
    else if (!EMAIL_RE.test(values.email.trim())) found.email = "Email không hợp lệ."
    if (!values.phone.trim()) found.phone = "Vui lòng nhập số điện thoại."
    else if (!PHONE_RE.test(values.phone.replace(/[\s.-]/g, ""))) found.phone = "Số điện thoại không hợp lệ (VD: 0909 123 456)."
    if (!values.group.trim()) found.group = "Vui lòng nhập phòng ban."
    setErrors(found)
    if (Object.keys(found).length > 0) {
      toast.error("Vui lòng kiểm tra lại thông tin", { description: "Một số trường chưa hợp lệ." })
      return
    }
    onSave({
      code: values.code.trim(),
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      group: values.group.trim(),
      status: values.status,
    })
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={person ? "Cập nhật nhân viên" : "Thêm nhân viên mới"}
      description="Thông tin liên hệ và phòng ban quyết định phạm vi dữ liệu được phép truy cập."
      icon={person ? <Pencil className="size-6" /> : <UserCog className="size-6" />}
      className="sm:max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ bỏ</Button>
          <Button type="submit" form="staff-admin-form">{person ? "Lưu thay đổi" : "Tạo hồ sơ"}</Button>
        </>
      }
    >
      <form id="staff-admin-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="stf-code" label="Mã nhân viên" required error={errors.code}>
            <Input id="stf-code" value={values.code} onChange={(e) => update("code")(e.target.value)} placeholder="NV2000" {...invalid("code")} />
          </FormField>
          <FormField id="stf-fullName" label="Họ và tên" required error={errors.fullName}>
            <Input id="stf-fullName" value={values.fullName} onChange={(e) => update("fullName")(e.target.value)} placeholder="Lê Thị D" {...invalid("fullName")} />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="stf-email" label="Email công ty" required error={errors.email}>
            <Input id="stf-email" type="email" value={values.email} onChange={(e) => update("email")(e.target.value)} placeholder="ten.d@ttnn.edu.vn" {...invalid("email")} />
          </FormField>
          <FormField id="stf-phone" label="Số điện thoại" required error={errors.phone}>
            <Input id="stf-phone" type="tel" value={values.phone} onChange={(e) => update("phone")(e.target.value)} placeholder="0909 123 456" {...invalid("phone")} />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="stf-group" label="Phòng ban" required error={errors.group}>
            <Input id="stf-group" value={values.group} onChange={(e) => update("group")(e.target.value)} placeholder="VD: Tư vấn – Đào tạo" {...invalid("group")} />
          </FormField>
          <FormField id="stf-status" label="Trạng thái" required>
            <select
              id="stf-status"
              value={values.status}
              onChange={(e) => update("status")(e.target.value)}
              className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}
            >
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Ngừng hoạt động</option>
            </select>
          </FormField>
        </div>

        <p className="flex items-start gap-2 rounded-xl bg-surface p-3 text-xs leading-relaxed text-ink-soft">
          <BriefcaseBusiness className="mt-0.5 size-4 shrink-0" />
          Phòng ban quyết định quyền xem hồ sơ: Tư vấn chỉ thấy khách mới, Thu học thấy công nợ và Kế toán xem toàn bộ báo cáo.
        </p>
      </form>
    </Modal>
  )
}
