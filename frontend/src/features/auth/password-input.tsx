import { useState } from "react"
import { Eye, EyeOff, Lock } from "lucide-react"
import { cn } from "cn"
import { Input } from "@/components/ui/input"

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type"> & { tone?: "light" | "dark" }

export function PasswordInput({ className, tone = "light", ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Lock className={cn("pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2", tone === "dark" ? "text-slate-500" : "text-slate-400")} />
      <Input type={visible ? "text" : "password"} className={cn("px-11", className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className={cn(
          "absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full transition-colors",
          tone === "dark" ? "text-slate-400 hover:bg-white/10 hover:text-white" : "text-ink-soft hover:bg-cream hover:text-ink"
        )}
        aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
      </button>
    </div>
  )
}
