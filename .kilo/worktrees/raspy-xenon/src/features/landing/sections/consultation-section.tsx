import { useState, type FormEvent } from "react"
import { CheckCircle2, ChevronDown, Gift, Headphones, Loader2, Send } from "lucide-react"
import { cn } from "cn"
import { Reveal } from "@/components/motion/reveal"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { fieldBase, Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { COURSES } from "@/data/landing"

type FormValues = { name: string; phone: string; email: string; course: string; message: string }
type FormErrors = Partial<Record<keyof FormValues, string>>

const EMPTY: FormValues = { name: "", phone: "", email: "", course: "", message: "" }
const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(v: FormValues): FormErrors {
  const errors: FormErrors = {}
  if (v.name.trim().length < 2) errors.name = "Vui lòng nhập họ tên (ít nhất 2 ký tự)."
  if (!v.phone.trim()) errors.phone = "Vui lòng nhập số điện thoại."
  else if (!PHONE_RE.test(v.phone.replace(/[\s.-]/g, ""))) errors.phone = "Số điện thoại không hợp lệ (VD: 0909 123 456)."
  if (v.email.trim() && !EMAIL_RE.test(v.email.trim())) errors.email = "Email không hợp lệ."
  if (!v.course) errors.course = "Vui lòng chọn khóa học quan tâm."
  if (v.message.length > 500) errors.message = "Lời nhắn tối đa 500 ký tự."
  return errors
}

const PERKS = [
  { icon: Gift, text: "Học thử miễn phí 1 buổi" },
  { icon: CheckCircle2, text: "Kiểm tra trình độ đầu vào miễn phí" },
  { icon: Headphones, text: "Tư vấn viên gọi lại trong 24 giờ" },
]

export function ConsultationSection() {
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
    toast.success("Đăng ký tư vấn thành công!", {
      description: `Cảm ơn ${values.name.trim()}, tư vấn viên sẽ liên hệ với bạn trong 24 giờ tới.`,
    })
    setValues(EMPTY)
  }

  const invalid = (key: keyof FormValues) => ({
    "aria-invalid": Boolean(errors[key]) || undefined,
    "aria-describedby": errors[key] ? `${key}-error` : undefined,
  })

  return (
    <section id="dang-ky" className="section relative overflow-hidden bg-brand">
      <div className="pointer-events-none absolute -top-20 -left-20 size-72 rounded-full bg-white/30 blur-2xl" aria-hidden="true" />
      <div className="pointer-events-none absolute right-10 bottom-10 size-40 rounded-full border-[16px] border-white/25" aria-hidden="true" />
      <div className="container-page relative grid items-center gap-12 lg:grid-cols-2">
        <Reveal className="flex flex-col gap-6">
          <span className="w-fit rounded-full bg-ink px-4 py-1.5 text-xs font-bold tracking-wider text-brand uppercase">Đăng ký tư vấn</span>
          <h2 className="text-3xl leading-tight font-extrabold sm:text-4xl lg:text-5xl">Bắt đầu hành trình chinh phục ngoại ngữ ngay hôm nay</h2>
          <p className="text-lg text-ink/80">Để lại thông tin, chúng tôi sẽ tư vấn lộ trình phù hợp nhất cho bạn hoặc con em bạn.</p>
          <ul className="flex flex-col gap-3">
            {PERKS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 font-semibold text-ink">
                <span className="flex size-9 items-center justify-center rounded-full bg-white/60"><Icon className="size-4.5" /></span>
                {text}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal direction="left" delay={0.1}>
          <form onSubmit={onSubmit} noValidate className="grid gap-5 rounded-3xl bg-white p-6 shadow-lift sm:grid-cols-2 sm:p-8">
            <FormField id="name" label="Họ và tên" required error={errors.name} className="sm:col-span-2">
              <Input id="name" placeholder="Nguyễn Văn A" autoComplete="name" value={values.name} onChange={(e) => update("name")(e.target.value)} {...invalid("name")} />
            </FormField>
            <FormField id="phone" label="Số điện thoại" required error={errors.phone}>
              <Input id="phone" type="tel" inputMode="tel" placeholder="0909 123 456" autoComplete="tel" value={values.phone} onChange={(e) => update("phone")(e.target.value)} {...invalid("phone")} />
            </FormField>
            <FormField id="email" label="Email" error={errors.email}>
              <Input id="email" type="email" placeholder="email@vidu.com" autoComplete="email" value={values.email} onChange={(e) => update("email")(e.target.value)} {...invalid("email")} />
            </FormField>
            <FormField id="course" label="Khóa học quan tâm" required error={errors.course} className="sm:col-span-2">
              <div className="relative">
                <select
                  id="course"
                  value={values.course}
                  onChange={(e) => update("course")(e.target.value)}
                  className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10", !values.course && "text-slate-400")}
                  {...invalid("course")}
                >
                  <option value="" disabled>-- Chọn khóa học --</option>
                  {COURSES.map((c) => <option key={c.id} value={c.id} className="text-ink">{c.name} ({c.level})</option>)}
                  <option value="chua-ro" className="text-ink">Chưa rõ – cần tư vấn thêm</option>
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-ink-soft" />
              </div>
            </FormField>
            <FormField id="message" label="Lời nhắn" error={errors.message} className="sm:col-span-2" hint={<span className="text-xs text-ink-soft">{values.message.length}/500</span>}>
              <Textarea id="message" placeholder="Ví dụ: Con tôi 8 tuổi, muốn học vào cuối tuần..." value={values.message} onChange={(e) => update("message")(e.target.value)} {...invalid("message")} />
            </FormField>
            <Button type="submit" size="lg" block disabled={submitting} className="sm:col-span-2">
              {submitting ? <><Loader2 className="size-5 animate-spin" /> Đang gửi...</> : <><Send className="size-5" /> Gửi đăng ký</>}
            </Button>
            <p className="text-center text-xs text-ink-soft sm:col-span-2">Thông tin của bạn được bảo mật tuyệt đối.</p>
          </form>
        </Reveal>
      </div>
    </section>
  )
}
