import { useMemo, useState, type FormEvent } from "react"
import { BookOpenCheck, CalendarClock, ClipboardList, Loader2, Plus, Send, Trash2, Users } from "lucide-react"
import { cn } from "cn"
import { PageHeader } from "@/components/layout/page-header"
import { StatCard } from "@/components/common/stat-card"
import { Reveal } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { fieldBase, Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { daysBetween, describeDeadline, formatDate, toDateKey } from "@/lib/date"
import { CLASSES, TEACHER_ASSIGNMENTS, TEACHER_PROFILE, TODAY, type TeacherAssignment } from "@/data/teacher"

type FormValues = { title: string; classId: string; deadline: string; description: string }
type FormErrors = Partial<Record<keyof FormValues, string>>

const EMPTY: FormValues = { title: "", classId: "", deadline: "", description: "" }

function validate(v: FormValues): FormErrors {
  const errors: FormErrors = {}
  if (v.title.trim().length < 5) errors.title = "Tiêu đề bài tập cần ít nhất 5 ký tự."
  if (!v.classId) errors.classId = "Vui lòng chọn lớp nhận bài tập."
  if (!v.deadline) errors.deadline = "Vui lòng chọn hạn nộp."
  else if (daysBetween(TODAY, new Date(v.deadline)) < 0) errors.deadline = "Hạn nộp phải sau ngày hôm nay."
  if (v.description.trim().length < 10) errors.description = "Vui lòng mô tả bài tập (ít nhất 10 ký tự)."
  return errors
}

export function TeacherAssignmentsPage() {
  const [values, setValues] = useState<FormValues>(EMPTY)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [items, setItems] = useState<TeacherAssignment[]>(TEACHER_ASSIGNMENTS)

  const stats = useMemo(
    () => ({
      total: items.length,
      open: items.filter((i) => daysBetween(TODAY, i.deadline) >= 0).length,
      overdue: items.filter((i) => daysBetween(TODAY, i.deadline) < 0).length,
    }),
    [items],
  )

  const update = (key: keyof FormValues) => (value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      toast.error("Vui lòng kiểm tra lại thông tin", { description: "Một số trường chưa hợp lệ." })
      return
    }
    setSubmitting(true)
    await new Promise((r) => setTimeout(r, 800))
    setSubmitting(false)

    const cls = CLASSES.find((c) => c.id === values.classId)
    setItems((prev) => [
      {
        id: `ta-${Date.now()}`,
        classId: values.classId,
        title: values.title.trim(),
        deadline: new Date(values.deadline),
        description: values.description.trim(),
        createdAt: formatDate(TODAY),
        createdBy: TEACHER_PROFILE.fullName,
      },
      ...prev,
    ])
    toast.success("Đã gửi bài tập!", {
      description: `Lớp ${cls?.name} · Hạn nộp ${formatDate(new Date(values.deadline))}.`,
    })
    setValues(EMPTY)
  }

  const FIELD_ID: Record<keyof FormValues, string> = {
    title: "assign-title",
    classId: "assign-class",
    deadline: "assign-deadline",
    description: "assign-desc",
  }

  const invalid = (key: keyof FormValues) => ({
    "aria-invalid": Boolean(errors[key]) || undefined,
    "aria-describedby": errors[key] ? `${FIELD_ID[key]}-error` : undefined,
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`${stats.total} bài tập đã giao`}
        title="Giao bài tập"
        description="Tạo thông báo bài tập gửi tới học viên trong các lớp bạn phụ trách."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Tổng bài tập" value={String(stats.total)} icon={ClipboardList} />
        <StatCard label="Đang mở" value={String(stats.open)} icon={CalendarClock} trend={{ text: "Chưa tới hạn", tone: "success" }} iconClass="bg-green-100 text-success" />
        <StatCard label="Đã quá hạn" value={String(stats.overdue)} icon={BookOpenCheck} trend={stats.overdue ? { text: "Cần nhắc học viên", tone: "warning" } : { text: "Không có", tone: "success" }} iconClass="bg-orange-100 text-warning" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        {/* Form tạo bài tập */}
        <Reveal>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Tạo bài tập mới</CardTitle>
              <CardDescription>Thông báo sẽ được gửi tới toàn bộ học viên của lớp</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
                <FormField id="assign-title" label="Tiêu đề bài tập" required error={errors.title}>
                  <Input id="assign-title" value={values.title} onChange={(e) => update("title")(e.target.value)} placeholder="Bài tập Unit 7 – Sức khỏe & đời sống" {...invalid("title")} />
                </FormField>
                <FormField id="assign-class" label="Lớp nhận bài tập" required error={errors.classId}>
                  <select
                    id="assign-class"
                    value={values.classId}
                    onChange={(e) => update("classId")(e.target.value)}
                    className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10", !values.classId && "text-slate-400")}
                    {...invalid("classId")}
                  >
                    <option value="" disabled>-- Chọn lớp --</option>
                    {CLASSES.map((cls) => (
                      <option key={cls.id} value={cls.id} className="text-ink">{cls.name} ({cls.course})</option>
                    ))}
                  </select>
                </FormField>
                <FormField id="assign-deadline" label="Hạn nộp" required error={errors.deadline}>
                  <Input id="assign-deadline" type="date" min={toDateKey(TODAY)} value={values.deadline} onChange={(e) => update("deadline")(e.target.value)} {...invalid("deadline")} />
                </FormField>
                <FormField id="assign-desc" label="Mô tả bài tập" required error={errors.description}>
                  <Textarea id="assign-desc" value={values.description} onChange={(e) => update("description")(e.target.value)} placeholder="Nội dung, tài liệu tham khảo, hình thức nộp bài..." {...invalid("description")} />
                </FormField>
                <Button type="submit" size="lg" block disabled={submitting}>
                  {submitting ? <><Loader2 className="animate-spin" /> Đang gửi...</> : <><Send /> Gửi bài tập</>}
                </Button>
              </form>
            </CardContent>
          </Card>
        </Reveal>

        {/* Danh sách đã giao */}
        <Reveal delay={0.06}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Bài tập đã giao</CardTitle>
              <CardDescription>Sắp xếp theo hạn nộp gần nhất</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {[...items]
                .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())
                .map((item) => {
                  const diff = daysBetween(TODAY, item.deadline)
                  const cls = CLASSES.find((c) => c.id === item.classId)
                  return (
                    <article key={item.id} className={cn("rounded-2xl border p-4", diff < 0 ? "border-orange-200 bg-orange-50/40" : "border-slate-100")}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
                            <span className="inline-flex items-center gap-1"><Users className="size-3.5" />{cls?.name}</span>
                            <span className="inline-flex items-center gap-1"><CalendarClock className="size-3.5" />Hạn {formatDate(item.deadline)}</span>
                          </p>
                        </div>
                        <Badge variant={diff < 0 ? "warning" : diff <= 2 ? "danger" : "neutral"}>
                          {diff < 0 ? "Đã quá hạn" : describeDeadline(TODAY, item.deadline)}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.description}</p>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-[11px] text-slate-400">Tạo ngày {item.createdAt} · {item.createdBy}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger hover:bg-red-50"
                          onClick={() => {
                            setItems((prev) => prev.filter((i) => i.id !== item.id))
                            toast.success("Đã xoá bài tập", { description: item.title })
                          }}
                        >
                          <Trash2 /> Xoá
                        </Button>
                      </div>
                    </article>
                  )
                })}
              {items.length === 0 && (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 py-12 text-center">
                  <Plus className="size-6 text-slate-300" />
                  <p className="text-sm text-ink-soft">Chưa giao bài tập nào.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </div>
  )
}