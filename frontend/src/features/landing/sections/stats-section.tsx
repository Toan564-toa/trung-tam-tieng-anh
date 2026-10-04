import { CountUp } from "@/components/motion/count-up"
import { Stagger, StaggerItem } from "@/components/motion/reveal"
import { STATS } from "@/data/landing"

export function StatsSection() {
  return (
    <section aria-label="Thống kê" className="relative z-10 -mt-16">
      <div className="container-page">
        <Stagger className="grid grid-cols-2 gap-4 rounded-3xl bg-white p-4 shadow-lift sm:p-6 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-slate-100">
          {STATS.map(({ label, value, suffix, icon: Icon }) => (
            <StaggerItem key={label} className="flex flex-col items-center gap-2 rounded-2xl p-4 text-center lg:rounded-none">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-amber-700">
                <Icon className="size-6" />
              </span>
              <CountUp to={value} suffix={suffix} className="font-heading text-3xl font-extrabold text-ink sm:text-4xl" />
              <p className="text-sm font-medium text-ink-soft">{label}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
