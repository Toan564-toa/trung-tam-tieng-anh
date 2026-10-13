// Nhập Excel (admin): tải mẫu, tải file lên, xem trước,
// xác nhận tạo tài khoản, tải danh sách tài khoản + mật khẩu tạm.

import { apiBlob, apiRequest } from "./client";

export type ImportKind = "student" | "teacher" | "staff";

export type ImportRowStatus = "PENDING" | "VALID" | "ERROR" | "CREATED";

export type ImportRow = {
  id: number;
  rowNumber: number;
  rawData: Record<string, unknown>;
  status: ImportRowStatus;
  errorMessage: string | null;
  recordId: number | null;
};

export type ImportPreview = {
  batchId: number;
  kind: ImportKind;
  status: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  createdRows: number;
  items: ImportRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ImportResult = {
  batchId: number;
  totalRows: number;
  validRows: number;
  errorRows: number;
};

export type ConfirmResult = {
  batchId: number;
  created: number;
  skipped: number;
  credentialsToken: string;
  credentialsExpiresAt: string;
};

export const importsApi = {
  // Tải Excel mẫu (file nhị phân).
  template: (type: "students" | "teachers" | "staff") =>
    apiBlob(`/api/imports/templates/${type}`),

  // Tải file lên và validate. kind qua query string.
  create: (kind: ImportKind, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiRequest<ImportResult>(`/api/imports?kind=${kind}`, {
      method: "POST",
      body: form,
    });
  },

  preview: (id: number, query: { page?: number; pageSize?: number; status?: ImportRowStatus } = {}) => {
    const params = new URLSearchParams();
    if (query.page !== undefined) params.set("page", String(query.page));
    if (query.pageSize !== undefined) params.set("pageSize", String(query.pageSize));
    if (query.status !== undefined) params.set("status", query.status);
    const suffix = params.toString();
    return apiRequest<ImportPreview>(`/api/imports/${id}${suffix ? `?${suffix}` : ""}`);
  },

  confirm: (id: number, skipErrors = false) =>
    apiRequest<ConfirmResult>(`/api/imports/${id}/confirm`, {
      method: "POST",
      body: { skipErrors },
    }),

  credentials: (id: number, token: string) =>
    apiBlob(`/api/imports/${id}/credentials`, {
      method: "POST",
      body: { token },
    }),
};
