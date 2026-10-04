import { useMemo, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Pencil,
  Plus,
  Search,
  UserPlus,
  Users,
} from "lucide-react"
import { cn } from "cn"
import { SmartImage } from "@/components/common/smart-image"
import { PageHeader } from "@/components/layout/page-header"
import { Reveal } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { fieldBase, Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { formatDate, toDateKey } from "@/lib/date"
import { formatVnd } from "@/lib/format"
import { exportStudentsSheet } from "@/lib/excel"
import { STAFF_TODAY } from "@/data/staff"
import {
  CENTER_CLASSES,
  STAFF_PROFILE,
  STAFF_STUDENTS,
  STAFF_TEAM,
  STUDENT_STATUS_META,
  TUITION_STATUS_META,
  classNameOf,
  filterStudents,
  getStaffMember,
  tuitionProgress,
  type StaffStudent,
  type StudentStatus,
  type TuitionStatus,
} from "@/data/staff"

const PAGE_SIZE = 10

type SortKey = "name" | "debt" | "class"

type FormValues = {
  fullName: string
  studentCode: string
  birthDate: string
  gender: string
  phone: string
  email: string
  address: string
  identityNo: string
  classId: string
  staffId: string
  level: string
  status: StudentStatus
  guardianName: string
  guardianRelation: string
  guardianPhone: string
  note: string
}

type FormErrors = Partial<Record<keyof FormValues, string>>

const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const EMPTY_FORM: FormValues = {
  fullName: "",
  studentCode: "",
  birthDate: "",
  gender: "Nữ",
  phone: "",
  email: "",
  address: "",
  identityNo: "",
  classId: CENTER_CLASSES[0].id,
  staffId: STAFF_PROFILE.id,
  level: CENTER_CLASSES[0].level.split(" · ")[0],
  status: "active",
  guardianName: "",
  guardianRelation: "Mẹ",
  guardianPhone: "",
  note: "",
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {}
  if (values.fullName.trim().length < 2) errors.fullName = "Vui lòng nhập họ tên học viên."
  if (!values.studentCode.trim()) errors.studentCode = "Vui lòng nhập mã học viên."
  if (!values.birthDate) errors.birthDate = "Vui lòng chọn ngày sinh."
  else if (new Date(values.birthDate) > STAFF_TODAY) errors.birthDate = "Ngày sinh không hợp lệ."
  if (!values.phone.trim()) errors.phone = "Vui lòng nhận số điện thoại."
  else if (!PHONE_RE.test(values.phone.replace(/[\s.-]/g, ""))) errors.phone = "Số điện thoại không hợp lệ (VD: 0909 123 456)."
  if (values.email.trim() && !EMAIL_RE.test(values.email.trim())) errors.email = "Email không hợp lệ."
  if (!values.address.trim()) errors.address = "Vui lòng nhập địa chỉ."
  if (!values.guardianName.trim()) errors.guardianName = "Vui lòng nhập tên phụ huynh."
  if (!values.guardianPhone.trim()) errors.guardianPhone = "Vui lòng nhận SĐT phụ huynh."
  else if (!PHONE_RE.test(values.guardianPhone.replace(/[\s.-]/g, ""))) errors.guardianPhone = "SĐT phụ huynh không hợp lệ."
  if (values.note.length > 500) errors.note = "Ghi chú tối đa 500 ký tự."
  return errors
}

export function StaffStudentsPage() {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<StudentStatus | "all">("all")
  const [classId, setClassId] = useState("all")
  const [staffId, setStaffId] = useState("all")
  const [tuition, setTuition] = useState<TuitionStatus | "all">("all")
  const [sort, setSort] = useState<SortKey>("name")
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<StaffStudent | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const filtered = useMemo(() => {
    const list = filterStudents({ query, status, classId, staffId, tuition })
    const sorted = [...list]
    if (sort === "name") sorted.sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"))
    if (sort === "debt") sorted.sort((a, b) => b.tuition.remaining - a.tuition.remaining)
    if (sort === "class") sorted.sort((a, b) => classNameOf(a.classId).localeCompare(classNameOf(b.classId), "vi"))
    return sorted
  }, [query, status, classId, staffId, tuition, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value)
    setPage(1)
  }

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (student: StaffStudent) => {
    setEditing(student)
    setFormOpen(true)
  }

  const totalDebt = filtered.reduce((sum, student) => sum + student.tuition.remaining, 0)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={`${STAFF_STUDENTS.length} hồ sơ trong hệ thống`}
        title="Học viên"
        description="Tra cứu, lọc và cập nhật hồ sơ học viên toàn trung tâm. Xuất danh sách ra Excel để đối soát."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                void exportStudentsSheet(
                  filtered.map((student) => ({
                    studentCode: student.studentCode,
                    fullName: student.fullName,
                    gender: student.gender,
                    birthDate: student.birthDate,
                    phone: student.phone,
                    email: student.email,
                    className: classNameOf(student.classId),
                    staffName: getStaffMember(student.staffId)?.fullName ?? "",
                    statusLabel: STUDENT_STATUS_META[student.status].label,
                    tuitionLabel: TUITION_STATUS_META[student.tuition.status].label,
                    remaining: student.tuition.remaining,
                  })),
                )
              }
            >
              <Download /> Xuất Excel
            </Button>
            <Button onClick={openCreate}>
              <Plus /> Thêm học viên
            </Button>
          </>
        }
      />

      {/* Bộ lọc */}
      <Reveal>
        <Card>
          <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-soft" />
              <Input
                value={query}
                onChange={(e) => resetPage(setQuery)(e.target.value)}
                placeholder="Tìm theo tên, mã học viên, SĐT học viên hoặc phụ huynh..."
                aria-label="Tìm học viên"
                className="pl-11"
              />
            </div>

            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="hidden size-4 text-ink-soft lg:block" />
                <FilterSelect
                  label="Trạng thái"
                  value={status}
                  onChange={(value) => resetPage(setStatus)(value as StudentStatus | "all")}
                  options={[
                    { value: "all", label: "Tất cả" },
                    ...(Object.keys(STUDENT_STATUS_META) as StudentStatus[]).map((key) => ({ value: key, label: STUDENT_STATUS_META[key].label })),
                  ]}
                />
                <FilterSelect
                  label="Lớp"
                  value={classId}
                  onChange={(value) => resetPage(setClassId)(value)}
                  options={[{ value: "all", label: "Tất cả lớp" }, ...CENTER_CLASSES.map((cls) => ({ value: cls.id, label: cls.name }))]}
                />
                <FilterSelect
                  label="Nhân viên"
                  value={staffId}
                  onChange={(value) => resetPage(setStaffId)(value)}
                  options={[{ value: "all", label: "Tất cả NV" }, ...STAFF_TEAM.map((member) => ({ value: member.id, label: member.fullName }))]}
                />
                <FilterSelect
                  label="Học phí"
                  value={tuition}
                  onChange={(value) => resetPage(setTuition)(value as TuitionStatus | "all")}
                  options={[
                    { value: "all", label: "Tất cả" },
                    ...(Object.keys(TUITION_STATUS_META) as TuitionStatus[]).map((key) => ({ value: key, label: TUITION_STATUS_META[key].label })),
                  ]}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-ink-soft">{filtered.length} kết quả</span>
                {(["name", "debt", "class"] as SortKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSort(key)}
                    className={cn(
                      "min-h-9 cursor-pointer rounded-full px-3 text-xs font-semibold transition-colors",
                      sort === key ? "bg-brand text-ink shadow-glow" : "bg-surface text-ink-soft hover:bg-cream",
                    )}
                  >
                    {key === "name" ? "A → Z" : key === "debt" ? "Nợ nhiều" : "Theo lớp"}
                  </button>
                ))}
              </div>
            </div>

            <p className="rounded-xl bg-surface px-3.5 py-2.5 text-xs text-ink-soft">
              Tổng học phí còn phải thu trong danh sách đang lọc:{" "}
              <span className="font-semibold text-danger tabular-nums">{formatVnd(totalDebt)}</span>
            </p>
          </CardContent>
        </Card>
      </Reveal>

      {/* Bảng dữ liệu — desktop */}
      <Reveal delay={0.05}>
        <div className="hidden overflow-hidden rounded-2xl border border-slate-100 bg-white lg:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Học viên</th>
                <th scope="col" className="px-4 py-3 font-semibold">Lớp</th>
                <th scope="col" className="px-4 py-3 font-semibold">Phụ huynh</th>
                <th scope="col" className="px-4 py-3 font-semibold">Trạng thái</th>
                <th scope="col" className="px-4 py-3 font-semibold">Học phí</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Còn phải thu</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((student) => (
                <tr key={student.id} className="transition-colors hover:bg-cream/30">
                  <td className="px-4 py-3.5">
                    <Link to={`/nhan-vien/hoc-vien/${student.id}`} className="flex items-center gap-3">
                      <SmartImage src={student.avatar} alt={student.fullName} className="size-9 shrink-0 rounded-full" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink hover:text-amber-600">{student.fullName}</span>
                        <span className="block truncate text-xs text-ink-soft">{student.studentCode}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-ink-soft">
                    <span className="block truncate">{classNameOf(student.classId)}</span>
                    <span className="block truncate text-xs text-slate-400">{getStaffMember(student.staffId)?.fullName}</span>
                  </td>
                  <td className="px-4 py-3.5 text-ink-soft">
                    <span className="block truncate">{student.guardian.fullName}</span>
                    <span className="block truncate text-xs text-slate-400">{student.guardian.phone}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={STUDENT_STATUS_META[student.status].badge}>{STUDENT_STATUS_META[student.status].label}</Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={TUITION_STATUS_META[student.tuition.status].badge}>{TUITION_STATUS_META[student.tuition.status].label}</Badge>
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold whitespace-nowrap text-ink tabular-nums">
                    {student.tuition.remaining > 0 ? formatVnd(student.tuition.remaining) : "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end gap-1.5">
                      <Button variant="ghost" size="sm" render={<Link to={`/nhan-vien/hoc-vien/${student.id}`} />}>
                        Hồ sơ
                      </Button>
                      <Button variant="ghost" size="icon" aria-label={`Sửa hồ sơ ${student.fullName}`} onClick={() => openEdit(student)}>
                        <Pencil />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>

      {/* Danh sách thẻ — mobile */}
      <Reveal delay={0.05}>
        <ul className="flex flex-col gap-3 lg:hidden">
          {rows.map((student) => (
            <li key={student.id}>
              <Link
                to={`/nhan-vien/hoc-vien/${student.id}`}
                className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-soft"
              >
                <div className="flex items-start gap-3">
                  <SmartImage src={student.avatar} alt={student.fullName} className="size-11 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{student.fullName}</p>
                    <p className="truncate text-xs text-ink-soft">
                      {student.studentCode} · {classNameOf(student.classId)}
                    </p>
                  </div>
                  <Badge variant={STUDENT_STATUS_META[student.status].badge} className="shrink-0">
                    {STUDENT_STATUS_META[student.status].label}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant={TUITION_STATUS_META[student.tuition.status].badge}>{TUITION_STATUS_META[student.tuition.status].label}</Badge>
                  <p className="font-heading text-sm font-extrabold text-ink tabular-nums">
                    {student.tuition.remaining > 0 ? `Còn ${formatVnd(student.tuition.remaining)}` : "Đã đóng đủ"}
                  </p>
                </div>
                <p className="text-xs text-ink-soft">
                  PH: {student.guardian.fullName} · {student.guardian.phone}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </Reveal>

      {filtered.length === 0 && (
        <Reveal>
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
              <Users className="size-6 text-slate-300" />
              <p className="text-sm font-semibold text-ink">Không tìm thấy học viên</p>
              <p className="text-xs text-ink-soft">Thử đổi từ khoá hoặc bỏ bớt bộ lọc.</p>
            </CardContent>
          </Card>
        </Reveal>
      )}

      {/* Phân trang */}
      <Reveal delay={0.1}>
        <Card>
          <CardContent className="flex flex-col items-center justify-between gap-3 p-4 sm:flex-row">
            <p className="text-xs text-ink-soft">
              Trang {currentPage}/{totalPages} · hiển thị {rows.length} trong {filtered.length} học viên
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft /> Trước
              </Button>
              {Array.from({ length: totalPages }, (_, index) => index + 1)
                .filter((value) => Math.abs(value - currentPage) <= 1)
                .map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPage(value)}
                    className={cn(
                      "size-9 cursor-pointer rounded-xl text-sm font-semibold transition-colors",
                      value === currentPage ? "bg-brand text-ink shadow-glow" : "bg-surface text-ink-soft hover:bg-cream",
                    )}
                  >
                    {value}
                  </button>
                ))}
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                Sau <ChevronRight />
              </Button>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      <StudentFormModal
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        student={editing}
      />
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(fieldBase, "h-10 w-auto min-w-36 cursor-pointer appearance-none pr-9 text-sm font-medium")}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function StudentFormModal({
  open,
  onOpenChange,
  student,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: StaffStudent | null
}) {
  const [values, setValues] = useState<FormValues>(() =>
    student
      ? {
          fullName: student.fullName,
          studentCode: student.studentCode,
          birthDate: toDateKey(new Date(student.birthDate.split("/").reverse().join("/"))),
          gender: student.gender,
          phone: student.phone,
          email: student.email,
          address: student.address,
          identityNo: student.identityNo,
          classId: student.classId,
          staffId: student.staffId,
          level: student.level,
          status: student.status,
          guardianName: student.guardian.fullName,
          guardianRelation: student.guardian.relation,
          guardianPhone: student.guardian.phone,
          note: "",
        }
      : EMPTY_FORM,
  )
  const [errors, setErrors] = useState<FormErrors>({})

  const update = (key: keyof FormValues) => (value: string) => {
    setValues((prev) => ({ ...prev, [key]: value as never }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const invalid = (key: keyof FormValues) => ({
    "aria-invalid": Boolean(errors[key]) || undefined,
    "aria-describedby": errors[key] ? `sv-${key}-error` : undefined,
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      toast.error("Vui lòng kiểm tra lại thông tin", { description: "Một số trường chưa hợp lệ." })
      return
    }
    onOpenChange(false)
    toast.success(student ? "Đã cập nhật hồ sơ!" : "Đã thêm học viên mới!", {
      description: `${values.fullName} · ${classNameOf(values.classId)} · Hạn xử lý hồ sơ: Hành chính.`,
    })
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={student ? "Cập nhật hồ sơ học viên" : "Thêm học viên mới"}
      description="Thông tin bắt buộc dùng để lập hồ sơ, tính học phí và liên hệ phụ huynh."
      icon={student ? <Pencil className="size-6" /> : <UserPlus className="size-6" />}
      className="sm:max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy bỏ</Button>
          <Button type="submit" form="student-form">{student ? "Lưu thay đổi" : "Tạo hồ sơ"}</Button>
        </>
      }
    >
      <form id="student-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="sv-fullName" label="Họ và tên học viên" required error={errors.fullName}>
            <Input id="sv-fullName" value={values.fullName} onChange={(e) => update("fullName")(e.target.value)} placeholder="Nguyễn Văn A" {...invalid("fullName")} />
          </FormField>
          <FormField id="sv-studentCode" label="Mã học viên" required error={errors.studentCode}>
            <Input id="sv-studentCode" value={values.studentCode} onChange={(e) => update("studentCode")(e.target.value)} placeholder="HV2026-0001" {...invalid("studentCode")} />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField id="sv-birthDate" label="Ngày sinh" required error={errors.birthDate}>
            <Input id="sv-birthDate" type="date" value={values.birthDate} onChange={(e) => update("birthDate")(e.target.value)} {...invalid("birthDate")} />
          </FormField>
          <FormField id="sv-gender" label="Giới tính">
            <select id="sv-gender" value={values.gender} onChange={(e) => update("gender")(e.target.value)} className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}>
              <option value="Nữ">Nữ</option>
              <option value="Nam">Nam</option>
            </select>
          </FormField>
          <FormField id="sv-identityNo" label="Số CCCD">
            <Input id="sv-identityNo" value={values.identityNo} onChange={(e) => update("identityNo")(e.target.value)} placeholder="079xxxxxxxx" />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="sv-phone" label="SĐT học viên" required error={errors.phone}>
            <Input id="sv-phone" type="tel" value={values.phone} onChange={(e) => update("phone")(e.target.value)} placeholder="0909 123 456" {...invalid("phone")} />
          </FormField>
          <FormField id="sv-email" label="Email" error={errors.email}>
            <Input id="sv-email" type="email" value={values.email} onChange={(e) => update("email")(e.target.value)} placeholder="email@vidu.com" {...invalid("email")} />
          </FormField>
        </div>

        <FormField id="sv-address" label="Địa chỉ" required error={errors.address}>
          <Input id="sv-address" value={values.address} onChange={(e) => update("address")(e.target.value)} placeholder="Số nhà, đường, quận, TP.HCM" {...invalid("address")} />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField id="sv-classId" label="Lớp đang học" required>
            <select
              id="sv-classId"
              value={values.classId}
              onChange={(e) => {
                const next = e.target.value
                setValues((prev) => ({ ...prev, classId: next, level: CENTER_CLASSES.find((c) => c.id === next)?.level.split(" · ")[0] ?? prev.level }))
              }}
              className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}
            >
              {CENTER_CLASSES.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name} ({cls.studentCount}/{cls.maxStudents})</option>
              ))}
            </select>
          </FormField>
          <FormField id="sv-staffId" label="Nhân viên phụ trách" required>
            <select id="sv-staffId" value={values.staffId} onChange={(e) => update("staffId")(e.target.value)} className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}>
              {STAFF_TEAM.map((member) => (
                <option key={member.id} value={member.id}>{member.fullName}</option>
              ))}
            </select>
          </FormField>
          <FormField id="sv-status" label="Trạng thái" required>
            <select id="sv-status" value={values.status} onChange={(e) => update("status")(e.target.value)} className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}>
              {(Object.keys(STUDENT_STATUS_META) as StudentStatus[]).map((key) => (
                <option key={key} value={key}>{STUDENT_STATUS_META[key].label}</option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="rounded-2xl bg-surface p-4">
          <p className="mb-3 text-sm font-semibold text-ink">Người bảo hộ</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="sv-guardianName" label="Họ tên phụ huynh" required error={errors.guardianName}>
              <Input id="sv-guardianName" value={values.guardianName} onChange={(e) => update("guardianName")(e.target.value)} placeholder="Nguyễn Thị Hồng" {...invalid("guardianName")} />
            </FormField>
            <FormField id="sv-guardianRelation" label="Quan hệ">
              <select id="sv-guardianRelation" value={values.guardianRelation} onChange={(e) => update("guardianRelation")(e.target.value)} className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}>
                {["Mẹ", "Bố", "Ông", "Bà", "Người bảo hộ khác"].map((relation) => (
                  <option key={relation} value={relation}>{relation}</option>
                ))}
              </select>
            </FormField>
            <FormField id="sv-guardianPhone" label="SĐT liên hệ" required error={errors.guardianPhone}>
              <Input id="sv-guardianPhone" type="tel" value={values.guardianPhone} onChange={(e) => update("guardianPhone")(e.target.value)} placeholder="0909 123 456" {...invalid("guardianPhone")} />
            </FormField>
          </div>
        </div>

        <FormField id="sv-note" label="Ghi chú chăm sóc" error={errors.note} hint={<span className="text-xs text-ink-soft">{values.note.length}/500</span>}>
          <Textarea id="sv-note" value={values.note} onChange={(e) => update("note")(e.target.value)} placeholder="Tình trạng hồ sơ, yêu cầu riêng của phụ huynh..." {...invalid("note")} />
        </FormField>

        {student && (
          <p className="flex items-center gap-2 rounded-xl bg-cream p-3 text-xs leading-relaxed text-ink-soft">
            <ArrowUpDown className="size-4 shrink-0" />
            Học phí hiện tại: đã đóng {formatVnd(student.tuition.paid)} / {formatVnd(student.tuition.total)} ({tuitionProgress(student)}%), hạn {formatDate(student.tuition.dueDate)}.
          </p>
        )}
      </form>
    </Modal>
  )
}