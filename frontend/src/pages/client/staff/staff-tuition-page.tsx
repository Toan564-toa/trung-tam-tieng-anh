import { useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  CreditCard,
  Download,
  History,
  Phone,
  Printer,
  Receipt,
  Search,
  Wallet,
} from "lucide-react"
import { cn } from "cn"
import { ReceiptView, type ReceiptData } from "@/features/staff/receipt-view"
import { PageHeader } from "@/components/layout/page-header"
import { StatCard } from "@/components/common/stat-card"
import { Reveal } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { fieldBase, Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { formatDate } from "@/lib/date"
import { formatVnd } from "@/lib/format"
import { exportPaymentsSheet } from "@/lib/excel"
import {
  CENTER_PAYMENTS,
  PAYMENT_METHOD_META,
  STAFF_PROFILE,
  STAFF_TODAY,
  STUDENT_STATUS_META,
  TUITION_STATUS_META,
  classNameOf,
  collectedToday,
  filterStudents,
  getStaffMember,
  getStaffStudent,
  nextReceiptNo,
  overdueStudents,
  paymentsToday,
  tuitionProgress,
  type PaymentMethod,
  type StaffStudent,
} from "@/data/staff"

const AMOUNT_PRESETS = [1_000_000, 2_100_000, 2_400_000, 3_000_000]

export function StaffTuitionPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get("hv")

  const [query, setQuery] = useState("")
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<PaymentMethod>("Chuyển khoản")
  const [note, setNote] = useState("")
  const [errors, setErrors] = useState<{ amount?: string; method?: string }>({})
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [payments, setPayments] = useState(CENTER_PAYMENTS)

  const student = selectedId ? getStaffStudent(selectedId) : undefined

  const results = useMemo(() => {
    if (student) return [student]
    const needle = query.trim().toLowerCase()
    if (!needle) return []
    return filterStudents({ query }).slice(0, 8)
  }, [query, student])

  const overdue = overdueStudents()
  const todayPayments = paymentsToday()

  const selectStudent = (id: string) => {
    setSearchParams({ hv: id }, { replace: true })
    setAmount("")
    setNote("")
    setErrors({})
  }

  const clearStudent = () => {
    setSearchParams({}, { replace: true })
    setAmount("")
    setNote("")
    setErrors({})
  }

  const collect = () => {
    if (!student) return
    const value = Number(amount.replace(/\D/g, ""))
    const nextErrors: { amount?: string; method?: string } = {}
    if (!amount.trim()) nextErrors.amount = "Vui lòng nhập số tiền thu."
    else if (Number.isNaN(value) || value <= 0) nextErrors.amount = "Số tiền phải lớn hơn 0."
    else if (value > student.tuition.remaining) nextErrors.amount = `Vượt quá số còn phải thu (${formatVnd(student.tuition.remaining)}).`
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Vui lòng kiểm tra lại số tiền")
      return
    }

    const receiptNo = nextReceiptNo()
    const data: ReceiptData = {
      receiptNo,
      date: formatDate(STAFF_TODAY),
      student,
      total: student.tuition.total,
      discount: 0,
      amount: value,
      method,
      collectorId: STAFF_PROFILE.id,
      note: note.trim() || `Thu học phí đợt tiếp theo · ${classNameOf(student.classId)}`,
    }
    setPayments((prev) => [
      {
        id: `p-${Date.now()}`,
        studentId: student.id,
        date: data.date,
        amount: value,
        method,
        receiptNo,
        note: data.note,
        collectorId: STAFF_PROFILE.id,
        forInvoice: `HP-${student.classId}-${data.date.replace(/\//g, "-")}`,
      },
      ...prev,
    ])
    setReceipt(data)
    toast.success("Đã ghi nhận thu học phí!", {
      description: `${student.fullName} · ${formatVnd(value)} · Phiếu ${receiptNo}`,
    })
    setAmount("")
    setNote("")
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`Ngày ${formatDate(STAFF_TODAY)}`}
        title="Thu học phí"
        description="Tra cứu học viên, kiểm tra số còn nợ và lập phiếu thu kèm biên nhận in ngay tại quầy."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Đã thu hôm nay" value={formatVnd(collectedToday())} icon={Wallet} trend={{ text: `${todayPayments.length} phiếu`, tone: "success" }} iconClass="bg-green-100 text-success" />
        <StatCard label="Phiếu trong ngày" value={String(payments.length)} icon={Receipt} trend={{ text: "Toàn trung tâm", tone: "info" }} iconClass="bg-sky-100 text-sky-700" />
        <StatCard label="Quá hạn" value={String(overdue.length)} icon={AlertTriangle} trend={{ text: formatVnd(overdue.reduce((s, x) => s + x.tuition.remaining, 0)), tone: "danger" }} iconClass="bg-red-100 text-danger" />
        <StatCard label="Đã thu tháng này" value={formatVnd(payments.reduce((s, p) => s + p.amount, 0))} icon={Banknote} trend={{ text: `${new Set(payments.map((p) => p.studentId)).size} học viên`, tone: "success" }} iconClass="bg-brand-soft text-amber-700" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="flex flex-col gap-6">
          {/* Tra cứu học viên */}
          <Reveal>
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>{student ? "Đang thu học phí cho" : "Tra cứu học viên"}</CardTitle>
                  <CardDescription>
                    {student ? "Kiểm tra số còn nợ trước khi nhập số tiền" : "Nhập tên, mã học viên hoặc SĐT phụ huynh"}
                  </CardDescription>
                </div>
                {student && (
                  <Button variant="ghost" size="sm" onClick={clearStudent}>
                    Đổi học viên
                  </Button>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {!student && (
                  <>
                    <div className="relative">
                      <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-soft" />
                      <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Ví dụ: Nguyễn Hoàng Minh hoặc HV2026-0001"
                        aria-label="Tìm học viên để thu học phí"
                        className="pl-11"
                      />
                    </div>
                    <ul className="flex flex-col gap-2">
                      {results.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => selectStudent(item.id)}
                            className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-slate-100 p-3.5 text-left transition-colors hover:border-brand/50 hover:bg-cream/40"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-ink">{item.fullName}</span>
                              <span className="block truncate text-xs text-ink-soft">
                                {item.studentCode} · {classNameOf(item.classId)} · PH {item.guardian.phone}
                              </span>
                            </span>
                            <Badge variant={TUITION_STATUS_META[item.tuition.status].badge} className="shrink-0">
                              {TUITION_STATUS_META[item.tuition.status].label}
                            </Badge>
                          </button>
                        </li>
                      ))}
                      {query.trim() && results.length === 0 && (
                        <li className="rounded-2xl border border-dashed border-slate-300 py-8 text-center text-sm text-ink-soft">
                          Không tìm thấy học viên phù hợp.
                        </li>
                      )}
                      {!query.trim() && (
                        <li className="rounded-2xl border border-dashed border-slate-300 py-8 text-center text-sm text-ink-soft">
                          Nhập từ khoá để tra cứu nhanh.
                        </li>
                      )}
                    </ul>
                  </>
                )}

                {student && <StudentDebtCard student={student} />}
              </CardContent>
            </Card>
          </Reveal>

          {/* Sổ thu */}
          <Reveal delay={0.06}>
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>Sổ thu học phí</CardTitle>
                  <CardDescription>{payments.length} phiếu đã ghi nhận trong kỳ demo</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void exportPaymentsSheet(
                        payments.map((payment) => {
                          const found = getStaffStudent(payment.studentId)
                          return {
                            date: payment.date,
                            receiptNo: payment.receiptNo,
                            studentName: found?.fullName ?? "",
                            studentCode: found?.studentCode ?? "",
                            className: found ? classNameOf(found.classId) : "",
                            method: payment.method,
                            amount: payment.amount,
                            note: payment.note,
                            collectorName: getStaffMember(payment.collectorId)?.fullName ?? "",
                          }
                        }),
                      )
                    }
                  >
                    <Download /> Xuất Excel
                  </Button>
                  <Button variant="ghost" size="sm" render={<Link to="/nhan-vien/hoc-vien" />}>
                    <History /> Tra cứu hồ sơ
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                      <tr>
                        <th scope="col" className="px-3 py-2.5 font-semibold">Ngày</th>
                        <th scope="col" className="px-3 py-2.5 font-semibold">Phiếu</th>
                        <th scope="col" className="px-3 py-2.5 font-semibold">Học viên</th>
                        <th scope="col" className="px-3 py-2.5 font-semibold">Hình thức</th>
                        <th scope="col" className="px-3 py-2.5 text-right font-semibold">Số tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((payment) => {
                        const found = getStaffStudent(payment.studentId)
                        return (
                          <tr key={payment.id} className="transition-colors hover:bg-cream/30">
                            <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{payment.date}</td>
                            <td className="px-3 py-3 font-mono text-xs whitespace-nowrap text-ink-soft">{payment.receiptNo}</td>
                            <td className="px-3 py-3">
                              <span className="block truncate font-medium text-ink">{found?.fullName ?? "—"}</span>
                              <span className="block truncate text-xs text-ink-soft">{found ? classNameOf(found.classId) : ""}</span>
                            </td>
                            <td className="px-3 py-3">
                              <Badge variant={PAYMENT_METHOD_META[payment.method].badge}>{payment.method}</Badge>
                            </td>
                            <td className="px-3 py-3 text-right font-semibold whitespace-nowrap text-success tabular-nums">
                              {formatVnd(payment.amount)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot className="border-t border-slate-100 bg-surface">
                      <tr>
                        <td colSpan={4} className="px-3 py-3 text-right text-sm font-semibold text-ink-soft">Tổng</td>
                        <td className="px-3 py-3 text-right font-heading font-extrabold whitespace-nowrap text-success tabular-nums">
                          {formatVnd(payments.reduce((s, p) => s + p.amount, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </div>

        <div className="flex flex-col gap-6">
          {/* Nhập khoản thu */}
          <Reveal delay={0.1}>
            <Card>
              <CardHeader>
                <CardTitle>Lập phiếu thu</CardTitle>
                <CardDescription>Nhập số tiền và hình thức thanh toán của học viên</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {!student ? (
                  <p className="rounded-xl bg-surface p-4 text-sm text-ink-soft">
                    Chọn học viên ở ô tra cứu để bắt đầu lập phiếu thu.
                  </p>
                ) : (
                  <>
                    <div className="rounded-2xl bg-surface p-3.5">
                      <p className="text-sm font-semibold text-ink">{student.fullName}</p>
                      <p className="mt-0.5 text-xs text-ink-soft">{classNameOf(student.classId)}</p>
                      <p className="font-heading mt-2 text-lg font-extrabold text-danger tabular-nums">
                        {formatVnd(student.tuition.remaining)}
                      </p>
                      <p className="text-xs text-ink-soft">còn phải thu</p>
                    </div>

                    <FormField id="pay-amount" label="Số tiền thu" required error={errors.amount}>
                      <Input
                        id="pay-amount"
                        inputMode="numeric"
                        value={amount}
                        onChange={(e) => {
                          setAmount(e.target.value)
                          setErrors((prev) => ({ ...prev, amount: undefined }))
                        }}
                        placeholder="Ví dụ: 2.100.000"
                        className="font-heading font-bold tabular-nums"
                        aria-invalid={Boolean(errors.amount) || undefined}
                        aria-describedby={errors.amount ? "pay-amount-error" : undefined}
                      />
                    </FormField>

                    <div className="flex flex-wrap gap-2">
                      {AMOUNT_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setAmount(preset.toLocaleString("vi-VN"))
                            setErrors((prev) => ({ ...prev, amount: undefined }))
                          }}
                          className={cn(
                            "min-h-10 cursor-pointer rounded-xl px-3 text-xs font-semibold transition-colors",
                            Number(amount.replace(/\D/g, "")) === preset
                              ? "bg-brand text-ink shadow-glow"
                              : "bg-surface text-ink-soft hover:bg-cream",
                          )}
                        >
                          {formatVnd(preset)}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setAmount(student.tuition.remaining.toLocaleString("vi-VN"))}
                        className="min-h-10 cursor-pointer rounded-xl bg-surface px-3 text-xs font-semibold text-ink-soft transition-colors hover:bg-cream"
                      >
                        Thu toàn bộ
                      </button>
                    </div>

                    <FormField id="pay-method" label="Hình thức thanh toán" required error={errors.method}>
                      <select
                        id="pay-method"
                        value={method}
                        onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                        className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}
                      >
                        {(Object.keys(PAYMENT_METHOD_META) as PaymentMethod[]).map((key) => (
                          <option key={key} value={key}>{key}</option>
                        ))}
                      </select>
                    </FormField>

                    <FormField id="pay-note" label="Ghi chú phiếu thu">
                      <Textarea
                        id="pay-note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        placeholder="Ví dụ: Thu đợt 2 khóa A2 Buổi Tối 01"
                      />
                    </FormField>

                    <Button block onClick={collect}>
                      <CheckCircle2 /> Xác nhận thu & xuất phiếu
                    </Button>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        render={<a href={`tel:${student.guardian.phone.replace(/ /g, "")}`} />}
                      >
                        <Phone /> Gọi phụ huynh
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        render={<Link to={`/nhan-vien/hoc-vien/${student.id}`} />}
                      >
                        Hồ sơ HV
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </Reveal>

          {/* Quá hạn cần nhắc */}
          <Reveal delay={0.16}>
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>Cần nhắc học phí</CardTitle>
                  <CardDescription>{overdue.length} học viên quá hạn</CardDescription>
                </div>
                <Badge variant="danger">{overdue.length}</Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {overdue.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectStudent(item.id)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-surface p-3 text-left transition-colors hover:bg-cream"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{item.fullName}</span>
                      <span className="block truncate text-xs text-ink-soft">
                        Hạn {formatDate(item.tuition.dueDate)} · {item.guardian.phone}
                      </span>
                    </span>
                    <span className="font-heading shrink-0 text-sm font-extrabold text-danger tabular-nums">
                      {formatVnd(item.tuition.remaining)}
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>

      <Modal
        open={Boolean(receipt)}
        onOpenChange={(open) => !open && setReceipt(null)}
        title="Phiếu thu học phí"
        description={receipt ? `Số phiếu ${receipt.receiptNo} · ${receipt.date}` : undefined}
        icon={<Printer className="size-6" />}
        className="sm:max-w-2xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setReceipt(null)}>Đóng</Button>
            <Button onClick={() => receipt && window.print()}>
              <Printer /> In phiếu thu
            </Button>
          </>
        }
      >
        {receipt && <ReceiptView receipt={receipt} onPrint={() => window.print()} />}
      </Modal>
    </div>
  )
}

function StudentDebtCard({ student }: { student: StaffStudent }) {
  const percent = tuitionProgress(student)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-2xl bg-surface p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-ink">{student.fullName}</p>
          <p className="truncate text-xs text-ink-soft">
            {student.studentCode} · {classNameOf(student.classId)} · Nhập học {student.startDate}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={STUDENT_STATUS_META[student.status].badge}>{STUDENT_STATUS_META[student.status].label}</Badge>
            <Badge variant={TUITION_STATUS_META[student.tuition.status].badge}>{TUITION_STATUS_META[student.tuition.status].label}</Badge>
            <Badge variant="neutral">NV: {getStaffMember(student.staffId)?.fullName}</Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" render={<Link to={`/nhan-vien/hoc-vien/${student.id}`} />}>
          <CreditCard /> Hồ sơ
        </Button>
      </div>

      <Progress
        value={percent}
        label={`Đã đóng ${formatVnd(student.tuition.paid)} / ${formatVnd(student.tuition.total)}`}
        valueLabel={`${percent}%`}
        tone={percent === 100 ? "success" : percent >= 50 ? "warning" : "danger"}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-100 p-3.5">
          <p className="text-xs text-ink-soft">Tổng học phí</p>
          <p className="font-heading mt-1 text-base font-extrabold text-ink tabular-nums">{formatVnd(student.tuition.total)}</p>
        </div>
        <div className="rounded-xl border border-slate-100 p-3.5">
          <p className="text-xs text-ink-soft">Đã đóng</p>
          <p className="font-heading mt-1 text-base font-extrabold text-success tabular-nums">{formatVnd(student.tuition.paid)}</p>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50/40 p-3.5">
          <p className="text-xs text-ink-soft">Còn phải thu</p>
          <p className="font-heading mt-1 text-base font-extrabold text-danger tabular-nums">{formatVnd(student.tuition.remaining)}</p>
        </div>
      </div>

      <p className="rounded-xl bg-cream p-3.5 text-xs leading-relaxed text-ink-soft">
        Hạn đóng kỳ này: <strong className="text-ink">{formatDate(student.tuition.dueDate)}</strong> ·
        Phụ huynh liên hệ: {student.guardian.fullName} ({student.guardian.phone})
      </p>
    </div>
  )
}