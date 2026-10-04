import { useMemo, useState } from "react"
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  Lock,
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
  CENTER_EVENTS,
  CLASSES,
  OWN_EVENTS,
  TEACHER_EVENT_META,
  TODAY,
  audienceLabel,
  type TeacherEvent,
  type TeacherEventType,
} from "@/data/teacher"

type EventDraft = {
  id: string | null
  title: string
  type: TeacherEventType
  date: string
  startTime: string
  endTime: string
  location: string
  audience: string
  description: string
}

const EMPTY_DRAFT: EventDraft = {
  id: null,
  title: "",
  type: "class",
  date: toDateKey(TODAY),
  startTime: "19:00",
  endTime: "20:30",
  location: "",
  audience: "ALL",
  description: "",
}

const EVENT_CHIP = {
  lesson: "bg-brand-soft text-amber-800",
  exam: "bg-orange-100 text-warning",
  class: "bg-green-100 text-success",
  center: "bg-sky-100 text-sky-700",
} as const

export function TeacherSchedulePage() {
  const [month, setMonth] = useState(() => new Date(2026, 9, 1))
  const [events, setEvents] = useState<TeacherEvent[]>(OWN_EVENTS)
  const [selected, setSelected] = useState<TeacherEvent | null>(null)
  const [draft, setDraft] = useState<EventDraft | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<TeacherEvent | null>(null)

  const grid = useMemo(() => buildMonthGrid(month), [month])
  const allEvents = useMemo(() => [...events, ...CENTER_EVENTS], [events])

  const byDay = useMemo(() => {
    const map = new Map<string, TeacherEvent[]>()
    for (const event of allEvents) {
      const key = toDateKey(event.date)
      const list = map.get(key)
      if (list) list.push(event)
      else map.set(key, [event])
    }
    return map
  }, [allEvents])

  const openCreate = (date?: Date) => {
    setDraft({ ...EMPTY_DRAFT, date: date ? toDateKey(date) : toDateKey(TODAY) })
  }

  const openEdit = (event: TeacherEvent) => {
    setSelected(null)
    setDraft({
      id: event.id,
      title: event.title,
      type: event.type,
      date: toDateKey(event.date),
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      audience: event.audience,
      description: event.description,
    })
  }

  const saveDraft = () => {
    if (!draft) return
    if (!draft.title.trim()) {
      toast.error("Vui lòng nhập tiêu đề sự kiện")
      return
    }
    const [year, m, day] = draft.date.split("-").map(Number)
    const date = new Date(year, m - 1, day)
    const payload: TeacherEvent = {
      id: draft.id ?? `own-${Date.now()}`,
      type: draft.type,
      title: draft.title.trim(),
      date,
      startTime: draft.startTime,
      endTime: draft.endTime,
      location: draft.location.trim() || "Chưa xác định",
      audience: draft.audience,
      description: draft.description.trim(),
      own: true,
    }

    setEvents((prev) => (draft.id ? prev.map((e) => (e.id === draft.id ? payload : e)) : [...prev, payload]))
    setDraft(null)
    toast.success(draft.id ? "Đã cập nhật sự kiện!" : "Đã tạo sự kiện!", {
      description: `${payload.title} · ${formatDate(payload.date)}`,
    })
  }

  const removeEvent = (event: TeacherEvent) => {
    setEvents((prev) => prev.filter((e) => e.id !== event.id))
    setConfirmDelete(null)
    toast.success("Đã xoá sự kiện", { description: event.title })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Sự kiện của bạn có thể thêm / sửa / xoá"
        title="Lịch trình giáo viên"
        description="Tạo lịch học, kỳ thi và hoạt động cho các lớp bạn phụ trách. Sự kiện chung của trung tâm chỉ xem."
        actions={
          <Button onClick={() => openCreate()}>
            <CalendarPlus /> Thêm sự kiện
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Reveal>
          <Card>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" aria-label="Tháng trước" onClick={() => setMonth((m) => addMonths(m, -1))}>
                  <ChevronLeft />
                </Button>
                <p className="min-w-32 text-center font-heading text-lg font-bold text-ink">{formatMonthYear(month)}</p>
                <Button variant="outline" size="icon" aria-label="Tháng sau" onClick={() => setMonth((m) => addMonths(m, 1))}>
                  <ChevronRight />
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setMonth(new Date(2026, 9, 1))} disabled={month.getMonth() === 9 && month.getFullYear() === 2026}>
                Tháng này
              </Button>
            </div>
            <CardContent className="p-3 sm:p-5">
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {CALENDAR_WEEKDAYS.map((day) => (
                  <div key={day} className="pb-2 text-center text-xs font-bold text-ink-soft">{day}</div>
                ))}
                {grid.map(({ date, inMonth }) => {
                  const dayEvents = byDay.get(toDateKey(date)) ?? []
                  const isToday = isSameDay(date, TODAY)
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
                              EVENT_CHIP[event.type],
                            )}
                          >
                            {!event.own && <Lock className="size-2.5 shrink-0" />}
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
                  {(Object.entries(TEACHER_EVENT_META) as [TeacherEventType, (typeof TEACHER_EVENT_META)[TeacherEventType]][]).map(
                    ([type, meta]) => (
                      <li key={type} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-2.5 text-ink-soft">
                          <span className={cn("size-2.5 rounded-full", meta.dot)} />
                          {meta.label}
                        </span>
                        {!meta.editable && <Badge variant="neutral">Chỉ xem</Badge>}
                      </li>
                    ),
                  )}
                </ul>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.1}>
            <Card>
              <CardHeader>
                <CardTitle>Sự kiện sắp tới của bạn</CardTitle>
                <CardDescription>Có thể sửa hoặc xoá</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2.5">
                  {[...events]
                    .filter((e) => e.date >= TODAY)
                    .sort((a, b) => a.date.getTime() - b.date.getTime())
                    .map((event) => (
                      <li key={event.id} className="rounded-xl border border-slate-100 p-3 transition-colors hover:border-brand/40">
                        <div className="flex items-start justify-between gap-2">
                          <button type="button" onClick={() => setSelected(event)} className="min-w-0 flex-1 cursor-pointer text-left">
                            <p className="truncate text-sm font-semibold text-ink">{event.title}</p>
                            <p className="mt-0.5 text-xs text-ink-soft">
                              {formatDate(event.date)} · {audienceLabel(event.audience)}
                            </p>
                          </button>
                          <Badge variant={TEACHER_EVENT_META[event.type].badge} className="shrink-0">
                            {TEACHER_EVENT_META[event.type].label}
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
                  {events.filter((e) => e.date >= TODAY).length === 0 && (
                    <p className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-xs text-ink-soft">
                      Chưa có sự kiện nào sắp tới.
                    </p>
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
          selected?.own ? (
            <>
              <Button variant="outline" onClick={() => setSelected(null)}>Đóng</Button>
              <Button onClick={() => selected && openEdit(selected)}>
                <Pencil /> Chỉnh sửa
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setSelected(null)}>Đóng</Button>
          )
        }
      >
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={TEACHER_EVENT_META[selected.type].badge}>{TEACHER_EVENT_META[selected.type].label}</Badge>
              {selected.own ? (
                <Badge variant="success">Bạn tạo</Badge>
              ) : (
                <Badge variant="neutral"><Lock /> Chỉ đọc</Badge>
              )}
            </div>
            <dl className="flex flex-col gap-2.5 text-sm">
              <Row icon={Clock} label="Thời gian" value={selected.startTime ? `${selected.startTime} – ${selected.endTime}` : "Cả ngày"} />
              <Row icon={MapPin} label="Địa điểm" value={selected.location} />
              <Row icon={Users} label="Đối tượng" value={audienceLabel(selected.audience)} />
            </dl>
            {selected.description && (
              <p className="rounded-xl bg-surface p-3.5 text-sm leading-relaxed text-ink-soft">{selected.description}</p>
            )}
            {!selected.own && (
              <p className="flex items-start gap-2 rounded-xl bg-sky-50 p-3 text-xs leading-relaxed text-sky-800">
                <Info className="mt-0.5 size-4 shrink-0" />
                Sự kiện do trung tâm tổ chức, bạn chỉ có thể xem.
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Form thêm / sửa */}
      <Modal
        open={Boolean(draft)}
        onOpenChange={(open) => !open && setDraft(null)}
        title={draft?.id ? "Chỉnh sửa sự kiện" : "Thêm sự kiện"}
        description="Sự kiện sẽ hiển thị cho học viên trong các lớp bạn chọn."
        icon={<CalendarPlus className="size-6" />}
        footer={
          <>
            <Button variant="outline" onClick={() => setDraft(null)}>Hủy bỏ</Button>
            <Button onClick={saveDraft}>{draft?.id ? "Lưu thay đổi" : "Tạo sự kiện"}</Button>
          </>
        }
      >
        {draft && (
          <div className="flex flex-col gap-4">
            <FormField id="ev-title" label="Tiêu đề" required>
              <Input id="ev-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Ví dụ: Lớp bổ sung từ vựng" />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="ev-type" label="Loại sự kiện" required>
                <select
                  id="ev-type"
                  value={draft.type}
                  onChange={(e) => setDraft({ ...draft, type: e.target.value as TeacherEventType })}
                  className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}
                >
                  {(Object.entries(TEACHER_EVENT_META) as [TeacherEventType, (typeof TEACHER_EVENT_META)[TeacherEventType]][])
                    .filter(([, meta]) => meta.editable)
                    .map(([type, meta]) => (
                      <option key={type} value={type}>{meta.label}</option>
                    ))}
                </select>
              </FormField>
              <FormField id="ev-date" label="Ngày" required>
                <Input id="ev-date" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="ev-start" label="Giờ bắt đầu">
                <Input id="ev-start" type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} />
              </FormField>
              <FormField id="ev-end" label="Giờ kết thúc">
                <Input id="ev-end" type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} />
              </FormField>
            </div>
            <FormField id="ev-audience" label="Đối tượng nhận" required>
              <select
                id="ev-audience"
                value={draft.audience}
                onChange={(e) => setDraft({ ...draft, audience: e.target.value })}
                className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}
              >
                <option value="ALL">Tất cả lớp của tôi</option>
                {CLASSES.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </FormField>
            <FormField id="ev-location" label="Địa điểm">
              <Input id="ev-location" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="Ví dụ: Phòng 204" />
            </FormField>
            <FormField id="ev-desc" label="Mô tả">
              <Textarea id="ev-desc" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Nội dung chi tiết, thời lượng, chuẩn bị..." />
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
          Thao tác này không thể hoàn tác. Học viên sẽ không còn thấy sự kiện này trong lịch trình.
        </p>
      </Modal>
    </div>
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