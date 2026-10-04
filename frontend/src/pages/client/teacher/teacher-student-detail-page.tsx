import { Link, Navigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  Cake,
  CalendarCheck,
  Mail,
  MapPin,
  Phone,
  TrendingUp,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react"
import { SmartImage } from "@/components/common/smart-image"
import { Reveal } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  MARK_META,
  TESTS,
  getClass,
  getStudent,
  lessonsOfClass,
  scoresOfTest,
  type MarkStatus,
} from "@/data/teacher"

export function TeacherStudentDetailPage() {
  const { studentId = "" } = useParams()
  const student = getStudent(studentId)

  if (!student) return <Navigate to="/giao-vien/hoc-vien" replace />

  const cls = getClass(student.classId)
  const lessons = lessonsOfClass(student.classId)

  const counts = (Object.keys(MARK_META) as MarkStatus[]).reduce<Record<MarkStatus, number>>(
    (acc, status) => {
      acc[status] = lessons.filter((l) => l.marks[student.id] === status).length
      return acc
    },
    { present: 0, absent: 0, late: 0, excused: 0 },
  )

  const testScores = TESTS.filter((t) => t.classId === student.classId).map((test) => ({
    test,
    scores: scoresOfTest(test.id),
  }))
  const graded = testScores.filter((row) => row.scores[student.id] !== undefined)

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <Button variant="ghost" size="sm" className="-ml-3" render={<Link to="/giao-vien/hoc-vien" />}>
          <ArrowLeft /> Danh sách học viên
        </Button>
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Reveal>
          <Card className="h-full overflow-hidden">
            <div className="relative h-24 bg-brand">
              <div className="absolute -top-10 -right-8 size-40 rounded-full bg-white/25" aria-hidden="true" />
            </div>
            <CardContent className="-mt-12 flex flex-col items-center px-6 pb-6 text-center">
              <SmartImage src={student.avatar} alt={student.fullName} className="size-24 rounded-full ring-4 ring-white" />
              <h1 className="mt-3 font-heading text-xl font-extrabold text-ink">{student.fullName}</h1>
              <p className="mt-0.5 text-sm text-ink-soft">{student.studentCode}</p>
              {cls && <Badge variant={cls.tone} className="mt-3">{cls.name}</Badge>}
              <a
                href={`tel:${student.guardianPhone.replace(/\s/g, "")}`}
                className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
              >
                <Phone className="size-4" /> Gọi phụ huynh {student.guardianPhone}
              </a>
            </CardContent>
          </Card>
        </Reveal>

        <div className="flex flex-col gap-6">
          <Reveal delay={0.06}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardContent className="flex flex-col gap-3">
                  <p className="text-sm font-medium text-ink-soft">Tỷ lệ tham dự</p>
                  <p className={`font-heading text-3xl font-extrabold ${student.attendanceRate >= 85 ? "text-success" : "text-warning"}`}>
                    {student.attendanceRate}%
                  </p>
                  <Progress value={student.attendanceRate} tone={student.attendanceRate >= 85 ? "success" : "warning"} size="sm" hideValue />
                  <ul className="grid grid-cols-2 gap-2">
                    {(Object.keys(MARK_META) as MarkStatus[]).map((status) => (
                      <li key={status} className="flex items-center justify-between rounded-lg bg-surface px-2.5 py-1.5 text-xs">
                        <span className="inline-flex items-center gap-1.5 text-ink-soft">
                          <span className={`size-2 rounded-full ${MARK_META[status].dot}`} />
                          {MARK_META[status].label}
                        </span>
                        <span className="font-heading font-bold text-ink tabular-nums">{counts[status]}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex flex-col gap-3">
                  <p className="text-sm font-medium text-ink-soft">Điểm trung bình</p>
                  <p className="font-heading text-3xl font-extrabold text-ink">{student.averageScore.toFixed(1)}</p>
                  <Progress value={student.averageScore} max={10} tone={student.averageScore >= 8 ? "success" : "brand"} size="sm" hideValue />
                  <ul className="flex flex-col gap-1.5">
                    {graded.length === 0 ? (
                      <li className="rounded-lg bg-surface px-2.5 py-2 text-xs text-ink-soft">Chưa có điểm đã chấm.</li>
                    ) : (
                      graded.slice(-4).map(({ test, scores }) => (
                        <li key={test.id} className="flex items-center justify-between rounded-lg bg-surface px-2.5 py-1.5 text-xs">
                          <span className="truncate pr-2 text-ink-soft">{test.name}</span>
                          <span className="font-heading font-bold text-ink tabular-nums">{scores[student.id].toFixed(1)}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <Card>
              <CardHeader>
                <CardTitle>Thông tin học viên</CardTitle>
                <CardDescription>Hồ sơ do phòng Ghi danh quản lý</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <InfoRow icon={Cake} label="Ngày sinh" value={student.birthDate} />
                  <InfoRow icon={Users} label="Giới tính" value={student.gender} />
                  <InfoRow icon={CalendarCheck} label="Ngày nhập học" value={student.enrolledDate} />
                  <InfoRow icon={Phone} label="SĐT học viên" value={student.phone} />
                  <InfoRow icon={Mail} label="Email" value={student.email} />
                  <InfoRow icon={MapPin} label="Địa chỉ" value={student.address} wide />
                  <InfoRow icon={UserRound} label="Người bảo hộ" value={`${student.guardianName} (${student.guardianRelation})`} />
                  <InfoRow icon={Phone} label="SĐT phụ huynh" value={student.guardianPhone} />
                </dl>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.18}>
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>Kết quả kiểm tra</CardTitle>
                  <CardDescription>{cls?.name} · {lessons.length} buổi đã học</CardDescription>
                </div>
                <Button variant="ghost" size="sm" render={<Link to={`/giao-vien/nhap-diem?lop=${student.classId}`} />}>
                  <TrendingUp /> Nhập điểm
                </Button>
              </CardHeader>
              <CardContent>
                {testScores.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-300 py-10 text-center text-sm text-ink-soft">
                    Lớp chưa có bài kiểm tra nào.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2.5">
                    {testScores.map(({ test, scores }) => {
                      const value = scores[student.id]
                      return (
                        <li key={test.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3.5">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface">
                            <CalendarCheck className="size-4.5 text-brand-hover" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ink">{test.name}</p>
                            <p className="mt-0.5 text-xs text-ink-soft">{test.date}</p>
                          </div>
                          <p className="font-heading shrink-0 text-lg font-extrabold text-ink tabular-nums">
                            {value === undefined ? "—" : value.toFixed(1)}
                          </p>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value, wide }: { icon: LucideIcon; label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-xl bg-surface p-3 ${wide ? "sm:col-span-2 lg:col-span-3" : ""}`}>
      <dt className="flex items-center gap-1.5 text-xs text-ink-soft">
        <Icon className="size-3.5" />
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-ink">{value}</dd>
    </div>
  )
}