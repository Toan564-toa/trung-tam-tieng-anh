import type { ReactNode } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatVnd } from "@/lib/format"

const CHART_COLORS = {
  brand: "#fbbf24",
  brandHover: "#f59e0b",
  ink: "#1e293b",
  inkSoft: "#64748b",
  sky: "#0ea5e9",
  success: "#16a34a",
  warning: "#ea580c",
  danger: "#dc2626",
  slate: "#cbd5e1",
}

const axisProps = {
  stroke: CHART_COLORS.inkSoft,
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const

const tooltipStyle = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    fontSize: 12,
    boxShadow: "0 12px 32px rgba(15, 23, 42, 0.12)",
  },
  labelStyle: { fontWeight: 600, color: CHART_COLORS.ink },
} as const

/** Khung chung cho mọi biểu đồ: tiêu đề + vùng vẽ co giãn theo bề rộng. */
export function ChartFrame({
  title,
  description,
  action,
  height = 280,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  height?: number
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent>
        <div style={{ height }} className="w-full">
          {children}
        </div>
      </CardContent>
    </Card>
  )
}

/** Doanh thu theo tháng, so sánh với chỉ tiêu. */
export function RevenueChart({ data }: { data: { month: string; revenue: number; target: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="month" {...axisProps} />
        <YAxis {...axisProps} width={56} tickFormatter={(value: number) => `${Math.round(value / 1_000_000)}tr`} />
        <Tooltip
          {...tooltipStyle}
          formatter={(value) => formatVnd(Number(value))}
          contentStyle={{ ...tooltipStyle.contentStyle, fontVariantNumeric: "tabular-nums" }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke={CHART_COLORS.brandHover} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="target" name="Chỉ tiêu" stroke={CHART_COLORS.slate} strokeDasharray="5 4" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

/** Sĩ số từng lớp so với chỉ tiêu tối đa. */
export function ClassSizeChart({ data }: { data: { name: string; fullName: string; enrolled: number; capacity: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2}>
        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" {...axisProps} />
        <YAxis {...axisProps} width={32} />
        <Tooltip {...tooltipStyle} formatter={(value, name) => [`${Number(value)} học viên`, String(name)]} cursor={{ fill: "#f8fafc" }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="enrolled" name="Đang học" fill={CHART_COLORS.brand} radius={[4, 4, 0, 0]} maxBarSize={26} />
        <Bar dataKey="capacity" name="Chỉ tiêu" fill={CHART_COLORS.slate} radius={[4, 4, 0, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Tỷ lệ điểm danh theo lớp. */
export function AttendanceRateChart({ data }: { data: { name: string; rate: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} {...axisProps} unit="%" />
        <YAxis type="category" dataKey="name" {...axisProps} width={72} />
        <Tooltip {...tooltipStyle} formatter={(value) => [`${Number(value)}%`, "Tỷ lệ có mặt"]} cursor={{ fill: "#f8fafc" }} />
        <Bar dataKey="rate" name="Tỷ lệ có mặt" radius={[0, 4, 4, 0]} maxBarSize={18}>
          {data.map((item) => (
            <Cell key={item.name} fill={item.rate >= 90 ? CHART_COLORS.success : item.rate >= 80 ? CHART_COLORS.brandHover : CHART_COLORS.danger} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Học viên nhập / rời khóa theo tháng. */
export function EnrollmentChart({ data }: { data: { month: string; enrolled: number; churned: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="month" {...axisProps} />
        <YAxis {...axisProps} width={36} />
        <Tooltip {...tooltipStyle} cursor={{ stroke: CHART_COLORS.inkSoft }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="enrolled" name="Nhập mới" stroke={CHART_COLORS.sky} fill={CHART_COLORS.sky} fillOpacity={0.15} strokeWidth={2.5} />
        <Area type="monotone" dataKey="churned" name="Rời khóa" stroke={CHART_COLORS.danger} fill={CHART_COLORS.danger} fillOpacity={0.1} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/** Phễu tuyển sinh. */
export function FunnelChart({ data }: { data: { step: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="step" {...axisProps} interval={0} />
        <YAxis {...axisProps} width={36} />
        <Tooltip {...tooltipStyle} formatter={(value) => [`${Number(value)} khách`, "Số lượng"]} cursor={{ fill: "#f8fafc" }} />
        <Bar dataKey="value" name="Số khách" radius={[6, 6, 0, 0]} maxBarSize={48}>
          {data.map((_, index) => (
            <Cell key={data[index].step} fill={[CHART_COLORS.brand, "#fcd34d", CHART_COLORS.sky, CHART_COLORS.success, CHART_COLORS.ink][index % 5]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Cơ cấu doanh thu theo khoản thu. */
export function SharePieChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  return (
    <div className="flex h-full flex-col gap-3 sm:flex-row sm:items-center">
      <div className="h-full min-h-52 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} strokeWidth={0}>
              {data.map((item, index) => (
                <Cell key={item.name} fill={[CHART_COLORS.brand, CHART_COLORS.sky, CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.ink][index % 5]} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} formatter={(value) => [`${formatVnd(Number(value))} · ${Math.round((Number(value) / total) * 100)}%`, ""]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex shrink-0 flex-col gap-2 text-sm">
        {data.map((item, index) => (
          <li key={item.name} className="flex items-center gap-2.5">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: [CHART_COLORS.brand, CHART_COLORS.sky, CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.ink][index % 5] }}
            />
            <span className="text-ink-soft">{item.name}</span>
            <span className="ml-auto font-semibold tabular-nums text-ink">{Math.round((item.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

