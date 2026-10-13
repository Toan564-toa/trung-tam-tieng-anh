// Xác thực phía client: phiên dựa vào cookie httpOnly
// (access + refresh), KHÔNG lưu token ở localStorage.
// Trạng thái người dùng lấy từ GET /api/auth/me khi khởi động.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi, type AuthUser, type Role } from "@/api/auth";
import { ApiError } from "@/api/client";
import { demoUserFor } from "@/lib/auth/mock-accounts";

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

type LoginScope = "client" | "admin";
type LoginResult = { ok: true; user: AuthUser } | { ok: false; error: string };

type AuthContextValue = {
  user: AuthUser | null;
  /** Đang kiểm tra phiên ban đầu (GET /api/auth/me). */
  initializing: boolean;
  login: (identifier: string, password: string, scope: LoginScope) => Promise<LoginResult>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  /** Xóa phiên client (không gọi API) — dùng khi hết hạn token. */
  clearSession: () => void;
  /** Chỉ hoạt động khi VITE_DEMO_MODE=true. */
  demoLogin: (role: Role, firstLogin?: boolean) => AuthUser;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Khởi động: kiểm tra phiên qua cookie. Cookie tự gửi kèm
  // (credentials: "include" trong api client), không đọc token ở đây.
  useEffect(() => {
    let cancelled = false;
    authApi
      .me()
      .then((profile) => {
        if (!cancelled) setUser(profile);
      })
      .catch(() => {
        /* Chưa đăng nhập hoặc phiên hết hạn — giữ null. */
      })
      .finally(() => {
        if (!cancelled) setInitializing(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback<AuthContextValue["login"]>(async (identifier, password, scope) => {
    try {
      const { user } = await authApi.login({ username: identifier.trim(), password, portal: scope });
      setUser(user);
      return { ok: true, user };
    } catch (err) {
      return { ok: false, error: errorMessage(err, "Sai tên đăng nhập hoặc mật khẩu.") };
    }
  }, []);

  const changePassword = useCallback<AuthContextValue["changePassword"]>(
    async (currentPassword, newPassword) => {
      try {
        await authApi.changePassword(currentPassword, newPassword);
        // Đổi xong: tải lại hồ sơ để cập nhật mustChangePassword = false.
        const profile = await authApi.me();
        setUser(profile);
        return { ok: true, user: profile };
      } catch (err) {
        return { ok: false, error: errorMessage(err, "Không đổi được mật khẩu.") };
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* Phiên đã hết hạn vẫn phải xóa trạng thái client. */
    }
    setUser(null);
  }, []);

  const clearSession = useCallback(() => setUser(null), []);

  // Chế độ demo (chỉ khi VITE_DEMO_MODE=true): tạo user giả để xem giao diện
  // các khu vực. Không có phiên thật — dữ liệu API sẽ báo lỗi/đang tải.
  const demoLogin = useCallback<AuthContextValue["demoLogin"]>(
    (role, firstLogin = false) => {
      if (!DEMO_MODE) throw new Error("Chế độ demo đã bị tắt (VITE_DEMO_MODE).");
      const demoUser = demoUserFor(role, firstLogin);
      setUser(demoUser);
      return demoUser;
    },
    [],
  );

  const value = useMemo(
    () => ({ user, initializing, login, changePassword, logout, clearSession, demoLogin }),
    [user, initializing, login, changePassword, logout, clearSession, demoLogin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
