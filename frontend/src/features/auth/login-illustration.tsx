import { motion } from "framer-motion"
import { BookOpen, CalendarCheck, MessageCircle, Star } from "lucide-react"
import { SmartImage } from "@/components/common/smart-image"
import { HERO_IMAGE } from "@/data/landing"

const floatAnim = (delay: number, distance = 10) => ({
  animate: { y: [0, -distance, 0] },
  transition: { duration: 4.5, repeat: Infinity, ease: "easeInOut" as const, delay },
})

export function LoginIllustration() {
  return (
    <div className="relative hidden overflow-hidden bg-brand lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-12">
      <div className="absolute -top-24 -right-24 size-96 rounded-full bg-white/25" aria-hidden="true" />
      <div className="absolute -bottom-32 -left-16 size-80 rounded-full bg-brand-hover/50" aria-hidden="true" />
      <div className="absolute top-16 left-16 size-20 rounded-3xl border-[6px] border-white/40 rotate-12" aria-hidden="true" />
      <motion.div
        className="absolute right-20 bottom-24 size-6 rounded-full bg-sky-accent"
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md">
        <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }}>
          <SmartImage src={HERO_IMAGE} alt="Học viên trong lớp học" className="aspect-[4/4.4] rounded-[2rem] border-8 border-white shadow-lift" />
        </motion.div>

        <motion.div {...floatAnim(0)} className="absolute top-8 -left-12 flex items-center gap-3 rounded-2xl bg-white p-3 pr-4 shadow-lift">
          <span className="flex size-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><CalendarCheck className="size-5" /></span>
          <div>
            <p className="text-xs text-ink-soft">Buổi học hôm nay</p>
            <p className="text-sm font-bold text-ink">18:00 · Phòng A2</p>
          </div>
        </motion.div>

        <motion.div {...floatAnim(0.8, 12)} className="absolute -right-10 bottom-28 flex items-center gap-3 rounded-2xl bg-white p-3 pr-4 shadow-lift">
          <span className="flex size-10 items-center justify-center rounded-xl bg-green-100 text-success"><BookOpen className="size-5" /></span>
          <div>
            <p className="text-xs text-ink-soft">Bài tập đã nộp</p>
            <p className="text-sm font-bold text-ink">12/12 bài ✓</p>
          </div>
        </motion.div>

        <motion.div {...floatAnim(1.4, 8)} className="absolute -bottom-6 left-10 flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-lift">
          <MessageCircle className="size-4 text-brand" /> “Giỏi lắm! Phát âm rất chuẩn”
          <Star className="size-4 fill-brand text-brand" />
        </motion.div>
      </div>

      <div className="relative mt-16 max-w-md text-center">
        <h2 className="text-2xl font-extrabold text-ink">Học tập mọi lúc, theo dõi mọi nơi</h2>
        <p className="mt-2 text-ink/75">Xem lịch học, bài tập, kết quả và nhận xét của giáo viên – tất cả trong một nơi.</p>
      </div>
    </div>
  )
}
