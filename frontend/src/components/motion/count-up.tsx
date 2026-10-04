import { useEffect, useRef } from "react"
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "framer-motion"

type CountUpProps = {
  to: number
  suffix?: string
  duration?: number
  className?: string
}

const formatter = new Intl.NumberFormat("vi-VN")

function CountUp({ to, suffix = "", duration = 2, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduce = useReducedMotion()
  const value = useMotionValue(0)
  const display = useTransform(value, (v) => `${formatter.format(Math.round(v))}${suffix}`)

  useEffect(() => {
    if (!inView) return
    if (reduce) {
      value.set(to)
      return
    }
    const controls = animate(value, to, { duration, ease: "easeOut" })
    return () => controls.stop()
  }, [inView, to, duration, reduce, value])

  return (
    <motion.span ref={ref} className={className}>
      {display}
    </motion.span>
  )
}

export { CountUp }
