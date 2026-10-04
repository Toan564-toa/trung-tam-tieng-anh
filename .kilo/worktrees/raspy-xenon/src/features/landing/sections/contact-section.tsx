import { Clock, Mail, MapPin, Navigation, Phone } from "lucide-react"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { buttonVariants } from "@/components/ui/button"
import { SectionTitle } from "@/components/ui/section-title"
import { SITE } from "@/config/site"

const ITEMS = [
  { icon: MapPin, title: "Địa chỉ", content: SITE.address },
  { icon: Phone, title: "Hotline", content: SITE.phone, href: SITE.phoneHref },
  { icon: Mail, title: "Email", content: SITE.email, href: `mailto:${SITE.email}` },
]

export function ContactSection() {
  return (
    <section id="lien-he" className="section bg-surface">
      <div className="container-page">
        <SectionTitle eyebrow="Liên hệ" title="Ghé thăm trung tâm" description="Chúng tôi luôn sẵn sàng chào đón bạn đến tham quan lớp học và trò chuyện trực tiếp." />
        <div className="grid gap-6 lg:grid-cols-5">
          <Stagger className="flex flex-col gap-4 lg:col-span-2">
            {ITEMS.map(({ icon: Icon, title, content, href }) => (
              <StaggerItem key={title} className="flex gap-4 rounded-2xl bg-white p-5 shadow-soft">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-amber-700"><Icon className="size-5" /></span>
                <div>
                  <p className="text-sm font-semibold text-ink-soft">{title}</p>
                  {href ? <a href={href} className="font-semibold text-ink hover:text-amber-600">{content}</a> : <p className="font-semibold text-ink">{content}</p>}
                </div>
              </StaggerItem>
            ))}
            <StaggerItem className="flex gap-4 rounded-2xl bg-white p-5 shadow-soft">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700"><Clock className="size-5" /></span>
              <div className="flex-1">
                <p className="mb-1 text-sm font-semibold text-ink-soft">Giờ mở cửa</p>
                {SITE.openingHours.map((h) => (
                  <p key={h.label} className="flex justify-between gap-4 text-sm"><span className="text-ink">{h.label}</span><span className="font-semibold text-ink">{h.value}</span></p>
                ))}
              </div>
            </StaggerItem>
          </Stagger>

          <Reveal direction="left" className="lg:col-span-3">
            <div className="relative h-full min-h-80 overflow-hidden rounded-2xl bg-sky-50 shadow-soft">
              <div
                className="absolute inset-0 opacity-60"
                style={{ backgroundImage: "linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)", backgroundSize: "40px 40px" }}
                aria-hidden="true"
              />
              <div className="absolute top-1/2 -right-10 -left-10 h-10 -rotate-12 bg-white/90" aria-hidden="true" />
              <div className="absolute top-0 bottom-0 left-1/3 w-8 rotate-6 bg-white/90" aria-hidden="true" />
              <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-full flex-col items-center">
                <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold whitespace-nowrap text-white shadow-lift">{SITE.name}</span>
                <MapPin className="size-12 animate-bounce fill-brand text-ink" />
              </div>
              <div className="absolute right-4 bottom-4 left-4 flex flex-col items-start justify-between gap-3 rounded-2xl bg-white/95 p-4 shadow-soft sm:flex-row sm:items-center">
                <p className="text-sm text-ink-soft">Bản đồ minh họa – sẽ thay bằng Google Maps.</p>
                <a href="https://maps.google.com" target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm", variant: "secondary" })}>
                  <Navigation /> Chỉ đường
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
