import { useState, type FormEvent } from "react"
import {
  BadgeCheck,
  Cake,
  CheckCircle2,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Send,
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
import { fieldBase, Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { useAuth } from "@/lib/auth/auth-context"
import { ENROLLMENT, GUARDIAN, STUDENT_PROFILE } from "@/data/student"

type FormValues = { name: string; phone: string; email: string; content: string }
type FormErrors = Partial<Record<keyof FormValues, string>>

const EMPTY: FormValues = { name: "", phone: "", email: "", content: "" }
const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(v: FormValues): FormErrors {
  const errors: FormErrors = {}
  if (v.name.trim().length < 2) errors.name = "Vui lòng nhập họ tên (ít nhất 2 ký tự)."
  if (!v.phone.trim()) errors.phone = "Vui lòng nhập số điện thoại."
  else if (!PHONE_RE.test(v.phone.replace(/[\s.-]/g, ""))) errors.phone = "Số điện thoại không hợp lệ (VD: 0909 123 456)."
  if (!v.email.trim()) errors.email = "Vui lòng nhập email."
  else if (!EMAIL_RE.test(v.email.trim())) errors.email = "Email không hợp lệ."
  if (v.content.trim().length < 10) errors.content = "Vui lòng mô tả rõ thông tin cần thay đổi (ít nhất 10 ký tự)."
  if (v.content.length > 500) errors.content = "Lời nhắn tối đa 500 ký tự."
  return errors
}

export function StudentProfilePage() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<FormValues>(EMPTY)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const update = (key: keyof FormValues) => (value: string) => {
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
    await new Promise((r) => setTimeout(r, 900))
    setSubmitting(false)
    setOpen(false)
    toast.success("Đã gửi yêu cầu chỉnh sửa!", {
      description: "Phòng Hành chính sẽ liên hệ với bạn trong vòng 24 giờ làm việc.",
    })
    setValues(EMPTY)
  }

  const invalid = (key: keyof FormValues) => ({
    "aria-invalid": Boolean(errors[key]) || undefined,
    "aria-describedby": errors[key] ? `${key}-error` : undefined,
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`Mã học viên: ${STUDENT_PROFILE.studentId}`}
        title="Thông tin cá nhân"
        description="Thông tin hồ sơ học viên và người bảo hộ. Liên hệ phòng Hành chính nếu cần cập nhật."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Pencil /> Gửi yêu cầu chỉnh sửa
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
                src={STUDENT_PROFILE.avatar}
                alt={STUDENT_PROFILE.fullName}
                className="size-28 rounded-full ring-4 ring-white"
              />
              <h2 className="mt-3 font-heading text-xl font-extrabold text-ink">{STUDENT_PROFILE.fullName}</h2>
              <p className="mt-0.5 text-sm text-ink-soft">{user?.email ?? STUDENT_PROFILE.email}</p>
              <Badge variant="success" className="mt-3">
                <BadgeCheck className="size-3.5" /> {STUDENT_PROFILE.status}
              </Badge>
              <dl className="mt-5 grid w-full gap-3 text-left">
                <InfoRow icon={Users} label="Lớp học" value={ENROLLMENT.className} />
                <InfoRow icon={BadgeCheck} label="Trình độ" value={STUDENT_PROFILE.level} />
                <InfoRow icon={UserRound} label="Giáo viên" value={ENROLLMENT.teacher} />
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
                    { icon: UserRound, label: "Họ và tên", value: STUDENT_PROFILE.fullName },
                    { icon: IdCard, label: "Mã học viên", value: STUDENT_PROFILE.studentId },
                    { icon: Cake, label: "Ngày sinh", value: STUDENT_PROFILE.birthDate },
                    { icon: Users, label: "Giới tính", value: STUDENT_PROFILE.gender },
                    { icon: IdCard, label: "Số CCCD/CMND", value: STUDENT_PROFILE.identityNo },
                    { icon: UserRound, label: "Nghề nghiệp", value: STUDENT_PROFILE.occupation },
                    { icon: Mail, label: "Email", value: STUDENT_PROFILE.email },
                    { icon: Phone, label: "Số điện thoại", value: STUDENT_PROFILE.phone },
                    { icon: MapPin, label: "Địa chỉ", value: STUDENT_PROFILE.address, wide: true },
                    { icon: BadgeCheck, label: "Ngày nhập học", value: STUDENT_PROFILE.startDate },
                    { icon: Users, label: "Người bảo hộ", value: `${GUARDIAN.fullName} (${GUARDIAN.relation})`, wide: true },
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
                <InfoGrid
                  items={[
                    { icon: UserRound, label: "Họ và tên", value: GUARDIAN.fullName },
                    { icon: Users, label: "Quan hệ", value: GUARDIAN.relation },
                    { icon: Phone, label: "Số điện thoại", value: GUARDIAN.phone },
                    { icon: Mail, label: "Email", value: GUARDIAN.email },
                    { icon: UserRound, label: "Nghề nghiệp", value: GUARDIAN.occupation },
                    { icon: MapPin, label: "Địa chỉ", value: GUARDIAN.address, wide: true },
                  ]}
                />
                <p className="mt-4 flex items-start gap-2 rounded-xl bg-cream p-3.5 text-xs leading-relaxed text-ink-soft">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  Thông tin trên đã được xác thực khi ghi danh. Mọi thay đổi cần được phòng Hành chính phê duyệt để đảm bảo
                  tính xác thực.
                </p>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Gửi yêu cầu chỉnh sửa hồ sơ"
        description="Điền thông tin cần thay đổi, phòng Hành chính sẽ kiểm tra và phản hồi trong 24 giờ làm việc."
        icon={<Send className="size-6" />}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Hủy bỏ
            </Button>
            <Button onClick={onSubmit} disabled={submitting}>
              {submitting ? <><Loader2 className="animate-spin" /> Đang gửi...</> : "Gửi yêu cầu"}
            </Button>
          </>
        }
      >
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <FormField id="req-name" label="Họ và tên" required error={errors.name}>
            <Input id="req-name" value={values.name} onChange={(e) => update("name")(e.target.value)} placeholder="Nguyễn Văn A" {...invalid("name")} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="req-phone" label="Số điện thoại" required error={errors.phone}>
              <Input id="req-phone" type="tel" value={values.phone} onChange={(e) => update("phone")(e.target.value)} placeholder="0909 123 456" {...invalid("phone")} />
            </FormField>
            <FormField id="req-email" label="Email" required error={errors.email}>
              <Input id="req-email" type="email" value={values.email} onChange={(e) => update("email")(e.target.value)} placeholder="email@vidu.com" {...invalid("email")} />
            </FormField>
          </div>
          <FormField
            id="req-content"
            label="Nội dung cần thay đổi"
            required
            error={errors.content}
            hint={<span className="text-xs text-ink-soft">{values.content.length}/500</span>}
          >
            <Textarea
              id="req-content"
              className={cn(fieldBase)}
              value={values.content}
              onChange={(e) => update("content")(e.target.value)}
              placeholder="Ví dụ: Đổi số điện thoại từ 0909 sang 0912..."
              {...invalid("content")}
            />
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