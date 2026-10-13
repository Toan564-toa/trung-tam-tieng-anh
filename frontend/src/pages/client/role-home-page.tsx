import { BookOpenCheck, CalendarDays, ClipboardList, CreditCard, MessageSquare, Sparkles, Star, UserPlus, Users, type LucideIcon } from "lucide-react"
import { StatCard } from "@/components/common/stat-card"
import { Stagger, StaggerItem, Reveal } from "@/components/motion/reveal"
import { useAuth } from "@/lib/auth/auth-context"
import { ROLE_META } from "@/lib/auth/roles"
import type { Role } from "@/lib/auth/types"

type ClientRole = Exclude<Role, "admin">
type Stat = { label: string; value: string; icon: LucideIcon; trend?: { text: string; tone: "success" | "warning" | "danger" | "info" }; iconClass?: string }

const STATS: Record<ClientRole, Stat[]> = {
  student: [
    { label: "Buổi đã học", value: "24/64", icon: CalendarDays, trend: { text: "Đúng tiến độ", tone: "success" } },
    { label: "Bài tập chờ nộp", value: "2", icon: BookOpenCheck, trend: { text: "Hạn: thứ 6", tone: "warning" }, iconClass: "bg-orange-100 text-warning" },
    { label: "Điểm trung bình", value: "8.6", icon: Star, trend: { text: "+0.4 so với tháng trước", tone: "info" }, iconClass: "bg-sky-100 text-sky-700" },
    { label: "Học phí", value: "Đã đóng", icon: CreditCard, trend: { text: "Kỳ 2/2", tone: "success" }, iconClass: "bg-green-100 text-success" },
  ],
  teacher: [
    { label: "Lớp đang dạy", value: "5", icon: Users },
    { label: "Buổi dạy tuần này", value: "10", icon: CalendarDays, iconClass: "bg-sky-100 text-sky-700" },
    { label: "Bài cần chấm", value: "18", icon: ClipboardList, trend: { text: "6 bài quá hạn", tone: "danger" }, iconClass: "bg-orange-100 text-warning" },
    { label: "Đánh giá từ học viên", value: "4.9/5", icon: Star, trend: { text: "Xuất sắc", tone: "success" }, iconClass: "bg-green-100 text-success" },
  ],
  staff: [
    { label: "Khách cần tư vấn", value: "12", icon: MessageSquare, trend: { text: "5 khách mới hôm nay", tone: "info" } },
    { label: "Ghi danh tháng này", value: "36", icon: UserPlus, trend: { text: "+18%", tone: "success" }, iconClass: "bg-green-100 text-success" },
    { label: "Học phí chờ thu", value: "8", icon: CreditCard, trend: { text: "3 quá hạn", tone: "warning" }, iconClass: "bg-orange-100 text-warning" },
    { label: "Lớp sắp khai giảng", value: "4", icon: CalendarDays, iconClass: "bg-sky-100 text-sky-700" },
  ],
  guardian: [],
}

export function RoleHomePage({ role }: { role: ClientRole }) {
  const { user } = useAuth()
  const meta = ROLE_META[role]

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl bg-brand p-6 sm:p-8">
          <div className="absolute -top-10 -right-10 size-48 rounded-full bg-white/25" aria-hidden="true" />
          <div className="relative flex items-center gap-4">
            <span className="hidden size-14 items-center justify-center rounded-2xl bg-white/60 text-ink sm:flex"><meta.icon className="size-7" /></span>
            <div>
              <p className="text-sm font-semibold text-ink/70">{meta.label} · {meta.description}</p>
              <h1 className="text-2xl font-extrabold sm:text-3xl">Xin chào, {user?.name}!</h1>
            </div>
          </div>
        </div>
      </Reveal>
      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS[role].map((s) => (
          <StaggerItem key={s.label}><StatCard {...s} /></StaggerItem>
        ))}
      </Stagger>
      <Reveal>
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Sparkles className="size-8 text-brand-hover" />
          <h2 className="text-lg font-bold">Khu vực {meta.label.toLowerCase()} đang được xây dựng</h2>
          <p className="max-w-md text-sm text-ink-soft">Các chức năng chi tiết sẽ được bổ sung ở các bước tiếp theo. Dữ liệu hiển thị hiện tại là dữ liệu mẫu.</p>
        </div>
      </Reveal>
    </div>
  )
}
