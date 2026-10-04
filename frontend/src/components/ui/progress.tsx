import * as React from "react"
import { motion, useReducedMotion } from "framer-motion"
import { cn } from "cn"

type ProgressTone = "brand" | "success" | "warning" | "danger" | "sky"

const TONE_BAR: Record<ProgressTone, string> = {
  brand: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  sky: "bg-sky-accent",
}

type ProgressProps = {
  /** Giá trị hiện tại. */
  value: number
  max?: number
  tone?: ProgressTone
  /** Độ dày thanh. */
  size?: "sm" | "md" | "lg"
  label?: React.ReactNode
  valueLabel?: React.ReactNode
  className?: string
  /** Ẩn phần trăm bên phải. */
  hideValue?: boolean
}

/** Thanh tiến độ dùng chung cho khu vực học viên / giáo viên / nhân viên. */
function Progress({
  value,
  max = 100,
  tone = "brand",
  size = "md",
  label,
  valueLabel,
  className,
  hideValue,
}: ProgressProps) {
  const reduce = useReducedMotion()
  const percent = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {(label || !hideValue) && (
        <div className="flex items-center justify-between gap-3 text-sm">
          {label && <span className="font-medium text-ink">{label}</span>}
          {!hideValue && (
            <span className="font-heading font-bold text-ink tabular-nums">
              {valueLabel ?? `${Math.round(percent)}%`}
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn(
          "w-full overflow-hidden rounded-full bg-slate-100",
          size === "sm" && "h-1.5",
          size === "md" && "h-2.5",
          size === "lg" && "h-3.5",
        )}
      >
        <motion.div
          className={cn("h-full rounded-full", TONE_BAR[tone])}
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={reduce ? { duration: 0 } : { duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  )
}

export { Progress, type ProgressProps }