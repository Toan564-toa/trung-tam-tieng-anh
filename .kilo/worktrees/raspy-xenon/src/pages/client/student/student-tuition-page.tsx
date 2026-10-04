import { Banknote, CalendarClock, CreditCard, Receipt, TrendingUp, Wallet, type LucideIcon } from "lucide-react"
import { cn } from "cn"
import { PageHeader } from "@/components/layout/page-header"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ENROLLMENT, PAYMENTS, TUITION, TUITION_METHOD_META, TUITION_TOTAL } from "@/data/student"
import { formatVnd } from "@/lib/format"
import { daysBetween, formatDate, formatDateLong } from "@/lib/date"

/** Ngày "hôm nay" của bản demo. */
const TODAY = new Date(2026, 9, 1)

export function StudentTuitionPage() {
  const paidPercent = Math.round((TUITION.paid / TUITION.total) * 100)
  const daysLeft = daysBetween(TODAY, TUITION.nextDueDate)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`${ENROLLMENT.courseName} · ${ENROLLMENT.className}`}
        title="Học phí"
        description="Thông tin tổng học phí, lịch sử thanh toán và hạn đóng kỳ tiếp theo."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Reveal>
          <Card className="h-full overflow-hidden">
            <div className="relative bg-brand p-6 sm:p-8">
              <div className="absolute -top-14 -right-10 size-52 rounded-full bg-white/25" aria-hidden="true" />
              <p className="relative text-sm font-semibold text-ink/70">Tổng học phí khóa học</p>
              <p className="relative font-heading mt-1 text-4xl font-extrabold text-ink">{formatVnd(TUITION_TOTAL)}</p>
              <p className="relative mt-1 text-sm text-ink/75">{ENROLLMENT.totalLessons} buổi học · {ENROLLMENT.schedule}</p>
            </div>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <MoneyTile
                icon={Banknote}
                label="Đã đóng"
                value={formatVnd(TUITION.paid)}
                tone="text-success"
                chip="bg-green-100 text-success"
              />
              <MoneyTile
                icon={Wallet}
                label="Còn phải đóng"
                value={formatVnd(TUITION.remaining)}
                tone="text-danger"
                chip="bg-red-100 text-danger"
              />
              <MoneyTile
                icon={Receipt}
                label="Số phiếu thu"
                value={`${PAYMENTS.length} phiếu`}
                tone="text-ink"
                chip="bg-sky-100 text-sky-700"
              />
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={0.08}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Hạn đóng kỳ tới</CardTitle>
              <CardDescription>{TUITION.nextDueLabel}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="rounded-2xl bg-surface p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-amber-700">
                    <CalendarClock className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs text-ink-soft">Đến hạn</p>
                    <p className="font-heading text-sm font-bold text-ink">{formatDate(TUITION.nextDueDate)}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-ink-soft">{formatDateLong(TUITION.nextDueDate)}</p>
                <p className="mt-1 text-sm font-semibold text-warning">
                  {daysLeft > 0 ? `Còn ${daysLeft} ngày` : "Đã quá hạn"}
                </p>
              </div>
              <Progress value={paidPercent} tone="success" label="Tiến độ thanh toán" valueLabel={`${paidPercent}%`} />
              <div className="flex items-start gap-2.5 rounded-xl border border-orange-100 bg-orange-50 p-3.5">
                <CreditCard className="mt-0.5 size-4 shrink-0 text-warning" />
                <p className="text-xs leading-relaxed text-ink-soft">
                  Vui lòng đóng học phí tại quầy thu ngân hoặc chuyển khoản theo thông tin trong biên lai. Sau khi thanh toán,
                  lịch sử sẽ được cập nhật trong vòng 2 ngày làm việc.
                </p>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      </div>

      <Stagger className="grid gap-4 sm:grid-cols-3">
        <StaggerItem>
          <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-soft">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-green-100 text-success">
              <TrendingUp className="size-5" />
            </span>
            <div>
              <p className="text-xs text-ink-soft">Tỷ lệ đã đóng</p>
              <p className="font-heading text-lg font-extrabold text-ink">{paidPercent}%</p>
            </div>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-soft">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <Receipt className="size-5" />
            </span>
            <div>
              <p className="text-xs text-ink-soft">Đợt đã thanh toán</p>
              <p className="font-heading text-lg font-extrabold text-ink">{PAYMENTS.length}/4</p>
            </div>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-soft">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-orange-100 text-warning">
              <CalendarClock className="size-5" />
            </span>
            <div>
              <p className="text-xs text-ink-soft">Trạng thái</p>
              <p className="font-heading text-sm font-extrabold text-ink">{TUITION.status}</p>
            </div>
          </div>
        </StaggerItem>
      </Stagger>

      <Reveal>
        <Card>
          <CardHeader>
            <CardTitle>Lịch sử thanh toán</CardTitle>
            <CardDescription>Các khoản đã đóng và biên lai tương ứng</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Bảng trên desktop, thẻ trên mobile */}
            <div className="hidden overflow-hidden rounded-2xl border border-slate-100 sm:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface text-xs font-semibold text-ink-soft">
                  <tr>
                    <th scope="col" className="px-4 py-3">Ngày</th>
                    <th scope="col" className="px-4 py-3">Nội dung</th>
                    <th scope="col" className="px-4 py-3">Phương thức</th>
                    <th scope="col" className="px-4 py-3">Số biên lai</th>
                    <th scope="col" className="px-4 py-3 text-right">Số tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PAYMENTS.map((payment) => (
                    <tr key={payment.id} className="transition-colors hover:bg-cream/30">
                      <td className="px-4 py-3.5 whitespace-nowrap text-ink-soft">{payment.date}</td>
                      <td className="px-4 py-3.5 font-medium text-ink">{payment.note}</td>
                      <td className="px-4 py-3.5">
                        <Badge variant={TUITION_METHOD_META[payment.method].badge}>{payment.method}</Badge>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-ink-soft">{payment.receiptNo}</td>
                      <td className="px-4 py-3.5 text-right font-heading font-bold whitespace-nowrap text-ink">
                        {formatVnd(payment.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-slate-100 bg-surface">
                  <tr>
                    <td colSpan={4} className="px-4 py-3.5 text-right text-sm font-semibold text-ink-soft">
                      Tổng đã đóng
                    </td>
                    <td className="px-4 py-3.5 text-right font-heading font-extrabold whitespace-nowrap text-success">
                      {formatVnd(TUITION.paid)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <ul className="flex flex-col gap-3 sm:hidden">
              {PAYMENTS.map((payment) => (
                <li key={payment.id} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{payment.note}</p>
                      <p className="mt-0.5 text-xs text-ink-soft">{payment.date}</p>
                    </div>
                    <p className="font-heading shrink-0 text-sm font-extrabold whitespace-nowrap text-ink">
                      {formatVnd(payment.amount)}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant={TUITION_METHOD_META[payment.method].badge}>{payment.method}</Badge>
                    <span className="font-mono text-[11px] text-ink-soft">{payment.receiptNo}</span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  )
}

function MoneyTile({
  icon: Icon,
  label,
  value,
  tone,
  chip,
}: {
  icon: LucideIcon
  label: string
  value: string
  tone: string
  chip: string
}) {
  return (
    <div className="rounded-2xl border border-slate-100 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-ink-soft">{label}</p>
        <span className={cn("flex size-8 items-center justify-center rounded-xl", chip)}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className={cn("font-heading mt-1.5 text-lg font-extrabold", tone)}>{value}</p>
    </div>
  )
}