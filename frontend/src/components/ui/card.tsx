import * as React from "react"
import { cn } from "cn"

function Card({
  className,
  hoverable = false,
  ...props
}: React.ComponentProps<"div"> & { hoverable?: boolean }) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-card text-card-foreground shadow-soft",
        hoverable &&
          "transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lift",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5 p-6 pb-0", className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn("font-heading text-lg leading-snug font-bold text-ink", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm leading-relaxed text-ink-soft", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-content" className={cn("p-6", className)} {...props} />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center gap-3 border-t border-slate-100 px-6 py-4", className)}
      {...props}
    />
  )
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
