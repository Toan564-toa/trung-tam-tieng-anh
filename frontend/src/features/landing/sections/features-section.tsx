import { motion } from "framer-motion"
import { Stagger, StaggerItem } from "@/components/motion/reveal"
import { SectionTitle } from "@/components/ui/section-title"
import { FEATURES } from "@/data/landing"

export function FeaturesSection() {
  return (
    <section className="section relative overflow-hidden">
      <div className="pointer-events-none absolute top-20 -left-32 size-80 rounded-full bg-brand/15 blur-3xl" aria-hidden="true" />
      <div className="container-page relative">
        <SectionTitle
          eyebrow="Vì sao chọn chúng tôi"
          title="6 lý do phụ huynh & học viên tin tưởng"
          description="Chúng tôi không chỉ dạy ngôn ngữ – chúng tôi xây dựng sự tự tin và niềm yêu thích học tập."
        />
        <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ title, desc, icon: Icon, color }) => (
            <StaggerItem key={title}>
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="group h-full rounded-2xl border border-slate-100 bg-white p-7 shadow-soft transition-shadow hover:shadow-lift"
              >
                <span className={`mb-5 flex size-14 items-center justify-center rounded-2xl ${color} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}>
                  <Icon className="size-7" />
                </span>
                <h3 className="mb-2 text-lg font-bold">{title}</h3>
                <p className="leading-relaxed text-ink-soft">{desc}</p>
              </motion.div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
