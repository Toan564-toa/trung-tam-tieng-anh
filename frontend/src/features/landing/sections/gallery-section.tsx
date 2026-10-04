import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Expand, X } from "lucide-react"
import { cn } from "cn"
import { SmartImage } from "@/components/common/smart-image"
import { Stagger, StaggerItem } from "@/components/motion/reveal"
import { SectionTitle } from "@/components/ui/section-title"
import { GALLERY } from "@/data/landing"

const SPANS = ["md:col-span-2 md:row-span-2", "", "", "md:col-span-2", "md:col-span-2", "md:col-span-2"]

export function GallerySection() {
  const [active, setActive] = useState<number | null>(null)
  const current = active === null ? null : GALLERY[active]

  return (
    <section className="section bg-surface">
      <div className="container-page">
        <SectionTitle eyebrow="Thư viện ảnh" title="Khoảnh khắc đáng nhớ" description="Những giờ học sôi nổi, hoạt động ngoại khóa và ngày hội đầy màu sắc." />
        <Stagger className="grid auto-rows-[160px] grid-cols-2 gap-4 sm:auto-rows-[200px] md:grid-cols-4">
          {GALLERY.map((photo, i) => (
            <StaggerItem key={photo.src} className={cn("h-full", SPANS[i])}>
              <button
                type="button"
                onClick={() => setActive(i)}
                className="group relative block size-full cursor-zoom-in overflow-hidden rounded-2xl shadow-soft"
                aria-label={`Xem ảnh: ${photo.alt}`}
              >
                <SmartImage src={photo.src} alt={photo.alt} className="size-full" imgClassName="transition-transform duration-700 group-hover:scale-110" />
                <span className="absolute inset-0 flex items-end bg-gradient-to-t from-ink/70 via-transparent to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span className="flex w-full items-center justify-between text-sm font-semibold text-white">
                    {photo.alt} <Expand className="size-4" />
                  </span>
                </span>
              </button>
            </StaggerItem>
          ))}
        </Stagger>
      </div>

      <AnimatePresence>
        {current && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/85 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActive(null)}
            role="dialog"
            aria-modal="true"
            aria-label={current.alt}
          >
            <motion.img
              src={current.src.replace(/w=\d+/, "w=1600")}
              alt={current.alt}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-lift"
            />
            <button type="button" aria-label="Đóng" className="absolute top-5 right-5 flex size-11 items-center justify-center rounded-full bg-white text-ink">
              <X className="size-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
