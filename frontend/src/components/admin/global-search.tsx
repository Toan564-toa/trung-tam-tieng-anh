import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CornerDownLeft, Search } from "lucide-react"
import { cn } from "cn"
import {
  ADMIN_ACCOUNTS,
  ADMIN_COURSES,
  ADMIN_ROOMS,
  managedStudents,
  managedTeachers,
} from "@/data/admin"
import { CENTER_CLASSES } from "@/data/staff"

type SearchResult = {
  id: string
  label: string
  meta: string
  to: string
  group: string
}

/** Tìm kiếm toàn cục: học viên, giáo viên, lớp, khóa học, phòng học và tài khoản. */
export function GlobalSearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)

  const index = useMemo<SearchResult[]>(() => {
    const people = [
      ...managedStudents().map((s) => ({ id: s.id, label: s.fullName, meta: `${s.code} · ${s.group}`, to: "/admin/hoc-vien", group: "Học viên" })),
      ...managedTeachers().map((t) => ({ id: t.id, label: t.fullName, meta: `${t.code} · ${t.group}`, to: "/admin/giao-vien", group: "Giáo viên" })),
    ]
    return [
      ...people,
      ...CENTER_CLASSES.map((c) => ({ id: c.id, label: c.name, meta: `${c.code} · ${c.teacher}`, to: "/admin/lop-hoc", group: "Lớp học" })),
      ...ADMIN_COURSES.map((c) => ({ id: c.id, label: c.name, meta: c.level, to: "/admin/khoa-hoc", group: "Khóa học" })),
      ...ADMIN_ROOMS.map((r) => ({ id: r.id, label: r.name, meta: `Sức chứa ${r.capacity} chỗ`, to: "/admin/phong-hoc", group: "Phòng học" })),
      ...ADMIN_ACCOUNTS.filter((a) => !a.deletedAt).map((a) => ({ id: a.id, label: a.fullName, meta: `${a.username} · ${a.role}`, to: "/admin/tai-khoan", group: "Tài khoản" })),
    ]
  }, [])

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (needle.length < 2) return []
    return index
      .filter((item) => `${item.label} ${item.meta}`.toLowerCase().includes(needle))
      .slice(0, 8)
  }, [index, query])

  const activeIndex = Math.min(active, Math.max(results.length - 1, 0))

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  const go = (item: SearchResult | undefined) => {
    if (!item) return
    navigate(item.to)
    setQuery("")
    setOpen(false)
  }

  return (
    <div ref={boxRef} className="relative hidden w-full max-w-md md:block">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-soft" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault()
            setActive((prev) => Math.min(prev + 1, results.length - 1))
          }
          if (e.key === "ArrowUp") {
            e.preventDefault()
            setActive((prev) => Math.max(prev - 1, 0))
          }
          if (e.key === "Enter") {
            e.preventDefault()
            go(results[activeIndex])
          }
          if (e.key === "Escape") setOpen(false)
        }}
        placeholder="Tìm học viên, lớp, tài khoản…"
        aria-label="Tìm kiếm toàn cục"
        className="h-10 w-full rounded-full border border-slate-200 bg-surface pr-3 pl-9 text-sm text-ink transition-colors outline-none placeholder:text-ink-soft focus-visible:border-brand focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-brand/20"
      />

      {open && query.trim().length >= 2 && (
        <div className="absolute top-12 right-0 left-0 z-50 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-lift">
          {results.length === 0 ? (
            <p className="px-4 py-5 text-center text-sm text-ink-soft">Không tìm thấy kết quả nào.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {results.map((item, position) => (
                <li key={`${item.group}-${item.id}`}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(position)}
                    onClick={() => go(item)}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      position === activeIndex ? "bg-cream" : "hover:bg-surface",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{item.label}</span>
                      <span className="block truncate text-xs text-ink-soft">{item.meta}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-ink-soft">{item.group}</span>
                    {position === activeIndex && <CornerDownLeft className="size-3.5 shrink-0 text-ink-soft" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
