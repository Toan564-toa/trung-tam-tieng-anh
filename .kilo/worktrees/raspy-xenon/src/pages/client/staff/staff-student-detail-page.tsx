import { useMemo, useState } from "react"
import { Link, Navigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Clock,
  CreditCard,
  Download,
  IdCard,
  Mail,
  MapPin,
  MessageSquarePlus,
  NotebookPen,
  Phone,
  Plus,
  Trash2,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react"
import { cn } from "cn"
import { SmartImage } from "@/components/common/smart-image"
import { Reveal } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { formatDate, formatWeekdayShort } from "@/lib/date"
import { formatVnd } from "@/lib/format"
import { MARK_META, type MarkStatus } from "@/data/teacher"
import { exportPaymentsSheet } from "@/lib/excel"
import {
  CLASS_STATUS_META,
  PAYMENT_METHOD_META,
  STAFF_TODAY,
  STUDENT_STATUS_META,
  TUITION_STATUS_META,
  classNameOf,
  getCenterClass,
  getStaffMember,
  getStaffStudent,
  lessonsOfStudent,
  markCountsOfStudent,
  paymentsOfStudent,
  tuitionProgress,
  type CareNote,
  type StaffStudent,
} from "@/data/staff"

const TABS = [
  { value: "info", label: "Thông tin", icon: IdCard },
  { value: "guardian", label: "Phụ huynh", icon: Users },
  { value: "class", label: "Lớp đang học", icon: BookOpen },
  { value: "attendance", label: "Điểm danh", icon: CalendarDays },
  { value: "tuition", label: "Học phí", icon: CreditCard },
  { value: "notes", label: "Ghi chú chăm sóc", icon: ClipboardList },
] as const

type TabValue = (typeof TABS)[number]["value"]

export function StaffStudentDetailPage() {
  const { studentId = "" } = useParams()
  const student = getStaffStudent(studentId)
  const [tab, setTab] = useState<TabValue>("info")
  const [notes, setNotes] = useState<CareNote[]>(student?.notes ?? [])
  const [noteOpen, setNoteOpen] = useState(false)

  if (!student) return <Navigate to="/nhan-vien/hoc-vien" replace />

  const cls = getCenterClass(student.classId)
  const staff = getStaffMember(student.staffId)

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl bg-brand p-5 sm:p-7">
          <div className="absolute -top-14 -right-10 size-56 rounded-full bg-white/25" aria-hidden="true" />
          <div className="relative">
            <Button variant="ghost" size="sm" className="-ml-3 mb-3" render={<Link to="/nhan-vien/hoc-vien" />}>
              <ArrowLeft /> Danh sách học viên
            </Button>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <SmartImage src={student.avatar} alt={student.fullName} className="size-16 shrink-0 rounded-full ring-4 ring-white/70" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-heading text-2xl font-extrabold text-ink">{student.fullName}</h1>
                  <Badge variant={STUDENT_STATUS_META[student.status].badge}>{STUDENT_STATUS_META[student.status].label}</Badge>
                  <Badge variant={TUITION_STATUS_META[student.tuition.status].badge}>{TUITION_STATUS_META[student.tuition.status].label}</Badge>
                </div>
                <p className="mt-1 text-sm text-ink/80">
                  {student.studentCode} · {classNameOf(student.classId)} · Nhân viên phụ trách: {staff?.fullName ?? "—"}
                </p>
                <p className="mt-0.5 text-xs text-ink/70">
                  Nhập học {student.startDate} · {student.level} · {student.phone}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" render={<a href={`tel:${student.guardian.phone.replace(/ /g, "")}`} />}>
                  <Phone /> Gọi phụ huynh
                </Button>
                <Button render={<Link to={`/nhan-vien/hoc-phi?hv=${student.id}`} />}>
                  <CreditCard /> Thu học phí
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setTab(item.value)}
              className={cn(
                "flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
                tab === item.value ? "bg-brand text-ink shadow-glow" : "bg-white text-ink-soft hover:bg-cream",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          ))}
        </div>
      </Reveal>

      {tab === "info" && <InfoTab student={student} />}
      {tab === "guardian" && <GuardianTab student={student} />}
      {tab === "class" && <ClassTab student={student} />}
      {tab === "attendance" && <AttendanceTab student={student} />}
      {tab === "tuition" && <TuitionTab student={student} />}
      {tab === "notes" && (
        <NotesTab
          notes={notes}
          onAdd={(note) => {
            setNotes((prev) => [note, ...prev])
            setNoteOpen(false)
            toast.success("Đã lưu ghi chú chăm sóc")
          }}
          onDelete={(id) => {
            setNotes((prev) => prev.filter((note) => note.id !== id))
            toast.success("Đã xoá ghi chú")
          }}
          open={noteOpen}
          onOpenChange={setNoteOpen}
        />
      )}

      {!cls && tab === "class" && null}
    </div>
  )
}

