import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import { LogIn, Menu, PhoneCall, X } from "lucide-react"
import { cn } from "cn"
import { Logo } from "@/components/common/logo"
import { buttonVariants } from "@/components/ui/button"
import { NAV_LINKS, SITE } from "@/config/site"

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-all duration-300",
        scrolled ? "border-b border-slate-100 bg-white/85 shadow-soft backdrop-blur-lg" : "bg-cream"
      )}
    >
      <div className="container-page flex h-18 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Menu chính">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group relative rounded-full px-3.5 py-2 text-sm font-medium text-ink/80 transition-colors hover:text-ink"
            >
              {link.label}
              <span className="absolute inset-x-3.5 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-brand transition-transform duration-300 group-hover:scale-x-100" />
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link to="/dang-nhap" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <LogIn /> Đăng nhập
          </Link>
          <a href="#dang-ky" className={buttonVariants({ variant: "primary", size: "sm" })}>
            <PhoneCall /> Đăng ký tư vấn
          </a>
        </div>

        <button
          type="button"
          className="flex size-11 items-center justify-center rounded-full text-ink hover:bg-brand-soft lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Đóng menu" : "Mở menu"}
          aria-expanded={open}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-slate-100 bg-white lg:hidden"
          >
            <nav className="container-page flex flex-col gap-1 py-4" aria-label="Menu di động">
              {NAV_LINKS.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i }}
                  className="rounded-xl px-4 py-3 font-medium text-ink hover:bg-cream"
                >
                  {link.label}
                </motion.a>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Link to="/dang-nhap" className={buttonVariants({ variant: "outline" })}>
                  <LogIn /> Đăng nhập
                </Link>
                <a href="#dang-ky" onClick={() => setOpen(false)} className={buttonVariants({ variant: "primary" })}>
                  Đăng ký tư vấn
                </a>
              </div>
              <a href={SITE.phoneHref} className="mt-3 text-center text-sm text-ink-soft">
                Hotline: <span className="font-semibold text-ink">{SITE.phone}</span>
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
