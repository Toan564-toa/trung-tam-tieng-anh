import { useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardCheck, Download, Save } from "lucide-react"
import { cn } from "cn"
import { QuickMarkList } from "@/features/teacher/quick-mark-list"
import { PageHeader } from "@/components/layout/page-header"
import { Reveal } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/toast"
import { daysBetween, formatDate } from "@/lib/date"
import { exportAttendanceSheet, exportAttendanceSummary } from "@/lib/excel"
import {
  ATTENDANCE_LOCK_DAYS,
  CLASSES,
  MARK_META,
  TODAY,
  getClass,
  lessonsOfClass,
  studentsOfClass,
  type ClassLesson,
  type MarkStatus,
  type TeacherClass,
  type TeacherStudent,
} from "@/data/teacher"

export function TeacherAttendancePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const classId = searchParams.get("lop") ?? CLASSES[0].id
  const cls = getClass(classId) ?? CLASSES[0]
  const lessons = lessonsOfClass(cls.id)

  const requestedLesson = Number(searchParams.get("buoi"))
  const defaultLesson =
    lessons.find((l) => l.no === requestedLesson) ??
    lessons.find((l) => !l.marked) ??
    lessons[lessons.length - 1]

  const lessonId = searchParams.get("buoiId") ?? defaultLesson?.id
  const lesson = lessons.find((l) => l.id === lessonId) ?? defaultLesson

  const lockAge = lesson?.lockedAt ? daysBetween(lesson.lockedAt, TODAY) : 0
  const locked = Boolean(lesson?.lockedAt && lockAge > ATTENDANCE_LOCK_DAYS)

  const setClass = (id: string) => setSearchParams({ lop: id }, { replace: true })
  const setLesson = (id: string) => setSearchParams({ lop: cls.id, buoiId: id }, { replace: true })

  if (!lesson) return null

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Dùng được ngay trên điện thoại tại lớp"
        title="Điểm danh"
        description="Chọn lớp và buổi học, chạm một lần để đánh dấu trạng thái cho từng học viên."
      />

      {/* Bước 1 & 2: chọn lớp, chọn buổi */}
      <Reveal>
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                <span className="flex size-5 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-ink">1</span>
                Chọn lớp
              </p>
              <div className="flex flex-wrap gap-2">
                {CLASSES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setClass(item.id)}
                    className={cn(
                      "min-h-11 cursor-pointer rounded-2xl px-4 text-sm font-semibold transition-colors",
                      item.id === cls.id ? "bg-brand text-ink shadow-glow" : "bg-surface text-ink-soft hover:bg-cream",
                    )}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                <span className="flex size-5 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-ink">2</span>
                Chọn buổi học
              </p>
              <select
                value={lesson.id}
                onChange={(e) => setLesson(e.target.value)}
                aria-label="Chọn buổi học"
                className="h-12 w-full cursor-pointer rounded-xl border border-input bg-white px-4 text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/25 md:text-sm"
              >
                {lessons.map((item) => (
                  <option key={item.id} value={item.id}>
                    Buổi {item.no} · {formatDate(item.date)} · {item.marked ? "đã điểm danh" : "chưa điểm danh"}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant={lesson.marked ? "success" : "warning"}>{lesson.marked ? "Đã lưu điểm danh" : "Chưa điểm danh"}</Badge>
                <span className="text-xs text-ink-soft">
                  {lesson.topic} · {lesson.time} · {cls.room}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={() => void exportAttendanceSummary(cls.name, lessons, studentsOfClass(cls.id))}>
                <Download /> Xuất tổng hợp cả lớp
              </Button>
              <Button variant="ghost" size="sm" render={<Link to={`/giao-vien/lop-hoc/${cls.id}?tab=attendance`} />}>
                <ArrowLeft /> Mở trong lớp
              </Button>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      {locked && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
          <div>
            <p className="text-sm font-semibold text-warning">Đã quá hạn sửa điểm danh</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              Buổi học này được lưu từ {lesson.lockedAt && formatDate(lesson.lockedAt)}, đã vượt quá {ATTENDANCE_LOCK_DAYS} ngày nên đã
              khóa chỉnh sửa. Vui lòng liên hệ phòng Hành chính nếu cần điều chỉnh.
            </p>
          </div>
        </div>
      )}

      {/* Đổi lớp/buổi sẽ mount lại panel nhờ đổi key, dữ liệu điểm danh nạp đúng buổi. */}
      <MarkingPanel key={`${cls.id}:${lesson.id}`} cls={cls} lesson={lesson} locked={locked} />
    </div>
  )
}

