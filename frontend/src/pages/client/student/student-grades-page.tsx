import { useMemo, useState } from "react"
import { Award, MessageSquareQuote, Target, TrendingUp } from "lucide-react"
import { cn } from "cn"
import { LineChart } from "@/components/charts/line-chart"
import { PageHeader } from "@/components/layout/page-header"
import { Reveal } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { SCORES, SCORE_AVERAGE, SCORE_KIND_META, type ScoreRow } from "@/data/student"

const SKILL_COLUMNS = [
  { key: "listening", label: "Listening", short: "Nghe" },
  { key: "reading", label: "Reading", short: "Đọc" },
  { key: "writing", label: "Writing", short: "Viết" },
  { key: "speaking", label: "Speaking", short: "Nói" },
] as const

function scoreTone(score: number) {
  if (score >= 8.5) return { badge: "success" as const, bar: "success" as const }
  if (score >= 7) return { badge: "brand" as const, bar: "brand" as const }
  return { badge: "warning" as const, bar: "warning" as const }
}

export function StudentGradesPage() {
  const [kind, setKind] = useState<"all" | "unit" | "mid" | "final">("all")

  const filtered = useMemo(
    () => (kind === "all" ? SCORES : SCORES.filter((s) => s.kind === kind)),
    [kind],
  )

  const chartData = useMemo(
    () =>
      [...SCORES].reverse().map((s) => ({
        label: s.kind === "mid" ? "Giữa khóa" : `ĐK ${s.name.match(/\d+/)?.[0] ?? ""}`,
        value: s.average,
      })),
    [],
  )

  const skillAverages = useMemo(
    () =>
      SKILL_COLUMNS.map((col) => ({
        ...col,
        value: Number((SCORES.reduce((sum, s) => sum + s[col.key], 0) / SCORES.length).toFixed(1)),
      })),
    [],
  )

  const best = useMemo(() => Math.max(...SCORES.map((s) => s.average)), [])
  const latest = SCORES[SCORES.length - 1]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`${SCORES.length} kỳ đã đánh giá`}
        title="Bảng điểm"
        description="Kết quả các bài kiểm tra định kỳ, giữa khóa và cuối khóa cùng nhận xét của giáo viên."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Reveal>
          <Card hoverable>
            <CardContent className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink-soft">Điểm trung bình</p>
                <p className="font-heading text-3xl font-extrabold text-ink">{SCORE_AVERAGE.toFixed(1)}</p>
                <p className="mt-0.5 text-xs text-ink-soft">Thang điểm 10</p>
              </div>
              <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-amber-700">
                <Target className="size-6" />
              </span>
            </CardContent>
          </Card>
        </Reveal>
        <Reveal delay={0.05}>
          <Card hoverable>
            <CardContent className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink-soft">Điểm cao nhất</p>
                <p className="font-heading text-3xl font-extrabold text-success">{best.toFixed(1)}</p>
                <p className="mt-0.5 text-xs text-ink-soft">{latest.name}</p>
              </div>
              <span className="flex size-12 items-center justify-center rounded-2xl bg-green-100 text-success">
                <Award className="size-6" />
              </span>
            </CardContent>
          </Card>
        </Reveal>
        <Reveal delay={0.1}>
          <Card hoverable>
            <CardContent className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink-soft">Mức đánh giá</p>
                <p className="font-heading mt-1 text-lg font-extrabold text-ink">Đạt yêu cầu</p>
                <p className="mt-0.5 text-xs text-ink-soft">Tiếp tục duy trì</p>
              </div>
              <span className="flex size-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <TrendingUp className="size-6" />
              </span>
            </CardContent>
          </Card>
        </Reveal>
        <Reveal delay={0.15}>
          <Card hoverable>
            <CardContent className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink-soft">Bài chưa làm</p>
                <p className="font-heading text-3xl font-extrabold text-ink">1</p>
                <p className="mt-0.5 text-xs text-ink-soft">Kiểm tra cuối khóa</p>
              </div>
              <span className="flex size-12 items-center justify-center rounded-2xl bg-orange-100 text-warning">
                <Target className="size-6" />
              </span>
            </CardContent>
          </Card>
        </Reveal>
      </div>

      <Reveal>
        <Card>
          <CardHeader>
            <CardTitle>Biểu đồ tiến bộ</CardTitle>
            <CardDescription>Điểm trung bình qua từng kỳ đánh giá (thang điểm 10)</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart data={chartData} min={6} max={10} step={1} tone="brand" height={250} />
          </CardContent>
        </Card>
      </Reveal>

      <Reveal>
        <Card>
          <CardHeader>
            <CardTitle>Điểm theo kỹ năng</CardTitle>
            <CardDescription>Trung bình của tất cả bài đã chấm</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            {skillAverages.map((skill) => (
              <Progress
                key={skill.key}
                value={skill.value}
                max={10}
                tone={scoreTone(skill.value).bar}
                label={skill.label}
                valueLabel={`${skill.value.toFixed(1)} / 10`}
              />
            ))}
          </CardContent>
        </Card>
      </Reveal>

      <Reveal>
        <Card>
          <CardHeader className="flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Kết quả chi tiết</CardTitle>
              <CardDescription>Bấm vào từng bài để xem nhận xét của giáo viên</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "unit", "mid", "final"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setKind(option)}
                  className={cn(
                    "cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                    kind === option ? "bg-brand text-ink shadow-glow" : "bg-surface text-ink-soft hover:bg-cream",
                  )}
                >
                  {option === "all" ? "Tất cả" : SCORE_KIND_META[option].label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {filtered.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 py-10 text-center text-sm text-ink-soft">
                Chưa có kết quả cho loại bài kiểm tra này.
              </p>
            ) : (
              filtered.map((row) => <ScoreCard key={row.id} row={row} />)
            )}
          </CardContent>
        </Card>
      </Reveal>
    </div>
  )
}

