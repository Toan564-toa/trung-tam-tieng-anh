import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Phone, Search, TrendingUp, Users } from "lucide-react"
import { cn } from "cn"
import { PageHeader } from "@/components/layout/page-header"
import { SmartImage } from "@/components/common/smart-image"
import { StatCard } from "@/components/common/stat-card"
import { Reveal } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { CLASSES, TEACHER_STUDENTS, getClass } from "@/data/teacher"

export function TeacherStudentsPage() {
  const [query, setQuery] = useState("")
  const [classId, setClassId] = useState("all")

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return TEACHER_STUDENTS.filter((student) => {
      const matchClass = classId === "all" || student.classId === classId
      const matchTerm =
        !term ||
        student.fullName.toLowerCase().includes(term) ||
        student.studentCode.toLowerCase().includes(term) ||
        student.guardianName.toLowerCase().includes(term)
      return matchClass && matchTerm
    })
  }, [query, classId])

  const avgAttendance = Math.round(
    (TEACHER_STUDENTS.reduce((s, x) => s + x.attendanceRate, 0) / TEACHER_STUDENTS.length) * 10,
  ) / 10
  const lowAttendance = TEACHER_STUDENTS.filter((s) => s.attendanceRate < 85)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`${TEACHER_STUDENTS.length} học viên trong ${CLASSES.length} lớp`}
        title="Thông tin học viên"
        description="Chỉ hiển thị học viên thuộc các lớp bạn đang phụ trách."
      />

      <Reveal>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Tổng học viên" value={String(TEACHER_STUDENTS.length)} icon={Users} iconClass="bg-sky-100 text-sky-700" />
          <StatCard label="Tỷ lệ điểm danh TB" value={`${avgAttendance}%`} icon={TrendingUp} trend={{ text: "Toàn bộ lớp", tone: "success" }} iconClass="bg-green-100 text-success" />
          <StatCard
            label="Cần theo dõi"
            value={String(lowAttendance.length)}
            icon={Phone}
            trend={lowAttendance.length ? { text: "Dưới 85% chuyên cần", tone: "warning" } : { text: "Tất cả ổn", tone: "success" }}
            iconClass="bg-orange-100 text-warning"
          />
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <Card>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-soft" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm theo tên, mã học viên hoặc phụ huynh..."
                className="pl-11"
                aria-label="Tìm học viên"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setClassId("all")}
                className={cn(
                  "min-h-10 cursor-pointer rounded-full px-4 text-sm font-semibold transition-colors",
                  classId === "all" ? "bg-brand text-ink shadow-glow" : "bg-surface text-ink-soft hover:bg-cream",
                )}
              >
                Tất cả
              </button>
              {CLASSES.map((cls) => (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => setClassId(cls.id)}
                  className={cn(
                    "min-h-10 cursor-pointer rounded-full px-4 text-sm font-semibold transition-colors",
                    classId === cls.id ? "bg-brand text-ink shadow-glow" : "bg-surface text-ink-soft hover:bg-cream",
                  )}
                >
                  {cls.name}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={0.1}>
        <ul className="grid gap-3 lg:grid-cols-2">
          {filtered.map((student) => {
            const cls = getClass(student.classId)
            return (
              <li key={student.id}>
                <Link
                  to={`/giao-vien/hoc-vien/${student.id}`}
                  className="flex items-center gap-3.5 rounded-2xl border border-slate-100 bg-white p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:border-brand/50"
                >
                  <SmartImage src={student.avatar} alt={student.fullName} className="size-12 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-ink">{student.fullName}</p>
                      <Badge variant={cls?.tone ?? "neutral"} className="shrink-0">{cls?.code}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-ink-soft">
                      {student.studentCode} · {student.guardianName} ({student.guardianRelation})
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-ink-soft">
                      <Phone className="size-3.5" />
                      {student.guardianPhone}
                    </p>
                  </div>
                  <div className="shrink-0 space-y-1 text-right">
                    <p className={cn("font-heading text-sm font-extrabold", student.attendanceRate >= 85 ? "text-success" : "text-warning")}>
                      {student.attendanceRate}%
                    </p>
                    <p className="text-[11px] text-ink-soft">Điểm danh</p>
                    <p className="font-heading text-sm font-extrabold text-ink tabular-nums">{student.averageScore.toFixed(1)}</p>
                    <p className="text-[11px] text-ink-soft">Điểm TB</p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
        {filtered.length === 0 && (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 py-12 text-center text-sm text-ink-soft">
            Không tìm thấy học viên phù hợp.
          </p>
        )}
      </Reveal>
    </div>
  )
}