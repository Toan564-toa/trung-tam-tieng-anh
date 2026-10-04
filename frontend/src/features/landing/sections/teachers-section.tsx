import { Swiper, SwiperSlide } from "swiper/react"
import { Autoplay, Pagination } from "swiper/modules"
import { BadgeCheck, Briefcase } from "lucide-react"
import { SmartImage } from "@/components/common/smart-image"
import { Reveal } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { SectionTitle } from "@/components/ui/section-title"
import { TEACHERS } from "@/data/landing"
import "swiper/css"
import "swiper/css/pagination"

export function TeachersSection() {
  return (
    <section id="giao-vien" className="section bg-cream">
      <div className="container-page">
        <SectionTitle
          eyebrow="Đội ngũ giáo viên"
          title="Những người truyền cảm hứng mỗi ngày"
          description="Giáo viên được tuyển chọn kỹ lưỡng, đào tạo bài bản về phương pháp và luôn đặt học viên làm trung tâm."
        />
        <Reveal>
          <Swiper
            modules={[Autoplay, Pagination]}
            className="swiper-brand !pb-12"
            spaceBetween={24}
            slidesPerView={1.15}
            loop
            autoplay={{ delay: 3500, disableOnInteraction: false, pauseOnMouseEnter: true }}
            pagination={{ clickable: true }}
            breakpoints={{ 640: { slidesPerView: 2.2 }, 1024: { slidesPerView: 3.2 }, 1280: { slidesPerView: 4 } }}
          >
            {TEACHERS.map((t) => (
              <SwiperSlide key={t.name} className="!h-auto py-2">
                <article className="group h-full overflow-hidden rounded-2xl bg-white shadow-soft transition-shadow hover:shadow-lift">
                  <div className="relative">
                    <SmartImage src={t.photo} alt={t.name} className="aspect-[4/4.2]" imgClassName="transition-transform duration-700 group-hover:scale-105" />
                    <Badge variant="dark" className="absolute bottom-3 left-3"><BadgeCheck />{t.certificate}</Badge>
                  </div>
                  <div className="flex flex-col gap-1.5 p-5">
                    <h3 className="text-lg font-bold">{t.name}</h3>
                    <p className="text-sm font-semibold text-sky-accent">{t.specialty}</p>
                    <p className="flex items-center gap-1.5 text-sm text-ink-soft"><Briefcase className="size-4" />{t.experience}</p>
                  </div>
                </article>
              </SwiperSlide>
            ))}
          </Swiper>
        </Reveal>
      </div>
    </section>
  )
}
