import { useState, type FormEvent } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  BadgeCheck,
  Cake,
  CheckCircle2,
  Clock,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react"
import { cn } from "cn"
import { SmartImage } from "@/components/common/smart-image"
import { PageHeader } from "@/components/layout/page-header"
import { Reveal } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { toast } from "@/components/ui/toast"
import { meApi, type ChangeRequest } from "@/api/me"
import { studentsApi } from "@/api/students"
import { errorMessage } from "@/lib/api-error"

const GENDER_LABEL: Record<string, string> = { MALE: "Nam", FEMALE: "Nữ", OTHER: "Khác" }
const STATUS_LABEL: Record<string, string> = {
  STUDYING: "Đang học",
  FROZEN: "Tạm dừng",
  DROPPED: "Đã bỏ học",
  GRADUATED: "Đã tốt nghiệp",
}
const REQUEST_STATUS: Record<string, { label: string; badge: "warning" | "success" | "danger" }> = {
  PENDING: { label: "Chờ duyệt", badge: "warning" },
  APPROVED: { label: "Đã duyệt", badge: "success" },
  REJECTED: { label: "Từ chối", badge: "danger" },
}

const FIELD_LABEL: Record<string, string> = {
  fullName: "Họ và tên",
  birthDate: "Ngày sinh",
  identityNo: "Số CCCD/CMND",
  phone: "Số điện thoại",
  email: "Email",
  address: "Địa chỉ",
  occupation: "Nghề nghiệp",
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("vi-VN")
}

