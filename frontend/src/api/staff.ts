// Quản lý nhân viên (admin). Nhân viên chỉ sửa hồ sơ mình.

import { apiBlob, apiRequest, toQuery } from "./client";

export type StaffStatus = "ACTIVE" | "INACTIVE";

export type Staff = {
  id: number;
  staffCode: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  position: string | null;
  department: string | null;
  education: string | null;
  bio: string | null;
  startDate: string | null;
  status: StaffStatus;
  photoUrl: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StaffPage = {
  items: Staff[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type StaffListQuery = {
  query?: string;
  status?: StaffStatus;
  position?: string;
  department?: string;
  onlyDeleted?: boolean;
  page?: number;
  pageSize?: number;
};

export type CreateStaffInput = {
  fullName: string;
  phone?: string | null;
  email?: string | null;
  position?: string | null;
  department?: string | null;
  education?: string | null;
  bio?: string | null;
  startDate?: string | null;
  account?: { username: string };
};

function staffQuery(input: StaffListQuery) {
  return toQuery({
    query: input.query,
    status: input.status,
    position: input.position,
    department: input.department,
    onlyDeleted: input.onlyDeleted === true ? "true" : "false",
    page: input.page,
    pageSize: input.pageSize,
  });
}

export const staffApi = {
  list: (input: StaffListQuery = {}) =>
    apiRequest<StaffPage>(`/api/staff${staffQuery(input)}`),

  get: (id: number) => apiRequest<Staff>(`/api/staff/${id}`),

  create: (input: CreateStaffInput) =>
    apiRequest<Staff & { temporaryPassword?: string }>("/api/staff", {
      method: "POST",
      body: input,
    }),

  update: (id: number, input: Partial<Omit<CreateStaffInput, "account">>) =>
    apiRequest<Staff>(`/api/staff/${id}`, { method: "PATCH", body: input }),

  setStatus: (id: number, status: StaffStatus) =>
    apiRequest<Staff>(`/api/staff/${id}/status`, { method: "PATCH", body: { status } }),

  restore: (id: number) =>
    apiRequest<Staff>(`/api/staff/${id}/restore`, { method: "PATCH" }),

  resetPassword: (id: number) =>
    apiRequest<{ temporaryPassword: string }>(
      `/api/staff/${id}/reset-password`,
      { method: "POST" },
    ),

  remove: (id: number) => apiRequest<void>(`/api/staff/${id}`, { method: "DELETE" }),

  updatePhoto: (id: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiRequest<Staff>(`/api/staff/${id}/photo`, { method: "POST", body: form });
  },

  exportExcel: (input: StaffListQuery = {}) =>
    apiBlob(`/api/staff/export${staffQuery(input)}`),
};
