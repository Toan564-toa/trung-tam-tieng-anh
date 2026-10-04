import { useMemo, useState } from "react"
import {
  CalendarPlus,
  Clock,
  DoorOpen,
  Download,
  GraduationCap,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  Users,
} from "lucide-react"
import { cn } from "cn"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { ToolbarSelect } from "@/components/admin/table-toolbar"
import { StatCard } from "@/components/common/stat-card"
import { PageHeader } from "@/components/layout/page-header"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { fieldBase } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { toast } from "@/components/ui/toast"
import {
  ADMIN_ROOMS,
  ADMIN_TODAY_LABEL,
  TIMETABLE,
  TIMETABLE_SLOTS,
  TIMETABLE_WEEKDAYS,
  findConflicts,
  type TimetableConflict,
  type TimetableEntry,
} from "@/data/admin"
import { TEACHERS } from "@/data/landing"
import { CENTER_CLASSES, getCenterClass } from "@/data/staff"
import { exportAdminTable } from "@/lib/admin-excel"

type ViewMode = "room" | "teacher"

const CONFLICT_LABEL: Record<TimetableConflict["kind"], string> = {
  room: "Trùng phòng",
  teacher: "Trùng giáo viên",
}

type EntryDraft = {
  id: string | null
  classId: string
  roomId: string
  teacherId: string
  slotId: string
  weekday: number
}

type Cell = { weekday: number; slotId: string }

function teacherIdOf(index: number) {
  return `gv-${index + 1}`
}

function teacherNameOf(teacherId: string) {
  const index = TEACHERS.findIndex((_, i) => teacherIdOf(i + 1) === teacherId)
  return index >= 0 ? TEACHERS[index].name : "Chưa phân công"
}

function roomNameOf(roomId: string) {
  return ADMIN_ROOMS.find((room) => room.id === roomId)?.name ?? roomId
}

function slotLabel(slotId: string) {
  const slot = TIMETABLE_SLOTS.find((item) => item.id === slotId)
  return slot ? `${slot.label} (${slot.start} – ${slot.end})` : slotId
}

function weekdayLabel(weekday: number) {
  return TIMETABLE_WEEKDAYS.find((day) => day.value === weekday)?.label ?? `Thứ ${weekday}`
}

const EMPTY_DRAFT: EntryDraft = {
  id: null,
  classId: CENTER_CLASSES[0]?.id ?? "",
  roomId: ADMIN_ROOMS[0]?.id ?? "",
  teacherId: teacherIdOf(1),
  slotId: TIMETABLE_SLOTS[0].id,
  weekday: TIMETABLE_WEEKDAYS[0].value,
}

