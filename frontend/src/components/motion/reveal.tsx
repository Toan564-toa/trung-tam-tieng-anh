import * as React from "react"
import { motion, useReducedMotion, type Variants } from "framer-motion"

const EASE = [0.22, 1, 0.36, 1] as const

type Direction = "up" | "down" | "left" | "right" | "none"

const offset: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 28 },
  down: { x: 0, y: -28 },
  left: { x: 28, y: 0 },
  right: { x: -28, y: 0 },
  none: { x: 0, y: 0 },
}

type RevealProps = {
  children: React.ReactNode
  className?: string
  delay?: number
  direction?: Direction
  as?: "div" | "li" | "section"
}

/** Fades content in when it scrolls into view. */
function Reveal({ children, className, delay = 0, direction = "up", as = "div" }: RevealProps) {
  const reduce = useReducedMotion()
  const MotionTag = motion[as]
  const { x, y } = reduce ? offset.none : offset[direction]
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </MotionTag>
  )
}

const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
}

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
}

/** Container whose `StaggerItem` children animate in one after another. */
function Stagger({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
    >
      {children}
    </motion.div>
  )
}

function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  )
}

export { Reveal, Stagger, StaggerItem, EASE }
