import { useState, type ChangeEvent } from "react"
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
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
import { TableEmpty, TablePagination, ToolbarSelect } from "@/components/admin/table-toolbar"
import { PageHeader } from "@/components/layout/page-header"
import { Reveal } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { ApiError } from "@/api/client"
import { importsApi, type ConfirmResult, type ImportKind, type ImportRowStatus } from "@/api/imports"
import { IMPORT_KIND_META } from "@/lib/admin-excel"
import { formatDate } from "@/lib/date"

type Step = 1 | 2 | 3 | 4

const STEPS: { value: Step; label: string }[] = [
  { value: 1, label: "Chọn loại" },
  { value: 2, label: "Tải file lên" },
  { value: 3, label: "Kiểm tra dữ liệu" },
  { value: 4, label: "Tạo tài khoản" },
]

const KINDS = Object.keys(IMPORT_KIND_META) as ImportKind[]

const TEMPLATE_TYPE: Record<ImportKind, "students" | "teachers" | "staff"> = {
  student: "students",
  teacher: "teachers",
  staff: "staff",
}

const ROW_STATUS_LABEL: Record<ImportRowStatus, { label: string; badge: "success" | "danger" | "warning" | "info" }> = {
  PENDING: { label: "Chờ xử lý", badge: "warning" },
  VALID: { label: "Hợp lệ", badge: "success" },
  ERROR: { label: "Cần sửa", badge: "danger" },
  CREATED: { label: "Đã tạo", badge: "info" },
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

export function AdminImportPage() {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>(1)
  const [kind, setKind] = useState<ImportKind>("student")
  const [batchId, setBatchId] = useState<number | null>(null)
  const [fileName, setFileName] = useState("")
  const [uploading, setUploading] = useState(false)
  const [confirmResult, setConfirmResult] = useState<ConfirmResult | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [skipOpen, setSkipOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [previewPage, setPreviewPage] = useState(1)
  const [rowFilter, setRowFilter] = useState<ImportRowStatus | "all">("all")

  const meta = IMPORT_KIND_META[kind]

  // Xem trước từng dòng của lô vừa tải lên (phân trang server).
  const previewQuery = useQuery({
    queryKey: ["imports", batchId, previewPage, rowFilter],
    queryFn: () =>
      importsApi.preview(batchId!, {
        page: previewPage,
        pageSize: 20,
        status: rowFilter === "all" ? undefined : rowFilter,
      }),
    enabled: batchId !== null && step >= 3,
    placeholderData: keepPreviousData,
  })

  const preview = previewQuery.data
  const rows = preview?.items ?? []
  const pageCount = Math.max(1, preview?.totalPages ?? 1)
  const totalRows = preview?.totalRows ?? 0
  const validRows = preview?.validRows ?? 0
  const errorRows = preview?.errorRows ?? 0

  const goStep = (next: Step) => {
    setStep(next)
    if (next === 1) reset()
  }

  const reset = () => {
    setStep(1)
    setKind("student")
    setBatchId(null)
    setFileName("")
    setUploading(false)
    setConfirmResult(null)
    setConfirmOpen(false)
    setSkipOpen(false)
    setConfirming(false)
    setPreviewPage(1)
    setRowFilter("all")
    void queryClient.invalidateQueries({ queryKey: ["imports"] })
  }

  const onTemplate = () => {
    void importsApi
      .template(TEMPLATE_TYPE[kind])
      .then((blob) => downloadBlob(blob, `Mau-nhap-${kind}.xlsx`))
      .then(() => toast.success("Đã tải file mẫu", { description: "Mẫu nhập theo đúng định dạng hệ thống." }))
      .catch((err) => toast.error(errorMessage(err, "Không tải được file mẫu")))
  }

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setUploading(true)
    try {
      const result = await importsApi.create(kind, file)
      setBatchId(result.batchId)
      setFileName(file.name)
      setPreviewPage(1)
      setRowFilter("all")
      setStep(3)
      toast.success(`Đã đọc ${result.totalRows.toLocaleString("vi-VN")} dòng`, {
        description: `${result.validRows.toLocaleString("vi-VN")} dòng hợp lệ · ${result.errorRows.toLocaleString("vi-VN")} dòng cần sửa.`,
      })
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null
      const message =
        apiErr?.code === "MISSING_COLUMNS"
          ? "File thiếu cột bắt buộc. Hãy tải lại file mẫu và giữ nguyên tên cột."
          : apiErr?.code === "TOO_MANY_ROWS"
            ? "File tối đa 1000 dòng dữ liệu."
            : apiErr?.code === "INVALID_EXCEL" || apiErr?.code === "EMPTY_EXCEL"
              ? "Không đọc được file. Hãy kiểm tra định dạng .xlsx hoặc .xls."
              : errorMessage(err, "Không đọc được file")
      toast.error(message)
    } finally {
      setUploading(false)
    }
  }

  // Xác nhận tạo tài khoản. Còn dòng lỗi → hỏi bỏ qua (skipErrors).
  const onConfirm = async (skipErrors: boolean) => {
    if (batchId === null) return
    setConfirming(true)
    try {
      const result = await importsApi.confirm(batchId, skipErrors)
      setConfirmResult(result)
      setConfirmOpen(false)
      setSkipOpen(false)
      setStep(4)
      void queryClient.invalidateQueries({ queryKey: ["imports"] })
      toast.success(`Đã tạo ${result.created.toLocaleString("vi-VN")} tài khoản`, {
        description: result.skipped > 0 ? `Bỏ qua ${result.skipped} dòng lỗi.` : "Toàn bộ dòng hợp lệ đã được tạo.",
      })
    } catch (err) {
      if (err instanceof ApiError && err.code === "HAS_ERROR_ROWS" && !skipErrors) {
        setConfirmOpen(false)
        setSkipOpen(true)
        return
      }
      toast.error(errorMessage(err, "Không tạo được tài khoản"))
    } finally {
      setConfirming(false)
    }
  }

  const onDownloadCredentials = () => {
    if (!confirmResult) return
    void importsApi
      .credentials(confirmResult.batchId, confirmResult.credentialsToken)
      .then((blob) => downloadBlob(blob, "Danh-sach-tai-khoan.xlsx"))
      .then(() => toast.success("Đã tải danh sách tài khoản", { description: "File Excel kèm mật khẩu tạm (dùng 1 lần, hết hạn sau 15 phút)." }))
      .catch((err) => {
        const apiErr = err instanceof ApiError ? err : null
        toast.error(
          apiErr?.code === "TOKEN_USED"
            ? "Link tài khoản đã được tải. Liên hệ quản trị viên để tạo lại."
            : apiErr?.code === "TOKEN_EXPIRED"
              ? "Link tài khoản đã hết hạn (15 phút). Hãy xác nhận lại lô nhập."
              : errorMessage(err, "Không tải được file Excel"),
        )
      })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`4 bước · tối đa 1000 dòng`}
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
                <p className="text-xs text-ink-soft">File được gửi tới server để kiểm tra trùng mã, trùng SĐT và lỗi định dạng.</p>
                <label className="mx-auto mt-1 w-full max-w-md">
                  <span className="sr-only">Chọn file Excel</span>
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    disabled={uploading}
                    onChange={(event) => {
                      void onFileChange(event)
                    }}
                    className="cursor-pointer file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-1.5 file:text-xs file:font-semibold file:text-ink"
                  />
                </label>
                {uploading && <p className="text-xs font-semibold text-brand-hover">Đang kiểm tra file…</p>}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => goStep(1)}>
                  <ArrowLeft /> Quay lại
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && batchId !== null && (
          <Card>
            <CardHeader>
              <CardTitle>Bước 3 · Kiểm tra dữ liệu</CardTitle>
              <CardDescription>Xem trước từng dòng trước khi tạo tài khoản · {fileName}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryTile label="Tổng dòng" value={totalRows} tone="ink" />
                <SummaryTile label="Dòng hợp lệ" value={validRows} tone="success" />
                <SummaryTile label="Dòng lỗi" value={errorRows} tone={errorRows > 0 ? "danger" : "ink"} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <ToolbarSelect
                  id="row-filter"
                  label="Lọc dòng"
                  value={rowFilter}
                  onChange={(value) => {
                    setRowFilter(value as ImportRowStatus | "all")
                    setPreviewPage(1)
                  }}
                  options={[
                    { value: "all", label: "Tất cả dòng" },
                    { value: "VALID", label: "Dòng hợp lệ" },
                    { value: "ERROR", label: "Dòng lỗi" },
                    { value: "CREATED", label: "Đã tạo" },
                  ]}
                />
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
                    {previewQuery.isLoading && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-soft">
                          Đang tải dữ liệu…
                        </td>
                      </tr>
                    )}
                    {previewQuery.isError && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-danger">
                          {errorMessage(previewQuery.error, "Không tải được dữ liệu.")}
                        </td>
                      </tr>
                    )}
                    {!previewQuery.isLoading &&
                      !previewQuery.isError &&
                      rows.map((row) => {
                        const status = ROW_STATUS_LABEL[row.status]
                        return (
                          <tr
                            key={row.id}
                            className={cn("transition-colors", row.status === "ERROR" ? "bg-red-50" : "hover:bg-surface")}
                          >
                            <td className="px-4 py-3 font-mono text-xs text-ink-soft tabular-nums">{row.rowNumber}</td>
                            <td className="px-4 py-3 font-semibold text-ink">{String(row.rawData.fullName ?? "") || "—"}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-ink-soft tabular-nums">
                              {String(row.rawData.phone ?? "") || "—"}
                            </td>
                            <td className="px-4 py-3 text-ink-soft">{String(row.rawData.email ?? "") || "—"}</td>
                            <td className="px-4 py-3">
                              {row.status === "ERROR" ? (
                                <span className="flex flex-col items-start gap-1.5">
                                  <Badge variant={status.badge}>{status.label}</Badge>
                                  <ul role="alert" className="flex flex-col gap-0.5 text-xs text-danger">
                                    {(row.errorMessage ?? "").split("; ").map((message) => (
                                      <li key={message}>{message}</li>
                                    ))}
                                  </ul>
                                </span>
                              ) : (
                                <Badge variant={status.badge}>{status.label}</Badge>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    {!previewQuery.isLoading && !previewQuery.isError && rows.length === 0 && (
                      <TableEmpty colSpan={5} message="Không có dòng nào khớp bộ lọc." />
                    )}
                  </tbody>
                </table>
              </div>

              <TablePagination page={previewPage} pageCount={pageCount} total={preview?.total ?? 0} onPageChange={setPreviewPage} />

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => goStep(2)}>
                  <ArrowLeft /> Quay lại, tải file khác
                </Button>
                <Button disabled={validRows === 0 || confirming} onClick={() => setConfirmOpen(true)}>
                  <UserPlus /> {confirming ? "Đang tạo…" : `Tạo ${validRows.toLocaleString("vi-VN")} tài khoản`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && confirmResult && (
          <Card>
            <CardHeader>
              <CardTitle>Bước 4 · Đã tạo tài khoản</CardTitle>
              <CardDescription>Tải danh sách tài khoản kèm mật khẩu tạm và gửi cho từng người dùng</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-start gap-2 rounded-2xl bg-green-50 p-4 text-sm text-ink-soft">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
                <span>
                  Đã tạo <strong className="text-ink">{confirmResult.created.toLocaleString("vi-VN")}</strong> tài khoản{" "}
                  {meta.label.toLowerCase()} lúc <strong className="text-ink">{formatDate(new Date())}</strong>
                  {confirmResult.skipped > 0 && (
                    <>
                      , bỏ qua <strong className="text-ink">{confirmResult.skipped.toLocaleString("vi-VN")}</strong> dòng lỗi
                    </>
                  )}
                  . Người dùng phải đổi mật khẩu tạm ở lần đăng nhập đầu tiên.
                </span>
              </div>

              <p className="flex items-start gap-2 rounded-xl bg-orange-50 p-3.5 text-xs leading-relaxed text-ink-soft">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                File danh sách tài khoản chỉ tải được một lần trong vòng 15 phút kể từ lúc xác nhận. Mật khẩu tạm không
                hiển thị lại ở đây — hãy tải ngay và gửi cho từng người dùng.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={onDownloadCredentials}>
                  <Download /> Tải danh sách tài khoản
                </Button>
                <Button variant="outline" onClick={reset}>
                  <RefreshCw /> Nhập thêm file khác
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
        description={`Tạo ${validRows.toLocaleString("vi-VN")} tài khoản ${meta.label.toLowerCase()} từ các dòng hợp lệ trong file.`}
        detail={
          errorRows > 0
            ? `${errorRows.toLocaleString("vi-VN")} dòng đang bị lỗi sẽ được bỏ qua. Thao tác này ghi vào nhật ký hệ thống.`
            : "Toàn bộ dòng trong file đều hợp lệ. Thao tác này ghi vào nhật ký hệ thống."
        }
        confirmLabel={`Tạo ${validRows.toLocaleString("vi-VN")} tài khoản`}
        tone="primary"
        onConfirm={() => void onConfirm(false)}
      />

      <ConfirmDialog
        open={skipOpen}
        onOpenChange={setSkipOpen}
        title="Còn dòng lỗi — bỏ qua?"
        description={`File còn ${errorRows.toLocaleString("vi-VN")} dòng lỗi. Bạn có thể bỏ qua chúng và chỉ tạo tài khoản cho ${validRows.toLocaleString("vi-VN")} dòng hợp lệ.`}
        detail="Các dòng lỗi sẽ được đánh dấu và giữ lại trong lô nhập để kiểm tra sau. Thao tác này ghi vào nhật ký hệ thống."
        confirmLabel="Bỏ qua dòng lỗi và tạo tài khoản"
        tone="danger"
        onConfirm={() => void onConfirm(true)}
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
