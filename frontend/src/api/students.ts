// Quản lý học viên (admin, nhân viên; giáo viên chỉ thấy lớp mình).

import { apiBlob, apiRequest, toQuery } from "./client";

export type StudentStatus = "STUDYING" | "FROZEN" | "DROPPED" | "GRADUATED";
export type Gender = "MALE" | "FEMALE" | "OTHER" | null;

export type GuardianSummary = {
  id: number;
  fullName: string;
  relation: string;
  phone: string;
  email: string | null;
  occupation: string | null;
  address: string | null;
  isPrimary: boolean;
};

export type EnrollmentSummary = {
  id: number;
  status: string;
  totalSessions: number;
  tuitionAmount: number;
  class: { id: number; classCode: string; name: string };
};

export type Student = {
  id: number;
  studentCode: string;
  fullName: string;
  birthDate: string | null;
  gender: Gender;
  phone: string | null;
  email: string | null;
  address: string | null;
  identityNo: string | null;
  occupation: string | null;
  level: string | null;
  school: string | null;
  note: string | null;
  status: StudentStatus;
  photoUrl: string | null;
  avatarUrl: string | null;
  advisor: { id: number; fullName: string } | null;
  branch: { id: number; name: string } | null;
  guardians: GuardianSummary[];
  enrollments: EnrollmentSummary[];
  createdAt: string;
  updatedAt: string;
};

// Danh sách trả bản ghi đã chuẩn hoá (không chứa identityNo
// trừ khi người gọi có quyền — xem service).
export type StudentListItem = Omit<Student, "guardians" | "enrollments"> & { hasAccount: boolean };

export type StudentPage = {
  items: StudentListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type StudentListQuery = {
  search?: string;
  status?: StudentStatus;
  classId?: number;
  advisorId?: number;
  onlyDeleted?: boolean;
  page?: number;
  pageSize?: number;
};

export type CreateStudentInput = {
  fullName: string;
  birthDate?: string | null;
  gender?: Gender;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  identityNo?: string | null;
  occupation?: string | null;
  level?: string | null;
  school?: string | null;
  note?: string | null;
  advisorId?: number | null;
  branchId?: number | null;
};

export type StudentListResult = {
  data: StudentPage;
};

function studentQuery(input: StudentListQuery) {
  return toQuery({
    search: input.search,
    status: input.status,
    classId: input.classId,
    advisorId: input.advisorId,
    onlyDeleted: input.onlyDeleted === true ? "true" : "false",
    page: input.page,
    pageSize: input.pageSize,
  });
}

export const studentsApi = {
  list: (input: StudentListQuery = {}) =>
    apiRequest<StudentPage>(`/api/students${studentQuery(input)}`),

  get: (id: number) => apiRequest<Student>(`/api/students/${id}`),

  create: (input: CreateStudentInput) =>
    apiRequest<Student>("/api/students", { method: "POST", body: input }),

  update: (id: number, input: Partial<CreateStudentInput> & { status?: StudentStatus }) =>
    apiRequest<Student>(`/api/students/${id}`, { method: "PATCH", body: input }),

  setStatus: (id: number, status: StudentStatus) =>
    apiRequest<Student>(`/api/students/${id}/status`, { method: "PATCH", body: { status } }),

  restore: (id: number) =>
    apiRequest<Student>(`/api/students/${id}/restore`, { method: "PATCH" }),

  resetPassword: (id: number) =>
    apiRequest<{ data: { mustChangePassword: boolean }; temporaryPassword: string }>(
      `/api/students/${id}/reset-password`,
      { method: "POST" },
    ),

  remove: (id: number) => apiRequest<void>(`/api/students/${id}`, { method: "DELETE" }),

  updatePhoto: (id: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiRequest<Student>(`/api/students/${id}/photo`, { method: "POST", body: form });
  },

  guardians: (id: number) => apiRequest<GuardianSummary[]>(`/api/students/${id}/guardians`),

  exportExcel: (input: StudentListQuery = {}) =>
    apiBlob(`/api/students/export${studentQuery(input)}`),
};
