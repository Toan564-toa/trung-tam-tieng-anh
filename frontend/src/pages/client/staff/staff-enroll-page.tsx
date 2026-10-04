import { useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Check,
  CheckCircle2,
  CreditCard,
  FileText,
  Percent,
  Receipt,
  RotateCcw,
  Search,
  Users,
} from "lucide-react"
import { cn } from "cn"
import { ReceiptView, type ReceiptData } from "@/features/staff/receipt-view"
import { PageHeader } from "@/components/layout/page-header"
import { Reveal } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { fieldBase, Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { toast } from "@/components/ui/toast"
import { formatDate } from "@/lib/date"
import { formatVnd } from "@/lib/format"
import {
  CENTER_CLASSES,
  CLASS_STATUS_META,
  PAYMENT_METHOD_META,
  STAFF_PROFILE,
  STAFF_TODAY,
  STUDENT_STATUS_META,
  classNameOf,
  filterStudents,
  nextReceiptNo,
  type PaymentMethod,
  type StaffStudent,
} from "@/data/staff"

const STEPS = [
  { value: 1, label: "Chọn học viên", icon: Users },
  { value: 2, label: "Chọn lớp", icon: FileText },
  { value: 3, label: "Học phí & giảm giá", icon: Percent },
  { value: 4, label: "Khoản phải thu", icon: Receipt },
  { value: 5, label: "Thu tiền", icon: Banknote },
] as const

const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type StudentForm = {
  fullName: string
  birthDate: string
  gender: string
  phone: string
  email: string
  address: string
  guardianName: string
  guardianRelation: string
  guardianPhone: string
}

const EMPTY_STUDENT: StudentForm = {
  fullName: "",
  birthDate: "",
  gender: "Nữ",
  phone: "",
  email: "",
  address: "",
  guardianName: "",
  guardianRelation: "Mẹ",
  guardianPhone: "",
}

export function StaffEnrollPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const leadId = searchParams.get("lead")

  const [step, setStep] = useState(1)
  const [existing, setExisting] = useState<StaffStudent | null>(null)
  const [query, setQuery] = useState("")
  const [form, setForm] = useState<StudentForm>(EMPTY_STUDENT)
  const [errors, setErrors] = useState<Partial<Record<keyof StudentForm, string>>>({})
  const [classId, setClassId] = useState(CENTER_CLASSES[0].id)
  const [discount, setDiscount] = useState(0)
  const [voucher, setVoucher] = useState("")
  const [method, setMethod] = useState<PaymentMethod>("Tiền mặt")
  const [amount, setAmount] = useState("")
  const [amountError, setAmountError] = useState<string | undefined>(undefined)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)

  const cls = CENTER_CLASSES.find((item) => item.id === classId) ?? CENTER_CLASSES[0]
  const tuitionTotal = tuitionOfLevel(cls.level)
  const payable = Math.max(0, tuitionTotal - discount)
  const firstInstallment = payable

  const openClasses = useMemo(
    () => CENTER_CLASSES.filter((item) => item.status !== "closed").sort((a, b) => a.studentCount / a.maxStudents - b.studentCount / b.maxStudents),
    [],
  )

  const searchResults = useMemo(() => {
    const needle = query.trim()
    if (!needle) return []
    return filterStudents({ query: needle }).slice(0, 6)
  }, [query])

  const update = (key: keyof StudentForm) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const invalid = (key: keyof StudentForm) => ({
    "aria-invalid": Boolean(errors[key]) || undefined,
    "aria-describedby": errors[key] ? `en-${key}-error` : undefined,
  })

  const validateStudent = () => {
    const found: Partial<Record<keyof StudentForm, string>> = {}
    if (form.fullName.trim().length < 2) found.fullName = "Vui lòng nhập họ tên học viên."
    if (!form.birthDate) found.birthDate = "Vui lòng chọn ngày sinh."
    if (!form.phone.trim()) found.phone = "Vui lòng nhận số điện thoại."
    else if (!PHONE_RE.test(form.phone.replace(/[\s.-]/g, ""))) found.phone = "Số điện thoại không hợp lệ."
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) found.email = "Email không hợp lệ."
    if (!form.address.trim()) found.address = "Vui lòng nhập địa chỉ."
    if (!form.guardianName.trim()) found.guardianName = "Vui lòng nhập tên phụ huynh."
    if (!form.guardianPhone.trim()) found.guardianPhone = "Vui lòng nhận SĐT phụ huynh."
    else if (!PHONE_RE.test(form.guardianPhone.replace(/[\s.-]/g, ""))) found.guardianPhone = "SĐT phụ huynh không hợp lệ."
    setErrors(found)
    return Object.keys(found).length === 0
  }

  const goNext = () => {
    if (step === 1 && !existing && !validateStudent()) {
      toast.error("Vui lòng điền đủ thông tin học viên", { description: "Các trường bắt buộc đang bị thiếu." })
      return
    }
    if (step === 3 && discount > tuitionTotal) {
      toast.error("Mức giảm giá không hợp lệ", { description: "Không thể giảm quá tổng học phí." })
      return
    }
    setStep((prev) => Math.min(5, prev + 1))
  }

  const goBack = () => setStep((prev) => Math.max(1, prev - 1))

  const reset = () => {
    setStep(1)
    setExisting(null)
    setForm(EMPTY_STUDENT)
    setErrors({})
    setQuery("")
    setClassId(CENTER_CLASSES[0].id)
    setDiscount(0)
    setVoucher("")
    setMethod("Tiền mặt")
    setAmount("")
    setAmountError(undefined)
    navigate("/nhan-vien/ghi-danh", { replace: true })
  }

  const finish = () => {
    if (!existing && !validateStudent()) return
    const value = Number(amount.replace(/\D/g, ""))
    if (!amount.trim()) {
      setAmountError("Vui lòng nhập số tiền thu.")
      return
    }
    if (Number.isNaN(value) || value <= 0) {
      setAmountError("Số tiền phải lớn hơn 0.")
      return
    }
    if (value > payable) {
      setAmountError(`Vượt quá số phải thu (${formatVnd(payable)}).`)
      return
    }
    setAmountError(undefined)

    const receiptNo = nextReceiptNo()
    const student: StaffStudent =
      existing ??
      {
        id: `new-${receiptNo}`,
        studentCode: "HV2026-MOI",
        fullName: form.fullName.trim(),
        birthDate: form.birthDate,
        gender: form.gender === "Nam" ? "Nam" : "Nữ",
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        identityNo: "",
        occupation: "Học sinh",
        status: "active",
        level: cls.level,
        startDate: formatDate(STAFF_TODAY),
        classId,
        staffId: STAFF_PROFILE.id,
        guardian: {
          fullName: form.guardianName.trim(),
          relation: form.guardianRelation,
          phone: form.guardianPhone.trim(),
          email: form.email.trim(),
          occupation: "",
          address: form.address.trim(),
        },
        tuition: { total: tuitionTotal, paid: value, remaining: payable - value, dueDate: STAFF_TODAY, status: value >= payable ? "paid" : "partial" },
        attendance: { rate: 100, absent: 0, late: 0 },
        averageScore: 0,
        notes: [],
        avatar: "",
      }

    const preview: ReceiptData = {
      receiptNo,
      date: formatDate(STAFF_TODAY),
      student,
      total: tuitionTotal,
      discount,
      amount: value,
      method,
      collectorId: STAFF_PROFILE.id,
      note: `Ghi danh khóa ${cls.name}${voucher.trim() ? ` · mã ưu đãi ${voucher.trim()}` : ""}`,
    }
    setReceipt(preview)
    toast.success("Ghi danh thành công!", {
      description: `${form.fullName || existing?.fullName} · ${cls.name} · Phiếu ${receiptNo}`,
    })
  }

  const studentName = existing?.fullName ?? form.fullName

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={leadId ? "Chuyển khách từ bảng tư vấn" : "5 bước, hoàn thành trong vài phút"}
        title="Ghi danh học viên"
        description="Tạo hồ sơ, xếp lớp, tính học phí và thu tiền đợt đầu — tất cả trong một luồng duy nhất."
        actions={
          <Button variant="outline" onClick={reset}>
            <RotateCcw /> Bắt đầu lại
          </Button>
        }
      />

      {/* Thanh tiến trình */}
      <Reveal>
        <Card>
          <CardContent className="p-4 sm:p-5">
            <ol className="flex gap-2 overflow-x-auto pb-1">
              {STEPS.map((item) => {
                const done = step > item.value
                const active = step === item.value
                return (
                  <li key={item.value} className="flex min-w-40 flex-1 items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => item.value < step && setStep(item.value)}
                      disabled={item.value > step}
                      className={cn(
                        "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-2xl border px-3 text-left transition-colors",
                        active && "border-brand bg-cream shadow-soft",
                        done && "border-success/30 bg-green-50/60 hover:bg-green-50",
                        !active && !done && "border-slate-100 bg-surface",
                        item.value > step && "cursor-default",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          active && "bg-brand text-ink",
                          done && "bg-success text-white",
                          !active && !done && "bg-slate-200 text-ink-soft",
                        )}
                      >
                        {done ? <Check className="size-4" /> : item.value}
                      </span>
                      <span className="min-w-0">
                        <span className={cn("block truncate text-xs font-semibold", active ? "text-ink" : "text-ink-soft")}>
                          {item.label}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </CardContent>
        </Card>
      </Reveal>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Reveal key={step}>
          {/* Bước 1: chọn học viên */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Bước 1 · Chọn học viên</CardTitle>
                <CardDescription>Kiểm tra hồ sơ đã có trong hệ thống hoặc tạo hồ sơ mới</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-soft" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Tìm học viên đã có trong hệ thống theo tên hoặc mã..."
                    aria-label="Tìm học viên"
                    className="pl-11"
                  />
                </div>

                <ul className="flex flex-col gap-2">
                  {searchResults.map((student) => {
                    const selected = existing?.id === student.id
                    return (
                      <li key={student.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setExisting(student)
                            setClassId(student.classId)
                            setForm({
                              fullName: student.fullName,
                              birthDate: student.birthDate,
                              gender: student.gender,
                              phone: student.phone,
                              email: student.email,
                              address: student.address,
                              guardianName: student.guardian.fullName,
                              guardianRelation: student.guardian.relation,
                              guardianPhone: student.guardian.phone,
                            })
                          }}
                          className={cn(
                            "flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors",
                            selected ? "border-brand bg-cream" : "border-slate-100 hover:border-brand/40",
                          )}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-ink">{student.fullName}</span>
                            <span className="block truncate text-xs text-ink-soft">
                              {student.studentCode} · {classNameOf(student.classId)} · {STUDENT_STATUS_META[student.status].label}
                            </span>
                          </span>
                          {selected ? <Badge variant="success">Đã chọn</Badge> : <Badge variant="neutral">Hồ sơ có sẵn</Badge>}
                        </button>
                      </li>
                    )
                  })}
                  {query.trim() && searchResults.length === 0 && (
                    <li className="rounded-2xl border border-dashed border-slate-300 py-6 text-center text-sm text-ink-soft">
                      Không có hồ sơ trùng tên. Hãy điền thông tin bên dưới để tạo mới.
                    </li>
                  )}
                </ul>

                {existing && (
                  <div className="flex items-start gap-2 rounded-xl bg-green-50 p-3.5 text-sm text-ink-soft">
                    <BadgeCheck className="mt-0.5 size-4 shrink-0 text-success" />
                    Đang dùng hồ sơ có sẵn của <strong className="text-ink">{existing.fullName}</strong> ({existing.studentCode}).
                    <button type="button" className="ml-auto cursor-pointer font-semibold text-sky-600 underline" onClick={() => setExisting(null)}>
                      Tạo hồ sơ mới
                    </button>
                  </div>
                )}

                {!existing && (
                  <div className="flex flex-col gap-4 rounded-2xl bg-surface p-4">
                    <p className="text-sm font-semibold text-ink">Thông tin học viên mới</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField id="en-fullName" label="Họ và tên" required error={errors.fullName}>
                        <Input id="en-fullName" value={form.fullName} onChange={(e) => update("fullName")(e.target.value)} placeholder="Nguyễn Văn A" {...invalid("fullName")} />
                      </FormField>
                      <FormField id="en-birthDate" label="Ngày sinh" required error={errors.birthDate}>
                        <Input id="en-birthDate" type="date" value={form.birthDate} onChange={(e) => update("birthDate")(e.target.value)} {...invalid("birthDate")} />
                      </FormField>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <FormField id="en-gender" label="Giới tính">
                        <select id="en-gender" value={form.gender} onChange={(e) => update("gender")(e.target.value)} className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}>
                          <option value="Nữ">Nữ</option>
                          <option value="Nam">Nam</option>
                        </select>
                      </FormField>
                      <FormField id="en-phone" label="SĐT học viên" required error={errors.phone}>
                        <Input id="en-phone" type="tel" value={form.phone} onChange={(e) => update("phone")(e.target.value)} placeholder="0909 123 456" {...invalid("phone")} />
                      </FormField>
                      <FormField id="en-email" label="Email" error={errors.email}>
                        <Input id="en-email" type="email" value={form.email} onChange={(e) => update("email")(e.target.value)} placeholder="email@vidu.com" {...invalid("email")} />
                      </FormField>
                    </div>
                    <FormField id="en-address" label="Địa chỉ" required error={errors.address}>
                      <Input id="en-address" value={form.address} onChange={(e) => update("address")(e.target.value)} placeholder="Số nhà, đường, quận, TP.HCM" {...invalid("address")} />
                    </FormField>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <FormField id="en-guardianName" label="Phụ huynh" required error={errors.guardianName}>
                        <Input id="en-guardianName" value={form.guardianName} onChange={(e) => update("guardianName")(e.target.value)} placeholder="Nguyễn Thị Hồng" {...invalid("guardianName")} />
                      </FormField>
                      <FormField id="en-guardianRelation" label="Quan hệ">
                        <select id="en-guardianRelation" value={form.guardianRelation} onChange={(e) => update("guardianRelation")(e.target.value)} className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}>
                          {["Mẹ", "Bố", "Ông", "Bà", "Người bảo hộ khác"].map((relation) => (
                            <option key={relation} value={relation}>{relation}</option>
                          ))}
                        </select>
                      </FormField>
                      <FormField id="en-guardianPhone" label="SĐT phụ huynh" required error={errors.guardianPhone}>
                        <Input id="en-guardianPhone" type="tel" value={form.guardianPhone} onChange={(e) => update("guardianPhone")(e.target.value)} placeholder="0909 123 456" {...invalid("guardianPhone")} />
                      </FormField>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Bước 2: chọn lớp */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Bước 2 · Chọn lớp</CardTitle>
                <CardDescription>Chỉ hiển thị lớp còn chỗ và đang hoạt động</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {openClasses.map((item) => {
                    const full = item.studentCount >= item.maxStudents
                    const selected = item.id === classId
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          disabled={full}
                          onClick={() => setClassId(item.id)}
                          className={cn(
                            "flex w-full cursor-pointer flex-col gap-2 rounded-2xl border p-4 text-left transition-colors",
                            selected ? "border-brand bg-cream shadow-soft" : "border-slate-100 hover:border-brand/40",
                            full && "cursor-not-allowed opacity-50",
                          )}
                        >
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-ink">{item.name}</span>
                            <Badge variant={item.tone}>{item.code}</Badge>
                            {full && <Badge variant="neutral">Đã đủ</Badge>}
                          </span>
                          <span className="text-xs text-ink-soft">
                            {item.course} · {item.time} · {item.room}
                          </span>
                          <span className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                            <Badge variant={CLASS_STATUS_META[item.status].badge}>{CLASS_STATUS_META[item.status].label}</Badge>
                            <span>
                              {item.studentCount}/{item.maxStudents} học viên
                            </span>
                            <span>{formatVnd(tuitionOfLevel(item.level))}</span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Bước 3: học phí & giảm giá */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Bước 3 · Học phí & giảm giá</CardTitle>
                <CardDescription>Đơn giá theo trình độ của lớp {cls.name}, áp dụng mã ưu đãi nếu có</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="rounded-2xl bg-surface p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-ink-soft">Học phí {cls.level}</span>
                    <span className="font-heading text-lg font-extrabold text-ink tabular-nums">{formatVnd(tuitionTotal)}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">
                    {cls.totalLessons} buổi · {cls.time} · {cls.room}
                  </p>
                </div>

                <FormField id="en-voucher" label="Mã ưu đãi (không bắt buộc)" hint={<span className="text-xs text-ink-soft">VD: KHAI GIANG20, CHIẾT KHÁU 10%</span>}>
                  <Input id="en-voucher" value={voucher} onChange={(e) => setVoucher(e.target.value)} placeholder="Nhập mã ưu đãi" />
                </FormField>

                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Giảm 10%", value: Math.round((tuitionTotal * 10) / 100) },
                    { label: "Giảm 20% (khai giảng)", value: Math.round((tuitionTotal * 20) / 100) },
                    { label: "Miễn 100%", value: tuitionTotal },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setDiscount(item.value)}
                      className={cn(
                        "min-h-10 cursor-pointer rounded-xl px-3.5 text-xs font-semibold transition-colors",
                        discount === item.value ? "bg-brand text-ink shadow-glow" : "bg-surface text-ink-soft hover:bg-cream",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                  {discount > 0 && (
                    <button
                      type="button"
                      onClick={() => setDiscount(0)}
                      className="min-h-10 cursor-pointer rounded-xl bg-surface px-3.5 text-xs font-semibold text-danger hover:bg-red-50"
                    >
                      Bỏ giảm giá
                    </button>
                  )}
                </div>

                <FormField id="en-discount" label="Số tiền giảm" hint={<span className="text-xs text-ink-soft">Tối đa {formatVnd(tuitionTotal)}</span>}>
                  <Input
                    id="en-discount"
                    inputMode="numeric"
                    value={discount === 0 ? "" : discount.toLocaleString("vi-VN")}
                    onChange={(e) => setDiscount(Number(e.target.value.replace(/\D/g, "")) || 0)}
                    placeholder="0"
                    className="font-heading font-bold tabular-nums"
                  />
                </FormField>
              </CardContent>
            </Card>
          )}

          {/* Bước 4: khoản phải thu */}
          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Bước 4 · Tạo khoản phải thu</CardTitle>
                <CardDescription>Khoản phải thu đầu tiên và các đợt tiếp theo của {studentName}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                      <tr>
                        <th scope="col" className="px-3 py-2.5 font-semibold">Kỳ</th>
                        <th scope="col" className="px-3 py-2.5 font-semibold">Thời điểm</th>
                        <th scope="col" className="px-3 py-2.5 font-semibold">Trạng thái</th>
                        <th scope="col" className="px-3 py-2.5 text-right font-semibold">Số tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className="bg-cream/40">
                        <td className="px-3 py-3 font-semibold text-ink">Đợt 1 · Học phí khóa</td>
                        <td className="px-3 py-3 whitespace-nowrap text-ink-soft">Khi ghi danh</td>
                        <td className="px-3 py-3"><Badge variant="warning">Cần thu hôm nay</Badge></td>
                        <td className="px-3 py-3 text-right font-semibold text-ink tabular-nums">{formatVnd(firstInstallment)}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-3 text-ink-soft">Đợt 2</td>
                        <td className="px-3 py-3 whitespace-nowrap text-ink-soft">Sau 4 tháng</td>
                        <td className="px-3 py-3"><Badge variant="neutral">Chưa đến hạn</Badge></td>
                        <td className="px-3 py-3 text-right text-ink-soft tabular-nums">—</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-3 text-ink-soft">Tài liệu + đồng phụ</td>
                        <td className="px-3 py-3 whitespace-nowrap text-ink-soft">Khi nhận sách</td>
                        <td className="px-3 py-3"><Badge variant="neutral">Chưa đến hạn</Badge></td>
                        <td className="px-3 py-3 text-right text-ink-soft tabular-nums">—</td>
                      </tr>
                    </tbody>
                    <tfoot className="border-t border-slate-100 bg-surface">
                      <tr>
                        <td colSpan={3} className="px-3 py-3 text-right text-sm font-semibold text-ink-soft">Tổng khóa</td>
                        <td className="px-3 py-3 text-right font-heading font-extrabold text-ink tabular-nums">{formatVnd(tuitionTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bước 5: thu tiền */}
          {step === 5 && (
            <Card>
              <CardHeader>
                <CardTitle>Bước 5 · Thu tiền</CardTitle>
                <CardDescription>Nhập số tiền thu đợt đầu để lập phiếu và khóa hồ sơ</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="rounded-2xl bg-surface p-4">
                  <p className="text-sm text-ink-soft">Số phải thu đợt 1</p>
                  <p className="font-heading mt-1 text-2xl font-extrabold text-ink tabular-nums">{formatVnd(payable)}</p>
                  {discount > 0 && (
                    <p className="mt-1 text-xs text-success">
                      Đã áp dụng giảm giá {formatVnd(discount)}
                      {voucher.trim() && ` (mã ${voucher.trim()})`}
                    </p>
                  )}
                </div>

                <FormField id="en-amount" label="Số tiền thu" required error={amountError}>
                  <Input
                    id="en-amount"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value)
                      setAmountError(undefined)
                    }}
                    placeholder={payable.toLocaleString("vi-VN")}
                    className="font-heading text-lg font-extrabold tabular-nums"
                    aria-invalid={Boolean(amountError) || undefined}
                    aria-describedby={amountError ? "en-amount-error" : undefined}
                  />
                </FormField>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAmount(payable.toLocaleString("vi-VN"))}
                    className="min-h-10 cursor-pointer rounded-xl bg-brand px-3.5 text-xs font-semibold text-ink shadow-glow"
                  >
                    Thu đủ {formatVnd(payable)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmount(Math.round(payable / 2).toLocaleString("vi-VN"))}
                    className="min-h-10 cursor-pointer rounded-xl bg-surface px-3.5 text-xs font-semibold text-ink-soft hover:bg-cream"
                  >
                    Thu một nửa
                  </button>
                </div>

                <FormField id="en-method" label="Hình thức thanh toán" required>
                  <select id="en-method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}>
                    {(Object.keys(PAYMENT_METHOD_META) as PaymentMethod[]).map((key) => (
                      <option key={key} value={key}>{key}</option>
                    ))}
                  </select>
                </FormField>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={finish}>
                    <CheckCircle2 /> Hoàn tất ghi danh
                  </Button>
                  <Button variant="outline" render={<Link to="/nhan-vien/hoc-vien" />}>
                    <Users /> Xem danh sách học viên
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Điều hướng bước */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <Button variant="outline" disabled={step === 1} onClick={goBack}>
              <ArrowLeft /> Bước trước
            </Button>
            {step < 5 ? (
              <Button onClick={goNext}>
                Tiếp tục <ArrowRight />
              </Button>
            ) : (
              <Button onClick={finish}>
                <CheckCircle2 /> Hoàn tất ghi danh
              </Button>
            )}
          </div>
        </Reveal>

        {/* Tóm tắt bên phải */}
        <Reveal delay={0.08}>
          <Card className="xl:sticky xl:top-24">
            <CardHeader>
              <CardTitle>Tóm tắt đăng ký</CardTitle>
              <CardDescription>Kiểm tra lại trước khi hoàn tất</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <SummaryRow label="Học viên" value={existing ? `${existing.fullName} (${existing.studentCode})` : form.fullName || "Chưa nhập"} />
              <SummaryRow label="Phụ huynh" value={form.guardianName || existing?.guardian.fullName || "Chưa nhập"} />
              <SummaryRow label="Lớp" value={cls.name} />
              <SummaryRow label="Trình độ" value={cls.level} />
              <SummaryRow label="Giáo viên" value={cls.teacher} />
              <SummaryRow label="Nhân viên phụ trách" value={STAFF_PROFILE.fullName} />
              <div className="mt-2 rounded-2xl bg-surface p-4">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-ink-soft">Học phí</span>
                  <span className="font-medium tabular-nums text-ink">{formatVnd(tuitionTotal)}</span>
                </div>
                <div className="mt-1.5 flex justify-between gap-3 text-sm">
                  <span className="text-ink-soft">Giảm giá</span>
                  <span className="font-medium tabular-nums text-success">−{formatVnd(discount)}</span>
                </div>
                <div className="mt-2 flex justify-between gap-3 border-t border-slate-200 pt-2">
                  <span className="text-sm font-semibold text-ink">Phải thu đợt 1</span>
                  <span className="font-heading text-lg font-extrabold text-brand-hover tabular-nums">{formatVnd(payable)}</span>
                </div>
              </div>
              <p className="flex items-start gap-2 rounded-xl bg-cream p-3 text-xs leading-relaxed text-ink-soft">
                <CreditCard className="mt-0.5 size-4 shrink-0" />
                Hồ sơ sẽ được tạo với mã tự sinh và gửi thông báo cho phụ huynh qua Zalo.
              </p>
            </CardContent>
          </Card>
        </Reveal>
      </div>

      <Modal
        open={Boolean(receipt)}
        onOpenChange={(open) => !open && setReceipt(null)}
        title="Hoàn tất ghi danh"
        description="In phiếu thu và bàn giao hồ sơ cho phụ huynh."
        icon={<Receipt className="size-6" />}
        className="sm:max-w-2xl"
        footer={
          <>
            <Button variant="outline" onClick={reset}>Ghi danh học viên khác</Button>
            <Button render={<Link to="/nhan-vien/hoc-vien" />}>Đến danh sách học viên</Button>
          </>
        }
      >
        {receipt && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-2 rounded-2xl bg-green-50 p-3.5 text-sm text-ink-soft">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
              Đã tạo hồ sơ và khoản phải thu cho {receipt.student.fullName} · lớp {classNameOf(classId)}.
            </div>
            <ReceiptView receipt={receipt} onPrint={() => window.print()} />
          </div>
        )}
      </Modal>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="shrink-0 text-ink-soft">{label}</span>
      <span className="min-w-0 text-right font-semibold text-ink">{value}</span>
    </div>
  )
}

function tuitionOfLevel(level: string) {
  if (level.startsWith("A1") || level.startsWith("A2")) return 8_400_000
  if (level.startsWith("B1")) return 9_600_000
  if (level.startsWith("B2")) return 10_800_000
  if (level.startsWith("C1")) return 12_000_000
  return 6_000_000
}