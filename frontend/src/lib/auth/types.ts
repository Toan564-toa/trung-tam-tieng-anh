export type Role = "student" | "teacher" | "staff" | "admin"

export type AuthUser = {
  id: string
  username: string
  email: string
  name: string
  role: Role
  mustChangePassword: boolean
}