export function AdminTimetablePage() {
  const [entries, setEntries] = useState<TimetableEntry[]>(TIMETABLE)
  const [mode, setMode] = useState<ViewMode>("room")
  const [roomId, setRoomId] = useState(ADMIN_ROOMS[0]?.id ?? "")
  const [teacherId, setTeacherId] = useState(teacherIdOf(1))

  const [cell, setCell] = useState<Cell | null>(null)
  const [draft, setDraft] = useState<EntryDraft | null>(null)
  const [pendingDelete, setPendingDelete] = useState<TimetableEntry | null>(null)

  const stats = useMemo(() => {
    const rooms = new Set(entries.map((entry) => entry.roomId))
    const teachers = new Set(entries.map((entry) => entry.teacherId))
    return { total: entries.length, rooms: rooms.size, teachers: teachers.size }
  }, [entries])

  const gridMap = useMemo(() => {
    const map = new Map<string, TimetableEntry[]>()
    for (const entry of entries) {
      if (mode === "room" ? entry.roomId !== roomId : entry.teacherId !== teacherId) continue
      const key = `${entry.weekday}-${entry.slotId}`
      const list = map.get(key)
      if (list) list.push(entry)
      else map.set(key, [entry])
    }
    return map
  }, [entries, mode, roomId, teacherId])

  const cellEntries = cell ? (gridMap.get(`${cell.weekday}-${cell.slotId}`) ?? []) : []

  const conflicts = useMemo<TimetableConflict[]>(() => {
    if (!draft) return []
    const base = findConflicts(
      {
        classId: draft.classId,
        roomId: draft.roomId,
        teacherId: draft.teacherId,
        slotId: draft.slotId,
        weekday: draft.weekday,
      },
      draft.id ?? undefined,
    )
    const result: TimetableConflict[] = [...base]
    const seen = new Set(base.map((item) => `${item.kind}-${item.entry.id}`))
    for (const other of entries) {
      if (other.id === draft.id || other.weekday !== draft.weekday || other.slotId !== draft.slotId) continue
      const otherClass = getCenterClass(other.classId)
      if (other.roomId === draft.roomId && !seen.has(`room-${other.id}`)) {
        seen.add(`room-${other.id}`)
        result.push({
          kind: "room",
          message: `Phòng ${roomNameOf(other.roomId)} đã có lớp ${otherClass?.name ?? other.classId} (${otherClass?.time ?? ""}) trong ca này.`,
          entry: other,
        })
      }
      if (other.teacherId === draft.teacherId && !seen.has(`teacher-${other.id}`)) {
        seen.add(`teacher-${other.id}`)
        result.push({
          kind: "teacher",
          message: `${teacherNameOf(draft.teacherId)} đang dạy lớp ${otherClass?.name ?? other.classId} trong cùng ca.`,
          entry: other,
        })
      }
    }
    return result
  }, [draft, entries])

  const openCreate = (target: Cell) => {
    const fallbackClass = CENTER_CLASSES[0]
    const teacherIndex = TEACHERS.findIndex((teacher) => teacher.name === fallbackClass?.teacher)
    setDraft({
      ...EMPTY_DRAFT,
      classId: fallbackClass?.id ?? "",
      roomId:
        mode === "room"
          ? roomId
          : ADMIN_ROOMS.find((room) => room.name === fallbackClass?.room)?.id ?? ADMIN_ROOMS[0]?.id ?? "",
      teacherId: mode === "teacher" ? teacherId : teacherIdOf(teacherIndex >= 0 ? teacherIndex + 1 : 1),
      slotId: target.slotId,
      weekday: target.weekday,
    })
  }

  const openEdit = (entry: TimetableEntry) => {
    setCell(null)
    setDraft({
      id: entry.id,
      classId: entry.classId,
      roomId: entry.roomId,
      teacherId: entry.teacherId,
      slotId: entry.slotId,
      weekday: entry.weekday,
    })
  }

  const closeDraft = () => {
    setDraft(null)
  }

  const saveDraft = () => {
    if (!draft) return
    if (!draft.classId) {
      toast.error("Vui lòng chọn lớp học")
      return
    }
    if (conflicts.length > 0) {
      toast.error("Lịch đang bị trùng, không thể lưu", {
        description: conflicts[0]?.message ?? "Vui lòng chọn phòng hoặc ca khác.",
      })
      return
    }
    const payload: TimetableEntry = {
      id: draft.id ?? `tt-${draft.classId}-${draft.weekday}-${draft.slotId}`,
      classId: draft.classId,
      roomId: draft.roomId,
      teacherId: draft.teacherId,
      slotId: draft.slotId,
      weekday: draft.weekday,
    }
    setEntries((prev) => (draft.id ? prev.map((item) => (item.id === draft.id ? payload : item)) : [...prev, payload]))
    setDraft(null)
    setCell(null)
    toast.success(draft.id ? "Đã cập nhật buổi học" : "Đã thêm buổi học", {
      description: `${getCenterClass(payload.classId)?.name ?? payload.classId} · ${weekdayLabel(payload.weekday)} · ${slotLabel(payload.slotId)}`,
    })
  }

  const removeEntry = (entry: TimetableEntry) => {
    setEntries((prev) => prev.filter((item) => item.id !== entry.id))
    setPendingDelete(null)
    setCell(null)
    toast.success("Đã xoá buổi học", { description: getCenterClass(entry.classId)?.name ?? entry.classId })
  }

  const exportTimetable = () => {
    void exportAdminTable(
      "Thoi-khoa-bieu",
      "Thời khóa biểu",
      ["Lớp", "Mã lớp", "Thứ", "Ca", "Giờ", "Phòng", "Giáo viên", "Sĩ số"],
      entries.map((entry) => {
        const cls = getCenterClass(entry.classId)
        const slot = TIMETABLE_SLOTS.find((item) => item.id === entry.slotId)
        return [
          cls?.name ?? entry.classId,
          cls?.code ?? entry.classId,
          weekdayLabel(entry.weekday),
          slot?.label ?? entry.slotId,
          slot ? `${slot.start} – ${slot.end}` : "",
          roomNameOf(entry.roomId),
          teacherNameOf(entry.teacherId),
          cls?.studentCount ?? 0,
        ]
      }),
    ).then(() => toast.success("Đã xuất Excel thời khóa biểu"))
  }

  const scopeLabel = mode === "room" ? roomNameOf(roomId) : teacherNameOf(teacherId)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`Vận hành · dữ liệu ${ADMIN_TODAY_LABEL}`}
        title="Thời khóa biểu"
        description="Xem lịch theo phòng hoặc theo giáo viên, thêm – sửa – xoá từng buổi học và tự động chặn lịch trùng phòng hoặc trùng giáo viên."
        actions={
          <Button variant="outline" onClick={exportTimetable}>
            <Download /> Xuất Excel
          </Button>
        }
      />

      <Stagger className="grid gap-4 sm:grid-cols-3">
        <StaggerItem>
          <StatCard
            label="Tổng buổi học trong tuần"
            value={String(stats.total)}
            icon={CalendarPlus}
            trend={{ text: `${TIMETABLE_SLOTS.length} ca × ${TIMETABLE_WEEKDAYS.length} ngày học`, tone: "info" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Phòng đang được xếp"
            value={String(stats.rooms)}
            icon={DoorOpen}
            iconClass="bg-sky-100 text-sky-700"
            trend={{ text: `Trên tổng ${ADMIN_ROOMS.length} phòng của trung tâm`, tone: "info" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Giáo viên có lịch"
            value={String(stats.teachers)}
            icon={GraduationCap}
            iconClass="bg-green-100 text-success"
            trend={{ text: `Đang xem ${scopeLabel}`, tone: "success" }}
          />
        </StaggerItem>
      </Stagger>

      <Reveal delay={0.05}>
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle>Thời khóa biểu tuần</CardTitle>
              <CardDescription>
                {mode === "room" ? "Xem lịch theo phòng học" : "Xem lịch theo giáo viên"} · {scopeLabel}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportTimetable}>
              <Download /> Xuất Excel
            </Button>
          </CardHeader>
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <ToolbarSelect
                id="timetable-mode"
                label="Chế độ xem"
                value={mode}
                onChange={(value) => setMode(value as ViewMode)}
                options={[
                  { value: "room", label: "Theo phòng" },
                  { value: "teacher", label: "Theo giáo viên" },
                ]}
              />
              {mode === "room" ? (
                <ToolbarSelect
                  id="timetable-room"
                  label="Chọn phòng"
                  value={roomId}
                  onChange={(value) => {
                    setRoomId(value)
                    setCell(null)
                  }}
                  options={ADMIN_ROOMS.map((room) => ({ value: room.id, label: `${room.name} · tầng ${room.floor}` }))}
                />
              ) : (
                <ToolbarSelect
                  id="timetable-teacher"
                  label="Chọn giáo viên"
                  value={teacherId}
                  onChange={(value) => {
                    setTeacherId(value)
                    setCell(null)
                  }}
                  options={TEACHERS.map((teacher, index) => ({ value: teacherIdOf(index + 1), label: teacher.name }))}
                />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => openCreate({ weekday: TIMETABLE_WEEKDAYS[0].value, slotId: TIMETABLE_SLOTS[0].id })}
              >
                <Plus /> Thêm buổi học
              </Button>
            </div>
            <p className="text-xs text-ink-soft">
              Click vào một ô để xem chi tiết và thêm / sửa / xoá buổi học của ca đó.
            </p>
          </div>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] table-fixed text-left text-sm">
                <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                  <tr>
                    <th scope="col" className="w-40 px-4 py-2.5">Ca</th>
                    {TIMETABLE_WEEKDAYS.map((day) => (
                      <th key={day.value} scope="col" className="px-2 py-2.5 text-center">
                        {day.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {TIMETABLE_SLOTS.map((slot) => (
                    <tr key={slot.id} className="transition-colors hover:bg-surface/60">
                      <th scope="row" className="px-4 py-2 align-top">
                        <span className="block font-semibold text-ink">{slot.label}</span>
                        <span className="block text-[11px] tabular-nums text-ink-soft">
                          {slot.start} – {slot.end}
                        </span>
                      </th>
                      {TIMETABLE_WEEKDAYS.map((day) => {
                        const list = gridMap.get(`${day.value}-${slot.id}`) ?? []
                        return (
                          <td key={day.value} className="px-1.5 py-1.5 align-top">
                            <button
                              type="button"
                              onClick={() => {
                                setCell({ weekday: day.value, slotId: slot.id })
                                setDraft(null)
                              }}
                              className="flex min-h-16 w-full cursor-pointer flex-col gap-1 rounded-xl border border-transparent p-1 transition-colors hover:border-brand/40 hover:bg-cream/60"
                            >
                              {list.length === 0 ? (
                                <span className="text-[11px] text-slate-300">—</span>
                              ) : (
                                list.map((entry) => {
                                  const cls = getCenterClass(entry.classId)
                                  return (
                                    <span
                                      key={entry.id}
                                      className="block truncate rounded-lg bg-brand-soft px-2 py-1.5 text-left text-[11px] leading-tight font-semibold text-amber-900"
                                    >
                                      <span className="block font-mono text-[10px] text-amber-800">{cls?.code}</span>
                                      {cls?.name ?? entry.classId}
                                      <span className="block text-[10px] font-medium text-amber-800">
                                        {mode === "room" ? teacherNameOf(entry.teacherId) : roomNameOf(entry.roomId)}
                                      </span>
                                    </span>
                                  )
                                })
                              )}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      <Modal
        open={Boolean(cell) && !draft}
        onOpenChange={(open) => !open && setCell(null)}
        title={cell ? `${weekdayLabel(cell.weekday)} · ${slotLabel(cell.slotId)}` : ""}
        description={cell ? `${scopeLabel} · ${cellEntries.length} buổi học` : undefined}
        icon={<Clock className="size-6" />}
        className="sm:max-w-xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setCell(null)}>
              Đóng
            </Button>
            {cell && (
              <Button onClick={() => openCreate(cell)}>
                <Plus /> Thêm buổi học
              </Button>
            )}
          </>
        }
      >
        {cell && (
          <ul className="flex flex-col gap-2.5">
            {cellEntries.length === 0 && (
              <li className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-sm text-ink-soft">
                Ca này chưa có lớp nào tại {scopeLabel}.
              </li>
            )}
            {cellEntries.map((entry) => {
              const cls = getCenterClass(entry.classId)
              return (
                <li key={entry.id} className="rounded-xl border border-slate-100 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-heading text-sm font-bold text-ink">{cls?.name ?? entry.classId}</p>
                      <p className="mt-1 text-xs text-ink-soft">
                        Mã lớp <span className="font-mono">{cls?.code}</span> · {cls?.course}
                      </p>
                    </div>
                    <Badge variant="brand">{cls?.level}</Badge>
                  </div>
                  <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                    <div>
                      <dt className="text-ink-soft">Giáo viên</dt>
                      <dd className="font-medium text-ink">{teacherNameOf(entry.teacherId)}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-soft">Phòng</dt>
                      <dd className="font-medium text-ink">{roomNameOf(entry.roomId)}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-soft">Sĩ số</dt>
                      <dd className="font-medium tabular-nums text-ink">
                        {cls?.studentCount ?? 0}/{cls?.maxStudents ?? 0}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(entry)}>
                      <Pencil /> Sửa
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger hover:bg-red-50"
                      onClick={() => setPendingDelete(entry)}
                    >
                      <Trash2 /> Xoá
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Modal>

      <Modal
        open={Boolean(draft)}
        onOpenChange={(open) => !open && closeDraft()}
        title={draft?.id ? "Chỉnh sửa buổi học" : "Thêm buổi học"}
        description="Hệ thống tự kiểm tra trùng phòng và trùng giáo viên trước khi lưu."
        icon={<CalendarPlus className="size-6" />}
        className="sm:max-w-xl"
        footer={
          <>
            <Button variant="outline" onClick={closeDraft}>
              Huỷ bỏ
            </Button>
            <Button disabled={conflicts.length > 0} onClick={saveDraft}>
              {draft?.id ? "Lưu thay đổi" : "Thêm vào lịch"}
            </Button>
          </>
        }
      >
        {draft && (
          <div className="flex flex-col gap-4">
            <FormField id="tt-class" label="Lớp học" required>
              <select
                id="tt-class"
                value={draft.classId}
                onChange={(e) => setDraft({ ...draft, classId: e.target.value })}
                className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}
              >
                {CENTER_CLASSES.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.code} · {cls.name}
                  </option>
                ))}
              </select>
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="tt-room" label="Phòng học" required>
                <select
                  id="tt-room"
                  value={draft.roomId}
                  onChange={(e) => setDraft({ ...draft, roomId: e.target.value })}
                  className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}
                >
                  {ADMIN_ROOMS.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} · tầng {room.floor}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField id="tt-teacher" label="Giáo viên" required>
                <select
                  id="tt-teacher"
                  value={draft.teacherId}
                  onChange={(e) => setDraft({ ...draft, teacherId: e.target.value })}
                  className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}
                >
                  {TEACHERS.map((teacher, index) => (
                    <option key={teacherIdOf(index + 1)} value={teacherIdOf(index + 1)}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="tt-weekday" label="Thứ" required>
                <select
                  id="tt-weekday"
                  value={draft.weekday}
                  onChange={(e) => setDraft({ ...draft, weekday: Number(e.target.value) })}
                  className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}
                >
                  {TIMETABLE_WEEKDAYS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField id="tt-slot" label="Ca học" required>
                <select
                  id="tt-slot"
                  value={draft.slotId}
                  onChange={(e) => setDraft({ ...draft, slotId: e.target.value })}
                  className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}
                >
                  {TIMETABLE_SLOTS.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {slot.label} · {slot.start} – {slot.end}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            {conflicts.length > 0 ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3.5">
                <p className="flex items-center gap-2 text-sm font-semibold text-danger">
                  <TriangleAlert className="size-4" /> Lịch bị trùng, vui lòng chọn lựa chọn khác
                </p>
                <ul className="mt-2 flex flex-col gap-2">
                  {conflicts.map((conflict) => (
                    <li key={`${conflict.kind}-${conflict.entry.id}`} className="text-xs leading-relaxed text-ink-soft">
                      <Badge variant={conflict.kind === "room" ? "warning" : "danger"} className="mr-1.5">
                        {CONFLICT_LABEL[conflict.kind]}
                      </Badge>
                      {conflict.message}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-ink-soft">
                  Nút lưu đang bị khoá. Hãy đổi phòng, giáo viên, thứ hoặc ca khác rồi thử lại.
                </p>
              </div>
            ) : (
              <p className="rounded-xl bg-green-50 p-3 text-xs leading-relaxed text-success">
                Không phát hiện xung đột với phòng, giáo viên và ca đang chọn.
              </p>
            )}

            {draft.classId && (
              <p className="flex items-center gap-2 rounded-xl bg-surface p-3 text-xs text-ink-soft">
                <Users className="size-4" />
                {getCenterClass(draft.classId)?.studentCount ?? 0} học viên ·{" "}
                {getCenterClass(draft.classId)?.maxStudents ?? 0} chỗ ·{" "}
                {getCenterClass(draft.classId)?.time}
              </p>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Xoá buổi học khỏi thời khóa biểu?"
        description={
          pendingDelete
            ? `${getCenterClass(pendingDelete.classId)?.name ?? pendingDelete.classId} · ${weekdayLabel(pendingDelete.weekday)} · ${slotLabel(pendingDelete.slotId)}`
            : undefined
        }
        detail={
          pendingDelete
            ? `Phòng ${roomNameOf(pendingDelete.roomId)} · ${teacherNameOf(pendingDelete.teacherId)}. Buổi học sẽ không còn xuất hiện trong lưới tuần.`
            : undefined
        }
        confirmLabel="Xoá buổi học"
        onConfirm={() => pendingDelete && removeEntry(pendingDelete)}
      />
    </div>
  )
}