export function StudentProfilePage() {
  const queryClient = useQueryClient()
  const profileQuery = useQuery({ queryKey: ["me", "profile"], queryFn: meApi.profile })
  const profile = profileQuery.data
  const student = profile?.student ?? null
  const studentId = student?.id ?? null

  // Lớp đang học (học viên chỉ đọc được hồ sơ của chính mình).
  const detailQuery = useQuery({
    queryKey: ["students", studentId],
    queryFn: () => studentsApi.get(studentId!),
    enabled: studentId !== null,
  })
  const enrollment = detailQuery.data?.enrollments?.[0] ?? null

  // Người bảo hộ.
  const guardiansQuery = useQuery({
    queryKey: ["students", studentId, "guardians"],
    queryFn: () => studentsApi.guardians(studentId!),
    enabled: studentId !== null,
  })
  const guardians = guardiansQuery.data ?? []
  const primaryGuardian = guardians.find((g) => g.isPrimary) ?? guardians[0] ?? null

  // Yêu cầu chỉnh sửa gần đây.
  const requestsQuery = useQuery({
    queryKey: ["me", "change-requests"],
    queryFn: () => meApi.myChangeRequests({ pageSize: 5 }),
  })
  const requests = requestsQuery.data?.items ?? []

  const [open, setOpen] = useState(false)
  const [values, setValues] = useState({ fullName: "", birthDate: "", identityNo: "", phone: "", email: "", address: "", occupation: "" })
  const [errors, setErrors] = useState<Partial<Record<keyof typeof values, string>>>({})
  const [submitting, setSubmitting] = useState(false)

  const openEdit = () => {
    if (!student) return
    setValues({
      fullName: student.fullName ?? "",
      birthDate: student.birthDate ? student.birthDate.slice(0, 10) : "",
      identityNo: student.identityNo ?? "",
      phone: student.phone ?? "",
      email: student.email ?? "",
      address: student.address ?? "",
      occupation: student.occupation ?? "",
    })
    setErrors({})
    setOpen(true)
  }

  const update = (key: keyof typeof values) => (value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const invalid = (key: keyof typeof values) => ({
    "aria-invalid": Boolean(errors[key]) || undefined,
    "aria-describedby": errors[key] ? `sp-${key}-error` : undefined,
  })

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const found: Partial<Record<keyof typeof values, string>> = {}
    if (values.fullName.trim().length < 2) found.fullName = "Vui lòng nhập họ tên (ít nhất 2 ký tự)."
    if (!values.phone.trim()) found.phone = "Vui lòng nhập số điện thoại."
    else if (!/^(0|\+84)(3|5|7|8|9)\d{8}$/.test(values.phone.replace(/[\s.-]/g, "")))
      found.phone = "Số điện thoại không hợp lệ (VD: 0909 123 456)."
    if (!values.email.trim()) found.email = "Vui lòng nhập email."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) found.email = "Email không hợp lệ."
    setErrors(found)
    if (Object.keys(found).length > 0) {
      toast.error("Vui lòng kiểm tra lại thông tin", { description: "Một số trường chưa hợp lệ." })
      return
    }
    setSubmitting(true)
    try {
      await meApi.updateProfile({
        fullName: values.fullName.trim(),
        birthDate: values.birthDate ? new Date(`${values.birthDate}T00:00:00Z`).toISOString() : null,
        identityNo: values.identityNo.trim() || null,
        phone: values.phone.trim(),
        email: values.email.trim(),
        address: values.address.trim() || null,
        occupation: values.occupation.trim() || null,
      })
      setOpen(false)
      void queryClient.invalidateQueries({ queryKey: ["me"] })
      toast.success("Đã cập nhật hồ sơ", {
        description: "SĐT, email, địa chỉ, nghề nghiệp được cập nhật ngay. Họ tên, ngày sinh, CCCD chờ phòng Hành chính duyệt.",
      })
    } catch (err) {
      toast.error(errorMessage(err, "Không cập nhật được hồ sơ"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={student ? `Mã học viên: ${student.studentCode}` : "Thông tin cá nhân"}
        title="Thông tin cá nhân"
        description="Thông tin hồ sơ học viên và người bảo hộ. Liên hệ phòng Hành chính nếu cần cập nhật."
        actions={
          <Button onClick={openEdit} disabled={!student}>
            <Pencil /> Chỉnh sửa hồ sơ
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Thẻ hồ sơ */}
        <Reveal>
          <Card className="h-full overflow-hidden">
            <div className="relative h-28 bg-brand">
              <div className="absolute -top-10 -right-8 size-40 rounded-full bg-white/25" aria-hidden="true" />
            </div>
            <CardContent className="-mt-14 flex flex-col items-center px-6 pb-6 text-center">
              <SmartImage
                src={student?.avatarUrl ?? student?.photoUrl ?? ""}
                alt={student?.fullName ?? "Ảnh đại diện"}
                className="size-28 rounded-full ring-4 ring-white"
              />
              <h2 className="mt-3 font-heading text-xl font-extrabold text-ink">{student?.fullName ?? "—"}</h2>
              <p className="mt-0.5 text-sm text-ink-soft">{student?.email ?? "—"}</p>
              <Badge variant="success" className="mt-3">
                <BadgeCheck className="size-3.5" /> {student ? STATUS_LABEL[student.status] ?? student.status : "—"}
              </Badge>
              <dl className="mt-5 grid w-full gap-3 text-left">
                <InfoRow icon={Users} label="Lớp học" value={enrollment ? enrollment.class.name : "—"} />
                <InfoRow icon={BadgeCheck} label="Trình độ" value={student?.level ?? "—"} />
              </dl>
            </CardContent>
          </Card>
        </Reveal>

        <div className="flex flex-col gap-6">
          {/* Hồ sơ học viên */}
          <Reveal delay={0.06}>
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>Hồ sơ học viên</CardTitle>
                  <CardDescription>Thông tin do trung tâm quản lý, hiển thị ở chế độ chỉ đọc</CardDescription>
                </div>
                <Badge variant="neutral">Chỉ đọc</Badge>
              </CardHeader>
              <CardContent>
                <InfoGrid
                  items={[
                    { icon: UserRound, label: "Họ và tên", value: student?.fullName ?? "—" },
                    { icon: IdCard, label: "Mã học viên", value: student?.studentCode ?? "—" },
                    { icon: Cake, label: "Ngày sinh", value: formatDate(student?.birthDate) },
                    { icon: Users, label: "Giới tính", value: student?.gender ? GENDER_LABEL[student.gender] ?? "—" : "—" },
                    { icon: IdCard, label: "Số CCCD/CMND", value: student?.identityNo ?? "—" },
                    { icon: UserRound, label: "Nghề nghiệp", value: student?.occupation ?? "—" },
                    { icon: Mail, label: "Email", value: student?.email ?? "—" },
                    { icon: Phone, label: "Số điện thoại", value: student?.phone ?? "—" },
                    { icon: MapPin, label: "Địa chỉ", value: student?.address ?? "—", wide: true },
                    { icon: BadgeCheck, label: "Ngày nhập học", value: formatDate(student?.createdAt) },
                  ]}
                />
              </CardContent>
            </Card>
          </Reveal>

          {/* Người bảo hộ */}
          <Reveal delay={0.12}>
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>Thông tin người bảo hộ</CardTitle>
                  <CardDescription>Người được liên hệ khi có việc gì cần xác nhận</CardDescription>
                </div>
                <Badge variant="neutral">Chỉ đọc</Badge>
              </CardHeader>
              <CardContent>
                {guardiansQuery.isLoading ? (
                  <p className="text-sm text-ink-soft">Đang tải thông tin người bảo hộ…</p>
                ) : primaryGuardian ? (
                  <InfoGrid
                    items={[
                      { icon: UserRound, label: "Họ và tên", value: primaryGuardian.fullName },
                      { icon: Users, label: "Quan hệ", value: primaryGuardian.relation },
                      { icon: Phone, label: "Số điện thoại", value: primaryGuardian.phone },
                      { icon: Mail, label: "Email", value: primaryGuardian.email ?? "—" },
                      { icon: UserRound, label: "Nghề nghiệp", value: primaryGuardian.occupation ?? "—" },
                      { icon: MapPin, label: "Địa chỉ", value: primaryGuardian.address ?? "—", wide: true },
                    ]}
                  />
                ) : (
                  <p className="text-sm text-ink-soft">Chưa có thông tin người bảo hộ.</p>
                )}
                <p className="mt-4 flex items-start gap-2 rounded-xl bg-cream p-3.5 text-xs leading-relaxed text-ink-soft">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  Thông tin trên đã được xác thực khi ghi danh. Mọi thay đổi cần được phòng Hành chính phê duyệt để đảm bảo
                  tính xác thực.
                </p>
              </CardContent>
            </Card>
          </Reveal>

          {/* Yêu cầu chỉnh sửa gần đây */}
          <Reveal delay={0.18}>
            <Card>
              <CardHeader>
                <CardTitle>Yêu cầu chỉnh sửa gần đây</CardTitle>
                <CardDescription>Trường nhạy cảm (họ tên, ngày sinh, CCCD) phải qua duyệt</CardDescription>
              </CardHeader>
              <CardContent>
                {requestsQuery.isLoading ? (
                  <p className="text-sm text-ink-soft">Đang tải…</p>
                ) : requests.length === 0 ? (
                  <p className="text-sm text-ink-soft">Chưa có yêu cầu chỉnh sửa nào.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {requests.map((request) => (
                      <RequestRow key={request.id} request={request} />
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Chỉnh sửa hồ sơ"
        description="SĐT, email, địa chỉ, nghề nghiệp cập nhật ngay. Họ tên, ngày sinh, CCCD gửi yêu cầu duyệt."
        icon={<Pencil className="size-6" />}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Hủy bỏ
            </Button>
            <Button onClick={onSubmit} disabled={submitting}>
              {submitting ? <><Loader2 className="animate-spin" /> Đang lưu...</> : <><Save /> Lưu thay đổi</>}
            </Button>
          </>
        }
      >
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <FormField id="sp-fullName" label="Họ và tên" required error={errors.fullName}
            hint={<span className="text-xs text-warning">Thay đổi cần phòng Hành chính duyệt</span>}>
            <Input id="sp-fullName" value={values.fullName} onChange={(e) => update("fullName")(e.target.value)} placeholder="Nguyễn Văn A" {...invalid("fullName")} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="sp-birthDate" label="Ngày sinh" error={errors.birthDate}
              hint={<span className="text-xs text-warning">Thay đổi cần duyệt</span>}>
              <Input id="sp-birthDate" type="date" value={values.birthDate} onChange={(e) => update("birthDate")(e.target.value)} {...invalid("birthDate")} />
            </FormField>
            <FormField id="sp-identityNo" label="Số CCCD/CMND" error={errors.identityNo}
              hint={<span className="text-xs text-warning">Thay đổi cần duyệt</span>}>
              <Input id="sp-identityNo" value={values.identityNo} onChange={(e) => update("identityNo")(e.target.value)} placeholder="0123456789" {...invalid("identityNo")} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="sp-phone" label="Số điện thoại" required error={errors.phone}>
              <Input id="sp-phone" type="tel" value={values.phone} onChange={(e) => update("phone")(e.target.value)} placeholder="0909 123 456" {...invalid("phone")} />
            </FormField>
            <FormField id="sp-email" label="Email" required error={errors.email}>
              <Input id="sp-email" type="email" value={values.email} onChange={(e) => update("email")(e.target.value)} placeholder="email@vidu.com" {...invalid("email")} />
            </FormField>
          </div>
          <FormField id="sp-address" label="Địa chỉ">
            <Input id="sp-address" value={values.address} onChange={(e) => update("address")(e.target.value)} placeholder="Địa chỉ hiện tại" {...invalid("address")} />
          </FormField>
          <FormField id="sp-occupation" label="Nghề nghiệp">
            <Input id="sp-occupation" value={values.occupation} onChange={(e) => update("occupation")(e.target.value)} placeholder="Nghề nghiệp" {...invalid("occupation")} />
          </FormField>
        </form>
      </Modal>
    </div>
  )
}

function RequestRow({ request }: { request: ChangeRequest }) {
  const status = REQUEST_STATUS[request.status] ?? REQUEST_STATUS.PENDING
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface px-3.5 py-2.5">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{FIELD_LABEL[request.fieldName] ?? request.fieldName}</span>
        <span className="block truncate text-xs text-ink-soft">
          {request.oldValue ?? "—"} → {request.newValue ?? "—"}
        </span>
      </span>
      <span className="flex items-center gap-2">
        <Clock className="size-3.5 text-ink-soft" />
        <span className="text-xs text-ink-soft">{formatDate(request.createdAt)}</span>
        <Badge variant={status.badge}>{status.label}</Badge>
      </span>
    </li>
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

type InfoItem = { icon: LucideIcon; label: string; value: string; wide?: boolean }

function InfoGrid({ items }: { items: InfoItem[] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className={cn(item.wide && "sm:col-span-2 lg:col-span-3")}>
          <InfoRow {...item} />
        </div>
      ))}
    </dl>
  )
}
