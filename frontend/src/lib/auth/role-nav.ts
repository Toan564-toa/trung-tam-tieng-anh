import type { Role } from "@/lib/auth/types"

/** Đường dẫn các trang hồ sơ cá nhân theo vai trò, dùng cho menu người dùng trên topbar. */
export const ROLE_NAV_PATHS: Record<Role, { profile: string }> = {
  student: { profile: "/hoc-vien/thong-tin-ca-nhan" },
  teacher: { profile: "/giao-vien/thong-tin-ca-nhan" },
  staff: { profile: "/nhan-vien/thong-tin-ca-nhan" },
  admin: { profile: "/admin" },
}