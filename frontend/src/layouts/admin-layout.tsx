import {
  BookOpen,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  FileSpreadsheet,
  GraduationCap,
  History,
  LayoutDashboard,
  Newspaper,
  Receipt,
  School,
  Settings,
  UserCog,
  Users,
  Wallet,
} from "lucide-react"
import { AppShell, type ShellNavItem } from "@/components/layout/app-shell"
import { GlobalSearch } from "@/components/admin/global-search"

const ADMIN_NAV: ShellNavItem[] = [
  { label: "Bảng điều khiển", to: "/admin", icon: LayoutDashboard, end: true, group: "Tổng quan", primary: true },
  { label: "Báo cáo", to: "/admin/bao-cao", icon: FileSpreadsheet, group: "Tổng quan" },
  { label: "Nhật ký thao tác", to: "/admin/nhat-ky", icon: History, group: "Tổng quan" },

  { label: "Tài khoản & phân quyền", to: "/admin/tai-khoan", icon: UserCog, group: "Người dùng", primary: true },
  { label: "Học viên", to: "/admin/hoc-vien", icon: GraduationCap, group: "Người dùng" },
  { label: "Giáo viên", to: "/admin/giao-vien", icon: School, group: "Người dùng" },
  { label: "Nhân viên", to: "/admin/nhan-vien", icon: Users, group: "Người dùng" },
  { label: "Nhập Excel", to: "/admin/import", icon: FileSpreadsheet, group: "Người dùng" },

  { label: "Khóa học", to: "/admin/khoa-hoc", icon: BookOpen, group: "Đào tạo", primary: true },
  { label: "Lớp học", to: "/admin/lop-hoc", icon: Users, group: "Đào tạo" },
  { label: "Phòng học", to: "/admin/phong-hoc", icon: School, group: "Đào tạo" },
  { label: "Thời khóa biểu", to: "/admin/thoi-khoa-bieu", icon: CalendarRange, group: "Đào tạo" },
  { label: "Điểm danh", to: "/admin/diem-danh", icon: ClipboardCheck, group: "Đào tạo" },
  { label: "Lịch trình", to: "/admin/lich-trinh", icon: CalendarDays, group: "Đào tạo" },

  { label: "Học phí & công nợ", to: "/admin/hoc-phi", icon: Wallet, group: "Tài chính", primary: true },
  { label: "Bảng lương", to: "/admin/bang-luong", icon: Receipt, group: "Tài chính" },

  { label: "Nội dung website", to: "/admin/noi-dung", icon: Newspaper, group: "Hệ thống" },
  { label: "Cài đặt", to: "/admin/cai-dat", icon: Settings, group: "Hệ thống" },
]

export function AdminLayout() {
  return (
    <AppShell
      variant="admin"
      nav={ADMIN_NAV}
      logoutTo="/admin/dang-nhap"
      subtitle="Hệ thống quản trị"
      topbarExtra={<GlobalSearch />}
    />
  )
}
