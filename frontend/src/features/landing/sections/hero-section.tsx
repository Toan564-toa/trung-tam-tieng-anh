import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { ArrowRight, CalendarDays, PlayCircle, Star, Trophy } from "lucide-react"
import { SmartImage } from "@/components/common/smart-image"
import { EASE } from "@/components/motion/reveal"
import { buttonVariants } from "@/components/ui/button"
import { Highlight } from "@/components/ui/section-title"
import { HERO_IMAGE, TESTIMONIALS } from "@/data/landing"

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: EASE, delay },
})

export function HeroSection() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] })
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 60])
  const shapesY = useTransform(scrollYProgress, [0, 1], [0, -80])

  return (
    <section id="trang-chu" ref={ref} className="relative overflow-hidden bg-cream pt-10 pb-24 sm:pt-14 lg:pb-32">
      <motion.div style={{ y: shapesY }} className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-20 -left-20 size-72 rounded-full bg-brand/25 blur-3xl" />
        <div className="absolute top-1/3 -right-24 size-80 rounded-full bg-sky-accent/15 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 size-4 rotate-12 rounded bg-sky-accent/60" />
        <div className="absolute top-24 left-[46%] size-3 rounded-full bg-brand-hover" />
      </motion.div>

      <div className="container-page relative grid items-center gap-14 lg:grid-cols-2">
        <div className="flex flex-col items-start gap-6">
          <motion.span {...fadeUp(0)} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-soft">
            <span className="flex size-6 items-center justify-center rounded-full bg-brand text-ink"><CalendarDays className="size-3.5" /></span>
            Khai giảng khóa mới tháng 10/2026
          </motion.span>

          <motion.h1 {...fadeUp(0.1)} className="text-4xl leading-[1.15] font-extrabold sm:text-5xl lg:text-6xl">
            Học ngoại ngữ thật <Highlight>vui</Highlight>, tự tin <span className="text-sky-accent">vươn xa</span>
          </motion.h1>

          <motion.p {...fadeUp(0.2)} className="max-w-xl text-lg leading-relaxed text-ink-soft">
            Lộ trình 8 tháng rõ ràng, lớp học sĩ số nhỏ cùng đội ngũ giáo viên tận tâm giúp học viên mọi lứa tuổi giao tiếp tự nhiên và đạt mục tiêu.
          </motion.p>

          <motion.div {...fadeUp(0.3)} className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <a href="#dang-ky" className={buttonVariants({ size: "lg" })}>
              Đăng ký học thử miễn phí <ArrowRight className="size-5" />
            </a>
            <a href="#khoa-hoc" className={buttonVariants({ variant: "outline", size: "lg" })}>
              <PlayCircle className="size-5 text-sky-accent" /> Xem lộ trình học
            </a>
          </motion.div>

          <motion.div {...fadeUp(0.4)} className="flex items-center gap-4 pt-2">
            <div className="flex -space-x-3">
              {TESTIMONIALS.map((t) => (
                <img key={t.name} src={t.avatar} alt="" className="size-10 rounded-full border-2 border-white object-cover" />
              ))}
            </div>
            <div className="text-sm">
              <div className="flex items-center gap-0.5 text-brand-hover">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="size-4 fill-current" />)}
                <span className="ml-1 font-bold text-ink">4.9/5</span>
              </div>
              <p className="text-ink-soft">từ hơn 3.500 học viên & phụ huynh</p>
            </div>
          </motion.div>
        </div>

        <HeroVisual imageY={imageY} />
      </div>
    </section>
  )
}

function HeroVisual({ imageY }: { imageY: ReturnType<typeof useTransform<number, number>> }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
      className="relative mx-auto w-full max-w-md lg:max-w-lg"
    >
      <div className="absolute inset-4 -rotate-6 rounded-[2.5rem] bg-brand" aria-hidden="true" />
      <div className="absolute inset-4 rotate-3 rounded-[2.5rem] border-2 border-dashed border-sky-accent/50" aria-hidden="true" />
      <motion.div style={{ y: imageY }} className="relative">
        <SmartImage src={HERO_IMAGE} alt="Học viên vui vẻ trong lớp học" className="aspect-[4/5] rounded-[2.5rem] shadow-lift" />
      </motion.div>

      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-10 -left-4 flex items-center gap-3 rounded-2xl bg-white p-3 pr-5 shadow-lift sm:-left-10"
      >
        <span className="flex size-11 items-center justify-center rounded-xl bg-green-100 text-success"><Trophy className="size-5" /></span>
        <div>
          <p className="font-heading text-lg leading-none font-extrabold text-ink">98%</p>
          <p className="text-xs text-ink-soft">đạt mục tiêu đầu ra</p>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute -right-2 bottom-12 rounded-2xl bg-white p-4 shadow-lift sm:-right-8"
      >
        <p className="text-xs font-semibold text-ink-soft">Lớp tiếp theo</p>
        <p className="font-heading font-bold text-ink">A2 · Thứ 2 & 6</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-3/4 rounded-full bg-brand" />
          </div>
          <span className="text-xs font-semibold text-warning">Còn 3 chỗ</span>
        </div>
      </motion.div>

      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        className="absolute -top-4 right-6 size-16 rounded-full border-[6px] border-sky-accent/70 border-t-transparent"
        aria-hidden="true"
      />
    </motion.div>
  )
}
