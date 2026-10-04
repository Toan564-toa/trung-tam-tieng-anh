import { useMemo, useState } from "react"
import { Banknote, Download, Gift, Info, TrendingUp, Wallet, type LucideIcon } from "lucide-react"
import { cn } from "cn"
import { StatCard } from "@/components/common/stat-card"
import { PageHeader } from "@/components/layout/page-header"
import { Reveal } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { exportPayroll } from "@/lib/excel"
import { formatVnd } from "@/lib/format"
import {
  STAFF_PAYROLL,
  STAFF_PAYROLL_STATUS_META,
  STAFF_PROFILE,
  approvedPayroll,
  staffPayrollTotal,
  type StaffPayrollRow,
} from "@/data/staff"

const HIDDEN_COUNT = STAFF_PAYROLL.filter((row) => row.status !== "approved").length

export function StaffPayrollPage() {
  const rows = useMemo(() => [...approvedPayroll()].sort((a, b) => b.key.localeCompare(a.key)), [])
  const [activeKey, setActiveKey] = useState(() => rows[0]?.key ?? "")
  const row = useMemo(() => rows.find((item) => item.key === activeKey) ?? rows[0], [rows, activeKey])
  const yearTotal = useMemo(() => rows.reduce((sum, item) => sum + staffPayrollTotal(item), 0), [rows])

  if (rows.length === 0 || !row) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow={`Nhân viên: ${STAFF_PROFILE.fullName}`}
          title="Bảng lương của tôi"
          description="Bạn chỉ xem được các kỳ lương đã được phòng Kế toán chốt."
        />
        <Reveal>
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
              <Banknote className="size-8 text-ink-soft" />
              <p className="font-heading text-lg font-extrabold text-ink">Chưa có kỳ lương nào được chốt.</p>
              <p className="max-w-md text-sm leading-relaxed text-ink-soft">
                Bảng lương sẽ hiển thị ngay khi phòng Kế toán chốt số liệu tháng đầy đủ.
              </p>
            </CardContent>
          </Card>
        </Reveal>
      </div>
    )
  }

  const itemsTotal = sumItems(row)
  const meta = STAFF_PAYROLL_STATUS_META[row.status]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`Nhân viên: ${STAFF_PROFILE.fullName}`}
        title="Bảng lương của tôi"
        description="Chỉ xem: bạn theo dõi các kỳ lương đã được phòng Kế toán chốt. Các tháng đang tính hoặc chờ duyệt không hiển thị tại đây."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Thực nhận tháng gần nhất"
          value={formatVnd(staffPayrollTotal(row))}
          icon={Wallet}
          trend={{ text: row.month, tone: "info" }}
        />
        <StatCard
          label="Tổng lương đã chốt 2026"
          value={formatVnd(yearTotal)}
          icon={TrendingUp}
          trend={{ text: `${rows.length} kỳ đã chốt`, tone: "success" }}
        />
        <StatCard
          label="Lương cứng"
          value={formatVnd(row.baseSalary)}
          icon={Banknote}
          trend={{ text: "Hợp đồng chính thức", tone: "info" }}
        />
      </div>

      <Reveal>
        <Card>
          <CardContent className="flex flex-wrap gap-2 p-4 sm:p-5">
            {rows.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveKey(item.key)}
                className={cn(
                  "min-h-11 cursor-pointer rounded-2xl px-4 text-sm font-semibold transition-colors",
                  item.key === row.key ? "bg-brand text-ink shadow-glow" : "bg-surface text-ink-soft hover:bg-cream",
                )}
              >
                {item.month}
              </button>
            ))}
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={0.05}>
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Chi tiết {row.month}</CardTitle>
                <CardDescription>Lương cứng cộng với các khoản hoa hồng và phụ cấp</CardDescription>
              </div>
              <Badge variant={meta.badge}>{meta.label}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-96 border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    <th className="pb-2.5 font-semibold">Khoản</th>
                    <th className="pb-2.5 text-right font-semibold">Số tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {row.items.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-sm text-ink-soft">
                        Kỳ lương này không có khoản phụ cấp nào.
                      </td>
                    </tr>
                  )}
                  {row.items.map((item) => (
                    <tr key={item.label} className="border-b border-slate-50 last:border-0">
                      <td className="py-3 font-medium text-ink">
                        {item.label}
                        {item.hint && <span className="mt-0.5 block text-xs font-normal text-ink-soft">{item.hint}</span>}
                      </td>
                      <td className="py-3 text-right font-semibold tabular-nums text-ink">{formatVnd(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
              <Line label="Lương cứng" value={row.baseSalary} />
              <Line label="Tổng các khoản cộng thêm" value={itemsTotal} icon={Gift} />
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                <p className="font-heading text-sm font-bold text-ink">Tổng thực nhận</p>
                <p className="font-heading text-xl font-extrabold tabular-nums text-brand-hover">
                  {formatVnd(staffPayrollTotal(row))}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  void exportPayroll(
                    row.month,
                    STAFF_PROFILE.fullName,
                    [],
                    {
                      lessonRate: 0,
                      bonusPerLesson: 0,
                      totalLessons: 0,
                      baseAmount: row.baseSalary,
                      bonusAmount: 0,
                      adjustmentAmount: itemsTotal,
                      total: staffPayrollTotal(row),
                    },
                    row.items,
                  )
                }
              >
                <Download /> Xuất Excel
              </Button>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={0.1}>
        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="neutral">Chỉ xem</Badge>
              <p className="flex items-center gap-2 font-heading text-sm font-bold text-ink">
                <Info className="size-4 text-ink-soft" />
                Kỳ lương chưa chốt
              </p>
            </div>
            <p className="text-sm leading-relaxed text-ink-soft">
              {STAFF_PAYROLL_STATUS_META.draft.description} {STAFF_PAYROLL_STATUS_META.pending.description}{" "}
              {HIDDEN_COUNT} kỳ đang ở trạng thái này nên không hiển thị trong bảng lương của bạn.
            </p>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  )
}

function sumItems(row: StaffPayrollRow) {
  return row.items.reduce((sum, item) => sum + item.amount, 0)
}

function Line({ label, value, icon: Icon }: { label: string; value: number; icon?: LucideIcon }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex min-w-0 items-center gap-1.5 text-ink-soft">
        {Icon && <Icon className="size-3.5 shrink-0" />}
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0 font-medium tabular-nums text-ink">{formatVnd(value)}</span>
    </div>
  )
}
