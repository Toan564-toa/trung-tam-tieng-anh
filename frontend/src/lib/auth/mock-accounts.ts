import type { AuthUser, Role } from "@/lib/auth/types"

type MockAccount = AuthUser & { password: string }

/** Demo accounts. Real accounts will be created by an admin via the backend. */
export const MOCK_ACCOUNTS: MockAccount[] = [
  { id: "u1", username: "hocvien", email: "hocvien@trungtam.edu.vn", password: "123456", name: "Nguyễn Gia Huy", role: "student", mustChangePassword: false },
  { id: "u2", username: "giaovien", email: "giaovien@trungtam.edu.vn", password: "123456", name: "Cô Nguyễn Minh Anh", role: "teacher", mustChangePassword: false },
  { id: "u3", username: "nhanvien", email: "nhanvien@trungtam.edu.vn", password: "123456", name: "Trần Thu Trang", role: "staff", mustChangePassword: false },
  { id: "u4", username: "admin", email: "admin@trungtam.edu.vn", password: "admin123", name: "Quản trị viên", role: "admin", mustChangePassword: false },
  { id: "u5", username: "hocvienmoi", email: "hocvienmoi@trungtam.edu.vn", password: "123456", name: "Lê Bảo Ngọc", role: "student", mustChangePassword: true },
]

export function demoUserFor(role: Role, firstLogin: boolean): AuthUser {
  const account = MOCK_ACCOUNTS.find((a) => a.role === role && !a.mustChangePassword)
  if (!account) throw new Error(`No demo account for role ${role}`)
  const { password: _password, ...user } = account
  return { ...user, mustChangePassword: firstLogin }
}
