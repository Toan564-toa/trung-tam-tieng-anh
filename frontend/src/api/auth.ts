// Xác thực: đăng nhập, làm mới token, đăng xuất, đổi mật khẩu,
// quên/đặt lại mật khẩu. Token nằm trong cookie httpOnly — client
// không bao giờ đọc được.

import { apiRequest, toQuery } from "./client";

export type Role = "student" | "teacher" | "staff" | "admin" | "guardian";

export type AuthUser = {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  role: Role;
  roles: Role[];
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  branchId: number | null;
  teacher: { id: number; teacherCode: string; fullName: string | null; branchId: number | null } | null;
  staff: { id: number; staffCode: string; fullName: string | null } | null;
  student: { id: number; studentCode: string; fullName: string | null } | null;
};

export type LoginInput = {
  username: string;
  password: string;
  portal: "client" | "admin";
};

export const authApi = {
  login: (input: LoginInput) =>
    apiRequest<{ user: AuthUser }>("/api/auth/login", { method: "POST", body: input }),

  refresh: () => apiRequest<{ ok: boolean }>("/api/auth/refresh", { method: "POST" }),

  logout: () => apiRequest<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),

  me: () => apiRequest<AuthUser>("/api/auth/me"),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<{ ok: boolean }>("/api/auth/change-password", {
      method: "POST",
      body: { currentPassword, newPassword },
    }),

  forgotPassword: (email: string) =>
    apiRequest<{ message: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: { email },
    }),

  resetPassword: (token: string, newPassword: string) =>
    apiRequest<{ ok: boolean }>("/api/auth/reset-password", {
      method: "POST",
      body: { token, newPassword },
    }),
};

export type LoginHistoryRow = {
  id: number;
  username: string;
  success: boolean;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type LoginHistoryPage = {
  items: LoginHistoryRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export const loginHistoryQuery = (page: number, pageSize: number) =>
  toQuery({ page, pageSize });
