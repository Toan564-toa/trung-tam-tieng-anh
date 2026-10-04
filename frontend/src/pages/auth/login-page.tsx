import { useState } from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { AlertCircle, ArrowLeft, Loader2, LogIn, User } from "lucide-react"
import { Logo } from "@/components/common/logo"
import { EASE } from "@/components/motion/reveal"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { DemoRolePicker } from "@/features/auth/demo-role-picker"
import { ForgotPasswordModal } from "@/features/auth/forgot-password-modal"
import { LoginIllustration } from "@/features/auth/login-illustration"
import { PasswordInput } from "@/features/auth/password-input"
import { useLoginForm } from "@/features/auth/use-login-form"

export function LoginPage() {
  const { identifier, password, errors, submitting, onSubmit, setField } = useLoginForm("client")
  const [forgotOpen, setForgotOpen] = useState(false)

  return (
    <div className="grid min-h-svh bg-white lg:grid-cols-2">
      <div className="flex flex-col px-5 py-6 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between">
          <Logo />
          <Link to="/" className="flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
            <ArrowLeft className="size-4" /> Trang chủ
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 py-10"
        >
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-extrabold sm:text-4xl">Chào mừng trở lại! 👋</h1>
            <p className="text-ink-soft">Đăng nhập dành cho Học viên, Giáo viên và Nhân viên.</p>
          </div>

          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
            {errors.form && (
              <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-danger">
                <AlertCircle className="mt-0.5 size-4 shrink-0" /> {errors.form}
              </div>
            )}
            <FormField id="identifier" label="Tên đăng nhập hoặc email" error={errors.identifier}>
              <div className="relative">
                <User className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-slate-400" />
                <Input
                  id="identifier"
                  autoComplete="username"
                  placeholder="VD: hocvien hoặc email@trungtam.edu.vn"
                  className="pl-11"
                  value={identifier}
                  onChange={(e) => setField("identifier", e.target.value)}
                  aria-invalid={Boolean(errors.identifier) || undefined}
                />
              </div>
            </FormField>
            <FormField
              id="password"
              label="Mật khẩu"
              error={errors.password}
              hint={
                <button type="button" onClick={() => setForgotOpen(true)} className="cursor-pointer text-sm font-semibold text-sky-accent hover:underline">
                  Quên mật khẩu?
                </button>
              }
            >
              <PasswordInput
                id="password"
                autoComplete="current-password"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setField("password", e.target.value)}
                aria-invalid={Boolean(errors.password) || undefined}
              />
            </FormField>
            <Button type="submit" size="lg" block disabled={submitting}>
              {submitting ? <><Loader2 className="size-5 animate-spin" /> Đang đăng nhập...</> : <><LogIn className="size-5" /> Đăng nhập</>}
            </Button>
            <p className="text-center text-sm text-ink-soft">
              Chưa có tài khoản? Tài khoản do trung tâm cấp – vui lòng liên hệ quầy lễ tân.
            </p>
          </form>

          <div className="flex flex-col gap-3">
            <DemoRolePicker />
            <p className="text-center text-xs text-ink-soft">
              Tài khoản mẫu: <b>hocvien</b>, <b>giaovien</b>, <b>nhanvien</b>, <b>hocvienmoi</b> (lần đầu) · mật khẩu <b>123456</b>
            </p>
          </div>
        </motion.div>

        <p className="text-center text-xs text-slate-400">
          Bạn là quản trị viên? <Link to="/admin/dang-nhap" className="font-semibold text-ink-soft hover:text-ink">Đăng nhập Admin</Link>
        </p>
      </div>

      <LoginIllustration />
      <ForgotPasswordModal open={forgotOpen} onOpenChange={setForgotOpen} />
    </div>
  )
}
