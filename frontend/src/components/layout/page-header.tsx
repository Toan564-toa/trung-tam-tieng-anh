import type { ReactNode } from "react"
import { Reveal } from "@/components/motion/reveal"

type PageHeaderProps = {
  eyebrow?: string
  title: string
  description?: ReactNode
  actions?: ReactNode
  className?: string
}

/** Tiêu đề trang dùng chung cho khu vực học viên / giáo viên / nhân viên. */
function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <Reveal className={className}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1.5 text-xs font-bold tracking-wider text-brand-hover uppercase">{eyebrow}</p>
          )}
          <h1 className="font-heading text-2xl font-extrabold text-ink sm:text-3xl">{title}</h1>
          {description && <p className="mt-2 text-sm text-ink-soft">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </Reveal>
  )
}

export { PageHeader, type PageHeaderProps }