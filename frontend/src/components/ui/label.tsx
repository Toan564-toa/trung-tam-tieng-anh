import * as React from "react"
import { cn } from "cn"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn("flex items-center gap-1 text-sm font-semibold text-ink select-none", className)}
      {...props}
    />
  )
}

export { Label }
