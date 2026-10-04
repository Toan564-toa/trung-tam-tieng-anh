import { useMemo, useState } from "react"
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom"
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Download,
  ListChecks,
  NotebookPen,
  TrendingUp,
  Users,
} from "lucide-react"
import { cn } from "cn"
import { QuickMarkList } from "@/features/teacher/quick-mark-list"
import { SmartImage } from "@/components/common/smart-image"
import { StatCard } from "@/components/common/stat-card"
import { Reveal } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/toast"
import { formatDate, formatWeekdayShort, daysBetween } from "@/lib/date"
import { exportAttendanceSheet, exportAttendanceSummary } from "@/lib/excel"
import {
  ATTENDANCE_LOCK_DAYS,
  CLASS_META,
  MARK_META,
  TEST_KIND_META,
  getClass,
  lessonsOfClass,
  scoresOfTest,
  studentsOfClass,
  testsOfClass,
  TODAY,
  type MarkStatus,
} from "@/data/teacher"

const TABS = [
  { value: "students", label: "Danh sách học viên", icon: Users },
  { value: "schedule", label: "Lịch học", icon: ListChecks },
  { value: "attendance", label: "Điểm danh", icon: ClipboardCheck },
  { value: "scores", label: "Điểm số", icon: NotebookPen },
] as const

type TabValue = (typeof TABS)[number]["value"]

