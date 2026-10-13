import { useState, type FormEvent } from "react";
import { KeyRound, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { authApi } from "@/api/auth";
import { SITE } from "@/config/site";

type Props = { open: boolean; onOpenChange: (open: boolean) => void; audience?: "client" | "admin" };

/**
 * Quên mật khẩu: nhập email, backend gửi link đặt lại
 * (phản hồi luôn chung — không tiết lộ email có tồn tại hay không).
 * Admin chưa cấu hình SMTP thì liên hệ quản trị viên cấp cao.
 */
export function ForgotPasswordModal({ open, onOpenChange, audience = "client" }: Props) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setEmail("");
    setError(null);
    setSent(false);
    setSubmitting(false);
  };

  const close = () => {
    onOpenChange(false);
    // Đặt lại trạng thái khi modal đóng xong.
    window.setTimeout(reset, 200);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Vui lòng nhập email đã đăng ký tài khoản.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không gửi được yêu cầu. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={close}
      icon={<KeyRound className="size-6" />}
      title="Quên mật khẩu?"
      description={
        audience === "admin"
          ? "Nhập email tài khoản quản trị để nhận link đặt lại mật khẩu."
          : "Nhập email đã đăng ký tài khoản để nhận link đặt lại mật khẩu."
      }
      footer={
        sent ? (
          <Button onClick={close}>Đóng</Button>
        ) : (
          <>
            <Button variant="outline" onClick={close}>
              Huỷ bỏ
            </Button>
            <Button type="submit" form="forgot-password-form" disabled={submitting}>
              {submitting ? "Đang gửi…" : "Gửi link đặt lại"}
            </Button>
          </>
        )
      }
    >
      {sent ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 text-sm">
          <p className="font-semibold text-ink">Đã gửi yêu cầu đặt lại mật khẩu</p>
          <p className="text-ink-soft">
            Nếu email <b>{email}</b> tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu
            (hết hạn sau 20 phút). Vui lòng kiểm tra hộp thư và thư mục spam.
          </p>
        </div>
      ) : (
        <form id="forgot-password-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-danger">
              {error}
            </div>
          )}
          <FormField id="forgot-email" label="Email đã đăng ký" required error={error ?? undefined}>
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              placeholder="email@trungtam.edu.vn"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
            />
          </FormField>
          <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 text-sm">
            <a href={SITE.phoneHref} className="flex items-center gap-3 font-medium text-ink hover:text-amber-600">
              <Phone className="size-4 text-amber-600" /> Hotline: {SITE.phone}
            </a>
            <a href={`mailto:${SITE.email}`} className="flex items-center gap-3 font-medium text-ink hover:text-amber-600">
              <Mail className="size-4 text-amber-600" /> {SITE.email}
            </a>
            {audience === "admin" && (
              <p className="text-xs text-ink-soft">
                Tài khoản quản trị cũng có thể được đặt lại bởi quản trị viên cấp cao.
              </p>
            )}
          </div>
        </form>
      )}
    </Modal>
  );
}
