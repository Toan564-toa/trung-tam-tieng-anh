// Vai trò hệ thống. "guardian" (phụ huynh) đã có trong DB
// nhưng chưa có khu vực riêng trên frontend.
export type Role = "student" | "teacher" | "staff" | "admin" | "guardian"

export type AuthUser = {
  id: string
  username: string
  email: string
  name: string
  role: Role
  roles: Role[]
  mustChangePassword: boolean
}
