import * as React from "react"
import { cn } from "cn"
import { Reveal } from "@/components/motion/reveal"

type SectionTitleProps = {
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  align?: "left" | "center"
  tone?: "light" | "dark"
  className?: string
}

function SectionTitle({
  eyebrow,
  title,
  description,
  align = "center",
  tone = "light",
  className,
}: SectionTitleProps) {
  const centered = align === "center"
  return (
    <Reveal
      className={cn(
        "mb-12 flex max-w-2xl flex-col gap-4",
        centered && "mx-auto items-center text-center",
        className
      )}
    >
      {eyebrow && (
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-xs font-bold tracking-wider text-amber-800 uppercase">
          <span className="size-1.5 rounded-full bg-brand-hover" />
          {eyebrow}
        </span>
      )}
      <h2
        className={cn(
          "text-3xl leading-tight font-extrabold sm:text-4xl",
          tone === "dark" ? "text-white" : "text-ink"
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "text-base leading-relaxed sm:text-lg",
            tone === "dark" ? "text-slate-300" : "text-ink-soft"
          )}
        >
          {description}
        </p>
      )}
    </Reveal>
  )
}

/** Highlights a word inside a heading with a yellow marker underline. */
function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block whitespace-nowrap">
      <span className="relative z-10">{children}</span>
      <span className="absolute inset-x-0 bottom-1 -z-0 h-3 rounded-full bg-brand/60 sm:h-4" />
    </span>
  )
}

export { SectionTitle, Highlight }
