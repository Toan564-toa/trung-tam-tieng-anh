import { useMemo, useState } from "react"
import { Building2, CalendarRange, FileText, Printer, Save, ShieldAlert, Sliders } from "lucide-react"
import { cn } from "cn"
import { ReceiptView, type ReceiptData } from "@/features/staff/receipt-view"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { PageHeader } from "@/components/layout/page-header"
import { Reveal } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { ADMIN_SETTINGS, ADMIN_TODAY_LABEL, type CenterSettings } from "@/data/admin"
import { STAFF_PROFILE, STAFF_STUDENTS, type PaymentMethod } from "@/data/staff"
import { formatDate, toDateKey } from "@/lib/date"
import { formatVnd } from "@/lib/format"

const TABS = [
  { value: "info", label: "Thông tin trung tâm", icon: Building2 },
  { value: "academic", label: "Năm học", icon: CalendarRange },
  { value: "receipt", label: "Mẫu biên lai", icon: FileText },
  { value: "policy", label: "Chính sách", icon: Sliders },
] as const

type TabValue = (typeof TABS)[number]["value"]

type SettingsErrors = Partial<Record<"name" | "address" | "phone" | "email" | "taxCode" | "academicYear" | "academicStart" | "academicEnd" | "attendanceLockDays" | "receiptHeader" | "receiptFooter", string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/

function toDateInput(value: string) {
  const [day, month, year] = value.split("/").map(Number)
  if (!day || !month || !year) return ""
  return toDateKey(new Date(year, month - 1, day))
}

function fromDateInput(value: string) {
  if (!value) return ""
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return ""
  return formatDate(new Date(year, month - 1, day))
}

function Switch({
  id,
  checked,
  onChange,
  label,
  description,
}: {
  id: string
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  description: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 p-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors",
          checked ? "bg-success" : "bg-slate-300",
        )}
      >
        <span
          className={cn(
            "absolute top-1 size-5 rounded-full bg-white shadow-soft transition-all",
            checked ? "left-6" : "left-1",
          )}
        />
      </button>
    </div>
  )
}

