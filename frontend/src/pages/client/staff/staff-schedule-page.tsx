import { useMemo, useState } from "react"
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Pencil,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react"
import { cn } from "cn"
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
import {
  CENTER_CLASSES,
  CENTER_EVENT_META,
  CENTER_EVENT_SCOPE_META,
  STAFF_EVENTS,
  STAFF_PROFILE,
  STAFF_TODAY,
  eventAudienceText,
  type CenterEvent,
  type CenterEventScope,
  type CenterEventType,
} from "@/data/staff"

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
  date: toDateKey(STAFF_TODAY),
  startTime: "17:00",
  endTime: "18:30",
  location: "",
  scope: "all",
  classIds: [],
  description: "",
}

export function StaffSchedulePage() {
  const [month, setMonth] = useState(() => new Date(2026, 9, 1))
  const [events, setEvents] = useState<CenterEvent[]>(STAFF_EVENTS)
  const [scopeFilter, setScopeFilter] = useState<CenterEventScope | "all">("all")
  const [selected, setSelected] = useState<CenterEvent | null>(null)
  const [draft, setDraft] = useState<EventDraft | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<CenterEvent | null>(null)

  const grid = useMemo(() => buildMonthGrid(month), [month])

  const visible = useMemo(
    () => (scopeFilter === "all" ? events : events.filter((e) => e.scope === scopeFilter)),
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
        .filter((e) => e.date >= STAFF_TODAY)
        .sort((a, b) => a.date.getTime() - b.date.getTime() || a.startTime.localeCompare(b.startTime)),
    [visible],
  )

  const openCreate = (date?: Date) => {
    setDraft({ ...EMPTY_DRAFT, date: date ? toDateKey(date) : toDateKey(STAFF_TODAY) })
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
      classIds: event.classIds,
      description: event.description,
    })
  }

  const saveDraft = () => {
    if (!draft) return
    if (!draft.title.trim()) {
      toast.error("Vui lòng nhập tiêu đề sự kiện")
      return
    }
    if (draft.scope === "classes" && draft.classIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một lớp", { description: "Sự kiện theo lớp cần có lớp nhận thông báo." })
      return
    }
    if (draft.startTime && draft.endTime && draft.endTime <= draft.startTime) {
      toast.error("Giờ kết thúc phải sau giờ bắt đầu")
      return
    }

    const [year, m, day] = draft.date.split("-").map(Number)
    const payload: CenterEvent = {
      id: draft.id ?? `ev-staff-${Date.now()}`,
      type: draft.type,
      title: draft.title.trim(),
      date: new Date(year, m - 1, day),
      startTime: draft.startTime,
      endTime: draft.endTime,
      location: draft.location.trim() || "Chưa xác định",
      scope: draft.scope,
      classIds: draft.scope === "classes" ? draft.classIds : [],
      description: draft.description.trim(),
      createdBy: STAFF_PROFILE.fullName,
    }

    setEvents((prev) => (draft.id ? prev.map((e) => (e.id === draft.id ? payload : e)) : [...prev, payload]))
    setDraft(null)
    toast.success(draft.id ? "Đã cập nhật sự kiện!" : "Đã tạo sự kiện!", {
      description: `${payload.title} · ${formatDate(payload.date)}`,
    })
  }

  const removeEvent = (event: CenterEvent) => {
    setEvents((prev) => prev.filter((e) => e.id !== event.id))
    setConfirmDelete(null)
    setSelected(null)
    toast.success("Đã xoá sự kiện", { description: event.title })
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Toàn trung tâm · nhân viên quản lý"
        title="Lịch trình trung tâm"
        description="Tạo và chỉnh sửa lịch học, kỳ thi, ngày lễ và sự kiện áp dụng cho toàn trung tâm, giáo viên, nhân viên hoặc từng lớp."
        actions={
          <Button onClick={() => openCreate()}>
            <CalendarPlus /> Thêm sự kiện
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Reveal>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" aria-label="Tháng trước" onClick={() => setMonth((m) => addMonths(m, -1))}>
                  <ChevronLeft />
                </Button>
                <p className="min-w-32 text-center font-heading text-lg font-bold text-ink">{formatMonthYear(month)}</p>
                <Button variant="outline" size="icon" aria-label="Tháng sau" onClick={() => setMonth((m) => addMonths(m, 1))}>
                  <ChevronRight />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-1.5">
                  <FilterChip active={scopeFilter === "all"} onClick={() => setScopeFilter("all")}>
                    Tất cả
                  </FilterChip>
                  {(Object.entries(CENTER_EVENT_SCOPE_META) as [CenterEventScope, (typeof CENTER_EVENT_SCOPE_META)[CenterEventScope]][]).map(
                    ([scope, meta]) => (
                      <FilterChip key={scope} active={scopeFilter === scope} onClick={() => setScopeFilter(scope)}>
                        {meta.label}
                      </FilterChip>
                    ),
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setMonth(new Date(2026, 9, 1))} disabled={month.getMonth() === 9 && month.getFullYear() === 2026}>
                  Tháng này
                </Button>
              </div>
            </div>
            <CardContent className="p-3 sm:p-5">
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {CALENDAR_WEEKDAYS.map((day) => (
                  <div key={day} className="pb-2 text-center text-xs font-bold text-ink-soft">{day}</div>
                ))}
                {grid.map(({ date, inMonth }) => {
                  const dayEvents = byDay.get(toDateKey(date)) ?? []
                  const isToday = isSameDay(date, STAFF_TODAY)
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
                        <span className={cn("flex size-6 items-center justify-center rounded-full text-xs font-semibold", isToday ? "bg-brand font-bold text-ink" : "text-ink")}>
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
                          <span className="px-1.5 text-[10px] font-semibold text-ink-soft">+{dayEvents.length - 2} sự kiện</span>
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
          <Reveal delay={0.05}>
            <Card>
              <CardContent className="p-5">
                <p className="font-heading text-sm font-bold text-ink">Chú thích</p>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {(Object.entries(CENTER_EVENT_META) as [CenterEventType, (typeof CENTER_EVENT_META)[CenterEventType]][]).map(([type, meta]) => (
                    <li key={type} className="flex items-center gap-2.5 text-sm text-ink-soft">
                      <span className={cn("size-2.5 rounded-full", meta.dot)} />
                      {meta.label}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.1}>
            <Card>
              <CardHeader>
                <CardTitle>Sự kiện sắp tới</CardTitle>
                <CardDescription>Sắp xếp theo thời gian · có thể sửa hoặc xoá</CardDescription>
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
                            {event.startTime ? ` · ${event.startTime} – ${event.endTime}` : ""} · {eventAudienceText(event)}
                          </p>
                        </button>
                        <Badge variant={CENTER_EVENT_META[event.type].badge} className="shrink-0">
                          {CENTER_EVENT_META[event.type].label}
                        </Badge>
                      </div>
                      <div className="mt-2 flex gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(event)}>
                          <Pencil /> Sửa
                        </Button>
                        <Button variant="ghost" size="sm" className="text-danger hover:bg-red-50" onClick={() => setConfirmDelete(event)}>
                          <Trash2 /> Xoá
                        </Button>
                      </div>
                    </li>
                  ))}
                  {upcoming.length === 0 && (
                    <p className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-xs text-ink-soft">
                      Không có sự kiện nào sắp tới trong bộ lọc này.
                    </p>
                  )}
                </ul>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.15}>
            <Card>
              <CardHeader>
                <CardTitle>Phòng học đang dùng</CardTitle>
                <CardDescription>Theo sự kiện sắp tới</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {Object.entries(
                    upcoming
                      .filter((e) => e.startTime)
                      .reduce<Record<string, CenterEvent[]>>((acc, event) => {
                        const list = acc[event.location]
                        if (list) list.push(event)
                        else acc[event.location] = [event]
                        return acc
                      }, {}),
                  )
                    .slice(0, 5)
                    .map(([location, list]) => (
                      <li key={location} className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate text-ink-soft">{location}</span>
                        <Badge variant={list.length > 1 ? "warning" : "neutral"}>{list.length} sự kiện</Badge>
                      </li>
                    ))}
                  {upcoming.filter((e) => e.startTime).length === 0 && (
                    <p className="text-xs text-ink-soft">Chưa có sự kiện nào có giờ cụ thể.</p>
                  )}
                </ul>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>

      {/* Chi tiết sự kiện */}
      <Modal
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected?.title ?? ""}
        description={selected ? formatDateLong(selected.date) : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setSelected(null)}>Đóng</Button>
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
              <Row icon={Clock} label="Thời gian" value={selected.startTime ? `${selected.startTime} – ${selected.endTime}` : "Cả ngày"} />
              <Row icon={MapPin} label="Địa điểm" value={selected.location} />
              <Row icon={Users} label="Đối tượng" value={eventAudienceText(selected)} />
            </dl>
            {selected.description && (
              <p className="rounded-xl bg-surface p-3.5 text-sm leading-relaxed text-ink-soft">{selected.description}</p>
            )}
            <p className="text-xs text-ink-soft">Người tạo: {selected.createdBy}</p>
          </div>
        )}
      </Modal>

      {/* Form thêm / sửa */}
      <Modal
        open={Boolean(draft)}
        onOpenChange={(open) => !open && setDraft(null)}
        title={draft?.id ? "Chỉnh sửa sự kiện" : "Thêm sự kiện"}
        description="Chọn đối tượng nhận để học viên, giáo viên và nhân viên thấy đúng nội dung."
        icon={<CalendarPlus className="size-6" />}
        className="sm:max-w-xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setDraft(null)}>Hủy bỏ</Button>
            <Button onClick={saveDraft}>{draft?.id ? "Lưu thay đổi" : "Tạo sự kiện"}</Button>
          </>
        }
      >
        {draft && (
          <div className="flex flex-col gap-4">
            <FormField id="cev-title" label="Tiêu đề" required>
              <Input id="cev-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Ví dụ: English Day 2026" />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="cev-type" label="Loại sự kiện" required>
                <select
                  id="cev-type"
                  value={draft.type}
                  onChange={(e) => setDraft({ ...draft, type: e.target.value as CenterEventType })}
                  className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}
                >
                  {(Object.entries(CENTER_EVENT_META) as [CenterEventType, (typeof CENTER_EVENT_META)[CenterEventType]][]).map(([type, meta]) => (
                    <option key={type} value={type}>{meta.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField id="cev-date" label="Ngày" required>
                <Input id="cev-date" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="cev-start" label="Giờ bắt đầu" hint={<span className="text-xs text-ink-soft">Để trống nếu cả ngày</span>}>
                <Input id="cev-start" type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} />
              </FormField>
              <FormField id="cev-end" label="Giờ kết thúc">
                <Input id="cev-end" type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} />
              </FormField>
            </div>
            <FormField id="cev-location" label="Địa điểm">
              <Input id="cev-location" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="Ví dụ: Phòng 401" />
            </FormField>
            <FormField id="cev-scope" label="Đối tượng nhận" required hint={<span className="text-xs text-ink-soft">{CENTER_EVENT_SCOPE_META[draft.scope].description}</span>}>
              <select
                id="cev-scope"
                value={draft.scope}
                onChange={(e) => setDraft({ ...draft, scope: e.target.value as CenterEventScope })}
                className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}
              >
                {(Object.entries(CENTER_EVENT_SCOPE_META) as [CenterEventScope, (typeof CENTER_EVENT_SCOPE_META)[CenterEventScope]][]).map(([scope, meta]) => (
                  <option key={scope} value={scope}>{meta.label}</option>
                ))}
              </select>
            </FormField>
            {draft.scope === "classes" && (
              <FormField id="cev-classes" label="Chọn lớp nhận thông báo" required>
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
            <FormField id="cev-desc" label="Mô tả">
              <Textarea id="cev-desc" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Nội dung chi tiết, thời lượng, chuẩn bị..." />
            </FormField>
          </div>
        )}
      </Modal>

      {/* Xác nhận xoá */}
      <Modal
        open={Boolean(confirmDelete)}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Xoá sự kiện?"
        description={confirmDelete?.title}
        icon={<Trash2 className="size-6" />}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Giữ lại</Button>
            <Button variant="danger" onClick={() => confirmDelete && removeEvent(confirmDelete)}>Xoá</Button>
          </>
        }
      >
        <p className="rounded-xl bg-red-50 p-3.5 text-sm leading-relaxed text-ink-soft">
          Thao tác này không thể hoàn tác. Sự kiện sẽ biến mất khỏi lịch trình của {confirmDelete ? eventAudienceText(confirmDelete).toLowerCase() : "đối tượng liên quan"}.
        </p>
      </Modal>
    </div>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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