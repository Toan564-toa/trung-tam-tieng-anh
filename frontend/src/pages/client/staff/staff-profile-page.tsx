import { useState, type FormEvent } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  BadgeCheck,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  CircleCheckBig,
  IdCard,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Save,
  School,
  TrendingUp,
  UserPlus,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react"
import { SmartImage } from "@/components/common/smart-image"
import { PageHeader } from "@/components/layout/page-header"
import { Reveal } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { meApi } from "@/api/me"
import { errorMessage } from "@/lib/api-error"
import {
  CENTER_CLASSES,
  STAFF_PROFILE,
  leadConversionRate,
  leadsOfStaff,
  newLeads,
  studentsOfStaff,
} from "@/data/staff"

type Editable = { phone: string; email: string; bio: string; position: string; department: string }
type FormErrors = Partial<Record<keyof Editable, string>>

const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const REQUEST_STATUS: Record<string, { label: string; badge: "warning" | "success" | "danger" }> = {
  PENDING: { label: "Chờ duyệt", badge: "warning" },
  APPROVED: { label: "Đã duyệt", badge: "success" },
  REJECTED: { label: "Từ chối", badge: "danger" },
}

const FIELD_LABEL: Record<string, string> = {
  position: "Chức vụ",
  department: "Bộ phận",
  phone: "Số điện thoại",
  email: "Email",
  bio: "Giới thiệu",
}

function validate(v: Editable): FormErrors {
  const errors: FormErrors = {}
  if (!v.phone.trim()) errors.phone = "Vui lòng nhập số điện thoại."
  else if (!PHONE_RE.test(v.phone.replace(/[\s.-]/g, ""))) errors.phone = "Số điện thoại không hợp lệ (VD: 0909 123 456)."
  if (!v.email.trim()) errors.email = "Vui lòng nhập email."
  else if (!EMAIL_RE.test(v.email.trim())) errors.email = "Email không hợp lệ."
  if (v.bio.trim().length < 20) errors.bio = "Giới thiệu cần ít nhất 20 ký tự."
  if (v.bio.length > 600) errors.bio = "Giới thiệu tối đa 600 ký tự."
  return errors
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("vi-VN")
}

