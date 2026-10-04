import * as React from "react"
import { cn } from "cn"
import { Label } from "@/components/ui/label"

type FormFieldProps = {
  id: string
  label: string
  required?: boolean
  error?: string
  hint?: React.ReactNode
  className?: string
  children: React.ReactNode
}

function FormField({ id, label, required, error, hint, className, children }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-danger">*</span>}
        </Label>
        {hint}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export { FormField }
