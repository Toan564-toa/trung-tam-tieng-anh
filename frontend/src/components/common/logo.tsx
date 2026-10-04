import { Link } from "react-router-dom"
import { GraduationCap } from "lucide-react"
import { cn } from "cn"
import { SITE } from "@/config/site"

type LogoProps = {
  to?: string
  tone?: "light" | "dark"
  className?: string
  subtitle?: string
}

function Logo({ to = "/", tone = "light", className, subtitle = "Trung tâm Ngoại ngữ" }: LogoProps) {
  return (
    <Link to={to} className={cn("group flex items-center gap-2.5", className)} aria-label={SITE.name}>
      <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-ink shadow-glow transition-transform duration-300 group-hover:-rotate-6">
        <GraduationCap className="size-6" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className={cn("font-heading text-base font-extrabold", tone === "dark" ? "text-white" : "text-ink")}>
          {SITE.name}
        </span>
        <span className={cn("text-[11px] font-medium", tone === "dark" ? "text-slate-400" : "text-ink-soft")}>
          {subtitle}
        </span>
      </span>
    </Link>
  )
}

export { Logo }
