import { Swiper, SwiperSlide } from "swiper/react"
import { Autoplay, Pagination } from "swiper/modules"
import { Quote, Star } from "lucide-react"
import { Reveal } from "@/components/motion/reveal"
import { SectionTitle } from "@/components/ui/section-title"
import { TESTIMONIALS } from "@/data/landing"
import "swiper/css"
import "swiper/css/pagination"

export function TestimonialsSection() {
  return (
    <section className="section relative overflow-hidden bg-ink">
      <div className="pointer-events-none absolute -top-24 right-0 size-96 rounded-full bg-brand/15 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-0 -left-20 size-72 rounded-full bg-sky-accent/20 blur-3xl" aria-hidden="true" />
      <div className="container-page relative">
        <SectionTitle
          tone="dark"
          eyebrow="Cảm nhận học viên"
          title="Niềm vui của học viên là động lực của chúng tôi"
          description="Hàng nghìn phụ huynh và học viên đã tin tưởng đồng hành cùng trung tâm."
        />
        <Reveal>
          <Swiper
            modules={[Autoplay, Pagination]}
            className="swiper-brand !pb-12"
            spaceBetween={24}
            slidesPerView={1}
            loop
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            pagination={{ clickable: true }}
            breakpoints={{ 768: { slidesPerView: 2 }, 1200: { slidesPerView: 3 } }}
          >
            {TESTIMONIALS.map((t) => (
              <SwiperSlide key={t.name} className="!h-auto">
                <figure className="flex h-full flex-col gap-5 rounded-2xl bg-white/[0.06] p-7 ring-1 ring-white/10 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-0.5 text-brand">
                      {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="size-4 fill-current" />)}
                    </div>
                    <Quote className="size-8 text-brand/40" />
                  </div>
                  <blockquote className="flex-1 leading-relaxed text-slate-200">“{t.quote}”</blockquote>
                  <figcaption className="flex items-center gap-3">
                    <img src={t.avatar} alt={t.name} className="size-12 rounded-full object-cover ring-2 ring-brand" loading="lazy" />
                    <div>
                      <p className="font-heading font-bold text-white">{t.name}</p>
                      <p className="text-sm text-slate-400">{t.role}</p>
                    </div>
                  </figcaption>
                </figure>
              </SwiperSlide>
            ))}
          </Swiper>
        </Reveal>
      </div>
    </section>
  )
}
