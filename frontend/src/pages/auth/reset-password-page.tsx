import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, Check, KeyRound, Loader2, X } from "lucide-react";
import { cn } from "cn";
import { Logo } from "@/components/common/logo";
import { EASE } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { toast } from "@/components/ui/toast";
import { PasswordInput } from "@/features/auth/password-input";
import { authApi } from "@/api/auth";

const RULES = [
  { label: "Tối thiểu 8 ký tự", test: (p: string) => p.length >= 8 },
  { label: "Có chữ hoa và chữ thường", test: (p: string) => /[A-Z]/.test(p) && /[a-z]/.test(p) },
  { label: "Có ít nhất 1 chữ số", test: (p: string) => /\d/.test(p) },
  { label: "Có ký tự đặc biệt (!@#$...)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const STRENGTH = [
  { label: "Rất yếu", color: "bg-danger", text: "text-danger" },
  { label: "Yếu", color: "bg-danger", text: "text-danger" },
  { label: "Trung bình", color: "bg-warning", text: "text-warning" },
  { label: "Khá", color: "bg-sky-accent", text: "text-sky-accent" },
  { label: "Mạnh", color: "bg-success", text: "text-success" },
];

/**
 * Đặt lại mật khẩu qua link email (token hết hạn sau 20 phút,
 * dùng một lần). Truy cập /dat-lai-mat-khau?token=...
 */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) return <Navigate to="/dang-nhap" replace />;

  const passed = RULES.filter((r) => r.test(next)).length;
  const strength = STRENGTH[next ? passed : 0];
  const mismatch = confirm.length > 0 && confirm !== next;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (passed < RULES.length) return setError("Mật khẩu mới chưa đáp ứng đủ yêu cầu bảo mật.");
    if (next !== confirm) return setError("Xác nhận mật khẩu không khớp.");
    setError(null);
    setSubmitting(true);
    try {
      await authApi.resetPassword(token, next);
      setDone(true);
      toast.success("Đặt lại mật khẩu thành công!", { description: "Bạn có thể đăng nhập ngay." });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đặt lại được mật khẩu. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col bg-cream">
      <header className="container-page flex items-center justify-between py-5">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-12">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="w-full max-w-lg">
          <Card className="shadow-lift">
            <CardContent className="flex flex-col gap-6 p-7 sm:p-9">
              {done ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <span className="flex size-16 items-center justify-center rounded-2xl bg-success text-white">
                    <Check className="size-8" />
                  </span>
                  <h1 className="text-2xl font-extrabold">Mật khẩu đã được đặt lại</h1>
                  <p className="text-sm text-ink-soft">
                    Bạn có thể đăng nhập bằng mật khẩu mới. Nếu không thực hiện yêu cầu này,
                    vui lòng liên hệ trung tâm ngay.
                  </p>
                  <Button size="lg" onClick={() => navigate("/dang-nhap", { replace: true })}>
                    Đến trang đăng nhập
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-3 text-center">
                    <motion.span
                      initial={{ rotate: -20, scale: 0.6 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.2 }}
                      className="flex size-16 items-center justify-center rounded-2xl bg-brand text-ink shadow-glow"
                    >
                      <KeyRound className="size-8" />
                    </motion.span>
                    <Badge variant="warning">Link đặt lại mật khẩu</Badge>
                    <h1 className="text-2xl font-extrabold">Tạo mật khẩu mới</h1>
                    <p className="text-sm text-ink-soft">
                      Link này hết hạn sau 20 phút và chỉ dùng được một lần.
                    </p>
                  </div>

                  <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
                    {error && (
                      <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-danger">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
                      </div>
                    )}
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
                          const ok = r.test(next);
                          return (
                            <li key={r.label} className={cn("flex items-center gap-2 text-xs", ok ? "text-success" : "text-ink-soft")}>
                              {ok ? <Check className="size-3.5" /> : <X className="size-3.5" />} {r.label}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <FormField id="confirm-password" label="Xác nhận mật khẩu mới" required error={mismatch ? "Mật khẩu xác nhận không khớp." : undefined}>
                      <PasswordInput id="confirm-password" autoComplete="new-password" placeholder="Nhập lại mật khẩu mới" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={mismatch || undefined} />
                    </FormField>
                    <Button type="submit" size="lg" block disabled={submitting}>
                      {submitting ? <><Loader2 className="size-5 animate-spin" /> Đang cập nhật...</> : "Xác nhận mật khẩu mới"}
                    </Button>
                    <p className="text-center text-xs text-ink-soft">
                      Link hết hạn?{" "}
                      <Link to="/dang-nhap" className="font-semibold text-brand-hover hover:underline">
                        Yêu cầu link mới
                      </Link>
                    </p>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
