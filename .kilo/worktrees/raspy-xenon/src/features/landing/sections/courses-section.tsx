import { BookOpen, CalendarClock, Check, Clock, Users } from "lucide-react"
import { cn } from "cn"
import { Stagger, StaggerItem } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { SectionTitle } from "@/components/ui/section-title"
import { COURSES, type Course } from "@/data/landing"
import { formatVnd } from "@/lib/format"
import { LearningTimeline } from "@/features/landing/sections/learning-timeline"

export function CoursesSection() {
  return (
    <section id="khoa-hoc" className="section bg-surface">
      <div className="container-page">
        <SectionTitle
          eyebrow="Lộ trình khóa học"
          title="Chọn khóa học phù hợp với bạn"
          description="Mỗi khóa học gồm 64 buổi trong 8 tháng, 2 buổi mỗi tuần – đủ thời gian để xây nền vững chắc và tiến bộ rõ rệt."
        />
        <Stagger className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {COURSES.map((course) => (
            <StaggerItem key={course.id} className="h-full">
              <CourseCard course={course} />
            </StaggerItem>
          ))}
        </Stagger>
        <LearningTimeline />
      </div>
    </section>
  )
}

function CourseCard({ course }: { course: Course }) {
  return (
    <Card
      hoverable
      className={cn("relative h-full", course.featured && "border-2 border-brand shadow-glow")}
    >
      {course.featured && (
        <span className="absolute top-4 right-4 rounded-full bg-brand px-3 py-1 text-xs font-bold text-ink">Phổ biến nhất</span>
      )}
      <CardContent className="flex flex-1 flex-col gap-5">
        <div className="flex flex-col gap-3">
          <Badge variant={course.levelTone}>{course.level}</Badge>
          <h3 className="text-xl font-extrabold">{course.name}</h3>
          <p className="flex items-center gap-2 text-sm text-ink-soft"><Users className="size-4" />{course.audience}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-cream p-3 text-center">
          <Metric icon={BookOpen} value={`${course.lessons}`} label="buổi học" />
          <Metric icon={CalendarClock} value={`${course.months}`} label="tháng" />
          <Metric icon={Clock} value={`${course.perWeek}`} label="buổi/tuần" />
        </div>

        <ul className="flex flex-col gap-2 text-sm">
          {course.highlights.map((h) => (
            <li key={h} className="flex items-center gap-2 text-ink"><Check className="size-4 text-success" />{h}</li>
          ))}
        </ul>

        <div className="mt-auto flex flex-col gap-1.5">
          <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Lịch học</p>
          {course.schedule.map((s) => (
            <p key={s} className="text-sm font-medium text-ink">{s}</p>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3 bg-white">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-ink-soft">Học phí trọn khóa</span>
          <span className="font-heading text-xl font-extrabold text-ink">{formatVnd(course.tuition)}</span>
        </div>
        <a href="#dang-ky" className={buttonVariants({ variant: course.featured ? "primary" : "outline", block: true })}>
          Đăng ký tư vấn
        </a>
      </CardFooter>
    </Card>
  )
}

function Metric({ icon: Icon, value, label }: { icon: typeof BookOpen; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <Icon className="size-4 text-amber-600" />
      <span className="font-heading text-lg leading-tight font-extrabold text-ink">{value}</span>
      <span className="text-[11px] leading-tight text-ink-soft">{label}</span>
    </div>
  )
}