export function AdminSettingsPage() {
  const [tab, setTab] = useState<TabValue>("info")
  const [settings, setSettings] = useState<CenterSettings>(ADMIN_SETTINGS)
  const [errors, setErrors] = useState<SettingsErrors>({})
  const [confirmReset, setConfirmReset] = useState(false)

  const update = <K extends keyof CenterSettings>(key: K) => (value: CenterSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const validateInfo = () => {
    const next: SettingsErrors = {}
    if (settings.name.trim().length < 3) next.name = "Tên trung tâm cần ít nhất 3 ký tự."
    if (!settings.address.trim()) next.address = "Vui lòng nhập địa chỉ."
    if (!PHONE_RE.test(settings.phone.replace(/\D/g, ""))) next.phone = "Số điện thoại sai định dạng (10 số bắt đầu bằng 0)."
    if (!EMAIL_RE.test(settings.email.trim())) next.email = "Email sai định dạng."
    if (settings.taxCode.trim() && !/^\d{10}(-\d{3})?$/.test(settings.taxCode.trim())) {
      next.taxCode = "Mã số thuế gồm 10 hoặc 13 chữ số."
    }
    return next
  }

  const validateAcademic = () => {
    const next: SettingsErrors = {}
    if (!settings.academicYear.trim()) next.academicYear = "Vui lòng nhập năm học."
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(settings.academicStart)) next.academicStart = "Ngày bắt đầu phải có định dạng dd/MM/yyyy."
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(settings.academicEnd)) next.academicEnd = "Ngày kết thúc phải có định dạng dd/MM/yyyy."
    if (!next.academicStart && !next.academicEnd && settings.academicEnd < settings.academicStart) {
      next.academicEnd = "Ngày kết thúc phải sau ngày bắt đầu."
    }
    return next
  }

  const validateReceipt = () => {
    const next: SettingsErrors = {}
    if (settings.receiptHeader.trim().length < 5) next.receiptHeader = "Tiêu đề phiếu thu cần ít nhất 5 ký tự."
    if (settings.receiptFooter.trim().length < 5) next.receiptFooter = "Chân phiếu thu cần ít nhất 5 ký tự."
    return next
  }

  const save = (kind: TabValue) => {
    const next =
      kind === "info" ? validateInfo() : kind === "academic" ? validateAcademic() : kind === "receipt" ? validateReceipt() : {}
    setErrors(next)
    if (Object.keys(next).length > 0) {
      toast.error("Vui lòng kiểm tra lại thông tin", { description: "Một số trường chưa hợp lệ." })
      return
    }
    if (kind === "info" && settings.name.trim() === "[TÊN TRUNG TÂM]") {
      toast.warning("Tên trung tâm vẫn là [TÊN TRUNG TÂM]", {
        description: "Hãy thay bằng tên thật trước khi in biên lai hoặc xuất báo cáo.",
      })
      return
    }
    if (kind === "policy") {
      if (!Number.isFinite(settings.attendanceLockDays) || settings.attendanceLockDays < 0 || settings.attendanceLockDays > 30) {
        setErrors({ attendanceLockDays: "Số ngày khoá điểm danh phải từ 0 đến 30." })
        toast.error("Vui lòng kiểm tra lại số ngày khoá điểm danh")
        return
      }
    }
    toast.success("Đã lưu cài đặt", { description: TABS.find((item) => item.value === kind)?.label })
  }

  const preview = useMemo<ReceiptData>(() => {
    const student = STAFF_STUDENTS[0]
    const total = student?.tuition.total ?? 2_400_000
    const discount = Math.round(total * 0.1)
    return {
      receiptNo: "PT-2610-0099",
      date: ADMIN_TODAY_LABEL,
      student,
      total,
      discount,
      amount: total - discount,
      method: "Chuyển khoản" as PaymentMethod,
      collectorId: STAFF_PROFILE.id,
      note: "Thu đợt 1 khóa học",
    }
  }, [])

  const invalid = (key: keyof SettingsErrors) => ({
    "aria-invalid": Boolean(errors[key]) || undefined,
    "aria-describedby": errors[key] ? `settings-${key}-error` : undefined,
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Cấu hình hệ thống"
        title="Cài đặt"
        description="Thông tin trung tâm, năm học, mẫu biên lai và chính sách áp dụng cho toàn hệ thống."
      />

      <Reveal delay={0.05}>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setTab(item.value)}
              className={cn(
                "flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
                tab === item.value ? "bg-brand text-ink shadow-glow" : "bg-white text-ink-soft hover:bg-cream",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          ))}
        </div>
      </Reveal>

      {tab === "info" && (
        <Reveal>
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle>Thông tin trung tâm</CardTitle>
                <CardDescription>Xuất hiện trên biên lai, hợp đồng và file xuất Excel</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {settings.name.trim() === "[TÊN TRUNG TÂM]" && <Badge variant="warning">Chưa đổi tên trung tâm</Badge>}
                <Button size="sm" onClick={() => save("info")}>
                  <Save /> Lưu
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save("info") }} noValidate>
                <FormField id="settings-name" label="Tên trung tâm" required error={errors.name} className="sm:col-span-2">
                  <Input
                    id="settings-name"
                    value={settings.name}
                    onChange={(e) => update("name")(e.target.value)}
                    className="font-heading font-bold"
                    {...invalid("name")}
                  />
                </FormField>
                <FormField id="settings-address" label="Địa chỉ" required error={errors.address} className="sm:col-span-2">
                  <Textarea
                    id="settings-address"
                    rows={2}
                    min-h-0
                    value={settings.address}
                    onChange={(e) => update("address")(e.target.value)}
                    {...invalid("address")}
                  />
                </FormField>
                <FormField id="settings-phone" label="Điện thoại" required error={errors.phone}>
                  <Input
                    id="settings-phone"
                    inputMode="tel"
                    value={settings.phone}
                    onChange={(e) => update("phone")(e.target.value)}
                    className="tabular-nums"
                    {...invalid("phone")}
                  />
                </FormField>
                <FormField id="settings-email" label="Email liên hệ" required error={errors.email}>
                  <Input
                    id="settings-email"
                    type="email"
                    value={settings.email}
                    onChange={(e) => update("email")(e.target.value)}
                    {...invalid("email")}
                  />
                </FormField>
                <FormField id="settings-tax" label="Mã số thuế" error={errors.taxCode} className="sm:col-span-2">
                  <Input
                    id="settings-tax"
                    value={settings.taxCode}
                    onChange={(e) => update("taxCode")(e.target.value)}
                    className="tabular-nums"
                    placeholder="0314782916"
                    {...invalid("taxCode")}
                  />
                </FormField>
                <div className="sm:col-span-2">
                  <Button type="submit">
                    <Save /> Lưu thông tin
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </Reveal>
      )}

      {tab === "academic" && (
        <Reveal>
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle>Năm học</CardTitle>
                <CardDescription>Áp dụng cho lớp học, học phí và báo cáo tổng kết</CardDescription>
              </div>
              <Button size="sm" onClick={() => save("academic")}>
                <Save /> Lưu
              </Button>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); save("academic") }} noValidate>
                <FormField id="settings-academic-year" label="Năm học" required error={errors.academicYear}>
                  <Input
                    id="settings-academic-year"
                    value={settings.academicYear}
                    onChange={(e) => update("academicYear")(e.target.value)}
                    placeholder="2026 – 2027"
                    {...invalid("academicYear")}
                  />
                </FormField>
                <FormField id="settings-academic-start" label="Ngày bắt đầu" required error={errors.academicStart}>
                  <Input
                    id="settings-academic-start"
                    type="date"
                    value={toDateInput(settings.academicStart)}
                    onChange={(e) => update("academicStart")(fromDateInput(e.target.value))}
                    {...invalid("academicStart")}
                  />
                </FormField>
                <FormField id="settings-academic-end" label="Ngày kết thúc" required error={errors.academicEnd}>
                  <Input
                    id="settings-academic-end"
                    type="date"
                    value={toDateInput(settings.academicEnd)}
                    onChange={(e) => update("academicEnd")(fromDateInput(e.target.value))}
                    {...invalid("academicEnd")}
                  />
                </FormField>
                <div className="sm:col-span-3">
                  <p className="rounded-2xl bg-surface p-3.5 text-sm text-ink-soft">
                    Năm học hiện tại: <strong className="text-ink">{settings.academicYear}</strong> ·{" "}
                    {settings.academicStart} → {settings.academicEnd}
                  </p>
                </div>
                <div className="sm:col-span-3">
                  <Button type="submit">
                    <Save /> Lưu năm học
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </Reveal>
      )}

      {tab === "receipt" && (
        <Reveal>
          <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle>Mẫu biên lai</CardTitle>
                  <CardDescription>Tiêu đề và chân phiếu thu in cho phụ huynh</CardDescription>
                </div>
                <Button size="sm" onClick={() => save("receipt")}>
                  <Save /> Lưu
                </Button>
              </CardHeader>
              <CardContent>
                <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); save("receipt") }} noValidate>
                  <FormField id="settings-receipt-header" label="Tiêu đề phiếu thu" required error={errors.receiptHeader}>
                    <Input
                      id="settings-receipt-header"
                      value={settings.receiptHeader}
                      onChange={(e) => update("receiptHeader")(e.target.value)}
                      className="font-heading font-bold uppercase"
                      {...invalid("receiptHeader")}
                    />
                  </FormField>
                  <FormField id="settings-receipt-footer" label="Chân phiếu thu" required error={errors.receiptFooter}>
                    <Textarea
                      id="settings-receipt-footer"
                      rows={3}
                      value={settings.receiptFooter}
                      onChange={(e) => update("receiptFooter")(e.target.value)}
                      {...invalid("receiptFooter")}
                    />
                  </FormField>
                  <Button type="submit">
                    <Save /> Lưu mẫu biên lai
                  </Button>

                  <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm">
                    <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Xem trước nội dung</p>
                    <p className="mt-2 font-heading text-base font-extrabold text-ink">{settings.receiptHeader}</p>
                    <p className="mt-1 text-xs text-ink-soft">
                      {settings.name} · {settings.address} · ĐT {settings.phone} · MST {settings.taxCode || "—"}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-ink-soft">{settings.receiptFooter}</p>
                    <p className="mt-3 text-xs tabular-nums text-ink-soft">
                      Ví dụ: học phí {formatVnd(preview.total)} · ưu đãi −{formatVnd(preview.discount)} · thu {formatVnd(preview.amount)}
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle>Xem trước phiếu thu</CardTitle>
                  <CardDescription>Bản mẫu A5 dùng cho học viên {preview.student.fullName}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer /> In thử
                </Button>
              </CardHeader>
              <CardContent>
                <ReceiptView receipt={preview} onPrint={() => window.print()} />
              </CardContent>
            </Card>
          </div>
        </Reveal>
      )}

      {tab === "policy" && (
        <Reveal>
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle>Chính sách</CardTitle>
                <CardDescription>Điều khoá điểm danh, ghi danh và thông báo phụ huynh</CardDescription>
              </div>
              <Button size="sm" onClick={() => save("policy")}>
                <Save /> Lưu
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FormField
                id="settings-lock-days"
                label="Số ngày cho phép sửa điểm danh"
                required
                error={errors.attendanceLockDays}
                hint={<span className="text-xs text-ink-soft">Hiện tại: {settings.attendanceLockDays} ngày</span>}
              >
                <Input
                  id="settings-lock-days"
                  type="number"
                  min={0}
                  max={30}
                  value={String(settings.attendanceLockDays)}
                  onChange={(e) => update("attendanceLockDays")(Number(e.target.value))}
                  className="max-w-40 tabular-nums"
                  {...invalid("attendanceLockDays")}
                />
              </FormField>

              <Switch
                id="settings-self-enroll"
                checked={settings.allowSelfEnroll}
                onChange={update("allowSelfEnroll")}
                label="Cho phép tự đăng ký học"
                description="Học viên có thể tự chọn lớp và ghi danh trên website mà không cần nhân viên xác nhận."
              />
              <Switch
                id="settings-password-change"
                checked={settings.requirePasswordChange}
                onChange={update("requirePasswordChange")}
                label="Bắt buộc đổi mật khẩu tạm"
                description="Tài khoản mới phải đổi mật khẩu ở lần đăng nhập đầu tiên."
              />
              <Switch
                id="settings-notify-parent"
                checked={settings.notifyParentOnPayment}
                onChange={update("notifyParentOnPayment")}
                label="Thông báo phụ huynh khi thu phí"
                description="Gửi thông báo cho phụ huynh mỗi khi ghi nhận thu học phí thành công."
              />

              <div>
                <Button onClick={() => save("policy")}>
                  <Save /> Lưu chính sách
                </Button>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      )}

      <Reveal delay={0.1}>
        <Card className="border-danger/30">
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-danger">
                <ShieldAlert className="size-5" /> Khu vực nguy hiểm
              </CardTitle>
              <CardDescription>Xoá toàn bộ dữ liệu mẫu của hệ thống</CardDescription>
            </div>
            <Button variant="danger" size="sm" onClick={() => setConfirmReset(true)}>
              <ShieldAlert /> Xoá dữ liệu mẫu
            </Button>
          </CardHeader>
          <CardContent>
            <p className="rounded-xl bg-red-50 p-3.5 text-sm leading-relaxed text-danger">
              Bản demo đang chạy với dữ liệu mẫu. Hành động này chỉ hiển thị cảnh báo trong bản demo, dữ liệu thật của bạn không bị
              xoá.
            </p>
          </CardContent>
        </Card>
      </Reveal>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Xoá toàn bộ dữ liệu mẫu?"
        description="Học viên, lớp học, học phí và cấu hình sẽ trở về trạng thái ban đầu"
        detail="Trong bản demo, thao tác này chỉ hiển thị cảnh báo. Trên hệ thống thật, dữ liệu sẽ bị xoá vĩnh viễn và không thể khôi phục."
        confirmLabel="Tôi hiểu, tiếp tục"
        onConfirm={() => {
          setConfirmReset(false)
          toast.warning("Đã ghi nhận yêu cầu xoá dữ liệu mẫu", {
            description: "Bản demo không xoá thật. Liên hệ quản trị viên hệ thống để tiếp tục.",
          })
        }}
      />
    </div>
  )
}
