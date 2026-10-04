import type { LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

type StatCardProps = {
  label: string
  value: string
  icon: LucideIcon
  trend?: { text: string; tone: "success" | "warning" | "danger" | "info" }
  iconClass?: string
}

export function StatCard({ label, value, icon: Icon, trend, iconClass = "bg-brand-soft text-amber-700" }: StatCardProps) {
  return (
    <Card hoverable>
      <CardContent className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-ink-soft">{label}</p>
          <p className="font-heading text-2xl font-extrabold text-ink">{value}</p>
          {trend && <Badge variant={trend.tone}>{trend.text}</Badge>}
        </div>
        <span className={`flex size-12 items-center justify-center rounded-2xl ${iconClass}`}>
          <Icon className="size-6" />
        </span>
      </CardContent>
    </Card>
  )
}
