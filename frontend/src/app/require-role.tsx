import type { ReactNode } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "@/lib/auth/auth-context"
import { ROLE_META } from "@/lib/auth/roles"
import type { Role } from "@/lib/auth/types"

type RequireRoleProps = {
  roles: Role[]
  /** Dùng khi bọc trực tiếp một trang. Bỏ trống để dùng như layout route với `<Outlet />`. */
  children?: ReactNode
}

/** Guards an area: requires login, a finished first-login password change and a matching role. */
export function RequireRole({ roles, children }: RequireRoleProps) {
  const { user } = useAuth()
  const location = useLocation()
  const isAdminArea = roles.includes("admin")

  if (!user) {
    return <Navigate to={isAdminArea ? "/admin/dang-nhap" : "/dang-nhap"} replace state={{ from: location.pathname }} />
  }
  if (user.mustChangePassword) {
    return <Navigate to="/doi-mat-khau" replace />
  }
  if (!roles.includes(user.role)) {
    return <Navigate to={ROLE_META[user.role].home} replace />
  }
  return <>{children ?? <Outlet />}</>
}
