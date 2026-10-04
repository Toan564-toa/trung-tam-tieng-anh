import type { ReactNode } from "react"
import { cn } from "cn"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input, fieldBase } from "@/components/ui/input"

/** Bộ lọc dùng chung cho các bảng quản trị: ô tìm kiếm + danh sách select + hành động. */
export function TableToolbar({
  query,
  onQueryChange,
  searchPlaceholder = "Tìm kiếm…",
  children,
  actions,
}: {
  query?: string
  onQueryChange?: (value: string) => void
  searchPlaceholder?: string
  children?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {onQueryChange && (
          <div className="relative min-w-56 flex-1 lg:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-soft" />
            <Input
              value={query ?? ""}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-10 pl-9 text-sm"
            />
          </div>
        )}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** Select nhỏ dùng trong toolbar (cao bằng ô tìm kiếm). */
export function ToolbarSelect({
  id,
  value,
  onChange,
  options,
  label,
  className,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  label: string
  className?: string
}) {
  return (
    <select
      id={id}
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(fieldBase, "h-10 min-w-32 cursor-pointer appearance-none pr-8 text-sm font-medium", className)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

/** Phân trang dạng số gọn. */
export function TablePagination({
  page,
  pageCount,
  total,
  onPageChange,
}: {
  page: number
  pageCount: number
  total: number
  onPageChange: (page: number) => void
}) {
  if (pageCount <= 1) return null
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
      <p className="text-xs text-ink-soft">
        Trang <span className="font-semibold text-ink">{page}</span> / {pageCount} · {total} bản ghi
      </p>
      <div className="flex gap-1.5">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Trước
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
          Sau
        </Button>
      </div>
    </div>
  )
}

/** Ô trạng thái rỗng khi bảng không có dữ liệu. */
export function TableEmpty({ colSpan, message = "Không có dữ liệu phù hợp với bộ lọc." }: { colSpan: number; message?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-sm text-ink-soft">
        {message}
      </td>
    </tr>
  )
}