function MarkingPanel({ cls, lesson, locked }: { cls: TeacherClass; lesson: ClassLesson; locked: boolean }) {
  const students = studentsOfClass(cls.id)
  const [marks, setMarks] = useState<Record<string, MarkStatus>>(lesson.marks ?? {})
  const [note, setNote] = useState(lesson.note ?? "")
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const counts = useMemo(() => {
    const result: Record<MarkStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 }
    for (const student of students) {
      const status = marks[student.id]
      if (status) result[status] += 1
    }
    return result
  }, [marks, students])

  const unmarked = students.filter((s) => !marks[s.id]).length

  return (
    <>
      {/* Thanh đếm nhanh + nút tất cả có mặt, dính khi cuộn trên mobile */}
      <Reveal>
        <div className="sticky top-32 z-20 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white/95 p-3 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(MARK_META) as MarkStatus[]).map((status) => (
              <span key={status} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-ink">
                <span className={cn("size-2 rounded-full", MARK_META[status].dot)} />
                {MARK_META[status].label}: <span className="tabular-nums">{counts[status]}</span>
              </span>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={locked}
            onClick={() => {
              setMarks(Object.fromEntries(students.map((s) => [s.id, "present"] as const)))
              toast.info("Đã đánh dấu tất cả có mặt", { description: "Hãy kiểm tra lại học viên vắng hoặc đi muộn." })
            }}
          >
            <CheckCircle2 /> Tất cả có mặt
          </Button>
        </div>
      </Reveal>

      <Reveal>
        <Card>
          <CardHeader>
            <CardTitle>Bảng điểm danh · Buổi {lesson.no}</CardTitle>
            <CardDescription>
              {cls.name} · {students.length} học viên{unmarked > 0 && ` · ${unmarked} chưa đánh dấu`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QuickMarkList
              students={students as TeacherStudent[]}
              marks={marks}
              onChange={(id, status) => setMarks((prev) => ({ ...prev, [id]: status }))}
              readOnly={locked}
            />
          </CardContent>
        </Card>
      </Reveal>

      {/* Ghi chú + lưu */}
      <Reveal>
        <Card>
          <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
            <div>
              <label htmlFor="note" className="text-sm font-semibold text-ink">
                Ghi chú buổi học
              </label>
              <CardDescription className="mt-1">
                Ghi chú sẽ được in ra trong bảng điểm danh xuất Excel và gửi tới phòng Hành chính.
              </CardDescription>
            </div>
            <textarea
              id="note"
              value={note}
              disabled={locked}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Ví dụ: 2 học viên xin phép vắng do ốm, buổi học bù dự kiến ngày..."
              className="w-full rounded-xl border border-input bg-white px-4 py-3 text-base text-ink outline-none placeholder:text-slate-400 focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/25 disabled:opacity-60 md:text-sm"
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-ink-soft">
                {counts.present + counts.late}/{students.length} học viên được tính tham dự.
                {savedAt && <span className="ml-1 font-medium text-success">Đã lưu lúc {savedAt}.</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void exportAttendanceSheet(cls.name, { ...lesson, marks, note }, students, note)}>
                  <Download /> Xuất bảng buổi học
                </Button>
                <Button
                  disabled={locked}
                  onClick={() => {
                    setSavedAt(new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }))
                    toast.success("Đã lưu điểm danh!", {
                      description: `${cls.name} · Buổi ${lesson.no}: ${counts.absent} vắng, ${counts.late} muộn, ${counts.excused} có phép.`,
                    })
                  }}
                >
                  <Save /> Lưu điểm danh
                </Button>
              </div>
            </div>
            <p className="flex items-start gap-2 rounded-xl bg-surface p-3 text-xs leading-relaxed text-ink-soft">
              <ClipboardCheck className="mt-0.5 size-4 shrink-0" />
              Điểm danh sẽ khóa sau {ATTENDANCE_LOCK_DAYS} ngày. Trong thời gian này bạn vẫn có thể sửa lại.
            </p>
          </CardContent>
        </Card>
      </Reveal>
    </>
  )
}