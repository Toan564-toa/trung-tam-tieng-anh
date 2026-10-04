import { useState } from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { AlertCircle, ArrowLeft, Loader2, ShieldCheck, User } from "lucide-react"
import { Logo } from "@/components/common/logo"
import { EASE } from "@/components/motion/reveal"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { DemoRolePicker } from "@/features/auth/demo-role-picker"
import { ForgotPasswordModal } from "@/features/auth/forgot-password-modal"
import { PasswordInput } from "@/features/auth/password-input"
import { useLoginForm } from "@/features/auth/use-login-form"

const darkField =
  "border-white/10 bg-white/5 text-white placeholder:text-slate-500 hover:border-white/20 focus-visible:border-brand focus-visible:ring-brand/20"

export function AdminLoginPage() {
  const { identifier, password, errors, submitting, onSubmit, setField } = useLoginForm("admin")
  const [forgotOpen, setForgotOpen] = useState(false)

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-[#0F172A] text-slate-200">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: "radial-gradient(#FBBF24 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-brand/10 blur-3xl" aria-hidden="true" />

      <header className="container-page relative flex items-center justify-between py-6">
        <Logo tone="dark" subtitle="Hệ thống quản trị" />
        <Link to="/" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="size-4" /> Trang chủ
        </Link>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="w-full max-w-md"
        >
          <div className="rounded-3xl border border-white/10 bg-ink/80 p-7 shadow-2xl backdrop-blur sm:p-9">
            <div className="mb-8 flex flex-col items-center gap-4 text-center">
              <span className="flex size-16 items-center justify-center rounded-2xl bg-brand text-ink shadow-glow">
                <ShieldCheck className="size-8" />
              </span>
              <div>
                <h1 className="text-2xl font-extrabold text-white">Đăng nhập quản trị</h1>
                <p className="mt-1 text-sm text-slate-400">Khu vực dành riêng cho quản trị viên hệ thống.</p>
              </div>
            </div>

            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
              {errors.form && (
                <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" /> {errors.form}
                </div>
              )}
              <FormField id="admin-identifier" label="Tài khoản quản trị" error={errors.identifier} className="[&_label]:text-slate-200">
                <div className="relative">
                  <User className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="admin-identifier"
                    autoComplete="username"
                    placeholder="admin hoặc email"
                    className={`pl-11 ${darkField}`}
                    value={identifier}
                    onChange={(e) => setField("identifier", e.target.value)}
                    aria-invalid={Boolean(errors.identifier) || undefined}
                  />
                </div>
              </FormField>
              <FormField
                id="admin-password"
                label="Mật khẩu"
                error={errors.password}
                className="[&_label]:text-slate-200"
                hint={
                  <button type="button" onClick={() => setForgotOpen(true)} className="cursor-pointer text-sm font-semibold text-brand hover:underline">
                    Quên mật khẩu?
                  </button>
                }
              >
                <PasswordInput
                  id="admin-password"
                  tone="dark"
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu"
                  className={darkField}
                  value={password}
                  onChange={(e) => setField("password", e.target.value)}
                  aria-invalid={Boolean(errors.password) || undefined}
                />
              </FormField>
              <Button type="submit" size="lg" block disabled={submitting} className="mt-1">
                {submitting ? <><Loader2 className="size-5 animate-spin" /> Đang xác thực...</> : <><ShieldCheck className="size-5" /> Đăng nhập</>}
              </Button>
            </form>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <DemoRolePicker tone="dark" />
            <p className="text-center text-xs text-slate-500">Tài khoản mẫu: <b className="text-slate-300">admin</b> / <b className="text-slate-300">admin123</b></p>
          </div>
        </motion.div>
      </main>

      <footer className="relative py-5 text-center text-xs text-slate-500">
        Mọi truy cập đều được ghi nhận. Không chia sẻ thông tin đăng nhập.
      </footer>
      <ForgotPasswordModal open={forgotOpen} onOpenChange={setForgotOpen} audience="admin" />
    </div>
  )
}