function InfoTab({ student }: { student: StaffStudent }) {
  return (
    <Reveal>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Thông tin hồ sơ</CardTitle>
            <CardDescription>Dữ liệu do phòng tư vấn quản lý, dùng cho ghi danh và liên hệ phụ huynh</CardDescription>
          </div>
          <Badge variant="neutral">Chi tiết</Badge>
        </CardHeader>
        <CardContent>
          <InfoGrid
            items={[
              { icon: UserRound, label: "Họ và tên", value: student.fullName },
              { icon: IdCard, label: "Mã học viên", value: student.studentCode },
              { icon: CalendarDays, label: "Ngày sinh", value: student.birthDate },
              { icon: UserRound, label: "Giới tính", value: student.gender },
              { icon: IdCard, label: "Số CCCD/CMND", value: student.identityNo },
              { icon: BadgeCheck, label: "Trình độ", value: student.level },
              { icon: Phone, label: "SĐT học viên", value: student.phone },
              { icon: Mail, label: "Email", value: student.email },
              { icon: UserRound, label: "Nghề nghiệp", value: student.occupation },
              { icon: MapPin, label: "Địa chỉ", value: student.address, wide: true },
              { icon: NotebookPen, label: "Điểm trung bình", value: `${student.averageScore.toFixed(1)} / 10` },
              { icon: CalendarDays, label: "Ngày nhập học", value: student.startDate },
            ]}
          />
        </CardContent>
      </Card>
    </Reveal>
  )
}

function GuardianTab({ student }: { student: StaffStudent }) {
  const g = student.guardian
  return (
    <Reveal>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Thông tin phụ huynh</CardTitle>
            <CardDescription>Người được liên hệ khi có việc cần xác nhận</CardDescription>
          </div>
          <Button variant="outline" size="sm" render={<a href={`tel:${g.phone.replace(/ /g, "")}`} />}>
            <Phone /> Gọi ngay
          </Button>
        </CardHeader>
        <CardContent>
          <InfoGrid
            items={[
              { icon: UserRound, label: "Họ và tên", value: g.fullName },
              { icon: Users, label: "Quan hệ", value: g.relation },
              { icon: Phone, label: "Số điện thoại", value: g.phone },
              { icon: Mail, label: "Email", value: g.email },
              { icon: UserRound, label: "Nghề nghiệp", value: g.occupation },
              { icon: MapPin, label: "Địa chỉ", value: g.address, wide: true },
            ]}
          />
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-cream p-3.5 text-xs leading-relaxed text-ink-soft">
            <BadgeCheck className="mt-0.5 size-4 shrink-0 text-success" />
            Thông tin phụ huynh đã được xác thực khi ghi danh. Mọi thay đổi cần được phòng Hành chính phê duyệt.
          </p>
        </CardContent>
      </Card>
    </Reveal>
  )
}

