import { useMemo, useState } from "react"
import {
  Award,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  Clock,
  Mail,
  Pencil,
  Phone,
  Save,
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
import { formatVnd } from "@/lib/format"
import { CLASSES, PAYROLL, TEACHER_PROFILE, payrollTotals, weeklySchedule } from "@/data/teacher"

type Editable = { phone: string; email: string; specialty: string; bio: string }
type FormErrors = Partial<Record<keyof Editable, string>>

const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(v: Editable): FormErrors {
  const errors: FormErrors = {}
  if (!v.phone.trim()) errors.phone = "Vui lòng nhận số điện thoại."
  else if (!PHONE_RE.test(v.phone.replace(/[\s.-]/g, ""))) errors.phone = "Số điện thoại không hợp lệ (VD: 0909 123 456)."
  if (!v.email.trim()) errors.email = "Vui lòng nhận email."
  else if (!EMAIL_RE.test(v.email.trim())) errors.email = "Email không hợp lệ."
  if (v.specialty.trim().length < 3) errors.specialty = "Vui lòng nhập chuyên môn."
  if (v.bio.trim().length < 20) errors.bio = "Giới thiệu cần ít nhất 20 ký tự."
  if (v.bio.length > 600) errors.bio = "Giới thiệu tối đa 600 ký tự."
  return errors
}

export function TeacherProfilePage() {
  const [values, setValues] = useState<Editable>({
    phone: TEACHER_PROFILE.phone,
    email: TEACHER_PROFILE.email,
    specialty: TEACHER_PROFILE.specialty,
    bio: TEACHER_PROFILE.bio,
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [open, setOpen] = useState(false)
  const [dirty, setDirty] = useState(false)

  const stats = useMemo(() => {
    const lessons = weeklySchedule().length
    const approved = PAYROLL.filter((r) => r.status === "approved")
    const lastTotal = payrollTotals(approved[approved.length - 1] ?? PAYROLL[0]).total
    const y3 = CLASSES.find((c) => c.id === "Y3SAT")
    return { lessons, lastTotal, studentCount: CLASSES.reduce((s, c) => s + c.studentCount, 0), y3 }
  }, [])

  const update = (key: keyof Editable) => (value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const onSubmit = () => {
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      toast.error("Vui lòng kiểm tra lại thông tin", { description: "Một số trường chưa hợp lệ." })
      return
    }
    setOpen(false)
    setDirty(false)
    toast.success("Đã lưu thông tin cá nhân!", { description: "Thông tin liên hệ mới sẽ được dùng cho thông báo từ trung tâm." })
  }

  const invalid = (key: keyof Editable) => ({
    "aria-invalid": Boolean(errors[key]) || undefined,
    "aria-describedby": errors[key] ? `t-${key}-error` : undefined,
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`Mã giáo viên: ${TEACHER_PROFILE.id}`}
        title="Hồ sơ giáo viên"
        description="Thông tin cá nhân, chuyên môn và lịch dạy của bạn."
        actions={
          <Button onClick={() => setOpen(true)}>
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
              <SmartImage src={TEACHER_PROFILE.avatar} alt={TEACHER_PROFILE.fullName} className="size-28 rounded-full ring-4 ring-white" />
              <h2 className="mt-3 font-heading text-xl font-extrabold text-ink">{TEACHER_PROFILE.fullName}</h2>
              <p className="mt-0.5 text-sm text-ink-soft">{TEACHER_PROFILE.specialty}</p>
              <Badge variant="success" className="mt-3">
                <BadgeCheck className="size-3.5" /> Đang giảng dạy
              </Badge>
              <dl className="mt-5 grid w-full gap-3 text-left">
                <MiniRow icon={Users} label="Lớp phụ trách" value={`${CLASSES.length} lớp · ${stats.studentCount} học viên`} />
                <MiniRow icon={Clock} label="Buổi dạy / tuần" value={`${stats.lessons} buổi`} />
                <MiniRow icon={CalendarDays} label="Ngày bắt đầu" value={TEACHER_PROFILE.startDate} />
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
                {dirty ? <Badge variant="warning">Chưa lưu</Badge> : <Badge variant="success">Đã đồng bộ</Badge>}
              </CardHeader>
              <CardContent>
                <InfoGrid
                  items={[
                    { icon: UserRound, label: "Họ và tên", value: TEACHER_PROFILE.fullName },
                    { icon: UserRound, label: "Mã giáo viên", value: TEACHER_PROFILE.id },
                    { icon: Phone, label: "Số điện thoại", value: values.phone },
                    { icon: Mail, label: "Email", value: values.email },
                    { icon: BookOpen, label: "Chuyên môn", value: values.specialty },
                    { icon: Award, label: "Chứng chỉ", value: TEACHER_PROFILE.certificate },
                  ]}
                />
                <div className="mt-3">
                  <p className="rounded-xl bg-surface p-3.5 text-sm leading-relaxed text-ink-soft">{values.bio}</p>
                </div>
                <div className="mt-4">
                  <InfoRow icon={BookOpen} label="Học vấn" value={TEACHER_PROFILE.education} />
                </div>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.12}>
            <Card>
              <CardHeader>
                <CardTitle>Lịch dạy trong tuần</CardTitle>
                <CardDescription>{stats.lessons} buổi · {CLASSES.length} lớp</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {weeklySchedule().map((item) => (
                    <li key={`${item.classId}-${item.weekday}`} className="rounded-xl border border-slate-100 p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-ink">{item.className}</p>
                        <Badge variant="brand">{weekdayShort(item.weekday)}</Badge>
                      </div>
                      <p className="mt-1.5 text-xs text-ink-soft">
                        {item.time} · {item.room} · {item.course}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.18}>
            <Card>
              <CardHeader>
                <CardTitle>Tóm tắt thu nhập</CardTitle>
                <CardDescription>Tháng gần nhất đã được phòng Kế toán duyệt</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-surface p-4">
                    <p className="text-xs text-ink-soft">Thực nhận gần nhất</p>
                    <p className="font-heading mt-1 text-xl font-extrabold text-ink tabular-nums">{formatVnd(stats.lastTotal)}</p>
                  </div>
                  <div className="rounded-xl bg-surface p-4">
                    <p className="text-xs text-ink-soft">Kỳ lương đang chờ duyệt</p>
                    <p className="font-heading mt-1 text-xl font-extrabold text-ink tabular-nums">
                      {PAYROLL.filter((r) => r.status !== "approved").length}
                    </p>
                  </div>
                  <div className="rounded-xl bg-surface p-4">
                    <p className="text-xs text-ink-soft">Kinh nghiệm</p>
                    <p className="font-heading mt-1 text-xl font-extrabold text-ink">{TEACHER_PROFILE.experience}</p>
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
        description="Các thay đổi về họ tên, chứng chỉ hoặc học vấn cần gửi yêu cầu riêng tới phòng Hành chính."
        icon={<Pencil className="size-6" />}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Hủy bỏ</Button>
            <Button onClick={onSubmit}>
              <Save /> Lưu thay đổi
            </Button>
          </>
        }
      >
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); onSubmit() }} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="t-phone" label="Số điện thoại" required error={errors.phone}>
              <Input id="t-phone" type="tel" value={values.phone} onChange={(e) => update("phone")(e.target.value)} placeholder="0909 123 456" {...invalid("phone")} />
            </FormField>
            <FormField id="t-email" label="Email" required error={errors.email}>
              <Input id="t-email" type="email" value={values.email} onChange={(e) => update("email")(e.target.value)} placeholder="email@vidu.com" {...invalid("email")} />
            </FormField>
          </div>
          <FormField id="t-specialty" label="Chuyên môn" required error={errors.specialty}>
            <Input id="t-specialty" value={values.specialty} onChange={(e) => update("specialty")(e.target.value)} placeholder="Tiếng Anh thiếu nhi & A2" {...invalid("specialty")} />
          </FormField>
          <FormField
            id="t-bio"
            label="Giới thiệu bản thân"
            required
            error={errors.bio}
            hint={<span className="text-xs text-ink-soft">{values.bio.length}/600</span>}
          >
            <Textarea id="t-bio" value={values.bio} onChange={(e) => update("bio")(e.target.value)} placeholder="Kinh nghiệm, phương pháp giảng dạy..." {...invalid("bio")} />
          </FormField>
          <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
        </form>
      </Modal>
    </div>
  )
}

function weekdayShort(weekday: number) {
  return ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][weekday % 7]
}

function MiniRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
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