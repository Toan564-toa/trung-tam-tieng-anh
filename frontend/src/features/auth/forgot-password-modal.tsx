import { KeyRound, Mail, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { SITE } from "@/config/site"

type Props = { open: boolean; onOpenChange: (open: boolean) => void; audience?: "client" | "admin" }

export function ForgotPasswordModal({ open, onOpenChange, audience = "client" }: Props) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      icon={<KeyRound className="size-6" />}
      title="Quên mật khẩu?"
      description={
        audience === "admin"
          ? "Vui lòng liên hệ quản trị viên cấp cao để được cấp lại mật khẩu tài khoản quản trị."
          : "Tài khoản do trung tâm cấp. Vui lòng liên hệ bộ phận hỗ trợ để được đặt lại mật khẩu – mật khẩu tạm sẽ được gửi qua email hoặc tin nhắn."
      }
      footer={<Button onClick={() => onOpenChange(false)}>Đã hiểu</Button>}
    >
      <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 text-sm">
        <a href={SITE.phoneHref} className="flex items-center gap-3 font-medium text-ink hover:text-amber-600">
          <Phone className="size-4 text-amber-600" /> Hotline: {SITE.phone}
        </a>
        <a href={`mailto:${SITE.email}`} className="flex items-center gap-3 font-medium text-ink hover:text-amber-600">
          <Mail className="size-4 text-amber-600" /> {SITE.email}
        </a>
      </div>
    </Modal>
  )
}
