// Đăng ký handler hết phiên: khi api client nhận 401 và làm mới
// refresh token thất bại, xóa trạng thái auth và về trang đăng nhập.
// Component này phải nằm trong Router (dùng useNavigate).

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { onSessionExpired } from "@/api/client";
import { useAuth } from "@/lib/auth/auth-context";

export function SessionExpiryHandler() {
  const navigate = useNavigate();
  const { clearSession } = useAuth();

  useEffect(() => {
    onSessionExpired(() => {
      clearSession();
      navigate("/dang-nhap", { replace: true });
    });
  }, [clearSession, navigate]);

  return null;
}
