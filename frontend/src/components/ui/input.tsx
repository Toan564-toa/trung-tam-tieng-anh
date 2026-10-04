import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

const fieldBase =
  "w-full min-w-0 rounded-xl border border-input bg-white px-4 text-base text-ink transition-all outline-none placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/25 disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-60 aria-invalid:border-danger aria-invalid:ring-4 aria-invalid:ring-danger/15 md:text-sm"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(fieldBase, "h-12", className)}
      {...props}
    />
  )
}

export { Input, fieldBase }
