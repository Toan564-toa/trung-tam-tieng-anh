import { useId, useMemo } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { cn } from "cn"

export type LineChartPoint = {
  label: string
  value: number
}

type LineChartProps = {
  data: LineChartPoint[]
  /** Khoảng cách nhỏ nhất giữa hai giá trị trục Y. */
  step?: number
  min?: number
  max?: number
  unit?: string
  height?: number
  className?: string
  /** Hiển thị nhãn giá trị ở từng điểm. */
  showValue?: boolean
  tone?: "brand" | "sky" | "success"
}

const TONE_STROKE = { brand: "#f59e0b", sky: "#0ea5e9", success: "#16a34a" } as const
const VIEW_W = 620

/**
 * Biểu đồ đường nhẹ bằng SVG cho khu vực học viên.
 * Dùng viewBox cố định + `w-full` nên tự co giãn theo khung chứa.
 */
function LineChart({
  data,
  step = 2,
  min,
  max,
  unit = "",
  height = 240,
  className,
  showValue = true,
  tone = "brand",
}: LineChartProps) {
  const reduce = useReducedMotion()
  const gradientId = useId()

  const geometry = useMemo(() => {
    const values = data.map((d) => d.value)
    const rawMin = min ?? Math.min(...values)
    const rawMax = max ?? Math.max(...values)
    const lower = Math.floor(rawMin / step) * step
    const upper = Math.ceil(rawMax / step) * step
    const range = upper - lower || step

    const padTop = 24
    const padBottom = 34
    const padLeft = 8
    const padRight = 8
    const plotH = height - padTop - padBottom
    const plotW = VIEW_W - padLeft - padRight

    const points = data.map((point, i) => {
      const x = padLeft + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW)
      const y = padTop + plotH - ((point.value - lower) / range) * plotH
      return { ...point, x, y }
    })

    const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")
    const area = `${line} L${points[points.length - 1]?.x.toFixed(1) ?? 0} ${padTop + plotH} L${points[0]?.x.toFixed(1) ?? 0} ${padTop + plotH} Z`

    const ticks = Array.from({ length: Math.round(range / step) + 1 }, (_, i) => lower + i * step)

    return { points, line, area, ticks, lower, upper }
  }, [data, height, max, min, step])

  const stroke = TONE_STROKE[tone]

  return (
    <div className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${VIEW_W} ${height}`} className="h-auto w-full overflow-visible" role="img" aria-label="Biểu đồ tiến bộ điểm theo thời gian">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        {geometry.ticks.map((tick) => {
          const y = 24 + (height - 24 - 34) - ((tick - geometry.lower) / (geometry.upper - geometry.lower)) * (height - 24 - 34)
          return (
            <g key={tick}>
              <line x1={8} x2={VIEW_W - 8} y1={y} y2={y} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="4 6" />
              <text x={VIEW_W - 2} y={y - 6} textAnchor="end" fontSize={11} fill="#94a3b8">
                {tick}
                {unit}
              </text>
            </g>
          )
        })}

        <motion.path
          d={geometry.area}
          fill={`url(#${gradientId})`}
          initial={reduce ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, delay: 0.35 }}
        />

        <motion.path
          d={geometry.line}
          fill="none"
          stroke={stroke}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />

        {geometry.points.map((point, i) => (
          <g key={point.label}>
            <motion.circle
              cx={point.x}
              cy={point.y}
              r={5}
              fill="#ffffff"
              stroke={stroke}
              strokeWidth={3}
              initial={reduce ? false : { scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.4, delay: 0.5 + i * 0.08, ease: "backOut" }}
              style={{ transformOrigin: `${point.x}px ${point.y}px` }}
            />
            {showValue && (
              <motion.text
                x={point.x}
                y={point.y - 14}
                textAnchor="middle"
                fontSize={12}
                fontWeight={700}
                fill="#1e293b"
                initial={reduce ? false : { opacity: 0, y: point.y - 8 }}
                whileInView={{ opacity: 1, y: point.y - 14 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.4, delay: 0.6 + i * 0.08 }}
              >
                {point.value}
                {unit}
              </motion.text>
            )}
            <text x={point.x} y={height - 12} textAnchor="middle" fontSize={11} fill="#64748b">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

export { LineChart, type LineChartProps }