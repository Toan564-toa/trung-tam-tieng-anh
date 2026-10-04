import { useMemo, useState, type FormEvent } from "react"
import {
  Copy,
  Download,
  KeyRound,
  Lock,
  Pencil,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Unlock,
  UserCheck,
  UserCog,
  UserX,
  Users,
} from "lucide-react"
import { cn } from "cn"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { TableEmpty, TablePagination, TableToolbar, ToolbarSelect } from "@/components/admin/table-toolbar"
import { StatCard } from "@/components/common/stat-card"
import { PageHeader } from "@/components/layout/page-header"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { fieldBase, Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { toast } from "@/components/ui/toast"
import {
  ACCOUNT_ROLE_META,
  ACCOUNT_STATUS_META,
  ADMIN_ACCOUNTS,
  ADMIN_TODAY_LABEL,
  type AccountRole,
  type AccountStatus,
  type AdminAccount,
} from "@/data/admin"
import { exportAdminTable } from "@/lib/admin-excel"

const PAGE_SIZE = 10
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/

const ROLES = Object.keys(ACCOUNT_ROLE_META) as AccountRole[]
const STATUSES = Object.keys(ACCOUNT_STATUS_META) as AccountStatus[]

type EditValues = {
  fullName: string
  email: string
  phone: string
  role: AccountRole
}

type EditErrors = Partial<Record<keyof EditValues, string>>

type ConfirmState = {
  kind: "lock" | "unlock" | "delete"
  account: AdminAccount
} | null

function tempPassword(username: string) {
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let tail = ""
  for (let i = 0; i < 6; i += 1) {
    tail += alphabet.charAt(Math.floor(Math.random() * alphabet.length))
  }
  return `${username.replace(/[^a-zA-Z0-9]/g, "").slice(-3) || "ttnn"}${tail}`
}

function copyText(value: string, label: string) {
  void navigator.clipboard
    .writeText(value)
    .then(() => toast.success(`Đã sao chép ${label}`))
    .catch(() => toast.error("Không sao chép được", { description: "Hãy bôi đen và copy thủ công." }))
}

export function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<AdminAccount[]>(ADMIN_ACCOUNTS)
  const [query, setQuery] = useState("")
  const [role, setRole] = useState<AccountRole | "all">("all")
  const [status, setStatus] = useState<AccountStatus | "all">("all")
  const [onlyDeleted, setOnlyDeleted] = useState(false)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<AdminAccount | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [resetting, setResetting] = useState<AdminAccount | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState>(null)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return accounts.filter((account) => {
      if (onlyDeleted ? !account.deletedAt : account.deletedAt) return false
      if (role !== "all" && account.role !== role) return false
      if (status !== "all" && account.status !== status) return false
      if (!needle) return true
      return [account.username, account.fullName, account.email, account.phone].some((field) =>
        field.toLowerCase().includes(needle),
      )
    })
  }, [accounts, query, role, status, onlyDeleted])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const live = accounts.filter((account) => !account.deletedAt)
  const stats = {
    total: accounts.length,
    active: live.filter((account) => account.status === "active").length,
    locked: live.filter((account) => account.status === "locked").length,
    pending: live.filter((account) => account.status === "pending").length,
  }

  const patch = (id: string, changes: Partial<AdminAccount>) =>
    setAccounts((prev) => prev.map((account) => (account.id === id ? { ...account, ...changes } : account)))

  const runConfirm = () => {
    if (!confirm) return
    const { kind, account } = confirm
    setConfirm(null)
    if (kind === "lock") {
      patch(account.id, { status: "locked" })
      toast.success("Đã khoá tài khoản", { description: `${account.fullName} (${account.username}) không thể đăng nhập.` })
      return
    }
    if (kind === "unlock") {
      patch(account.id, { status: "active" })
      toast.success("Đã mở khoá tài khoản", { description: `${account.fullName} (${account.username}) đăng nhập lại được.` })
      return
    }
    patch(account.id, { deletedAt: ADMIN_TODAY_LABEL })
    toast.success("Đã xoá tài khoản", { description: `${account.fullName} chuyển sang mục đã xoá, có thể khôi phục.` })
  }

  const restore = (account: AdminAccount) => {
    patch(account.id, { deletedAt: undefined })
    toast.success("Đã khôi phục tài khoản", { description: `${account.fullName} trở lại danh sách đang hoạt động.` })
  }

  const onExport = () => {
    void exportAdminTable(
      "Danh-sach-tai-khoan",
      "Tai khoan",
      ["Tên đăng nhập", "Họ và tên", "Vai trò", "Email", "Số điện thoại", "Đăng nhập cuối", "Ngày tạo", "Trạng thái"],
      filtered.map((account) => [
        account.username,
        account.fullName,
        ACCOUNT_ROLE_META[account.role].label,
        account.email,
        account.phone,
        account.lastLogin || "Chưa đăng nhập",
        account.createdAt,
        account.deletedAt ? "Đã xoá" : ACCOUNT_STATUS_META[account.status].label,
      ]),
    )
      .then(() => toast.success("Đã xuất danh sách tài khoản", { description: `${filtered.length} dòng ra file Excel.` }))
      .catch(() => toast.error("Không xuất được file Excel"))
  }

  const confirmMeta = (() => {
    if (!confirm) return null
    if (confirm.kind === "lock")
      return {
        title: "Khoá tài khoản",
        description: `Tài khoản ${confirm.account.username} sẽ không thể đăng nhập cho tới khi mở khoá.`,
        detail: "Toàn bộ phiên đang đăng nhập sẽ bị kết thúc. Thao tác này được ghi vào nhật ký hệ thống.",
        confirmLabel: "Khoá tài khoản",
      }
    if (confirm.kind === "unlock")
      return {
        title: "Mở khoá tài khoản",
        description: `Cho phép ${confirm.account.fullName} đăng nhập trở lại.`,
        detail: "Người dùng vẫn giữ nguyên mật khẩu hiện tại. Thao tác này được ghi vào nhật ký hệ thống.",
        confirmLabel: "Mở khoá",
      }
    return {
      title: "Xoá tài khoản",
      description: `Xoá mềm tài khoản ${confirm.account.username} (${confirm.account.fullName}).`,
      detail: "Tài khoản sẽ bị ẩn khỏi danh sách và mất quyền truy cập, nhưng vẫn có thể khôi phục trong phiên làm việc này.",
      confirmLabel: "Xoá tài khoản",
    }
  })()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`${stats.total} tài khoản trong hệ thống · dữ liệu ${ADMIN_TODAY_LABEL}`}
        title="Tài khoản & phân quyền"
        description="Khoá, đặt lại mật khẩu, đổi vai trò và xoá mềm tài khoản của học viên, giáo viên, nhân viên và quản trị."
        actions={
          <Button variant="outline" onClick={onExport}>
            <Download /> Xuất Excel
          </Button>
        }
      />

      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard label="Tổng tài khoản" value={stats.total.toLocaleString("vi-VN")} icon={Users} />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Đang hoạt động"
            value={stats.active.toLocaleString("vi-VN")}
            icon={UserCheck}
            iconClass="bg-green-100 text-success"
            trend={{ text: `${Math.round((stats.active / Math.max(1, stats.total)) * 100)}% tổng số`, tone: "success" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Đã khoá"
            value={stats.locked.toLocaleString("vi-VN")}
            icon={Lock}
            iconClass="bg-red-100 text-danger"
            trend={{ text: "Cần quản trị mở khoá", tone: "danger" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Chờ kích hoạt"
            value={stats.pending.toLocaleString("vi-VN")}
            icon={KeyRound}
            iconClass="bg-orange-100 text-warning"
            trend={{ text: "Chưa đăng nhập lần đầu", tone: "warning" }}
          />
        </StaggerItem>
      </Stagger>

      <Reveal>
        <Card>
          <TableToolbar
            query={query}
            onQueryChange={(value) => {
              setQuery(value)
              setPage(1)
            }}
            searchPlaceholder="Tìm tên, tên đăng nhập, email, SĐT..."
          >
            <ToolbarSelect
              id="acc-role"
              label="Lọc theo vai trò"
              value={role}
              onChange={(value) => {
                setRole(value as AccountRole | "all")
                setPage(1)
              }}
              options={[{ value: "all", label: "Tất cả vai trò" }, ...ROLES.map((key) => ({ value: key, label: ACCOUNT_ROLE_META[key].label }))]}
            />
            <ToolbarSelect
              id="acc-status"
              label="Lọc theo trạng thái"
              value={status}
              onChange={(value) => {
                setStatus(value as AccountStatus | "all")
                setPage(1)
              }}
              options={[
                { value: "all", label: "Tất cả trạng thái" },
                ...STATUSES.map((key) => ({ value: key, label: ACCOUNT_STATUS_META[key].label })),
              ]}
            />
            <button
              type="button"
              onClick={() => {
                setOnlyDeleted((prev) => !prev)
                setPage(1)
              }}
              aria-pressed={onlyDeleted}
              className={cn(
                "inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition-colors",
                onlyDeleted
                  ? "border-danger/30 bg-red-50 text-danger"
                  : "border-input bg-white text-ink-soft hover:bg-surface",
              )}
            >
              <Trash2 />
              Chỉ hiện đã xoá
            </button>
          </TableToolbar>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Tài khoản</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Vai trò</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Email</th>
                  <th scope="col" className="px-4 py-3 font-semibold">SĐT</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Đăng nhập cuối</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Ngày tạo</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((account) => (
                  <tr key={account.id} className="transition-colors hover:bg-surface">
                    <td className="px-4 py-3">
                      <span className="block font-semibold text-ink">{account.fullName}</span>
                      <span className="block font-mono text-xs text-ink-soft">{account.username}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={ACCOUNT_ROLE_META[account.role].badge}>{ACCOUNT_ROLE_META[account.role].label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{account.email}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-soft tabular-nums">{account.phone}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-soft tabular-nums">
                      {account.lastLogin || <span className="text-slate-400">Chưa đăng nhập</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-soft tabular-nums">{account.createdAt}</td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={ACCOUNT_STATUS_META[account.status].badge}>{ACCOUNT_STATUS_META[account.status].label}</Badge>
                        {account.deletedAt && <Badge variant="danger">Đã xoá</Badge>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {account.deletedAt ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => restore(account)}
                            aria-label={`Khôi phục tài khoản ${account.fullName}`}
                          >
                            <RotateCcw /> Khôi phục
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={account.status === "locked" ? `Mở khoá tài khoản ${account.fullName}` : `Khoá tài khoản ${account.fullName}`}
                              title={account.status === "locked" ? "Mở khoá" : "Khoá"}
                              onClick={() => setConfirm({ kind: account.status === "locked" ? "unlock" : "lock", account })}
                            >
                              {account.status === "locked" ? <Unlock /> : <Lock />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Đặt lại mật khẩu cho ${account.fullName}`}
                              title="Đặt lại mật khẩu"
                              onClick={() => {
                                setResetting(account)
                                setResetOpen(true)
                              }}
                            >
                              <KeyRound />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Sửa tài khoản ${account.fullName}`}
                              title="Sửa"
                              onClick={() => {
                                setEditing(account)
                                setEditOpen(true)
                              }}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Xoá tài khoản ${account.fullName}`}
                              title="Xoá"
                              onClick={() => setConfirm({ kind: "delete", account })}
                            >
                              <Trash2 />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <TableEmpty colSpan={8} message="Không có tài khoản nào khớp bộ lọc hiện tại." />}
              </tbody>
            </table>
          </div>

          <TablePagination page={currentPage} pageCount={pageCount} total={filtered.length} onPageChange={setPage} />
        </Card>
      </Reveal>

      <EditAccountModal
        key={editing?.id ?? "new"}
        open={editOpen}
        onOpenChange={setEditOpen}
        account={editing}
        onSave={(values) => {
          if (editing) patch(editing.id, values)
          setEditOpen(false)
          toast.success(editing ? "Đã cập nhật tài khoản" : "Đã lưu thông tin", {
            description: `${values.fullName} · ${ACCOUNT_ROLE_META[values.role].label}`,
          })
        }}
      />

      <ResetPasswordModal
        key={resetting?.id ?? "reset"}
        open={resetOpen}
        onOpenChange={setResetOpen}
        account={resetting}
        onDone={() => {
          setResetOpen(false)
          toast.success("Đã đặt lại mật khẩu", {
            description: "Gửi mật khẩu tạm cho người dùng và yêu cầu đổi ở lần đăng nhập kế tiếp.",
          })
        }}
      />

      <ConfirmDialog
        open={Boolean(confirmMeta)}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirmMeta?.title ?? ""}
        description={confirmMeta?.description}
        detail={confirmMeta?.detail}
        confirmLabel={confirmMeta?.confirmLabel}
        tone={confirm?.kind === "unlock" ? "primary" : "danger"}
        onConfirm={runConfirm}
      />
    </div>
  )
}

function EditAccountModal({
  open,
  onOpenChange,
  account,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: AdminAccount | null
  onSave: (values: EditValues) => void
}) {
  const [values, setValues] = useState<EditValues>(() => ({
    fullName: account?.fullName ?? "",
    email: account?.email ?? "",
    phone: account?.phone ?? "",
    role: account?.role ?? "student",
  }))
  const [errors, setErrors] = useState<EditErrors>({})

  const update = (key: keyof EditValues) => (value: string) => {
    setValues((prev) => ({ ...prev, [key]: value as never }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const invalid = (key: keyof EditValues) => ({
    "aria-invalid": Boolean(errors[key]) || undefined,
    "aria-describedby": errors[key] ? `acc-${key}-error` : undefined,
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const found: EditErrors = {}
    if (values.fullName.trim().length < 2) found.fullName = "Vui lòng nhập họ và tên."
    if (!values.email.trim()) found.email = "Vui lòng nhập email."
    else if (!EMAIL_RE.test(values.email.trim())) found.email = "Email không hợp lệ."
    if (!values.phone.trim()) found.phone = "Vui lòng nhập số điện thoại."
    else if (!PHONE_RE.test(values.phone.replace(/[\s.-]/g, ""))) found.phone = "Số điện thoại không hợp lệ (VD: 0909 123 456)."
    setErrors(found)
    if (Object.keys(found).length > 0) {
      toast.error("Vui lòng kiểm tra lại thông tin", { description: "Một số trường chưa hợp lệ." })
      return
    }
    onSave({
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      role: values.role,
    })
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={account ? "Cập nhật tài khoản" : "Thông tin tài khoản"}
      description="Thay đổi thông tin liên hệ và vai trò phân quyền của tài khoản."
      icon={<UserCog className="size-6" />}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ bỏ</Button>
          <Button type="submit" form="account-edit-form">Lưu thay đổi</Button>
        </>
      }
    >
      <form id="account-edit-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {account && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3.5 py-2.5 text-sm">
            <span className="text-ink-soft">Tên đăng nhập</span>
            <span className="font-mono font-semibold text-ink">{account.username}</span>
          </div>
        )}

        <FormField id="acc-fullName" label="Họ và tên" required error={errors.fullName}>
          <Input
            id="acc-fullName"
            value={values.fullName}
            onChange={(e) => update("fullName")(e.target.value)}
            placeholder="Nguyễn Văn A"
            {...invalid("fullName")}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="acc-email" label="Email" required error={errors.email}>
            <Input
              id="acc-email"
              type="email"
              value={values.email}
              onChange={(e) => update("email")(e.target.value)}
              placeholder="email@vidu.com"
              {...invalid("email")}
            />
          </FormField>
          <FormField id="acc-phone" label="Số điện thoại" required error={errors.phone}>
            <Input
              id="acc-phone"
              type="tel"
              value={values.phone}
              onChange={(e) => update("phone")(e.target.value)}
              placeholder="0909 123 456"
              {...invalid("phone")}
            />
          </FormField>
        </div>

        <FormField id="acc-role" label="Vai trò" required>
          <select
            id="acc-role"
            value={values.role}
            onChange={(e) => update("role")(e.target.value)}
            className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}
          >
            {ROLES.map((key) => (
              <option key={key} value={key}>
                {ACCOUNT_ROLE_META[key].label}
              </option>
            ))}
          </select>
        </FormField>

        <p className="flex items-start gap-2 rounded-xl bg-cream p-3 text-xs leading-relaxed text-ink-soft">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          Đổi vai trò sẽ áp dụng ngay cho các màn hình được phân quyền. Nhân viên chỉ thấy dữ liệu thuộc phạm vi công việc.
        </p>
      </form>
    </Modal>
  )
}

function ResetPasswordModal({
  open,
  onOpenChange,
  account,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: AdminAccount | null
  onDone: () => void
}) {
  const [password, setPassword] = useState(() => (account ? tempPassword(account.username) : ""))

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Đặt lại mật khẩu"
      description="Sinh mật khẩu tạm và gửi cho người dùng qua email hoặc Zalo."
      icon={<KeyRound className="size-6" />}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ bỏ</Button>
          <Button onClick={onDone}><ShieldCheck /> Xác nhận đặt lại</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {account && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3.5 py-2.5 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-semibold text-ink">{account.fullName}</span>
              <span className="block truncate text-xs text-ink-soft">{account.email}</span>
            </span>
            <Badge variant={ACCOUNT_ROLE_META[account.role].badge}>{ACCOUNT_ROLE_META[account.role].label}</Badge>
          </div>
        )}

        <FormField id="acc-temp-password" label="Mật khẩu tạm mới" required hint={<span className="text-xs text-ink-soft">Hiển thị 1 lần</span>}>
          <div className="flex items-center gap-2">
            <Input id="acc-temp-password" readOnly value={password} className="font-mono font-semibold" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Sao chép mật khẩu tạm"
              onClick={() => copyText(password, "mật khẩu")}
            >
              <Copy />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Sinh mật khẩu khác"
              onClick={() => account && setPassword(tempPassword(account.username))}
            >
              <RotateCcw />
            </Button>
          </div>
        </FormField>

        <p className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs leading-relaxed text-ink-soft">
          <UserX className="mt-0.5 size-4 shrink-0" />
          Người dùng buộc phải đổi mật khẩu ở lần đăng nhập đầu tiên. Mọi phiên đang mở sẽ bị kết thúc.
        </p>
      </div>
    </Modal>
  )
}
