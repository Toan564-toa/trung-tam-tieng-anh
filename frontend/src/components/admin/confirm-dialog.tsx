import { AlertTriangle } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"

/** Hộp thoại xác nhận dùng chung cho xoá mềm, khoá tài khoản, chốt lương… */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  detail,
  confirmLabel = "Xác nhận",
  tone = "danger",
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  detail?: string
  confirmLabel?: string
  tone?: "danger" | "primary"
  onConfirm: () => void
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      icon={<AlertTriangle className="size-6" />}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ bỏ
          </Button>
          <Button variant={tone} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="rounded-xl bg-red-50 p-3.5 text-sm leading-relaxed text-ink-soft">
        {detail ?? "Thao tác này sẽ được ghi vào nhật ký thao tác của hệ thống."}
      </p>
    </Modal>
  )
}
