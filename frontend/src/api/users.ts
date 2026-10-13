// Quản lý tài khoản (admin): danh sách, tạo, sửa, khoá/mở, đặt lại mật khẩu,
// lịch sử đăng nhập, xoá mềm/khôi phục, xuất Excel.

import { apiRequest, toQuery } from "./client";
import { loginHistoryQuery, type LoginHistoryPage } from "./auth";

export type AccountRole = "admin" | "staff" | "teacher" | "student" | "guardian";
export type AccountStatus = "active" | "locked" | "pending" | "archived";

export type Account = {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: AccountRole;
  roles: AccountRole[];
  status: AccountStatus;
  lastLoginAt: string | null;
  createdAt: string;
  deletedAt: string | null;
  mustChangePassword: boolean;
};

export type AccountPage = {
  items: Account[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AccountListQuery = {
  role?: AccountRole;
  status?: AccountStatus;
  query?: string;
  onlyDeleted?: boolean;
  page?: number;
  pageSize?: number;
};

export type CreateAccountInput = {
  username: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  roles: AccountRole[];
};

export type UpdateAccountInput = {
  fullName?: string;
  email?: string | null;
  phone?: string | null;
  roles?: AccountRole[];
};

export type ResetPasswordResult = {
  temporaryPassword: string;
};

function accountQuery(input: AccountListQuery) {
  return toQuery({
    role: input.role,
    status: input.status,
    query: input.query,
    onlyDeleted: input.onlyDeleted === true ? "true" : "false",
    page: input.page,
    pageSize: input.pageSize,
  });
}

export const usersApi = {
  list: (input: AccountListQuery = {}) =>
    apiRequest<AccountPage>(`/api/users${accountQuery(input)}`),

  create: (input: CreateAccountInput) =>
    apiRequest<Account & { temporaryPassword: string }>("/api/users", {
      method: "POST",
      body: input,
    }),

  update: (id: number, input: UpdateAccountInput) =>
    apiRequest<Account>(`/api/users/${id}`, { method: "PATCH", body: input }),

  setStatus: (id: number, status: "active" | "locked") =>
    apiRequest<Account>(`/api/users/${id}/status`, { method: "PATCH", body: { status } }),

  resetPassword: (id: number) =>
    apiRequest<ResetPasswordResult>(`/api/users/${id}/reset-password`, { method: "POST" }),

  loginHistory: (id: number, page = 1, pageSize = 20) =>
    apiRequest<LoginHistoryPage>(`/api/users/${id}/login-history${loginHistoryQuery(page, pageSize)}`),

  remove: (id: number) => apiRequest<void>(`/api/users/${id}`, { method: "DELETE" }),

  restore: (id: number) =>
    apiRequest<Account>(`/api/users/${id}/restore`, { method: "PATCH" }),
};
