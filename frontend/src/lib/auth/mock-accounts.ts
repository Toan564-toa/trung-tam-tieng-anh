import type { AuthUser, Role } from "@/api/auth"

type MockAccount = AuthUser & { password: string }

/** Demo accounts. Real accounts will be created by an admin via the backend. */
export const MOCK_ACCOUNTS: MockAccount[] = [
  {
    id: "u1", username: "hocvien", email: "hocvien@trungtam.edu.vn", phone: null, password: "123456",
    name: "Nguyễn Gia Huy", role: "student", roles: ["student"], mustChangePassword: false,
    status: "active", lastLoginAt: null, branchId: null, teacher: null, staff: null,
    student: { id: 1, studentCode: "HV0001", fullName: "Nguyễn Gia Huy" },
  },
  {
    id: "u2", username: "giaovien", email: "giaovien@trungtam.edu.vn", phone: null, password: "123456",
    name: "Cô Nguyễn Minh Anh", role: "teacher", roles: ["teacher"], mustChangePassword: false,
    status: "active", lastLoginAt: null, branchId: null, teacher: { id: 1, teacherCode: "GV0001", fullName: "Nguyễn Minh Anh", branchId: null }, staff: null, student: null,
  },
  {
    id: "u3", username: "nhanvien", email: "nhanvien@trungtam.edu.vn", phone: null, password: "123456",
    name: "Trần Thu Trang", role: "staff", roles: ["staff"], mustChangePassword: false,
    status: "active", lastLoginAt: null, branchId: null, teacher: null,
    staff: { id: 1, staffCode: "NV0001", fullName: "Trần Thu Trang" }, student: null,
  },
  {
    id: "u4", username: "admin", email: "admin@trungtam.edu.vn", phone: null, password: "admin123",
    name: "Quản trị viên", role: "admin", roles: ["admin"], mustChangePassword: false,
    status: "active", lastLoginAt: null, branchId: null, teacher: null, staff: null, student: null,
  },
  {
    id: "u5", username: "hocvienmoi", email: "hocvienmoi@trungtam.edu.vn", phone: null, password: "123456",
    name: "Lê Bảo Ngọc", role: "student", roles: ["student"], mustChangePassword: true,
    status: "active", lastLoginAt: null, branchId: null, teacher: null, staff: null,
    student: { id: 2, studentCode: "HV0002", fullName: "Lê Bảo Ngọc" },
  },
]

export function demoUserFor(role: Role, firstLogin: boolean): AuthUser {
  const account = MOCK_ACCOUNTS.find((a) => a.role === role && !a.mustChangePassword)
  if (!account) throw new Error(`No demo account for role ${role}`)
  const { password: _password, ...user } = account
  return { ...user, mustChangePassword: firstLogin }
}
