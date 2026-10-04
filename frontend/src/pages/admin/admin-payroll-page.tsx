import { useMemo, useState } from "react"
import { Banknote, CalendarRange, CheckCircle2, Download, Lock, Pencil, Send, Users } from "lucide-react"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { TableEmpty, TablePagination, TableToolbar, ToolbarSelect } from "@/components/admin/table-toolbar"
import { StatCard } from "@/components/common/stat-card"
import { PageHeader } from "@/components/layout/page-header"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { toast } from "@/components/ui/toast"
import {
  ADMIN_PAYROLL,
  ADMIN_PAYROLL_STATUS_META,
  ADMIN_TODAY_LABEL,
  adminPayrollTotal,
  type AdminPayrollRow,
} from "@/data/admin"
import { exportAdminTable } from "@/lib/admin-excel"
import { formatVnd } from "@/lib/format"

const PAGE_SIZE = 10
const ROLE_META: Record<AdminPayrollRow["role"], { label: string; badge: "info" | "warning" }> = {
  teacher: { label: "Giáo viên", badge: "info" },
  staff: { label: "Nhân viên", badge: "warning" },
}

type EditForm = { id: string; base: string; bonus: string; deduction: string; note: string }
type EditErrors = { base?: string; bonus?: string; deduction?: string; note?: string }

function parseMoney(value: string) {
  return Number(value.replace(/\D/g, ""))
}

