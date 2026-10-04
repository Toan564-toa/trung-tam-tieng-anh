import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        brand: "bg-brand-soft text-amber-800",
        info: "bg-sky-100 text-sky-700",
        success: "bg-green-100 text-success",
        warning: "bg-orange-100 text-warning",
        danger: "bg-red-100 text-danger",
        neutral: "bg-slate-100 text-ink-soft",
        dark: "bg-ink text-white",
      },
    },
    defaultVariants: {
      variant: "brand",
    },
  }
)

function Badge({
  className,
  variant,
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      { className: cn(badgeVariants({ variant }), className) },
      props
    ),
    render,
    state: { slot: "badge", variant },
  })
}

export { Badge, badgeVariants }
