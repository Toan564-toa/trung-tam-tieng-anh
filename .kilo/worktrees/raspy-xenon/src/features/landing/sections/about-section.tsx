import { Check } from "lucide-react"
import { SmartImage } from "@/components/common/smart-image"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { SectionTitle } from "@/components/ui/section-title"
import { SITE } from "@/config/site"
import { ABOUT_PHOTOS, ABOUT_VALUES } from "@/data/landing"

const POINTS = ["Cơ sở vật chất hiện đại, phòng học tiêu chuẩn", "Giáo trình chuẩn Cambridge & Oxford", "Chăm sóc học viên tận tình 1–1"]

export function AboutSection() {
  return (
    <section id="gioi-thieu" className="section">
      <div className="container-page grid items-center gap-14 lg:grid-cols-2">
        <Stagger className="grid grid-cols-2 gap-4">
          {ABOUT_PHOTOS.map((photo, i) => (
            <StaggerItem key={photo.alt} className={i % 2 === 1 ? "translate-y-8" : ""}>
              <SmartImage
                src={photo.src}
                alt={photo.alt}
                className="aspect-[4/5] rounded-2xl shadow-soft"
                imgClassName="transition-transform duration-700 hover:scale-105"
              />
            </StaggerItem>
          ))}
        </Stagger>

        <div>
          <SectionTitle
            align="left"
            eyebrow="Về chúng tôi"
            title={<>Hơn 10 năm thắp sáng đam mê ngoại ngữ</>}
            description={`${SITE.name} được thành lập năm 2016 bởi những giáo viên trẻ yêu nghề, với mong muốn mang đến một môi trường học ngoại ngữ thân thiện, hiệu quả và truyền cảm hứng cho học viên Việt Nam.`}
            className="mb-8"
          />
          <Reveal delay={0.1}>
            <ul className="mb-8 flex flex-col gap-3">
              {POINTS.map((p) => (
                <li key={p} className="flex items-center gap-3 font-medium text-ink">
                  <span className="flex size-6 items-center justify-center rounded-full bg-brand text-ink"><Check className="size-3.5" /></span>
                  {p}
                </li>
              ))}
            </ul>
          </Reveal>
          <Stagger className="grid gap-4 sm:grid-cols-3">
            {ABOUT_VALUES.map(({ icon: Icon, title, desc }) => (
              <StaggerItem key={title} className="rounded-2xl bg-surface p-5">
                <Icon className="mb-3 size-6 text-sky-accent" />
                <h3 className="mb-1 font-bold">{title}</h3>
                <p className="text-sm leading-relaxed text-ink-soft">{desc}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  )
}
