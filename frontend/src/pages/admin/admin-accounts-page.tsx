import { useState, type FormEvent } from "react"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Copy,
  Download,
  History,
  KeyRound,
  Lock,
  Pencil,
  Plus,
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
import { usersApi, type Account, type AccountRole, type AccountStatus } from "@/api/users"
import type { LoginHistoryRow } from "@/api/auth"
import { ACCOUNT_ROLE_META, ACCOUNT_STATUS_META } from "@/data/admin"
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
  account: Account
} | null

function formatDate(value: string | null | undefined) {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("vi-VN")
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ""
    : `${date.toLocaleDateString("vi-VN")} ${date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
}

function copyText(value: string, label: string) {
  void navigator.clipboard
    .writeText(value)
    .then(() => toast.success(`Đã sao chép ${label}`))
    .catch(() => toast.error("Không sao chép được", { description: "Hãy bôi đen và copy thủ công." }))
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

export function AdminAccountsPage() {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState("")
  const [role, setRole] = useState<AccountRole | "all">("all")
  const [status, setStatus] = useState<AccountStatus | "all">("all")
  const [onlyDeleted, setOnlyDeleted] = useState(false)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Account | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [resetting, setResetting] = useState<Account | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [history, setHistory] = useState<Account | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState>(null)

  const listQuery = useQuery({
    queryKey: ["users", { query, role, status, onlyDeleted, page }],
    queryFn: () =>
      usersApi.list({
        query: query.trim() || undefined,
        role: role === "all" ? undefined : role,
        status: status === "all" ? undefined : status,
        onlyDeleted,
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })

  // Thống kê: đếm theo trạng thái (lấy 1 dòng chỉ để lấy total).
  const activeCount = useQuery({
    queryKey: ["users", "count", "active"],
    queryFn: () => usersApi.list({ status: "active", page: 1, pageSize: 1 }),
  })
  const lockedCount = useQuery({
    queryKey: ["users", "count", "locked"],
    queryFn: () => usersApi.list({ status: "locked", page: 1, pageSize: 1 }),
  })
  const pendingCount = useQuery({
    queryKey: ["users", "count", "pending"],
    queryFn: () => usersApi.list({ status: "pending", page: 1, pageSize: 1 }),
  })

  const rows = listQuery.data?.items ?? []
  const total = listQuery.data?.total ?? 0
  const pageCount = Math.max(1, listQuery.data?.totalPages ?? 1)
  const stats = {
    total,
    active: activeCount.data?.total ?? 0,
    locked: lockedCount.data?.total ?? 0,
    pending: pendingCount.data?.total ?? 0,
  }

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["users"] })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "active" | "locked" }) => usersApi.setStatus(id, status),
    onSuccess: () => {
      invalidate()
      toast.success("Đã cập nhật trạng thái tài khoản")
    },
    onError: (err) => toast.error(errorMessage(err, "Không cập nhật được trạng thái")),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => usersApi.remove(id),
    onSuccess: () => {
      invalidate()
      toast.success("Đã xoá tài khoản", { description: "Tài khoản chuyển sang mục đã xoá, có thể khôi phục." })
    },
    onError: (err) => toast.error(errorMessage(err, "Không xoá được tài khoản")),
  })

  const restoreMutation = useMutation({
    mutationFn: (id: number) => usersApi.restore(id),
    onSuccess: () => {
      invalidate()
      toast.success("Đã khôi phục tài khoản", { description: "Tài khoản trở lại danh sách đang hoạt động." })
    },
    onError: (err) => toast.error(errorMessage(err, "Không khôi phục được tài khoản")),
  })

  const runConfirm = () => {
    if (!confirm) return
    const { kind, account } = confirm
    setConfirm(null)
    if (kind === "lock") {
      statusMutation.mutate({ id: account.id, status: "locked" })
      return
    }
    if (kind === "unlock") {
      statusMutation.mutate({ id: account.id, status: "active" })
      return
    }
    deleteMutation.mutate(account.id)
  }

  const onExport = () => {
    // Xuất tối đa 100 dòng khớp bộ lọc hiện tại (giới hạn phân trang của API).
    void usersApi
      .list({
        query: query.trim() || undefined,
        role: role === "all" ? undefined : role,
        status: status === "all" ? undefined : status,
        onlyDeleted,
        page: 1,
        pageSize: 100,
      })
      .then((result) =>
        exportAdminTable(
          "Danh-sach-tai-khoan",
          "Tai khoan",
          ["Tên đăng nhập", "Họ và tên", "Vai trò", "Email", "Số điện thoại", "Đăng nhập cuối", "Ngày tạo", "Trạng thái"],
          result.items.map((account) => [
            account.username,
            account.fullName,
            account.roles.map((key) => ACCOUNT_ROLE_META[key].label).join(", "),
            account.email ?? "",
            account.phone ?? "",
            account.lastLoginAt ? formatDateTime(account.lastLoginAt) : "Chưa đăng nhập",
            formatDate(account.createdAt),
            account.deletedAt ? "Đã xoá" : ACCOUNT_STATUS_META[account.status].label,
          ]),
        ),
      )
      .then(() => toast.success("Đã xuất danh sách tài khoản", { description: "File Excel đã được tải xuống." }))
      .catch((err) => toast.error(errorMessage(err, "Không xuất được file Excel")))
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
        eyebrow={`${stats.total.toLocaleString("vi-VN")} tài khoản trong hệ thống`}
        title="Tài khoản & phân quyền"
        description="Khoá, đặt lại mật khẩu, đổi vai trò và xoá mềm tài khoản của học viên, giáo viên, nhân viên và quản trị."
        actions={
          <>
            <Button variant="outline" onClick={onExport}>
              <Download /> Xuất Excel
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus /> Thêm tài khoản
            </Button>
          </>
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
            trend={{ text: "Chưa đổi mật khẩu lần đầu", tone: "warning" }}
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
                {listQuery.isLoading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-ink-soft">
                      Đang tải danh sách tài khoản…
                    </td>
                  </tr>
                )}
                {listQuery.isError && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-danger">
                      {errorMessage(listQuery.error, "Không tải được danh sách tài khoản.")}
                    </td>
                  </tr>
                )}
                {!listQuery.isLoading && !listQuery.isError &&
                  rows.map((account) => (
                    <tr key={account.id} className="transition-colors hover:bg-surface">
                      <td className="px-4 py-3">
                        <span className="block font-semibold text-ink">{account.fullName}</span>
                        <span className="block font-mono text-xs text-ink-soft">{account.username}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex flex-wrap gap-1">
                          {account.roles.map((key) => (
                            <Badge key={key} variant={ACCOUNT_ROLE_META[key].badge}>
                              {ACCOUNT_ROLE_META[key].label}
                            </Badge>
                          ))}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{account.email ?? "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-ink-soft tabular-nums">{account.phone ?? "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-ink-soft tabular-nums">
                        {account.lastLoginAt ? formatDateTime(account.lastLoginAt) : <span className="text-slate-400">Chưa đăng nhập</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-ink-soft tabular-nums">{formatDate(account.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <Badge variant={ACCOUNT_STATUS_META[account.status].badge}>{ACCOUNT_STATUS_META[account.status].label}</Badge>
                          {account.deletedAt && <Badge variant="danger">Đã xoá</Badge>}
                          {account.mustChangePassword && !account.deletedAt && <Badge variant="warning">Đổi MK lần đầu</Badge>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {account.deletedAt ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => restoreMutation.mutate(account.id)}
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
                                aria-label={`Lịch sử đăng nhập của ${account.fullName}`}
                                title="Lịch sử đăng nhập"
                                onClick={() => {
                                  setHistory(account)
                                  setHistoryOpen(true)
                                }}
                              >
                                <History />
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
                {!listQuery.isLoading && !listQuery.isError && rows.length === 0 && (
                  <TableEmpty colSpan={8} message="Không có tài khoản nào khớp bộ lọc hiện tại." />
                )}
              </tbody>
            </table>
          </div>

          <TablePagination page={page} pageCount={pageCount} total={total} onPageChange={setPage} />
        </Card>
      </Reveal>

      <CreateAccountModal key="create" open={createOpen} onOpenChange={setCreateOpen} onSaved={invalidate} />

      <EditAccountModal
        key={editing?.id ?? "edit"}
        open={editOpen}
        onOpenChange={setEditOpen}
        account={editing}
        onSave={(id, values) => {
          void usersApi
            .update(id, { ...values, roles: [values.role] })
            .then(() => {
              setEditOpen(false)
              invalidate()
              toast.success("Đã cập nhật tài khoản", {
                description: `${values.fullName} · ${ACCOUNT_ROLE_META[values.role].label}`,
              })
            })
            .catch((err) => toast.error(errorMessage(err, "Không cập nhật được tài khoản")))
        }}
      />

      <ResetPasswordModal
        key={resetting?.id ?? "reset"}
        open={resetOpen}
        onOpenChange={setResetOpen}
        account={resetting}
      />

      <LoginHistoryModal
        key={history?.id ?? "history"}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        account={history}
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

function CreateAccountModal({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [values, setValues] = useState<EditValues>({ fullName: "", email: "", phone: "", role: "student" })
  const [username, setUsername] = useState("")
  const [errors, setErrors] = useState<EditErrors & { username?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)

  const update = (key: keyof EditValues) => (value: string) => {
    setValues((prev) => ({ ...prev, [key]: value as never }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const invalid = (key: string) => ({
    "aria-invalid": Boolean(errors[key as keyof typeof errors]) || undefined,
    "aria-describedby": errors[key as keyof typeof errors] ? `acc-${key}-error` : undefined,
  })

  const close = () => {
    onOpenChange(false)
    window.setTimeout(() => {
      setValues({ fullName: "", email: "", phone: "", role: "student" })
      setUsername("")
      setErrors({})
      setSubmitting(false)
      setTemporaryPassword(null)
    }, 200)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const found: EditErrors & { username?: string } = {}
    if (username.trim().length < 3) found.username = "Tên đăng nhập tối thiểu 3 ký tự."
    if (values.fullName.trim().length < 2) found.fullName = "Vui lòng nhập họ và tên."
    if (!values.email.trim()) found.email = "Vui lòng nhập email."
    else if (!EMAIL_RE.test(values.email.trim())) found.email = "Email không hợp lệ."
    if (!values.phone.trim()) found.phone = "Vui lòng nhập số điện thoại."
    else if (!PHONE_RE.test(values.phone.replace(/[\s.-]/g, ""))) found.phone = "Số điện thoại không hợp lệ (VD: 0909 123 456)."
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    void usersApi
      .create({
        username: username.trim().toLowerCase(),
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        roles: [values.role],
      })
      .then((created) => {
        setTemporaryPassword(created.temporaryPassword)
        onSaved()
      })
      .catch((err) => toast.error(errorMessage(err, "Không tạo được tài khoản")))
      .finally(() => setSubmitting(false))
  }

  return (
    <Modal
      open={open}
      onOpenChange={close}
      title="Thêm tài khoản"
      description="Tạo tài khoản đăng nhập mới. Mật khẩu tạm chỉ hiển thị một lần."
      icon={<UserCog className="size-6" />}
      footer={
        temporaryPassword ? (
          <Button onClick={close}>Đóng</Button>
        ) : (
          <>
            <Button variant="outline" onClick={() => close()}>Huỷ bỏ</Button>
            <Button type="submit" form="account-create-form" disabled={submitting}>
              {submitting ? "Đang tạo…" : "Tạo tài khoản"}
            </Button>
          </>
        )
      }
    >
      {temporaryPassword ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-xl bg-green-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-success">
              <ShieldCheck className="size-4" /> Tạo tài khoản thành công
            </p>
            <p className="text-xs text-ink-soft">
              Tài khoản <b>{username}</b> đã được tạo. Mật khẩu tạm bên dưới chỉ hiển thị một lần —
              hãy gửi cho người dùng và yêu cầu đổi mật khẩu ở lần đăng nhập đầu.
            </p>
          </div>
          <FormField id="acc-new-password" label="Mật khẩu tạm" required hint={<span className="text-xs text-ink-soft">Hiển thị 1 lần</span>}>
            <div className="flex items-center gap-2">
              <Input id="acc-new-password" readOnly value={temporaryPassword} className="font-mono font-semibold" />
              <Button type="button" variant="outline" size="icon" aria-label="Sao chép mật khẩu tạm" onClick={() => copyText(temporaryPassword, "mật khẩu")}>
                <Copy />
              </Button>
            </div>
          </FormField>
        </div>
      ) : (
        <form id="account-create-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <FormField id="acc-username" label="Tên đăng nhập" required error={errors.username}>
            <Input
              id="acc-username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                if (errors.username) setErrors((prev) => ({ ...prev, username: undefined }))
              }}
              placeholder="hv001"
              {...invalid("username")}
            />
          </FormField>

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
            Tài khoản mới ở trạng thái chờ đổi mật khẩu lần đầu. Nhân viên chỉ thấy dữ liệu thuộc phạm vi công việc.
          </p>
        </form>
      )}
    </Modal>
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
  account: Account | null
  onSave: (id: number, values: EditValues) => void
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
    if (account) onSave(account.id, values)
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
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: Account | null
}) {
  const [submitting, setSubmitting] = useState(false)
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const close = () => {
    onOpenChange(false)
    window.setTimeout(() => {
      setSubmitting(false)
      setTemporaryPassword(null)
      setError(null)
    }, 200)
  }

  const onConfirm = () => {
    if (!account) return
    setSubmitting(true)
    setError(null)
    void usersApi
      .resetPassword(account.id)
      .then((result) => setTemporaryPassword(result.temporaryPassword))
      .catch((err) => setError(errorMessage(err, "Không đặt lại được mật khẩu")))
      .finally(() => setSubmitting(false))
  }

  return (
    <Modal
      open={open}
      onOpenChange={close}
      title="Đặt lại mật khẩu"
      description="Sinh mật khẩu tạm mới và yêu cầu người dùng đổi ở lần đăng nhập kế tiếp."
      icon={<KeyRound className="size-6" />}
      footer={
        temporaryPassword ? (
          <Button onClick={close}>Đóng</Button>
        ) : (
          <>
            <Button variant="outline" onClick={() => close()}>Huỷ bỏ</Button>
            <Button onClick={onConfirm} disabled={submitting}>
              <ShieldCheck /> {submitting ? "Đang đặt lại…" : "Xác nhận đặt lại"}
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-4">
        {account && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3.5 py-2.5 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-semibold text-ink">{account.fullName}</span>
              <span className="block truncate text-xs text-ink-soft">{account.username} · {account.email ?? "—"}</span>
            </span>
            <Badge variant={ACCOUNT_ROLE_META[account.role].badge}>{ACCOUNT_ROLE_META[account.role].label}</Badge>
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-danger">
            {error}
          </div>
        )}

        {temporaryPassword ? (
          <FormField id="acc-temp-password" label="Mật khẩu tạm mới" required hint={<span className="text-xs text-ink-soft">Hiển thị 1 lần</span>}>
            <div className="flex items-center gap-2">
              <Input id="acc-temp-password" readOnly value={temporaryPassword} className="font-mono font-semibold" />
              <Button type="button" variant="outline" size="icon" aria-label="Sao chép mật khẩu tạm" onClick={() => copyText(temporaryPassword, "mật khẩu")}>
                <Copy />
              </Button>
            </div>
          </FormField>
        ) : (
          <p className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs leading-relaxed text-ink-soft">
            <UserX className="mt-0.5 size-4 shrink-0" />
            Người dùng buộc phải đổi mật khẩu ở lần đăng nhập đầu tiên. Mọi phiên đang mở sẽ bị kết thúc.
          </p>
        )}
      </div>
    </Modal>
  )
}

function LoginHistoryModal({
  open,
  onOpenChange,
  account,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: Account | null
}) {
  const [page, setPage] = useState(1)
  const historyQuery = useQuery({
    queryKey: ["users", account?.id ?? 0, "login-history", page],
    queryFn: () => usersApi.loginHistory(account!.id, page, 10),
    enabled: open && Boolean(account),
    placeholderData: keepPreviousData,
  })

  const items: LoginHistoryRow[] = historyQuery.data?.items ?? []
  const pageCount = Math.max(1, historyQuery.data?.totalPages ?? 1)

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setPage(1)
      }}
      title="Lịch sử đăng nhập"
      description={account ? `Các lần đăng nhập gần đây của ${account.fullName} (${account.username}).` : ""}
      icon={<History className="size-6" />}
      footer={<Button onClick={() => onOpenChange(false)}>Đóng</Button>}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">Thời gian</th>
              <th scope="col" className="px-3 py-2 font-semibold">Kết quả</th>
              <th scope="col" className="px-3 py-2 font-semibold">IP</th>
              <th scope="col" className="px-3 py-2 font-semibold">Thiết bị</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {historyQuery.isLoading && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-sm text-ink-soft">
                  Đang tải lịch sử…
                </td>
              </tr>
            )}
            {historyQuery.isError && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-sm text-danger">
                  {errorMessage(historyQuery.error, "Không tải được lịch sử đăng nhập.")}
                </td>
              </tr>
            )}
            {!historyQuery.isLoading && !historyQuery.isError &&
              items.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 whitespace-nowrap text-ink-soft tabular-nums">{formatDateTime(row.createdAt)}</td>
                  <td className="px-3 py-2">
                    <Badge variant={row.success ? "success" : "danger"}>{row.success ? "Thành công" : "Thất bại"}</Badge>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-xs text-ink-soft">{row.ip ?? "—"}</td>
                  <td className="px-3 py-2 max-w-[180px] truncate text-xs text-ink-soft" title={row.userAgent ?? undefined}>
                    {row.userAgent ?? "—"}
                  </td>
                </tr>
              ))}
            {!historyQuery.isLoading && !historyQuery.isError && items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-sm text-ink-soft">
                  Chưa có lần đăng nhập nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <TablePagination page={page} pageCount={pageCount} total={historyQuery.data?.total ?? 0} onPageChange={setPage} />
    </Modal>
  )
}
