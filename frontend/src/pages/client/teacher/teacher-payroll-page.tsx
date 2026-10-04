import { useMemo, useState } from "react"
import { Banknote, Download, Gift, Info, TrendingUp, Wallet, type LucideIcon } from "lucide-react"
import { cn } from "cn"
import { PageHeader } from "@/components/layout/page-header"
import { Reveal } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/toast"
import { formatVnd } from "@/lib/format"
import { exportPayroll } from "@/lib/excel"
import { PAYROLL, PAYROLL_STATUS_META, TEACHER_PROFILE, payrollTotals } from "@/data/teacher"

export function TeacherPayrollPage() {
  const [activeKey, setActiveKey] = useState(() => PAYROLL.find((r) => r.status !== "approved")?.key ?? PAYROLL[0].key)
  const row = useMemo(() => PAYROLL.find((r) => r.key === activeKey) ?? PAYROLL[0], [activeKey])
  const totals = useMemo(() => payrollTotals(row), [row])
  const meta = PAYROLL_STATUS_META[row.status]

  const yearTotal = useMemo(
    () => PAYROLL.filter((r) => r.status === "approved").reduce((sum, r) => sum + payrollTotals(r).total, 0),
    [],
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`${PAYROLL.length} kỳ lương`}
        title="Bảng lương"
        description="Theo dõi số buổi dạy, đơn giá và các khoản điều chỉnh của bạn theo từng tháng."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          label="Thực nhận tháng này"
          value={formatVnd(totals.total)}
          icon={Wallet}
          hint={`${totals.totalLessons} buổi dạy`}
        />
        <Metric label="Đơn giá / buổi" value={formatVnd(row.lessonRate)} icon={Banknote} hint={`Thưởng thêm ${formatVnd(row.bonusPerLesson)}/buổi`} />
        <Metric
          label="Tổng đã chốt 2026"
          value={formatVnd(yearTotal)}
          icon={TrendingUp}
          hint={`${PAYROLL.filter((r) => r.status === "approved").length} tháng đã duyệt`}
        />
      </div>

      <Reveal>
        <Card>
          <CardContent className="flex flex-wrap gap-2 p-4 sm:p-5">
            {PAYROLL.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveKey(item.key)}
                className={cn(
                  "min-h-11 cursor-pointer rounded-2xl px-4 text-sm font-semibold transition-colors",
                  item.key === activeKey ? "bg-brand text-ink shadow-glow" : "bg-surface text-ink-soft hover:bg-cream",
                )}
              >
                {item.month}
              </button>
            ))}
          </CardContent>
        </Card>
      </Reveal>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Reveal delay={0.05}>
          <Card className="h-full">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Chi tiết {row.month}</CardTitle>
                  <CardDescription>Số buổi dạy theo từng lớp phụ trách</CardDescription>
                </div>
                <Badge variant={meta.badge}>{meta.label}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="overflow-x-auto">
                <table className="w-full min-w-96 border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-semibold tracking-wide text-ink-soft uppercase">
                      <th className="pb-2.5 font-semibold">Lớp</th>
                      <th className="pb-2.5 text-center font-semibold">Buổi</th>
                      <th className="pb-2.5 text-right font-semibold">Tiền giảng</th>
                      <th className="pb-2.5 text-right font-semibold">Thưởng thêm</th>
                      <th className="pb-2.5 text-right font-semibold">Cộng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.breakdown.map((item) => (
                      <tr key={item.classId} className="border-b border-slate-50 last:border-0">
                        <td className="py-3 font-medium text-ink">{item.className}</td>
                        <td className="py-3 text-center tabular-nums text-ink-soft">{item.lessons}</td>
                        <td className="py-3 text-right tabular-nums text-ink-soft">{formatVnd(item.lessons * row.lessonRate)}</td>
                        <td className="py-3 text-right tabular-nums text-ink-soft">{formatVnd(item.lessons * row.bonusPerLesson)}</td>
                        <td className="py-3 text-right font-semibold tabular-nums text-ink">
                          {formatVnd(item.lessons * (row.lessonRate + row.bonusPerLesson))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
                <Line label={`Tiền giảng (${totals.totalLessons} buổi × ${formatVnd(row.lessonRate)})`} value={totals.baseAmount} />
                <Line label={`Thưởng thêm (${totals.totalLessons} buổi × ${formatVnd(row.bonusPerLesson)})`} value={totals.bonusAmount} />
                {row.adjustments.map((item) => (
                  <Line key={item.label} label={item.label} value={item.amount} icon={Gift} />
                ))}
                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <p className="font-heading text-sm font-bold text-ink">Tổng thực nhận</p>
                  <p className="font-heading text-xl font-extrabold text-brand-hover tabular-nums">{formatVnd(totals.total)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() =>
                    void exportPayroll(row.month, TEACHER_PROFILE.fullName, row.breakdown, { lessonRate: row.lessonRate, bonusPerLesson: row.bonusPerLesson, ...totals }, row.adjustments)
                  }
                >
                  <Download /> Xuất bảng lương
                </Button>
                {row.status === "draft" && (
                  <Button
                    variant="outline"
                    onClick={() => toast.success("Đã gửi bảng lương", { description: `${row.month} đang chờ phòng Kế toán duyệt.` })}
                  >
                    Gửi phòng Kế toán duyệt
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </Reveal>

        <div className="flex flex-col gap-6">
          <Reveal delay={0.1}>
            <Card>
              <CardContent className="p-5">
                <p className="flex items-center gap-2 font-heading text-sm font-bold text-ink">
                  <Info className="size-4 text-ink-soft" />
                  Trạng thái kỳ lương
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{meta.description}</p>
                <dl className="mt-4 flex flex-col gap-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-soft">Đơn giá / buổi</dt>
                    <dd className="font-medium tabular-nums text-ink">{formatVnd(row.lessonRate)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-soft">Thưởng thêm / buổi</dt>
                    <dd className="font-medium tabular-nums text-ink">{formatVnd(row.bonusPerLesson)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-soft">Khoản điều chỉnh</dt>
                    <dd className="font-medium tabular-nums text-ink">{formatVnd(totals.adjustmentAmount)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.15}>
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử gần đây</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {[...PAYROLL]
                    .sort((a, b) => b.key.localeCompare(a.key))
                    .map((item) => (
                      <li key={item.key}>
                        <button
                          type="button"
                          onClick={() => setActiveKey(item.key)}
                          className={cn(
                            "flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors",
                            item.key === activeKey ? "border-brand bg-cream" : "border-slate-100 hover:border-brand/40",
                          )}
                        >
                          <span className="text-sm font-medium text-ink">{item.month}</span>
                          <span className="flex items-center gap-2">
                            <span className="text-sm font-semibold tabular-nums text-ink">{formatVnd(payrollTotals(item).total)}</span>
                            <Badge variant={PAYROLL_STATUS_META[item.status].badge}>
                              {PAYROLL_STATUS_META[item.status].label}
                            </Badge>
                          </span>
                        </button>
                      </li>
                    ))}
                </ul>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string
  value: string
  icon: LucideIcon
  hint: string
}) {
  return (
    <Card hoverable>
      <CardContent className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium text-ink-soft">{label}</p>
          <p className="font-heading text-xl font-extrabold text-ink tabular-nums sm:text-2xl">{value}</p>
          <p className="text-xs text-ink-soft">{hint}</p>
        </div>
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-amber-700">
          <Icon className="size-6" />
        </span>
      </CardContent>
    </Card>
  )
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