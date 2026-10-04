import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border border-transparent font-semibold whitespace-nowrap transition-all duration-200 outline-none select-none focus-visible:ring-4 focus-visible:ring-brand/40 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-danger [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-ink shadow-glow hover:-translate-y-0.5 hover:bg-brand-hover",
        secondary:
          "bg-sky-accent text-white shadow-soft hover:-translate-y-0.5 hover:bg-sky-600",
        outline:
          "border-ink/15 bg-white text-ink hover:border-brand hover:bg-cream",
        ghost: "text-ink hover:bg-cream",
        dark: "bg-ink text-white hover:bg-slate-700",
        danger: "bg-danger text-white hover:bg-red-700",
        link: "rounded-none px-0 text-sky-accent underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-6 text-sm",
        lg: "h-13 px-8 text-base",
        icon: "size-10",
      },
      block: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

type ButtonProps = ButtonPrimitive.Props & VariantProps<typeof buttonVariants>

function Button({ className, variant, size, block, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants, type ButtonProps }
