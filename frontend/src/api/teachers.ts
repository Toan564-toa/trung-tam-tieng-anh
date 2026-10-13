// Quản lý giáo viên (admin). Giáo viên chỉ thấy lớp mình phụ trách.

import { apiBlob, apiRequest, toQuery } from "./client";

export type TeacherStatus = "ACTIVE" | "INACTIVE";

export type Teacher = {
  id: number;
  teacherCode: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  specialty: string | null;
  certificate: string | null;
  experience: string | null;
  education: string | null;
  bio: string | null;
  startDate: string | null;
  showOnWebsite: boolean;
  status: TeacherStatus;
  photoUrl: string | null;
  avatarUrl: string | null;
  branch: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type TeacherPage = {
  items: Teacher[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type TeacherListQuery = {
  query?: string;
  status?: TeacherStatus;
  showOnWebsite?: boolean;
  specialty?: string;
  onlyDeleted?: boolean;
  page?: number;
  pageSize?: number;
};

export type CreateTeacherInput = {
  fullName: string;
  phone?: string | null;
  email?: string | null;
  specialty?: string | null;
  certificate?: string | null;
  experience?: string | null;
  education?: string | null;
  bio?: string | null;
  startDate?: string | null;
  showOnWebsite?: boolean;
  branchId?: number | null;
  account?: { username: string };
};

function teacherQuery(input: TeacherListQuery) {
  return toQuery({
    query: input.query,
    status: input.status,
    showOnWebsite: input.showOnWebsite === undefined ? undefined : String(input.showOnWebsite),
    specialty: input.specialty,
    onlyDeleted: input.onlyDeleted === true ? "true" : "false",
    page: input.page,
    pageSize: input.pageSize,
  });
}

export const teachersApi = {
  list: (input: TeacherListQuery = {}) =>
    apiRequest<TeacherPage>(`/api/teachers${teacherQuery(input)}`),

  get: (id: number) => apiRequest<Teacher>(`/api/teachers/${id}`),

  create: (input: CreateTeacherInput) =>
    apiRequest<Teacher & { temporaryPassword?: string }>("/api/teachers", {
      method: "POST",
      body: input,
    }),

  update: (id: number, input: Partial<Omit<CreateTeacherInput, "account">>) =>
    apiRequest<Teacher>(`/api/teachers/${id}`, { method: "PATCH", body: input }),

  setStatus: (id: number, status: TeacherStatus) =>
    apiRequest<Teacher>(`/api/teachers/${id}/status`, { method: "PATCH", body: { status } }),

  restore: (id: number) =>
    apiRequest<Teacher>(`/api/teachers/${id}/restore`, { method: "PATCH" }),

  resetPassword: (id: number) =>
    apiRequest<{ temporaryPassword: string }>(
      `/api/teachers/${id}/reset-password`,
      { method: "POST" },
    ),

  remove: (id: number) => apiRequest<void>(`/api/teachers/${id}`, { method: "DELETE" }),

  updatePhoto: (id: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiRequest<Teacher>(`/api/teachers/${id}/photo`, { method: "POST", body: form });
  },

  exportExcel: (input: TeacherListQuery = {}) =>
    apiBlob(`/api/teachers/export${teacherQuery(input)}`),
};
