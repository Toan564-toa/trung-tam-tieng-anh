import { useState, type FormEvent } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { AlertCircle, Check, KeyRound, Loader2, LogOut, X } from "lucide-react"
import { cn } from "cn"
import { Logo } from "@/components/common/logo"
import { EASE } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { toast } from "@/components/ui/toast"
import { PasswordInput } from "@/features/auth/password-input"
import { useAuth } from "@/lib/auth/auth-context"
import { ROLE_META } from "@/lib/auth/roles"

const RULES = [
  { label: "Tối thiểu 8 ký tự", test: (p: string) => p.length >= 8 },
  { label: "Có chữ hoa và chữ thường", test: (p: string) => /[A-Z]/.test(p) && /[a-z]/.test(p) },
  { label: "Có ít nhất 1 chữ số", test: (p: string) => /\d/.test(p) },
  { label: "Có ký tự đặc biệt (!@#$...)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

const STRENGTH = [
  { label: "Rất yếu", color: "bg-danger", text: "text-danger" },
  { label: "Yếu", color: "bg-danger", text: "text-danger" },
  { label: "Trung bình", color: "bg-warning", text: "text-warning" },
  { label: "Khá", color: "bg-sky-accent", text: "text-sky-accent" },
  { label: "Mạnh", color: "bg-success", text: "text-success" },
]

export function ChangePasswordPage() {
  const { user, changePassword, logout } = useAuth()
  const navigate = useNavigate()
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!user) return <Navigate to="/dang-nhap" replace />

  const passed = RULES.filter((r) => r.test(next)).length
  const strength = STRENGTH[next ? passed : 0]
  const mismatch = confirm.length > 0 && confirm !== next
  const isFirstLogin = user.mustChangePassword

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!current) return setError("Vui lòng nhập mật khẩu hiện tại (mật khẩu tạm được cấp).")
    if (passed < RULES.length) return setError("Mật khẩu mới chưa đáp ứng đủ yêu cầu bảo mật.")
    if (next !== confirm) return setError("Xác nhận mật khẩu không khớp.")
    setError(null)
    setSubmitting(true)
    const result = await changePassword(current, next)
    setSubmitting(false)
    if (!result.ok) return setError(result.error)
    toast.success("Đổi mật khẩu thành công!", { description: "Bạn có thể bắt đầu sử dụng hệ thống." })
    navigate(ROLE_META[result.user.role].home, { replace: true })
  }

  const onLogout = () => {
    logout()
    navigate(user.role === "admin" ? "/admin/dang-nhap" : "/dang-nhap")
  }

  return (
    <div className="flex min-h-svh flex-col bg-cream">
      <header className="container-page flex items-center justify-between py-5">
        <Logo />
        <Button variant="ghost" size="sm" onClick={onLogout}><LogOut /> Đăng xuất</Button>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-12">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="w-full max-w-lg">
          <Card className="shadow-lift">
            <CardContent className="flex flex-col gap-6 p-7 sm:p-9">
              <div className="flex flex-col items-center gap-3 text-center">
                <motion.span
                  initial={{ rotate: -20, scale: 0.6 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.2 }}
                  className="flex size-16 items-center justify-center rounded-2xl bg-brand text-ink shadow-glow"
                >
                  <KeyRound className="size-8" />
                </motion.span>
                <Badge variant={isFirstLogin ? "warning" : "brand"}>
                  {isFirstLogin ? "Lần đăng nhập đầu tiên" : "Tài khoản cá nhân"}
                </Badge>
                <h1 className="text-2xl font-extrabold">
                  {isFirstLogin ? "Đổi mật khẩu để bảo vệ tài khoản" : "Đổi mật khẩu đăng nhập"}
                </h1>
                <p className="text-sm text-ink-soft">
                  {isFirstLogin ? (
                    <>
                      Xin chào <b className="text-ink">{user.name}</b> ({ROLE_META[user.role].label}). Vì lý do bảo mật, vui lòng
                      thay mật khẩu tạm do trung tâm cấp.
                    </>
                  ) : (
                    <>
                      Xin chào <b className="text-ink">{user.name}</b> ({ROLE_META[user.role].label}). Mật khẩu mới cần đạt đủ yêu
                      cầu bảo mật bên dưới.
                    </>
                  )}
                </p>
              </div>

              <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
                {error && (
                  <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-danger">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
                  </div>
                )}
<FormField id="current-password" label="Mật khẩu hiện tại" required>
              <PasswordInput id="current-password" autoComplete="current-password" placeholder={isFirstLogin ? "Mật khẩu tạm được cấp" : "Nhập mật khẩu hiện tại"} value={current} onChange={(e) => setCurrent(e.target.value)} />
            </FormField>
                <FormField id="new-password" label="Mật khẩu mới" required>
                  <PasswordInput id="new-password" autoComplete="new-password" placeholder="Nhập mật khẩu mới" value={next} onChange={(e) => setNext(e.target.value)} />
                </FormField>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-1.5">
                    {RULES.map((_, i) => (
                      <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <motion.div className={cn("h-full rounded-full", strength.color)} initial={false} animate={{ width: i < passed ? "100%" : "0%" }} transition={{ duration: 0.3 }} />
                      </div>
                    ))}
                  </div>
                  {next && <p className={cn("text-xs font-semibold", strength.text)}>Độ mạnh: {strength.label}</p>}
                  <ul className="grid gap-1.5 sm:grid-cols-2">
                    {RULES.map((r) => {
                      const ok = r.test(next)
                      return (
                        <li key={r.label} className={cn("flex items-center gap-2 text-xs", ok ? "text-success" : "text-ink-soft")}>
                          {ok ? <Check className="size-3.5" /> : <X className="size-3.5" />} {r.label}
                        </li>
                      )
                    })}
                  </ul>
                </div>
                <FormField id="confirm-password" label="Xác nhận mật khẩu mới" required error={mismatch ? "Mật khẩu xác nhận không khớp." : undefined}>
                  <PasswordInput id="confirm-password" autoComplete="new-password" placeholder="Nhập lại mật khẩu mới" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={mismatch || undefined} />
                </FormField>
                <Button type="submit" size="lg" block disabled={submitting}>
                  {submitting ? <><Loader2 className="size-5 animate-spin" /> Đang cập nhật...</> : "Cập nhật mật khẩu"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  )
}