export function StaffProfilePage() {
  const queryClient = useQueryClient()
  const profileQuery = useQuery({ queryKey: ["me", "profile"], queryFn: meApi.profile })
  const staff = profileQuery.data?.staff ?? null

  // Thống kê lớp/khách hàng vẫn là dữ liệu mẫu (chưa có API tương ứng).
  const stats = (() => {
    const classes = CENTER_CLASSES.filter((cls) => cls.staffId === STAFF_PROFILE.id)
    const myLeads = leadsOfStaff(STAFF_PROFILE.id)
    return {
      classes,
      classCount: classes.length,
      studentCount: studentsOfStaff(STAFF_PROFILE.id).length,
      newLeads: newLeads().length,
      wonLeads: myLeads.filter((lead) => lead.stage === "won").length,
      conversion: leadConversionRate(),
    }
  })()

  // Yêu cầu chỉnh sửa gần đây.
  const requestsQuery = useQuery({
    queryKey: ["me", "change-requests"],
    queryFn: () => meApi.myChangeRequests({ pageSize: 5 }),
  })
  const requests = requestsQuery.data?.items ?? []

  const [values, setValues] = useState<Editable>({ phone: "", email: "", bio: "", position: "", department: "" })
  const [errors, setErrors] = useState<FormErrors>({})
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const synced = staff
    ? {
        phone: staff.phone ?? "",
        email: staff.email ?? "",
        bio: staff.bio ?? "",
        position: staff.position ?? "",
        department: staff.department ?? "",
      }
    : values

  const openEdit = () => {
    if (!staff) return
    setValues({
      phone: staff.phone ?? "",
      email: staff.email ?? "",
      bio: staff.bio ?? "",
      position: staff.position ?? "",
      department: staff.department ?? "",
    })
    setErrors({})
    setOpen(true)
  }

  const update = (key: keyof Editable) => (value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      toast.error("Vui lòng kiểm tra lại thông tin", { description: "Một số trường chưa hợp lệ." })
      return
    }
    setSubmitting(true)
    try {
      await meApi.updateProfile({
        phone: values.phone.trim(),
        email: values.email.trim(),
        bio: values.bio.trim(),
        position: values.position.trim(),
        department: values.department.trim(),
      })
      setOpen(false)
      void queryClient.invalidateQueries({ queryKey: ["me"] })
      toast.success("Đã lưu thông tin cá nhân!", {
        description: "SĐT, email, giới thiệu cập nhật ngay. Chức vụ, bộ phận gửi yêu cầu duyệt cho phòng Hành chính.",
      })
    } catch (err) {
      toast.error(errorMessage(err, "Không lưu được thông tin"))
    } finally {
      setSubmitting(false)
    }
  }

  const invalid = (key: keyof Editable) => ({
    "aria-invalid": Boolean(errors[key]) || undefined,
    "aria-describedby": errors[key] ? `t-${key}-error` : undefined,
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={staff ? `Mã nhân viên: NV${String(staff.id).padStart(4, "0")}` : "Hồ sơ cá nhân"}
        title="Hồ sơ cá nhân"
        description="Thông tin cá nhân, bộ phận và các lớp học bạn đang phụ trách."
        actions={
          <Button onClick={openEdit} disabled={!staff}>
            <Pencil /> Cập nhật hồ sơ
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Reveal>
          <Card className="h-full overflow-hidden">
            <div className="relative h-28 bg-brand">
              <div className="absolute -top-10 -right-8 size-40 rounded-full bg-white/25" aria-hidden="true" />
            </div>
            <CardContent className="-mt-14 flex flex-col items-center px-6 pb-6 text-center">
              <SmartImage src={staff?.avatarUrl ?? staff?.photoUrl ?? ""} alt={staff?.fullName ?? "Ảnh đại diện"} className="size-28 rounded-full ring-4 ring-white" />
              <h2 className="mt-3 font-heading text-xl font-extrabold text-ink">{staff?.fullName ?? "—"}</h2>
              <p className="mt-0.5 text-sm text-ink-soft">{staff?.position ?? "—"}</p>
              <Badge variant="success" className="mt-3">
                <BadgeCheck className="size-3.5" /> Đang làm việc
              </Badge>
              <dl className="mt-5 grid w-full gap-3 text-left">
                <InfoRow icon={School} label="Số lớp phụ trách" value={`${stats.classCount} lớp`} />
                <InfoRow icon={Users} label="Số học viên phụ trách" value={`${stats.studentCount} học viên`} />
                <InfoRow icon={CalendarDays} label="Ngày bắt đầu" value={formatDate(staff?.startDate)} />
              </dl>
            </CardContent>
          </Card>
        </Reveal>

        <div className="flex flex-col gap-6">
          <Reveal delay={0.06}>
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>Thông tin liên hệ</CardTitle>
                  <CardDescription>Bạn có thể tự cập nhật các trường này</CardDescription>
                </div>
                <Badge variant="success">Đã đồng bộ</Badge>
              </CardHeader>
              <CardContent>
                <InfoGrid
                  items={[
                    { icon: UserRound, label: "Họ và tên", value: staff?.fullName ?? "—" },
                    { icon: IdCard, label: "Mã nhân viên", value: staff ? `NV${String(staff.id).padStart(4, "0")}` : "—" },
                    { icon: Phone, label: "Số điện thoại", value: synced.phone || "—" },
                    { icon: Mail, label: "Email", value: synced.email || "—" },
                    { icon: Building2, label: "Bộ phận", value: synced.department || "—" },
                    { icon: Briefcase, label: "Chức vụ", value: synced.position || "—" },
                  ]}
                />
                <div className="mt-3">
                  <p className="rounded-xl bg-surface p-3.5 text-sm leading-relaxed text-ink-soft">{synced.bio || "—"}</p>
                </div>
                <div className="mt-4">
                  <InfoRow icon={BookOpen} label="Học vấn" value={staff?.education ?? "—"} />
                </div>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.12}>
            <Card>
              <CardHeader>
                <CardTitle>Công việc đang phụ trách</CardTitle>
                <CardDescription>{stats.classCount} lớp · {stats.studentCount} học viên · dữ liệu mẫu</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.classes.length === 0 ? (
                  <p className="rounded-xl bg-surface p-4 text-sm text-ink-soft">Bạn chưa được phân công lớp nào.</p>
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {stats.classes.map((cls) => (
                      <li key={cls.id} className="rounded-xl border border-slate-100 p-3.5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-ink">{cls.name}</p>
                          <Badge variant={cls.tone}>{cls.code}</Badge>
                        </div>
                        <p className="mt-1.5 text-xs text-ink-soft">
                          {cls.course} · {cls.room} · {cls.studentCount}/{cls.maxStudents} học viên
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.18}>
            <Card>
              <CardHeader>
                <CardTitle>Yêu cầu chỉnh sửa gần đây</CardTitle>
                <CardDescription>Chức vụ, bộ phận thay đổi phải qua duyệt</CardDescription>
              </CardHeader>
              <CardContent>
                {requestsQuery.isLoading ? (
                  <p className="text-sm text-ink-soft">Đang tải…</p>
                ) : requests.length === 0 ? (
                  <p className="text-sm text-ink-soft">Chưa có yêu cầu chỉnh sửa nào.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {requests.map((request) => {
                      const status = REQUEST_STATUS[request.status] ?? REQUEST_STATUS.PENDING
                      return (
                        <li key={request.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface px-3.5 py-2.5">
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-ink">{FIELD_LABEL[request.fieldName] ?? request.fieldName}</span>
                            <span className="block truncate text-xs text-ink-soft">
                              {request.oldValue ?? "—"} → {request.newValue ?? "—"}
                            </span>
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="text-xs text-ink-soft">{formatDate(request.createdAt)}</span>
                            <Badge variant={status.badge}>{status.label}</Badge>
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.24}>
            <Card>
              <CardHeader>
                <CardTitle>Thống kê tư vấn</CardTitle>
                <CardDescription>Số liệu khách hàng mới và kết quả chốt gần đây · dữ liệu mẫu</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="bg-surface p-4">
                    <p className="flex items-center gap-1.5 text-xs text-ink-soft">
                      <UserPlus className="size-3.5" /> Khách mới
                    </p>
                    <p className="mt-1 font-heading text-xl font-extrabold text-ink tabular-nums">{stats.newLeads}</p>
                  </div>
                  <div className="bg-surface p-4">
                    <p className="flex items-center gap-1.5 text-xs text-ink-soft">
                      <CircleCheckBig className="size-3.5" /> Đã chốt
                    </p>
                    <p className="mt-1 font-heading text-xl font-extrabold text-ink tabular-nums">{stats.wonLeads}</p>
                  </div>
                  <div className="bg-surface p-4">
                    <p className="flex items-center gap-1.5 text-xs text-ink-soft">
                      <TrendingUp className="size-3.5" /> Tỷ lệ chuyển đổi
                    </p>
                    <p className="mt-1 font-heading text-xl font-extrabold text-ink tabular-nums">{stats.conversion}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Cập nhật hồ sơ"
        description="SĐT, email, giới thiệu lưu ngay. Chức vụ, bộ phận gửi yêu cầu duyệt cho phòng Hành chính."
        icon={<Pencil className="size-6" />}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Hủy bỏ</Button>
            <Button onClick={onSubmit} disabled={submitting}>
              {submitting ? <><Loader2 className="animate-spin" /> Đang lưu...</> : <><Save /> Lưu thay đổi</>}
            </Button>
          </>
        }
      >
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="t-phone" label="Số điện thoại" required error={errors.phone}>
              <Input id="t-phone" type="tel" value={values.phone} onChange={(e) => update("phone")(e.target.value)} placeholder="0909 123 456" {...invalid("phone")} />
            </FormField>
            <FormField id="t-email" label="Email" required error={errors.email}>
              <Input id="t-email" type="email" value={values.email} onChange={(e) => update("email")(e.target.value)} placeholder="email@vidu.com" {...invalid("email")} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="t-position" label="Chức vụ" error={errors.position}
              hint={<span className="text-xs text-warning">Thay đổi cần duyệt</span>}>
              <Input id="t-position" value={values.position} onChange={(e) => update("position")(e.target.value)} placeholder="Tư vấn" {...invalid("position")} />
            </FormField>
            <FormField id="t-department" label="Bộ phận" error={errors.department}
              hint={<span className="text-xs text-warning">Thay đổi cần duyệt</span>}>
              <Input id="t-department" value={values.department} onChange={(e) => update("department")(e.target.value)} placeholder="Tuyển sinh" {...invalid("department")} />
            </FormField>
          </div>
          <FormField
            id="t-bio"
            label="Giới thiệu bản thân"
            required
            error={errors.bio}
            hint={<span className="text-xs text-ink-soft">{values.bio.length}/600</span>}
          >
            <Textarea id="t-bio" value={values.bio} onChange={(e) => update("bio")(e.target.value)} placeholder="Kinh nghiệm tư vấn, chăm sóc học viên..." {...invalid("bio")} />
          </FormField>
        </form>
      </Modal>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-surface p-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-brand-hover" />
      <div className="min-w-0">
        <dt className="text-xs text-ink-soft">{label}</dt>
        <dd className="mt-0.5 text-sm font-semibold text-ink">{value}</dd>
      </div>
    </div>
  )
}

type InfoItem = { icon: LucideIcon; label: string; value: string }

function InfoGrid({ items }: { items: InfoItem[] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <InfoRow key={item.label} {...item} />
      ))}
    </dl>
  )
}