export function TeacherClassDetailPage() {
  const { classId = "" } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const cls = getClass(classId)

  const tabParam = searchParams.get("tab") as TabValue | null
  const tab: TabValue = TABS.some((t) => t.value === tabParam) ? (tabParam as TabValue) : "students"
  const setTab = (value: TabValue) => setSearchParams({ tab: value }, { replace: true })

  if (!cls) return <Navigate to="/giao-vien/lop-hoc" replace />

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl bg-brand p-5 sm:p-7">
          <div className="absolute -top-14 -right-10 size-56 rounded-full bg-white/25" aria-hidden="true" />
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 mb-2"
              render={<Link to="/giao-vien/lop-hoc" />}
            >
              <ArrowLeft /> Tất cả lớp
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-extrabold text-ink sm:text-3xl">{cls.name}</h1>
              <Badge variant={cls.tone}>{cls.level}</Badge>
              <Badge variant={CLASS_META[cls.status].badge}>{CLASS_META[cls.status].label}</Badge>
            </div>
            <p className="mt-1.5 text-sm text-ink/80">
              {cls.course} · Mã lớp {cls.code} · {cls.room}
            </p>
            <p className="mt-0.5 text-sm text-ink/75">
              {cls.startDate} – {cls.endDate} · {cls.doneLessons}/{cls.totalLessons} buổi
            </p>
          </div>
        </div>
      </Reveal>

      {/* Thanh tab cuộn ngang trên mobile */}
      <div className="sticky top-16 z-20 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div role="tablist" aria-label="Các mục của lớp" className="flex w-max gap-2 rounded-2xl bg-white p-1.5 shadow-soft sm:w-full">
          {TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={tab === item.value}
              onClick={() => setTab(item.value)}
              className={cn(
                "flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-3.5 text-sm font-semibold whitespace-nowrap transition-colors",
                tab === item.value ? "bg-brand text-ink shadow-glow" : "text-ink-soft hover:bg-cream hover:text-ink",
              )}
            >
              <item.icon className="size-4.5" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "students" && <StudentsTab classId={classId} />}
      {tab === "schedule" && <ScheduleTab classId={classId} />}
      {tab === "attendance" && <AttendanceTab classId={classId} />}
      {tab === "scores" && <ScoresTab classId={classId} />}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Tab: Danh sách học viên
 * ------------------------------------------------------------------ */

function StudentsTab({ classId }: { classId: string }) {
  const cls = getClass(classId)
  const students = studentsOfClass(classId)

  return (
    <div className="flex flex-col gap-4">
      <Reveal>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Sĩ số" value={`${students.length}/${cls?.maxStudents ?? 0}`} icon={Users} iconClass="bg-sky-100 text-sky-700" />
          <StatCard label="Tỷ lệ điểm danh TB" value={`${Math.round(students.reduce((s, x) => s + x.attendanceRate, 0) / students.length)}%`} icon={CheckCircle2} trend={{ text: "Đạt yêu cầu 80%", tone: "success" }} iconClass="bg-green-100 text-success" />
          <StatCard
            label="Điểm TB lớp"
            value={(students.reduce((s, x) => s + x.averageScore, 0) / students.length).toFixed(1)}
            icon={TrendingUp}
            iconClass="bg-orange-100 text-warning"
          />
        </div>
      </Reveal>

      <Reveal delay={0.06}>
        <ul className="grid gap-3 sm:grid-cols-2">
          {students.map((student, index) => (
            <li key={student.id}>
              <Link
                to={`/giao-vien/hoc-vien/${student.id}`}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-brand/50"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface font-heading text-[11px] font-bold text-ink-soft">
                  {index + 1}
                </span>
                <SmartImage src={student.avatar} alt={student.fullName} className="size-11 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{student.fullName}</p>
                  <p className="truncate text-xs text-ink-soft">{student.studentCode}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={cn("font-heading text-sm font-extrabold", student.attendanceRate >= 80 ? "text-success" : "text-warning")}>
                    {student.attendanceRate}%
                  </p>
                  <p className="text-[11px] text-ink-soft">Điểm danh</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Reveal>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Tab: Lịch học
 * ------------------------------------------------------------------ */

function ScheduleTab({ classId }: { classId: string }) {
  const lessons = lessonsOfClass(classId)

  return (
    <Reveal>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Lịch học</CardTitle>
            <CardDescription>{lessons.length} buổi trong khóa</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void exportAttendanceSummary(getClass(classId)?.name ?? classId, lessons, studentsOfClass(classId))}
          >
            <Download /> Xuất Excel
          </Button>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2">
            {lessons.map((lesson) => (
              <li
                key={lesson.id}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-3.5",
                  !lesson.marked ? "border-brand bg-cream/50" : "border-slate-100",
                )}
              >
                <span className="flex size-10 shrink-0 flex-col items-center justify-center rounded-xl bg-surface">
                  <span className="text-[10px] font-bold text-brand-hover">{formatWeekdayShort(lesson.date)}</span>
                  <span className="font-heading text-sm leading-none font-extrabold text-ink">{lesson.date.getDate()}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    Buổi {lesson.no} · {lesson.topic}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-soft">
                    {formatDate(lesson.date)} · {lesson.time} · {lesson.unit}
                  </p>
                </div>
                <Badge variant={lesson.marked ? "success" : "warning"} className="shrink-0">
                  {lesson.marked ? "Đã điểm danh" : "Chờ"}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </Reveal>
  )
}

/* ------------------------------------------------------------------ *
 * Tab: Điểm danh
 * ------------------------------------------------------------------ */

function AttendanceTab({ classId }: { classId: string }) {
  const lessons = lessonsOfClass(classId)
  const todayLesson =
    lessons.find((l) => l.date.getTime() === TODAY.getTime()) ?? lessons.find((l) => !l.marked) ?? lessons[lessons.length - 1]
  const [lessonId, setLessonId] = useState(todayLesson?.id ?? lessons[0]?.id)
  const lesson = lessons.find((l) => l.id === lessonId) ?? todayLesson

  if (!lesson) return null

  const lockAge = lesson.lockedAt ? daysBetween(lesson.lockedAt, TODAY) : 0
  const locked = Boolean(lesson.lockedAt && lockAge > ATTENDANCE_LOCK_DAYS)

  return (
    <div className="flex flex-col gap-4">
      <Reveal>
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:p-5">
            <div className="min-w-0 flex-1">
              <label htmlFor="lesson-select" className="mb-2 block text-sm font-semibold text-ink">
                Chọn buổi học
              </label>
              <select
                id="lesson-select"
                value={lesson.id}
                onChange={(e) => setLessonId(e.target.value)}
                className="h-12 w-full cursor-pointer rounded-xl border border-input bg-white px-4 text-sm text-ink outline-none focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/25"
              >
                {lessons.map((item) => (
                  <option key={item.id} value={item.id}>
                    Buổi {item.no} · {formatDate(item.date)} · {item.marked ? "đã điểm danh" : "chưa điểm danh"}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-ink-soft">
                {lesson.topic} · {lesson.time}
              </p>
            </div>
            <Button
              variant="outline"
              render={<Link to={`/giao-vien/diem-danh?lop=${classId}&buoiId=${lesson.id}`} />}
            >
              <Download /> Mở màn điểm danh
            </Button>
          </CardContent>
        </Card>
      </Reveal>

      {locked && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <ClipboardCheck className="mt-0.5 size-5 shrink-0 text-warning" />
          <div>
            <p className="text-sm font-semibold text-warning">Đã quá hạn sửa điểm danh</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              Buổi học này đã lưu từ {lesson.lockedAt && formatDate(lesson.lockedAt)}, vượt quá {ATTENDANCE_LOCK_DAYS} ngày nên không thể
              chỉnh sửa. Nếu cần điều chỉnh, vui lòng liên hệ phòng Hành chính.
            </p>
          </div>
        </div>
      )}

      {/* Mỗi buổi học là một state riêng, đổi buổi sẽ nạp lại dữ liệu nhờ đổi key. */}
      <LessonMarkingPanel key={lesson.id} classId={classId} lesson={lesson} locked={locked} />
    </div>
  )
}

function LessonMarkingPanel({
  classId,
  lesson,
  locked,
}: {
  classId: string
  lesson: NonNullable<ReturnType<typeof lessonsOfClass>>[number]
  locked: boolean
}) {
  const students = studentsOfClass(classId)
  const [marks, setMarks] = useState<Record<string, MarkStatus>>(lesson.marks ?? {})
  const [note, setNote] = useState(lesson.note ?? "")

  const counts = useMemo(() => {
    const result: Record<MarkStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 }
    for (const student of students) {
      const status = marks[student.id]
      if (status) result[status] += 1
    }
    return result
  }, [marks, students])

  return (
    <Reveal>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Điểm danh lớp · Buổi {lesson.no}</CardTitle>
            <CardDescription>Bấm trạng thái tương ứng cho từng học viên · {students.length} học viên</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void exportAttendanceSheet(getClass(classId)?.name ?? classId, { ...lesson, marks, note }, students, note)}
          >
            <Download /> Xuất Excel
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="sticky top-32 z-10 flex flex-col gap-3 rounded-2xl bg-white/95 p-3 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(MARK_META) as MarkStatus[]).map((status) => (
                <span key={status} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-ink">
                  <span className={cn("size-2 rounded-full", MARK_META[status].dot)} />
                  {MARK_META[status].label}: {counts[status]}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={locked}
                onClick={() => {
                  setMarks(Object.fromEntries(students.map((s) => [s.id, "present"] as const)))
                  toast.info("Đã đánh dấu tất cả có mặt", { description: "Nhớ kiểm tra lại các học viên vắng hoặc đi muộn." })
                }}
              >
                <CheckCircle2 /> Tất cả có mặt
              </Button>
            </div>
          </div>

          <QuickMarkList
            students={students}
            marks={marks}
            onChange={(id, status) => setMarks((prev) => ({ ...prev, [id]: status }))}
            readOnly={locked}
          />

          <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
            <label htmlFor="attendance-note" className="text-sm font-semibold text-ink">
              Ghi chú buổi học
            </label>
            <textarea
              id="attendance-note"
              value={note}
              disabled={locked}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Ví dụ: 2 học viên xin phép vắng do ốm, buổi học bù dự kiến ngày..."
              className="w-full rounded-xl border border-input bg-white px-4 py-3 text-sm text-ink outline-none placeholder:text-slate-400 focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/25 disabled:opacity-60"
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-ink-soft">
                {counts.present + counts.late}/{students.length} học viên được tính tham dự.
              </p>
              <Button
                block
                disabled={locked}
                onClick={() =>
                  toast.success("Đã lưu điểm danh!", {
                    description: `Buổi ${lesson.no} · ${counts.absent} vắng, ${counts.late} muộn, ${counts.excused} có phép.`,
                  })
                }
              >
                <ClipboardCheck /> Lưu điểm danh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Reveal>
  )
}

/* ------------------------------------------------------------------ *
 * Tab: Điểm số
 * ------------------------------------------------------------------ */

function ScoresTab({ classId }: { classId: string }) {
  const tests = testsOfClass(classId)
  const students = studentsOfClass(classId)

  return (
    <div className="flex flex-col gap-4">
      <Reveal>
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Bài kiểm tra</CardTitle>
              <CardDescription>Chọn bài kiểm tra để nhập hoặc xem điểm</CardDescription>
            </div>
            <Button size="sm" render={<Link to={`/giao-vien/nhap-diem?lop=${classId}`} />}>
              <NotebookPen /> Nhập điểm
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {tests.length === 0 && (
              <p className="rounded-2xl border border-dashed border-slate-300 py-10 text-center text-sm text-ink-soft">
                Lớp này chưa có bài kiểm tra nào.
              </p>
            )}
            {tests.map((test) => {
              const scores = scoresOfTest(test.id)
              const graded = Object.keys(scores).length
              const average = graded ? Object.values(scores).reduce((s, v) => s + v, 0) / graded : 0
              return (
                <Link
                  key={test.id}
                  to={`/giao-vien/nhap-diem?lop=${classId}&bai=${test.id}`}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 transition-colors hover:border-brand/50 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-ink">{test.name}</p>
                      <Badge variant={TEST_KIND_META[test.kind].badge}>{TEST_KIND_META[test.kind].label}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-soft">{test.date} · Thang điểm {test.maxScore}</p>
                  </div>
                  <div className="flex items-center gap-4 sm:shrink-0">
                    <div className="text-right">
                      <p className="font-heading text-lg font-extrabold text-ink tabular-nums">
                        {graded ? average.toFixed(1) : "—"}
                      </p>
                      <p className="text-[11px] text-ink-soft">Điểm TB</p>
                    </div>
                    <Badge variant={graded === students.length ? "success" : "neutral"}>
                      {graded}/{students.length} đã chấm
                    </Badge>
                  </div>
                </Link>
              )
            })}
          </CardContent>
        </Card>
      </Reveal>

      {tests[0] && (
        <Reveal delay={0.06}>
          <Card>
            <CardHeader>
              <CardTitle>Phân bố điểm lớp</CardTitle>
              <CardDescription>{tests[0].name} · {students.length} học viên</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {students.slice(0, 8).map((student) => (
                <Progress
                  key={student.id}
                  value={student.averageScore}
                  max={10}
                  size="sm"
                  label={student.fullName}
                  valueLabel={student.averageScore.toFixed(1)}
                  tone={student.averageScore >= 8 ? "success" : student.averageScore >= 6.5 ? "brand" : "warning"}
                />
              ))}
              <p className="text-xs text-ink-soft">Hiển thị 8 học viên đầu. Xem đầy đủ trong trang Nhập điểm.</p>
            </CardContent>
          </Card>
        </Reveal>
      )}
    </div>
  )
}