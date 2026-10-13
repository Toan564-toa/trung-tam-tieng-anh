import {
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  ClipboardList,
  CreditCard,
  History,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Settings,
  UserPlus,
  UserRound,
  Users,
  Wallet,
} from "lucide-react"
import { AppShell, type ShellNavItem } from "@/components/layout/app-shell"
import { useAuth } from "@/lib/auth/auth-context"
import { ROLE_META } from "@/lib/auth/roles"
import type { Role } from "@/lib/auth/types"

const NAV_BY_ROLE: Record<Exclude<Role, "admin">, (home: string) => ShellNavItem[]> = {
  student: (home) => [
    { label: "Tổng quan", to: home, icon: LayoutDashboard, end: true, primary: true },
    { label: "Lịch trình", to: `${home}/lich-trinh`, icon: CalendarDays, primary: true },
    { label: "Bảng điểm", to: `${home}/bang-diem`, icon: BarChart3, primary: true },
    { label: "Bài tập", to: `${home}/bai-tap`, icon: BookOpenCheck, primary: true },
    { label: "Học phí", to: `${home}/hoc-phi`, icon: CreditCard },
    { label: "Thời gian học", to: `${home}/thoi-gian-hoc`, icon: History },
    { label: "Thông tin cá nhân", to: `${home}/thong-tin-ca-nhan`, icon: UserRound },
  ],
  teacher: (home) => [
    { label: "Tổng quan", to: home, icon: LayoutDashboard, end: true, primary: true },
    { label: "Lớp của tôi", to: `${home}/lop-hoc`, icon: Users, primary: true },
    { label: "Điểm danh", to: `${home}/diem-danh`, icon: ClipboardList, primary: true },
    { label: "Nhập điểm", to: `${home}/nhap-diem`, icon: BarChart3, primary: true },
    { label: "Học viên", to: `${home}/hoc-vien`, icon: UserRound, primary: true },
    { label: "Lịch trình", to: `${home}/lich-trinh`, icon: CalendarDays, primary: true },
    { label: "Giao bài tập", to: `${home}/bai-tap`, icon: BookOpenCheck },
    { label: "Bảng lương", to: `${home}/bang-luong`, icon: CreditCard },
    { label: "Thông tin cá nhân", to: `${home}/thong-tin-ca-nhan`, icon: Settings },
  ],
  staff: (home) => [
    { label: "Tổng quan", to: home, icon: LayoutDashboard, end: true, primary: true },
    { label: "Học viên", to: `${home}/hoc-vien`, icon: Users, primary: true },
    { label: "Ghi danh", to: `${home}/ghi-danh`, icon: UserPlus, primary: true },
    { label: "Thu học phí", to: `${home}/hoc-phi`, icon: CreditCard, primary: true },
    { label: "Khách tiềm năng", to: `${home}/khach-tiem-nang`, icon: MessageSquare, primary: true },
    { label: "Lịch trình", to: `${home}/lich-trinh`, icon: CalendarDays },
    { label: "Bài đăng", to: `${home}/bai-dang`, icon: Megaphone },
    { label: "Bảng lương", to: `${home}/bang-luong`, icon: Wallet },
    { label: "Thông tin cá nhân", to: `${home}/thong-tin-ca-nhan`, icon: Settings },
  ],
  guardian: () => [],
}

export function ClientLayout() {
  const { user } = useAuth()
  const role = user && user.role !== "admin" ? user.role : "student"
  return <AppShell variant="client" nav={NAV_BY_ROLE[role](ROLE_META[role].home)} logoutTo="/dang-nhap" subtitle={`Cổng ${ROLE_META[role].label.toLowerCase()}`} />
}