import { useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { ArrowLeft, CheckCircle2, Download, Save } from "lucide-react"
import { cn } from "cn"
import { SmartImage } from "@/components/common/smart-image"
import { PageHeader } from "@/components/layout/page-header"
import { Reveal } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { exportScoreSheet } from "@/lib/excel"
import { CLASSES, TEST_KIND_META, getClass, studentsOfClass, testsOfClass, type TeacherTest } from "@/data/teacher"

export function TeacherScoresPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const classId = searchParams.get("lop") ?? CLASSES[0].id
  const cls = getClass(classId) ?? CLASSES[0]
  const tests = testsOfClass(cls.id)
  const test = tests.find((t) => t.id === searchParams.get("bai")) ?? tests[0]

  const setClass = (id: string) => setSearchParams({ lop: id }, { replace: true })
  const setTest = (id: string) => setSearchParams({ lop: cls.id, bai: id }, { replace: true })

  if (!test) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Nhập điểm" description="Chọn lớp và bài kiểm tra để nhập điểm." />
        <Reveal>
          <Card>
            <CardContent className="p-8 text-center text-sm text-ink-soft">Lớp này chưa có bài kiểm tra nào.</CardContent>
          </Card>
        </Reveal>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Chấm điểm theo lớp và bài kiểm tra"
        title="Nhập điểm"
        description="Nhập điểm trực tiếp trên điện thoại hoặc máy tính, lưu để gửi phụ huynh."
      />

      <Reveal>
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">Lớp</p>
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

            {tests.length > 1 && (
              <div>
                <p className="mb-2 text-sm font-semibold text-ink">Bài kiểm tra</p>
                <div className="flex flex-wrap gap-2">
                  {tests.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTest(item.id)}
                      className={cn(
                        "min-h-11 cursor-pointer rounded-2xl px-4 text-sm font-semibold transition-colors",
                        item.id === test.id ? "bg-brand text-ink shadow-glow" : "bg-surface text-ink-soft hover:bg-cream",
                      )}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={TEST_KIND_META[test.kind].badge}>{TEST_KIND_META[test.kind].label}</Badge>
              <span className="text-xs text-ink-soft">
                {test.name} · {test.date} · Thang điểm {test.maxScore} · {cls.name}
              </span>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      <ScoreEntryPanel key={`${cls.id}:${test.id}`} classId={cls.id} className={cls.name} test={test} />
    </div>
  )
}

function ScoreEntryPanel({ classId, className, test }: { classId: string; className: string; test: TeacherTest }) {
  const students = studentsOfClass(classId)
  const [draft, setDraft] = useState<Record<string, string>>(test.scores ?? {})
  const [dirty, setDirty] = useState(false)

  const values = useMemo(() => {
    const out: Record<string, number> = {}
    for (const student of students) {
      const raw = draft[student.id]
      if (raw !== undefined && raw !== "") out[student.id] = Number(raw)
    }
    return out
  }, [draft, students])

  const stats = useMemo(() => {
    const list = Object.values(values)
    if (list.length === 0) return { graded: 0, average: 0, highest: 0, lowest: 0 }
    return {
      graded: list.length,
      average: list.reduce((sum, v) => sum + v, 0) / list.length,
      highest: Math.max(...list),
      lowest: Math.min(...list),
    }
  }, [values])

  return (
    <>
      <Reveal delay={0.05}>
        <div className="grid gap-4 sm:grid-cols-4">
          <MetricCard label="Đã chấm" value={`${stats.graded}/${students.length}`} tone="text-ink" />
          <MetricCard label="Điểm trung bình" value={stats.graded ? stats.average.toFixed(1) : "—"} tone="text-success" />
          <MetricCard label="Điểm cao nhất" value={stats.graded ? stats.highest.toFixed(1) : "—"} tone="text-sky-600" />
          <MetricCard label="Điểm thấp nhất" value={stats.graded ? stats.lowest.toFixed(1) : "—"} tone="text-warning" />
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <Card>
          <CardHeader>
            <CardTitle>Điểm từng học viên</CardTitle>
            <CardDescription>Nhập điểm từ 0 đến {test.maxScore}, để trống nếu chưa chấm</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {students.map((student) => {
              const raw = draft[student.id] ?? ""
              const num = raw === "" ? undefined : Number(raw)
              const invalid = num !== undefined && (Number.isNaN(num) || num < 0 || num > test.maxScore)
              return (
                <div
                  key={student.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-2xl border p-3.5 sm:flex-row sm:items-center",
                    invalid ? "border-red-200 bg-red-50/40" : "border-slate-100",
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <SmartImage src={student.avatar} alt={student.fullName} className="size-10 shrink-0 rounded-full" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{student.fullName}</p>
                      <p className="truncate text-xs text-ink-soft">{student.studentCode}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:w-64 sm:shrink-0">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={test.maxScore}
                      step={0.5}
                      value={raw}
                      aria-label={`Điểm của ${student.fullName}`}
                      aria-invalid={invalid || undefined}
                      onChange={(e) => {
                        const value = e.target.value
                        setDraft((prev) => ({ ...prev, [student.id]: value }))
                        setDirty(true)
                      }}
                      className={cn("w-24 text-center font-heading font-bold", invalid && "border-danger")}
                      placeholder="—"
                    />
                    <span className="flex-1 truncate text-xs text-ink-soft sm:flex-none">
                      {invalid ? "Ngoài thang điểm" : num !== undefined ? gradeLabel(num) : "Chưa chấm"}
                    </span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </Reveal>

      {/* Thanh lưu dính đáy trên mobile */}
      <Reveal>
        <div className="sticky bottom-24 z-20 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white/95 p-3.5 shadow-lift backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-ink-soft">
            {dirty ? (
              <>
                <span className="size-2 rounded-full bg-warning" />
                Có thay đổi chưa lưu
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4 text-success" />
                Đã lưu điểm cho {stats.graded}/{students.length} học viên
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void exportScoreSheet(className, test.name, students, values)}>
              <Download /> Xuất Excel
            </Button>
            <Button variant="ghost" size="sm" render={<Link to={`/giao-vien/lop-hoc/${classId}?tab=scores`} />}>
              <ArrowLeft /> Về lớp
            </Button>
            <Button
              disabled={!dirty}
              onClick={() => {
                setDirty(false)
                toast.success("Đã lưu điểm!", {
                  description: `${test.name} · ${stats.graded}/${students.length} học viên, điểm TB ${stats.average.toFixed(1)}.`,
                })
              }}
            >
              <Save /> Lưu điểm
            </Button>
          </div>
        </div>
      </Reveal>
    </>
  )
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm font-medium text-ink-soft">{label}</p>
        <p className={cn("font-heading mt-1 text-2xl font-extrabold", tone)}>{value}</p>
      </CardContent>
    </Card>
  )
}

function gradeLabel(score: number) {
  if (score >= 8.5) return "Xuất sắc"
  if (score >= 7) return "Đạt"
  if (score >= 5) return "Cần cải thiện"
  return "Chưa đạt"
}