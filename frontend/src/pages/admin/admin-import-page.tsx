import { useMemo, useState, type ChangeEvent } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileSpreadsheet,
  FileUp,
  ListChecks,
  RefreshCw,
  TriangleAlert,
  UserPlus,
} from "lucide-react"
import { cn } from "cn"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { TableEmpty } from "@/components/admin/table-toolbar"
import { PageHeader } from "@/components/layout/page-header"
import { Reveal } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { ADMIN_TODAY_LABEL } from "@/data/admin"
import {
  IMPORT_KIND_META,
  downloadImportTemplate,
  exportCredentialsSheet,
  generateCredentials,
  parseImportFile,
  type CreatedCredential,
  type ImportKind,
  type ParseResult,
} from "@/lib/admin-excel"
import { formatDate } from "@/lib/date"

type Step = 1 | 2 | 3 | 4

const STEPS: { value: Step; label: string }[] = [
  { value: 1, label: "Chọn loại" },
  { value: 2, label: "Tải file lên" },
  { value: 3, label: "Kiểm tra dữ liệu" },
  { value: 4, label: "Tạo tài khoản" },
]

const KINDS = Object.keys(IMPORT_KIND_META) as ImportKind[]

export function AdminImportPage() {
  const [step, setStep] = useState<Step>(1)
  const [kind, setKind] = useState<ImportKind>("student")
  const [result, setResult] = useState<ParseResult | null>(null)
  const [parsing, setParsing] = useState(false)
  const [credentials, setCredentials] = useState<CreatedCredential[] | null>(null)
  const [createdAt, setCreatedAt] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)

  const validRows = useMemo(() => (result ? result.rows.filter((row) => row.errors.length === 0) : []), [result])
  const errorCount = result ? result.totalRows - result.validRows : 0
  const missing = result?.missingColumns ?? []
  const meta = IMPORT_KIND_META[kind]

  const goStep = (next: Step) => {
    setStep(next)
    if (next === 1) {
      setResult(null)
      setCredentials(null)
    }
  }

  const reset = () => {
    setStep(1)
    setKind("student")
    setResult(null)
    setParsing(false)
    setCredentials(null)
    setCreatedAt("")
    setConfirmOpen(false)
  }

  const onTemplate = () => {
    void downloadImportTemplate(kind)
      .then(() => toast.success("Đã tải file mẫu", { description: `Mẫu nhập ${meta.label.toLowerCase()} theo đúng định dạng hệ thống.` }))
      .catch(() => toast.error("Không tải được file mẫu"))
  }

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setParsing(true)
    try {
      const parsed = await parseImportFile(kind, file)
      setResult(parsed)
      if (parsed.missingColumns.length > 0) {
        toast.error("File thiếu cột bắt buộc", { description: parsed.missingColumns.join(", ") })
      } else if (parsed.totalRows === 0) {
        toast.error("File chưa có dữ liệu", { description: "Chỉ có dòng tiêu đề cột, hãy điền dữ liệu rồi tải lên." })
      } else {
        toast.success(`Đã đọc ${parsed.totalRows} dòng dữ liệu`, {
          description: `${parsed.validRows} dòng hợp lệ · ${parsed.totalRows - parsed.validRows} dòng cần sửa.`,
        })
      }
    } catch {
      toast.error("Không đọc được file", { description: "Hãy kiểm tra lại định dạng .xlsx hoặc .xls của file." })
    } finally {
      setParsing(false)
    }
  }

  const createAccounts = () => {
    const created = generateCredentials(validRows, kind)
    setCredentials(created)
    setCreatedAt(formatDate(new Date()))
    setConfirmOpen(false)
    setStep(4)
    toast.success(`Đã tạo ${created.length} tài khoản ${meta.label.toLowerCase()}`, {
      description: "Tải file danh sách để gửi mật khẩu tạm cho người dùng.",
    })
  }

  const copy = (value: string, label: string) => {
    void navigator.clipboard
      .writeText(value)
      .then(() => toast.success(`Đã sao chép ${label}`))
      .catch(() => toast.error("Không sao chép được", { description: "Hãy bôi đen và copy thủ công." }))
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`4 bước · dữ liệu ${ADMIN_TODAY_LABEL}`}
        title="Nhập tài khoản từ Excel"
        description="Tải file mẫu, điền dữ liệu học viên, giáo viên hoặc nhân viên, kiểm tra lỗi và tạo tài khoản kèm mật khẩu tạm."
        actions={
          <Button variant="outline" onClick={reset}>
            <RefreshCw /> Nhập lại từ đầu
          </Button>
        }
      />

      <Reveal>
        <Card>
          <CardContent className="p-4 sm:p-5">
            <ol className="flex gap-2 overflow-x-auto pb-1">
              {STEPS.map((item) => {
                const done = step > item.value
                const active = step === item.value
                return (
                  <li key={item.value} className="flex min-w-36 flex-1 items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => item.value < step && goStep(item.value)}
                      disabled={item.value > step}
                      className={cn(
                        "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-2xl border px-3 text-left transition-colors",
                        active && "border-brand bg-cream shadow-soft",
                        done && "border-success/30 bg-green-50/60 hover:bg-green-50",
                        !active && !done && "border-slate-100 bg-surface",
                        item.value > step && "cursor-default",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          active && "bg-brand text-ink",
                          done && "bg-success text-white",
                          !active && !done && "bg-slate-200 text-ink-soft",
                        )}
                      >
                        {done ? <Check className="size-4" /> : item.value}
                      </span>
                      <span className={cn("min-w-0 truncate text-xs font-semibold", active ? "text-ink" : "text-ink-soft")}>
                        {item.label}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={0.05} key={step}>
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Bước 1 · Chọn loại dữ liệu cần nhập</CardTitle>
              <CardDescription>Chọn đúng loại để tải file mẫu và sinh tài khoản cho phù hợp</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ul className="grid gap-3 sm:grid-cols-3">
                {KINDS.map((item) => {
                  const selected = kind === item
                  return (
                    <li key={item}>
                      <button
                        type="button"
                        onClick={() => setKind(item)}
                        className={cn(
                          "flex h-full w-full cursor-pointer flex-col gap-2 rounded-2xl border p-4 text-left transition-colors",
                          selected ? "border-brand bg-cream shadow-soft" : "border-slate-100 hover:border-brand/40",
                        )}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-ink">{IMPORT_KIND_META[item].label}</span>
                          {selected && <Badge variant="success">Đã chọn</Badge>}
                        </span>
                        <span className="text-xs leading-relaxed text-ink-soft">{IMPORT_KIND_META[item].description}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={onTemplate}>
                  <FileSpreadsheet /> Tải file mẫu
                </Button>
                <Button onClick={() => goStep(2)}>
                  Tiếp tục <ArrowRight />
                </Button>
              </div>

              <p className="flex items-start gap-2 rounded-xl bg-surface p-3.5 text-sm leading-relaxed text-ink-soft">
                <ListChecks className="mt-0.5 size-4 shrink-0" />
                File mẫu gồm các cột: {meta.description} Cột bắt buộc được đánh dấu dấu * và không được đổi tên.
              </p>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Bước 2 · Tải file lên</CardTitle>
              <CardDescription>Chọn file .xlsx hoặc .xls đúng theo mẫu của loại {meta.label.toLowerCase()}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-slate-300 p-5 text-center">
                <FileUp className="mx-auto size-8 text-brand-hover" />
                <p className="text-sm font-semibold text-ink">Chọn file Excel cần nhập</p>
                <p className="text-xs text-ink-soft">Hệ thống đọc trực tiếp trong trình duyệt, dữ liệu không rời khỏi máy của bạn.</p>
                <label className="mx-auto mt-1 w-full max-w-md">
                  <span className="sr-only">Chọn file Excel</span>
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    disabled={parsing}
                    onChange={(event) => {
                      void onFileChange(event)
                    }}
                    className="cursor-pointer file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-1.5 file:text-xs file:font-semibold file:text-ink"
                  />
                </label>
                {parsing && <p className="text-xs font-semibold text-brand-hover">Đang đọc file…</p>}
              </div>

              {result && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-green-50 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">{result.fileName}</span>
                    <span className="block text-xs text-ink-soft">
                      Đã đọc {result.totalRows.toLocaleString("vi-VN")} dòng · {result.validRows.toLocaleString("vi-VN")} dòng hợp lệ
                    </span>
                  </span>
                  <Badge variant={result.missingColumns.length > 0 ? "warning" : "success"}>
                    {result.missingColumns.length > 0 ? "Thiếu cột bắt buộc" : "Sẵn sàng kiểm tra"}
                  </Badge>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => goStep(1)}>
                  <ArrowLeft /> Quay lại
                </Button>
                <Button disabled={!result || result.totalRows === 0} onClick={() => goStep(3)}>
                  Tiếp tục <ArrowRight />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && result && (
          <Card>
            <CardHeader>
              <CardTitle>Bước 3 · Kiểm tra dữ liệu</CardTitle>
              <CardDescription>
                Xem trước từng dòng trước khi tạo tài khoản · {result.fileName}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {missing.length > 0 && (
                <div role="alert" className="rounded-2xl bg-orange-50 p-4 text-sm text-ink-soft">
                  <p className="flex items-center gap-2 font-semibold text-warning">
                    <TriangleAlert className="size-4" />
                    File thiếu {missing.length} cột bắt buộc: {missing.join(", ")}
                  </p>
                  <p className="mt-1 text-xs">
                    Hãy tải lại file mẫu, giữ nguyên tên cột rồi chép dữ liệu sang. Bạn chưa thể tạo tài khoản khi còn thiếu cột.
                  </p>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryTile label="Tổng dòng" value={result.totalRows} tone="ink" />
                <SummaryTile label="Dòng hợp lệ" value={result.validRows} tone="success" />
                <SummaryTile label="Dòng lỗi" value={errorCount} tone={errorCount > 0 ? "danger" : "ink"} />
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">Dòng</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Họ và tên</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Số điện thoại</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Email</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Kết quả</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.rows.map((row) => (
                      <tr
                        key={row.rowNumber}
                        className={cn("transition-colors", row.errors.length > 0 ? "bg-red-50" : "hover:bg-surface")}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-ink-soft tabular-nums">{row.rowNumber}</td>
                        <td className="px-4 py-3 font-semibold text-ink">{row.values.fullName || "—"}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-ink-soft tabular-nums">
                          {row.values.guardianPhone || row.values.phone || "—"}
                        </td>
                        <td className="px-4 py-3 text-ink-soft">{row.values.email || "—"}</td>
                        <td className="px-4 py-3">
                          {row.errors.length === 0 ? (
                            <Badge variant="success">Hợp lệ</Badge>
                          ) : (
                            <span className="flex flex-col items-start gap-1.5">
                              <Badge variant="danger">Cần sửa</Badge>
                              <ul role="alert" className="flex flex-col gap-0.5 text-xs text-danger">
                                {row.errors.map((message) => (
                                  <li key={message}>{message}</li>
                                ))}
                              </ul>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {result.rows.length === 0 && <TableEmpty colSpan={5} message="File chưa có dòng dữ liệu nào." />}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => goStep(2)}>
                  <ArrowLeft /> Quay lại, tải file khác
                </Button>
                <Button
                  disabled={missing.length > 0 || validRows.length === 0}
                  onClick={() => setConfirmOpen(true)}
                >
                  <UserPlus /> Tạo {validRows.length.toLocaleString("vi-VN")} tài khoản
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && credentials && (
          <Card>
            <CardHeader>
              <CardTitle>Bước 4 · Đã tạo tài khoản</CardTitle>
              <CardDescription>
                Tải danh sách tài khoản kèm mật khẩu tạm và gửi cho từng người dùng
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-start gap-2 rounded-2xl bg-green-50 p-4 text-sm text-ink-soft">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
                <span>
                  Đã tạo <strong className="text-ink">{credentials.length.toLocaleString("vi-VN")}</strong> tài khoản{" "}
                  {meta.label.toLowerCase()} lúc <strong className="text-ink">{createdAt}</strong>. Người dùng phải đổi mật khẩu tạm
                  ở lần đăng nhập đầu tiên.
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">STT</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Họ và tên</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Tên đăng nhập</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Mật khẩu tạm</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {credentials.map((item, index) => (
                      <tr key={`${item.rowNumber}-${item.username}`} className="transition-colors hover:bg-surface">
                        <td className="px-4 py-3 text-ink-soft tabular-nums">{index + 1}</td>
                        <td className="px-4 py-3 font-semibold text-ink">
                          {item.fullName}
                          <span className="block text-xs font-normal text-ink-soft">{item.email}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-ink">{item.username}</td>
                        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-ink">{item.password}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Sao chép tên đăng nhập của ${item.fullName}`}
                              title="Sao chép tên đăng nhập"
                              onClick={() => copy(item.username, "tên đăng nhập")}
                            >
                              <Copy />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Sao chép mật khẩu tạm của ${item.fullName}`}
                              title="Sao chép mật khẩu tạm"
                              onClick={() => copy(item.password, "mật khẩu tạm")}
                            >
                              <Copy />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => {
                    void exportCredentialsSheet(credentials, kind)
                      .then(() => toast.success("Đã tải danh sách tài khoản", { description: "File Excel kèm mật khẩu tạm." }))
                      .catch(() => toast.error("Không tải được file Excel"))
                  }}
                >
                  <Download /> Tải danh sách tài khoản
                </Button>
                <Button variant="outline" onClick={reset}>
                  <RefreshCw /> Nhập lại từ đầu
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </Reveal>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Xác nhận tạo tài khoản"
        description={`Tạo ${validRows.length.toLocaleString("vi-VN")} tài khoản ${meta.label.toLowerCase()} từ dữ liệu hợp lệ trong file.`}
        detail={
          errorCount > 0
            ? `${errorCount} dòng đang bị lỗi sẽ được bỏ qua. Thao tác này ghi vào nhật ký hệ thống.`
            : "Toàn bộ dòng trong file đều hợp lệ. Thao tác này ghi vào nhật ký hệ thống."
        }
        confirmLabel={`Tạo ${validRows.length.toLocaleString("vi-VN")} tài khoản`}
        tone="primary"
        onConfirm={createAccounts}
      />
    </div>
  )
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone: "ink" | "success" | "danger" }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3">
      <span className="text-sm text-ink-soft">{label}</span>
      <span
        className={cn(
          "font-heading text-xl font-extrabold tabular-nums",
          tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-ink",
        )}
      >
        {value.toLocaleString("vi-VN")}
      </span>
    </div>
  )
}
