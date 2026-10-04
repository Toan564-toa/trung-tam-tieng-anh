import { Link } from "react-router-dom"
import { ArrowRight, CalendarClock, MapPin, Users } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { Stagger, StaggerItem } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CLASSES, CLASS_META, CLASS_PROGRESS_TONE, scheduleText, studentsOfClass } from "@/data/teacher"

export function TeacherClassesPage() {
  const totalStudents = CLASSES.reduce((sum, c) => sum + c.studentCount, 0)
  const totalLessons = CLASSES.reduce((sum, c) => sum + c.totalLessons, 0)
  const doneLessons = CLASSES.reduce((sum, c) => sum + c.doneLessons, 0)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`${CLASSES.length} lớp đang phụ trách`}
        title="Lớp của tôi"
        description={`${totalStudents} học viên · ${doneLessons}/${totalLessons} buổi đã dạy.`}
      />

      <Stagger className="flex flex-col gap-4">
        {CLASSES.map((cls) => {
          const percent = Math.round((cls.doneLessons / cls.totalLessons) * 100)
          const students = studentsOfClass(cls.id)
          return (
            <StaggerItem key={cls.id}>
              <Card hoverable>
                <CardContent className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/giao-vien/lop-hoc/${cls.id}`}
                        className="font-heading text-lg font-extrabold text-ink hover:text-brand-hover"
                      >
                        {cls.name}
                      </Link>
                      <Badge variant={cls.tone}>{cls.level}</Badge>
                      <Badge variant={CLASS_META[cls.status].badge}>{CLASS_META[cls.status].label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">
                      {cls.course} · Mã lớp {cls.code}
                    </p>
                    <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock className="size-3.5" />
                        {scheduleText(cls.weekdays)} · {cls.time}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="size-3.5" />
                        {cls.room}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="size-3.5" />
                        {cls.studentCount}/{cls.maxStudents} học viên
                      </span>
                    </p>
                  </div>

                  <div className="w-full lg:w-64">
                    <Progress value={cls.doneLessons} max={cls.totalLessons} label="Tiến độ khóa" valueLabel={`${cls.doneLessons}/${cls.totalLessons} buổi`} tone={CLASS_PROGRESS_TONE[cls.tone]} size="sm" />
                    <p className="mt-1.5 text-xs text-ink-soft">
                      {percent}% · {cls.startDate} – {cls.endDate}
                    </p>
                  </div>

                  <Link
                    to={`/giao-vien/lop-hoc/${cls.id}`}
                    className="flex min-h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-ink shadow-glow transition-all hover:-translate-y-0.5 hover:bg-brand-hover"
                  >
                    Mở lớp <ArrowRight className="size-4" />
                  </Link>
                </CardContent>
              </Card>
              <p className="mt-2 px-1 text-xs text-ink-soft lg:hidden">{students.length} học viên trong danh sách mẫu</p>
            </StaggerItem>
          )
        })}
      </Stagger>
    </div>
  )
}