import { useMemo, useState } from "react"
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Check,
  Download,
  Percent,
  Receipt,
  Scale,
  Wallet,
  XCircle,
} from "lucide-react"
import { cn } from "cn"
import { ChartFrame } from "@/components/admin/charts"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { TableEmpty, TablePagination, TableToolbar, ToolbarSelect } from "@/components/admin/table-toolbar"
import { StatCard } from "@/components/common/stat-card"
import { PageHeader } from "@/components/layout/page-header"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { fieldBase, Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import {
  ADMIN_INVOICES,
  ADMIN_TODAY_LABEL,
  CASH_CLOSES,
  DEBT_AGING,
  DISCOUNT_REQUESTS,
  INVOICE_STATUS_META,
  debtTotal,
  invoiceRemaining,
  type AdminInvoice,
  type CashClose,
  type DiscountRequest,
  type InvoiceStatus,
} from "@/data/admin"
import { PAYMENT_METHOD_META, type PaymentMethod } from "@/data/staff"
import { exportAdminTable } from "@/lib/admin-excel"
import { formatVnd } from "@/lib/format"

const TABS = [
  { value: "invoices", label: "Khoản phải thu", icon: Receipt },
  { value: "debt", label: "Công nợ", icon: AlertTriangle },
  { value: "cash", label: "Đối soát cuối ngày", icon: Scale },
  { value: "discount", label: "Duyệt giảm giá / hoàn phí", icon: Percent },
] as const

type TabValue = (typeof TABS)[number]["value"]

const INVOICE_KINDS: AdminInvoice["kind"][] = ["Học phí", "Tài liệu", "Đồng phụ", "Phí giữ xe"]
const PAGE_SIZE = 10

const CASH_STATUS_META: Record<CashClose["status"], { label: string; badge: "success" | "warning" | "danger" }> = {
  balanced: { label: "Đã cân bằng", badge: "success" },
  pending: { label: "Chờ đối soát", badge: "warning" },
  diff: { label: "Có chênh lệch", badge: "danger" },
}

const DISCOUNT_STATUS_META: Record<DiscountRequest["status"], { label: string; badge: "success" | "warning" | "danger" }> = {
  pending: { label: "Chờ duyệt", badge: "warning" },
  approved: { label: "Đã duyệt", badge: "success" },
  rejected: { label: "Đã từ chối", badge: "danger" },
}

type PayForm = { invoiceId: string; amount: string; method: PaymentMethod; note: string }
type PayErrors = { amount?: string; method?: string }

function cashDiff(row: CashClose) {
  return row.cashOnHand + row.bankTransfer - row.totalCollected
}

function debtByStudent(invoices: AdminInvoice[]) {
  const map = new Map<string, { studentId: string; studentName: string; className: string; remaining: number; invoices: number }>()
  for (const invoice of invoices) {
    const remaining = invoiceRemaining(invoice)
    if (remaining <= 0) continue
    const found = map.get(invoice.studentId)
    if (found) {
      found.remaining += remaining
      found.invoices += 1
      continue
    }
    map.set(invoice.studentId, {
      studentId: invoice.studentId,
      studentName: invoice.studentName,
      className: invoice.className,
      remaining,
      invoices: 1,
    })
  }
  return [...map.values()].sort((a, b) => b.remaining - a.remaining)
}

export function AdminTuitionPage() {
  const [tab, setTab] = useState<TabValue>("invoices")

  const [invoices, setInvoices] = useState<AdminInvoice[]>(ADMIN_INVOICES)
  const [cashCloses, setCashCloses] = useState<CashClose[]>(CASH_CLOSES)
  const [requests, setRequests] = useState<DiscountRequest[]>(DISCOUNT_REQUESTS)

  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all")
  const [kindFilter, setKindFilter] = useState<AdminInvoice["kind"] | "all">("all")
  const [page, setPage] = useState(1)

  const [payForm, setPayForm] = useState<PayForm | null>(null)
  const [payErrors, setPayErrors] = useState<PayErrors>({})
  const [pendingCash, setPendingCash] = useState<CashClose | null>(null)
  const [pendingReject, setPendingReject] = useState<DiscountRequest | null>(null)

  const stats = useMemo(() => {
    const totalDue = invoices.reduce((sum, invoice) => sum + invoice.total, 0)
    const paid = invoices.reduce((sum, invoice) => sum + invoice.paid, 0)
    const remaining = invoices.reduce((sum, invoice) => sum + invoiceRemaining(invoice), 0)
    return {
      totalDue,
      paid,
      remaining,
      overdue: invoices.filter((invoice) => invoice.status === "overdue").length,
    }
  }, [invoices])

  const filteredInvoices = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return invoices.filter((invoice) => {
      if (statusFilter !== "all" && invoice.status !== statusFilter) return false
      if (kindFilter !== "all" && invoice.kind !== kindFilter) return false
      if (!needle) return true
      return (
        invoice.studentName.toLowerCase().includes(needle) ||
        invoice.className.toLowerCase().includes(needle) ||
        invoice.code.toLowerCase().includes(needle)
      )
    })
  }, [invoices, query, statusFilter, kindFilter])

  const pageCount = Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visibleInvoices = filteredInvoices.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const topDebtors = useMemo(() => debtByStudent(invoices), [invoices])

  const selectedInvoice = payForm ? invoices.find((invoice) => invoice.id === payForm.invoiceId) ?? null : null

  const openPay = (invoice: AdminInvoice) => {
    setPayForm({
      invoiceId: invoice.id,
      amount: invoiceRemaining(invoice).toLocaleString("vi-VN"),
      method: "Chuyển khoản",
      note: "",
    })
    setPayErrors({})
  }

  const closePay = () => {
    setPayForm(null)
    setPayErrors({})
  }

  const submitPay = () => {
    if (!selectedInvoice || !payForm) return
    const value = Number(payForm.amount.replace(/\D/g, ""))
    const remaining = invoiceRemaining(selectedInvoice)
    const nextErrors: PayErrors = {}
    if (!payForm.amount.trim()) nextErrors.amount = "Vui lòng nhập số tiền thu."
    else if (Number.isNaN(value) || value <= 0) nextErrors.amount = "Số tiền phải lớn hơn 0."
    else if (value > remaining) nextErrors.amount = `Vượt quá số còn phải thu (${formatVnd(remaining)}).`
    setPayErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Vui lòng kiểm tra lại số tiền")
      return
    }

    setInvoices((prev) =>
      prev.map((invoice) => {
        if (invoice.id !== selectedInvoice.id) return invoice
        const paidAmount = invoice.paid + value
        const status: InvoiceStatus =
          paidAmount >= invoice.total ? "paid" : paidAmount > 0 ? "partial" : invoice.status
        return { ...invoice, paid: paidAmount, status }
      }),
    )
    toast.success("Đã ghi nhận thu học phí", {
      description: `${selectedInvoice.studentName} · ${formatVnd(value)} · ${payForm.method}`,
    })
    closePay()
  }

  const confirmCash = () => {
    if (!pendingCash) return
    setCashCloses((prev) => prev.map((row) => (row.staffId === pendingCash.staffId ? { ...row, status: "balanced" } : row)))
    toast.success("Đã xác nhận đối soát", { description: pendingCash.staffName })
    setPendingCash(null)
  }

  const balanceCash = (row: CashClose) => {
    if (cashDiff(row) !== 0) {
      setPendingCash(row)
      return
    }
    setCashCloses((prev) => prev.map((item) => (item.staffId === row.staffId ? { ...item, status: "balanced" } : item)))
    toast.success("Đã xác nhận đối soát", { description: row.staffName })
  }

  const updateRequest = (id: string, status: DiscountRequest["status"]) => {
    setRequests((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)))
  }

  const exportInvoices = () => {
    void exportAdminTable(
      "Khoan-phai-thu",
      "Khoản phải thu",
      ["Mã khoản", "Học viên", "Lớp", "Loại", "Hạn", "Tổng", "Đã thu", "Còn phải thu", "Trạng thái"],
      filteredInvoices.map((invoice) => [
        invoice.code,
        invoice.studentName,
        invoice.className,
        invoice.kind,
        invoice.dueDate,
        invoice.total,
        invoice.paid,
        invoiceRemaining(invoice),
        INVOICE_STATUS_META[invoice.status].label,
      ]),
    ).then(() => toast.success("Đã xuất Excel khoản phải thu"))
  }

  const exportDebtors = () => {
    void exportAdminTable(
      "Cong-no-hoc-vien",
      "Công nợ",
      ["Học viên", "Lớp", "Số khoản còn nợ", "Tổng còn phải thu"],
      topDebtors.map((item) => [item.studentName, item.className, item.invoices, item.remaining]),
    ).then(() => toast.success("Đã xuất Excel công nợ"))
  }

  const exportRequests = () => {
    void exportAdminTable(
      "Duyet-giam-gia-hoan-phi",
      "Giảm giá & hoàn phí",
      ["Học viên", "Lớp", "Loại", "Lý do", "Số tiền", "Người đề xuất", "Ngày", "Trạng thái"],
      requests.map((item) => [
        item.studentName,
        item.className,
        item.kind,
        item.reason,
        item.amount,
        item.requestedBy,
        item.requestedAt,
        DISCOUNT_STATUS_META[item.status].label,
      ]),
    ).then(() => toast.success("Đã xuất Excel giảm giá & hoàn phí"))
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`Học phí & công nợ · dữ liệu ${ADMIN_TODAY_LABEL}`}
        title="Học phí & công nợ"
        description="Theo dõi khoản phải thu, công nợ tồn đọng, đối soát cuối ngày và duyệt giảm giá / hoàn phí."
        actions={
          <Button variant="outline" onClick={exportInvoices}>
            <Download /> Xuất Excel
          </Button>
        }
      />

      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard
            label="Tổng khoản phải thu"
            value={formatVnd(stats.totalDue)}
            icon={Receipt}
            trend={{ text: `${invoices.length} khoản`, tone: "info" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Đã thu"
            value={formatVnd(stats.paid)}
            icon={Banknote}
            iconClass="bg-green-100 text-success"
            trend={{ text: `${Math.round((stats.paid / Math.max(1, stats.totalDue)) * 100)}% tổng khoản`, tone: "success" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Còn phải thu"
            value={formatVnd(stats.remaining)}
            icon={Wallet}
            iconClass="bg-red-100 text-danger"
            trend={{ text: `Hệ thống ghi nhận ${formatVnd(debtTotal())}`, tone: "danger" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Khoản quá hạn"
            value={String(stats.overdue)}
            icon={AlertTriangle}
            iconClass="bg-orange-100 text-warning"
            trend={{ text: "Cần nhắc phụ huynh", tone: "warning" }}
          />
        </StaggerItem>
      </Stagger>

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

      {tab === "invoices" && (
        <Reveal>
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle>Khoản phải thu</CardTitle>
                <CardDescription>Danh sách học phí, tài liệu, đồng phụ và phí giữ xe của học viên</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportInvoices}>
                <Download /> Xuất Excel
              </Button>
            </CardHeader>
            <TableToolbar
              query={query}
              onQueryChange={(value) => {
                setQuery(value)
                setPage(1)
              }}
              searchPlaceholder="Tìm học viên, mã lớp, mã khoản…"
            >
              <ToolbarSelect
                id="invoice-status"
                label="Lọc trạng thái"
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value as InvoiceStatus | "all")
                  setPage(1)
                }}
                options={[
                  { value: "all", label: "Tất cả trạng thái" },
                  ...(Object.keys(INVOICE_STATUS_META) as InvoiceStatus[]).map((key) => ({
                    value: key,
                    label: INVOICE_STATUS_META[key].label,
                  })),
                ]}
              />
              <ToolbarSelect
                id="invoice-kind"
                label="Lọc loại khoản"
                value={kindFilter}
                onChange={(value) => {
                  setKindFilter(value as AdminInvoice["kind"] | "all")
                  setPage(1)
                }}
                options={[
                  { value: "all", label: "Tất cả loại khoản" },
                  ...INVOICE_KINDS.map((kind) => ({ value: kind, label: kind })),
                ]}
              />
            </TableToolbar>
            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-2.5">Mã khoản</th>
                      <th scope="col" className="px-3 py-2.5">Học viên</th>
                      <th scope="col" className="px-3 py-2.5">Lớp</th>
                      <th scope="col" className="px-3 py-2.5">Loại</th>
                      <th scope="col" className="px-3 py-2.5">Hạn</th>
                      <th scope="col" className="px-3 py-2.5 text-right">Tổng</th>
                      <th scope="col" className="px-3 py-2.5 text-right">Đã thu</th>
                      <th scope="col" className="px-3 py-2.5 text-right">Còn phải thu</th>
                      <th scope="col" className="px-3 py-2.5">Trạng thái</th>
                      <th scope="col" className="px-4 py-2.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleInvoices.map((invoice) => (
                      <tr key={invoice.id} className="transition-colors hover:bg-surface">
                        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-ink-soft">{invoice.code}</td>
                        <td className="px-3 py-3 font-semibold whitespace-nowrap text-ink">{invoice.studentName}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{invoice.className}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{invoice.kind}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-ink-soft tabular-nums">{invoice.dueDate}</td>
                        <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-ink">{formatVnd(invoice.total)}</td>
                        <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-success">{formatVnd(invoice.paid)}</td>
                        <td className="px-3 py-3 text-right font-semibold whitespace-nowrap tabular-nums text-danger">
                          {formatVnd(invoiceRemaining(invoice))}
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant={INVOICE_STATUS_META[invoice.status].badge}>
                            {INVOICE_STATUS_META[invoice.status].label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={invoiceRemaining(invoice) <= 0}
                            onClick={() => openPay(invoice)}
                          >
                            <Banknote /> Ghi nhận thu
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {visibleInvoices.length === 0 && <TableEmpty colSpan={10} />}
                  </tbody>
                </table>
              </div>
              <TablePagination page={currentPage} pageCount={pageCount} total={filteredInvoices.length} onPageChange={setPage} />
            </CardContent>
          </Card>
        </Reveal>
      )}

      {tab === "debt" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
          <Reveal>
            <ChartFrame
              title="Cơ cấu công nợ theo độ tuổi"
              description={`Phân bổ ${formatVnd(DEBT_AGING.reduce((sum, item) => sum + item.value, 0))} theo số ngày quá hạn`}
              height={300}
            >
              <div className="flex h-full flex-col justify-center gap-4">
                {DEBT_AGING.map((item) => {
                  const total = DEBT_AGING.reduce((sum, entry) => sum + entry.value, 0)
                  const percent = Math.round((item.value / total) * 100)
                  return (
                    <div key={item.bucket} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-ink-soft">{item.bucket}</span>
                        <span className="font-semibold tabular-nums text-ink">
                          {formatVnd(item.value)} · {percent}%
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-surface">
                        <div className="h-full rounded-full bg-danger/80" style={{ width: `${percent}%` }} role="presentation" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </ChartFrame>
          </Reveal>

          <Reveal delay={0.05}>
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle>Học viên nợ nhiều nhất</CardTitle>
                  <CardDescription>Tổng hợp từ {topDebtors.length} học viên còn khoản chưa thu</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={exportDebtors}>
                  <Download /> Xuất Excel
                </Button>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                      <tr>
                        <th scope="col" className="px-4 py-2.5">Học viên</th>
                        <th scope="col" className="px-3 py-2.5">Lớp</th>
                        <th scope="col" className="px-3 py-2.5 text-right">Số khoản</th>
                        <th scope="col" className="px-4 py-2.5 text-right">Còn phải thu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {topDebtors.slice(0, 10).map((item) => (
                        <tr key={item.studentId} className="transition-colors hover:bg-surface">
                          <td className="px-4 py-3 font-semibold whitespace-nowrap text-ink">{item.studentName}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{item.className}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-ink-soft">{item.invoices}</td>
                          <td className="px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums text-danger">
                            {formatVnd(item.remaining)}
                          </td>
                        </tr>
                      ))}
                      {topDebtors.length === 0 && <TableEmpty colSpan={4} message="Không còn học viên nào còn nợ." />}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      )}

      {tab === "cash" && (
        <Reveal>
          <Card>
            <CardHeader>
              <CardTitle>Đối soát cuối ngày {ADMIN_TODAY_LABEL}</CardTitle>
              <CardDescription>Đối chiếu tiền mặt và chuyển khoản theo ca của từng nhân viên thu</CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-2.5">Nhân viên</th>
                      <th scope="col" className="px-3 py-2.5">Ca</th>
                      <th scope="col" className="px-3 py-2.5 text-right">Tổng thu</th>
                      <th scope="col" className="px-3 py-2.5 text-right">Tiền mặt</th>
                      <th scope="col" className="px-3 py-2.5 text-right">Chuyển khoản</th>
                      <th scope="col" className="px-3 py-2.5 text-right">Chênh lệch</th>
                      <th scope="col" className="px-3 py-2.5">Ghi chú</th>
                      <th scope="col" className="px-3 py-2.5">Trạng thái</th>
                      <th scope="col" className="px-4 py-2.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cashCloses.map((row) => {
                      const diff = cashDiff(row)
                      return (
                        <tr key={row.staffId} className="transition-colors hover:bg-surface">
                          <td className="px-4 py-3 font-semibold whitespace-nowrap text-ink">{row.staffName}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{row.shift}</td>
                          <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-ink">{formatVnd(row.totalCollected)}</td>
                          <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-ink">{formatVnd(row.cashOnHand)}</td>
                          <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-ink">{formatVnd(row.bankTransfer)}</td>
                          <td
                            className={cn(
                              "px-3 py-3 text-right font-semibold whitespace-nowrap tabular-nums",
                              diff === 0 ? "text-success" : "text-danger",
                            )}
                          >
                            {diff === 0 ? "0 ₫" : formatVnd(diff)}
                          </td>
                          <td className="max-w-56 px-3 py-3 text-xs text-ink-soft">{row.note || "—"}</td>
                          <td className="px-3 py-3">
                            <Badge variant={CASH_STATUS_META[row.status].badge}>{CASH_STATUS_META[row.status].label}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={row.status === "balanced"}
                              onClick={() => balanceCash(row)}
                            >
                              <CheckCircle2 /> Xác nhận đối soát
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                    {cashCloses.length === 0 && <TableEmpty colSpan={9} />}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      )}

      {tab === "discount" && (
        <Reveal>
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle>Duyệt giảm giá / hoàn phí</CardTitle>
                <CardDescription>
                  {requests.filter((item) => item.status === "pending").length} yêu cầu đang chờ quản trị xử lý
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportRequests}>
                <Download /> Xuất Excel
              </Button>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[940px] text-left text-sm">
                  <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-2.5">Học viên</th>
                      <th scope="col" className="px-3 py-2.5">Lớp</th>
                      <th scope="col" className="px-3 py-2.5">Loại</th>
                      <th scope="col" className="px-3 py-2.5">Lý do</th>
                      <th scope="col" className="px-3 py-2.5 text-right">Số tiền</th>
                      <th scope="col" className="px-3 py-2.5">Người đề xuất</th>
                      <th scope="col" className="px-3 py-2.5">Ngày</th>
                      <th scope="col" className="px-3 py-2.5">Trạng thái</th>
                      <th scope="col" className="px-4 py-2.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {requests.map((item) => (
                      <tr key={item.id} className="transition-colors hover:bg-surface">
                        <td className="px-4 py-3 font-semibold whitespace-nowrap text-ink">{item.studentName}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{item.className}</td>
                        <td className="px-3 py-3">
                          <Badge variant={item.kind === "Hoàn phí" ? "warning" : "info"}>{item.kind}</Badge>
                        </td>
                        <td className="max-w-72 px-3 py-3 text-ink-soft">{item.reason}</td>
                        <td className="px-3 py-3 text-right font-semibold whitespace-nowrap tabular-nums text-ink">
                          {formatVnd(item.amount)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{item.requestedBy}</td>
                        <td className="px-3 py-3 whitespace-nowrap tabular-nums text-ink-soft">{item.requestedAt}</td>
                        <td className="px-3 py-3">
                          <Badge variant={DISCOUNT_STATUS_META[item.status].badge}>
                            {DISCOUNT_STATUS_META[item.status].label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={item.status !== "pending"}
                              onClick={() => {
                                updateRequest(item.id, "approved")
                                toast.success("Đã duyệt yêu cầu", {
                                  description: `${item.kind} ${formatVnd(item.amount)} · ${item.studentName}`,
                                })
                              }}
                            >
                              <Check /> Duyệt
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-danger hover:bg-red-50"
                              disabled={item.status !== "pending"}
                              onClick={() => setPendingReject(item)}
                            >
                              <XCircle /> Từ chối
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {requests.length === 0 && <TableEmpty colSpan={9} />}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      )}

      <Modal
        open={Boolean(payForm) && Boolean(selectedInvoice)}
        onOpenChange={(open) => !open && closePay()}
        title="Ghi nhận thu học phí"
        description={selectedInvoice ? `${selectedInvoice.studentName} · ${selectedInvoice.className}` : undefined}
        icon={<Banknote className="size-6" />}
        footer={
          <>
            <Button variant="outline" onClick={closePay}>
              Huỷ
            </Button>
            <Button onClick={submitPay}>
              <CheckCircle2 /> Xác nhận thu
            </Button>
          </>
        }
      >
        {selectedInvoice && payForm && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl bg-surface p-3.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-ink-soft">Mã khoản</span>
                <span className="font-mono text-xs text-ink">{selectedInvoice.code}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3 text-sm">
                <span className="text-ink-soft">Tổng khoản</span>
                <span className="font-semibold tabular-nums text-ink">{formatVnd(selectedInvoice.total)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3 text-sm">
                <span className="text-ink-soft">Đã thu</span>
                <span className="font-semibold tabular-nums text-success">{formatVnd(selectedInvoice.paid)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-100 pt-2 text-sm">
                <span className="font-semibold text-ink">Còn phải thu</span>
                <span className="font-heading text-base font-extrabold tabular-nums text-danger">
                  {formatVnd(invoiceRemaining(selectedInvoice))}
                </span>
              </div>
            </div>

            <FormField id="admin-pay-amount" label="Số tiền thu" required error={payErrors.amount}>
              <Input
                id="admin-pay-amount"
                inputMode="numeric"
                value={payForm.amount}
                onChange={(e) => {
                  setPayForm({ ...payForm, amount: e.target.value })
                  setPayErrors((prev) => ({ ...prev, amount: undefined }))
                }}
                placeholder="Ví dụ: 2.100.000"
                className="font-heading font-bold tabular-nums"
                aria-invalid={Boolean(payErrors.amount) || undefined}
                aria-describedby={payErrors.amount ? "admin-pay-amount-error" : undefined}
              />
            </FormField>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPayForm({ ...payForm, amount: invoiceRemaining(selectedInvoice).toLocaleString("vi-VN") })}
              >
                Thu toàn bộ
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPayForm({ ...payForm, amount: "" })}
              >
                Xoá số tiền
              </Button>
            </div>

            <FormField id="admin-pay-method" label="Hình thức thanh toán" required error={payErrors.method}>
              <select
                id="admin-pay-method"
                value={payForm.method}
                onChange={(e) => setPayForm({ ...payForm, method: e.target.value as PaymentMethod })}
                className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}
              >
                {(Object.keys(PAYMENT_METHOD_META) as PaymentMethod[]).map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField id="admin-pay-note" label="Ghi chú">
              <Textarea
                id="admin-pay-note"
                rows={2}
                value={payForm.note}
                onChange={(e) => setPayForm({ ...payForm, note: e.target.value })}
                placeholder="Ví dụ: Thu đợt 2 tại quầy tiếp nhận"
              />
            </FormField>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingCash)}
        onOpenChange={(open) => !open && setPendingCash(null)}
        title="Xác nhận đối soát có chênh lệch?"
        description={pendingCash ? `${pendingCash.staffName} · ${pendingCash.shift} · ${pendingCash.date}` : undefined}
        detail={
          pendingCash
            ? `Chênh lệch ${formatVnd(cashDiff(pendingCash))} giữa tổng thu và tiền mặt + chuyển khoản. ${pendingCash.note || "Chưa có ghi chú."}`
            : undefined
        }
        confirmLabel="Vẫn xác nhận"
        onConfirm={confirmCash}
      />

      <ConfirmDialog
        open={Boolean(pendingReject)}
        onOpenChange={(open) => !open && setPendingReject(null)}
        title="Từ chối yêu cầu?"
        description={pendingReject ? `${pendingReject.kind} · ${formatVnd(pendingReject.amount)}` : undefined}
        detail={pendingReject ? `Học viên: ${pendingReject.studentName} · Lý do: ${pendingReject.reason}` : undefined}
        confirmLabel="Từ chối"
        onConfirm={() => {
          if (!pendingReject) return
          updateRequest(pendingReject.id, "rejected")
          toast.success("Đã từ chối yêu cầu", { description: pendingReject.studentName })
          setPendingReject(null)
        }}
      />
    </div>
  )
}
