import { BriefcaseBusiness, GraduationCap, type LucideIcon, Presentation, ShieldCheck } from "lucide-react"
import type { Role } from "@/lib/auth/types"

export type RoleMeta = {
  label: string
  home: string
  icon: LucideIcon
  description: string
}

export const ROLE_META: Record<Role, RoleMeta> = {
  student: { label: "Học viên", home: "/hoc-vien", icon: GraduationCap, description: "Lịch học, bài tập, kết quả" },
  teacher: { label: "Giáo viên", home: "/giao-vien", icon: Presentation, description: "Lớp dạy, điểm danh, chấm bài" },
  staff: { label: "Nhân viên", home: "/nhan-vien", icon: BriefcaseBusiness, description: "Tư vấn, ghi danh, học phí" },
  admin: { label: "Admin", home: "/admin", icon: ShieldCheck, description: "Quản trị toàn hệ thống" },
}

export const CLIENT_ROLES: Role[] = ["student", "teacher", "staff"]
