import { useMemo, useState } from "react"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  PartyPopper,
  Sparkles,
  type LucideIcon,
} from "lucide-react"
import { cn } from "cn"
import { PageHeader } from "@/components/layout/page-header"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Modal } from "@/components/ui/modal"
import { CALENDAR_EVENTS, EVENT_META, type CalendarEvent } from "@/data/student"
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

/** Ngày "hôm nay" của bản demo. */
const TODAY = new Date(2026, 9, 1)

const EVENT_ICON = {
  lesson: CalendarDays,
  exam: Sparkles,
  holiday: PartyPopper,
  event: PartyPopper,
} as const

export function StudentSchedulePage() {
  const [month, setMonth] = useState(() => new Date(2026, 9, 1))
  const [selected, setSelected] = useState<CalendarEvent | null>(null)

  const grid = useMemo(() => buildMonthGrid(month), [month])

  const SelectedIcon = selected ? EVENT_ICON[selected.type] : null

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of CALENDAR_EVENTS) {
      const key = toDateKey(event.date)
      const list = map.get(key)
      if (list) list.push(event)
      else map.set(key, [event])
    }
    return map
  }, [])

  const monthEvents = useMemo(() => {
    const counts = { lesson: 0, exam: 0, holiday: 0, event: 0 }
    for (const event of CALENDAR_EVENTS) {
      if (event.date.getMonth() === month.getMonth() && event.date.getFullYear() === month.getFullYear()) {
        counts[event.type] += 1
      }
    }
    return counts
  }, [month])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Lịch học & sự kiện"
        title="Lịch trình học tập"
        description="Xem lịch học, kỳ thi, ngày nghỉ lễ và sự kiện của trung tâm trong từng tháng."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Reveal>
          <Card>
            <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Tháng trước"
                  onClick={() => setMonth((m) => addMonths(m, -1))}
                >
                  <ChevronLeft />
                </Button>
                <p className="min-w-36 text-center font-heading text-lg font-bold text-ink">{formatMonthYear(month)}</p>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Tháng sau"
                  onClick={() => setMonth((m) => addMonths(m, 1))}
                >
                  <ChevronRight />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMonth(new Date(2026, 9, 1))}
                disabled={month.getMonth() === 9 && month.getFullYear() === 2026}
              >
                Quay lại tháng này
              </Button>
            </div>

            <CardContent className="p-3 sm:p-5">
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {CALENDAR_WEEKDAYS.map((day) => (
                  <div key={day} className="pb-2 text-center text-xs font-bold text-ink-soft">
                    {day}
                  </div>
                ))}

                {grid.map(({ date, inMonth }) => {
                  const events = eventsByDay.get(toDateKey(date)) ?? []
                  const isToday = isSameDay(date, TODAY)
                  return (
                    <div
                      key={toDateKey(date)}
                      className={cn(
                        "flex min-h-[72px] flex-col gap-1 rounded-xl border p-1.5 transition-colors sm:min-h-[92px]",
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
                        {events.length > 1 && (
                          <span className="text-[10px] font-semibold text-ink-soft">{events.length}</span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        {events.slice(0, 2).map((event) => (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => setSelected(event)}
                            title={event.title}
                            className={cn(
                              "w-full cursor-pointer truncate rounded-md px-1.5 py-1 text-left text-[10px] font-medium transition-opacity hover:opacity-80 sm:text-[11px]",
                              EVENT_CHIP[event.type],
                            )}
                          >
                            {event.time ? `${event.time.slice(0, 5)} · ` : ""}
                            {event.title}
                          </button>
                        ))}
                        {events.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setSelected(events[2])}
                            className="cursor-pointer px-1.5 text-[10px] font-semibold text-ink-soft hover:text-ink sm:text-[11px]"
                          >
                            +{events.length - 2} sự kiện
                          </button>
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
          <Reveal delay={0.06}>
            <Card>
              <CardContent className="p-5">
                <p className="font-heading text-sm font-bold text-ink">Chú thích</p>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {(Object.entries(EVENT_META) as [keyof typeof EVENT_META, (typeof EVENT_META)[keyof typeof EVENT_META]][]).map(
                    ([type, meta]) => (
                      <li key={type} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-2.5 text-ink-soft">
                          <span className={cn("size-2.5 rounded-full", meta.dot)} />
                          {meta.label}
                        </span>
                        <span className="font-heading font-bold text-ink tabular-nums">{monthEvents[type]}</span>
                      </li>
                    ),
                  )}
                </ul>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.12}>
            <Card>
              <CardContent className="p-5">
                <p className="font-heading text-sm font-bold text-ink">Sự kiện sắp tới</p>
                <Stagger className="mt-3 flex flex-col gap-2.5">
                  {CALENDAR_EVENTS.filter((e) => e.type !== "lesson" && e.date >= TODAY)
                    .slice(0, 5)
                    .map((event) => (
                      <StaggerItem key={event.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(event)}
                          className="flex w-full cursor-pointer items-start gap-3 rounded-xl border border-slate-100 p-3 text-left transition-colors hover:border-brand/40 hover:bg-cream/40"
                        >
                          <span className={cn("mt-1 size-2 shrink-0 rounded-full", EVENT_META[event.type].dot)} />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-ink">{event.title}</span>
                            <span className="block text-xs text-ink-soft">{formatDate(event.date)}</span>
                          </span>
                        </button>
                      </StaggerItem>
                    ))}
                </Stagger>
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
        icon={SelectedIcon ? <SelectedIcon className="size-6" /> : undefined}
      >
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={EVENT_META[selected.type].badge}>{EVENT_META[selected.type].label}</Badge>
              {selected.subtitle && <span className="text-sm text-ink-soft">{selected.subtitle}</span>}
            </div>
            <dl className="flex flex-col gap-2.5 text-sm">
              <DetailRow icon={Clock} label="Thời gian" value={selected.time ?? "—"} />
              <DetailRow icon={MapPin} label="Địa điểm" value={selected.location ?? "—"} />
            </dl>
            {selected.description && (
              <p className="rounded-xl bg-surface p-3.5 text-sm leading-relaxed text-ink-soft">{selected.description}</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

const EVENT_CHIP = {
  lesson: "bg-brand-soft text-amber-800",
  exam: "bg-orange-100 text-warning",
  holiday: "bg-red-100 text-danger",
  event: "bg-green-100 text-success",
} as const

function DetailRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-4 shrink-0 text-ink-soft" />
      <dt className="w-24 shrink-0 text-ink-soft">{label}</dt>
      <dd className="min-w-0 flex-1 font-medium text-ink">{value}</dd>
    </div>
  )
}