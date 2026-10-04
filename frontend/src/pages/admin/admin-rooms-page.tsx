import { useMemo, useState } from "react"
import { Building2, Download, DoorClosed, Pencil, Plus, Projector, Trash2, Users } from "lucide-react"
import { cn } from "cn"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { TableEmpty, TableToolbar } from "@/components/admin/table-toolbar"
import { StatCard } from "@/components/common/stat-card"
import { PageHeader } from "@/components/layout/page-header"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { fieldBase, Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { toast } from "@/components/ui/toast"
import { ADMIN_ROOMS, ADMIN_TODAY_LABEL, ROOM_STATUS_META, type AdminRoom } from "@/data/admin"
import { CENTER_CLASSES } from "@/data/staff"
import { exportAdminTable } from "@/lib/admin-excel"

const ROOM_STATUSES = Object.keys(ROOM_STATUS_META) as AdminRoom["status"][]

type RoomDraft = {
  id: string | null
  name: string
  floor: string
  capacity: string
  equipment: string
  status: AdminRoom["status"]
}

type RoomErrors = {
  name?: string
  floor?: string
  capacity?: string
}

const EMPTY_DRAFT: RoomDraft = {
  id: null,
  name: "",
  floor: "1",
  capacity: "18",
  equipment: "TV, Máy chiếu",
  status: "available",
}

export function AdminRoomsPage() {
  const [rooms, setRooms] = useState<AdminRoom[]>(ADMIN_ROOMS)
  const [hiddenIds, setHiddenIds] = useState<string[]>([])

  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<AdminRoom["status"] | "all">("all")

  const [draft, setDraft] = useState<RoomDraft | null>(null)
  const [errors, setErrors] = useState<RoomErrors>({})
  const [pendingDelete, setPendingDelete] = useState<AdminRoom | null>(null)

  const visibleRooms = useMemo(() => rooms.filter((room) => !hiddenIds.includes(room.id)), [rooms, hiddenIds])

  const classesByRoom = useMemo(() => {
    const map = new Map<string, typeof CENTER_CLASSES>()
    for (const cls of CENTER_CLASSES) {
      const list = map.get(cls.room)
      if (list) list.push(cls)
      else map.set(cls.room, [cls])
    }
    return map
  }, [])

  const usageRows = useMemo(() => {
    const names = new Set([...visibleRooms.map((room) => room.name), ...CENTER_CLASSES.map((cls) => cls.room)])
    return [...names]
      .map((name) => {
        const room = visibleRooms.find((item) => item.name === name)
        const list = classesByRoom.get(name) ?? []
        return {
          name,
          room: room ?? null,
          classes: list,
          students: list.reduce((sum, cls) => sum + cls.studentCount, 0),
          sessions: list.reduce((sum, cls) => sum + cls.weekdays.length, 0),
        }
      })
      .filter((row) => row.classes.length > 0)
      .sort((a, b) => b.sessions - a.sessions)
  }, [classesByRoom, visibleRooms])

  const stats = useMemo(() => {
    const available = visibleRooms.filter((room) => room.status === "available")
    const capacity = available.reduce((sum, room) => sum + room.capacity, 0)
    const used = CENTER_CLASSES.filter((cls) => cls.status !== "closed").reduce((sum, cls) => sum + cls.studentCount, 0)
    return {
      total: visibleRooms.length,
      maintenance: visibleRooms.filter((room) => room.status === "maintenance").length,
      capacity,
      used,
    }
  }, [visibleRooms])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return visibleRooms.filter((room) => {
      if (statusFilter !== "all" && room.status !== statusFilter) return false
      if (!needle) return true
      return (
        room.name.toLowerCase().includes(needle) ||
        room.id.toLowerCase().includes(needle) ||
        room.equipment.some((item) => item.toLowerCase().includes(needle))
      )
    })
  }, [visibleRooms, query, statusFilter])

  const openCreate = () => {
    setErrors({})
    setDraft({ ...EMPTY_DRAFT })
  }

  const openEdit = (room: AdminRoom) => {
    setErrors({})
    setDraft({
      id: room.id,
      name: room.name,
      floor: String(room.floor),
      capacity: String(room.capacity),
      equipment: room.equipment.join(", "),
      status: room.status,
    })
  }

  const closeDraft = () => {
    setDraft(null)
    setErrors({})
  }

  const saveDraft = () => {
    if (!draft) return
    const floor = Number(draft.floor.replace(/\D/g, ""))
    const capacity = Number(draft.capacity.replace(/\D/g, ""))
    const nextErrors: RoomErrors = {}
    const name = draft.name.trim()

    if (!name) nextErrors.name = "Vui lòng nhập tên phòng."
    else if (visibleRooms.some((room) => room.name.toLowerCase() === name.toLowerCase() && room.id !== draft.id)) {
      nextErrors.name = "Tên phòng đã tồn tại trong hệ thống."
    }
    if (Number.isNaN(floor) || floor < 1) nextErrors.floor = "Tầng phải là số từ 1 trở lên."
    if (Number.isNaN(capacity) || capacity < 4) nextErrors.capacity = "Sức chứa tối thiểu là 4 chỗ."

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Vui lòng kiểm tra lại thông tin phòng học")
      return
    }

    const equipment = draft.equipment
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)

    if (draft.id) {
      setRooms((prev) =>
        prev.map((room) =>
          room.id === draft.id ? { ...room, name, floor, capacity, equipment, status: draft.status } : room,
        ),
      )
      toast.success("Đã cập nhật phòng học", { description: `${name} · sức chứa ${capacity} chỗ` })
      closeDraft()
      return
    }

    const payload: AdminRoom = {
      id: `R${name.replace(/\D/g, "").slice(0, 3) || Date.now()}`,
      name,
      floor,
      capacity,
      equipment,
      status: draft.status,
    }
    setRooms((prev) => [...prev, payload])
    toast.success("Đã tạo phòng học", { description: `${name} · tầng ${floor}` })
    closeDraft()
  }

  const softDelete = (room: AdminRoom) => {
    setRooms((prev) => prev.filter((item) => item.id !== room.id))
    setHiddenIds((prev) => [...prev, room.id])
    setPendingDelete(null)
    toast.success("Đã xoá phòng học", { description: `${room.name} · thời khóa biểu liên quan cần cập nhật` })
  }

  const exportRooms = () => {
    void exportAdminTable(
      "Phong-hoc",
      "Phòng học",
      ["Mã phòng", "Tên phòng", "Tầng", "Sức chứa", "Thiết bị", "Trạng thái", "Số lớp đang dùng"],
      filtered.map((room) => [
        room.id,
        room.name,
        room.floor,
        room.capacity,
        room.equipment.join(", "),
        ROOM_STATUS_META[room.status].label,
        (classesByRoom.get(room.name) ?? []).length,
      ]),
    ).then(() => toast.success("Đã xuất Excel phòng học"))
  }

  const classesUsingPending = pendingDelete ? (classesByRoom.get(pendingDelete.name) ?? []) : []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`Cơ sở vật chất · dữ liệu ${ADMIN_TODAY_LABEL}`}
        title="Phòng học"
        description="Theo dõi sức chứa, thiết bị và trạng thái từng phòng, kèm lớp đang sử dụng phòng trong tuần."
        actions={
          <>
            <Button variant="outline" onClick={exportRooms}>
              <Download /> Xuất Excel
            </Button>
            <Button onClick={openCreate}>
              <Plus /> Thêm phòng
            </Button>
          </>
        }
      />

      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard
            label="Tổng phòng học"
            value={String(stats.total)}
            icon={Building2}
            trend={{ text: `${usageRows.length} phòng đang có lớp`, tone: "info" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Phòng đang bảo trì"
            value={String(stats.maintenance)}
            icon={DoorClosed}
            iconClass="bg-orange-100 text-warning"
            trend={{ text: "Không xếp lớp mới vào phòng này", tone: "warning" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Sức chứa khả dụng"
            value={`${stats.capacity} chỗ`}
            icon={Users}
            iconClass="bg-sky-100 text-sky-700"
            trend={{ text: "Tính trên các phòng đang dùng được", tone: "info" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Học viên đang học"
            value={stats.used.toLocaleString("vi-VN")}
            icon={Projector}
            iconClass="bg-green-100 text-success"
            trend={{ text: `Đã dùng ${Math.round((stats.used / Math.max(1, stats.capacity)) * 100)}% sức chứa`, tone: "success" }}
          />
        </StaggerItem>
      </Stagger>

      <Reveal delay={0.05}>
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle>Danh sách phòng học</CardTitle>
              <CardDescription>Lọc theo tên phòng, mã phòng hoặc thiết bị có sẵn</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportRooms}>
              <Download /> Xuất Excel
            </Button>
          </CardHeader>
          <TableToolbar
            query={query}
            onQueryChange={setQuery}
            searchPlaceholder="Tìm phòng, thiết bị…"
            actions={
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={statusFilter === "all" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                >
                  Tất cả
                </Button>
                {ROOM_STATUSES.map((key) => (
                  <Button
                    key={key}
                    variant={statusFilter === key ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(key)}
                  >
                    {ROOM_STATUS_META[key].label}
                  </Button>
                ))}
              </div>
            }
          />
          <CardContent>
            {filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-soft">Không có phòng học phù hợp với bộ lọc.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((room) => {
                  const used = classesByRoom.get(room.name) ?? []
                  return (
                    <div
                      key={room.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 transition-colors hover:border-brand/40 hover:bg-cream/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-heading text-base font-bold text-ink">{room.name}</p>
                          <p className="text-xs text-ink-soft">
                            Tầng {room.floor} · <span className="tabular-nums">{room.capacity}</span> chỗ
                          </p>
                        </div>
                        <Badge variant={ROOM_STATUS_META[room.status].badge}>
                          {ROOM_STATUS_META[room.status].label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {room.equipment.length === 0 ? (
                          <span className="text-xs text-ink-soft">Chưa ghi nhận thiết bị</span>
                        ) : (
                          room.equipment.map((item) => (
                            <Badge key={item} variant="neutral">
                              {item}
                            </Badge>
                          ))
                        )}
                      </div>
                      <p className="text-xs text-ink-soft">
                        {used.length === 0 ? (
                          "Chưa có lớp nào xếp vào phòng này"
                        ) : (
                          <>
                            Đang có{" "}
                            <span className="font-semibold text-ink">{used.length}</span> lớp ·{" "}
                            <span className="tabular-nums">{used.map((cls) => cls.code).join(", ")}</span>
                          </>
                        )}
                      </p>
                      <div className="mt-auto flex gap-2 pt-1">
                        <Button variant="outline" size="sm" onClick={() => openEdit(room)}>
                          <Pencil /> Sửa
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger hover:bg-red-50"
                          onClick={() => setPendingDelete(room)}
                        >
                          <Trash2 /> Xoá
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={0.1}>
        <Card>
          <CardHeader>
            <CardTitle>Lớp đang dùng phòng</CardTitle>
            <CardDescription>Gom theo phòng học, tính số buổi học trong tuần của các lớp được xếp</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-2.5">Phòng</th>
                    <th scope="col" className="px-3 py-2.5">Tầng</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Sức chứa</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Buổi / tuần</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Sĩ số</th>
                    <th scope="col" className="px-3 py-2.5">Lớp</th>
                    <th scope="col" className="px-4 py-2.5">Trạng thái phòng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usageRows.map((row) => (
                    <tr key={row.name} className="transition-colors hover:bg-surface">
                      <td className="px-4 py-3 font-semibold whitespace-nowrap text-ink">{row.name}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-ink-soft">
                        {row.room ? `Tầng ${row.room.floor}` : "—"}
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-ink">
                        {row.room ? row.room.capacity : "—"}
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-ink">{row.sessions}</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums text-ink-soft">{row.students}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {row.classes.map((cls) => (
                            <Badge key={cls.id} variant={cls.tone} className="font-mono">
                              {cls.code}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {row.room ? (
                          <Badge variant={ROOM_STATUS_META[row.room.status].badge}>
                            {ROOM_STATUS_META[row.room.status].label}
                          </Badge>
                        ) : (
                          <span className="text-xs text-danger">Phòng không còn trong danh sách</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {usageRows.length === 0 && <TableEmpty colSpan={7} message="Chưa có lớp nào được xếp phòng." />}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      <Modal
        open={Boolean(draft)}
        onOpenChange={(open) => !open && closeDraft()}
        title={draft?.id ? "Chỉnh sửa phòng học" : "Thêm phòng học"}
        description="Sức chứa tối thiểu 4 chỗ, thiết bị nhập cách nhau bằng dấu phẩy."
        icon={<Building2 className="size-6" />}
        footer={
          <>
            <Button variant="outline" onClick={closeDraft}>
              Huỷ bỏ
            </Button>
            <Button onClick={saveDraft}>{draft?.id ? "Lưu thay đổi" : "Tạo phòng"}</Button>
          </>
        }
      >
        {draft && (
          <div className="flex flex-col gap-4">
            <FormField id="room-name" label="Tên phòng" required error={errors.name}>
              <Input
                id="room-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Ví dụ: Phòng 205"
                aria-invalid={Boolean(errors.name) || undefined}
                aria-describedby={errors.name ? "room-name-error" : undefined}
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="room-floor" label="Tầng" required error={errors.floor}>
                <Input
                  id="room-floor"
                  inputMode="numeric"
                  className="tabular-nums"
                  value={draft.floor}
                  onChange={(e) => setDraft({ ...draft, floor: e.target.value })}
                  aria-invalid={Boolean(errors.floor) || undefined}
                />
              </FormField>
              <FormField id="room-capacity" label="Sức chứa" required error={errors.capacity}>
                <Input
                  id="room-capacity"
                  inputMode="numeric"
                  className="tabular-nums"
                  value={draft.capacity}
                  onChange={(e) => setDraft({ ...draft, capacity: e.target.value })}
                  aria-invalid={Boolean(errors.capacity) || undefined}
                />
              </FormField>
            </div>
            <FormField id="room-equipment" label="Thiết bị" hint={<span className="text-xs text-ink-soft">Ngăn cách bằng dấu phẩy</span>}>
              <Input
                id="room-equipment"
                value={draft.equipment}
                onChange={(e) => setDraft({ ...draft, equipment: e.target.value })}
                placeholder="TV, Máy chiếu, Loa"
              />
            </FormField>
            <FormField id="room-status-field" label="Trạng thái" required>
              <select
                id="room-status-field"
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as AdminRoom["status"] })}
                className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}
              >
                {ROOM_STATUSES.map((key) => (
                  <option key={key} value={key}>
                    {ROOM_STATUS_META[key].label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Xoá phòng học?"
        description={pendingDelete ? `${pendingDelete.name} · tầng ${pendingDelete.floor}` : undefined}
        detail={
          pendingDelete
            ? classesUsingPending.length > 0
              ? `Cảnh báo: ${classesUsingPending.length} lớp đang xếp vào phòng này (${classesUsingPending
                  .map((cls) => cls.code)
                  .join(", ")}). Cần chuyển lớp sang phòng khác trước khi xoá.`
              : "Phòng không còn lớp nào sử dụng. Thao tác này không thể hoàn tác."
            : undefined
        }
        confirmLabel="Xoá phòng học"
        onConfirm={() => pendingDelete && softDelete(pendingDelete)}
      />
    </div>
  )
}