function ScoreCard({ row }: { row: ScoreRow }) {
  const meta = SCORE_KIND_META[row.kind]
  const tone = scoreTone(row.average)

  return (
    <details className="group rounded-2xl border border-slate-100 bg-white transition-colors hover:border-brand/40 open:bg-cream/25">
      <summary className="flex cursor-pointer list-none flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink">{row.name}</p>
            <Badge variant={meta.badge}>{meta.label}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-ink-soft">{row.date}</p>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <dl className="hidden gap-4 sm:flex">
            {SKILL_COLUMNS.map((col) => (
              <div key={col.key} className="text-center">
                <dt className="text-[11px] text-ink-soft">{col.short}</dt>
                <dd className="font-heading text-sm font-bold text-ink tabular-nums">{row[col.key].toFixed(1)}</dd>
              </div>
            ))}
          </dl>
          <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-1.5">
            <span className="text-xs font-medium text-ink-soft">TB</span>
            <span className="font-heading text-lg font-extrabold text-ink tabular-nums">{row.average.toFixed(1)}</span>
            <Badge variant={tone.badge}>{tone.badge === "success" ? "Xuất sắc" : tone.badge === "brand" ? "Tốt" : "Khá"}</Badge>
          </div>
        </div>
      </summary>
      <div className="border-t border-slate-100 px-4 py-4">
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          {SKILL_COLUMNS.map((col) => (
            <Progress key={col.key} value={row[col.key]} max={10} size="sm" tone={scoreTone(row[col.key]).bar} label={col.label} valueLabel={`${row[col.key].toFixed(1)}`} />
          ))}
        </div>
        <div className="flex items-start gap-3 rounded-xl bg-white p-3.5">
          <MessageSquareQuote className="mt-0.5 size-4.5 shrink-0 text-brand-hover" />
          <div>
            <p className="text-xs font-semibold text-ink-soft">Nhận xét của giáo viên</p>
            <p className="mt-1 text-sm leading-relaxed text-ink">{row.comment}</p>
          </div>
        </div>
      </div>
    </details>
  )
}