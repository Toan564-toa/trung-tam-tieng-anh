import { motion } from "framer-motion"
import { Phone } from "lucide-react"
import { ZaloIcon } from "@/components/icons/social"
import { SITE } from "@/config/site"

export function FloatingContact() {
  return (
    <div className="fixed right-4 bottom-4 z-30 flex flex-col gap-3 sm:right-6 sm:bottom-6">
      <motion.a
        href={SITE.zaloHref}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat Zalo"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, type: "spring", stiffness: 260, damping: 18 }}
        whileHover={{ scale: 1.08 }}
        className="flex size-13 items-center justify-center rounded-full bg-white text-[#0068FF] shadow-lift ring-1 ring-slate-100"
      >
        <ZaloIcon className="size-9" />
      </motion.a>
      <motion.a
        href={SITE.phoneHref}
        aria-label={`Gọi ${SITE.phone}`}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1.15, type: "spring", stiffness: 260, damping: 18 }}
        whileHover={{ scale: 1.08 }}
        className="relative flex size-13 items-center justify-center rounded-full bg-brand text-ink shadow-glow"
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-brand/60 [animation-duration:2s]" />
        <Phone className="relative size-5.5" />
      </motion.a>
    </div>
  )
}
