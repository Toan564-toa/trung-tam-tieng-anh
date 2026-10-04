import * as React from "react"
import { cn } from "cn"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type ModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  footer?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

function Modal({
  open,
  onOpenChange,
  title,
  description,
  icon,
  footer,
  children,
  className,
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-lift ring-0 sm:max-w-md",
          className
        )}
      >
        <DialogHeader className="items-start gap-3">
          {icon && (
            <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-amber-700">
              {icon}
            </div>
          )}
          <DialogTitle className="text-xl font-bold text-ink">{title}</DialogTitle>
          {description && (
            <DialogDescription className="leading-relaxed text-ink-soft">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        {children}
        {footer && (
          <DialogFooter className="mx-0 mb-0 rounded-none border-0 bg-transparent p-0">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export { Modal, type ModalProps }