function ClassTab({ student }: { student: StaffStudent }) {
  const cls = getCenterClass(student.classId)
  if (!cls) {
    return (
      <Reveal>
        <Card>
          <CardContent className="py-12 text-center text-sm text-ink-soft">Học viên chưa được xếp lớp.</CardContent>
        </Card>
      </Reveal>
    )
  }
  const percent = Math.round((cls.doneLessons / cls.totalLessons) * 100)

  return (
    <Reveal>
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>{cls.name}</CardTitle>
              <CardDescription>
                {cls.course} · {cls.level} · {cls.room}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={cls.tone}>{cls.code}</Badge>
              <Badge variant={CLASS_STATUS_META[cls.status].badge}>{CLASS_STATUS_META[cls.status].label}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Progress value={cls.doneLessons} max={cls.totalLessons} label="Tiến độ khóa" valueLabel={`${cls.doneLessons}/${cls.totalLessons} buổi`} />
            <InfoGrid
              items={[
                { icon: Users, label: "Sĩ lượng", value: `${cls.studentCount}/${cls.maxStudents} học viên` },
                { icon: CalendarDays, label: "Lịch học", value: cls.weekdays.map((day) => formatWeekdayShort(new Date(2026, 9, 5 + day))).join(" & ") },
                { icon: Clock, label: "Khung giờ", value: cls.time },
                { icon: UserRound, label: "Giáo viên", value: cls.teacher },
                { icon: CalendarDays, label: "Khai giảng", value: cls.startDate },
                { icon: CalendarDays, label: "Kết thúc", value: cls.endDate },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tiến độ học viên</CardTitle>
            <CardDescription>Số liệu do giáo viên phụ trách cập nhật</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <MetricBox label="Điểm trung bình" value={`${student.averageScore.toFixed(1)}/10`} tone={student.averageScore >= 8 ? "text-success" : "text-warning"} />
            <MetricBox label="Tỷ lệ điểm danh" value={`${student.attendance.rate}%`} tone={student.attendance.rate >= 85 ? "text-success" : "text-warning"} />
            <MetricBox label="Buổi đã học" value={`${percent}% khóa`} tone="text-ink" />
          </CardContent>
        </Card>
      </div>
    </Reveal>
  )
}

function AttendanceTab({ student }: { student: StaffStudent }) {
  const lessons = useMemo(() => lessonsOfStudent(student), [student])
  const counts = useMemo(() => markCountsOfStudent(student), [student])

  if (lessons.length === 0) {
    return (
      <Reveal>
        <Card>
          <CardHeader>
            <CardTitle>Điểm danh</CardTitle>
            <CardDescription>Dữ liệu điểm danh chi tiết được giáo viên phụ trách cập nhật theo buổi</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-4">
            <MetricBox label="Tỷ lệ tham dự" value={`${student.attendance.rate}%`} tone={student.attendance.rate >= 85 ? "text-success" : "text-warning"} />
            <MetricBox label="Buổi vắng" value={String(student.attendance.absent)} tone="text-danger" />
            <MetricBox label="Buổi muộn" value={String(student.attendance.late)} tone="text-warning" />
            <MetricBox label="Tổng số buổi" value={String(lessons.length || "—")} tone="text-ink" />
          </CardContent>
        </Card>
      </Reveal>
    )
  }

  return (
    <Reveal>
      <Card>
        <CardHeader>
          <CardTitle>Điểm danh {lessons.length} buổi gần nhất</CardTitle>
          <CardDescription>Dữ liệu lấy từ lịch buổi học của lớp {classNameOf(student.classId)}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-4">
            {(Object.keys(MARK_META) as MarkStatus[]).map((status) => (
              <MetricBox key={status} label={MARK_META[status].label} value={String(counts[status])} tone="text-ink" />
            ))}
          </div>
          <ul className="flex flex-col gap-2">
            {[...lessons].reverse().map((lesson) => {
              const status = lesson.marks[student.id]
              return (
                <li key={lesson.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3.5 py-2.5">
                  <span className="font-heading w-14 shrink-0 text-sm font-bold text-ink-soft">#{lesson.no}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{lesson.topic}</span>
                    <span className="block text-xs text-ink-soft">{formatDate(lesson.date)} · {lesson.time}</span>
                  </span>
                  {status ? (
                    <Badge variant={MARK_META[status].badge}>{MARK_META[status].label}</Badge>
                  ) : (
                    <Badge variant="neutral">Chưa điểm danh</Badge>
                  )}
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>
    </Reveal>
  )
}

function TuitionTab({ student }: { student: StaffStudent }) {
  const payments = paymentsOfStudent(student.id)
  const percent = tuitionProgress(student)

  return (
    <Reveal>
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Học phí</CardTitle>
              <CardDescription>
                Hạn đóng gần nhất: {formatDate(student.tuition.dueDate)} ·{" "}
                {student.tuition.remaining > 0 ? "còn phải thu" : "đã đóng đủ"}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void exportPaymentsSheet(
                  payments.map((payment) => ({
                    date: payment.date,
                    receiptNo: payment.receiptNo,
                    studentName: student.fullName,
                    studentCode: student.studentCode,
                    className: classNameOf(student.classId),
                    method: payment.method,
                    amount: payment.amount,
                    note: payment.note,
                    collectorName: "Phòng Tư vấn",
                  })),
                )
              }
            >
              <Download /> Xuất sổ thu
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Progress
              value={percent}
              label={`Đã đóng ${formatVnd(student.tuition.paid)} / ${formatVnd(student.tuition.total)}`}
              valueLabel={`${percent}%`}
              tone={percent === 100 ? "success" : percent >= 50 ? "warning" : "danger"}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <MetricBox label="Tổng học phí" value={formatVnd(student.tuition.total)} tone="text-ink" />
              <MetricBox label="Đã đóng" value={formatVnd(student.tuition.paid)} tone="text-success" />
              <MetricBox label="Còn phải thu" value={formatVnd(student.tuition.remaining)} tone={student.tuition.remaining ? "text-danger" : "text-success"} />
            </div>
            {student.tuition.remaining > 0 && (
              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                <p className="text-sm font-semibold text-warning">Cần thu {formatVnd(student.tuition.remaining)}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                  Hạn đóng {formatDate(student.tuition.dueDate)}, quá hạn {Math.max(0, Math.round((STAFF_TODAY.getTime() - student.tuition.dueDate.getTime()) / 86_400_000))} ngày.
                </p>
                <Button className="mt-3" size="sm" render={<Link to={`/nhan-vien/hoc-phi?hv=${student.id}`} />}>
                  <Banknote /> Mở màn thu học phí
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lịch sử thanh toán</CardTitle>
            <CardDescription>{payments.length} phiếu thu đã ghi nhận</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {payments.map((payment) => (
              <div key={payment.id} className="flex items-center gap-3 rounded-xl bg-surface p-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-success">
                  <Banknote className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{payment.note}</p>
                  <p className="truncate text-xs text-ink-soft">{payment.date} · {payment.receiptNo} · {payment.forInvoice}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <p className="font-heading text-sm font-extrabold text-success tabular-nums">{formatVnd(payment.amount)}</p>
                  <Badge variant={PAYMENT_METHOD_META[payment.method].badge}>{payment.method}</Badge>
                </div>
              </div>
            ))}
            {payments.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-ink-soft">
                Chưa ghi nhận khoản thanh toán nào.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </Reveal>
  )
}

function NotesTab({
  notes,
  onAdd,
  onDelete,
  open,
  onOpenChange,
}: {
  notes: CareNote[]
  onAdd: (note: CareNote) => void
  onDelete: (id: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [error, setError] = useState<string | undefined>(undefined)

  const reset = () => {
    setTitle("")
    setBody("")
    setError(undefined)
  }

  return (
    <>
      <Reveal>
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Ghi chú chăm sóc</CardTitle>
              <CardDescription>Lưu lại lịch sử trao đổi với phụ huynh và giáo viên</CardDescription>
            </div>
            <Button size="sm" onClick={() => onOpenChange(true)}>
              <Plus /> Thêm ghi chú
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {notes.map((note) => (
              <article key={note.id} className={cn("rounded-2xl border p-4", toneBorder[note.tone])}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-ink">{note.title}</h3>
                    <p className="mt-0.5 text-xs text-ink-soft">{note.date} · {note.author}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={note.tone}>{TONE_LABEL[note.tone]}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Xoá ghi chú ${note.title}`}
                      className="text-danger hover:bg-red-50"
                      onClick={() => onDelete(note.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{note.body}</p>
              </article>
            ))}
            {notes.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 py-12 text-center">
                <MessageSquarePlus className="size-6 text-slate-300" />
                <p className="text-sm text-ink-soft">Chưa có ghi chú nào cho học viên này.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </Reveal>

      <Modal
        open={open}
        onOpenChange={(next) => {
          if (!next) reset()
          onOpenChange(next)
        }}
        title="Thêm ghi chú chăm sóc"
        description="Ghi chú giúp nhân viên khác nắm được lịch sử trao đổi với phụ huynh."
        icon={<MessageSquarePlus className="size-6" />}
        footer={
          <>
            <Button variant="outline" onClick={() => { reset(); onOpenChange(false) }}>Hủy bỏ</Button>
            <Button
              onClick={() => {
                if (title.trim().length < 3) {
                  setError("Vui lòng nhập tiêu đề ghi chú.")
                  return
                }
                if (body.trim().length < 10) {
                  setError("Nội dung ghi chú cần ít nhất 10 ký tự.")
                  return
                }
                onAdd({
                  id: `note-${Date.now()}`,
                  date: formatDate(STAFF_TODAY),
                  author: "Trần Thị Hồng Nhung",
                  title: title.trim(),
                  body: body.trim(),
                  tone: "info",
                })
                reset()
              }}
            >
              Lưu ghi chú
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FormField id="note-title" label="Tiêu đề" required error={error}>
            <Input
              id="note-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setError(undefined)
              }}
              placeholder="Ví dụ: Phụ huynh muốn chuyển sang lớp tối"
              aria-invalid={Boolean(error) || undefined}
            />
          </FormField>
          <FormField id="note-body" label="Nội dung" required>
            <Textarea
              id="note-body"
              value={body}
              onChange={(e) => {
                setBody(e.target.value)
                setError(undefined)
              }}
              placeholder="Diễn biến cuộc gọi, thỏa thuận với phụ huynh..."
            />
          </FormField>
        </div>
      </Modal>
    </>
  )
}

const TONE_LABEL: Record<CareNote["tone"], string> = {
  info: "Thông tin",
  warning: "Cần lưu ý",
  success: "Tích cực",
  danger: "Cảnh báo",
}

const toneBorder: Record<CareNote["tone"], string> = {
  info: "border-slate-100",
  warning: "border-orange-200 bg-orange-50/40",
  success: "border-green-100 bg-green-50/40",
  danger: "border-red-200 bg-red-50/40",
}

function MetricBox({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl bg-surface p-4">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className={cn("font-heading mt-1 text-lg font-extrabold tabular-nums", tone)}>{value}</p>
    </div>
  )
}

type InfoItem = { icon: LucideIcon; label: string; value: string; wide?: boolean }

function InfoGrid({ items }: { items: InfoItem[] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className={cn(item.wide && "sm:col-span-2 lg:col-span-3")}>
          <div className="flex items-start gap-3 rounded-xl bg-surface p-3">
            <item.icon className="mt-0.5 size-4 shrink-0 text-brand-hover" />
            <div className="min-w-0">
              <dt className="text-xs text-ink-soft">{item.label}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-ink">{item.value}</dd>
            </div>
          </div>
        </div>
      ))}
    </dl>
  )
}