export function AdminPayrollPage() {
  const months = useMemo(() => [...new Set(ADMIN_PAYROLL.map((row) => row.month))], [])
  const [month, setMonth] = useState(months[0] ?? "10/2026")
  const [roleFilter, setRoleFilter] = useState<AdminPayrollRow["role"] | "all">("all")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)

  const [rows, setRows] = useState<AdminPayrollRow[]>(ADMIN_PAYROLL)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [editErrors, setEditErrors] = useState<EditErrors>({})
  const [confirmClose, setConfirmClose] = useState(false)
  const [confirmSend, setConfirmSend] = useState(false)

  const monthRows = useMemo(() => rows.filter((row) => row.month === month), [rows, month])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return monthRows.filter((row) => {
      if (roleFilter !== "all" && row.role !== roleFilter) return false
      if (!needle) return true
      return row.staffName.toLowerCase().includes(needle) || row.staffId.toLowerCase().includes(needle)
    })
  }, [monthRows, roleFilter, query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const stats = useMemo(() => {
    const fund = monthRows.reduce((sum, row) => sum + adminPayrollTotal(row), 0)
    const approved = monthRows.filter((row) => row.status === "approved").length
    const pending = monthRows.filter((row) => row.status !== "approved").length
    const bonus = monthRows.reduce((sum, row) => sum + row.bonus, 0)
    const deduction = monthRows.reduce((sum, row) => sum + row.deduction, 0)
    return { fund, approved, pending, bonus, deduction, headcount: monthRows.length }
  }, [monthRows])

  const allApproved = monthRows.length > 0 && monthRows.every((row) => row.status === "approved")
  const hasDraft = monthRows.some((row) => row.status === "draft")

  const editingRow = editForm ? rows.find((row) => row.id === editForm.id) ?? null : null

  const openEdit = (row: AdminPayrollRow) => {
    setEditForm({
      id: row.id,
      base: String(row.base),
      bonus: String(row.bonus),
      deduction: String(row.deduction),
      note: row.note,
    })
    setEditErrors({})
  }

  const submitEdit = () => {
    if (!editForm) return
    const base = parseMoney(editForm.base)
    const bonus = parseMoney(editForm.bonus)
    const deduction = parseMoney(editForm.deduction)
    const nextErrors: EditErrors = {}
    if (!editForm.base.trim() || Number.isNaN(base) || base < 0) nextErrors.base = "Lương cứng phải là số không âm."
    if (Number.isNaN(bonus) || bonus < 0) nextErrors.bonus = "Thưởng phải là số không âm."
    if (Number.isNaN(deduction) || deduction < 0) nextErrors.deduction = "Khoản trừ phải là số không âm."
    if (editForm.note.length > 200) nextErrors.note = "Ghi chú không được quá 200 ký tự."
    setEditErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Vui lòng kiểm tra lại thông tin lương", { description: "Các khoản không được âm." })
      return
    }
    setRows((prev) =>
      prev.map((row) =>
        row.id === editForm.id
          ? { ...row, base, bonus, deduction, note: editForm.note.trim() }
          : row,
      ),
    )
    toast.success("Đã cập nhật bảng lương", { description: `Kỳ ${month} · ${editingRow?.staffName ?? ""}` })
    setEditForm(null)
  }

  const closePayroll = () => {
    setRows((prev) =>
      prev.map((row) => (row.month === month ? { ...row, status: "approved", locked: true } : row)),
    )
    toast.success(`Đã chốt lương kỳ ${month}`, {
      description: "Nhân viên có thể xem bảng lương đã chốt.",
    })
    setConfirmClose(false)
  }

  const sendForApproval = () => {
    setRows((prev) =>
      prev.map((row) => (row.month === month && row.status === "draft" ? { ...row, status: "pending" } : row)),
    )
    toast.success(`Đã gửi duyệt kỳ ${month}`, { description: "Chờ phòng Kế toán duyệt." })
    setConfirmSend(false)
  }

  const exportPayroll = () => {
    void exportAdminTable(
      `Bang-luong-${month.replace("/", "-")}`,
      "Bảng lương",
      ["Kỳ", "Mã nhân sự", "Họ tên", "Vai trò", "Lương cứng", "Thưởng", "Trừ", "Tổng", "Trạng thái", "Ghi chú"],
      filtered.map((row) => [
        row.month,
        row.staffId,
        row.staffName,
        ROLE_META[row.role].label,
        row.base,
        row.bonus,
        row.deduction,
        adminPayrollTotal(row),
        ADMIN_PAYROLL_STATUS_META[row.status].label,
        row.note,
      ]),
    ).then(() => toast.success(`Đã xuất Excel bảng lương kỳ ${month}`))
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`Bảng lương quản trị · dữ liệu ${ADMIN_TODAY_LABEL}`}
        title="Bảng lương"
        description="Tính lương cứng, thưởng và khoản trừ cho giáo viên, nhân viên; gửi duyệt và chốt kỳ lương."
        actions={
          <>
            <Button variant="outline" onClick={exportPayroll}>
              <Download /> Xuất Excel
            </Button>
            <Button
              variant="outline"
              disabled={!hasDraft}
              onClick={() => setConfirmSend(true)}
            >
              <Send /> Gửi duyệt
            </Button>
            <Button
              disabled={allApproved}
              onClick={() => setConfirmClose(true)}
            >
              <CheckCircle2 /> Chốt lương
            </Button>
          </>
        }
      />

      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard
            label={`Tổng quỹ lương kỳ ${month}`}
            value={formatVnd(stats.fund)}
            icon={Banknote}
            trend={{ text: `${stats.headcount} nhân sự`, tone: "info" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Đã chốt"
            value={String(stats.approved)}
            icon={CheckCircle2}
            iconClass="bg-green-100 text-success"
            trend={{ text: "Nhân viên có thể xem", tone: "success" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Đang chờ duyệt"
            value={String(stats.pending)}
            icon={CalendarRange}
            iconClass="bg-orange-100 text-warning"
            trend={{ text: "Chưa chốt bảng lương", tone: "warning" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Tổng thưởng / trừ"
            value={formatVnd(stats.bonus - stats.deduction)}
            icon={Users}
            iconClass="bg-sky-100 text-sky-700"
            trend={{ text: `Thưởng ${formatVnd(stats.bonus)} · Trừ ${formatVnd(stats.deduction)}`, tone: "info" }}
          />
        </StaggerItem>
      </Stagger>

      {allApproved && (
        <Reveal>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-success">
            <Lock className="size-4" />
            Bảng lương kỳ {month} đã chốt và khoá chỉnh sửa — {ADMIN_PAYROLL_STATUS_META.approved.description}
          </div>
        </Reveal>
      )}

      <Reveal delay={0.05}>
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle>Danh sách nhân sự kỳ {month}</CardTitle>
              <CardDescription>Chỉ chỉnh sửa được dòng đang tính; sau khi chốt lương sẽ khoá toàn bộ kỳ.</CardDescription>
            </div>
            <Badge variant={allApproved ? "success" : "warning"}>
              {allApproved ? ADMIN_PAYROLL_STATUS_META.approved.label : ADMIN_PAYROLL_STATUS_META.pending.label}
            </Badge>
          </CardHeader>
          <TableToolbar
            query={query}
            onQueryChange={(value) => {
              setQuery(value)
              setPage(1)
            }}
            searchPlaceholder="Tìm tên hoặc mã nhân sự…"
          >
            <ToolbarSelect
              id="payroll-month"
              label="Chọn kỳ lương"
              value={month}
              onChange={(value) => {
                setMonth(value)
                setPage(1)
              }}
              options={months.map((item) => ({ value: item, label: `Kỳ ${item}` }))}
            />
            <ToolbarSelect
              id="payroll-role"
              label="Lọc vai trò"
              value={roleFilter}
              onChange={(value) => {
                setRoleFilter(value as AdminPayrollRow["role"] | "all")
                setPage(1)
              }}
              options={[
                { value: "all", label: "Tất cả vai trò" },
                { value: "teacher", label: ROLE_META.teacher.label },
                { value: "staff", label: ROLE_META.staff.label },
              ]}
            />
          </TableToolbar>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-2.5">Nhân sự</th>
                    <th scope="col" className="px-3 py-2.5">Vai trò</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Lương cứng</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Thưởng</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Trừ</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Tổng</th>
                    <th scope="col" className="px-3 py-2.5">Ghi chú</th>
                    <th scope="col" className="px-3 py-2.5">Trạng thái</th>
                    <th scope="col" className="px-4 py-2.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-surface">
                      <td className="px-4 py-3">
                        <span className="block font-semibold whitespace-nowrap text-ink">{row.staffName}</span>
                        <span className="block font-mono text-xs whitespace-nowrap text-ink-soft">{row.staffId}</span>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={ROLE_META[row.role].badge}>{ROLE_META[row.role].label}</Badge>
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-ink">{formatVnd(row.base)}</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-success">{formatVnd(row.bonus)}</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-danger">
                        {row.deduction > 0 ? `−${formatVnd(row.deduction)}` : formatVnd(0)}
                      </td>
                      <td className="px-3 py-3 text-right font-heading font-extrabold whitespace-nowrap tabular-nums text-ink">
                        {formatVnd(adminPayrollTotal(row))}
                      </td>
                      <td className="max-w-64 px-3 py-3 text-xs text-ink-soft">{row.note || "—"}</td>
                      <td className="px-3 py-3">
                        <Badge variant={ADMIN_PAYROLL_STATUS_META[row.status].badge}>
                          {ADMIN_PAYROLL_STATUS_META[row.status].label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={row.status !== "draft" || row.locked}
                          onClick={() => openEdit(row)}
                        >
                          <Pencil /> Sửa
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {visible.length === 0 && <TableEmpty colSpan={9} />}
                </tbody>
                <tfoot className="border-t border-slate-100 bg-surface">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-right text-sm font-semibold text-ink-soft">
                      Tổng kỳ {month}
                    </td>
                    <td className="px-3 py-3 text-right font-heading font-extrabold whitespace-nowrap tabular-nums text-ink">
                      {formatVnd(filtered.reduce((sum, row) => sum + adminPayrollTotal(row), 0))}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
            <TablePagination page={currentPage} pageCount={pageCount} total={filtered.length} onPageChange={setPage} />
          </CardContent>
        </Card>
      </Reveal>

      <Modal
        open={Boolean(editForm)}
        onOpenChange={(open) => !open && setEditForm(null)}
        title="Cập nhật bảng lương"
        description={editingRow ? `${editingRow.staffName} · kỳ ${editingRow.month}` : undefined}
        icon={<Pencil className="size-6" />}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditForm(null)}>
              Huỷ
            </Button>
            <Button onClick={submitEdit}>
              <CheckCircle2 /> Lưu thay đổi
            </Button>
          </>
        }
      >
        {editForm && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField id="payroll-base" label="Lương cứng" required error={editErrors.base}>
                <Input
                  id="payroll-base"
                  inputMode="numeric"
                  value={editForm.base}
                  onChange={(e) => {
                    setEditForm({ ...editForm, base: e.target.value })
                    setEditErrors((prev) => ({ ...prev, base: undefined }))
                  }}
                  className="tabular-nums"
                  aria-invalid={Boolean(editErrors.base) || undefined}
                  aria-describedby={editErrors.base ? "payroll-base-error" : undefined}
                />
              </FormField>
              <FormField id="payroll-bonus" label="Thưởng" required error={editErrors.bonus}>
                <Input
                  id="payroll-bonus"
                  inputMode="numeric"
                  value={editForm.bonus}
                  onChange={(e) => {
                    setEditForm({ ...editForm, bonus: e.target.value })
                    setEditErrors((prev) => ({ ...prev, bonus: undefined }))
                  }}
                  className="tabular-nums"
                  aria-invalid={Boolean(editErrors.bonus) || undefined}
                  aria-describedby={editErrors.bonus ? "payroll-bonus-error" : undefined}
                />
              </FormField>
              <FormField id="payroll-deduction" label="Khoản trừ" required error={editErrors.deduction}>
                <Input
                  id="payroll-deduction"
                  inputMode="numeric"
                  value={editForm.deduction}
                  onChange={(e) => {
                    setEditForm({ ...editForm, deduction: e.target.value })
                    setEditErrors((prev) => ({ ...prev, deduction: undefined }))
                  }}
                  className="tabular-nums"
                  aria-invalid={Boolean(editErrors.deduction) || undefined}
                  aria-describedby={editErrors.deduction ? "payroll-deduction-error" : undefined}
                />
              </FormField>
            </div>

            <FormField id="payroll-note" label="Ghi chú" error={editErrors.note}>
              <Input
                id="payroll-note"
                value={editForm.note}
                onChange={(e) => {
                  setEditForm({ ...editForm, note: e.target.value })
                  setEditErrors((prev) => ({ ...prev, note: undefined }))
                }}
                placeholder="Ví dụ: Thưởng khóa Cambridge tháng 9"
                aria-invalid={Boolean(editErrors.note) || undefined}
                aria-describedby={editErrors.note ? "payroll-note-error" : undefined}
              />
            </FormField>

            <div className="rounded-2xl bg-surface p-3.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-ink-soft">Tổng thực nhận sau khi sửa</span>
                <span className="font-heading font-extrabold tabular-nums text-ink">
                  {formatVnd(
                    Math.max(0, parseMoney(editForm.base) + parseMoney(editForm.bonus) - parseMoney(editForm.deduction)),
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title={`Chốt lương kỳ ${month}?`}
        description={`${stats.headcount} nhân sự · tổng quỹ ${formatVnd(stats.fund)}`}
        detail="Sau khi chốt, toàn bộ dòng của kỳ này chuyển sang trạng thái “Đã chốt”, bị khoá chỉnh sửa và nhân viên có thể xem bảng lương."
        confirmLabel="Chốt lương"
        tone="primary"
        onConfirm={closePayroll}
      />

      <ConfirmDialog
        open={confirmSend}
        onOpenChange={setConfirmSend}
        title={`Gửi duyệt kỳ ${month}?`}
        description="Chuyển các dòng đang tính sang trạng thái chờ duyệt"
        detail="Các dòng đang tính sẽ chuyển sang “Chờ duyệt” và chờ phòng Kế toán duyệt trước khi chốt."
        confirmLabel="Gửi duyệt"
        tone="primary"
        onConfirm={sendForApproval}
      />
    </div>
  )
}
