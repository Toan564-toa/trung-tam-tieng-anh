import { useMemo, useState, type ReactNode } from "react"
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  MapPin,
  Pencil,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react"
import { cn } from "cn"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { PageHeader } from "@/components/layout/page-header"
import { Reveal } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { fieldBase, Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { ADMIN_TODAY, ADMIN_TODAY_LABEL } from "@/data/admin"
import {
  CENTER_CLASSES,
  CENTER_EVENT_META,
  CENTER_EVENT_SCOPE_META,
  STAFF_EVENTS,
  eventAudienceText,
  type CenterEvent,
  type CenterEventScope,
  type CenterEventType,
} from "@/data/staff"
import { exportAdminTable } from "@/lib/admin-excel"
import {
  CALENDAR_WEEKDAYS,
  addMonths,
  buildMonthGrid,
  formatDate,
  formatDateLong,
  formatMonthYear,
  isSameDay,
  toDateKey,
} from "@/lib/date"

const EVENT_TYPES = Object.keys(CENTER_EVENT_META) as CenterEventType[]
const EVENT_SCOPES = Object.keys(CENTER_EVENT_SCOPE_META) as CenterEventScope[]

const TODAY_MONTH = new Date(2026, 9, 1)

type EventDraft = {
  id: string | null
  title: string
  type: CenterEventType
  date: string
  startTime: string
  endTime: string
  location: string
  scope: CenterEventScope
  classIds: string[]
  description: string
}

const EMPTY_DRAFT: EventDraft = {
  id: null,
  title: "",
  type: "event",
  date: toDateKey(ADMIN_TODAY),
  startTime: "17:00",
  endTime: "18:30",
  location: "",
  scope: "all",
  classIds: [],
  description: "",
}

export function AdminEventsPage() {
  const [month, setMonth] = useState(TODAY_MONTH)
  const [events, setEvents] = useState<CenterEvent[]>(STAFF_EVENTS)
  const [scopeFilter, setScopeFilter] = useState<CenterEventScope | "all">("all")

  const [selected, setSelected] = useState<CenterEvent | null>(null)
  const [draft, setDraft] = useState<EventDraft | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<CenterEvent | null>(null)

  const grid = useMemo(() => buildMonthGrid(month), [month])

  const visible = useMemo(
    () => (scopeFilter === "all" ? events : events.filter((event) => event.scope === scopeFilter)),
    [events, scopeFilter],
  )

  const byDay = useMemo(() => {
    const map = new Map<string, CenterEvent[]>()
    for (const event of visible) {
      const key = toDateKey(event.date)
      const list = map.get(key)
      if (list) list.push(event)
      else map.set(key, [event])
    }
    return map
  }, [visible])

  const upcoming = useMemo(
    () =>
      visible
        .filter((event) => event.date.getTime() >= ADMIN_TODAY.getTime())
        .sort((a, b) => a.date.getTime() - b.date.getTime() || a.startTime.localeCompare(b.startTime)),
    [visible],
  )

  const stats = useMemo(() => {
    const monthPrefix = toDateKey(month).slice(0, 7)
    return {
      month: events.filter((event) => toDateKey(event.date).startsWith(monthPrefix)).length,
      exams: events.filter((event) => event.type === "exam").length,
      upcoming: upcoming.length,
      classes: new Set(events.flatMap((event) => event.classIds)).size,
    }
  }, [events, month, upcoming])

  const openCreate = (date?: Date) => {
    setSelected(null)
    setDraft({ ...EMPTY_DRAFT, date: date ? toDateKey(date) : toDateKey(ADMIN_TODAY) })
  }

  const openEdit = (event: CenterEvent) => {
    setSelected(null)
    setDraft({
      id: event.id,
      title: event.title,
      type: event.type,
      date: toDateKey(event.date),
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      scope: event.scope,
      classIds: [...event.classIds],
      description: event.description,
    })
  }

  const closeDraft = () => {
    setDraft(null)
  }

  const toggleClass = (classId: string) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            classIds: prev.classIds.includes(classId)
              ? prev.classIds.filter((id) => id !== classId)
              : [...prev.classIds, classId],
          }
        : prev,
    )
  }

  const saveDraft = () => {
    if (!draft) return
    if (!draft.title.trim()) {
      toast.error("Vui lòng nhập tiêu đề sự kiện")
      return
    }
    if (draft.scope === "classes" && draft.classIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một lớp", {
        description: "Sự kiện theo lớp cần có lớp nhận thông báo.",
      })
      return
    }
    if (draft.startTime && draft.endTime && draft.endTime <= draft.startTime) {
      toast.error("Giờ kết thúc phải sau giờ bắt đầu")
      return
    }

    const [year, monthValue, day] = draft.date.split("-").map(Number)
    const payload: CenterEvent = {
      id: draft.id ?? `ev-admin-${Date.now()}`,
      type: draft.type,
      title: draft.title.trim(),
      date: new Date(year, monthValue - 1, day),
      startTime: draft.startTime,
      endTime: draft.endTime,
      location: draft.location.trim() || "Chưa xác định",
      scope: draft.scope,
      classIds: draft.scope === "classes" ? draft.classIds : [],
      description: draft.description.trim(),
      createdBy: "Quản trị",
    }

    setEvents((prev) => (draft.id ? prev.map((item) => (item.id === draft.id ? payload : item)) : [...prev, payload]))
    setDraft(null)
    toast.success(draft.id ? "Đã cập nhật sự kiện!" : "Đã tạo sự kiện!", {
      description: `${payload.title} · ${formatDate(payload.date)}`,
    })
  }

  const removeEvent = (event: CenterEvent) => {
    setEvents((prev) => prev.filter((item) => item.id !== event.id))
    setConfirmDelete(null)
    setSelected(null)
    toast.success("Đã xoá sự kiện", { description: event.title })
  }

  const exportEvents = () => {
    void exportAdminTable(
      "Lich-trinh-trung-tam",
      "Lịch trình",
      ["Tiêu đề", "Loại", "Ngày", "Giờ bắt đầu", "Giờ kết thúc", "Địa điểm", "Đối tượng", "Người tạo"],
      events
        .slice()
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((event) => [
          event.title,
          CENTER_EVENT_META[event.type].label,
          formatDate(event.date),
          event.startTime,
          event.endTime,
          event.location,
          eventAudienceText(event),
          event.createdBy,
        ]),
    ).then(() => toast.success("Đã xuất Excel lịch trình"))
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`Lịch trình toàn trung tâm · dữ liệu ${ADMIN_TODAY_LABEL}`}
        title="Lịch trình"
        description="Quản lý kỳ thi, buổi học bù, ngày lễ, đào tạo và sự kiện áp dụng cho toàn trung tâm, giáo viên, nhân viên hoặc từng lớp."
        actions={
          <>
            <Button variant="outline" onClick={exportEvents}>
              <Download /> Xuất Excel
            </Button>
            <Button onClick={() => openCreate()}>
              <CalendarPlus /> Thêm sự kiện
            </Button>
          </>
        }
      />

      <Reveal>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat label={`Sự kiện trong ${formatMonthYear(month).toLowerCase()}`} value={String(stats.month)} />
          <MiniStat label="Kỳ thi đã lên lịch" value={String(stats.exams)} />
          <MiniStat label="Sự kiện sắp tới" value={String(stats.upcoming)} />
          <MiniStat label="Lớp có thông báo" value={String(stats.classes)} />
        </div>
      </Reveal>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Reveal delay={0.05}>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Tháng trước"
                  onClick={() => setMonth((current) => addMonths(current, -1))}
                >
                  <ChevronLeft />
                </Button>
                <p className="min-w-32 text-center font-heading text-lg font-bold text-ink">{formatMonthYear(month)}</p>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Tháng sau"
                  onClick={() => setMonth((current) => addMonths(current, 1))}
                >
                  <ChevronRight />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-1.5">
                  <FilterChip active={scopeFilter === "all"} onClick={() => setScopeFilter("all")}>
                    Tất cả
                  </FilterChip>
                  {EVENT_SCOPES.map((scope) => (
                    <FilterChip key={scope} active={scopeFilter === scope} onClick={() => setScopeFilter(scope)}>
                      {CENTER_EVENT_SCOPE_META[scope].label}
                    </FilterChip>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMonth(TODAY_MONTH)}
                  disabled={month.getMonth() === 9 && month.getFullYear() === 2026}
                >
                  Tháng này
                </Button>
              </div>
            </div>
            <CardContent className="p-3 sm:p-5">
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {CALENDAR_WEEKDAYS.map((day) => (
                  <div key={day} className="pb-2 text-center text-xs font-bold text-ink-soft">
                    {day}
                  </div>
                ))}
                {grid.map(({ date, inMonth }) => {
                  const dayEvents = byDay.get(toDateKey(date)) ?? []
                  const isToday = isSameDay(date, ADMIN_TODAY)
                  return (
                    <div
                      key={toDateKey(date)}
                      className={cn(
                        "flex min-h-[72px] flex-col gap-1 rounded-xl border p-1.5 transition-colors sm:min-h-[96px]",
                        inMonth ? "border-transparent hover:border-brand/30 hover:bg-cream/50" : "border-transparent opacity-35",
                        isToday && "border-brand bg-cream",
                      )}
                    >
                      <div className="flex items-center justify-between px-0.5">
                        <span
                          className={cn(
                            "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                            isToday ? "bg-brand font-bold text-ink" : "text-ink",
                          )}
                        >
                          {date.getDate()}
                        </span>
                        <button
                          type="button"
                          onClick={() => openCreate(date)}
                          aria-label={`Thêm sự kiện ngày ${formatDate(date)}`}
                          className="flex size-5 cursor-pointer items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-brand hover:text-ink"
                        >
                          <CalendarPlus className="size-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-col gap-1">
                        {dayEvents.slice(0, 2).map((event) => (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => setSelected(event)}
                            className={cn(
                              "flex w-full cursor-pointer items-center gap-1 truncate rounded-md px-1.5 py-1 text-left text-[10px] font-medium transition-opacity hover:opacity-80 sm:text-[11px]",
                              CENTER_EVENT_META[event.type].chip,
                            )}
                          >
                            {event.startTime ? `${event.startTime} ` : ""}
                            {event.title}
                          </button>
                        ))}
                        {dayEvents.length > 2 && (
                          <span className="px-1.5 text-[10px] font-semibold text-ink-soft">
                            +{dayEvents.length - 2} sự kiện
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </Reveal>

        <div className="flex flex-col gap-6">
          <Reveal delay={0.1}>
            <Card>
              <CardHeader>
                <CardTitle>Sự kiện sắp tới</CardTitle>
                <CardDescription>Từ {ADMIN_TODAY_LABEL} trở đi · sắp xếp theo thời gian</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2.5">
                  {upcoming.slice(0, 6).map((event) => (
                    <li key={event.id} className="rounded-xl border border-slate-100 p-3 transition-colors hover:border-brand/40">
                      <div className="flex items-start justify-between gap-2">
                        <button type="button" onClick={() => setSelected(event)} className="min-w-0 flex-1 cursor-pointer text-left">
                          <p className="truncate text-sm font-semibold text-ink">{event.title}</p>
                          <p className="mt-0.5 text-xs text-ink-soft">
                            {formatDate(event.date)}
                            {event.startTime ? ` · ${event.startTime} – ${event.endTime}` : ""} · {event.location}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-ink-soft">{eventAudienceText(event)}</p>
                        </button>
                        <Badge variant={CENTER_EVENT_META[event.type].badge} className="shrink-0">
                          {CENTER_EVENT_META[event.type].label}
                        </Badge>
                      </div>
                      <div className="mt-2 flex gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(event)}>
                          <Pencil /> Sửa
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger hover:bg-red-50"
                          onClick={() => setConfirmDelete(event)}
                        >
                          <Trash2 /> Xoá
                        </Button>
                      </div>
                    </li>
                  ))}
                  {upcoming.length === 0 && (
                    <li className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-xs text-ink-soft">
                      Không có sự kiện nào sắp tới trong bộ lọc này.
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.15}>
            <Card>
              <CardContent className="p-5">
                <p className="font-heading text-sm font-bold text-ink">Chú thích loại sự kiện</p>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {EVENT_TYPES.map((type) => (
                    <li key={type} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2.5 text-ink-soft">
                        <span className={cn("size-2.5 rounded-full", CENTER_EVENT_META[type].dot)} />
                        {CENTER_EVENT_META[type].label}
                      </span>
                      <span className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-ink-soft">
                        {events.filter((event) => event.type === type).length}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>

      <Modal
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected?.title ?? ""}
        description={selected ? formatDateLong(selected.date) : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Đóng
            </Button>
            <Button onClick={() => selected && openEdit(selected)}>
              <Pencil /> Chỉnh sửa
            </Button>
          </>
        }
      >
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={CENTER_EVENT_META[selected.type].badge}>{CENTER_EVENT_META[selected.type].label}</Badge>
              <Badge variant="neutral">{CENTER_EVENT_SCOPE_META[selected.scope].label}</Badge>
            </div>
            <dl className="flex flex-col gap-2.5 text-sm">
              <Row
                icon={Clock}
                label="Thời gian"
                value={selected.startTime ? `${selected.startTime} – ${selected.endTime}` : "Cả ngày"}
              />
              <Row icon={MapPin} label="Địa điểm" value={selected.location} />
              <Row icon={Users} label="Đối tượng" value={eventAudienceText(selected)} />
            </dl>
            {selected.description && (
              <p className="rounded-xl bg-surface p-3.5 text-sm leading-relaxed text-ink-soft">{selected.description}</p>
            )}
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-ink-soft">
              <span>Người tạo: {selected.createdBy}</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-danger hover:bg-red-50"
                onClick={() => {
                  setConfirmDelete(selected)
                  setSelected(null)
                }}
              >
                <Trash2 /> Xoá sự kiện
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(draft)}
        onOpenChange={(open) => !open && closeDraft()}
        title={draft?.id ? "Chỉnh sửa sự kiện" : "Thêm sự kiện"}
        description="Chọn đối tượng nhận để học viên, giáo viên và nhân viên thấy đúng nội dung."
        icon={<CalendarPlus className="size-6" />}
        className="sm:max-w-xl"
        footer={
          <>
            <Button variant="outline" onClick={closeDraft}>
              Huỷ bỏ
            </Button>
            <Button onClick={saveDraft}>{draft?.id ? "Lưu thay đổi" : "Tạo sự kiện"}</Button>
          </>
        }
      >
        {draft && (
          <div className="flex flex-col gap-4">
            <FormField id="admin-ev-title" label="Tiêu đề" required>
              <Input
                id="admin-ev-title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Ví dụ: Kỳ thi Cambridge YLE Movers"
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="admin-ev-type" label="Loại sự kiện" required>
                <select
                  id="admin-ev-type"
                  value={draft.type}
                  onChange={(e) => setDraft({ ...draft, type: e.target.value as CenterEventType })}
                  className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {CENTER_EVENT_META[type].label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField id="admin-ev-date" label="Ngày" required>
                <Input
                  id="admin-ev-date"
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="admin-ev-start" label="Giờ bắt đầu" hint={<span className="text-xs text-ink-soft">Để trống nếu cả ngày</span>}>
                <Input
                  id="admin-ev-start"
                  type="time"
                  value={draft.startTime}
                  onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
                />
              </FormField>
              <FormField id="admin-ev-end" label="Giờ kết thúc">
                <Input
                  id="admin-ev-end"
                  type="time"
                  value={draft.endTime}
                  onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
                />
              </FormField>
            </div>
            <FormField id="admin-ev-location" label="Địa điểm">
              <Input
                id="admin-ev-location"
                value={draft.location}
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                placeholder="Ví dụ: Phòng 401"
              />
            </FormField>
            <FormField
              id="admin-ev-scope"
              label="Đối tượng nhận"
              required
              hint={<span className="text-xs text-ink-soft">{CENTER_EVENT_SCOPE_META[draft.scope].description}</span>}
            >
              <select
                id="admin-ev-scope"
                value={draft.scope}
                onChange={(e) => setDraft({ ...draft, scope: e.target.value as CenterEventScope })}
                className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}
              >
                {EVENT_SCOPES.map((scope) => (
                  <option key={scope} value={scope}>
                    {CENTER_EVENT_SCOPE_META[scope].label}
                  </option>
                ))}
              </select>
            </FormField>
            {draft.scope === "classes" && (
              <FormField id="admin-ev-classes" label="Chọn lớp nhận thông báo" required>
                <div className="flex max-h-48 flex-col gap-2 overflow-y-auto rounded-xl border border-slate-100 p-3">
                  {CENTER_CLASSES.map((cls) => (
                    <label key={cls.id} className="flex cursor-pointer items-center gap-2.5 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.classIds.includes(cls.id)}
                        onChange={() => toggleClass(cls.id)}
                        className="size-4 cursor-pointer accent-amber-500"
                      />
                      <span className="min-w-0 flex-1 truncate text-ink">{cls.name}</span>
                      <Badge variant={cls.tone}>{cls.code}</Badge>
                    </label>
                  ))}
                </div>
              </FormField>
            )}
            <FormField id="admin-ev-desc" label="Mô tả">
              <Textarea
                id="admin-ev-desc"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Nội dung chi tiết, thời lượng, chuẩn bị..."
              />
            </FormField>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Xoá sự kiện?"
        description={
          confirmDelete ? `${confirmDelete.title} · ${formatDate(confirmDelete.date)}` : undefined
        }
        detail={
          confirmDelete
            ? `Sự kiện sẽ biến mất khỏi lịch trình của ${eventAudienceText(confirmDelete).toLowerCase()}. Thao tác này không thể hoàn tác.`
            : undefined
        }
        confirmLabel="Xoá sự kiện"
        onConfirm={() => confirmDelete && removeEvent(confirmDelete)}
      />
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-ink-soft">{label}</p>
        <p className="font-heading text-2xl font-extrabold text-ink tabular-nums">{value}</p>
      </CardContent>
    </Card>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-9 cursor-pointer rounded-xl px-3 text-xs font-semibold transition-colors",
        active ? "bg-brand text-ink shadow-glow" : "bg-surface text-ink-soft hover:bg-cream",
      )}
    >
      {children}
    </button>
  )
}

function Row({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-4 shrink-0 text-ink-soft" />
      <dt className="w-24 shrink-0 text-ink-soft">{label}</dt>
      <dd className="min-w-0 flex-1 font-medium text-ink">{value}</dd>
    </div>
  )
}
