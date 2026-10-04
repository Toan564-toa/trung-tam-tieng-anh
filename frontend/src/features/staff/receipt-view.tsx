import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatVnd } from "@/lib/format"
import { SITE } from "@/config/site"
import { PAYMENT_METHOD_META, classNameOf, getStaffMember, type PaymentMethod, type StaffStudent } from "@/data/staff"

/** Chỉ in phần phiếu thu, ẩn toàn bộ giao diện xung quanh. */
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  [data-receipt], [data-receipt] * { visibility: visible !important; }
  [data-receipt] { position: absolute; inset: 0 auto auto 0; width: 100%; }
  @page { margin: 12mm; }
}
`

export type ReceiptData = {
  receiptNo: string
  date: string
  student: StaffStudent
  /** Tổng học phí của khóa. */
  total: number
  /** Số tiền giảm giá (ưu đãi, học bổng). */
  discount: number
  amount: number
  method: PaymentMethod
  collectorId: string
  note: string
}

type ReceiptViewProps = {
  receipt: ReceiptData
  onPrint: () => void
}

/** Phiếu thu học phí dạng A5, in trực tiếp từ trình duyệt. */
export function ReceiptView({ receipt, onPrint }: ReceiptViewProps) {
  const { student } = receipt
  const collector = getStaffMember(receipt.collectorId)
  const payable = receipt.total - receipt.discount

  return (
    <div className="flex flex-col gap-4">
      <style>{PRINT_CSS}</style>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onPrint}>
          <Printer /> In phiếu thu
        </Button>
      </div>

      <div data-receipt className="mx-auto w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-6 text-ink">
        <header className="flex items-start justify-between gap-4 border-b border-dashed border-slate-200 pb-4">
          <div>
            <p className="font-heading text-lg font-extrabold">{SITE.name}</p>
            <p className="mt-0.5 max-w-64 text-xs leading-relaxed text-ink-soft">{SITE.address}</p>
            <p className="mt-0.5 text-xs text-ink-soft">ĐT: {SITE.phone}</p>
          </div>
          <div className="text-right">
            <p className="font-heading text-sm font-bold uppercase">Phiếu thu học phí</p>
            <p className="mt-1 text-xs text-ink-soft">Số: {receipt.receiptNo}</p>
            <p className="text-xs text-ink-soft">Ngày: {receipt.date}</p>
          </div>
        </header>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-dashed border-slate-200 py-4 text-sm">
          <Field label="Học viên" value={student.fullName} />
          <Field label="Mã học viên" value={student.studentCode} />
          <Field label="Lớp" value={classNameOf(student.classId)} />
          <Field label="Trình độ" value={student.level} />
          <Field label="Phụ huynh" value={student.guardian.fullName} />
          <Field label="SĐT phụ huynh" value={student.guardian.phone} />
        </dl>

        <table className="w-full border-b border-dashed border-slate-200 py-3 text-sm">
          <thead>
            <tr className="text-xs text-ink-soft">
              <th scope="col" className="py-2 text-left font-semibold">Nội dung</th>
              <th scope="col" className="py-2 text-right font-semibold">Số tiền</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-1.5">Học phí khóa {classNameOf(student.classId)}</td>
              <td className="py-1.5 text-right tabular-nums">{formatVnd(receipt.total)}</td>
            </tr>
            {receipt.discount > 0 && (
              <tr>
                <td className="py-1.5">Ưu đãi / giảm giá</td>
                <td className="py-1.5 text-right text-success tabular-nums">−{formatVnd(receipt.discount)}</td>
              </tr>
            )}
            <tr>
              <td className="py-1.5">Phải thu sau ưu đãi</td>
              <td className="py-1.5 text-right font-semibold tabular-nums">{formatVnd(payable)}</td>
            </tr>
            <tr className="bg-surface">
              <td className="px-1 py-1.5 font-semibold">Đã thu lần này</td>
              <td className="px-1 py-1.5 text-right font-heading font-extrabold tabular-nums">{formatVnd(receipt.amount)}</td>
            </tr>
          </tbody>
        </table>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 py-4 text-sm">
          <Field label="Hình thức" value={`${receipt.method} (${PAYMENT_METHOD_META[receipt.method].short})`} />
          <Field label="Người thu" value={collector?.fullName ?? "—"} />
          <Field label="Ghi chú" value={receipt.note || "—"} />
          <Field
            label="Còn phải thu"
            value={formatVnd(Math.max(0, student.tuition.remaining - receipt.amount))}
          />
        </dl>

        <footer className="flex items-end justify-between gap-6 border-t border-dashed border-slate-200 pt-4 text-xs">
          <p className="leading-relaxed text-ink-soft">
            Phiếu thu này có giá trị khi có dấu của trung tâm.
            <br />
            Xin quý phụ huynh giữ lại để đối chiếu khi cần.
          </p>
          <div className="text-center">
            <p className="font-medium">{SITE.name}</p>
            <p className="mt-6 italic text-ink-soft">Người lập phiếu</p>
          </div>
        </footer>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="mt-0.5 font-semibold">{value}</dd>
    </div>
  )
}