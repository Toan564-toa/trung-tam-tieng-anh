import { useMemo, useState } from "react"
import { Download, History, ShieldCheck, Trash2, UserCheck, Users } from "lucide-react"
import { TableEmpty, TablePagination, TableToolbar, ToolbarSelect } from "@/components/admin/table-toolbar"
import { StatCard } from "@/components/common/stat-card"
import { PageHeader } from "@/components/layout/page-header"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import {
  ACCOUNT_ROLE_META,
  ADMIN_TODAY_LABEL,
  AUDIT_ACTION_META,
  AUDIT_LOGS,
  type AccountRole,
  type AuditAction,
  type AuditLog,
} from "@/data/admin"
import { exportAdminTable } from "@/lib/admin-excel"

const PAGE_SIZE = 15
const ROLES: AccountRole[] = ["student", "teacher", "staff", "admin"]
const ACTIONS: AuditAction[] = ["create", "update", "delete", "login", "export", "import", "approve", "lock"]

function dateKeyOf(vnDate: string) {
  const [day, month, year] = vnDate.split("/").map(Number)
  if (!day || !month || !year) return ""
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function datePartOf(time: string) {
  return time.split(" ")[0] ?? ""
}

export function AdminAuditLogPage() {
  const [query, setQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<AccountRole | "all">("all")
  const [actionFilter, setActionFilter] = useState<AuditAction | "all">("all")
  const [fromInput, setFromInput] = useState("2026-10-01")
  const [toInput, setToInput] = useState("2026-10-09")
  const [page, setPage] = useState(1)

  const from = fromInput
  const to = toInput

  const stats = useMemo(() => {
    const today = AUDIT_LOGS.filter((log) => datePartOf(log.time) === ADMIN_TODAY_LABEL)
    const counter = new Map<string, number>()
    for (const log of AUDIT_LOGS) counter.set(log.actor, (counter.get(log.actor) ?? 0) + 1)
    const top = [...counter.entries()].sort((a, b) => b[1] - a[1])[0]
    return {
      today: today.length,
      deletes: AUDIT_LOGS.filter((log) => log.action === "delete").length,
      approves: AUDIT_LOGS.filter((log) => log.action === "approve").length,
      topActor: top?.[0] ?? "—",
      topCount: top?.[1] ?? 0,
    }
  }, [])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return AUDIT_LOGS.filter((log) => {
      if (roleFilter !== "all" && log.actorRole !== roleFilter) return false
      if (actionFilter !== "all" && log.action !== actionFilter) return false
      const key = dateKeyOf(datePartOf(log.time))
      if (from && key < from) return false
      if (to && key > to) return false
      if (!needle) return true
      return (
        log.actor.toLowerCase().includes(needle) ||
        log.detail.toLowerCase().includes(needle) ||
        log.module.toLowerCase().includes(needle) ||
        log.ip.includes(needle)
      )
    })
  }, [query, roleFilter, actionFilter, from, to])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const exportLogs = () => {
    void exportAdminTable(
      "Nhat-ky-thao-tac",
      "Nhật ký",
      ["Thời gian", "Người thực hiện", "Vai trò", "Hành động", "Module", "Chi tiết", "IP"],
      filtered.map((log) => [
        log.time,
        log.actor,
        ACCOUNT_ROLE_META[log.actorRole].label,
        AUDIT_ACTION_META[log.action].label,
        log.module,
        log.detail,
        log.ip,
      ]),
    ).then(() => toast.success(`Đã xuất Excel ${filtered.length} dòng nhật ký`))
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`Nhật ký thao tác · dữ liệu ${ADMIN_TODAY_LABEL}`}
        title="Nhật ký thao tác"
        description="Tra cứu toàn bộ thao tác của quản trị, nhân viên và giáo viên trong hệ thống."
        actions={
          <Button variant="outline" onClick={exportLogs}>
            <Download /> Xuất Excel
          </Button>
        }
      />

      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard
            label="Thao tác hôm nay"
            value={String(stats.today)}
            icon={History}
            trend={{ text: ADMIN_TODAY_LABEL, tone: "info" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Lượt xoá"
            value={String(stats.deletes)}
            icon={Trash2}
            iconClass="bg-red-100 text-danger"
            trend={{ text: "Cần rà soát định kỳ", tone: "danger" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Lượt duyệt"
            value={String(stats.approves)}
            icon={UserCheck}
            iconClass="bg-green-100 text-success"
            trend={{ text: "Duyệt lương, giảm giá", tone: "success" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Hoạt động nhiều nhất"
            value={stats.topActor}
            icon={Users}
            iconClass="bg-sky-100 text-sky-700"
            trend={{ text: `${stats.topCount} thao tác trong nhật ký`, tone: "info" }}
          />
        </StaggerItem>
      </Stagger>

      <Reveal delay={0.05}>
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle>Danh sách thao tác</CardTitle>
              <CardDescription>{filtered.length} bản ghi khớp bộ lọc, mới nhất trước</CardDescription>
            </div>
            <Badge variant="info">
              <ShieldCheck /> {AUDIT_LOGS.length} dòng ghi nhận
            </Badge>
          </CardHeader>
          <TableToolbar
            query={query}
            onQueryChange={(value) => {
              setQuery(value)
              setPage(1)
            }}
            searchPlaceholder="Tìm người thực hiện, chi tiết, module…"
          >
            <ToolbarSelect
              id="audit-role"
              label="Lọc vai trò"
              value={roleFilter}
              onChange={(value) => {
                setRoleFilter(value as AccountRole | "all")
                setPage(1)
              }}
              options={[
                { value: "all", label: "Tất cả vai trò" },
                ...ROLES.map((role) => ({ value: role, label: ACCOUNT_ROLE_META[role].label })),
              ]}
            />
            <ToolbarSelect
              id="audit-action"
              label="Lọc hành động"
              value={actionFilter}
              onChange={(value) => {
                setActionFilter(value as AuditAction | "all")
                setPage(1)
              }}
              options={[
                { value: "all", label: "Tất cả hành động" },
                ...ACTIONS.map((action) => ({ value: action, label: AUDIT_ACTION_META[action].label })),
              ]}
            />
            <FormField id="audit-from" label="Từ ngày" className="min-w-40">
              <Input
                id="audit-from"
                type="date"
                value={fromInput}
                onChange={(e) => {
                  setFromInput(e.target.value)
                  setPage(1)
                }}
                className="h-10"
              />
            </FormField>
            <FormField id="audit-to" label="Đến ngày" className="min-w-40">
              <Input
                id="audit-to"
                type="date"
                value={toInput}
                onChange={(e) => {
                  setToInput(e.target.value)
                  setPage(1)
                }}
                className="h-10"
              />
            </FormField>
          </TableToolbar>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-2.5">Thời gian</th>
                    <th scope="col" className="px-3 py-2.5">Người thực hiện</th>
                    <th scope="col" className="px-3 py-2.5">Hành động</th>
                    <th scope="col" className="px-3 py-2.5">Module</th>
                    <th scope="col" className="px-3 py-2.5">Chi tiết</th>
                    <th scope="col" className="px-4 py-2.5">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((log) => (
                    <AuditRow key={log.id} log={log} />
                  ))}
                  {visible.length === 0 && <TableEmpty colSpan={6} />}
                </tbody>
              </table>
            </div>
            <TablePagination page={currentPage} pageCount={pageCount} total={filtered.length} onPageChange={setPage} />
          </CardContent>
        </Card>
      </Reveal>
    </div>
  )
}

function AuditRow({ log }: { log: AuditLog }) {
  return (
    <tr className="transition-colors hover:bg-surface">
      <td className="px-4 py-3 whitespace-nowrap tabular-nums text-ink-soft">{log.time}</td>
      <td className="px-3 py-3">
        <span className="block font-semibold whitespace-nowrap text-ink">{log.actor}</span>
        <Badge variant={ACCOUNT_ROLE_META[log.actorRole].badge} className="mt-1">
          {ACCOUNT_ROLE_META[log.actorRole].label}
        </Badge>
      </td>
      <td className="px-3 py-3">
        <Badge variant={AUDIT_ACTION_META[log.action].tone}>{AUDIT_ACTION_META[log.action].label}</Badge>
      </td>
      <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{log.module}</td>
      <td className="max-w-96 px-3 py-3 text-ink-soft">{log.detail}</td>
      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-ink-soft tabular-nums">{log.ip}</td>
    </tr>
  )
}
