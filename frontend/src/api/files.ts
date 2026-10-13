// Tệp: upload (ảnh đại diện, ảnh hồ sơ) và tải tệp riêng.

import { apiRequest } from "./client";

export type UploadedFile = {
  id: number;
  originalName: string;
  mime_type: string;
  size: number;
  checksum: string;
  createdAt: string;
};

export const filesApi = {
  upload: (file: File, ownerType: "user" | "student" | "teacher" | "staff", ownerId: number) => {
    const form = new FormData();
    form.append("file", file);
    form.append("ownerType", ownerType);
    form.append("ownerId", String(ownerId));
    return apiRequest<UploadedFile>("/api/files/upload", { method: "POST", body: form });
  },

  // URL tải tệp (cookie xác thực đi kèm khi dùng <img src> hoặc fetch).
  url: (id: number) => `/api/files/${id}`,
};
