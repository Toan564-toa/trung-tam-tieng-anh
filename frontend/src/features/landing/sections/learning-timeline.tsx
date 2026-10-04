import { motion } from "framer-motion"
import { Flag } from "lucide-react"
import { EASE, Reveal } from "@/components/motion/reveal"
import { LEARNING_PATH } from "@/data/landing"

export function LearningTimeline() {
  return (
    <div className="mt-20">
      <Reveal className="mb-10 text-center">
        <h3 className="text-2xl font-extrabold sm:text-3xl">Hành trình 8 tháng học tập</h3>
        <p className="mt-2 text-ink-soft">Mỗi tháng là một cột mốc, tiến bộ được đo lường rõ ràng.</p>
      </Reveal>

      <div className="relative">
        {/* Desktop: horizontal line */}
        <div className="absolute top-6 right-[6%] left-[6%] hidden h-1 rounded-full bg-slate-200 lg:block" aria-hidden="true">
          <motion.div
            className="h-full origin-left rounded-full bg-gradient-to-r from-brand via-brand-hover to-sky-accent"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 1.6, ease: EASE }}
          />
        </div>
        {/* Mobile: vertical line */}
        <div className="absolute top-0 bottom-0 left-6 w-1 rounded-full bg-slate-200 lg:hidden" aria-hidden="true" />

        <ol className="grid gap-6 lg:grid-cols-8 lg:gap-3">
          {LEARNING_PATH.map((step, i) => {
            const last = i === LEARNING_PATH.length - 1
            return (
              <motion.li
                key={step.month}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.12 * i }}
                className="relative flex gap-4 lg:flex-col lg:items-center lg:text-center"
              >
                <span
                  className={
                    "relative z-10 flex size-13 shrink-0 items-center justify-center rounded-full border-4 border-white font-heading text-sm font-extrabold shadow-soft " +
                    (last ? "bg-sky-accent text-white" : "bg-brand text-ink")
                  }
                >
                  {last ? <Flag className="size-5" /> : `T${step.month}`}
                </span>
                <div className="rounded-2xl bg-white p-4 shadow-soft lg:p-3">
                  <p className="text-xs font-bold text-amber-600">Tháng {step.month}</p>
                  <p className="font-heading text-sm font-bold text-ink">{step.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-soft">{step.desc}</p>
                </div>
              </motion.li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
