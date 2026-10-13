// Hồ sơ và yêu cầu đổi hồ sơ của chính mình (mọi vai trò),
// cùng màn duyệt yêu cầu cho nhân viên/admin.

import { apiRequest, toQuery } from "./client";

export type MeProfile = {
  role: string;
  student?: {
    id: number;
    studentCode: string;
    fullName: string;
    birthDate: string | null;
    gender: "MALE" | "FEMALE" | "OTHER" | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    identityNo: string | null;
    occupation: string | null;
    level: string | null;
    school: string | null;
    status: string;
    photoUrl: string | null;
    avatarUrl: string | null;
    branch: { id: number; name: string } | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  teacher?: {
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
    status: string;
    photoUrl: string | null;
    avatarUrl: string | null;
    branch: { id: number; name: string } | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  staff?: {
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
    status: string;
    photoUrl: string | null;
    avatarUrl: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
};

// Trường được sửa trực tiếp tuỳ vai trò; trường nhạy cảm
// (fullName, birthDate, identityNo, certificate, specialty, position...)
// phải tạo yêu cầu duyệt. Xem me.service để biết tập chính xác.
export type UpdateProfileInput = {
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  occupation?: string | null;
  bio?: string | null;
  fullName?: string;
  birthDate?: string | null;
  identityNo?: string | null;
  certificate?: string | null;
  specialty?: string | null;
  position?: string | null;
  department?: string | null;
};

export type ChangeRequest = {
  id: number;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason: string | null;
  reviewedBy: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ChangeRequestPage = {
  items: ChangeRequest[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ChangeRequestQuery = {
  status?: "PENDING" | "APPROVED" | "REJECTED";
  page?: number;
  pageSize?: number;
};

function changeRequestQuery(input: ChangeRequestQuery) {
  return toQuery({ status: input.status, page: input.page, pageSize: input.pageSize });
}

export const meApi = {
  profile: () => apiRequest<MeProfile>("/api/me/profile"),

  updateProfile: (input: UpdateProfileInput) =>
    apiRequest<MeProfile>("/api/me/profile", { method: "PATCH", body: input }),

  updatePhoto: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiRequest<MeProfile>("/api/me/photo", { method: "POST", body: form });
  },

  myChangeRequests: (input: ChangeRequestQuery = {}) =>
    apiRequest<ChangeRequestPage>(`/api/me/profile-change-requests${changeRequestQuery(input)}`),

  // Nhân viên/admin duyệt yêu cầu của người khác.
  changeRequests: (input: ChangeRequestQuery = {}) =>
    apiRequest<ChangeRequestPage>(`/api/profile-change-requests${changeRequestQuery(input)}`),

  reviewChangeRequest: (id: number, action: "approve" | "reject") =>
    apiRequest<ChangeRequest>(`/api/profile-change-requests/${id}`, {
      method: "PATCH",
      body: { action },
    }),
};
